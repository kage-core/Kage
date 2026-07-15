import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createServer, request as httpRequest, type Server } from "node:http";
import { capture } from "../../kernel.js";
import { startProxy } from "../../proxy.js";
import {
  anthropicGateway,
  defaultGateways,
  openaiGateway,
  selectGateway,
  type CaptureContext,
} from "./gateway.js";
import { claudeRepositoryIdentity } from "./claude.js";
import {
  extractOpenAiUsage,
  injectOpenAi,
  isOpenAiCompletionsRequest,
  parseOpenAiToolCalls,
} from "./openai-proxy.js";
import { promptTokenBreakdown, totalPromptTokens } from "../measurement/token-count.js";
import type { TransformationReceipt } from "../protocol/index.js";

const MEM = "# Verified repo memory (injected by Kage — follow it)";

// --- Eligibility + dispatch -----------------------------------------------------------------

test("only POST /v1/chat/completions and /v1/responses are OpenAI completions", () => {
  assert.equal(isOpenAiCompletionsRequest("POST", "/v1/chat/completions"), true);
  assert.equal(isOpenAiCompletionsRequest("POST", "/v1/chat/completions?stream=true"), true);
  assert.equal(isOpenAiCompletionsRequest("POST", "/v1/responses"), true);
  assert.equal(isOpenAiCompletionsRequest("POST", "/v1/responses?x=1"), true);
  // NOT embeddings/models/moderations, a sibling sub-path, or any GET.
  assert.equal(isOpenAiCompletionsRequest("POST", "/v1/embeddings"), false);
  assert.equal(isOpenAiCompletionsRequest("POST", "/v1/models"), false);
  assert.equal(isOpenAiCompletionsRequest("POST", "/v1/moderations"), false);
  assert.equal(isOpenAiCompletionsRequest("POST", "/v1/chat/completions/xyz"), false);
  assert.equal(isOpenAiCompletionsRequest("GET", "/v1/chat/completions"), false);
});

test("the proxy seam dispatches OpenAI paths to the OpenAI gateway with no cross-talk", () => {
  assert.equal(selectGateway(defaultGateways, "POST", "/v1/chat/completions", null), openaiGateway);
  assert.equal(selectGateway(defaultGateways, "POST", "/v1/responses?stream=true", null), openaiGateway);
  // The Anthropic path still routes to Anthropic; the OpenAI gateway never claims it (and vice versa).
  assert.equal(selectGateway(defaultGateways, "POST", "/v1/messages", null), anthropicGateway);
  assert.equal(openaiGateway.matches("POST", "/v1/messages", null), false);
  assert.equal(anthropicGateway.matches("POST", "/v1/chat/completions", null), false);
  // Unknown → strict passthrough (no gateway).
  assert.equal(selectGateway(defaultGateways, "POST", "/v1/embeddings", null), null);
  // The gateway names the provider a per-provider report keys on.
  assert.equal(openaiGateway.provider, "openai");
});

// --- parseRequest: both shapes, robust to junk ----------------------------------------------

test("parseRequest reads chat/completions string content and array-of-parts content", () => {
  const stringForm = openaiGateway.parseRequest({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "be terse" },
      { role: "developer", content: "follow the style guide" },
      { role: "user", content: "an earlier question" },
      { role: "assistant", content: "an answer" },
      { role: "user", content: "how do refunds work?" },
    ],
  });
  assert.equal(stringForm.model, "gpt-4o");
  assert.match(stringForm.systemText, /be terse/);
  assert.match(stringForm.systemText, /follow the style guide/);
  assert.equal(stringForm.lastUserText, "how do refunds work?");

  const arrayForm = openaiGateway.parseRequest({
    model: "gpt-4o",
    messages: [
      { role: "system", content: [{ type: "text", text: "system directive" }] },
      { role: "user", content: [
        { type: "text", text: "part one" },
        { type: "text", text: "part two" },
        { type: "image_url", image_url: { url: "data:..." } },
      ] },
    ],
  });
  assert.match(arrayForm.systemText, /system directive/);
  assert.equal(arrayForm.lastUserText, "part one\npart two");
});

