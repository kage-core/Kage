// Phase E Task 7 HARDENING — the six ways the first billing implementation could still lose money,
// grant a cancelled plan, or be knocked over without credentials. Every one is proven against a REAL
// embedded PostgreSQL and a fixture Stripe transport; no live Stripe key is exercised anywhere here.
//
//   1. ORDER IS NOT GUARANTEED. Stripe explicitly does not promise delivery order and retries for days.
//      A delayed, EARLIER-generated subscription event must never resurrect a cancelled plan.
//
//   2. AN UNAUTHENTICATED ROUTE MUST HAVE A BYTE CEILING. The Stripe webhook authenticates by signature
//      over the whole raw body, so the body must be buffered before authority is known — which means the
//      only safe place for the limit is on INGEST, not after the parse.
//
//   3. A LEDGER IS THE AUTHORITY, NOT THE CALCULATOR. A credit function that returns a number it failed
//      to persist makes every downstream action (issuing the credit, emailing the customer, the GA
//      report) disagree with the auditable row.
//
//   4. ENTITLEMENTS MUST BE ENFORCED, NOT DISPLAYED. `docs/commercial/no-overhead-pilot.md` tells
//      customers the team features "switch off" when a subscription lapses. That has to be true on the
//      routes, not only on the billing page.
//
//   5. ONE STRIPE CUSTOMER, ONE WORKSPACE — and the second workspace's event must be REFUSED, not thrown
//      out of a handler documented as never throwing (a 500 on an unauthenticated endpoint that Stripe
//      then retries for days).
//
//   6. A CREDIT NOBODY APPLIES IS NOT A GUARANTEE. The measured credit must have a production path that
//      actually reaches the customer's first paid invoice, exactly once.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { connect } from "node:net";
import { startTestPostgres, type TestPostgres } from "../test-support/pg.js";
import { createDb, type Db } from "../db.js";
import { migrate } from "../migrate.js";
import {
  loadPilotCredit,
  recordPilotCredit,
  resolveWorkspaceEntitlements,
  storeSubscription,
} from "./entitlements.js";
import { applyPilotCredit } from "./pilot-credit.js";
import { billingEventCount, handleStripeEvent, signStripePayload, type Fetcher } from "./stripe.js";
import { MAX_WEBHOOK_BODY_BYTES, startWorkspaceServer, type WorkspaceServer } from "../server.js";
import { createSession, type SessionCredentials } from "../auth/session.js";
import type { WorkspaceRole } from "../auth/types.js";
import { exactReceipt, partialReceipt } from "../test-support/metrics-fixtures.js";
import type { TeamTaskOutcomeRecord } from "../metrics.js";
import type { StoredSubscription } from "./types.js";

const WEBHOOK_SECRET = "whsec_hardening_fixture_only";

const STRIPE_CONFIG = {
  webhook_secret: WEBHOOK_SECRET,
  api_base_url: "https://api.stripe.test",
  secret_key: "sk_test_fixture_only",
  price_ids: { team: "price_team", business: "price_business" },
};

let embedded: TestPostgres | null = null;
let db: Db;
let server: WorkspaceServer;
/** Every Stripe API call the server or a test made, so "was money moved?" is assertable. */
let stripeCalls: Array<{ url: string; method: string; headers: Record<string, string>; body: string }> = [];
let stripeResponder: (url: string, method: string, body: string) => unknown = () => ({});

const fetcher: Fetcher = async (url, init) => {
  const method = init?.method ?? "GET";
  const body = String(init?.body ?? "");
  stripeCalls.push({ url, method, headers: init?.headers ?? {}, body });
  return { ok: true, status: 200, json: async () => stripeResponder(url, method, body) };
};

before(async () => {
  let url = process.env.KAGE_TEST_DATABASE_URL;
  if (!url) {
    embedded = await startTestPostgres();
    url = embedded.url;
  }
  db = createDb(url);
  await migrate(db);
  server = await startWorkspaceServer(db, 0, { stripe: STRIPE_CONFIG, fetcher });
});

after(async () => {
  await server?.close();
  await db?.close();
  await embedded?.stop();
});

async function seedWorkspace(slug: string): Promise<string> {
  const id = randomUUID();
  await db.query(`INSERT INTO workspaces(workspace_id, name, slug, plan) VALUES($1, $2, $3, 'local')`, [
    id,
    slug,
    `${slug}-${id.slice(0, 8)}`,
  ]);
  return id;
}

async function seedRepository(workspaceId: string, repositoryId: string): Promise<void> {
  await db.query(
    `INSERT INTO repositories(workspace_id, repository_id, provider, name)
       VALUES($1, $2, 'github', $2) ON CONFLICT DO NOTHING`,
    [workspaceId, repositoryId],
  );
}

