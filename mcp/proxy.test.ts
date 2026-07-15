import test from "node:test";
import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createServer, request as httpRequest, type Server } from "node:http";
import { capture, loadObservations } from "./kernel.js";
import { injectMemory, isCompletionsRequest, resolveRequestProjectDir, startProxy } from "./proxy.js";
import { anthropicGateway, defaultGateways, selectGateway } from "./vnext/adapters/gateway.js";
import { claudeRepositoryIdentity } from "./vnext/adapters/claude.js";
import type { EvidenceEvent, TransformationReceipt } from "./vnext/protocol/index.js";
import { openVnextDatabase } from "./vnext/storage/database.js";
import { resolveRuntimePaths } from "./vnext/runtime/paths.js";
import { startLocalRuntime } from "./vnext/runtime/server.js";
import { assertVnextRuntime } from "./vnext/runtime/runtime-version.js";

// The literal shape Claude Code 2.1.202 actually sends (confirmed via a live captured
// request, not guessed): a multi-block system array with an Environment section naming
// "Primary working directory: <path>".
function claudeCodeSystemBlocks(workingDir: string): Array<{ type: string; text: string }> {
  return [
    { type: "text", text: "x-anthropic-billing-header: cc_version=2.1.202.07c; cc_entrypoint=claude-desktop;" },
    { type: "text", text: "You are a Claude agent, built on Anthropic's Claude Agent SDK." },
    { type: "text", text: `You are an interactive agent...\n\n# Environment\nYou have been invoked in the following environment: \n - Primary working directory: ${workingDir}\n - Is a git repository: true\n` },
  ];
}

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

test("resolveRequestProjectDir stays pinned to the default project when no --workspace is set", () => {
  const workspace = mkdtempSync(join(tmpdir(), "kage-workspace-"));
  const repoA = join(workspace, "repo-a");
  mkdirSync(repoA, { recursive: true });
  const body = { system: claudeCodeSystemBlocks(repoA) };
  // No workspaceRoot passed: multi-repo routing is off, always the fixed default — the
  // exact single-repo behavior every proxy user had before this feature existed.
  assert.equal(resolveRequestProjectDir("/some/fixed/project", undefined, body), "/some/fixed/project");
});

test("resolveRequestProjectDir routes to the client's reported working directory when it's inside --workspace", () => {
  const workspace = mkdtempSync(join(tmpdir(), "kage-workspace-"));
  const repoA = join(workspace, "repo-a");
  const repoB = join(workspace, "repo-b");
  mkdirSync(repoA, { recursive: true });
  mkdirSync(repoB, { recursive: true });

  assert.equal(resolveRequestProjectDir(repoA, workspace, { system: claudeCodeSystemBlocks(repoA) }), repoA);
  assert.equal(resolveRequestProjectDir(repoA, workspace, { system: claudeCodeSystemBlocks(repoB) }), repoB);
});

test("resolveRequestProjectDir refuses to route outside --workspace even if a client claims to be there", () => {
  const workspace = mkdtempSync(join(tmpdir(), "kage-workspace-"));
  const repoA = join(workspace, "repo-a");
  mkdirSync(repoA, { recursive: true });
  const outside = mkdtempSync(join(tmpdir(), "kage-outside-workspace-"));

  // A client claiming a working directory outside the declared workspace must NOT redirect
  // the proxy there — this is the safety boundary, not an incidental default.
  assert.equal(resolveRequestProjectDir(repoA, workspace, { system: claudeCodeSystemBlocks(outside) }), repoA);
});

test("resolveRequestProjectDir falls back to default for a nonexistent path or a client that reports none", () => {
  const workspace = mkdtempSync(join(tmpdir(), "kage-workspace-"));
  const repoA = join(workspace, "repo-a");
  mkdirSync(repoA, { recursive: true });

  assert.equal(resolveRequestProjectDir(repoA, workspace, { system: claudeCodeSystemBlocks(join(workspace, "never-created")) }), repoA);
  assert.equal(resolveRequestProjectDir(repoA, workspace, { system: "a plain string system prompt, no working directory line" }), repoA);
  assert.equal(resolveRequestProjectDir(repoA, workspace, {}), repoA);
});