test("parseRequest reads responses string input, array input, and instructions (not a system message)", () => {
  const stringInput = openaiGateway.parseRequest({
    model: "gpt-4.1",
    instructions: "you are a refund bot",
    input: "please explain refunds",
  });
  assert.equal(stringInput.model, "gpt-4.1");
  assert.equal(stringInput.systemText, "you are a refund bot");
  assert.equal(stringInput.lastUserText, "please explain refunds");

  const arrayInput = openaiGateway.parseRequest({
    model: "gpt-4.1",
    instructions: "top-level system",
    input: [
      { role: "developer", content: [{ type: "input_text", text: "dev note" }] },
      { role: "user", content: [{ type: "input_text", text: "earlier" }] },
      { role: "assistant", content: [{ type: "output_text", text: "reply" }] },
      { role: "user", content: [{ type: "input_text", text: "the latest ask" }] },
    ],
  });
  assert.match(arrayInput.systemText, /top-level system/);
  assert.match(arrayInput.systemText, /dev note/);
  assert.equal(arrayInput.lastUserText, "the latest ask");
});

test("parseRequest never throws on junk and returns empty strings", () => {
  const junk: Array<Record<string, unknown>> = [
    {},
    { messages: "not an array" },
    { input: 42 },
    { messages: [null, 5, { role: "user" }] },
    { input: [null, { role: "user", content: 9 }] },
    { messages: [{ role: "user", content: 123 }] },
  ];
  for (const body of junk) {
    const parsed = openaiGateway.parseRequest(body);
    assert.equal(typeof parsed.systemText, "string");
    assert.equal(typeof parsed.lastUserText, "string");
    assert.equal(parsed.lastUserText, "");
  }
});

// --- inject: last user turn only; system/developer/instructions byte-identical ---------------

test("inject appends to the last chat/completions user message, leaving system and developer byte-identical", () => {
  const body = {
    model: "gpt-4o",
    messages: [
      { role: "system", content: "SYS" },
      { role: "developer", content: "DEV" },
      { role: "user", content: "u1" },
      { role: "assistant", content: "a1" },
      { role: "user", content: "u2" },
    ],
  };
  const { body: out, applied } = injectOpenAi(structuredClone(body), MEM);
  assert.equal(applied, true);
  const msgs = out.messages as Array<{ role: string; content: unknown }>;
  assert.equal(msgs[0].content, "SYS");
  assert.equal(msgs[1].content, "DEV");
  assert.equal(msgs[2].content, "u1");        // an earlier user turn is untouched
  assert.equal(msgs[4].content, `u2\n\n${MEM}`); // only the LAST user turn gets memory
});

test("inject appends a content part to an array-form last user message", () => {
  const body = { messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }] };
  const { body: out, applied } = injectOpenAi(structuredClone(body), MEM);
  assert.equal(applied, true);
  const content = (out.messages as Array<{ content: Array<{ type: string; text: string }> }>)[0].content;
  assert.deepEqual(content, [{ type: "text", text: "hi" }, { type: "text", text: MEM }]);
});

test("inject leaves a chat body with no user turn unchanged (applied=false)", () => {
  const body = { messages: [{ role: "system", content: "SYS" }, { role: "assistant", content: "a" }] };
  const { body: out, applied } = injectOpenAi(structuredClone(body), MEM);
  assert.equal(applied, false);
  assert.deepEqual(out, body);
});

test("inject appends to a responses string input and to the last user item, never to instructions", () => {
  const stringInput = { instructions: "SYS", input: "the ask" };
  const s = injectOpenAi(structuredClone(stringInput), MEM);
  assert.equal(s.applied, true);
  assert.equal(s.body.instructions, "SYS");
  assert.equal(s.body.input, `the ask\n\n${MEM}`);

  const arrayInput = {
    instructions: "SYS",
    input: [
      { role: "developer", content: [{ type: "input_text", text: "DEV" }] },
      { role: "user", content: [{ type: "input_text", text: "u1" }] },
      { role: "user", content: [{ type: "input_text", text: "u2" }] },
    ],
  };
  const a = injectOpenAi(structuredClone(arrayInput), MEM);
  assert.equal(a.applied, true);
  assert.equal(a.body.instructions, "SYS");
  const items = a.body.input as Array<{ role: string; content: Array<{ type: string; text: string }> }>;
  assert.deepEqual(items[0].content, [{ type: "input_text", text: "DEV" }]); // developer untouched
  assert.deepEqual(items[1].content, [{ type: "input_text", text: "u1" }]);  // earlier user untouched
  assert.deepEqual(items[2].content, [{ type: "input_text", text: "u2" }, { type: "input_text", text: MEM }]);
});

