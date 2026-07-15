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
  geminiGateway,
  openaiGateway,
  selectGateway,
  type CaptureContext,
} from "./gateway.js";
import { claudeRepositoryIdentity } from "./claude.js";
import {
  extractGeminiUsage,
  geminiModelFromPath,
  injectGemini,
  isGeminiGenerateRequest,
  parseGeminiFunctionCalls,
} from "./gemini-proxy.js";
import { promptTokenBreakdown, totalPromptTokens } from "../measurement/token-count.js";
import type { TransformationReceipt } from "../protocol/index.js";

const MEM = "# Verified repo memory (injected by Kage — follow it)";

// A real Gemini generation path: the model is IN THE PATH, the action after the final colon, and the
// API key rides in the query (?key=...) or the x-goog-api-key header.
const GEN = "/v1beta/models/gemini-2.5-flash:generateContent";
const STREAM = "/v1beta/models/gemini-2.5-flash:streamGenerateContent";

// --- Eligibility + dispatch -----------------------------------------------------------------

test("only POST :generateContent / :streamGenerateContent under /models/ are Gemini completions", () => {
  assert.equal(isGeminiGenerateRequest("POST", GEN), true);
  assert.equal(isGeminiGenerateRequest("POST", STREAM), true);
  // The key + alt=sse ride in the query — eligibility strips the query and still matches.
  assert.equal(isGeminiGenerateRequest("POST", `${GEN}?key=SECRET`), true);
  assert.equal(isGeminiGenerateRequest("POST", `${STREAM}?key=SECRET&alt=sse`), true);
  // /v1/... is a valid Gemini surface too, not only /v1beta/...
  assert.equal(isGeminiGenerateRequest("POST", "/v1/models/gemini-2.0-flash:generateContent"), true);
  // NOT the sibling actions, NOT list-models, NOT tunedModels (out of the /models/ scope), NOT a GET.
  assert.equal(isGeminiGenerateRequest("POST", "/v1beta/models/gemini-2.5-flash:countTokens"), false);
  assert.equal(isGeminiGenerateRequest("POST", "/v1beta/models/gemini-2.5-flash:embedContent"), false);
  assert.equal(isGeminiGenerateRequest("POST", "/v1beta/models/gemini-2.5-flash:batchGenerateContent"), false);
  assert.equal(isGeminiGenerateRequest("POST", "/v1beta/models"), false);
  assert.equal(isGeminiGenerateRequest("POST", "/v1beta/tunedModels/my-tune:generateContent"), false);
  assert.equal(isGeminiGenerateRequest("GET", GEN), false);
  assert.equal(isGeminiGenerateRequest("POST", undefined), false);
});

test("the proxy seam dispatches Gemini paths to the Gemini gateway with no cross-talk", () => {
  assert.equal(selectGateway(defaultGateways, "POST", GEN, null), geminiGateway);
  assert.equal(selectGateway(defaultGateways, "POST", `${STREAM}?key=SECRET&alt=sse`, null), geminiGateway);
  // The Anthropic and OpenAI paths still route to their own gateways; Gemini never claims them.
  assert.equal(selectGateway(defaultGateways, "POST", "/v1/messages", null), anthropicGateway);
  assert.equal(selectGateway(defaultGateways, "POST", "/v1/chat/completions", null), openaiGateway);
  assert.equal(geminiGateway.matches("POST", "/v1/messages", null), false);
  assert.equal(geminiGateway.matches("POST", "/v1/chat/completions", null), false);
  assert.equal(geminiGateway.matches("POST", "/v1/responses", null), false);
  // ...and neither Anthropic nor OpenAI claims a Gemini generation path.
  assert.equal(anthropicGateway.matches("POST", GEN, null), false);
  assert.equal(openaiGateway.matches("POST", GEN, null), false);
  // countTokens stays a strict passthrough (no gateway) — it must never be injected into or measured.
  assert.equal(selectGateway(defaultGateways, "POST", "/v1beta/models/gemini-2.5-flash:countTokens", null), null);
  // The gateway names the provider a per-provider report keys on.
  assert.equal(geminiGateway.provider, "gemini");
});