// End-to-end: ONE real startProxy() process, TWO different repos, each with its own distinct
// memory — proves --workspace actually routes each request by the client's reported cwd,
// not just at the unit level.
test("one proxy process serves two different repos under --workspace, each getting its own memory", async () => {
  const workspace = mkdtempSync(join(tmpdir(), "kage-workspace-e2e-"));
  const repoA = join(workspace, "repo-a");
  const repoB = join(workspace, "repo-b");
  mkdirSync(join(repoA, ".agent_memory", "packets"), { recursive: true });
  mkdirSync(join(repoB, ".agent_memory", "packets"), { recursive: true });
  capture({ projectDir: repoA, title: "Repo A uses Redis for caching", body: "Repo A's session store is Redis, not Memcached. Verified by: npm test.", type: "decision", allowMissingPaths: true });
  capture({ projectDir: repoB, title: "Repo B uses Postgres for caching", body: "Repo B's session store is Postgres, not Redis. Verified by: npm test.", type: "decision", allowMissingPaths: true });

  const captured: string[] = [];
  const { server: fakeUpstream, url: upstreamUrl } = await withFakeUpstream((req, res) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      captured.push(body);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ content: [{ type: "text", text: "ok" }], usage: { input_tokens: 1, output_tokens: 1 } }));
    });
  });
  const proxyServer = startProxy(repoA, { port: 0, upstream: upstreamUrl, workspace });
  await new Promise<void>((resolve) => proxyServer.on("listening", resolve));
  const proxyAddress = proxyServer.address();
  const proxyPort = typeof proxyAddress === "object" && proxyAddress ? proxyAddress.port : 0;

  const askAs = (workingDir: string, question: string): Promise<void> => new Promise((resolve, reject) => {
    const requestBody = JSON.stringify({ system: claudeCodeSystemBlocks(workingDir), messages: [{ role: "user", content: question }] });
    const req = httpRequest(
      { hostname: "127.0.0.1", port: proxyPort, path: "/v1/messages", method: "POST", headers: { "content-type": "application/json", "content-length": Buffer.byteLength(requestBody) } },
      (res) => { res.on("data", () => {}); res.on("end", () => resolve()); }
    );
    req.on("error", reject);
    req.end(requestBody);
  });

  try {
    await askAs(repoA, "which cache does this repo use?");
    await askAs(repoB, "which cache does this repo use?");
    assert.equal(captured.length, 2);
    // Each repo's own packet TITLE is the unambiguous per-repo signal (packet bodies both
    // mention "Redis" and "Postgres" in their compare-and-contrast sentences by design).
    assert.match(captured[0], /Repo A uses Redis for caching/);
    assert.doesNotMatch(captured[0], /Repo B uses Postgres for caching/);
    assert.match(captured[1], /Repo B uses Postgres for caching/);
    assert.doesNotMatch(captured[1], /Repo A uses Redis for caching/);
  } finally {
    proxyServer.close();
    fakeUpstream.close();
  }
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

// --- vNext exact-measurement gateway (Phase A, Task 6) -------------------------------------
// One fake upstream that answers both /v1/messages (with real usage) and the sibling
// /v1/messages/count_tokens, plus a receipt sink the test can inspect.

function projectWithMemory(): string {
  const project = tempProject();
  capture({
    projectDir: project,
    title: "Payments must be idempotent via the ledger key",
    summary: "Retries dedupe on the ledger idempotency key",
    body: "processPayment must pass the ledger idempotency key so retries dedupe. Verified by: npm test.",
    type: "decision",
    allowMissingPaths: true,
  });
  return project;
}

// The provider's usage block, in the shape the Anthropic API actually returns it: `input_tokens`
// is the UNCACHED REMAINDER, and the cache fields carry the rest of the prompt. An uncached
// request reports explicit zeros — it does not omit the fields.
const UNCACHED_USAGE = {
  input_tokens: 137,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
  output_tokens: 5,
};

