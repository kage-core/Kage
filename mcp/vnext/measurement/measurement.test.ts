import test from "node:test";
import assert from "node:assert/strict";
import {
  ANTHROPIC_PRICE_SNAPSHOTS,
  findPriceSnapshot,
  inputCostUsd,
  promptInputCostUsd,
} from "./pricing.js";
import { buildTransformationReceipt } from "./receipt.js";
import {
  extractProviderUsage,
  measurementQuality,
  promptTokenBreakdown,
  totalPromptTokens,
} from "./token-count.js";
import {
  ANTHROPIC_PROXY_ADAPTER_ID,
  buildProxyDelivery,
  buildProxyReceipt,
  countTokensProbeBody,
  planProxyForward,
  requestModel,
} from "../adapters/anthropic-proxy.js";

const UNCACHED = (tokens: number) => ({
  uncached_input_tokens: tokens,
  cache_write_5m_tokens: 0,
  cache_write_1h_tokens: 0,
  cache_read_tokens: 0,
});

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
    before_breakdown: null,
    after_breakdown: null,
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
    before_breakdown: UNCACHED(1_000),
    after_breakdown: null,
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
    before_breakdown: UNCACHED(1_000),
    after_breakdown: UNCACHED(1_500),
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
    before_breakdown: UNCACHED(1_000),
    after_breakdown: UNCACHED(1_500),
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
    before_breakdown: UNCACHED(1_000),
    after_breakdown: UNCACHED(1_500),
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
    // Cached input bills at its own rates. A snapshot that cannot price a cache read cannot price
    // a real Claude Code request at all.
    assert.notEqual(snapshot.cache_read_usd_per_million, null);
    assert.notEqual(snapshot.cache_write_5m_usd_per_million, null);
    assert.notEqual(snapshot.cache_write_1h_usd_per_million, null);
  }

  const snapshots = [
    { provider: "anthropic", model: "m", input_usd_per_million: 1, cache_read_usd_per_million: null, cache_write_5m_usd_per_million: null, cache_write_1h_usd_per_million: null, effective_from: "2026-01-01", source: "https://example.invalid/a" },
    { provider: "anthropic", model: "m", input_usd_per_million: 2, cache_read_usd_per_million: null, cache_write_5m_usd_per_million: null, cache_write_1h_usd_per_million: null, effective_from: "2026-06-01", source: "https://example.invalid/b" },
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
  // A non-dated variant is a DIFFERENT product with a different price (a premium `-fast` tier, say).
  // Pricing it off the family snapshot would silently under-bill it; an unknown variant is null.
  assert.equal(findPriceSnapshot({ provider: "anthropic", model: "claude-opus-4-8-fast" }), null);
  assert.equal(findPriceSnapshot({ provider: "anthropic", model: "claude-opus-4-8-1m" }), null);
});

// Sonnet 5 ships with an introductory input rate through 2026-08-31. Charging the list price
// during the intro window over-states every Sonnet 5 receipt by 50%.
test("claude-sonnet-5 prices at its introductory rate until the intro window ends", () => {
  const intro = findPriceSnapshot({
    provider: "anthropic",
    model: "claude-sonnet-5",
    at: new Date("2026-07-15T00:00:00Z"),
  });
  assert.equal(intro?.input_usd_per_million, 2);

  const listPrice = findPriceSnapshot({
    provider: "anthropic",
    model: "claude-sonnet-5",
    at: new Date("2026-09-01T00:00:00Z"),
  });
  assert.equal(listPrice?.input_usd_per_million, 3);
});

// The legacy proxy defaulted missing usage to 0, which is how an unmeasured request would
// silently become a "0 token" one. Absent usage must read as null.
const NO_USAGE = {
  input_tokens: null,
  cache_creation_input_tokens: null,
  cache_read_input_tokens: null,
  cache_creation: null,
  output_tokens: null,
};

test("extractProviderUsage reports null, not zero, when the provider reported no usage", () => {
  assert.deepEqual(extractProviderUsage("{}"), NO_USAGE);
  assert.deepEqual(extractProviderUsage(""), NO_USAGE);
  assert.deepEqual(extractProviderUsage("not json at all"), NO_USAGE);
  assert.deepEqual(extractProviderUsage('{"usage":{"input_tokens":"lots"}}'), NO_USAGE);
  assert.equal(totalPromptTokens(NO_USAGE), null);
});

