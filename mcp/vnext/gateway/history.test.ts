import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { digestHistoryMessages, HISTORY_DIGEST_TRANSFORMATION } from "./history.js";
import { transformRequest, type MessagesRequestBody, type TransformContext } from "./transform.js";
import { anthropicLiveZone } from "./live-zone.js";
import { ContentStore, RETRIEVAL_ID_PREFIX } from "./content-store.js";
import { builtinCompressorProvider } from "./compressors/provider.js";
import { DEFAULT_CONTEXT_BUDGET_POLICY, type ContextBudgetPolicy } from "./budget-policy.js";

// W2 — reversible HISTORY compression: the real context-window waste in agent sessions.
//
// Old tool_result bodies are re-sent verbatim on EVERY turn of a session; on a 50-turn session every
// stale test log is re-transmitted 50 times. This transform digests tool payloads that sit in the
// STABLE PREFIX (older than the live zone) down to a deterministic head/errors/tail summary plus a
// kage-content retrieval marker — the exact original is stored first, so nothing is irretrievable.
//
// The correctness bar these tests enforce:
//   DETERMINISM   same input bytes -> byte-identical digest, across calls and turns. This is what
//                 makes the transformed prefix ITSELF cache-stable: after one cache miss on first
//                 digestion, subsequent requests re-hit the provider prompt cache on the digest form.
//   IDEMPOTENCE   digesting an already-digested history changes nothing (no marker-on-marker).
//   REVERSIBILITY the stored original is byte-exact retrievable via its kage-content id.
//   ZONE SAFETY   nothing at or after mutable_start is ever touched.
//   OFF BY DEFAULT policy.history_compression defaults false; nothing happens until a repo opts in.
//   FAIL-OPEN     no store (or a store failure) means the history is left byte-identical.

const BIG_LOG = [
  "$ npm test",
  ...Array.from({ length: 300 }, (_, i) => `ok ${i + 1} some-test-case-${i + 1}`),
  "error: 2 tests failed",
  "FAIL src/thing.test.ts",
  "# tests 302",
  "# pass 300",
  "# fail 2",
].join("\n");

function policyOn(overrides: Partial<ContextBudgetPolicy> = {}): ContextBudgetPolicy {
  return {
    ...DEFAULT_CONTEXT_BUDGET_POLICY,
    lossy_compression: true,
    history_compression: true,
    ...overrides,
  };
}

function anthropicSession(): MessagesRequestBody {
  return {
    model: "claude-sonnet-5",
    system: "be terse",
    messages: [
      { role: "user", content: "run the tests" },
      { role: "assistant", content: [{ type: "tool_use", id: "tu_1", name: "bash", input: { cmd: "npm test" } }] },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "tu_1", content: BIG_LOG }] },
      { role: "assistant", content: "2 tests failed in src/thing.test.ts" },
      { role: "user", content: "fix them" },
    ],
  } as unknown as MessagesRequestBody;
}

function contextFor(dir: string | null, overrides: Partial<TransformContext> = {}): TransformContext {
  return {
    task_id: "task-history-w2",
    request_id: "req-1",
    provider: "anthropic",
    store: dir ? new ContentStore({ root: dir }) : null,
    policy: policyOn(),
    compressorProvider: builtinCompressorProvider(),
    liveZone: anthropicLiveZone,
    ...overrides,
  };
}