// A cached provider: the same deterministic tokenizer as the count_tokens stand-in (1 token per 10
// bytes of body), but reported the way the real API reports a cached request — a small uncached
// remainder in `input_tokens` and the rest of the prompt in `cache_read_input_tokens`.
function cachedUsageFor(body: string): Record<string, number> {
  const total = Math.ceil(Buffer.byteLength(body) / 10);
  const uncached = Math.min(20, total);
  return {
    input_tokens: uncached,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: total - uncached,
    output_tokens: 5,
  };
}

function measuringUpstream(
  seen: Array<{ path: string; body: string }>,
  usageFor: (body: string) => Record<string, number> = () => UNCACHED_USAGE,
) {
  return withFakeUpstream((req, res) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      seen.push({ path: req.url ?? "", body });
      res.writeHead(200, { "content-type": "application/json" });
      if ((req.url ?? "").startsWith("/v1/messages/count_tokens")) {
        // A real measurement of whatever body was counted: one token per 10 bytes is a
        // deterministic stand-in for the provider's tokenizer, not an estimate Kage invents.
        res.end(JSON.stringify({ input_tokens: Math.ceil(Buffer.byteLength(body) / 10) }));
        return;
      }
      res.end(JSON.stringify({ content: [{ type: "text", text: "ok" }], usage: usageFor(body) }));
    });
  });
}

// Receipts are recorded after the client has already been answered (measurement must never sit in
// the request path), so a test waits for the write instead of racing it.
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

async function listeningPort(server: Server): Promise<number> {
  await new Promise<void>((resolve) => server.on("listening", resolve));
  const address = server.address();
  return typeof address === "object" && address ? address.port : 0;
}

const QUESTION = JSON.stringify({
  model: "claude-opus-4-8",
  system: "You are Claude Code, Anthropic's official CLI for Claude.",
  messages: [{ role: "user", content: "how should I make the payment flow idempotent?" }],
});

test("audit mode forwards the exact original bytes even though memory would have been injected", async () => {
  const project = projectWithMemory();
  const seen: Array<{ path: string; body: string }> = [];
  const collector = collectingSink();
  const { server: fakeUpstream, url } = await measuringUpstream(seen);
  const proxy = startProxy(project, { port: 0, upstream: url, mode: "audit", receiptSink: collector.sink });
  const port = await listeningPort(proxy);

  try {
    const response = await proxyRequest(port, "/v1/messages", QUESTION);
    assert.equal(response.status, 200);
    assert.equal(seen.length, 1);
    // THE audit invariant: the bytes on the wire are byte-identical to the client's.
    assert.equal(seen[0].body, QUESTION);
    assert.doesNotMatch(seen[0].body, /injected by Kage/);

    const receipt = await collector.waitForReceipt();
    assert.equal(collector.receipts.length, 1);
    assert.equal(receipt.mode, "audit");
    assert.equal(receipt.model, "claude-opus-4-8");
    assert.equal(receipt.before_input_bytes, Buffer.byteLength(QUESTION));
    // The candidate (simulated) transformed body is measured in bytes but never forwarded.
    assert.equal(receipt.after_input_bytes > receipt.before_input_bytes, true);
    // Only the forwarded body's tokens were measured by the provider.
    assert.equal(receipt.before_input_tokens, 137);
    assert.equal(receipt.after_input_tokens, null);
    assert.equal(receipt.measurement_quality, "partial");
    assert.equal(receipt.provider_input_cost_after_usd, null);
    assert.equal(receipt.output_tokens, 5);
    assert.deepEqual(receipt.transformations, ["context_append_last_user_turn"]);
  } finally {
    proxy.close();
    fakeUpstream.close();
  }
});

test("assist mode forwards the transformed body and records it as the after side", async () => {
  const project = projectWithMemory();
  const seen: Array<{ path: string; body: string }> = [];
  const collector = collectingSink();
  const { server: fakeUpstream, url } = await measuringUpstream(seen);
  const proxy = startProxy(project, { port: 0, upstream: url, mode: "assist", receiptSink: collector.sink });
  const port = await listeningPort(proxy);

  try {
    await proxyRequest(port, "/v1/messages", QUESTION);
    assert.match(seen[0].body, /injected by Kage/);
    const receipt = await collector.waitForReceipt();
    assert.equal(receipt.mode, "assist");
    assert.equal(receipt.before_input_bytes, Buffer.byteLength(QUESTION));
    assert.equal(receipt.after_input_bytes, Buffer.byteLength(seen[0].body));
    assert.equal(receipt.after_input_tokens, 137);
    assert.equal(receipt.before_input_tokens, null);
    assert.equal(receipt.measurement_quality, "partial");
    assert.equal(receipt.provider_input_cost_before_usd, null);
  } finally {
    proxy.close();
    fakeUpstream.close();
  }
});

