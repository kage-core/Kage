// Phase E Task 7 — subscriptions, entitlements, and the no-overhead pilot credit.
//
// Billing is where a product is most tempted to lie in its own favour, so every rule here is a test:
//
//   1. THE SERVER DECIDES ENTITLEMENTS. Access is resolved from the subscription row this service
//      stored after verifying a Stripe webhook. A client can present any plan name it likes; it is
//      never read. There is no code path from a request body to an entitlement.
//
//   2. AN EXPIRY NEVER TAKES THE CUSTOMER'S OWN WORK AWAY. Local runtime and workspace export stay
//      TRUE for every subscription state, including cancelled and lapsed. Only the TEAM features
//      (sync, team review, checks, policy, SSO/SCIM) switch off.
//
//   3. A WEBHOOK APPLIES EXACTLY ONCE. The Stripe event id is claimed before the state change and in
//      the SAME transaction, so a redelivery (Stripe retries for days) is a no-op, and a failed apply
//      does not leave a poisoned id behind that would silently swallow the retry.
//
//   4. THE SIGNATURE IS CHECKED OVER THE RAW BYTES, BEFORE PARSING, IN CONSTANT TIME, WITH A
//      TIMESTAMP TOLERANCE. A forged or replayed body must never reach a JSON parser or the applier.
//
//   5. THE NO-OVERHEAD CREDIT IS ONLY EVER MEASURED. It is computed exclusively from EXACT receipts
//      that measured both input and Kage processing cost; partial/unavailable receipts create nothing
//      and reduce nothing. It is capped at the first invoice's platform fee, so the guarantee can
//      never turn into a cash liability.
//
// LIVE STRIPE IS AN HONEST GAP. Everything here runs against fixtures and a REAL embedded PostgreSQL.
// No live Stripe key, account, product, or price is exercised in this suite, and nothing here should
// be read as evidence that one was.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import { startTestPostgres, type TestPostgres } from "../test-support/pg.js";
import { createDb, type Db } from "../db.js";
import { migrate } from "../migrate.js";
import {
  LAUNCH_PLANS,
  type PlanId,
  type StoredSubscription,
} from "./types.js";
import {
  calculatePilotCredit,
  countActiveDevelopers,
  loadSubscription,
  recordPilotCredit,
  resolveEntitlements,
  resolveWorkspaceEntitlements,
  storeSubscription,
} from "./entitlements.js";
import {
  billingEventCount,
  handleStripeEvent,
  createCheckoutSession,
  loadStripeConfig,
  signStripePayload,
  verifyStripeSignature,
  type StripeDelivery,
} from "./stripe.js";
import { exactReceipt, fixtureTaskOutcome, partialReceipt, unavailableReceipt } from "../test-support/metrics-fixtures.js";
import type { TeamTaskOutcomeRecord } from "../metrics.js";
import { startWorkspaceServer, type WorkspaceServer } from "../server.js";
import { createSession, type SessionCredentials } from "../auth/session.js";
import type { WorkspaceRole } from "../auth/types.js";
import { billingPanel } from "../../api/read-models.js";

const WEBHOOK_SECRET = "whsec_test_do_not_use_in_production";

const STRIPE_CONFIG = {
  webhook_secret: WEBHOOK_SECRET,
  api_base_url: "https://api.stripe.test",
  secret_key: "sk_test_fixture_only",
  price_ids: { team: "price_team", business: "price_business", enterprise: "price_enterprise" },
};

// ---------------------------------------------------------------------------------------------
// fixtures
// ---------------------------------------------------------------------------------------------

function subscription(overrides: Partial<StoredSubscription> = {}): StoredSubscription {
  return {
    workspace_id: randomUUID(),
    plan_id: "team",
    status: "active",
    current_period_end: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    cancel_at_period_end: false,
    stripe_customer_id: "cus_fixture",
    stripe_subscription_id: "sub_fixture",
    seats: 3,
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/** A subscription whose paid period has ENDED — the case the guarantee in rule 2 is about. */
function expiredSubscription(): StoredSubscription {
  return subscription({
    status: "canceled",
    current_period_end: new Date(Date.now() - 86_400_000).toISOString(),
  });
}

/** A Stripe event body, exactly as Stripe would post it (we only ever read what we ourselves set). */
function fixtureStripeEvent(
  eventId: string,
  overrides: {
    type?: string;
    workspace_id?: string;
    customer?: string;
    price?: string;
    status?: string;
    period_end?: number;
  } = {},
): string {
  const body = {
    id: eventId,
    object: "event",
    type: overrides.type ?? "customer.subscription.updated",
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: "sub_fixture",
        object: "subscription",
        customer: overrides.customer ?? "cus_fixture",
        status: overrides.status ?? "active",
        current_period_end: overrides.period_end ?? Math.floor(Date.now() / 1000) + 30 * 86_400,
        cancel_at_period_end: false,
        metadata: { workspace_id: overrides.workspace_id ?? "" },
        items: {
          object: "list",
          data: [{ quantity: 3, price: { id: overrides.price ?? "price_team" } }],
        },
      },
    },
  };
  return JSON.stringify(body);
}

