import test from "node:test";
import assert from "node:assert/strict";
import {
  ANTHROPIC_PRICE_SNAPSHOTS,
  findPriceSnapshot,
  inputCostUsd,
} from "./pricing.js";
import { buildTransformationReceipt } from "./receipt.js";
import { extractProviderUsage, measurementQuality } from "./token-count.js";
import { buildProxyReceipt, planProxyForward, requestModel } from "../adapters/anthropic-proxy.js";

const IDENTITY = {
  task_id: "task_1",
  request_id: "req_1",
  provider: "anthropic",
  model: "claude-opus-4-8",
  mode: "audit",
} as const;

// The whole point of Phase A: a receipt may only ever report a token count that a
// provider actually measured. No bytes/4, no interpolation, no "close enough".
test("a receipt never claims token savings without both token counts", () => {
  const receipt = buildTransformationReceipt({
    ...IDENTITY,
    before: Buffer.from("before"),
    after: Buffer.from("after"),
    before_tokens: null,
    after_tokens: null,
    latency_ms: 4,
    transformations: [],
  });
  assert.equal(receipt.measurement_quality, "unavailable");
  assert.equal(receipt.before_input_tokens, null);
  assert.equal(receipt.after_input_tokens, null);
  assert.equal(receipt.provider_input_cost_before_usd, null);
  assert.equal(receipt.provider_input_cost_after_usd, null);
  // Bytes are always measurable and are never converted into tokens.
  assert.equal(receipt.before_input_bytes, 6);
  assert.equal(receipt.after_input_bytes, 5);
});

test("measurementQuality is exact only when both sides were measured", () => {
  assert.equal(measurementQuality(10, 20), "exact");
  assert.equal(measurementQuality(10, null), "partial");
  assert.equal(measurementQuality(null, 20), "partial");
  assert.equal(measurementQuality(null, null), "unavailable");
  assert.equal(measurementQuality(0, 0), "exact");
});

test("a partial receipt prices only the side it measured", () => {
  const receipt = buildTransformationReceipt({
    ...IDENTITY,
    before: Buffer.from("before"),
    after: Buffer.from("after-body"),
    before_tokens: 1_000,
    after_tokens: null,
    latency_ms: 12,
    transformations: ["context_append_last_user_turn"],
  });
  assert.equal(receipt.measurement_quality, "partial");
  assert.equal(receipt.before_input_tokens, 1_000);
  assert.equal(receipt.after_input_tokens, null);
  assert.equal(receipt.provider_input_cost_before_usd, 0.005); // 1000 tokens at $5/M
  assert.equal(receipt.provider_input_cost_after_usd, null);
});

test("an exact receipt prices both sides from the model's price snapshot", () => {
  const receipt = buildTransformationReceipt({
    ...IDENTITY,
    mode: "assist",
    before: Buffer.from("before"),
    after: Buffer.from("after"),
    before_tokens: 1_000,
    after_tokens: 1_500,
    output_tokens: 42,
    latency_ms: 7,
    transformations: ["context_append_last_user_turn"],
  });
  assert.equal(receipt.measurement_quality, "exact");
  assert.equal(receipt.provider_input_cost_before_usd, 0.005);
  assert.equal(receipt.provider_input_cost_after_usd, 0.0075);
  assert.equal(receipt.output_tokens, 42);
  // Kage's own processing cost is not measured in Phase A — it stays null instead of 0.
  assert.equal(receipt.kage_processing_cost_usd, null);
});

test("a model with no price snapshot leaves the cost fields null", () => {
  const receipt = buildTransformationReceipt({
    ...IDENTITY,
    model: "some-unlisted-model",
    before: Buffer.from("before"),
    after: Buffer.from("after"),
    before_tokens: 1_000,
    after_tokens: 1_500,
    latency_ms: 3,
    transformations: [],
  });
  assert.equal(receipt.measurement_quality, "exact");
  assert.equal(receipt.provider_input_cost_before_usd, null);
  assert.equal(receipt.provider_input_cost_after_usd, null);

  const unknownModel = buildTransformationReceipt({
    ...IDENTITY,
    model: null,
    before: Buffer.from("before"),
    after: Buffer.from("after"),
    before_tokens: 1_000,
    after_tokens: 1_500,
    latency_ms: 3,
    transformations: [],
  });
  assert.equal(unknownModel.provider_input_cost_before_usd, null);
});