test("an upstream token count of the unsent body promotes the receipt to exact", async () => {
  const project = projectWithMemory();
  const seen: Array<{ path: string; body: string }> = [];
  const collector = collectingSink();
  const { server: fakeUpstream, url } = await measuringUpstream(seen);
  const proxy = startProxy(project, { port: 0, upstream: url, mode: "audit", countTokens: true, receiptSink: collector.sink });
  const port = await listeningPort(proxy);

  try {
    await proxyRequest(port, "/v1/messages", QUESTION);
    const receipt = await collector.waitForReceipt();
    const counted = seen.filter((entry) => entry.path.startsWith("/v1/messages/count_tokens"));
    assert.equal(counted.length, 1);
    // The counted body is the candidate, never the one already forwarded.
    assert.match(counted[0].body, /injected by Kage/);
    assert.equal(receipt.measurement_quality, "exact");
    assert.equal(receipt.before_input_tokens, 137);
    assert.equal(receipt.after_input_tokens, Math.ceil(Buffer.byteLength(counted[0].body) / 10));
    assert.equal(receipt.provider_input_cost_before_usd, 137 / 1_000_000 * 5);
  } finally {
    proxy.close();
    fakeUpstream.close();
  }
});

// THE regression this hardening pass exists for. On a cached request the provider reports only the
// UNCACHED REMAINDER in `usage.input_tokens` (20 here) while the real prompt is the whole body.
// Putting that remainder on one side of the receipt and a count_tokens number (which counts the
// whole body) on the other manufactures a fake saving — Kage claiming that ADDING context CUT the
// prompt. The two sides must both be total prompt tokens.
test("a cached request is measured as the whole prompt, so the receipt cannot claim a fake saving", async () => {
  const project = projectWithMemory();
  const seen: Array<{ path: string; body: string }> = [];
  const collector = collectingSink();
  const { server: fakeUpstream, url } = await measuringUpstream(seen, cachedUsageFor);
  const proxy = startProxy(project, { port: 0, upstream: url, mode: "assist", countTokens: true, receiptSink: collector.sink });
  const port = await listeningPort(proxy);

  try {
    await proxyRequest(port, "/v1/messages", QUESTION);
    const receipt = await collector.waitForReceipt();
    const forwarded = seen.find((entry) => entry.path === "/v1/messages")!;
    assert.match(forwarded.body, /injected by Kage/);

    const forwardedTotal = Math.ceil(Buffer.byteLength(forwarded.body) / 10);
    const originalTotal = Math.ceil(Buffer.byteLength(QUESTION) / 10);

    assert.equal(receipt.measurement_quality, "exact");
    // The AFTER side is the body that was sent: the WHOLE prompt, not the 20-token remainder.
    assert.equal(receipt.after_input_tokens, forwardedTotal);
    assert.notEqual(receipt.after_input_tokens, 20);
    assert.equal(receipt.before_input_tokens, originalTotal);
    // Injecting memory made the prompt bigger. A receipt that said otherwise would be a lie.
    assert.equal(receipt.after_input_tokens! > receipt.before_input_tokens!, true);
  } finally {
    proxy.close();
    fakeUpstream.close();
  }
});

