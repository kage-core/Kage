import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createGeminiProviderAdapter,
  geminiLiveZone,
  geminiToPipelineView,
  pipelineViewToGemini,
  GEMINI_PIPELINE_PROVIDER,
} from "./gemini.js";
import { providerAdapterFor } from "./anthropic.js";
import { transformRequest, type MessagesRequestBody, type TransformContext } from "../transform.js";
import { ContentStore } from "../content-store.js";
import { builtinCompressorProvider } from "../compressors/provider.js";
import { DEFAULT_CONTEXT_BUDGET_POLICY } from "../budget-policy.js";

// W1 — the Gemini binding of the Phase D transform pipeline.
//
// Gemini's wire shape is `contents[]` of `{role, parts[]}`. The adapter maps that into the
// pipeline's `messages` view deterministically and LOSSLESSLY (text parts become {type:"text"}
// blocks; functionCall/functionResponse/inlineData parts pass through untouched), so the shipped
// pipeline gives Gemini the same injection + reversible compression + honesty gates without any
// pipeline changes. These tests prove the round-trip is exact and the gates hold on the mapped view.

function geminiWireBody(): Record<string, unknown> {
  return {
    systemInstruction: { parts: [{ text: "be terse" }] },
    contents: [
      { role: "user", parts: [{ text: "earlier question" }] },
      {
        role: "model",
        parts: [{ functionCall: { name: "run_tests", args: { filter: "unit" } } }],
      },
      {
        role: "user",
        parts: [
          { functionResponse: { name: "run_tests", response: { output: "3 passed" } } },
          { text: "so what failed?" },
        ],
      },
    ],
    generationConfig: { temperature: 0 },
  };
}

function pipelineContext(dir: string | null, overrides: Partial<TransformContext> = {}): TransformContext {
  return {
    task_id: "task-gemini-w1",
    request_id: "req-1",
    provider: GEMINI_PIPELINE_PROVIDER,
    store: dir ? new ContentStore({ root: dir }) : null,
    policy: { ...DEFAULT_CONTEXT_BUDGET_POLICY, lossy_compression: true },
    compressorProvider: builtinCompressorProvider(),
    liveZone: geminiLiveZone,
    ...overrides,
  };
}

test("the gemini provider adapter is eligible only for generateContent posts", () => {
  const adapter = createGeminiProviderAdapter();
  assert.equal(adapter.provider, GEMINI_PIPELINE_PROVIDER);
  assert.equal(adapter.isEligible("POST", "/v1beta/models/gemini-2.0-flash:generateContent"), true);
  assert.equal(adapter.isEligible("POST", "/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse"), true);
  assert.equal(adapter.isEligible("POST", "/v1/chat/completions"), false);
});

test("the contents<->messages view round-trips the wire body EXACTLY (deep-equal, all part kinds)", () => {
  const adapter = createGeminiProviderAdapter();
  const wire = geminiWireBody();
  const view = adapter.parse(Buffer.from(JSON.stringify(wire), "utf8"));
  assert.ok(view, "a contents body must parse into the pipeline view");
  const restored = JSON.parse(adapter.serialize(view as MessagesRequestBody).toString("utf8"));
  assert.deepEqual(restored, wire, "parse->serialize must restore the exact Gemini wire shape");
});

test("non-contents bodies are not parsed (null, so the proxy skips the pipeline)", () => {
  const adapter = createGeminiProviderAdapter();
  assert.equal(adapter.parse(Buffer.from(JSON.stringify({ messages: [] }), "utf8")), null);
  assert.equal(adapter.parse(Buffer.from("not json", "utf8")), null);
});

test("gemini live zone: entries before the final user turn are the stable prefix", () => {
  const view = geminiToPipelineView(geminiWireBody());
  assert.ok(view);
  const zone = geminiLiveZone(view as { messages?: unknown });
  assert.equal(zone.stable_prefix_end, 2);
  assert.equal(zone.mutable_start, 2);
  assert.equal(zone.mutable_end, 3);
});