test("inject leaves a responses body with no user turn unchanged (applied=false)", () => {
  const body = { instructions: "SYS", input: [{ role: "developer", content: [{ type: "input_text", text: "DEV" }] }] };
  const { body: out, applied } = injectOpenAi(structuredClone(body), MEM);
  assert.equal(applied, false);
  assert.deepEqual(out, body);
});

// --- extractUsage: total = prompt_tokens directly, NOT a sum --------------------------------

test("extractUsage reports total = prompt_tokens (not a sum) with the cached subset as cache_read", () => {
  const usage = extractOpenAiUsage(JSON.stringify({
    choices: [{ message: { content: "ok" } }],
    usage: { prompt_tokens: 1000, completion_tokens: 40, prompt_tokens_details: { cached_tokens: 900 } },
  }));
  // The whole prompt, taken directly — never input+cache (the Anthropic pattern) and never the remainder.
  assert.equal(totalPromptTokens(usage), 1000);
  assert.equal(usage.cache_read_input_tokens, 900);
  assert.equal(usage.input_tokens, 100);              // uncached remainder = prompt - cached
  assert.equal(usage.cache_creation_input_tokens, 0); // OpenAI bills no separate cache-write line
  assert.equal(usage.output_tokens, 40);
  assert.deepEqual(promptTokenBreakdown(usage), {
    uncached_input_tokens: 100,
    cache_write_5m_tokens: 0,
    cache_write_1h_tokens: 0,
    cache_read_tokens: 900,
  });
});

test("extractUsage handles the responses usage shape (input_tokens/output_tokens/input_tokens_details)", () => {
  const usage = extractOpenAiUsage(JSON.stringify({
    usage: { input_tokens: 500, output_tokens: 20, input_tokens_details: { cached_tokens: 128 } },
  }));
  assert.equal(totalPromptTokens(usage), 500);
  assert.equal(usage.cache_read_input_tokens, 128);
  assert.equal(usage.output_tokens, 20);
});

test("extractUsage with no cached subset reports 0 cache_read and the full prompt", () => {
  const usage = extractOpenAiUsage(JSON.stringify({ usage: { prompt_tokens: 300, completion_tokens: 10 } }));
  assert.equal(totalPromptTokens(usage), 300);
  assert.equal(usage.cache_read_input_tokens, 0);
  assert.equal(usage.input_tokens, 300);
});

test("extractUsage returns a null prompt total for absent or unparseable usage — never 0", () => {
  const absent = extractOpenAiUsage(JSON.stringify({ choices: [{ message: { content: "ok" } }] }));
  assert.equal(absent.input_tokens, null);
  assert.equal(absent.cache_read_input_tokens, null);
  assert.equal(totalPromptTokens(absent), null);
  assert.equal(totalPromptTokens(extractOpenAiUsage("this is not json at all")), null);
});

test("extractUsage reads streaming usage from the final chat chunk; absent without include_usage", () => {
  const withUsage = [
    'data: {"choices":[{"delta":{"content":"hi"}}]}',
    'data: {"choices":[{"delta":{"content":" there"}}]}',
    'data: {"choices":[],"usage":{"prompt_tokens":800,"completion_tokens":12,"prompt_tokens_details":{"cached_tokens":640}}}',
    "data: [DONE]",
    "",
  ].join("\n");
  const usage = extractOpenAiUsage(withUsage);
  assert.equal(totalPromptTokens(usage), 800);
  assert.equal(usage.cache_read_input_tokens, 640);

  const withoutUsage = ['data: {"choices":[{"delta":{"content":"hi"}}]}', "data: [DONE]", ""].join("\n");
  assert.equal(totalPromptTokens(extractOpenAiUsage(withoutUsage)), null);
});