async function seedSession(workspaceId: string, role: WorkspaceRole): Promise<SessionCredentials> {
  const principalId = randomUUID();
  await db.query(
    `INSERT INTO workspace_principals(workspace_id, principal_id, principal_type, role, repository_ids)
       VALUES($1, $2, 'user', $3, NULL)`,
    [workspaceId, principalId, role],
  );
  return createSession(db, { workspace_id: workspaceId, principal_id: principalId });
}

function subscriptionFixture(overrides: Partial<StoredSubscription> = {}): StoredSubscription {
  return {
    workspace_id: randomUUID(),
    plan_id: "team",
    status: "active",
    current_period_end: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    cancel_at_period_end: false,
    stripe_customer_id: null,
    stripe_subscription_id: "sub_fixture",
    seats: 2,
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/** A subscription event whose GENERATION time (`created`) is set independently of its signature time. */
function subscriptionEvent(options: {
  id: string;
  created_seconds: number;
  type?: string;
  workspace_id?: string;
  customer?: string;
  price?: string;
  status?: string;
}): string {
  return JSON.stringify({
    id: options.id,
    object: "event",
    type: options.type ?? "customer.subscription.updated",
    created: options.created_seconds,
    data: {
      object: {
        id: "sub_hardening",
        object: "subscription",
        customer: options.customer ?? "cus_hardening",
        status: options.status ?? "active",
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 86_400,
        cancel_at_period_end: false,
        metadata: { workspace_id: options.workspace_id ?? "" },
        items: { object: "list", data: [{ quantity: 2, price: { id: options.price ?? "price_team" } }] },
      },
    },
  });
}

/** Sign a body with a FRESH timestamp, exactly as Stripe re-signs each retry of an older event. */
function freshlySigned(rawBody: string) {
  return {
    rawBody: Buffer.from(rawBody, "utf8"),
    signature: signStripePayload(WEBHOOK_SECRET, rawBody, Math.floor(Date.now() / 1000)),
  };
}

// ---------------------------------------------------------------------------------------------
// 1. out-of-order delivery never re-grants a cancelled plan
// ---------------------------------------------------------------------------------------------

test("a delayed, earlier-generated Stripe event never re-grants a cancelled plan", async () => {
  const workspaceId = await seedWorkspace("ordering");
  const nowSeconds = Math.floor(Date.now() / 1000);
  const deps = { db, config: STRIPE_CONFIG };

  await handleStripeEvent(
    deps,
    freshlySigned(
      subscriptionEvent({
        id: "evt_ord_created",
        created_seconds: nowSeconds - 3600,
        type: "customer.subscription.created",
        workspace_id: workspaceId,
        customer: "cus_ordering",
      }),
    ),
  );
  assert.equal((await resolveWorkspaceEntitlements(db, workspaceId)).team_sync, true);

  await handleStripeEvent(
    deps,
    freshlySigned(
      subscriptionEvent({
        id: "evt_ord_deleted",
        created_seconds: nowSeconds - 60,
        type: "customer.subscription.deleted",
        workspace_id: workspaceId,
        customer: "cus_ordering",
        status: "canceled",
      }),
    ),
  );
  assert.equal((await resolveWorkspaceEntitlements(db, workspaceId)).team_sync, false);

  // The delayed one: generated BEFORE the cancellation, delivered after it, with its own event id and a
  // fresh signature — so neither the idempotency ledger nor the replay window stops it. Only ordering can.
  const late = await handleStripeEvent(
    deps,
    freshlySigned(
      subscriptionEvent({
        id: "evt_ord_late_update",
        created_seconds: nowSeconds - 1800,
        type: "customer.subscription.updated",
        workspace_id: workspaceId,
        customer: "cus_ordering",
        status: "active",
      }),
    ),
  );
  assert.equal(late.result, "stale_event_ignored");
  const access = await resolveWorkspaceEntitlements(db, workspaceId);
  assert.equal(access.team_sync, false, "a cancelled workspace must not regain team sync from a stale event");
  assert.equal(access.team_review, false);
  // Still claimed, so Stripe's retries of the stale delivery terminate instead of running for days.
  assert.equal(await billingEventCount(db, "evt_ord_late_update"), 1);
  // And the customer keeps their own work either way.
  assert.equal(access.local_runtime, true);
  assert.equal(access.workspace_export, true);
});

test("a newer event still applies after an older one was ignored", async () => {
  const workspaceId = await seedWorkspace("ordering-forward");
  const nowSeconds = Math.floor(Date.now() / 1000);
  const deps = { db, config: STRIPE_CONFIG };
  await handleStripeEvent(
    deps,
    freshlySigned(
      subscriptionEvent({
        id: "evt_fwd_1",
        created_seconds: nowSeconds - 600,
        type: "customer.subscription.created",
        workspace_id: workspaceId,
        customer: "cus_forward",
      }),
    ),
  );
  const stale = await handleStripeEvent(
    deps,
    freshlySigned(
      subscriptionEvent({
        id: "evt_fwd_stale",
        created_seconds: nowSeconds - 900,
        workspace_id: workspaceId,
        customer: "cus_forward",
        price: "price_business",
      }),
    ),
  );
  assert.equal(stale.result, "stale_event_ignored");
  const newer = await handleStripeEvent(
    deps,
    freshlySigned(
      subscriptionEvent({
        id: "evt_fwd_new",
        created_seconds: nowSeconds - 10,
        workspace_id: workspaceId,
        customer: "cus_forward",
        price: "price_business",
      }),
    ),
  );
  assert.equal(newer.result, "processed");
  assert.equal((await resolveWorkspaceEntitlements(db, workspaceId)).advanced_policy, true);
});

test("two events generated in the same second both apply — Stripe timestamps are only second-accurate", async () => {
  const workspaceId = await seedWorkspace("ordering-tie");
  const sameSecond = Math.floor(Date.now() / 1000) - 30;
  const deps = { db, config: STRIPE_CONFIG };
  await handleStripeEvent(
    deps,
    freshlySigned(
      subscriptionEvent({
        id: "evt_tie_created",
        created_seconds: sameSecond,
        type: "customer.subscription.created",
        workspace_id: workspaceId,
        customer: "cus_tie",
        price: "price_team",
      }),
    ),
  );
  const second = await handleStripeEvent(
    deps,
    freshlySigned(
      subscriptionEvent({
        id: "evt_tie_updated",
        created_seconds: sameSecond,
        workspace_id: workspaceId,
        customer: "cus_tie",
        price: "price_business",
      }),
    ),
  );
  assert.equal(second.result, "processed", "a one-second tie must not silently drop a real upgrade");
  assert.equal((await resolveWorkspaceEntitlements(db, workspaceId)).advanced_policy, true);
});

test("a same-second event never resurrects a cancelled subscription", async () => {
  const workspaceId = await seedWorkspace("ordering-tie-cancel");
  const sameSecond = Math.floor(Date.now() / 1000) - 30;
  const deps = { db, config: STRIPE_CONFIG };
  await handleStripeEvent(
    deps,
    freshlySigned(
      subscriptionEvent({
        id: "evt_tiec_created",
        created_seconds: sameSecond - 10,
        type: "customer.subscription.created",
        workspace_id: workspaceId,
        customer: "cus_tie_cancel",
      }),
    ),
  );
  await handleStripeEvent(
    deps,
    freshlySigned(
      subscriptionEvent({
        id: "evt_tiec_deleted",
        created_seconds: sameSecond,
        type: "customer.subscription.deleted",
        workspace_id: workspaceId,
        customer: "cus_tie_cancel",
        status: "canceled",
      }),
    ),
  );
  const tie = await handleStripeEvent(
    deps,
    freshlySigned(
      subscriptionEvent({
        id: "evt_tiec_update",
        created_seconds: sameSecond,
        workspace_id: workspaceId,
        customer: "cus_tie_cancel",
        status: "active",
      }),
    ),
  );
  assert.equal(tie.result, "stale_event_ignored");
  assert.equal((await resolveWorkspaceEntitlements(db, workspaceId)).team_sync, false);
});

// ---------------------------------------------------------------------------------------------
// 5. one Stripe customer belongs to exactly one workspace — and the collision is REFUSED, not thrown
// ---------------------------------------------------------------------------------------------

test("a Stripe customer already bound to another workspace is refused, never a 500 Stripe retries forever", async () => {
  const first = await seedWorkspace("customer-owner");
  const second = await seedWorkspace("customer-claimant");
  const nowSeconds = Math.floor(Date.now() / 1000);
  const deps = { db, config: STRIPE_CONFIG };

  await handleStripeEvent(
    deps,
    freshlySigned(
      subscriptionEvent({
        id: "evt_cust_first",
        created_seconds: nowSeconds - 300,
        type: "customer.subscription.created",
        workspace_id: first,
        customer: "cus_shared",
      }),
    ),
  );

  const body = subscriptionEvent({
    id: "evt_cust_conflict",
    created_seconds: nowSeconds - 10,
    workspace_id: second,
    customer: "cus_shared",
  });
  const outcome = await handleStripeEvent(deps, freshlySigned(body));
  assert.equal(outcome.result, "customer_workspace_conflict");
  assert.equal(outcome.status, 202, "Stripe must be told we are done with this delivery, not retried for days");
  assert.equal(await billingEventCount(db, "evt_cust_conflict"), 1);
  // Nothing was granted to the claimant, and the rightful owner is untouched.
  assert.equal((await resolveWorkspaceEntitlements(db, second)).team_sync, false);
  assert.equal((await resolveWorkspaceEntitlements(db, first)).team_sync, true);

  // And over HTTP the same delivery is not a 500 on an unauthenticated endpoint.
  const httpBody = subscriptionEvent({
    id: "evt_cust_conflict_http",
    created_seconds: nowSeconds - 5,
    workspace_id: second,
    customer: "cus_shared",
  });
  const response = await fetch(`http://127.0.0.1:${server.port}/v1/billing/stripe/webhook`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": signStripePayload(WEBHOOK_SECRET, httpBody, Math.floor(Date.now() / 1000)),
    },
    body: httpBody,
  });
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { result: "customer_workspace_conflict" });
});

