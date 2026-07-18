import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { DEFAULT_CONTEXT_BUDGET_POLICY, type ContextBudgetPolicy } from "./budget-policy.js";
import { builtinCompressorProvider } from "./compressors/provider.js";
import { ContentStore } from "./content-store.js";
import { anthropicLiveZone, unknownLiveZone } from "./live-zone.js";
import {
  transformRequest,
  transformToolResult,
  type MessagesRequestBody,
  type ToolPayload,
  type TransformContext,
} from "./transform.js";

function tempStore(): ContentStore {
  const dir = mkdtempSync(join(tmpdir(), "kage-transform-"));
  return new ContentStore({ root: dir });
}

function fixtureProviderRequest(): MessagesRequestBody {
  return {
    model: "claude-3-5-sonnet-latest",
    system: [{ type: "text", text: "You are Claude Code." }],
    tools: [{ name: "bash", description: "run a shell command" }],
    messages: [
      { role: "user", content: "first question" },
      { role: "assistant", content: "sure, here is an answer" },
      { role: "user", content: "please help me fix the failing test" },
    ],
  };
}

function fixtureLargeToolResult(): ToolPayload {
  const lines: string[] = ["starting build"];
  for (let i = 0; i < 200; i += 1) lines.push("compiling module foo");
  lines.push("done");
  return { body: Buffer.from(lines.join("\n"), "utf8"), media_type: "text/plain" };
}

function fixtureTransformContext(overrides: Partial<TransformContext> = {}): TransformContext {
  return {
    task_id: "task_test",
    request_id: "req_test",
    provider: "anthropic",
    store: null,
    policy: DEFAULT_CONTEXT_BUDGET_POLICY,
    compressorProvider: builtinCompressorProvider(),
    context_window: 200_000,
    injection: { text: "[kage-context] reuse existing helper parseWidget()", requested_tokens: 50 },
    lossy: false,
    ...overrides,
  };
}

// ---- live zone -----------------------------------------------------------------------------

test("anthropicLiveZone marks system/tools/older turns stable and the final user turn mutable", () => {
  const request = fixtureProviderRequest();
  const zone = anthropicLiveZone(request);
  assert.equal(zone.injection_location, "user_turn");
  assert.equal(zone.mutable_start, 2);
  assert.equal(zone.mutable_end, 3);
  assert.equal(zone.stable_prefix_end, 2);
});

test("anthropicLiveZone with no user turn yields an empty mutable region", () => {
  const zone = anthropicLiveZone({ messages: [{ role: "assistant", content: "hi" }] });
  assert.equal(zone.mutable_start, zone.mutable_end);
});

test("unknownLiveZone never opens a mutable region", () => {
  const zone = unknownLiveZone(fixtureProviderRequest());
  assert.equal(zone.mutable_start, zone.mutable_end);
});

// ---- plan step 1 tests ---------------------------------------------------------------------

test("transform preserves system tools and older turns byte-for-byte", async () => {
  const request = fixtureProviderRequest();
  const result = await transformRequest(request, fixtureTransformContext());
  assert.deepEqual(result.request.system, request.system);
  assert.deepEqual(result.request.tools, request.tools);
  assert.deepEqual(result.request.messages.slice(0, -1), request.messages.slice(0, -1));
  // the mutable turn WAS changed, so the test above is meaningful
  assert.notDeepEqual(result.request.messages.at(-1), request.messages.at(-1));
});

test("every lossy transform includes a retrievable exact original", async () => {
  const store = tempStore();
  const result = await transformToolResult(fixtureLargeToolResult(), fixtureTransformContext({ lossy: true, store }));
  assert.match(result.output, /kage-content:[a-f0-9]{64}/);
  const id = result.retrieval_ids[0];
  assert.ok(id, "expected a retrieval id");
  assert.deepEqual(store.get(id).body, fixtureLargeToolResult().body);
  assert.ok(result.lossy);
  assert.ok(result.output_bytes < result.original_bytes, "lossy output must be smaller than original");
});

// ---- honesty gates -------------------------------------------------------------------------

test("no content store means no lossy output — fail-open passthrough", async () => {
  const result = await transformToolResult(fixtureLargeToolResult(), fixtureTransformContext({ lossy: true, store: null }));
  assert.equal(result.retrieval_ids.length, 0);
  assert.equal(result.lossy, false);
  assert.equal(result.output, fixtureLargeToolResult().body.toString("utf8"));
});

test("lossy disabled by policy means no lossy output even with a store", async () => {
  const store = tempStore();
  const result = await transformToolResult(fixtureLargeToolResult(), fixtureTransformContext({ lossy: false, store }));
  assert.equal(result.retrieval_ids.length, 0);
  assert.equal(result.lossy, false);
});

test("transformToolResult never throws on arbitrary bytes", async () => {
  const payload: ToolPayload = { body: Buffer.from([0xff, 0xfe, 0x00, 0x01, 0x80]), media_type: "application/octet-stream" };
  const result = await transformToolResult(payload, fixtureTransformContext({ lossy: true, store: tempStore() }));
  assert.equal(result.lossy, false);
  assert.equal(result.retrieval_ids.length, 0);
});

test("a request with nothing to transform returns the original object and a noop receipt", async () => {
  const request = fixtureProviderRequest();
  const context = fixtureTransformContext({ injection: null });
  const result = await transformRequest(request, context);
  assert.equal(result.request, request, "noop must return the original object untouched");
  assert.equal(result.receipt.status, "noop");
  assert.equal(result.receipt.transformations.length, 0);
  assert.equal(result.retrieval_ids.length, 0);
});