test("extractUsage reads streaming usage from the responses completed event", () => {
  const sse = [
    "event: response.output_text.delta",
    'data: {"type":"response.output_text.delta","delta":"hi"}',
    "event: response.completed",
    'data: {"type":"response.completed","response":{"usage":{"input_tokens":420,"output_tokens":8,"input_tokens_details":{"cached_tokens":100}}}}',
    "",
  ].join("\n");
  const usage = extractOpenAiUsage(sse);
  assert.equal(totalPromptTokens(usage), 420);
  assert.equal(usage.cache_read_input_tokens, 100);
});

// --- THE cached test that proves no fake saving ---------------------------------------------

test("a cached OpenAI response cannot manufacture a fake saving in the receipt", () => {
  // OpenAI reports the WHOLE prompt in prompt_tokens (10000) and the cached portion as a subset
  // (9800). The bug this guards: treating 9800 (or the 200-token uncached remainder) as "the prompt"
  // on one side while the other side counts the whole body — a fabricated ~98% cut. Both sides of the
  // receipt must be the SAME commensurable quantity: the whole prompt.
  const usage = extractOpenAiUsage(JSON.stringify({
    usage: { prompt_tokens: 10000, completion_tokens: 30, prompt_tokens_details: { cached_tokens: 9800 } },
  }));
  assert.equal(totalPromptTokens(usage), 10000, "the measured prompt is the whole prompt, cached included");

  // Assist: the transformed (bigger) body is forwarded and provider-measured; a whole-body count of
  // the UNSENT original stands in for the before side. Injecting memory must read as MORE tokens.
  const original = Buffer.from("the original user prompt", "utf8");
  const transformed = Buffer.from("the original user prompt\n\n# injected memory", "utf8");
  const receipt = openaiGateway.buildReceipt({
    task_id: "task_x",
    request_id: "req_x",
    model: "gpt-4o",
    mode: "assist",
    plan: { original, forwarded: transformed, measured: transformed, transformations: ["context_append_last_user_turn"] },
    forwarded_usage: usage,
    measured_input_tokens: 9000, // a whole-body count of the unsent original
    latency_ms: 5,
  });
  assert.equal(receipt.provider, "openai");
  // AFTER = the whole forwarded prompt (10000), NOT the cached subset (9800) or the 200 remainder.
  assert.equal(receipt.after_input_tokens, 10000);
  assert.notEqual(receipt.after_input_tokens, 9800);
  assert.notEqual(receipt.after_input_tokens, 200);
  assert.equal(receipt.before_input_tokens, 9000);
  // Both sides are total prompt tokens, so injecting memory reads as a COST, never a saving.
  assert.equal(receipt.after_input_tokens! > receipt.before_input_tokens!, true);
  assert.equal(receipt.measurement_quality, "exact");
  // The counted (unsent) side has no cache breakdown, so its cost is null, not priced as fully uncached.
  assert.equal(receipt.provider_input_cost_before_usd, null);
  assert.equal(typeof receipt.provider_input_cost_after_usd, "number");
});

test("the OpenAI gateway exposes no token counter, so a transformed receipt is honestly partial", () => {
  assert.equal(openaiGateway.createTokenCounter({ upstream: new URL("https://api.openai.com"), headers: {} }), null);
});

// --- Pricing: dated, sourced, and null for the unknown --------------------------------------