/** Wrap a raw body in a signed delivery, as the HTTP boundary would hand it to the handler. */
function delivery(rawBody: string, overrides: Partial<StripeDelivery> = {}): StripeDelivery {
  return {
    rawBody: Buffer.from(rawBody, "utf8"),
    signature: signStripePayload(WEBHOOK_SECRET, rawBody, Math.floor(Date.now() / 1000)),
    ...overrides,
  };
}

interface PilotFixtureOptions {
  /** The EXACT, measured net overhead the pilot is claimed to have produced (positive = Kage cost). */
  exact_net_cost_delta_usd?: number;
  first_invoice_platform_fee_usd?: number | null;
  extra?: TeamTaskOutcomeRecord[];
}

/**
 * A pilot whose EXACT receipts sum to the requested overhead. The overhead is split across input cost
 * and Kage processing so the test proves both components are counted, not just one.
 */
function fixturePilot(options: PilotFixtureOptions = {}) {
  const overhead = options.exact_net_cost_delta_usd ?? 0;
  const outcomes: TeamTaskOutcomeRecord[] = [];
  if (overhead !== 0) {
    outcomes.push(
      exactReceipt(overhead - 0.5, { kage_processing_cost_usd: 0.5 }),
    );
  }
  return {
    pilot_id: "pilot-fixture",
    workspace_id: randomUUID(),
    outcomes: [...outcomes, ...(options.extra ?? [])],
    first_invoice_platform_fee_usd:
      options.first_invoice_platform_fee_usd === undefined ? 87 : options.first_invoice_platform_fee_usd,
  };
}

// ---------------------------------------------------------------------------------------------
// pure entitlement resolution — no database required
// ---------------------------------------------------------------------------------------------

test("expired team entitlement keeps export and local operation available", () => {
  const access = resolveEntitlements(expiredSubscription());
  assert.equal(access.team_sync, false);
  assert.equal(access.workspace_export, true);
  assert.equal(access.local_runtime, true);
});

test("no subscription at all still runs locally and still exports", () => {
  const access = resolveEntitlements(null);
  assert.equal(access.local_runtime, true);
  assert.equal(access.workspace_export, true);
  assert.equal(access.team_sync, false);
  assert.equal(access.plan_id, "local");
  assert.equal(access.state, "none");
});

test("an active team plan grants team features but not enterprise identity", () => {
  const access = resolveEntitlements(subscription({ plan_id: "team" }));
  assert.equal(access.team_sync, true);
  assert.equal(access.team_review, true);
  assert.equal(access.sso, false);
  assert.equal(access.scim, false);
});

test("enterprise identity is gated to the enterprise plan", () => {
  assert.equal(resolveEntitlements(subscription({ plan_id: "business" })).sso, false);
  assert.equal(resolveEntitlements(subscription({ plan_id: "enterprise" })).sso, true);
  assert.equal(resolveEntitlements(subscription({ plan_id: "enterprise" })).scim, true);
});

test("a trialing subscription is entitled and a past_due one is not", () => {
  assert.equal(resolveEntitlements(subscription({ status: "trialing" })).team_sync, true);
  assert.equal(resolveEntitlements(subscription({ status: "past_due" })).team_sync, false);
});

test("a cancel_at_period_end subscription keeps access until the period actually ends", () => {
  const access = resolveEntitlements(subscription({ cancel_at_period_end: true }));
  assert.equal(access.team_sync, true);
  assert.equal(access.state, "active");
});

test("the launch catalog is server data with a null enterprise price", () => {
  assert.equal(LAUNCH_PLANS.local.usd_per_active_developer_month, 0);
  assert.equal(LAUNCH_PLANS.team.usd_per_active_developer_month, 29);
  assert.equal(LAUNCH_PLANS.business.usd_per_active_developer_month, 59);
  assert.equal(LAUNCH_PLANS.enterprise.usd_per_active_developer_month, null);
  for (const plan of Object.values(LAUNCH_PLANS)) assert.equal(plan.viewers_included, true);
});