test("history digest shrinks an old tool_result, stores the exact original, and never touches the live zone", async () => {
  const dir = mkdtempSync(join(tmpdir(), "kage-hist-"));
  try {
    const request = anthropicSession();
    const liveBefore = JSON.stringify(request.messages.slice(4));
    const result = await transformRequest(request, contextFor(dir));
    const messages = result.request.messages as Array<Record<string, unknown>>;

    // The old tool_result (index 2) is digested: much smaller, marker present, structure preserved.
    const block = (messages[2].content as Array<Record<string, unknown>>)[0];
    assert.equal(block.type, "tool_result");
    assert.equal(block.tool_use_id, "tu_1", "the tool_use pairing must survive");
    const digested = String(block.content);
    assert.ok(digested.length < BIG_LOG.length / 4, "an old tool payload must shrink hard");
    assert.match(digested, /kage-content:[0-9a-f]{64}/);
    assert.match(digested, /error: 2 tests failed/, "error lines survive in the digest");

    // Reversibility: the stored original is byte-exact.
    const marker = /kage-content:[0-9a-f]{64}/.exec(digested)?.[0] as string;
    const store = new ContentStore({ root: dir });
    const restored = store.get(marker);
    assert.equal(restored.body.toString("utf8"), BIG_LOG, "the exact original must be retrievable");

    // Live zone untouched.
    assert.equal(JSON.stringify(messages.slice(4)), liveBefore);
    assert.ok(result.receipt.transformations.includes(HISTORY_DIGEST_TRANSFORMATION));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("determinism + idempotence: same input digests byte-identically, and a digested history is a fixed point", async () => {
  const dir = mkdtempSync(join(tmpdir(), "kage-hist-d-"));
  try {
    const first = await transformRequest(anthropicSession(), contextFor(dir));
    const second = await transformRequest(anthropicSession(), contextFor(dir));
    assert.equal(
      JSON.stringify(first.request),
      JSON.stringify(second.request),
      "the digest must be deterministic across calls (cache-stability across turns)",
    );

    // Running the pipeline AGAIN on the already-digested request must change nothing.
    const again = await transformRequest(first.request, contextFor(dir));
    assert.equal(
      JSON.stringify(again.request),
      JSON.stringify(first.request),
      "digesting a digest must be a no-op (idempotent fixed point)",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("identical repeated payloads across turns dedup to ONE stored object with the same marker", async () => {
  const dir = mkdtempSync(join(tmpdir(), "kage-hist-dd-"));
  try {
    const request = {
      model: "claude-sonnet-5",
      messages: [
        { role: "user", content: [{ type: "tool_result", tool_use_id: "a", content: BIG_LOG }] },
        { role: "assistant", content: "seen" },
        { role: "user", content: [{ type: "tool_result", tool_use_id: "b", content: BIG_LOG }] },
        { role: "assistant", content: "seen again" },
        { role: "user", content: "next" },
      ],
    } as unknown as MessagesRequestBody;
    const result = await transformRequest(request, contextFor(dir));
    const messages = result.request.messages as Array<Record<string, unknown>>;
    const m1 = /kage-content:[0-9a-f]{64}/.exec(String((messages[0].content as Array<Record<string, unknown>>)[0].content))?.[0];
    const m2 = /kage-content:[0-9a-f]{64}/.exec(String((messages[2].content as Array<Record<string, unknown>>)[0].content))?.[0];
    assert.ok(m1 && m2);
    assert.equal(m1, m2, "identical bodies must share one content-addressed object");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("history compression is OFF by default: lossy alone does not digest the prefix", async () => {
  const dir = mkdtempSync(join(tmpdir(), "kage-hist-off-"));
  try {
    const request = anthropicSession();
    const before = JSON.stringify(request);
    const result = await transformRequest(request, contextFor(dir, {
      policy: { ...DEFAULT_CONTEXT_BUDGET_POLICY, lossy_compression: true },
    }));
    assert.equal(JSON.stringify(result.request), before, "no opt-in, no history mutation");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("fail-open: no store means the history is left byte-identical", async () => {
  const request = anthropicSession();
  const before = JSON.stringify(request);
  const result = await transformRequest(request, contextFor(null));
  assert.equal(JSON.stringify(result.request), before);
});

test("small payloads below the history floor are left alone", async () => {
  const dir = mkdtempSync(join(tmpdir(), "kage-hist-floor-"));
  try {
    const request = {
      model: "claude-sonnet-5",
      messages: [
        { role: "user", content: [{ type: "tool_result", tool_use_id: "s", content: "12 bytes ok" }] },
        { role: "user", content: "next" },
      ],
    } as unknown as MessagesRequestBody;
    const before = JSON.stringify(request);
    const result = await transformRequest(request, contextFor(dir));
    assert.equal(JSON.stringify(result.request), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("openai role:tool string history digests the same way (provider-neutral)", async () => {
  const dir = mkdtempSync(join(tmpdir(), "kage-hist-oai-"));
  try {
    const request = {
      model: "gpt-4o",
      messages: [
        { role: "user", content: "run tests" },
        { role: "assistant", content: null, tool_calls: [{ id: "c1", type: "function", function: { name: "bash", arguments: "{}" } }] },
        { role: "tool", tool_call_id: "c1", content: BIG_LOG },
        { role: "assistant", content: "2 failed" },
        { role: "user", content: "fix" },
      ],
    } as unknown as MessagesRequestBody;
    const result = await transformRequest(request, contextFor(dir, { provider: "openai" }));
    const messages = result.request.messages as Array<Record<string, unknown>>;
    const digested = String(messages[2].content);
    assert.ok(digested.length < BIG_LOG.length / 4);
    assert.match(digested, /kage-content:[0-9a-f]{64}/);
    assert.equal(messages[2].tool_call_id, "c1", "openai tool_call pairing survives");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("digestHistoryMessages is pure over its inputs and reports honest byte accounting", async () => {
  const dir = mkdtempSync(join(tmpdir(), "kage-hist-pure-"));
  try {
    const store = new ContentStore({ root: dir });
    const messages = anthropicSession().messages;
    const out = await digestHistoryMessages(messages, 4, {
      store,
      minBytes: 2048,
    });
    assert.equal(out.changed, true);
    assert.ok(out.saved_bytes > BIG_LOG.length / 2, "saved bytes must reflect the real shrink");
    assert.equal(out.retrieval_ids.length, 1);
    // Input array not mutated in place.
    const original = (messages[2] as Record<string, unknown>).content as Array<Record<string, unknown>>;
    assert.equal(String(original[0].content), BIG_LOG);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