test("OpenAI price snapshots are dated, sourced, and only price cached READS (no write line)", () => {
  assert.ok(openaiGateway.priceSnapshots.length > 0);
  for (const snapshot of openaiGateway.priceSnapshots) {
    assert.equal(snapshot.provider, "openai");
    assert.match(snapshot.effective_from, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(snapshot.source, /^https:\/\//);
    assert.equal(typeof snapshot.input_usd_per_million, "number");
    assert.equal(typeof snapshot.cache_read_usd_per_million, "number");
    // OpenAI does not bill a separate cache-write token line, and extractUsage reports 0 such tokens.
    assert.equal(snapshot.cache_write_5m_usd_per_million, null);
    assert.equal(snapshot.cache_write_1h_usd_per_million, null);
  }
  // A model with a snapshot prices; an unknown model has none → its cost stays null (the honest default).
  assert.ok(openaiGateway.priceSnapshots.some((s) => s.model === "gpt-4o"));
  assert.equal(openaiGateway.priceSnapshots.some((s) => s.model === "o1"), false);
});

// --- captureEvents: prompt + tool_result, arguments never leak, stable fingerprints ----------

function captureContext(over: Partial<CaptureContext> = {}): CaptureContext {
  return {
    repository: claudeRepositoryIdentity("/repo"),
    sessionId: "session-1",
    userPrompt: "make refunds idempotent",
    responseBody: "",
    now: new Date("2026-07-15T00:00:00.000Z"),
    ...over,
  };
}

test("captureEvents emits a prompt event and tool_result events from chat tool_calls, never arguments", () => {
  const events = openaiGateway.captureEvents(captureContext({
    responseBody: JSON.stringify({
      choices: [{ message: {
        content: null,
        tool_calls: [
          { id: "call_1", type: "function", function: { name: "run_sql", arguments: '{"q":"DROP TABLE secrets"}' } },
          { id: "call_2", type: "function", function: { name: "send_email", arguments: '{"to":"ceo@example.com"}' } },
        ],
      } }],
      usage: { prompt_tokens: 5, completion_tokens: 5 },
    }),
  }));
  const prompt = events.find((e) => e.event_type === "prompt");
  assert.ok(prompt);
  assert.equal(prompt.privacy_class, "local_raw");
  assert.equal(prompt.payload.text, "make refunds idempotent");
  const tools = events.filter((e) => e.event_type === "tool_result");
  assert.equal(tools.length, 2);
  assert.deepEqual(tools.map((t) => t.payload.tool), ["run_sql", "send_email"]);
  assert.equal(tools[0].payload.tool_use_id, "call_1");
  assert.equal(tools[1].payload.tool_use_id, "call_2");
  // Arguments NEVER ride along — the exact leak an existing test guards for Anthropic.
  assert.ok(!JSON.stringify(events).includes("DROP TABLE"));
  assert.ok(!JSON.stringify(events).includes("ceo@example.com"));
  for (const e of events) {
    assert.match(e.source_fingerprint, /^[a-f0-9]{64}$/);
    assert.notEqual(e.source_fingerprint, e.event_id); // the fingerprint hashes the signal, not the id
  }
});

test("captureEvents parses responses function_call output items, carrying the name + call_id only", () => {
  const events = openaiGateway.captureEvents(captureContext({
    responseBody: JSON.stringify({
      output: [
        { type: "message", role: "assistant", content: [{ type: "output_text", text: "sure" }] },
        { type: "function_call", call_id: "fc_1", name: "list_orders", arguments: '{"limit":10}' },
      ],
      usage: { input_tokens: 3, output_tokens: 3 },
    }),
  }));
  const tools = events.filter((e) => e.event_type === "tool_result");
  assert.equal(tools.length, 1);
  assert.equal(tools[0].payload.tool, "list_orders");
  assert.equal(tools[0].payload.tool_use_id, "fc_1");
  assert.ok(!JSON.stringify(events).includes("limit"), "responses tool arguments never leak either");
});

test("captureEvents parses a STREAMED chat tool_call (name+id split across deltas), never arguments", () => {
  // The common OpenAI chat mode: a tool call is split across SSE deltas keyed by `index` — the
  // name + id land on the first delta, argument fragments on later ones (which must be ignored).
  const body = [
    'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_s1","type":"function","function":{"name":"run_sql","arguments":""}}]}}]}',
    'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\\"q\\":\\"DROP TABLE secrets\\"}"}}]}}]}',
    "data: [DONE]",
    "",
  ].join("\n");
  const events = openaiGateway.captureEvents(captureContext({ userPrompt: "", responseBody: body }));
  const tools = events.filter((e) => e.event_type === "tool_result");
  assert.equal(tools.length, 1, "the split-delta tool call is captured exactly once");
  assert.equal(tools[0].payload.tool, "run_sql");
  assert.equal(tools[0].payload.tool_use_id, "call_s1");
  // The streamed argument fragments must never become evidence.
  assert.ok(!JSON.stringify(events).includes("DROP TABLE"), "streamed tool arguments never leak");
});

test("captureEvents parses a STREAMED responses function_call once across output_item.done and completed", () => {
  // responses streams complete each call in response.output_item.done, then repeat it in the terminal
  // response.completed output — it must be counted exactly once (deduped by call_id).
  const body = [
    'data: {"type":"response.output_item.done","item":{"type":"function_call","call_id":"fc_s1","name":"list_orders","arguments":"{\\"limit\\":10}"}}',
    'data: {"type":"response.completed","response":{"output":[{"type":"function_call","call_id":"fc_s1","name":"list_orders","arguments":"{\\"limit\\":10}"}],"usage":{"input_tokens":3,"output_tokens":3}}}',
    "data: [DONE]",
    "",
  ].join("\n");
  const events = openaiGateway.captureEvents(captureContext({ userPrompt: "", responseBody: body }));
  const tools = events.filter((e) => e.event_type === "tool_result");
  assert.equal(tools.length, 1, "the repeated streamed call is deduped to one tool_result");
  assert.equal(tools[0].payload.tool, "list_orders");
  assert.equal(tools[0].payload.tool_use_id, "fc_s1");
  assert.ok(!JSON.stringify(events).includes("limit"), "streamed responses arguments never leak");
});

test("captureEvents fingerprints are stable/deduplicating; id-less calls disambiguate by index", () => {
  const body = JSON.stringify({
    choices: [{ message: { tool_calls: [
      { type: "function", function: { name: "same_tool" } },
      { type: "function", function: { name: "same_tool" } },
    ] } }],
  });
  const first = openaiGateway.captureEvents(captureContext({ userPrompt: "", responseBody: body }));
  const retry = openaiGateway.captureEvents(captureContext({ userPrompt: "", responseBody: body }));
  assert.equal(first.length, 2);
  // Same signal at the same instant → identical fingerprints (a retried post deduplicates in the store).
  assert.equal(first[0].source_fingerprint, retry[0].source_fingerprint);
  assert.equal(first[1].source_fingerprint, retry[1].source_fingerprint);
  // Two id-less same-named calls stay DISTINCT via block_index, so neither is dropped as a dup.
  assert.notEqual(first[0].source_fingerprint, first[1].source_fingerprint);
  assert.equal(first[0].payload.block_index, 0);
  assert.equal(first[1].payload.block_index, 1);
});

test("captureEvents emits nothing for an empty prompt and no tool calls", () => {
  const events = openaiGateway.captureEvents(captureContext({
    userPrompt: "   ",
    responseBody: JSON.stringify({ choices: [{ message: { content: "hi" } }] }),
  }));
  assert.equal(events.length, 0);
});

// --- Fail-open: every entry point tolerates garbage without throwing ------------------------

test("every OpenAI gateway entry point fails open on a garbage or oversized body — no throw", () => {
  const garbage = ["", "not json", "{", '{"messages":', " ", "[1,2,3]", "x".repeat(200_000)];
  for (const raw of garbage) {
    assert.doesNotThrow(() => extractOpenAiUsage(raw));
    assert.equal(totalPromptTokens(extractOpenAiUsage(raw)), null);
    assert.doesNotThrow(() => parseOpenAiToolCalls(raw));
    assert.deepEqual(parseOpenAiToolCalls(raw), []);
  }
  assert.doesNotThrow(() => openaiGateway.parseRequest({ messages: 5 } as Record<string, unknown>));
  assert.doesNotThrow(() => injectOpenAi({ messages: 5 } as Record<string, unknown>, "mem"));
  assert.equal(injectOpenAi({ input: 5 } as Record<string, unknown>, "mem").applied, false);
});

// --- End-to-end through the real proxy core: audit byte-identity, assist, fail-open ----------

if (!process.env.KAGE_HOME) process.env.KAGE_HOME = mkdtempSync(join(tmpdir(), "kage-openai-home-"));

function projectWithMemory(): string {
  const dir = mkdtempSync(join(tmpdir(), "kage-openai-proj-"));
  mkdirSync(join(dir, ".agent_memory", "packets"), { recursive: true });
  capture({
    projectDir: dir,
    title: "Payments must be idempotent via the ledger key",
    summary: "Retries dedupe on the ledger idempotency key",
    body: "processPayment must pass the ledger idempotency key so retries dedupe. Verified by: npm test.",
    type: "decision",
    allowMissingPaths: true,
  });
  return dir;
}

function withFakeUpstream(
  handler: (req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse) => void,
): Promise<{ server: Server; url: string }> {
  return new Promise((resolve) => {
    const server = createServer(handler);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

async function listeningPort(server: Server): Promise<number> {
  await new Promise<void>((resolve) => server.on("listening", resolve));
  const address = server.address();
  return typeof address === "object" && address ? address.port : 0;
}

function proxyRequest(port: number, path: string, requestBody: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      { hostname: "127.0.0.1", port, path, method: "POST", headers: { "content-type": "application/json", "content-length": Buffer.byteLength(requestBody) } },
      (res) => {
        let body = "";
        res.on("data", (chunk) => { body += chunk; });
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
      },
    );
    req.on("error", reject);
    req.end(requestBody);
  });
}

function collectingSink() {
  const receipts: TransformationReceipt[] = [];
  let notify: (() => void) | null = null;
  return {
    receipts,
    sink: {
      write(receipt: TransformationReceipt) {
        receipts.push(receipt);
        notify?.();
      },
    },
    async waitForReceipt(): Promise<TransformationReceipt> {
      if (!receipts.length) {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error("no receipt was recorded within 5s")), 5_000);
          notify = () => { clearTimeout(timer); resolve(); };
        });
      }
      return receipts[0];
    },
  };
}

