// Phase E Task 5 — the least-privilege GitHub App integration.
//
// Everything here runs on FIXTURES and a real PostgreSQL: no live GitHub account, app registration, or
// network call is required or attempted. What is proven: an invalid signature is rejected before the
// processor is ever reached; a redelivered event is processed exactly once (against the real
// idempotency ledger); a read-only installation never attempts a Checks write; and an installation
// token is cached only until the expiry GitHub itself reported.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { startTestPostgres, type TestPostgres } from "../test-support/pg.js";
import { createDb, type Db } from "../db.js";
import { migrate } from "../migrate.js";
import { computeSignature, verifySignature } from "./signature.js";
import { handleWebhook, type WebhookOutcome } from "./webhooks.js";
import { canPublishChecks, publishCheck, type CheckInstallation } from "./checks.js";
import { InstallationTokenSource, type Fetcher } from "./auth.js";
import { HANDLED_EVENTS, REQUESTED_PERMISSIONS, loadGitHubAppConfig } from "./config.js";

const SECRET = "test-webhook-secret";

let embedded: TestPostgres | null = null;
let db: Db;
let workspaceId: string;

before(async () => {
  let url = process.env.KAGE_TEST_DATABASE_URL;
  if (!url) {
    embedded = await startTestPostgres();
    url = embedded.url;
  }
  db = createDb(url);
  await migrate(db);
  workspaceId = randomUUID();
});

after(async () => {
  await db?.close();
  await embedded?.stop();
});

function fixtureWebhookBody(): string {
  return JSON.stringify({ action: "opened", repository: { full_name: "acme/api" } });
}

/** Count how many times the processor ran, so "never called" is provable rather than assumed. */
function countingProcessor() {
  const state = { calls: 0 };
  return {
    state,
    process: async () => {
      state.calls += 1;
    },
  };
}

test("GitHub webhook rejects an invalid sha256 signature before parsing", async () => {
  const processor = countingProcessor();
  const outcome: WebhookOutcome = await handleWebhook(
    { db, secret: SECRET, process: processor.process },
    {
      rawBody: fixtureWebhookBody(),
      signature: "sha256=invalid",
      event: "pull_request",
      deliveryId: `delivery-${randomUUID()}`,
      workspaceId,
    },
  );
  assert.equal(outcome.status, 401);
  assert.equal(processor.state.calls, 0);
});

test("a body tampered after signing is rejected", async () => {
  const processor = countingProcessor();
  const signed = fixtureWebhookBody();
  const signature = computeSignature(SECRET, signed);
  const outcome = await handleWebhook(
    { db, secret: SECRET, process: processor.process },
    {
      rawBody: `${signed} `, // one byte different from what was signed
      signature,
      event: "pull_request",
      deliveryId: `delivery-${randomUUID()}`,
      workspaceId,
    },
  );
  assert.equal(outcome.status, 401);
  assert.equal(processor.state.calls, 0);
});

test("duplicate GitHub delivery id is processed once", async () => {
  const processor = countingProcessor();
  const body = fixtureWebhookBody();
  const signature = computeSignature(SECRET, body);
  const deliveryId = `delivery-${randomUUID()}`;
  const deps = { db, secret: SECRET, process: processor.process };
  const delivery = { rawBody: body, signature, event: "pull_request", deliveryId, workspaceId };

  const first = await handleWebhook(deps, delivery);
  const second = await handleWebhook(deps, delivery);

  assert.equal(first.status, 202);
  assert.equal(second.status, 200);
  assert.equal(second.result, "duplicate_ignored");
  assert.equal(processor.state.calls, 1);
});

test("the same delivery id in a different workspace is not swallowed as a duplicate", async () => {
  const processor = countingProcessor();
  const body = fixtureWebhookBody();
  const signature = computeSignature(SECRET, body);
  const deliveryId = `delivery-${randomUUID()}`;
  const deps = { db, secret: SECRET, process: processor.process };
  const otherWorkspace = randomUUID();

  await handleWebhook(deps, { rawBody: body, signature, event: "push", deliveryId, workspaceId });
  const other = await handleWebhook(deps, {
    rawBody: body,
    signature,
    event: "push",
    deliveryId,
    workspaceId: otherWorkspace,
  });

  assert.equal(other.status, 202);
  assert.equal(processor.state.calls, 2);
});