test("extractProviderUsage reads measured usage from JSON and from an SSE transcript", () => {
  assert.deepEqual(
    extractProviderUsage('{"usage":{"input_tokens":11,"cache_creation_input_tokens":0,"cache_read_input_tokens":0,"output_tokens":3}}'),
    { ...NO_USAGE, input_tokens: 11, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 3 },
  );
  const sse = [
    'event: message_start',
    'data: {"type":"message_start","message":{"usage":{"input_tokens":17,"cache_creation_input_tokens":0,"cache_read_input_tokens":0,"output_tokens":1}}}',
    '',
    'event: content_block_delta',
    'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"hi"}}',
    '',
    'event: message_delta',
    'data: {"type":"message_delta","usage":{"output_tokens":9}}',
    '',
  ].join("\n");
  assert.deepEqual(
    extractProviderUsage(sse),
    { ...NO_USAGE, input_tokens: 17, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 9 },
  );
});

// THE bug this hardening pass exists for: `usage.input_tokens` is the UNCACHED REMAINDER, not the
// prompt. A Claude Code session in steady state reports a few hundred input_tokens against a
// 26k-token prompt. Comparing that number to a count_tokens number (which counts the WHOLE body)
// is comparing two different quantities, and produces a fake "saving".
test("the prompt total is input + cache_creation + cache_read, from JSON and from SSE", () => {
  const cached = extractProviderUsage(
    '{"usage":{"input_tokens":420,"cache_creation_input_tokens":0,"cache_read_input_tokens":26000,"output_tokens":9}}',
  );
  assert.equal(cached.input_tokens, 420);
  assert.equal(cached.cache_read_input_tokens, 26_000);
  assert.equal(totalPromptTokens(cached), 26_420);

  const sse = [
    'event: message_start',
    'data: {"type":"message_start","message":{"usage":{"input_tokens":420,"cache_creation_input_tokens":1200,"cache_read_input_tokens":26000,"output_tokens":1}}}',
    '',
    'event: message_delta',
    'data: {"type":"message_delta","usage":{"output_tokens":9}}',
    '',
  ].join("\n");
  const streamed = extractProviderUsage(sse);
  assert.equal(totalPromptTokens(streamed), 27_620);
  assert.equal(streamed.output_tokens, 9);
});

// Half a total is not a total. A provider that reports input_tokens but no cache fields has not
// told us the size of the prompt, and the honest answer is "unmeasured" — never a partial sum,
// never 0.
test("a prompt total is null when any of its components is missing or unparseable", () => {
  assert.equal(totalPromptTokens(extractProviderUsage('{"usage":{"input_tokens":420}}')), null);
  assert.equal(
    totalPromptTokens(extractProviderUsage('{"usage":{"input_tokens":420,"cache_read_input_tokens":26000}}')),
    null,
  );
  assert.equal(
    totalPromptTokens(
      extractProviderUsage('{"usage":{"input_tokens":420,"cache_creation_input_tokens":"some","cache_read_input_tokens":26000}}'),
    ),
    null,
  );
  assert.equal(promptTokenBreakdown(extractProviderUsage('{"usage":{"input_tokens":420}}')), null);
});

test("a cache-creation TTL breakdown is used when present, and defaults to the 5m TTL when absent", () => {
  const flat = extractProviderUsage(
    '{"usage":{"input_tokens":10,"cache_creation_input_tokens":100,"cache_read_input_tokens":5}}',
  );
  assert.deepEqual(promptTokenBreakdown(flat), {
    uncached_input_tokens: 10,
    cache_write_5m_tokens: 100,
    cache_write_1h_tokens: 0,
    cache_read_tokens: 5,
  });

  const ttl = extractProviderUsage(
    '{"usage":{"input_tokens":10,"cache_creation_input_tokens":100,"cache_read_input_tokens":5,'
    + '"cache_creation":{"ephemeral_5m_input_tokens":40,"ephemeral_1h_input_tokens":60}}}',
  );
  assert.deepEqual(promptTokenBreakdown(ttl), {
    uncached_input_tokens: 10,
    cache_write_5m_tokens: 40,
    cache_write_1h_tokens: 60,
    cache_read_tokens: 5,
  });

  // A per-TTL split that does not add up to the reported total is not a measurement we trust.
  const inconsistent = extractProviderUsage(
    '{"usage":{"input_tokens":10,"cache_creation_input_tokens":100,"cache_read_input_tokens":5,'
    + '"cache_creation":{"ephemeral_5m_input_tokens":1,"ephemeral_1h_input_tokens":1}}}',
  );
  assert.equal(promptTokenBreakdown(inconsistent), null);
  // The total is still measured — only the price breakdown is not.
  assert.equal(totalPromptTokens(inconsistent), 115);
});

