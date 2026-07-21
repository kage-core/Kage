import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createOpenAiProviderAdapter, openaiLiveZone, OPENAI_PIPELINE_PROVIDER } from "./openai.js";
import { providerAdapterFor } from "./anthropic.js";
import { transformRequest, type MessagesRequestBody, type TransformContext } from "../transform.js";
import { ContentStore } from "../content-store.js";
import { builtinCompressorProvider } from "../compressors/provider.js";
import { DEFAULT_CONTEXT_BUDGET_POLICY } from "../budget-policy.js";

// W1 — the OpenAI binding of the Phase D transform pipeline.
//
// OpenAI Chat Completions shares the pipeline's message shape (a `messages` array with string or
// {type:"text"} parts content), so these tests prove the SAME honesty gates Anthropic has, on the
// OpenAI wire: injection lands only in the mutable last-user-turn zone, the stable prefix survives
// byte-for-byte (prompt-cache safety), lossy compression stores the exact original first, and a
// missing store means byte-preserving passthrough.

function openAiBody(): MessagesRequestBody {
  return {
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are terse." },
      { role: "user", content: "earlier question" },
      { role: "assistant", content: "earlier answer" },
      { role: "user", content: "what does the deploy script do?" },
    ],
  } as unknown as MessagesRequestBody;
}

function pipelineContext(dir: string | null, overrides: Partial<TransformContext> = {}): TransformContext {
  return {
    task_id: "task-openai-w1",
    request_id: "req-1",
    provider: OPENAI_PIPELINE_PROVIDER,
    store: dir ? new ContentStore({ root: dir }) : null,
    policy: { ...DEFAULT_CONTEXT_BUDGET_POLICY, lossy_compression: true },
    compressorProvider: builtinCompressorProvider(),
    liveZone: openaiLiveZone,
    ...overrides,
  };
}

test("the openai provider adapter is eligible only for POST /v1/chat/completions", () => {
  const adapter = createOpenAiProviderAdapter();
  assert.equal(adapter.provider, OPENAI_PIPELINE_PROVIDER);
  assert.equal(adapter.isEligible("POST", "/v1/chat/completions"), true);
  assert.equal(adapter.isEligible("GET", "/v1/chat/completions"), false);
  assert.equal(adapter.isEligible("POST", "/v1/messages"), false);
});

test("openai live zone: everything before the final user turn is the stable prefix", () => {
  const zone = openaiLiveZone(openAiBody());
  assert.equal(zone.stable_prefix_end, 3);
  assert.equal(zone.mutable_start, 3);
  assert.equal(zone.mutable_end, 4);
  assert.equal(zone.injection_location, "user_turn");
});

test("openai live zone with no user turn mutates nothing", () => {
  const zone = openaiLiveZone({ messages: [{ role: "system", content: "s" }] });
  assert.equal(zone.mutable_start, zone.mutable_end);
});

test("tokenCount is honestly null without a measured counter", async () => {
  const adapter = createOpenAiProviderAdapter();
  assert.equal(await adapter.tokenCount(openAiBody()), null);
});

test("usage reads prompt_tokens as the FULL input total (openai semantics)", () => {
  const adapter = createOpenAiProviderAdapter();
  const usage = adapter.usage(JSON.stringify({ usage: { prompt_tokens: 1200, completion_tokens: 40 } }));
  assert.equal(usage.input_tokens, 1200);
  assert.equal(usage.output_tokens, 40);
});

test("usage reads the final streamed SSE chunk", () => {
  const adapter = createOpenAiProviderAdapter();
  const sse = [
    'data: {"choices":[{"delta":{"content":"hi"}}]}',
    'data: {"usage":{"prompt_tokens":900,"completion_tokens":12}}',
    "data: [DONE]",
  ].join("\n");
  const usage = adapter.usage(sse);
  assert.equal(usage.input_tokens, 900);
  assert.equal(usage.output_tokens, 12);
});