// The count_tokens endpoint accepts model/messages/system/tools (+tool_choice, thinking) and 400s
// on the rest, so posting the complete Messages body meant the probe always failed — every
// transformed receipt stayed "partial" forever while still spending a real round trip.
test("the count_tokens probe body carries only the fields that endpoint accepts", async () => {
  const project = projectWithMemory();
  const seen: Array<{ path: string; body: string }> = [];
  const collector = collectingSink();
  const { server: fakeUpstream, url } = await measuringUpstream(seen);
  const proxy = startProxy(project, { port: 0, upstream: url, mode: "audit", countTokens: true, receiptSink: collector.sink });
  const port = await listeningPort(proxy);

  const fullBody = JSON.stringify({
    model: "claude-opus-4-8",
    max_tokens: 32_000,
    stream: false,
    metadata: { user_id: "u1" },
    system: "You are Claude Code, Anthropic's official CLI for Claude.",
    messages: [{ role: "user", content: "how should I make the payment flow idempotent?" }],
  });

  try {
    await proxyRequest(port, "/v1/messages", fullBody);
    await collector.waitForReceipt();
    const counted = seen.filter((entry) => entry.path.startsWith("/v1/messages/count_tokens"));
    assert.equal(counted.length, 1);
    const probe = JSON.parse(counted[0].body) as Record<string, unknown>;
    assert.deepEqual(Object.keys(probe).sort(), ["messages", "model", "system"]);
    assert.equal("max_tokens" in probe, false);
    assert.equal("stream" in probe, false);
    assert.equal("metadata" in probe, false);
    // It is still the candidate body being counted — the probe is a measurement, not a stub.
    assert.match(counted[0].body, /injected by Kage/);
  } finally {
    proxy.close();
    fakeUpstream.close();
  }
});

// A request where nothing was transformed has nothing to measure. Writing an "exact, zero savings"
// row for it would inflate the exact-coverage metric with rows that were never transformed.
test("no receipt is written when nothing was transformed", async () => {
  const project = tempProject(); // memory tree, no packets: nothing to recall, nothing to inject
  const seen: Array<{ path: string; body: string }> = [];
  const collector = collectingSink();
  const { server: fakeUpstream, url } = await measuringUpstream(seen);
  const proxy = startProxy(project, { port: 0, upstream: url, mode: "assist", receiptSink: collector.sink });
  const port = await listeningPort(proxy);

  const noRecall = JSON.stringify({
    model: "claude-opus-4-8",
    messages: [{ role: "user", content: "xyzzy nothing will match this token qwerty" }],
  });

  try {
    const response = await proxyRequest(port, "/v1/messages", noRecall);
    assert.equal(response.status, 200);
    assert.equal(seen[0].body, noRecall);
    // Give the (async) receipt path a chance to run before asserting it did nothing.
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(collector.receipts.length, 0);
  } finally {
    proxy.close();
    fakeUpstream.close();
  }
});

test("a receipt failure never changes the client response", async () => {
  const project = projectWithMemory();
  const seen: Array<{ path: string; body: string }> = [];
  const { server: fakeUpstream, url } = await measuringUpstream(seen);
  const proxy = startProxy(project, {
    port: 0,
    upstream: url,
    mode: "assist",
    receiptSink: { write: () => { throw new Error("receipt store exploded"); } },
  });
  const port = await listeningPort(proxy);

  try {
    const response = await proxyRequest(port, "/v1/messages", QUESTION);
    assert.equal(response.status, 200);
    assert.match(response.body, /"text":"ok"/);
    // The process must still be serving after the sink blew up mid-measurement.
    const second = await proxyRequest(port, "/v1/messages", QUESTION);
    assert.equal(second.status, 200);
  } finally {
    proxy.close();
    fakeUpstream.close();
  }
});