// ---------------------------------------------------------------------------------------------
// 2. the unauthenticated webhook has a byte ceiling enforced on INGEST
// ---------------------------------------------------------------------------------------------

/** Speak raw HTTP so the request body can be oversized, chunked, and abandoned mid-flight. */
function rawRequest(options: {
  headers: string;
  chunks?: number;
  chunkBytes?: number;
}): Promise<{ response: string; bytesWritten: number }> {
  return new Promise((resolve, reject) => {
    const socket = connect(server.port, "127.0.0.1");
    let response = "";
    let bytesWritten = 0;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ response, bytesWritten });
    };
    socket.setTimeout(15_000, () => {
      if (!settled) {
        settled = true;
        socket.destroy();
        reject(new Error("timed out waiting for a response"));
      }
    });
    socket.on("error", () => finish());
    socket.on("close", () => finish());
    socket.on("data", (data) => {
      response += data.toString("utf8");
      if (response.includes("\r\n\r\n")) finish();
    });
    socket.on("connect", () => {
      socket.write(options.headers);
      const chunk = Buffer.alloc(options.chunkBytes ?? 0, 0x61);
      let sent = 0;
      const pump = (): void => {
        while (!settled && sent < (options.chunks ?? 0)) {
          sent += 1;
          bytesWritten += chunk.length;
          // All three writes always happen: `&&` would short-circuit on backpressure and emit a chunk
          // header with no body, which is a framing error rather than the flood under test.
          socket.write(`${chunk.length.toString(16)}\r\n`);
          socket.write(chunk);
          const ok = socket.write("\r\n");
          if (!ok) {
            socket.once("drain", pump);
            return;
          }
        }
        if (!settled && (options.chunks ?? 0) > 0) socket.write("0\r\n\r\n");
      };
      pump();
    });
  });
}