// Cached and uncached tokens bill at different rates. Pricing 26k cache-read tokens at the full
// input rate would overstate the cost of the request by ~10x.
test("prompt cost prices cache reads and cache writes at their own rates", () => {
  const opus = findPriceSnapshot({ provider: "anthropic", model: "claude-opus-4-8" });
  assert.equal(
    promptInputCostUsd({ uncached_input_tokens: 1_000_000, cache_write_5m_tokens: 0, cache_write_1h_tokens: 0, cache_read_tokens: 0 }, opus),
    5,
  );
  // cache read = 0.1x input, 5m write = 1.25x, 1h write = 2x
  assert.equal(
    promptInputCostUsd({ uncached_input_tokens: 0, cache_write_5m_tokens: 0, cache_write_1h_tokens: 0, cache_read_tokens: 1_000_000 }, opus),
    0.5,
  );
  assert.equal(
    promptInputCostUsd({ uncached_input_tokens: 0, cache_write_5m_tokens: 1_000_000, cache_write_1h_tokens: 0, cache_read_tokens: 0 }, opus),
    6.25,
  );
  assert.equal(
    promptInputCostUsd({ uncached_input_tokens: 0, cache_write_5m_tokens: 0, cache_write_1h_tokens: 1_000_000, cache_read_tokens: 0 }, opus),
    10,
  );
  // No breakdown, or no snapshot, means no cost — never 0.
  assert.equal(promptInputCostUsd(null, opus), null);
  assert.equal(promptInputCostUsd(UNCACHED(1_000), null), null);
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

// --- what the proxy RECORDS about attaching context --------------------------------------

const ORIGINAL_BODY = Buffer.from('{"messages":[{"role":"user","content":"hello"}]}');
const TRANSFORMED_BODY = Buffer.from('{"messages":[{"role":"user","content":"hello\\n\\nmemory"}]}');

test("assist records a delivery into the user turn, measured in bytes it actually added", () => {
  const plan = planProxyForward({ mode: "assist", original: ORIGINAL_BODY, transformed: TRANSFORMED_BODY });
  const delivery = buildProxyDelivery({
    task_id: "task_x",
    mode: "assist",
    plan,
    composition_latency_ms: 12.25,
    now: new Date("2026-07-15T00:00:00.000Z"),
  });

  assert.ok(delivery);
  assert.equal(delivery.status, "delivered");
  assert.equal(delivery.reason, "delivered");
  assert.equal(delivery.adapter_id, ANTHROPIC_PROXY_ADAPTER_ID);
  // The proxy appends to the LAST USER TURN — never the system prompt. The record says so.
  assert.equal(delivery.injection_location, "user_turn");
  assert.equal(delivery.added_bytes, TRANSFORMED_BODY.length - ORIGINAL_BODY.length);
  assert.equal(delivery.added_tokens, null, "nobody counted the injected tokens; none is invented");
  assert.equal(delivery.measurement_quality, "partial");
  assert.equal(delivery.composition_latency_ms, 12.25);
  assert.equal(delivery.delivered_at, "2026-07-15T00:00:00.000Z");
});

test("audit records the same composition as a SKIP: nothing reached the request", () => {
  const plan = planProxyForward({ mode: "audit", original: ORIGINAL_BODY, transformed: TRANSFORMED_BODY });
  const delivery = buildProxyDelivery({
    task_id: "task_x",
    mode: "audit",
    plan,
    composition_latency_ms: 9,
  });

  assert.ok(delivery);
  // Audit built the candidate and forwarded the client's exact bytes. Counting that as an
  // attachment would be the exact lie this phase exists to prevent.
  assert.equal(delivery.status, "skipped");
  assert.equal(delivery.reason, "audit_mode_no_injection");
  assert.equal(delivery.injection_location, "none");
  assert.equal(delivery.added_bytes, 0);
  // The composition was real and its latency is real, even though it went nowhere.
  assert.equal(delivery.composition_latency_ms, 9);
});

test("a request with no composed context records no delivery at all", () => {
  // No recall hit means no capsule was ever composed. There is nothing to have delivered, and a
  // row here would put a phantom attempt into the denominator.
  for (const mode of ["audit", "assist"] as const) {
    const plan = planProxyForward({ mode, original: ORIGINAL_BODY, transformed: null });
    assert.equal(buildProxyDelivery({ task_id: "task_x", mode, plan, composition_latency_ms: 3 }), null);
  }
});

function usage(input: number, options: { cache_read?: number; cache_write?: number; output?: number } = {}) {
  return {
    input_tokens: input,
    cache_creation_input_tokens: options.cache_write ?? 0,
    cache_read_input_tokens: options.cache_read ?? 0,
    cache_creation: null,
    output_tokens: options.output ?? null,
  };
}

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
    forwarded_usage: usage(1_000, { output: 5 }),
    measured_input_tokens: null,
    latency_ms: 20,
  });
  assert.equal(receipt.provider, "anthropic");
  assert.equal(receipt.mode, "audit");
  assert.equal(receipt.measurement_quality, "partial");
  // The forwarded body IS the original in audit mode, so the measured usage is the before count.
  assert.equal(receipt.before_input_tokens, 1_000);
  assert.equal(receipt.after_input_tokens, null);
  assert.equal(receipt.output_tokens, 5);
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
    forwarded_usage: usage(1_200),
    measured_input_tokens: 1_000,
    latency_ms: 20,
  });
  assert.equal(receipt.measurement_quality, "exact");
  assert.equal(receipt.after_input_tokens, 1_200);
  assert.equal(receipt.before_input_tokens, 1_000);
});