// --- parseRequest: model-in-path, systemInstruction, contents, robust to junk ----------------

test("parseRequest reads the model from the PATH (Gemini bodies carry no model field)", () => {
  const parsed = geminiGateway.parseRequest(
    { contents: [{ role: "user", parts: [{ text: "hi" }] }] },
    `${GEN}?key=SECRET&alt=sse`,
  );
  assert.equal(parsed.model, "gemini-2.5-flash");
  // A versioned id is still extracted verbatim from the path (pricing may or may not match it).
  assert.equal(geminiModelFromPath("/v1beta/models/gemini-2.0-flash-001:streamGenerateContent"), "gemini-2.0-flash-001");
  // No path, or a path with no /models/ segment → null model, never a throw.
  assert.equal(geminiGateway.parseRequest({ contents: [] }).model, null);
  assert.equal(geminiModelFromPath("/v1/messages"), null);
  assert.equal(geminiModelFromPath(undefined), null);
});

test("parseRequest reads systemInstruction (camelCase and snake_case) and the last user turn", () => {
  const camel = geminiGateway.parseRequest({
    systemInstruction: { role: "system", parts: [{ text: "be terse" }, { text: "cite sources" }] },
    contents: [
      { role: "user", parts: [{ text: "an earlier question" }] },
      { role: "model", parts: [{ text: "an answer" }] },
      { role: "user", parts: [{ text: "how do refunds work?" }] },
    ],
  }, GEN);
  assert.match(camel.systemText, /be terse/);
  assert.match(camel.systemText, /cite sources/);
  assert.equal(camel.lastUserText, "how do refunds work?");

  // Some clients / proto-JSON emit snake_case system_instruction — read that too.
  const snake = geminiGateway.parseRequest({
    system_instruction: { parts: [{ text: "snake system" }] },
    contents: [{ role: "user", parts: [{ text: "q" }] }],
  }, GEN);
  assert.match(snake.systemText, /snake system/);
});

test("parseRequest defaults a role-omitted contents entry to user, and reads only text parts", () => {
  // Gemini contents items may OMIT role — it defaults to "user".
  const roleless = geminiGateway.parseRequest({
    contents: [{ parts: [{ text: "the role-omitted ask" }] }],
  }, GEN);
  assert.equal(roleless.lastUserText, "the role-omitted ask");

  // parts can mix non-text (inlineData, functionCall) with text — only text is extracted, never a throw.
  const mixed = geminiGateway.parseRequest({
    contents: [
      { role: "user", parts: [
        { inlineData: { mimeType: "image/png", data: "AAAA" } },
        { text: "part one" },
        { functionCall: { name: "noop", args: { a: 1 } } },
        { text: "part two" },
      ] },
    ],
  }, GEN);
  assert.equal(mixed.lastUserText, "part one\npart two");
});

test("parseRequest never throws on junk and returns empty strings", () => {
  const junk: Array<Record<string, unknown>> = [
    {},
    { contents: "not an array" },
    { systemInstruction: 42 },
    { contents: [null, 5, { role: "user" }] },
    { contents: [{ role: "user", parts: "nope" }] },
    { contents: [{ role: "model", parts: [{ text: "assistant only" }] }] },
  ];
  for (const body of junk) {
    const parsed = geminiGateway.parseRequest(body, GEN);
    assert.equal(typeof parsed.systemText, "string");
    assert.equal(typeof parsed.lastUserText, "string");
    assert.equal(parsed.lastUserText, "");
  }
});

// --- inject: last user turn only; systemInstruction byte-identical ---------------------------