test("an unsubscribed event is acknowledged but never processed", async () => {
  const processor = countingProcessor();
  const body = fixtureWebhookBody();
  const outcome = await handleWebhook(
    { db, secret: SECRET, process: processor.process },
    {
      rawBody: body,
      signature: computeSignature(SECRET, body),
      event: "star",
      deliveryId: `delivery-${randomUUID()}`,
      workspaceId,
    },
  );
  assert.equal(outcome.result, "event_ignored");
  assert.equal(processor.state.calls, 0);
  assert.equal(HANDLED_EVENTS.has("star"), false);
});

test("read-only installation does not attempt PR check writes", async () => {
  let attempted = false;
  const fetcher: Fetcher = async () => {
    attempted = true;
    return { ok: true, status: 201, json: async () => ({ id: 1 }) };
  };
  const readOnlyInstallation: CheckInstallation = {
    installation_id: "42",
    owner: "acme",
    repo: "api",
    permissions: { ...REQUESTED_PERMISSIONS },
  };
  const result = await publishCheck(
    readOnlyInstallation,
    { head_sha: "abc123", conclusion: "neutral", title: "Kage", summary: "see receipt" },
    { apiBaseUrl: "https://api.github.test", token: { token: "t", expires_at: "", permissions: {} }, fetcher },
  );
  assert.equal(result.status, "skipped_missing_permission");
  assert.equal(attempted, false, "a read-only installation must never call the checks API");
  assert.equal(canPublishChecks(readOnlyInstallation), false);
});

test("checks write is honoured only when the installation granted it", async () => {
  const fetcher: Fetcher = async () => ({ ok: true, status: 201, json: async () => ({ id: 99 }) });
  const result = await publishCheck(
    { installation_id: "42", owner: "acme", repo: "api", permissions: { checks: "write" } },
    { head_sha: "abc123", conclusion: "success", title: "Kage", summary: "see receipt" },
    { apiBaseUrl: "https://api.github.test", token: { token: "t", expires_at: "", permissions: {} }, fetcher },
  );
  assert.deepEqual(result, { status: "published", check_run_id: "99" });
});

test("a check summary carrying raw payload content is refused", async () => {
  await assert.rejects(
    () =>
      publishCheck(
        { installation_id: "42", owner: "acme", repo: "api", permissions: { checks: "write" } },
        {
          head_sha: "abc",
          conclusion: "neutral",
          title: "Kage",
          summary: '{"prompt": "the user asked ..."}',
        },
        {
          apiBaseUrl: "https://api.github.test",
          token: { token: "t", expires_at: "", permissions: {} },
          fetcher: async () => ({ ok: true, status: 201, json: async () => ({ id: 1 }) }),
        },
      ),
    /raw_payload/,
  );
});

test("an installation token is cached only until the expiry GitHub reported", async () => {
  let issued = 0;
  let clock = Date.parse("2026-07-19T12:00:00.000Z");
  const fetcher: Fetcher = async () => {
    issued += 1;
    return {
      ok: true,
      status: 201,
      json: async () => ({
        token: `ghs_token_${issued}`,
        // GitHub's own reported expiry: 10 minutes out from the current clock.
        expires_at: new Date(clock + 10 * 60_000).toISOString(),
        permissions: { contents: "read" },
      }),
    };
  };
  const source = new InstallationTokenSource({
    config: {
      app_id: "1",
      // A throwaway PKCS#8 key generated for this test only — never a real credential.
      private_key: TEST_PRIVATE_KEY,
      webhook_secret: SECRET,
      api_base_url: "https://api.github.test",
    },
    fetcher,
    now: () => clock,
  });

  const first = await source.tokenFor("42");
  const cached = await source.tokenFor("42");
  assert.equal(issued, 1, "a still-valid token must be reused, not re-minted");
  assert.equal(cached.token, first.token);

  // Move past GitHub's reported expiry: the cached token must NOT be reused.
  clock += 10 * 60_000;
  const refreshed = await source.tokenFor("42");
  assert.equal(issued, 2, "an expired token must be re-minted");
  assert.notEqual(refreshed.token, first.token);
});

test("configuration is absent unless deployment secrets supply it", () => {
  assert.equal(loadGitHubAppConfig({} as NodeJS.ProcessEnv), null);
  const configured = loadGitHubAppConfig({
    KAGE_GITHUB_APP_ID: "1",
    KAGE_GITHUB_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----",
    KAGE_GITHUB_WEBHOOK_SECRET: "s",
  } as NodeJS.ProcessEnv);
  assert.ok(configured);
  assert.match(configured.private_key, /\n/, "escaped newlines in the secret are restored");
  assert.equal(REQUESTED_PERMISSIONS.checks, undefined, "checks write is never requested by default");
});