// Measurement is opt-in and costs a provider round trip. It must run AFTER the client has been
// answered — a hanging count_tokens probe must not hold the client's response open.
test("a hanging measurement probe never delays the client response", async () => {
  const project = projectWithMemory();
  const seen: Array<{ path: string; body: string }> = [];
  const pending: import("node:http").ServerResponse[] = [];

  const { server: fakeUpstream, url } = await withFakeUpstream((req, res) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      seen.push({ path: req.url ?? "", body });
      if ((req.url ?? "").startsWith("/v1/messages/count_tokens")) {
        pending.push(res); // never answered while the client is waiting
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ content: [{ type: "text", text: "ok" }], usage: UNCACHED_USAGE }));
    });
  });

  const proxy = startProxy(project, {
    port: 0,
    upstream: url,
    mode: "audit",
    countTokens: true,
    receiptSink: { write: () => {} },
  });
  const port = await listeningPort(proxy);

  try {
    const startedAt = Date.now();
    const response = await proxyRequest(port, "/v1/messages", QUESTION);
    const elapsed = Date.now() - startedAt;
    assert.equal(response.status, 200);
    assert.match(response.body, /"text":"ok"/);
    // The probe is still outstanding — the client was answered anyway, and fast.
    assert.equal(elapsed < 1_000, true, `client waited ${elapsed}ms on a hanging probe`);
    // A second request is served while the first probe is still hanging.
    assert.equal((await proxyRequest(port, "/v1/messages", QUESTION)).status, 200);
  } finally {
    for (const res of pending) res.end(JSON.stringify({ input_tokens: 1 }));
    proxy.close();
    fakeUpstream.close();
  }
});