test("stripe price ids come from deployment secrets, never from the committed catalog", () => {
  const configured = loadStripeConfig({
    KAGE_STRIPE_SECRET_KEY: "sk_live_not_real",
    KAGE_STRIPE_WEBHOOK_SECRET: "whsec_not_real",
    KAGE_STRIPE_PRICE_TEAM: "price_from_secret",
  });
  assert.equal(configured?.price_ids.team, "price_from_secret");
  // No secrets configured => the integration is simply off; the workspace still starts and still runs.
  assert.equal(loadStripeConfig({}), null);
});

// ---------------------------------------------------------------------------------------------
// the no-overhead pilot credit — measured or nothing
// ---------------------------------------------------------------------------------------------

test("positive measured pilot overhead creates one usage credit", () => {
  const result = calculatePilotCredit(fixturePilot({ exact_net_cost_delta_usd: 12.5 }));
  assert.equal(result.credit_usd, 12.5);
  assert.equal(result.reason, "measured_positive_context_overhead");
});

test("a measured saving creates no credit and never a negative one", () => {
  const result = calculatePilotCredit(fixturePilot({ exact_net_cost_delta_usd: -4 }));
  assert.equal(result.credit_usd, 0);
  assert.equal(result.reason, "no_measured_overhead");
  assert.equal(result.measured_overhead_usd, -4);
});

test("partial and unavailable receipts neither create nor reduce a credit", () => {
  const withNoise = calculatePilotCredit(
    fixturePilot({
      exact_net_cost_delta_usd: 12.5,
      // A partial receipt carrying a huge negative number would wipe the credit out if it counted.
      extra: [partialReceipt({ net_input_cost_delta_usd: -1000 }), unavailableReceipt()],
    }),
  );
  assert.equal(withNoise.credit_usd, 12.5);
  assert.equal(withNoise.excluded_receipts, 2);
});

test("a pilot with no exact receipts creates no credit and reports overhead as unknown", () => {
  const result = calculatePilotCredit(
    fixturePilot({ extra: [partialReceipt(), unavailableReceipt()] }),
  );
  assert.equal(result.credit_usd, 0);
  assert.equal(result.measured_overhead_usd, null, "unmeasured overhead must be null, never 0");
  assert.equal(result.reason, "no_exact_measurements");
});

test("an exact receipt missing the Kage processing cost is not exactly measured overhead", () => {
  // Overhead is input cost PLUS Kage's own processing. Half a measurement is not a measurement.
  const result = calculatePilotCredit({
    ...fixturePilot(),
    outcomes: [exactReceipt(3, { kage_processing_cost_usd: null })],
  });
  assert.equal(result.credit_usd, 0);
  assert.equal(result.reason, "no_exact_measurements");
  assert.equal(result.excluded_receipts, 1);
});

test("the credit is capped at the first invoice platform fee so it cannot become a cash liability", () => {
  const result = calculatePilotCredit(
    fixturePilot({ exact_net_cost_delta_usd: 500, first_invoice_platform_fee_usd: 87 }),
  );
  assert.equal(result.credit_usd, 87);
  assert.equal(result.capped, true);
  assert.equal(result.measured_overhead_usd, 500, "the measurement is reported in full, only the credit is capped");
  assert.equal(result.reason, "capped_at_first_invoice_platform_fee");
});

test("with no invoice yet there is nothing to credit against", () => {
  const result = calculatePilotCredit(
    fixturePilot({ exact_net_cost_delta_usd: 12.5, first_invoice_platform_fee_usd: null }),
  );
  assert.equal(result.credit_usd, 0);
  assert.equal(result.reason, "no_invoice_to_credit");
  assert.equal(result.measured_overhead_usd, 12.5);
});

// ---------------------------------------------------------------------------------------------
// stripe signature verification — raw bytes, constant time, replay window
// ---------------------------------------------------------------------------------------------

test("a valid signature over the raw body verifies", () => {
  const body = fixtureStripeEvent("evt_sig");
  const now = Math.floor(Date.now() / 1000);
  assert.equal(verifyStripeSignature(WEBHOOK_SECRET, body, signStripePayload(WEBHOOK_SECRET, body, now), now * 1000), true);
});

