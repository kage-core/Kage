import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createServer, request as httpRequest, type Server } from "node:http";
import { capture, loadObservations } from "./kernel.js";
import { injectMemory, isCompletionsRequest, startProxy } from "./proxy.js";

if (!process.env.KAGE_HOME) process.env.KAGE_HOME = mkdtempSync(join(tmpdir(), "kage-proxy-home-"));

function tempProject(): string {
  const dir = mkdtempSync(join(tmpdir(), "kage-proxy-test-"));
  mkdirSync(join(dir, ".agent_memory", "packets"), { recursive: true });
  return dir;
}

test("proxy appends memory to a string-form last user message, leaving system byte-identical", () => {
  const project = tempProject();
  capture({
    projectDir: project,
    title: "Payments must be idempotent via the ledger key",
    summary: "Retries dedupe on the ledger idempotency key",
    body: "processPayment must pass the ledger idempotency key so retries dedupe. Verified by: npm test.",
    type: "decision",
    allowMissingPaths: true,
  });

  const request = {
    model: "claude-x",
    system: "You are Claude Code, Anthropic's official CLI for Claude.",
    messages: [{ role: "user", content: "how should I make the payment flow idempotent?" }],
  };
  const { body, injected } = injectMemory(project, request as Record<string, unknown>);
  assert.equal(injected > 0, true);
  // OAuth invariant: the system prompt is NEVER touched (subscription tokens 429 otherwise).
  assert.equal(body.system, request.system);
  // Memory lands in the last user message instead.
  const msgs = body.messages as Array<{ role: string; content: string }>;
  assert.match(msgs[0].content, /how should I make the payment flow idempotent/);
  assert.match(msgs[0].content, /injected by Kage/);
  assert.match(msgs[0].content, /idempotent/i);
});

test("proxy appends a memory block to an array-form last user message, leaving system untouched", () => {
  const project = tempProject();
  capture({
    projectDir: project,
    title: "Auth uses jose, not jsonwebtoken",
    summary: "Token verification uses the jose library",
    body: "verifyToken uses jose (not jsonwebtoken) for JWT verification. Verified by: npm test.",
    type: "gotcha",
    allowMissingPaths: true,
  });
  const request = {
    system: [{ type: "text", text: "You are Claude Code, Anthropic's official CLI for Claude." }],
    messages: [{ role: "user", content: [{ type: "text", text: "which jwt library does auth use?" }] }],
  };
  const { body, injected } = injectMemory(project, request as Record<string, unknown>);
  assert.equal(injected > 0, true);
  // System array is returned unchanged — identity block still first and only.
  assert.deepEqual(body.system, request.system);
  const content = (body.messages as Array<{ content: Array<{ type: string; text: string }> }>)[0].content;
  assert.equal(content[0].text, "which jwt library does auth use?");
  assert.match(content[content.length - 1].text, /injected by Kage/);
});

test("top hit injects its full body, not just the summary", () => {
  const project = tempProject();
  capture({
    projectDir: project,
    title: "Savings percent is a sum-ratio",
    summary: "reduction_percent aggregates tokens across queries",
    body: "benchmarkSavings sums baseline and kage tokens across all queries, then reduction_percent = round((baselineTotal - kageTotal) / baselineTotal * 100). It is a SUM-RATIO, not a mean of per-query percents. Verified by: npm test.",
    type: "decision",
    allowMissingPaths: true,
  });
  const request = {
    system: "You are Claude Code, Anthropic's official CLI for Claude.",
    messages: [{ role: "user", content: "how does the savings percent get computed?" }],
  };
  const { body, injected } = injectMemory(project, request as Record<string, unknown>);
  assert.equal(injected > 0, true);
  const injectedText = (body.messages as Array<{ content: string }>)[0].content;
  // The body's actual formula must be present — the point of body-aware injection.
  assert.match(injectedText, /baselineTotal - kageTotal/);
  assert.match(injectedText, /SUM-RATIO/);
});

test("only POST /v1/messages is a completion — count_tokens and non-POST are excluded", () => {
  assert.equal(isCompletionsRequest("POST", "/v1/messages"), true);
  assert.equal(isCompletionsRequest("POST", "/v1/messages?beta=true"), true);
  // The sibling token-counting endpoint must NOT get injected into.
  assert.equal(isCompletionsRequest("POST", "/v1/messages/count_tokens?beta=true"), false);
  assert.equal(isCompletionsRequest("GET", "/v1/messages"), false);
  assert.equal(isCompletionsRequest("POST", "/v1/models"), false);
});

// End-to-end: a real startProxy() server, a fake upstream, and a real HTTP client —
// proves observe() is called with a stable per-process session id, not the literal
// string "default" (the bug: every proxy run ever, on the same repo, shared one
// observation-dedup bucket and could silently collide with hook-driven captures).
function withFakeUpstream(handler: (req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse) => void): Promise<{ server: Server; url: string }> {
  return new Promise((resolve) => {
    const server = createServer(handler);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

test("proxy observations carry a stable per-process session id, not the literal 'default'", async () => {
  const project = tempProject();
  const { server: fakeUpstream, url: upstreamUrl } = await withFakeUpstream((req, res) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ content: [{ type: "text", text: "ok" }], usage: { input_tokens: 10, output_tokens: 5 } }));
    });
  });

  const proxyServer = startProxy(project, { port: 0, upstream: upstreamUrl });
  await new Promise<void>((resolve) => proxyServer.on("listening", resolve));
  const proxyAddress = proxyServer.address();
  const proxyPort = typeof proxyAddress === "object" && proxyAddress ? proxyAddress.port : 0;

  try {
    const requestBody = JSON.stringify({
      model: "claude-x",
      system: "You are Claude Code, Anthropic's official CLI for Claude.",
      messages: [{ role: "user", content: "does the proxy tag its own observations correctly?" }],
    });
    await new Promise<void>((resolve, reject) => {
      const req = httpRequest(
        { hostname: "127.0.0.1", port: proxyPort, path: "/v1/messages", method: "POST", headers: { "content-type": "application/json", "content-length": Buffer.byteLength(requestBody) } },
        (res) => { res.on("data", () => {}); res.on("end", resolve); }
      );
      req.on("error", reject);
      req.end(requestBody);
    });

    const observations = loadObservations(project).filter((record) => record.agent === "kage-proxy");
    assert.equal(observations.length, 1);
    assert.notEqual(observations[0].session_id, "default");
    assert.match(observations[0].session_id ?? "", /^proxy-/);
  } finally {
    proxyServer.close();
    fakeUpstream.close();
  }
});

test("proxy leaves the request untouched when nothing relevant is recalled", () => {
  const project = tempProject();
  const request = {
    system: "unchanged",
    messages: [{ role: "user", content: "xyzzy nothing will match this token qwerty" }],
  };
  const { body, injected } = injectMemory(project, request as Record<string, unknown>);
  assert.equal(injected, 0);
  assert.equal(body.system, "unchanged");
  assert.deepEqual(body.messages, request.messages);
});