test("inject appends memory to the last user contents entry, leaving systemInstruction byte-identical", () => {
  const body = {
    systemInstruction: { role: "system", parts: [{ text: "SYS" }] },
    contents: [
      { role: "user", parts: [{ text: "u1" }] },
      { role: "model", parts: [{ text: "m1" }] },
      { role: "user", parts: [{ text: "u2" }] },
    ],
  };
  const { body: out, applied } = injectGemini(structuredClone(body), MEM);
  assert.equal(applied, true);
  // systemInstruction is never touched — byte-identical.
  assert.deepEqual((out.systemInstruction as Record<string, unknown>), body.systemInstruction);
  const contents = out.contents as Array<{ role: string; parts: Array<{ text: string }> }>;
  assert.deepEqual(contents[0].parts, [{ text: "u1" }]);           // an earlier user turn is untouched
  assert.deepEqual(contents[1].parts, [{ text: "m1" }]);           // the model turn is untouched
  assert.equal(contents[2].parts[0].text, `u2\n\n${MEM}`);          // memory appended to the LAST user turn's text part
});

test("inject adds a text part to a role-omitted user turn that has no text part, preserving other parts", () => {
  const body = { contents: [{ parts: [{ inlineData: { mimeType: "image/png", data: "AAAA" } }] }] };
  const { body: out, applied } = injectGemini(structuredClone(body), MEM);
  assert.equal(applied, true);
  const parts = (out.contents as Array<{ parts: unknown[] }>)[0].parts;
  // The image part is preserved and a new text part carrying the memory is appended.
  assert.deepEqual(parts, [{ inlineData: { mimeType: "image/png", data: "AAAA" } }, { text: MEM }]);
});

test("inject leaves a Gemini body with no user turn unchanged (applied=false)", () => {
  const body = { systemInstruction: { parts: [{ text: "SYS" }] }, contents: [{ role: "model", parts: [{ text: "m" }] }] };
  const { body: out, applied } = injectGemini(structuredClone(body), MEM);
  assert.equal(applied, false);
  assert.deepEqual(out, body);
});

// --- extractUsage: total = promptTokenCount directly, NOT a sum ------------------------------

test("extractUsage reports total = promptTokenCount (not a sum) with cachedContentTokenCount as cache_read", () => {
  const usage = extractGeminiUsage(JSON.stringify({
    candidates: [{ content: { parts: [{ text: "ok" }] } }],
    usageMetadata: { promptTokenCount: 1000, cachedContentTokenCount: 900, candidatesTokenCount: 40 },
  }));
  // The whole prompt, taken DIRECTLY from promptTokenCount — never input+cache, never the remainder.
  assert.equal(totalPromptTokens(usage), 1000);
  assert.equal(usage.cache_read_input_tokens, 900);
  assert.equal(usage.input_tokens, 100);              // uncached remainder = prompt - cached
  assert.equal(usage.cache_creation_input_tokens, 0); // Gemini bills no separate cache-write token line
  assert.equal(usage.output_tokens, 40);
  assert.deepEqual(promptTokenBreakdown(usage), {
    uncached_input_tokens: 100,
    cache_write_5m_tokens: 0,
    cache_write_1h_tokens: 0,
    cache_read_tokens: 900,
  });
});

test("extractUsage treats an ABSENT cachedContentTokenCount as 0 cache_read — never crashes on undefined", () => {
  // A cache MISS omits cachedContentTokenCount entirely (it is not 0, it is absent).
  const usage = extractGeminiUsage(JSON.stringify({
    usageMetadata: { promptTokenCount: 300, candidatesTokenCount: 10 },
  }));
  assert.equal(totalPromptTokens(usage), 300);
  assert.equal(usage.cache_read_input_tokens, 0);
  assert.equal(usage.input_tokens, 300);
});

test("extractUsage returns a null prompt total for absent or unparseable usageMetadata — never 0", () => {
  const absent = extractGeminiUsage(JSON.stringify({ candidates: [{ content: { parts: [{ text: "ok" }] } }] }));
  assert.equal(absent.input_tokens, null);
  assert.equal(absent.cache_read_input_tokens, null);
  assert.equal(totalPromptTokens(absent), null);
  assert.equal(totalPromptTokens(extractGeminiUsage("this is not json at all")), null);
});