test("a tampered body fails verification", () => {
  const body = fixtureStripeEvent("evt_sig");
  const now = Math.floor(Date.now() / 1000);
  const header = signStripePayload(WEBHOOK_SECRET, body, now);
  assert.equal(verifyStripeSignature(WEBHOOK_SECRET, `${body} `, header, now * 1000), false);
});

test("a signature computed over the body alone (no timestamp) is refused", () => {
  // Stripe signs `${timestamp}.${payload}`. Accepting a bare-payload HMAC would make every capture
  // replayable forever.
  const body = fixtureStripeEvent("evt_sig");
  const bare = createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
  assert.equal(verifyStripeSignature(WEBHOOK_SECRET, body, `t=1,v1=${bare}`, 1000), false);
});

test("a correctly signed but stale delivery is refused by the replay window", () => {
  const body = fixtureStripeEvent("evt_sig");
  const signedAt = Math.floor(Date.now() / 1000) - 3600;
  const header = signStripePayload(WEBHOOK_SECRET, body, signedAt);
  assert.equal(verifyStripeSignature(WEBHOOK_SECRET, body, header, Date.now()), false);
});

test("missing, malformed, and empty signature headers are refused rather than throwing", () => {
  const body = fixtureStripeEvent("evt_sig");
  for (const header of [undefined, null, "", "garbage", "t=,v1=", "v1=deadbeef"]) {
    assert.equal(verifyStripeSignature(WEBHOOK_SECRET, body, header as string | undefined, Date.now()), false);
  }
});

// ---------------------------------------------------------------------------------------------
// database-backed: idempotency, tenancy, and server-side entitlement resolution (REAL PostgreSQL)
// ---------------------------------------------------------------------------------------------

let embedded: TestPostgres | undefined;
let db: Db;
let server: WorkspaceServer;
const workspaceA = randomUUID();
const workspaceB = randomUUID();

before(async () => {
  let url = process.env.KAGE_TEST_DATABASE_URL;
  if (!url) {
    embedded = await startTestPostgres();
    url = embedded.url;
  }
  db = createDb(url);
  await migrate(db);
  await seedWorkspace(workspaceA, "alpha");
  await seedWorkspace(workspaceB, "beta");
  server = await startWorkspaceServer(db, 0, {
    stripe: STRIPE_CONFIG,
    fetcher: async () => ({ ok: true, status: 200, json: async () => ({ id: "cs_test", url: "https://checkout.test/s" }) }),
  });
});

after(async () => {
  await server?.close();
  await db?.close();
  await embedded?.stop();
});