test("signature verification is exact", () => {
  const body = fixtureWebhookBody();
  assert.equal(verifySignature(SECRET, body, computeSignature(SECRET, body)), true);
  assert.equal(verifySignature(SECRET, body, undefined), false);
  assert.equal(verifySignature(SECRET, body, "sha256=deadbeef"), false);
  assert.equal(verifySignature("other-secret", body, computeSignature(SECRET, body)), false);
});

// A test-only RSA key (PKCS#8). Generated for this file; it authenticates nothing.
const TEST_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCm9rzAhNx1m+o3
NEpeKsgt2B9nIci8ReOxATrbo6F6DvLxCgFbsg1csBUJ8NK0B4/3gFTRE7VoCgtB
OfxCNDx8H1C43hx7BTXUz/WWzgl17xrNBtfm8tsFkUaKa+wXCT6k+7Nuy800r6l3
yuYayVuSv7HJu3H+LENhLiBvjjuGcwecigSulFGFRcNySSgFcH/C6RkXTTUcJJfo
WQUpWAGi2Gfdhb7hn/88lxxY8SME5UTAkhHruM7ZTG/FQgvpGhi5QJA7jvpLUbdg
LsmEGZVVDXtWZddjfOcVjwvoCih7i9bj5rodfWXVNPS3fgOvIP4PR8WYWs5O7kyt
aznZkSflAgMBAAECggEAClAvDD9ItN+6zHUnlisorqLtHFGQajIbpJPcXwkmUM6l
QAarsHkjl9LtQcNv6HHtI88irhV8Z57zNLC7ExsnP02Ejsly00CDo4/C7kaaJqrs
f2H0VSOG1uWzM0VY/Hqe4CcHXYkrivJs0pBPErQsZWNU5+PzCyMQeGtr0n2OfLlQ
WCRxVl34Ur54ee8fejox3UQscEs43BK/OxvuyfXM+ticJbkwd8ddGvV9YVpw1Ype
pnySMR1JAiE4W2GazZtJ0zXeQGrWsFLaLKXiDrDGaUvrMMzqjzdzv1/LLZ5sKR9R
4qTHbMAc92/EAbHR4DCiGSK61nd+PXYACuLZm25IcQKBgQDaoNIHinVePikmIdAm
oN4SaLRXt9XEYyIZOKbNjZ6YWiEGljveyVHlErbnQokHQWZK+7Ckqc0VvUSOzg01
7T18PBXoQEw5MPqGSfyHedBIyfC3Qk/rhXeBZyMGFQYI6xwpR67wI4+NuYI6g+F/
HTNhBtEmttWIzM8xpwo9CRWSDQKBgQDDgRTC0MuXBTWPB0n2Kr1x0tzcqZJpkZAx
cGUFHn7uE1vCI4bo1ZwScvvqf0HDdnrM5l9YLUOrZxSXLlTq8c/EhNvlICeblOee
Oc53FQQOk2AwhMUXH+IcxI2Gel7U8J+Mmh7jxpZp7CjkX6hOsLFx4HnTjoUskvr/
BHeoszBvOQKBgQCIfYyCPrPFkYM5FjUQWLAryAiHFvMzNzyriE3C2J5huSsTJKne
Dcu9+rALsuM/j1ngiD+gnY22+8GYchWXTDRtokl/BN1Rez18pyYsIiWhu8k3cAPb
IykXtZ8NBgUNflLHhsQ1kc3miiE+jOUz6bQQ6COdStoHHO5hrkpbDpfT5QKBgFnk
ol0pkFMya/wGB/YOlOkfYbp8pfuwmLKC0ZBXA1oIwKo1l7S7c3XwNPEP7ncnpTNN
wg1TUsgfL5KMFTOqWDQuOsXR0SRyhUV1ov+SRDlHfnUQt2b4nAlKPyDUZ4JV2abW
vtlQ2Jx/oBXR/huglxabdqjV4Vorgwl7TmHdcqnRAoGAbOG7eMsgTVqBe7FtNCtn
acZPdX88zYqSdgZNeWlIAg/SZD17YeF89tmbQZWko4CTD92K1AFLYp7SCHiKY/x3
u/qGgvATlvh2/t7jJ+YlQ7uvqjPlGkzutT0IvtBAghCLR7+cHvotsw8pw8vF9962
XHnwZmelJ530ylqRJC4wYqY=
-----END PRIVATE KEY-----`;