// A price is a configuration record, not a constant: it has a source and a date, and it
// does not apply to a request that happened before it took effect.
test("price snapshots carry a source and an effective date", () => {
  for (const snapshot of ANTHROPIC_PRICE_SNAPSHOTS) {
    assert.match(snapshot.source, /^https:\/\//);
    assert.match(snapshot.effective_from, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(snapshot.provider, "anthropic");
    assert.equal(snapshot.input_usd_per_million > 0, true);
  }

  const snapshots = [
    { provider: "anthropic", model: "m", input_usd_per_million: 1, cache_read_usd_per_million: null, effective_from: "2026-01-01", source: "https://example.invalid/a" },
    { provider: "anthropic", model: "m", input_usd_per_million: 2, cache_read_usd_per_million: null, effective_from: "2026-06-01", source: "https://example.invalid/b" },
  ];
  assert.equal(
    findPriceSnapshot({ provider: "anthropic", model: "m", at: new Date("2026-03-01T00:00:00Z"), snapshots })?.input_usd_per_million,
    1,
  );
  assert.equal(
    findPriceSnapshot({ provider: "anthropic", model: "m", at: new Date("2026-07-01T00:00:00Z"), snapshots })?.input_usd_per_million,
    2,
  );
  // Nothing was in effect yet: no snapshot, and therefore no cost.
  const before = findPriceSnapshot({ provider: "anthropic", model: "m", at: new Date("2025-01-01T00:00:00Z"), snapshots });
  assert.equal(before, null);
  assert.equal(inputCostUsd(1_000, before), null);
});

test("a dated model id resolves to its family snapshot, an unrelated prefix does not", () => {
  assert.equal(
    findPriceSnapshot({ provider: "anthropic", model: "claude-opus-4-8-20260101" })?.input_usd_per_million,
    5,
  );
  assert.equal(findPriceSnapshot({ provider: "anthropic", model: "claude-opus" }), null);
  assert.equal(findPriceSnapshot({ provider: "openai", model: "claude-opus-4-8" }), null);
});

// The legacy proxy defaulted missing usage to 0, which is how an unmeasured request would
// silently become a "0 token" one. Absent usage must read as null.
test("extractProviderUsage reports null, not zero, when the provider reported no usage", () => {
  assert.deepEqual(extractProviderUsage("{}"), { input_tokens: null, output_tokens: null });
  assert.deepEqual(extractProviderUsage(""), { input_tokens: null, output_tokens: null });
  assert.deepEqual(extractProviderUsage("not json at all"), { input_tokens: null, output_tokens: null });
  assert.deepEqual(
    extractProviderUsage('{"usage":{"input_tokens":"lots"}}'),
    { input_tokens: null, output_tokens: null },
  );
});

test("extractProviderUsage reads measured usage from JSON and from an SSE transcript", () => {
  assert.deepEqual(
    extractProviderUsage('{"usage":{"input_tokens":11,"output_tokens":3}}'),
    { input_tokens: 11, output_tokens: 3 },
  );
  const sse = [
    'event: message_start',
    'data: {"type":"message_start","message":{"usage":{"input_tokens":17,"output_tokens":1}}}',
    '',
    'event: content_block_delta',
    'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"hi"}}',
    '',
    'event: message_delta',
    'data: {"type":"message_delta","usage":{"output_tokens":9}}',
    '',
  ].join("\n");
  assert.deepEqual(extractProviderUsage(sse), { input_tokens: 17, output_tokens: 9 });
});

test("requestModel reads the model only when the request actually declares one", () => {
  assert.equal(requestModel({ model: "claude-opus-4-8" }), "claude-opus-4-8");
  assert.equal(requestModel({}), null);
  assert.equal(requestModel({ model: 7 }), null);
});

// The audit baseline is only worth anything if the bytes on the wire are the client's own.
test("audit mode forwards the exact original bytes and measures the candidate separately", () => {
  const original = Buffer.from('{"messages":[{"role":"user","content":"hello"}]}');
  const transformed = Buffer.from('{"messages":[{"role":"user","content":"hello\\n\\nmemory"}]}');
  const plan = planProxyForward({ mode: "audit", original, transformed });
  assert.deepEqual(plan.forwarded, original);
  assert.equal(plan.forwarded.equals(original), true);
  assert.equal(plan.measured.equals(transformed), true);
  assert.deepEqual(plan.transformations, ["context_append_last_user_turn"]);
});

test("assist mode forwards the transformed body it measured", () => {
  const original = Buffer.from('{"a":1}');
  const transformed = Buffer.from('{"a":1,"b":2}');
  const plan = planProxyForward({ mode: "assist", original, transformed });
  assert.equal(plan.forwarded.equals(transformed), true);
  assert.equal(plan.measured.equals(transformed), true);
});

test("with no transformation, both modes forward the original and record no transformations", () => {
  const original = Buffer.from('{"a":1}');
  for (const mode of ["audit", "assist"] as const) {
    const plan = planProxyForward({ mode, original, transformed: null });
    assert.equal(plan.forwarded.equals(original), true);
    assert.equal(plan.measured.equals(original), true);
    assert.deepEqual(plan.transformations, []);
  }
});

test("buildProxyReceipt keeps audit-mode after-token counts null instead of reusing the forwarded count", () => {
  const receipt = buildProxyReceipt({
    task_id: "task_x",
    request_id: "req_x",
    model: "claude-opus-4-8",
    mode: "audit",
    plan: planProxyForward({
      mode: "audit",
      original: Buffer.from("original"),
      transformed: Buffer.from("original+context"),
    }),
    forwarded_input_tokens: 1_000,
    measured_input_tokens: null,
    output_tokens: 5,
    latency_ms: 20,
  });
  assert.equal(receipt.provider, "anthropic");
  assert.equal(receipt.mode, "audit");
  assert.equal(receipt.measurement_quality, "partial");
  // The forwarded body IS the original in audit mode, so the measured usage is the before count.
  assert.equal(receipt.before_input_tokens, 1_000);
  assert.equal(receipt.after_input_tokens, null);
  assert.equal(receipt.before_input_bytes, 8);
  assert.equal(receipt.after_input_bytes, 16);
});

test("buildProxyReceipt attributes the forwarded count to the after side in assist mode", () => {
  const receipt = buildProxyReceipt({
    task_id: "task_x",
    request_id: "req_y",
    model: "claude-opus-4-8",
    mode: "assist",
    plan: planProxyForward({
      mode: "assist",
      original: Buffer.from("original"),
      transformed: Buffer.from("original+context"),
    }),
    forwarded_input_tokens: 1_200,
    measured_input_tokens: 1_000,
    output_tokens: null,
    latency_ms: 20,
  });
  assert.equal(receipt.measurement_quality, "exact");
  assert.equal(receipt.after_input_tokens, 1_200);
  assert.equal(receipt.before_input_tokens, 1_000);
});