test("usage reads promptTokenCount as the FULL input total (gemini semantics)", () => {
  const adapter = createGeminiProviderAdapter();
  const usage = adapter.usage(
    JSON.stringify({ usageMetadata: { promptTokenCount: 800, candidatesTokenCount: 25 } }),
  );
  assert.equal(usage.input_tokens, 800);
  assert.equal(usage.output_tokens, 25);
});

test("providerAdapterFor returns the gemini adapter for provider gemini", () => {
  const adapter = providerAdapterFor("gemini");
  assert.ok(adapter, "gemini must be registered in the pipeline registry");
  assert.equal(adapter?.provider, GEMINI_PIPELINE_PROVIDER);
});

// --- pipeline integration on the mapped view ----------------------------------------------------

test("injection lands as a text part in the final user turn; earlier contents survive exactly", async () => {
  const dir = mkdtempSync(join(tmpdir(), "kage-gemini-w1-"));
  try {
    const wire = geminiWireBody();
    const adapter = createGeminiProviderAdapter();
    const view = adapter.parse(Buffer.from(JSON.stringify(wire), "utf8"));
    assert.ok(view);
    const stableBefore = JSON.stringify((wire.contents as unknown[]).slice(0, 2));
    const result = await transformRequest(view as MessagesRequestBody, pipelineContext(dir, {
      injection: { id: "cap-g1", text: "KAGE CONTEXT: the deploy script rsyncs dist/." },
    } as Partial<TransformContext>));
    const restored = JSON.parse(adapter.serialize(result.request).toString("utf8")) as {
      contents: Array<{ role: string; parts: Array<Record<string, unknown>> }>;
    };
    assert.equal(JSON.stringify(restored.contents.slice(0, 2)), stableBefore, "stable prefix must restore exactly");
    const lastParts = restored.contents[2].parts;
    // Original functionResponse part untouched, original text part untouched, injected text appended.
    assert.ok(lastParts.some((p) => "functionResponse" in p), "functionResponse part must survive");
    assert.ok(lastParts.some((p) => typeof p.text === "string" && /KAGE CONTEXT/.test(String(p.text))),
      "the injected capsule must land as a Gemini text part");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a large repetitive text part compresses reversibly and restores as a text part", async () => {
  const dir = mkdtempSync(join(tmpdir(), "kage-gemini-w1c-"));
  try {
    const bigLog = Array.from({ length: 400 }, () => "[info] compiling module foo").join("\n");
    const wire = {
      contents: [
        { role: "user", parts: [{ text: "run tests" }] },
        { role: "user", parts: [{ text: bigLog }] },
        { role: "user", parts: [{ text: "what failed?" }] },
      ],
    };
    const adapter = createGeminiProviderAdapter();
    const view = adapter.parse(Buffer.from(JSON.stringify(wire), "utf8"));
    assert.ok(view);
    const zone = { stable_prefix_end: 1, mutable_start: 1, mutable_end: 3, injection_location: "user_turn" as const };
    const result = await transformRequest(view as MessagesRequestBody, pipelineContext(dir, { liveZone: () => zone }));
    const restored = JSON.parse(adapter.serialize(result.request).toString("utf8")) as {
      contents: Array<{ parts: Array<{ text?: string }> }>;
    };
    const compressed = String(restored.contents[1].parts[0].text ?? "");
    assert.ok(compressed.length < bigLog.length, "the text part must actually shrink");
    assert.match(compressed, /kage-content:[0-9a-f]{64}/, "a lossy transform must carry its retrieval marker");
    assert.ok(result.retrieval_ids.length >= 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("no injection and no eligible payload is a noop on the view (wire restores exactly)", async () => {
  const dir = mkdtempSync(join(tmpdir(), "kage-gemini-w1n-"));
  try {
    const wire = geminiWireBody();
    const adapter = createGeminiProviderAdapter();
    const view = adapter.parse(Buffer.from(JSON.stringify(wire), "utf8"));
    assert.ok(view);
    const result = await transformRequest(view as MessagesRequestBody, pipelineContext(dir));
    assert.deepEqual(JSON.parse(adapter.serialize(result.request).toString("utf8")), wire);
    assert.equal(result.receipt.status, "noop");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