test("a declared oversize body is refused before a single byte is read", async () => {
  const { response } = await rawRequest({
    headers:
      "POST /v1/billing/stripe/webhook HTTP/1.1\r\n" +
      "Host: 127.0.0.1\r\n" +
      "Content-Type: application/json\r\n" +
      `Content-Length: ${200 * 1024 * 1024}\r\n\r\n`,
  });
  assert.match(response, /^HTTP\/1\.1 413/, `expected 413, got: ${response.slice(0, 120)}`);
  assert.match(response, /payload_too_large/);
});

test("an undeclared chunked flood is cut off at the ingest ceiling instead of being buffered", async () => {
  const chunkBytes = 256 * 1024;
  const chunks = 256; // 64 MiB if the server were willing to buffer it
  const rssBefore = process.memoryUsage().rss;
  const { response, bytesWritten } = await rawRequest({
    headers:
      "POST /v1/billing/stripe/webhook HTTP/1.1\r\n" +
      "Host: 127.0.0.1\r\n" +
      "Content-Type: application/json\r\n" +
      "Transfer-Encoding: chunked\r\n\r\n",
    chunks,
    chunkBytes,
  });
  const rssGrowth = process.memoryUsage().rss - rssBefore;

  // The connection is torn down at the ceiling. A refusal a client can read is best-effort here and
  // only here: the server has stopped reading while the client is still uploading, so the TCP reset that
  // ends the flood can discard the 413 before the client reads it. Killing the flood is the property
  // that matters; the polite, readable 413 is the DECLARED-length case above, which is the one a real
  // client hits. What must never happen is a success.
  assert.doesNotMatch(response, /^HTTP\/1\.1 2/, `an oversize flood must not be accepted: ${response.slice(0, 120)}`);
  if (response) assert.match(response, /^HTTP\/1\.1 413/, `expected 413 if anything, got: ${response.slice(0, 120)}`);
  assert.ok(
    bytesWritten < MAX_WEBHOOK_BODY_BYTES * 8,
    `server kept reading past the ceiling: ${bytesWritten} bytes accepted, limit ${MAX_WEBHOOK_BODY_BYTES}`,
  );
  // …and at least the ceiling itself, so the abort provably came from the limit rather than from a
  // malformed request that never got the flood started.
  assert.ok(
    bytesWritten >= MAX_WEBHOOK_BODY_BYTES,
    `the flood never reached the ceiling (${bytesWritten} bytes) — this test would pass for the wrong reason`,
  );
  // The reported failure was memory, not status codes: 200 MiB of anonymous body took the service from
  // 59 MB to 490 MB of RSS. A 64 MiB flood that is genuinely refused on ingest cannot move RSS by
  // anything like its own size.
  assert.ok(
    rssGrowth < 48 * 1024 * 1024,
    `RSS grew ${(rssGrowth / 1048576).toFixed(1)} MiB while refusing a 64 MiB flood — it is still being buffered`,
  );
});