test("transformRequest fails open (original + failed-open receipt) on internal error", async () => {
  const request = fixtureProviderRequest();
  const context = fixtureTransformContext({
    liveZone: () => {
      throw new Error("boom");
    },
  });
  const result = await transformRequest(request, context);
  assert.equal(result.request, request);
  assert.equal(result.receipt.status, "failed_open");
  assert.equal(result.receipt.transformed_bytes, result.receipt.original_bytes);
  assert.equal(result.receipt.before_tokens, null);
  assert.equal(result.receipt.after_tokens, null);
  assert.equal(result.retrieval_ids.length, 0);
});

test("dedup drops an injection whose id was already delivered", async () => {
  const request = fixtureProviderRequest();
  const context = fixtureTransformContext({
    injection: { text: "[kage-context] already delivered", requested_tokens: 50, id: "cap-1" },
    delivered_ids: new Set(["cap-1"]),
  });
  const result = await transformRequest(request, context);
  assert.equal(result.receipt.status, "noop");
});

test("recount reports measured token counts when a counter is supplied, null otherwise", async () => {
  const request = fixtureProviderRequest();
  let calls = 0;
  const withCounter = await transformRequest(
    request,
    fixtureTransformContext({
      tokenCounter: async () => {
        calls += 1;
        return calls === 1 ? 1000 : 1050;
      },
    }),
  );
  assert.equal(withCounter.receipt.before_tokens, 1000);
  assert.equal(withCounter.receipt.after_tokens, 1050);
  assert.equal(withCounter.receipt.measurement_quality, "exact");

  const noCounter = await transformRequest(request, fixtureTransformContext());
  assert.equal(noCounter.receipt.before_tokens, null);
  assert.equal(noCounter.receipt.after_tokens, null);
  assert.equal(noCounter.receipt.measurement_quality, "unavailable");
});

test("recount stays partial/null when the counter can only measure one side", async () => {
  const request = fixtureProviderRequest();
  let calls = 0;
  const result = await transformRequest(
    request,
    fixtureTransformContext({
      tokenCounter: async () => {
        calls += 1;
        return calls === 1 ? 1000 : null;
      },
    }),
  );
  assert.equal(result.receipt.before_tokens, 1000);
  assert.equal(result.receipt.after_tokens, null);
  assert.equal(result.receipt.measurement_quality, "partial");
});

test("transformRequest compresses a large tool payload inside the mutable turn and stores the original", async () => {
  const store = tempStore();
  const big = fixtureLargeToolResult().body.toString("utf8");
  const request: MessagesRequestBody = {
    model: "claude-3-5-sonnet-latest",
    system: [{ type: "text", text: "You are Claude Code." }],
    tools: [],
    messages: [
      { role: "user", content: "run the build" },
      { role: "assistant", content: [{ type: "tool_use", id: "t1", name: "bash", input: {} }] },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: big }] },
    ],
  };
  const result = await transformRequest(request, fixtureTransformContext({ lossy: true, store, injection: null }));
  assert.ok(result.retrieval_ids.length >= 1, "expected a stored original");
  const stored = store.get(result.retrieval_ids[0]);
  assert.equal(stored.body.toString("utf8"), big);
  // stable prefix untouched
  assert.deepEqual(result.request.messages.slice(0, -1), request.messages.slice(0, -1));
  assert.ok(result.receipt.transformations.includes("payload_compress"));
});

test("a multi-text-block tool_result stores the exact original content array, not the flattened join", async () => {
  const store = tempStore();
  const blockA = ["starting build", ...Array<string>(200).fill("compiling module foo"), "done A"].join("\n");
  const blockB = ["running tests", ...Array<string>(200).fill("PASS suite bar"), "done B"].join("\n");
  const originalContent = [
    { type: "text", text: blockA },
    { type: "text", text: blockB },
  ];
  const request: MessagesRequestBody = {
    model: "claude-3-5-sonnet-latest",
    system: [{ type: "text", text: "You are Claude Code." }],
    tools: [],
    messages: [
      { role: "user", content: "run the build" },
      { role: "assistant", content: [{ type: "tool_use", id: "t1", name: "bash", input: {} }] },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: originalContent }] },
    ],
  };
  const result = await transformRequest(request, fixtureTransformContext({ lossy: true, store, injection: null }));
  assert.ok(result.retrieval_ids.length >= 1, "expected a stored original");
  const stored = store.get(result.retrieval_ids[0]);
  // The reversibility gate: the EXACT original two-block content array must be recoverable — never
  // the flattened "A\nB" join, which cannot rebuild the byte-exact original request.
  assert.equal(stored.body.toString("utf8"), JSON.stringify(originalContent));
  assert.deepEqual(JSON.parse(stored.body.toString("utf8")), originalContent);
  // the tool_result was compressed to a single inner text block carrying the retrieval marker
  const outBlocks = (result.request.messages.at(-1) as { content: Array<{ type: string; content: Array<{ type: string; text: string }> }> }).content;
  assert.equal(outBlocks.length, 1);
  assert.equal(outBlocks[0].type, "tool_result");
  const inner = outBlocks[0].content;
  assert.equal(inner.length, 1);
  assert.equal(inner[0].type, "text");
  assert.match(inner[0].text, /kage-content:[a-f0-9]{64}/);
  assert.ok(result.receipt.transformations.includes("payload_compress"));
});