const CHAT_QUESTION = JSON.stringify({
  model: "gpt-4o",
  messages: [
    { role: "system", content: "You are a helpful coding assistant." },
    { role: "user", content: "how should I make the payment flow idempotent?" },
  ],
});

test("audit mode forwards an OpenAI body byte-identically and records a provider:openai receipt", async () => {
  const project = projectWithMemory();
  const seen: Array<{ path: string; body: string }> = [];
  const collector = collectingSink();
  const { server, url } = await withFakeUpstream((req, res) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      seen.push({ path: req.url ?? "", body });
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ choices: [{ message: { content: "ok" } }], usage: { prompt_tokens: 321, completion_tokens: 7 } }));
    });
  });
  const proxy = startProxy(project, { port: 0, upstream: url, mode: "audit", receiptSink: collector.sink });
  const port = await listeningPort(proxy);

  try {
    const response = await proxyRequest(port, "/v1/chat/completions", CHAT_QUESTION);
    assert.equal(response.status, 200);
    assert.equal(seen.length, 1);
    assert.equal(seen[0].path, "/v1/chat/completions");
    // THE audit invariant for an OpenAI body: the bytes on the wire are byte-identical to the client's.
    assert.equal(seen[0].body, CHAT_QUESTION);
    assert.doesNotMatch(seen[0].body, /injected by Kage/);

    const receipt = await collector.waitForReceipt();
    assert.equal(receipt.provider, "openai");
    assert.equal(receipt.model, "gpt-4o");
    assert.equal(receipt.mode, "audit");
    // The candidate (measured) body is larger than the forwarded original but was never sent.
    assert.equal(receipt.after_input_bytes > receipt.before_input_bytes, true);
    // Only the forwarded original was provider-measured: before = whole prompt, after honestly null.
    assert.equal(receipt.before_input_tokens, 321);
    assert.equal(receipt.after_input_tokens, null);
    assert.equal(receipt.measurement_quality, "partial");
  } finally {
    proxy.close();
    server.close();
  }
});