test("a normal signed webhook is still accepted after the ceiling exists", async () => {
  const workspaceId = await seedWorkspace("ceiling-ok");
  const body = subscriptionEvent({
    id: "evt_ceiling_ok",
    created_seconds: Math.floor(Date.now() / 1000) - 5,
    type: "customer.subscription.created",
    workspace_id: workspaceId,
    customer: "cus_ceiling",
  });
  const response = await fetch(`http://127.0.0.1:${server.port}/v1/billing/stripe/webhook`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": signStripePayload(WEBHOOK_SECRET, body, Math.floor(Date.now() / 1000)),
    },
    body,
  });
  assert.equal(response.status, 202);
  assert.equal((await resolveWorkspaceEntitlements(db, workspaceId)).team_sync, true);
});

// ---------------------------------------------------------------------------------------------
// 3. the ledger is the authority: a credit function never reports money it did not persist
// ---------------------------------------------------------------------------------------------

test("recordPilotCredit returns the persisted ledger row, never a recomputed figure", async () => {
  const workspaceId = await seedWorkspace("ledger");
  const outcomes: TeamTaskOutcomeRecord[] = [exactReceipt(11.5, { kage_processing_cost_usd: 0.5 })];

  // First run: no invoice exists yet, so the ledger records a $0 credit with the honest reason.
  const first = await recordPilotCredit(db, {
    pilot_id: "pilot-ledger",
    workspace_id: workspaceId,
    outcomes,
    first_invoice_platform_fee_usd: null,
  });
  assert.equal(first.credit_usd, 0);
  assert.equal(first.reason, "no_invoice_to_credit");

  // Second run, same pilot, now with an invoice. The unique key makes the write a no-op, so the RETURN
  // must be what the ledger holds — anything else tells a caller to credit money no row backs.
  const second = await recordPilotCredit(db, {
    pilot_id: "pilot-ledger",
    workspace_id: workspaceId,
    outcomes,
    first_invoice_platform_fee_usd: 87,
  });
  const stored = await loadPilotCredit(db, workspaceId, "pilot-ledger");
  assert.equal(stored?.credit_usd, 0);
  assert.equal(
    second.credit_usd,
    stored?.credit_usd,
    "the returned credit must equal the auditable ledger row, not a fresh calculation",
  );
  assert.equal(second.reason, stored?.reason);
});

// ---------------------------------------------------------------------------------------------
// 6. the credit has a production path that reaches the customer's first paid invoice, exactly once
// ---------------------------------------------------------------------------------------------

function invoiceResponder(): (url: string, method: string) => unknown {
  return (url) => {
    if (url.includes("/v1/invoices")) {
      return {
        object: "list",
        data: [
          { id: "in_second", status: "paid", currency: "usd", amount_paid: 9900, created: 200 },
          { id: "in_first", status: "paid", currency: "usd", amount_paid: 2000, created: 100 },
        ],
      };
    }
    return { id: "cbtxn_1", object: "customer_balance_transaction" };
  };
}