test("providerAdapterFor returns the openai adapter for provider openai", () => {
  const adapter = providerAdapterFor("openai");
  assert.ok(adapter, "openai must be registered in the pipeline registry");
  assert.equal(adapter?.provider, OPENAI_PIPELINE_PROVIDER);
});

test("parse/serialize round-trips an openai body", () => {
  const adapter = createOpenAiProviderAdapter();
  const wire = Buffer.from(JSON.stringify(openAiBody()), "utf8");
  const parsed = adapter.parse(wire);
  assert.ok(parsed);
  assert.equal(adapter.serialize(parsed as MessagesRequestBody).toString("utf8"), wire.toString("utf8"));
});

// --- pipeline integration: the same honesty gates, on the OpenAI wire ---------------------------

test("injection lands only in the final user turn; the stable prefix is byte-identical", async () => {
  const dir = mkdtempSync(join(tmpdir(), "kage-openai-w1-"));
  try {
    const request = openAiBody();
    const before = JSON.stringify(request.messages.slice(0, 3));
    const result = await transformRequest(request, pipelineContext(dir, {
      injection: { id: "cap-1", text: "KAGE CONTEXT: deploy.sh builds then rsyncs." },
    } as Partial<TransformContext>));
    const messages = result.request.messages as Array<Record<string, unknown>>;
    assert.equal(JSON.stringify(messages.slice(0, 3)), before, "stable prefix must survive byte-for-byte");
    assert.match(String(messages[3].content), /KAGE CONTEXT/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a large repetitive tool message in the mutable zone compresses reversibly with a retrieval marker", async () => {
  const dir = mkdtempSync(join(tmpdir(), "kage-openai-w1c-"));
  try {
    const bigLog = Array.from({ length: 400 }, () => "[info] compiling module foo").join("\n");
    const request = {
      model: "gpt-4o",
      messages: [
        { role: "system", content: "s" },
        { role: "user", content: "run tests" },
        // OpenAI tool result: role "tool" with STRING content — the pipeline's string-payload path.
        { role: "tool", tool_call_id: "call_1", content: bigLog },
        { role: "user", content: "what failed?" },
      ],
    } as unknown as MessagesRequestBody;
    // Widen the zone so the tool message is live (a history-compression zone, not the default).
    const zone = { stable_prefix_end: 2, mutable_start: 2, mutable_end: 4, injection_location: "user_turn" as const };
    const result = await transformRequest(request, pipelineContext(dir, { liveZone: () => zone }));
    const messages = result.request.messages as Array<Record<string, unknown>>;
    const content = String(messages[2].content);
    assert.ok(content.length < bigLog.length, "the tool payload must actually shrink");
    assert.match(content, /kage-content:[0-9a-f]{64}/, "a lossy transform must carry its retrieval marker");
    assert.ok(result.retrieval_ids.length >= 1, "the receipt must reference the stored original");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("no injection and no eligible payload is a noop: byte-identical request", async () => {
  const dir = mkdtempSync(join(tmpdir(), "kage-openai-w1n-"));
  try {
    const request = openAiBody();
    const before = JSON.stringify(request);
    const result = await transformRequest(request, pipelineContext(dir));
    assert.equal(JSON.stringify(result.request), before);
    assert.equal(result.receipt.status, "noop");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a missing content store fails open: original bytes forwarded, no lossy transform", async () => {
  const bigLog = Array.from({ length: 400 }, () => "[info] compiling module foo").join("\n");
  const request = {
    model: "gpt-4o",
    messages: [
      { role: "user", content: "run" },
      { role: "tool", tool_call_id: "c", content: bigLog },
      { role: "user", content: "?" },
    ],
  } as unknown as MessagesRequestBody;
  const before = JSON.stringify(request);
  const zone = { stable_prefix_end: 1, mutable_start: 1, mutable_end: 3, injection_location: "user_turn" as const };
  const result = await transformRequest(request, pipelineContext(null, { liveZone: () => zone }));
  assert.equal(JSON.stringify(result.request), before, "no store means no lossy transform — byte-preserving");
});