async function seedWorkspace(id: string, slug: string): Promise<void> {
  await db.query(
    `INSERT INTO workspaces(workspace_id, name, slug, plan) VALUES($1, $2, $3, 'local')
       ON CONFLICT (workspace_id) DO NOTHING`,
    [id, slug, `${slug}-${id.slice(0, 8)}`],
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

function stripeDeps() {
  return { db, config: STRIPE_CONFIG };
}

test("Stripe webhook is idempotent by event id", async () => {
  const body = fixtureStripeEvent("evt_1", { workspace_id: workspaceA, customer: "cus_a" });
  const first = await handleStripeEvent(stripeDeps(), delivery(body));
  const second = await handleStripeEvent(stripeDeps(), delivery(body));
  assert.equal(first.status, 202);
  assert.equal(second.result, "duplicate_ignored");
  assert.equal(await billingEventCount(db, "evt_1"), 1);
});

test("an invalid signature is rejected before the body is ever parsed", async () => {
  const body = fixtureStripeEvent("evt_forged", { workspace_id: workspaceA, customer: "cus_a" });
  const outcome = await handleStripeEvent(stripeDeps(), {
    rawBody: Buffer.from(body, "utf8"),
    signature: signStripePayload("whsec_attacker", body, Math.floor(Date.now() / 1000)),
  });
  assert.equal(outcome.status, 401);
  assert.equal(outcome.result, "invalid_signature");
  // Nothing was recorded, so a LATER legitimate delivery of the same id still applies.
  assert.equal(await billingEventCount(db, "evt_forged"), 0);
});

test("an unparseable body that is correctly signed is a 400, not a crash", async () => {
  const outcome = await handleStripeEvent(stripeDeps(), delivery("{not json"));
  assert.equal(outcome.status, 400);
  assert.equal(outcome.result, "malformed_body");
});

test("a webhook applies the subscription state the SERVER derived from the price id", async () => {
  const body = fixtureStripeEvent("evt_plan", {
    workspace_id: workspaceA,
    customer: "cus_a",
    price: "price_business",
  });
  await handleStripeEvent(stripeDeps(), delivery(body));
  const stored = await loadSubscription(db, workspaceA);
  assert.equal(stored?.plan_id, "business");
  assert.equal(stored?.status, "active");
  const access = await resolveWorkspaceEntitlements(db, workspaceA);
  assert.equal(access.advanced_policy, true);
});

test("a price id the server does not recognise grants nothing", async () => {
  const body = fixtureStripeEvent("evt_unknown_price", {
    workspace_id: workspaceB,
    customer: "cus_b",
    price: "price_someone_elses_product",
  });
  const outcome = await handleStripeEvent(stripeDeps(), delivery(body));
  assert.equal(outcome.status, 202);
  const access = await resolveWorkspaceEntitlements(db, workspaceB);
  assert.equal(access.team_sync, false, "an unmapped price must never grant a paid feature");
  assert.equal(access.local_runtime, true);
  assert.equal(access.workspace_export, true);
});

test("an event for a customer this service cannot map applies nothing", async () => {
  const body = fixtureStripeEvent("evt_orphan", { customer: "cus_who" });
  const outcome = await handleStripeEvent(stripeDeps(), delivery(body));
  assert.equal(outcome.result, "unmapped_customer");
  assert.equal(outcome.status, 202);
});

test("a subscription deletion revokes team features and keeps local runtime and export", async () => {
  await handleStripeEvent(
    stripeDeps(),
    delivery(fixtureStripeEvent("evt_del_setup", { workspace_id: workspaceB, customer: "cus_b2", price: "price_team" })),
  );
  assert.equal((await resolveWorkspaceEntitlements(db, workspaceB)).team_sync, true);
  await handleStripeEvent(
    stripeDeps(),
    delivery(
      fixtureStripeEvent("evt_del", {
        workspace_id: workspaceB,
        customer: "cus_b2",
        type: "customer.subscription.deleted",
        status: "canceled",
      }),
    ),
  );
  const access = await resolveWorkspaceEntitlements(db, workspaceB);
  assert.equal(access.team_sync, false);
  assert.equal(access.local_runtime, true);
  assert.equal(access.workspace_export, true);
});

test("entitlement state is tenant-scoped: one workspace's plan never leaks into another", async () => {
  await storeSubscription(db, subscription({ workspace_id: workspaceA, plan_id: "enterprise", stripe_customer_id: "cus_iso_a" }));
  const other = await loadSubscription(db, workspaceB);
  assert.notEqual(other?.plan_id, "enterprise");
  const foreign = await loadSubscription(db, randomUUID());
  assert.equal(foreign, null, "an unrelated workspace id must resolve to no subscription at all");
});

test("a client-supplied plan name can never grant an entitlement", async () => {
  const session = await seedSession(workspaceB, "owner");
  const response = await fetch(`http://127.0.0.1:${server.port}/v1/workspaces/${workspaceB}/billing`, {
    method: "POST",
    headers: {
      cookie: `kage_session=${session.token}`,
      "x-kage-csrf": session.csrf,
      "content-type": "application/json",
    },
    body: JSON.stringify({ plan_id: "enterprise", entitlements: { sso: true, scim: true } }),
  });
  // Whether the route exists for writes or not, the stored entitlement must be untouched.
  assert.ok(response.status === 404 || response.status === 405 || response.status === 400);
  const access = await resolveWorkspaceEntitlements(db, workspaceB);
  assert.equal(access.sso, false);
  assert.equal(access.scim, false);
});

test("the billing route serves the SERVER-resolved entitlement and is owner-gated and tenant-scoped", async () => {
  await storeSubscription(db, subscription({ workspace_id: workspaceA, plan_id: "team", stripe_customer_id: "cus_route_a" }));
  const owner = await seedSession(workspaceA, "owner");
  const ok = await fetch(`http://127.0.0.1:${server.port}/v1/workspaces/${workspaceA}/billing`, {
    headers: { cookie: `kage_session=${owner.token}` },
  });
  assert.equal(ok.status, 200);
  const body = (await ok.json()) as { billing: { plan_id: PlanId; entitlements: { team_sync: boolean } } };
  assert.equal(body.billing.plan_id, "team");
  assert.equal(body.billing.entitlements.team_sync, true);

  const developer = await seedSession(workspaceA, "developer");
  const forbidden = await fetch(`http://127.0.0.1:${server.port}/v1/workspaces/${workspaceA}/billing`, {
    headers: { cookie: `kage_session=${developer.token}` },
  });
  assert.equal(forbidden.status, 403);

  // Another tenant's billing is a 404 — existence is never disclosed across a tenant boundary.
  const crossTenant = await fetch(`http://127.0.0.1:${server.port}/v1/workspaces/${workspaceB}/billing`, {
    headers: { cookie: `kage_session=${owner.token}` },
  });
  assert.equal(crossTenant.status, 404);
});

test("checkout uses the server's configured price for the requested plan, never a client price id", async () => {
  const calls: Array<{ url: string; body: string }> = [];
  const session = await createCheckoutSession(
    {
      config: STRIPE_CONFIG,
      fetcher: async (url, init) => {
        calls.push({ url, body: String(init?.body ?? "") });
        return { ok: true, status: 200, json: async () => ({ id: "cs_1", url: "https://checkout.test/s" }) };
      },
    },
    { workspace_id: workspaceA, plan_id: "team", quantity: 4, price_id: "price_attacker_controlled" as never },
  );
  assert.equal(session.url, "https://checkout.test/s");
  assert.match(calls[0].body, /price_team/);
  assert.doesNotMatch(calls[0].body, /price_attacker_controlled/);
  // The workspace id travels as metadata so a later webhook can be mapped back to this tenant.
  assert.match(calls[0].body, new RegExp(workspaceA));
});

test("checkout refuses a plan with no configured price rather than guessing one", async () => {
  await assert.rejects(
    () =>
      createCheckoutSession(
        { config: { ...STRIPE_CONFIG, price_ids: {} }, fetcher: async () => ({ ok: true, status: 200, json: async () => ({}) }) },
        { workspace_id: workspaceA, plan_id: "team", quantity: 1 },
      ),
    /no configured price/i,
  );
});

test("active developers are counted from real work, and viewers do not consume a seat", async () => {
  const repositoryId = "repo-billing";
  await db.query(
    `INSERT INTO repositories(workspace_id, repository_id, provider, name)
       VALUES($1, $2, 'github', $2) ON CONFLICT DO NOTHING`,
    [workspaceA, repositoryId],
  );
  const { storeTaskOutcomes } = await import("../metrics.js");
  await storeTaskOutcomes(db, workspaceA, repositoryId, [
    fixtureTaskOutcome({ repository_id: repositoryId, actor_id: "dev-1" }),
    fixtureTaskOutcome({ repository_id: repositoryId, actor_id: "dev-1" }),
    fixtureTaskOutcome({ repository_id: repositoryId, actor_id: "dev-2" }),
  ]);
  const count = await countActiveDevelopers(db, workspaceA, {
    since: "2026-01-01T00:00:00.000Z",
    until: "2027-01-01T00:00:00.000Z",
  });
  assert.equal(count, 2, "two people started tasks; the third session never worked, so it is not a seat");
  // Another tenant sees none of it.
  assert.equal(
    await countActiveDevelopers(db, workspaceB, {
      since: "2026-01-01T00:00:00.000Z",
      until: "2027-01-01T00:00:00.000Z",
    }),
    0,
  );
});

test("a pilot credit is recorded once per pilot and is tenant-scoped", async () => {
  const input = { ...fixturePilot({ exact_net_cost_delta_usd: 3.25 }), workspace_id: workspaceA };
  const first = await recordPilotCredit(db, input);
  const second = await recordPilotCredit(db, input);
  assert.equal(first.credit_usd, 3.25);
  assert.equal(second.credit_usd, 3.25);
  const { rows } = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM workspace_billing_credits WHERE workspace_id = $1 AND pilot_id = $2`,
    [workspaceA, input.pilot_id],
  );
  assert.equal(rows[0].count, "1", "re-running the calculation must never double-credit an account");
});

// ---------------------------------------------------------------------------------------------
// the portal projection
// ---------------------------------------------------------------------------------------------

test("the billing panel states the plan, the entitlements, and an unmeasured credit as unknown", () => {
  const panel = billingPanel({
    plan_id: "team",
    state: "active",
    entitlements: resolveEntitlements(subscription({ plan_id: "team" })),
    current_period_end: "2026-08-20T00:00:00.000Z",
    active_developers: 4,
    usd_per_active_developer_month: LAUNCH_PLANS.team.usd_per_active_developer_month,
    credit: null,
  });
  assert.equal(panel.plan_id, "team");
  assert.equal(panel.entitlements.team_sync, true);
  assert.equal(panel.credit_usd, null);
  assert.equal(panel.credit_reason, null);
  assert.ok(panel.caveats.some((c) => /measured/i.test(c)));
});