test("a measured pilot credit is applied to the FIRST paid invoice, capped at its platform fee, exactly once", async () => {
  const workspaceId = await seedWorkspace("credit-apply");
  await storeSubscription(
    db,
    subscriptionFixture({ workspace_id: workspaceId, stripe_customer_id: "cus_credit_apply" }),
  );
  stripeCalls = [];
  stripeResponder = invoiceResponder();

  const outcomes: TeamTaskOutcomeRecord[] = [exactReceipt(29.5, { kage_processing_cost_usd: 0.5 })];
  const applied = await applyPilotCredit(
    db,
    { config: STRIPE_CONFIG, fetcher },
    { workspace_id: workspaceId, pilot_id: "pilot-apply", outcomes },
  );

  assert.equal(applied.status, "applied");
  assert.equal(applied.result.credit_usd, 20, "capped at the first paid invoice's platform fee");
  assert.equal(applied.result.capped, true);
  assert.equal(applied.result.measured_overhead_usd, 30, "the measurement is reported in full");
  assert.equal(applied.applied_invoice_id, "in_first");

  const balancePosts = stripeCalls.filter((call) => call.url.includes("balance_transactions"));
  assert.equal(balancePosts.length, 1);
  assert.match(balancePosts[0].body, /amount=-2000/);
  assert.match(balancePosts[0].body, /currency=usd/);
  assert.ok(
    balancePosts[0].headers["idempotency-key"],
    "a money-moving POST must carry an idempotency key so a retry cannot double-credit",
  );

  // Re-running the job must not move money a second time.
  const again = await applyPilotCredit(
    db,
    { config: STRIPE_CONFIG, fetcher },
    { workspace_id: workspaceId, pilot_id: "pilot-apply", outcomes },
  );
  assert.equal(again.status, "already_applied");
  assert.equal(again.result.credit_usd, 20);
  assert.equal(stripeCalls.filter((call) => call.url.includes("balance_transactions")).length, 1);

  const { rows } = await db.query<{ applied_invoice_id: string; credit_usd: string }>(
    `SELECT applied_invoice_id, credit_usd FROM workspace_billing_credits WHERE workspace_id = $1 AND pilot_id = $2`,
    [workspaceId, "pilot-apply"],
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].applied_invoice_id, "in_first");
  assert.equal(Number(rows[0].credit_usd), 20);
});

test("an unmeasured pilot moves no money and says so", async () => {
  const workspaceId = await seedWorkspace("credit-unmeasured");
  await storeSubscription(
    db,
    subscriptionFixture({ workspace_id: workspaceId, stripe_customer_id: "cus_credit_unmeasured" }),
  );
  stripeCalls = [];
  stripeResponder = invoiceResponder();
  const applied = await applyPilotCredit(
    db,
    { config: STRIPE_CONFIG, fetcher },
    { workspace_id: workspaceId, pilot_id: "pilot-unmeasured", outcomes: [partialReceipt()] },
  );
  assert.equal(applied.status, "no_credit");
  assert.equal(applied.result.credit_usd, 0);
  assert.equal(applied.result.measured_overhead_usd, null, "unmeasured is null, never a flattering 0.00");
  assert.equal(applied.result.reason, "no_exact_measurements");
  assert.equal(stripeCalls.filter((call) => call.url.includes("balance_transactions")).length, 0);
});

test("the pilot credit route is owner-gated, tenant-scoped, and reports the ledger", async () => {
  const workspaceId = await seedWorkspace("credit-route");
  const otherWorkspace = await seedWorkspace("credit-route-other");
  await seedRepository(workspaceId, "repo-credit");
  await storeSubscription(
    db,
    subscriptionFixture({ workspace_id: workspaceId, stripe_customer_id: "cus_credit_route" }),
  );
  stripeCalls = [];
  stripeResponder = invoiceResponder();
  const owner = await seedSession(workspaceId, "owner");
  const developer = await seedSession(workspaceId, "developer");

  const forbidden = await fetch(
    `http://127.0.0.1:${server.port}/v1/workspaces/${workspaceId}/billing/pilot-credit`,
    {
      method: "POST",
      headers: {
        cookie: `kage_session=${developer.token}`,
        "x-kage-csrf": developer.csrf,
        "content-type": "application/json",
      },
      body: JSON.stringify({ pilot_id: "pilot-route" }),
    },
  );
  assert.equal(forbidden.status, 403);

  const crossTenant = await fetch(
    `http://127.0.0.1:${server.port}/v1/workspaces/${otherWorkspace}/billing/pilot-credit`,
    {
      method: "POST",
      headers: {
        cookie: `kage_session=${owner.token}`,
        "x-kage-csrf": owner.csrf,
        "content-type": "application/json",
      },
      body: JSON.stringify({ pilot_id: "pilot-route" }),
    },
  );
  assert.equal(crossTenant.status, 404);

  const ok = await fetch(`http://127.0.0.1:${server.port}/v1/workspaces/${workspaceId}/billing/pilot-credit`, {
    method: "POST",
    headers: {
      cookie: `kage_session=${owner.token}`,
      "x-kage-csrf": owner.csrf,
      "content-type": "application/json",
    },
    body: JSON.stringify({ pilot_id: "pilot-route" }),
  });
  assert.equal(ok.status, 200);
  const body = (await ok.json()) as { credit: { credit_usd: number; reason: string; status: string } };
  // This workspace has no measured receipts at all, so the honest answer is a $0 credit with a reason.
  assert.equal(body.credit.credit_usd, 0);
  assert.equal(body.credit.reason, "no_exact_measurements");
  assert.equal(stripeCalls.filter((call) => call.url.includes("balance_transactions")).length, 0);
});