test("assist mode forwards the transformed OpenAI body; a cached response is measured as the whole prompt", async () => {
  const project = projectWithMemory();
  const seen: Array<{ path: string; body: string }> = [];
  const collector = collectingSink();
  // A cached provider: reports the WHOLE forwarded prompt in prompt_tokens with almost all of it cached.
  const { server, url } = await withFakeUpstream((req, res) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      seen.push({ path: req.url ?? "", body });
      const total = Math.ceil(Buffer.byteLength(body) / 4);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({
        choices: [{ message: { content: "ok" } }],
        usage: { prompt_tokens: total, completion_tokens: 9, prompt_tokens_details: { cached_tokens: Math.max(0, total - 5) } },
      }));
    });
  });
  const proxy = startProxy(project, { port: 0, upstream: url, mode: "assist", receiptSink: collector.sink });
  const port = await listeningPort(proxy);

  try {
    await proxyRequest(port, "/v1/chat/completions", CHAT_QUESTION);
    assert.equal(seen.length, 1);
    assert.match(seen[0].body, /injected by Kage/);
    const forwardedTotal = Math.ceil(Buffer.byteLength(seen[0].body) / 4);

    const receipt = await collector.waitForReceipt();
    assert.equal(receipt.mode, "assist");
    assert.equal(receipt.provider, "openai");
    // AFTER (the forwarded body) is the WHOLE prompt the provider processed, cached included — not the
    // 5-token uncached remainder. Reporting the remainder would fake a massive saving.
    assert.equal(receipt.after_input_tokens, forwardedTotal);
    assert.notEqual(receipt.after_input_tokens, 5);
    // No count endpoint for OpenAI, so the unsent original is honestly unmeasured, never fabricated.
    assert.equal(receipt.before_input_tokens, null);
    assert.equal(receipt.measurement_quality, "partial");
  } finally {
    proxy.close();
    server.close();
  }
});