// THE regression. Provider usage for a cached Claude Code request: 420 uncached input tokens on a
// ~26k-token prompt. The count_tokens number for the (slightly larger) candidate body is 26,300.
// Reading only `input_tokens` would put 420 on one side and 26,300 on the other and report that
// injecting 300 tokens of context CUT the prompt by 98%.
test("a cached request does not produce a receipt claiming a saving", () => {
  const receipt = buildProxyReceipt({
    task_id: "task_x",
    request_id: "req_cached",
    model: "claude-opus-4-8",
    mode: "assist",
    plan: planProxyForward({
      mode: "assist",
      original: Buffer.from("original"),
      transformed: Buffer.from("original+context"),
    }),
    // The transformed body was forwarded, so this usage describes the AFTER side.
    forwarded_usage: usage(420, { cache_read: 26_000, output: 12 }),
    // count_tokens on the unsent original: the whole body, smaller than the transformed one.
    measured_input_tokens: 26_120,
    latency_ms: 20,
  });
  assert.equal(receipt.measurement_quality, "exact");
  assert.equal(receipt.before_input_tokens, 26_120);
  assert.equal(receipt.after_input_tokens, 26_420); // 420 + 26_000, the WHOLE prompt
  // The transformation added tokens. It must never read as a saving.
  assert.equal(receipt.after_input_tokens! > receipt.before_input_tokens!, true);
});

test("a cached request's provider cost is priced at the rates it was actually billed at", () => {
  const receipt = buildProxyReceipt({
    task_id: "task_x",
    request_id: "req_cost",
    model: "claude-opus-4-8",
    mode: "audit",
    plan: planProxyForward({
      mode: "audit",
      original: Buffer.from("original"),
      transformed: Buffer.from("original+context"),
    }),
    forwarded_usage: usage(420, { cache_read: 26_000 }),
    measured_input_tokens: 26_420,
    latency_ms: 20,
  });
  // Forwarded (= before, in audit mode): 420 uncached at $5/MTok + 26,000 cache reads at $0.50/MTok.
  const expected = (420 / 1_000_000) * 5 + (26_000 / 1_000_000) * 0.5;
  assert.equal(receipt.provider_input_cost_before_usd, expected);
  // Pricing it as if all 26,420 tokens were uncached would be ~6x too high.
  assert.equal(receipt.provider_input_cost_before_usd! < (26_420 / 1_000_000) * 5, true);
  // count_tokens reports a token count with no cache breakdown, so what that body WOULD have cost
  // is not something Kage measured. Null, not a guess.
  assert.equal(receipt.after_input_tokens, 26_420);
  assert.equal(receipt.provider_input_cost_after_usd, null);
});

// The count_tokens endpoint accepts a strict subset of the Messages body. Posting the complete
// body (max_tokens, stream, metadata...) is a 400 — which silently downgraded every --count-tokens
// receipt to "partial" while still spending a billable round trip.
test("the count_tokens probe body carries only the fields that endpoint accepts", () => {
  const body = Buffer.from(JSON.stringify({
    model: "claude-opus-4-8",
    max_tokens: 32_000,
    stream: true,
    temperature: 0.5,
    metadata: { user_id: "u1" },
    thinking: { type: "adaptive" },
    tool_choice: { type: "auto" },
    system: [{ type: "text", text: "you are claude code" }],
    tools: [{ name: "read", description: "read a file", input_schema: { type: "object" } }],
    messages: [{ role: "user", content: "hello" }],
  }));
  const probe = countTokensProbeBody(body);
  assert.notEqual(probe, null);
  const parsed = JSON.parse(probe!.toString("utf8")) as Record<string, unknown>;
  assert.deepEqual(
    Object.keys(parsed).sort(),
    ["messages", "model", "system", "thinking", "tool_choice", "tools"],
  );
  assert.equal("max_tokens" in parsed, false);
  assert.equal("stream" in parsed, false);
  assert.equal("metadata" in parsed, false);
  assert.equal("temperature" in parsed, false);
  // A body that cannot be counted (not JSON, or no messages) is not probed at all.
  assert.equal(countTokensProbeBody(Buffer.from("not json")), null);
  assert.equal(countTokensProbeBody(Buffer.from('{"model":"claude-opus-4-8"}')), null);
});