test("a repository-scoped owner is refused rather than credited from a partial view of the pilot", async () => {
  const workspaceId = await seedWorkspace("credit-scope");
  await seedRepository(workspaceId, "repo-scoped");
  await storeSubscription(
    db,
    subscriptionFixture({ workspace_id: workspaceId, stripe_customer_id: "cus_credit_scope" }),
  );
  const principalId = randomUUID();
  await db.query(
    `INSERT INTO workspace_principals(workspace_id, principal_id, principal_type, role, repository_ids)
       VALUES($1, $2, 'user', 'owner', $3)`,
    [workspaceId, principalId, JSON.stringify(["repo-scoped"])],
  );
  const scopedOwner = await createSession(db, { workspace_id: workspaceId, principal_id: principalId });
  stripeCalls = [];
  const response = await fetch(
    `http://127.0.0.1:${server.port}/v1/workspaces/${workspaceId}/billing/pilot-credit`,
    {
      method: "POST",
      headers: {
        cookie: `kage_session=${scopedOwner.token}`,
        "x-kage-csrf": scopedOwner.csrf,
        "content-type": "application/json",
      },
      body: JSON.stringify({ pilot_id: "pilot-scoped" }),
    },
  );
  assert.equal(response.status, 403);
  assert.equal(((await response.json()) as { error: string }).error, "pilot_credit_requires_workspace_scope");
  assert.equal(stripeCalls.length, 0, "a refused credit must not even ask the provider");
});

test("the customer portal is reachable, owner-gated, and only ever for the STORED customer", async () => {
  const workspaceId = await seedWorkspace("portal");
  const owner = await seedSession(workspaceId, "owner");
  const developer = await seedSession(workspaceId, "developer");

  // No stored customer yet: a portal cannot be invented for a customer we have never seen.
  const early = await fetch(`http://127.0.0.1:${server.port}/v1/workspaces/${workspaceId}/billing/portal`, {
    method: "POST",
    headers: { cookie: `kage_session=${owner.token}`, "x-kage-csrf": owner.csrf },
  });
  assert.equal(early.status, 409);

  await storeSubscription(
    db,
    subscriptionFixture({ workspace_id: workspaceId, stripe_customer_id: "cus_portal" }),
  );
  stripeCalls = [];
  stripeResponder = () => ({ url: "https://billing.stripe.test/session" });

  const forbidden = await fetch(
    `http://127.0.0.1:${server.port}/v1/workspaces/${workspaceId}/billing/portal`,
    {
      method: "POST",
      headers: { cookie: `kage_session=${developer.token}`, "x-kage-csrf": developer.csrf },
    },
  );
  assert.equal(forbidden.status, 403);

  const ok = await fetch(`http://127.0.0.1:${server.port}/v1/workspaces/${workspaceId}/billing/portal`, {
    method: "POST",
    headers: { cookie: `kage_session=${owner.token}`, "x-kage-csrf": owner.csrf },
  });
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { portal: { url: "https://billing.stripe.test/session" } });
  assert.match(stripeCalls.at(-1)?.body ?? "", /customer=cus_portal/);
});

// ---------------------------------------------------------------------------------------------
// 4. entitlements are ENFORCED on the routes, exactly as the customer-facing doc promises
// ---------------------------------------------------------------------------------------------

async function seedServiceSession(workspaceId: string): Promise<SessionCredentials> {
  const principalId = randomUUID();
  await db.query(
    `INSERT INTO workspace_principals(workspace_id, principal_id, principal_type, role, repository_ids)
       VALUES($1, $2, 'service', 'developer', NULL)`,
    [workspaceId, principalId],
  );
  return createSession(db, { workspace_id: workspaceId, principal_id: principalId });
}

function syncBatchBody(workspaceId: string, repositoryId: string): string {
  return JSON.stringify({
    protocol_version: 1,
    batch_id: randomUUID(),
    workspace_id: workspaceId,
    repository_id: repositoryId,
    base_cursor: null,
    entities: [],
    claims: [],
    evidence: [],
    relations: [],
    review_decisions: [],
    measurements: [],
    task_outcomes: [],
    created_at: new Date().toISOString(),
  });
}