test("extractUsage reads streaming usage from the FINAL chunk of a JSON array (no alt=sse)", () => {
  // streamGenerateContent without ?alt=sse emits a JSON ARRAY of GenerateContentResponse chunks;
  // usageMetadata appears only on the final chunk.
  const arrayStream = JSON.stringify([
    { candidates: [{ content: { parts: [{ text: "hi" }] } }] },
    { candidates: [{ content: { parts: [{ text: " there" }] } }] },
    { candidates: [{ content: { parts: [{ text: "!" }] } }], usageMetadata: { promptTokenCount: 800, cachedContentTokenCount: 640, candidatesTokenCount: 12 } },
  ]);
  const usage = extractGeminiUsage(arrayStream);
  assert.equal(totalPromptTokens(usage), 800);
  assert.equal(usage.cache_read_input_tokens, 640);
  assert.equal(usage.output_tokens, 12);
});

test("extractUsage reads streaming usage from the FINAL SSE chunk (?alt=sse)", () => {
  const sse = [
    'data: {"candidates":[{"content":{"parts":[{"text":"hi"}]}}]}',
    'data: {"candidates":[{"content":{"parts":[{"text":" there"}]}}],"usageMetadata":{"promptTokenCount":420,"cachedContentTokenCount":100,"candidatesTokenCount":8}}',
    "",
  ].join("\n");
  const usage = extractGeminiUsage(sse);
  assert.equal(totalPromptTokens(usage), 420);
  assert.equal(usage.cache_read_input_tokens, 100);
});

// --- THE cached test that proves no fake saving ---------------------------------------------