test("a /v1/responses request flows through the OpenAI gateway, appending to input not instructions", async () => {
  const project = projectWithMemory();
  const seen: Array<{ path: string; body: string }> = [];
  const collector = collectingSink();
  const { server, url } = await withFakeUpstream((req, res) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      seen.push({ path: req.url ?? "", body });
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({
        output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: "ok" }] }],
        usage: { input_tokens: 210, output_tokens: 4 },
      }));
    });
  });
  const proxy = startProxy(project, { port: 0, upstream: url, mode: "assist", receiptSink: collector.sink });
  const port = await listeningPort(proxy);
  const responsesBody = JSON.stringify({
    model: "gpt-4.1",
    instructions: "You are a coding assistant.",
    input: "how should I make the payment flow idempotent?",
  });

  try {
    await proxyRequest(port, "/v1/responses", responsesBody);
    assert.equal(seen[0].path, "/v1/responses");
    assert.match(seen[0].body, /injected by Kage/);
    const forwarded = JSON.parse(seen[0].body) as { instructions: string; input: string };
    assert.equal(forwarded.instructions, "You are a coding assistant."); // instructions byte-identical
    assert.match(forwarded.input, /injected by Kage/);                    // memory landed in the input

    const receipt = await collector.waitForReceipt();
    assert.equal(receipt.provider, "openai");
    assert.equal(receipt.model, "gpt-4.1");
    assert.equal(receipt.after_input_tokens, 210);
  } finally {
    proxy.close();
    server.close();
  }
});

test("a non-JSON body to an OpenAI path is forwarded unchanged and never 500s (fail open)", async () => {
  const project = projectWithMemory();
  const seen: Array<{ path: string; body: string }> = [];
  const { server, url } = await withFakeUpstream((req, res) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      seen.push({ path: req.url ?? "", body });
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    });
  });
  const proxy = startProxy(project, { port: 0, upstream: url, mode: "assist", receiptSink: { write: () => {} } });
  const port = await listeningPort(proxy);
  const garbage = "}{ this is not json at all  ";

  try {
    const response = await proxyRequest(port, "/v1/chat/completions", garbage);
    assert.equal(response.status, 200);
    // Fail open: the malformed body is forwarded byte-identically, nothing injected, no crash.
    assert.equal(seen.length, 1);
    assert.equal(seen[0].body, garbage);
    // The process keeps serving after a malformed request.
    const second = await proxyRequest(port, "/v1/chat/completions", garbage);
    assert.equal(second.status, 200);
  } finally {
    proxy.close();
    server.close();
  }
});