// The default sink is the repo-local vNext store. It is opened lazily precisely so that a legacy
// `kage proxy` on Node 18 (no node:sqlite) keeps working and simply records nothing.
test("the default sink persists receipts into the repo-local vNext store", async (t) => {
  let vnextRuntime = true;
  try {
    assertVnextRuntime();
  } catch {
    vnextRuntime = false;
  }
  if (!vnextRuntime) {
    t.skip("node:sqlite is unavailable on this runtime; the proxy records no receipts and still serves traffic");
    return;
  }

  const project = projectWithMemory();
  const seen: Array<{ path: string; body: string }> = [];
  const { server: fakeUpstream, url } = await measuringUpstream(seen);
  const proxy = startProxy(project, { port: 0, upstream: url, mode: "audit" });
  const port = await listeningPort(proxy);

  try {
    await proxyRequest(port, "/v1/messages", QUESTION);
    const databasePath = resolveRuntimePaths(project).databasePath;
    let rows: Array<{ mode: string; measurement_quality: string; before_input_tokens: number | null }> = [];
    // The write happens after the client was answered, so poll briefly rather than racing it.
    for (let attempt = 0; attempt < 50 && rows.length === 0; attempt++) {
      const db = openVnextDatabase(databasePath);
      try {
        rows = db.prepare("SELECT mode, measurement_quality, before_input_tokens FROM transformation_receipts").all() as never;
      } finally {
        db.close();
      }
      if (!rows.length) await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.equal(rows.length, 1);
    assert.equal(rows[0].mode, "audit");
    assert.equal(rows[0].measurement_quality, "partial");
    assert.equal(rows[0].before_input_tokens, 137);
  } finally {
    proxy.close();
    fakeUpstream.close();
  }
});

test("a repo with no .agent_memory stays a plain passthrough and gets no memory tree", async () => {
  const project = mkdtempSync(join(tmpdir(), "kage-proxy-bare-"));
  const seen: Array<{ path: string; body: string }> = [];
  const { server: fakeUpstream, url } = await measuringUpstream(seen);
  const proxy = startProxy(project, { port: 0, upstream: url, mode: "audit" });
  const port = await listeningPort(proxy);

  try {
    const response = await proxyRequest(port, "/v1/messages", QUESTION);
    assert.equal(response.status, 200);
    assert.equal(seen[0].body, QUESTION);
    // No .agent_memory means no receipts store: the proxy never creates a memory tree the user
    // did not ask for.
    assert.equal(existsSync(join(project, ".agent_memory")), false);
  } finally {
    proxy.close();
    fakeUpstream.close();
  }
});

test("count_tokens stays a byte-identical passthrough and produces no receipt", async () => {
  const project = projectWithMemory();
  const seen: Array<{ path: string; body: string }> = [];
  const collector = collectingSink();
  const { server: fakeUpstream, url } = await measuringUpstream(seen);
  const proxy = startProxy(project, { port: 0, upstream: url, mode: "assist", receiptSink: collector.sink });
  const port = await listeningPort(proxy);

  try {
    await proxyRequest(port, "/v1/messages/count_tokens?beta=true", QUESTION);
    assert.equal(seen.length, 1);
    assert.equal(seen[0].body, QUESTION);
    assert.equal(collector.receipts.length, 0);
  } finally {
    proxy.close();
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

// --- The ProviderGateway seam: the proxy core is provider-neutral, Anthropic is one gateway ---

test("the proxy seam dispatches an eligible POST /v1/messages to the Anthropic gateway, nothing else", () => {
  // The core routes by asking each registered gateway whether it matches. The Anthropic gateway is
  // the first (and, for Task 1, only) one, and it matches exactly what isCompletionsRequest matched.
  assert.equal(selectGateway(defaultGateways, "POST", "/v1/messages", null), anthropicGateway);
  assert.equal(selectGateway(defaultGateways, "POST", "/v1/messages?beta=true", null), anthropicGateway);
  // The sibling token-counting endpoint and non-POSTs dispatch to NO gateway — a strict passthrough.
  assert.equal(selectGateway(defaultGateways, "POST", "/v1/messages/count_tokens?beta=true", null), null);
  assert.equal(selectGateway(defaultGateways, "GET", "/v1/messages", null), null);
  assert.equal(selectGateway(defaultGateways, "POST", "/v1/models", null), null);
  // The gateway names the provider it speaks for — this is what a per-provider report keys on.
  assert.equal(anthropicGateway.provider, "anthropic");
  // The seam's matches() is exactly the eligibility the core used to hardcode.
  assert.equal(anthropicGateway.matches("POST", "/v1/messages", null), isCompletionsRequest("POST", "/v1/messages"));
  assert.equal(anthropicGateway.matches("POST", "/v1/messages/count_tokens", null), isCompletionsRequest("POST", "/v1/messages/count_tokens"));
});

test("the Anthropic gateway maps response tool-use blocks to protocol-v1 tool_result evidence", () => {
  // Capture unification: the provider-specific parse (Anthropic response content blocks) lives in
  // the gateway; the protocol-v1 event assembly and the source_fingerprint construction are shared.
  const repository = claudeRepositoryIdentity("/repo");
  const events = anthropicGateway.captureEvents({
    repository,
    sessionId: "session-1",
    userPrompt: "make the payment flow idempotent",
    responseBody: JSON.stringify({
      content: [
        { type: "text", text: "sure" },
        { type: "tool_use", id: "tu_1", name: "Bash", input: { command: "rm -rf secrets" } },
      ],
      usage: { input_tokens: 1, output_tokens: 1 },
    }),
  });
  const prompt = events.find((event) => event.event_type === "prompt");
  const tool = events.find((event) => event.event_type === "tool_result");
  assert.ok(prompt, "a prompt event is captured");
  assert.equal(prompt.privacy_class, "local_raw");
  assert.equal(prompt.payload.text, "make the payment flow idempotent");
  assert.ok(tool, "a tool_result event is captured from the response tool_use block");
  assert.equal(tool.payload.tool, "Bash");
  // The fingerprint hashes the SIGNAL, never a random id — a duplicate post deduplicates in the store.
  assert.match(tool.source_fingerprint, /^[a-f0-9]{64}$/);
  assert.notEqual(tool.source_fingerprint, tool.event_id);
  // The tool's arguments are never copied into the event — only that the tool was invoked.
  assert.ok(!JSON.stringify(events).includes("rm -rf secrets"), "tool arguments never ride along");
});

// --- Capture unification: the proxy is a first-class protocol-v1 evidence source ------------
//
// The proxy already writes receipts + deliveries + a legacy observation. Task 1 Part B makes it
// ALSO feed the vNext evidence stream via the fail-open adapter client: a `prompt` event per
// eligible request. This must never sit in the request path and must never break a session — it
// runs after the client has been answered, inside a catch-all, exactly like recordReceipt.

function skipWithoutVnextRuntime(t: import("node:test").TestContext): boolean {
  try {
    assertVnextRuntime();
    return false;
  } catch {
    t.skip("node:sqlite is unavailable on this runtime; the proxy emits no evidence and still serves traffic");
    return true;
  }
}

// A runtime status file pointing at a chosen port, written with the exact ownership and 0600/0700
// permissions the adapter client demands (see readAdapterConnection). pid is THIS process so the
// liveness probe passes; the port is the caller's choice — a dead one exercises the fail-open path.
function writeRuntimeStatusStub(project: string, port: number): void {
  const paths = resolveRuntimePaths(project);
  mkdirSync(paths.runtimeDirectory, { recursive: true, mode: 0o700 });
  chmodSync(paths.runtimeDirectory, 0o700);
  writeFileSync(paths.statusPath, JSON.stringify({
    protocol_version: 1,
    pid: process.pid,
    host: "127.0.0.1",
    port,
    mode: "assist",
    started_at: new Date().toISOString(),
    database_path: paths.databasePath,
    token_path: paths.tokenPath,
  }), { mode: 0o600 });
  chmodSync(paths.statusPath, 0o600);
  writeFileSync(paths.tokenPath, `klt_${"0".repeat(43)}\n`, { mode: 0o600 });
  chmodSync(paths.tokenPath, 0o600);
}

test("the proxy emits a protocol-v1 prompt evidence event via the shipped path when a runtime is up", async (t) => {
  if (skipWithoutVnextRuntime(t)) return;

  const project = projectWithMemory();
  const seen: Array<{ path: string; body: string }> = [];
  const { server: fakeUpstream, url } = await measuringUpstream(seen);
  // A REAL runtime on the same repo: it writes status.json + token and owns the evidence store the
  // proxy will POST into. No receiptSink override — this is the fully shipped wiring.
  const runtime = await startLocalRuntime({ projectDir: project, port: 0, mode: "assist" });
  const proxy = startProxy(project, { port: 0, upstream: url, mode: "assist" });
  const port = await listeningPort(proxy);

  try {
    await proxyRequest(port, "/v1/messages", QUESTION);
    let rows: Array<{ event_type: string; privacy_class: string; payload_json: string }> = [];
    // The event is emitted AFTER the client was answered, so poll rather than race it. It is read
    // straight out of the runtime's own SQLite handle — the store the shipped /v2/events wrote to.
    for (let attempt = 0; attempt < 100 && rows.length === 0; attempt++) {
      rows = runtime.database.prepare("SELECT event_type, privacy_class, payload_json FROM evidence_events").all() as never;
      if (!rows.length) await new Promise((resolve) => setTimeout(resolve, 20));
    }
    const prompt = rows.find((row) => row.event_type === "prompt");
    assert.ok(prompt, "a prompt evidence event reached the runtime's event store");
    // A prompt is user text: it is local_raw, the tier that never leaves this machine.
    assert.equal(prompt.privacy_class, "local_raw");
    // The signal that was captured is the user's actual prompt, not an invented placeholder.
    assert.match(prompt.payload_json, /idempotent/);
  } finally {
    proxy.close();
    fakeUpstream.close();
    await runtime.close();
  }
});

test("the proxy serves traffic normally and never blocks when the evidence runtime is down (fail open)", async (t) => {
  const project = projectWithMemory();
  // A status file that names a dead port: readAdapterConnection returns a connection, the POST to
  // /v2/events cannot land, and the whole thing must be invisible to the client.
  writeRuntimeStatusStub(project, 1);
  const seen: Array<{ path: string; body: string }> = [];
  const { server: fakeUpstream, url } = await measuringUpstream(seen);
  const proxy = startProxy(project, { port: 0, upstream: url, mode: "assist", receiptSink: null });
  const port = await listeningPort(proxy);

  try {
    const startedAt = Date.now();
    const first = await proxyRequest(port, "/v1/messages", QUESTION);
    const elapsed = Date.now() - startedAt;
    assert.equal(first.status, 200);
    assert.match(first.body, /"text":"ok"/);
    // Evidence emission runs only after the client is answered, so a dead endpoint cannot slow it.
    assert.equal(elapsed < 1_000, true, `client waited ${elapsed}ms with a dead evidence endpoint`);
    // The process keeps serving after the failed-open evidence post.
    const second = await proxyRequest(port, "/v1/messages", QUESTION);
    assert.equal(second.status, 200);
  } finally {
    proxy.close();
    fakeUpstream.close();
  }
});
