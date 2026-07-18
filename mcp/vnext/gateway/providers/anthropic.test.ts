import test from "node:test";
import assert from "node:assert/strict";
import { createAnthropicProviderAdapter, ANTHROPIC_PROVIDER, providerAdapterFor } from "./anthropic.js";
import type { MessagesRequestBody } from "../transform.js";

function messages(list: unknown[]): MessagesRequestBody {
  return { model: "claude-opus-4-8", messages: list };
}

test("the anthropic provider adapter is eligible only for POST /v1/messages", () => {
  const adapter = createAnthropicProviderAdapter();
  assert.equal(adapter.provider, ANTHROPIC_PROVIDER);
  assert.equal(adapter.isEligible("POST", "/v1/messages"), true);
  // The sibling count_tokens endpoint shares the /v1/messages prefix and must NOT be eligible.
  assert.equal(adapter.isEligible("POST", "/v1/messages/count_tokens"), false);
  assert.equal(adapter.isEligible("GET", "/v1/messages"), false);
});

test("parse returns null for a non-messages body and a typed request otherwise", () => {
  const adapter = createAnthropicProviderAdapter();
  assert.equal(adapter.parse(Buffer.from("not json", "utf8")), null);
  // A body without a messages array is not a completion we transform.
  assert.equal(adapter.parse(Buffer.from(JSON.stringify({ model: "m" }), "utf8")), null);
  const req = adapter.parse(Buffer.from(JSON.stringify(messages([{ role: "user", content: "hi" }])), "utf8"));
  assert.ok(req);
  assert.deepEqual(req?.messages, [{ role: "user", content: "hi" }]);
});

test("liveZone marks only the final user turn mutable, preserving the cache-stable prefix", () => {
  const adapter = createAnthropicProviderAdapter();
  const zone = adapter.liveZone(messages([
    { role: "user", content: "one" },
    { role: "assistant", content: "two" },
    { role: "user", content: "three" },
  ]));
  assert.equal(zone.stable_prefix_end, 2);
  assert.equal(zone.mutable_start, 2);
  assert.equal(zone.mutable_end, 3);
  assert.equal(zone.injection_location, "user_turn");
});

test("serialize round-trips through parse byte-for-byte", () => {
  const adapter = createAnthropicProviderAdapter();
  const req = messages([{ role: "user", content: "hi" }]);
  const bytes = adapter.serialize(req);
  assert.deepEqual(adapter.parse(bytes), req);
});

test("tokenCount is null without an injected counter and MEASURED with one", async () => {
  const none = createAnthropicProviderAdapter();
  assert.equal(await none.tokenCount(messages([])), null);
  // A count is provider-measured (here, a deterministic stand-in), never an estimate Kage invents.
  const counted = createAnthropicProviderAdapter({ tokenCounter: async (body) => body.byteLength });
  const req = messages([{ role: "user", content: "hi" }]);
  assert.equal(await counted.tokenCount(req), Buffer.byteLength(JSON.stringify(req)));
});

test("usage reads provider-reported input/output tokens from a response body", () => {
  const adapter = createAnthropicProviderAdapter();
  const usage = adapter.usage(JSON.stringify({ usage: { input_tokens: 10, output_tokens: 3 } }));
  assert.equal(usage.input_tokens, 10);
  assert.equal(usage.output_tokens, 3);
});

test("providerAdapterFor returns an adapter only for anthropic (Phase D is Anthropic-only)", () => {
  assert.notEqual(providerAdapterFor("anthropic"), null);
  assert.equal(providerAdapterFor("openai"), null);
  assert.equal(providerAdapterFor("gemini"), null);
});