test("a lapsed subscription actually switches team sync and team review OFF, not merely displays them off", async () => {
  const workspaceId = await seedWorkspace("entitlement-gate");
  await seedRepository(workspaceId, "repo-gate");
  const service = await seedServiceSession(workspaceId);
  const owner = await seedSession(workspaceId, "owner");

  // Entitled: an active team plan.
  await storeSubscription(
    db,
    subscriptionFixture({ workspace_id: workspaceId, stripe_customer_id: "cus_gate", plan_id: "team" }),
  );
  const entitledPush = await fetch(`http://127.0.0.1:${server.port}/v1/sync/push`, {
    method: "POST",
    headers: { authorization: `Bearer ${service.token}`, "content-type": "application/json" },
    body: syncBatchBody(workspaceId, "repo-gate"),
  });
  assert.equal(entitledPush.status, 200);
  const entitledPull = await fetch(`http://127.0.0.1:${server.port}/v1/sync/pull`, {
    headers: { authorization: `Bearer ${service.token}` },
  });
  assert.equal(entitledPull.status, 200);

  // Lapsed: cancelled and past the period end.
  await storeSubscription(
    db,
    subscriptionFixture({
      workspace_id: workspaceId,
      stripe_customer_id: "cus_gate",
      plan_id: "team",
      status: "canceled",
      current_period_end: new Date(Date.now() - 86_400_000).toISOString(),
    }),
  );

  const lapsedPush = await fetch(`http://127.0.0.1:${server.port}/v1/sync/push`, {
    method: "POST",
    headers: { authorization: `Bearer ${service.token}`, "content-type": "application/json" },
    body: syncBatchBody(workspaceId, "repo-gate"),
  });
  assert.equal(lapsedPush.status, 402);
  assert.deepEqual((await lapsedPush.json()) as Record<string, unknown>, {
    error: "entitlement_required",
    feature: "team_sync",
    plan_id: "local",
    state: "expired",
  });

  const lapsedPull = await fetch(`http://127.0.0.1:${server.port}/v1/sync/pull`, {
    headers: { authorization: `Bearer ${service.token}` },
  });
  assert.equal(lapsedPull.status, 402);

  const lapsedReview = await fetch(
    `http://127.0.0.1:${server.port}/v1/repositories/repo-gate/claims/claim-1/review`,
    {
      method: "POST",
      headers: {
        cookie: `kage_session=${owner.token}`,
        "x-kage-csrf": owner.csrf,
        "content-type": "application/json",
      },
      body: JSON.stringify({ action: "accept", expected_version: "v1", decision_note: "looks right" }),
    },
  );
  assert.equal(lapsedReview.status, 402);
  assert.equal(((await lapsedReview.json()) as { feature: string }).feature, "team_review");

  // What the customer keeps regardless: the billing page still answers, and local runtime and export
  // remain true in the resolved entitlement.
  const billing = await fetch(`http://127.0.0.1:${server.port}/v1/workspaces/${workspaceId}/billing`, {
    headers: { cookie: `kage_session=${owner.token}` },
  });
  assert.equal(billing.status, 200);
  const billingBody = (await billing.json()) as {
    billing: { entitlements: { local_runtime: boolean; workspace_export: boolean }; state: string };
  };
  assert.equal(billingBody.billing.entitlements.local_runtime, true);
  assert.equal(billingBody.billing.entitlements.workspace_export, true);
  assert.equal(billingBody.billing.state, "expired");
});

test("authority is still decided before entitlement, so a viewer sees 403 rather than a price tag", async () => {
  const workspaceId = await seedWorkspace("entitlement-order");
  await seedRepository(workspaceId, "repo-order");
  // A human viewer, not a service token: service principals may sync by definition, humans may not.
  const viewerId = randomUUID();
  await db.query(
    `INSERT INTO workspace_principals(workspace_id, principal_id, principal_type, role, repository_ids)
       VALUES($1, $2, 'user', 'viewer', NULL)`,
    [workspaceId, viewerId],
  );
  const viewer = await createSession(db, { workspace_id: workspaceId, principal_id: viewerId });
  const response = await fetch(`http://127.0.0.1:${server.port}/v1/sync/push`, {
    method: "POST",
    headers: { authorization: `Bearer ${viewer.token}`, "content-type": "application/json" },
    body: syncBatchBody(workspaceId, "repo-order"),
  });
  assert.equal(response.status, 403, "a role that may not sync at all is refused on authority, not on billing");
});