test("a cached Gemini response cannot manufacture a fake saving in the receipt", () => {
  // Gemini reports the WHOLE prompt in promptTokenCount (10000) and the cached portion as a subset
  // (9800). The bug this guards: treating 9800 (or the 200-token uncached remainder) as "the prompt"
  // on one side while the other side counts the whole body — a fabricated ~98% cut. Both sides of the
  // receipt must be the SAME commensurable quantity: the whole prompt.
  const usage = extractGeminiUsage(JSON.stringify({
    usageMetadata: { promptTokenCount: 10000, cachedContentTokenCount: 9800, candidatesTokenCount: 30 },
  }));
  assert.equal(totalPromptTokens(usage), 10000, "the measured prompt is the whole prompt, cached included");

  const original = Buffer.from("the original user prompt", "utf8");
  const transformed = Buffer.from("the original user prompt\n\n# injected memory", "utf8");
  const receipt = geminiGateway.buildReceipt({
    task_id: "task_x",
    request_id: "req_x",
    model: "gemini-2.5-flash",
    mode: "assist",
    plan: { original, forwarded: transformed, measured: transformed, transformations: ["context_append_last_user_turn"] },
    forwarded_usage: usage,
    measured_input_tokens: 9000, // a whole-body count of the unsent original (hypothetical — Gemini has no probe)
    latency_ms: 5,
    now: new Date("2026-07-15T12:00:00.000Z"),
  });
  assert.equal(receipt.provider, "gemini");
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

test("the Gemini gateway exposes no token counter, so a transformed receipt is honestly partial", () => {
  // Gemini's :countTokens IS a real endpoint, but it is model-specific (/v1beta/models/{model}:countTokens)
  // and the model lives in the request PATH, which the counter seam ({upstream, headers}) does not carry —
  // so, like OpenAI, this returns null and the receipt is honestly partial rather than exactly measured.
  assert.equal(geminiGateway.createTokenCounter({ upstream: new URL("https://generativelanguage.googleapis.com"), headers: {} }), null);
});

// --- Pricing: dated, sourced, and null for the unknown --------------------------------------

test("Gemini price snapshots are dated, sourced, and price cached READS; unknown models stay null", () => {
  assert.ok(geminiGateway.priceSnapshots.length > 0);
  for (const snapshot of geminiGateway.priceSnapshots) {
    assert.equal(snapshot.provider, "gemini");
    assert.match(snapshot.effective_from, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(snapshot.source, /^https:\/\//);
    assert.equal(typeof snapshot.input_usd_per_million, "number");
    // Gemini does not bill a separate cache-write token line (extractUsage reports 0 such tokens).
    assert.equal(snapshot.cache_write_5m_usd_per_million, null);
    assert.equal(snapshot.cache_write_1h_usd_per_million, null);
  }
  // Known models price; an unknown model has no snapshot → its cost stays null (the honest default).
  assert.ok(geminiGateway.priceSnapshots.some((s) => s.model === "gemini-2.5-flash"));
  assert.ok(geminiGateway.priceSnapshots.some((s) => s.model === "gemini-2.5-pro"));
  assert.ok(geminiGateway.priceSnapshots.some((s) => s.model === "gemini-2.0-flash"));
  assert.equal(geminiGateway.priceSnapshots.some((s) => s.model === "gemini-3-ultra"), false);
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

test("captureEvents emits a prompt event and tool_result events from functionCall parts, never args", () => {
  const events = geminiGateway.captureEvents(captureContext({
    responseBody: JSON.stringify({
      candidates: [{ content: { parts: [
        { text: "let me look" },
        { functionCall: { name: "run_sql", args: { q: "DROP TABLE secrets" } } },
        { functionCall: { name: "send_email", args: { to: "ceo@example.com" } } },
      ] } }],
      usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 5 },
    }),
  }));
  const prompt = events.find((e) => e.event_type === "prompt");
  assert.ok(prompt);
  assert.equal(prompt.privacy_class, "local_raw");
  assert.equal(prompt.payload.text, "make refunds idempotent");
  const tools = events.filter((e) => e.event_type === "tool_result");
  assert.equal(tools.length, 2);
  assert.deepEqual(tools.map((t) => t.payload.tool), ["run_sql", "send_email"]);
  // Gemini functionCall has NO id — every call disambiguates by index so neither is dropped as a dup.
  assert.equal(tools[0].payload.block_index, 0);
  assert.equal(tools[1].payload.block_index, 1);
  // Arguments NEVER ride along — the exact leak the Anthropic/OpenAI gateways also guard.
  assert.ok(!JSON.stringify(events).includes("DROP TABLE"));
  assert.ok(!JSON.stringify(events).includes("ceo@example.com"));
  for (const e of events) {
    assert.match(e.source_fingerprint, /^[a-f0-9]{64}$/);
    assert.notEqual(e.source_fingerprint, e.event_id); // the fingerprint hashes the signal, not the id
  }
});

test("captureEvents parses functionCall parts spread across a STREAMED JSON array, never args", () => {
  const body = JSON.stringify([
    { candidates: [{ content: { parts: [{ text: "thinking" }] } }] },
    { candidates: [{ content: { parts: [{ functionCall: { name: "list_orders", args: { limit: 10 } } }] } }] },
    { candidates: [{ content: { parts: [{ functionCall: { name: "charge_card", args: { cents: 999 } } }] } }], usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 3 } },
  ]);
  const events = geminiGateway.captureEvents(captureContext({ userPrompt: "", responseBody: body }));
  const tools = events.filter((e) => e.event_type === "tool_result");
  assert.equal(tools.length, 2, "a functionCall in each streamed chunk is captured");
  assert.deepEqual(tools.map((t) => t.payload.tool), ["list_orders", "charge_card"]);
  assert.ok(!JSON.stringify(events).includes("limit"), "streamed functionCall args never leak");
  assert.ok(!JSON.stringify(events).includes("999"));
});

test("captureEvents parses a functionCall from a STREAMED SSE chunk (?alt=sse)", () => {
  const body = [
    'data: {"candidates":[{"content":{"parts":[{"text":"ok"}]}}]}',
    'data: {"candidates":[{"content":{"parts":[{"functionCall":{"name":"list_orders","args":{"limit":10}}}]}}],"usageMetadata":{"promptTokenCount":3,"candidatesTokenCount":3}}',
    "",
  ].join("\n");
  const events = geminiGateway.captureEvents(captureContext({ userPrompt: "", responseBody: body }));
  const tools = events.filter((e) => e.event_type === "tool_result");
  assert.equal(tools.length, 1);
  assert.equal(tools[0].payload.tool, "list_orders");
  assert.ok(!JSON.stringify(events).includes("limit"), "SSE functionCall args never leak");
});

test("captureEvents fingerprints are stable/deduplicating; id-less calls disambiguate by index", () => {
  const body = JSON.stringify({
    candidates: [{ content: { parts: [
      { functionCall: { name: "same_tool", args: {} } },
      { functionCall: { name: "same_tool", args: {} } },
    ] } }],
  });
  const first = geminiGateway.captureEvents(captureContext({ userPrompt: "", responseBody: body }));
  const retry = geminiGateway.captureEvents(captureContext({ userPrompt: "", responseBody: body }));
  assert.equal(first.length, 2);
  // Same signal at the same instant → identical fingerprints (a retried post deduplicates in the store).
  assert.equal(first[0].source_fingerprint, retry[0].source_fingerprint);
  assert.equal(first[1].source_fingerprint, retry[1].source_fingerprint);
  // Two id-less same-named calls stay DISTINCT via block_index, so neither is dropped as a dup.
  assert.notEqual(first[0].source_fingerprint, first[1].source_fingerprint);
  assert.equal(first[0].payload.block_index, 0);
  assert.equal(first[1].payload.block_index, 1);
});

test("captureEvents emits nothing for an empty prompt and no function calls", () => {
  const events = geminiGateway.captureEvents(captureContext({
    userPrompt: "   ",
    responseBody: JSON.stringify({ candidates: [{ content: { parts: [{ text: "hi" }] } }] }),
  }));
  assert.equal(events.length, 0);
});

// --- Fail-open: every entry point tolerates garbage without throwing ------------------------

test("every Gemini gateway entry point fails open on a garbage or oversized body — no throw", () => {
  const garbage = ["", "not json", "{", '{"contents":', " ", "[1,2,3]", "x".repeat(200_000)];
  for (const raw of garbage) {
    assert.doesNotThrow(() => extractGeminiUsage(raw));
    assert.equal(totalPromptTokens(extractGeminiUsage(raw)), null);
    assert.doesNotThrow(() => parseGeminiFunctionCalls(raw));
    assert.deepEqual(parseGeminiFunctionCalls(raw), []);
  }
  assert.doesNotThrow(() => geminiGateway.parseRequest({ contents: 5 } as Record<string, unknown>, GEN));
  assert.doesNotThrow(() => injectGemini({ contents: 5 } as Record<string, unknown>, "mem"));
  assert.equal(injectGemini({ contents: 5 } as Record<string, unknown>, "mem").applied, false);
});

// --- End-to-end through the real proxy core: audit byte-identity, assist, fail-open ----------

if (!process.env.KAGE_HOME) process.env.KAGE_HOME = mkdtempSync(join(tmpdir(), "kage-gemini-home-"));

function projectWithMemory(): string {
  const dir = mkdtempSync(join(tmpdir(), "kage-gemini-proj-"));
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

const GEMINI_QUESTION = JSON.stringify({
  systemInstruction: { parts: [{ text: "You are a helpful coding assistant." }] },
  contents: [{ role: "user", parts: [{ text: "how should I make the payment flow idempotent?" }] }],
});

test("audit mode forwards a Gemini body byte-identically, forwards the ?key, and records a provider:gemini receipt", async () => {
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
        candidates: [{ content: { parts: [{ text: "ok" }] } }],
        usageMetadata: { promptTokenCount: 321, candidatesTokenCount: 7 },
      }));
    });
  });
  const proxy = startProxy(project, { port: 0, upstream: url, mode: "audit", receiptSink: collector.sink });
  const port = await listeningPort(proxy);

  try {
    const response = await proxyRequest(port, `${GEN}?key=SECRET_KEY&alt=sse`, GEMINI_QUESTION);
    assert.equal(response.status, 200);
    assert.equal(seen.length, 1);
    // THE audit invariant for a Gemini body: the bytes on the wire are byte-identical to the client's.
    assert.equal(seen[0].body, GEMINI_QUESTION);
    assert.doesNotMatch(seen[0].body, /injected by Kage/);
    // The API key + alt=sse in the query are forwarded untouched (the core never strips the query).
    assert.match(seen[0].path, /key=SECRET_KEY/);
    assert.match(seen[0].path, /alt=sse/);
    assert.match(seen[0].path, /:generateContent/);

    const receipt = await collector.waitForReceipt();
    assert.equal(receipt.provider, "gemini");
    assert.equal(receipt.model, "gemini-2.5-flash"); // parsed from the PATH, not the body
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

test("assist mode forwards the transformed Gemini body; a cached response is measured as the whole prompt", async () => {
  const project = projectWithMemory();
  const seen: Array<{ path: string; body: string }> = [];
  const collector = collectingSink();
  // A cached provider: reports the WHOLE forwarded prompt in promptTokenCount with almost all of it cached.
  const { server, url } = await withFakeUpstream((req, res) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      seen.push({ path: req.url ?? "", body });
      const total = Math.ceil(Buffer.byteLength(body) / 4);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({
        candidates: [{ content: { parts: [{ text: "ok" }] } }],
        usageMetadata: { promptTokenCount: total, cachedContentTokenCount: Math.max(0, total - 5), candidatesTokenCount: 9 },
      }));
    });
  });
  const proxy = startProxy(project, { port: 0, upstream: url, mode: "assist", receiptSink: collector.sink });
  const port = await listeningPort(proxy);

  try {
    await proxyRequest(port, GEN, GEMINI_QUESTION);
    assert.equal(seen.length, 1);
    assert.match(seen[0].body, /injected by Kage/);
    // systemInstruction is byte-identical; memory landed in the contents (the last user turn).
    const forwarded = JSON.parse(seen[0].body) as { systemInstruction: { parts: Array<{ text: string }> }; contents: Array<{ parts: Array<{ text: string }> }> };
    assert.equal(forwarded.systemInstruction.parts[0].text, "You are a helpful coding assistant.");
    assert.match(JSON.stringify(forwarded.contents), /injected by Kage/);
    const forwardedTotal = Math.ceil(Buffer.byteLength(seen[0].body) / 4);

    const receipt = await collector.waitForReceipt();
    assert.equal(receipt.mode, "assist");
    assert.equal(receipt.provider, "gemini");
    // AFTER (the forwarded body) is the WHOLE prompt the provider processed, cached included — not the
    // 5-token uncached remainder. Reporting the remainder would fake a massive saving.
    assert.equal(receipt.after_input_tokens, forwardedTotal);
    assert.notEqual(receipt.after_input_tokens, 5);
    // No count endpoint reachable for Gemini here, so the unsent original is honestly unmeasured.
    assert.equal(receipt.before_input_tokens, null);
    assert.equal(receipt.measurement_quality, "partial");
  } finally {
    proxy.close();
    server.close();
  }
});

test("a non-JSON body to a Gemini path is forwarded unchanged and never 500s (fail open)", async () => {
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
  const garbage = "}{ this is not json at all  ";

  try {
    const response = await proxyRequest(port, GEN, garbage);
    assert.equal(response.status, 200);
    // Fail open: the malformed body is forwarded byte-identically, nothing injected, no crash.
    assert.equal(seen.length, 1);
    assert.equal(seen[0].body, garbage);
    // The process keeps serving after a malformed request.
    const second = await proxyRequest(port, GEN, garbage);
    assert.equal(second.status, 200);
  } finally {
    proxy.close();
    server.close();
  }
});
