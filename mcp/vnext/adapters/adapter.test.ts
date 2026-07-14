import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { ContextCapsule, EvidenceEvent, RepositoryIdentity } from "../protocol/index.js";
import type { ContextRequest } from "../context/source.js";
import {
  ADAPTER_CONTEXT_TIMEOUT_MS,
  ADAPTER_EVENT_TIMEOUT_MS,
  readAdapterConnection,
  requestAdapterContext,
  sendAdapterEvent,
  sendAdapterHandshake,
} from "./client.js";
import {
  CLAUDE_ADAPTER_ID,
  claudeEventType,
  claudeHandshake,
  claudeHookToEvent,
  claudeRepositoryIdentity,
  claudeSourceFingerprint,
  claudeTaskIdentity,
  renderContextBlock,
  KAGE_CONTEXT_BEGIN,
  KAGE_CONTEXT_END,
} from "./claude.js";

// dist/vnext/adapters -> repo root is four levels up (mcp/dist/vnext/adapters).
const PLUGIN_HOOKS = join(__dirname, "..", "..", "..", "..", "plugin", "hooks");
const ADAPTER_SCRIPT = join(PLUGIN_HOOKS, "kage-vnext-adapter.sh");
const TOKEN = "klt_0123456789012345678901234567890123456789012";

function fixtureRepositoryIdentity(): RepositoryIdentity {
  return {
    repo_id: "repo_fixture",
    root: "/repo",
    remote: null,
    branch: "main",
    commit: "abc123",
    worktree: "/repo",
  };
}

function fixtureEvidenceEvent(): EvidenceEvent {
  return claudeHookToEvent(
    "prompt",
    { cwd: "/repo", session_id: "session-1", prompt: "fix the refund flow" },
    fixtureRepositoryIdentity(),
  )!;
}

function fixtureCapsule(): ContextCapsule {
  return {
    protocol_version: 1,
    capsule_id: "capsule_1",
    task_id: "task_1",
    repository_id: "repo_fixture",
    query: "fix the refund flow",
    sections: [{
      kind: "invariant",
      title: "Refunds are idempotent",
      body: "Every refund path checks the ledger first.",
      evidence_ids: ["packet-1"],
      priority: 1,
    }],
    token_budget: 2_000,
    estimated_tokens: 40,
    created_at: "2026-07-13T06:00:00.000Z",
    expires_at: "2026-07-13T06:05:00.000Z",
  };
}

function fixtureContextRequest(): ContextRequest {
  return {
    repository: fixtureRepositoryIdentity(),
    task: claudeTaskIdentity(fixtureRepositoryIdentity(), "session-1"),
    query: "fix the refund flow",
    targets: [],
    changed_files: [],
    token_budget: 2_000,
  };
}

interface StubRuntime {
  url: string;
  requests: Array<{ path: string; authorization: string | undefined; body: unknown }>;
  close(): Promise<void>;
}

type StubHandler = (req: IncomingMessage, res: ServerResponse, body: unknown) => void;

async function startStubRuntime(handler: StubHandler): Promise<StubRuntime> {
  const requests: StubRuntime["requests"] = [];
  const sockets = new Set<import("node:net").Socket>();
  const server: Server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      let body: unknown;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "null");
      } catch {
        body = null;
      }
      requests.push({
        path: req.url ?? "",
        authorization: typeof req.headers.authorization === "string" ? req.headers.authorization : undefined,
        body,
      });
      handler(req, res, body);
    });
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("stub runtime did not bind");
  return {
    url: `http://127.0.0.1:${address.port}`,
    requests,
    async close() {
      const closed = new Promise<void>((resolve) => server.close(() => resolve()));
      for (const socket of sockets) socket.destroy();
      await closed;
    },
  };
}

// The runtime writes status.json and token 0600 inside a 0700 directory (runtime/paths.ts,
// status.ts, token.ts). The adapter trusts them ONLY when they still look like that, so the
// fixture has to reproduce the real permissions, not writeFileSync's umask default.
function stubProject(status: Record<string, unknown> | null, token: string | null = TOKEN): string {
  const project = mkdtempSync(join(tmpdir(), "kage-adapter-"));
  const runtimeDir = join(project, ".agent_memory", "daemon", "vnext");
  mkdirSync(runtimeDir, { recursive: true, mode: 0o700 });
  chmodSync(runtimeDir, 0o700);
  if (status) {
    writeFileSync(join(runtimeDir, "status.json"), `${JSON.stringify(status, null, 2)}\n`, { mode: 0o600 });
    chmodSync(join(runtimeDir, "status.json"), 0o600);
  }
  if (token) {
    writeFileSync(join(runtimeDir, "token"), `${token}\n`, { mode: 0o600 });
    chmodSync(join(runtimeDir, "token"), 0o600);
  }
  return project;
}

// Above every platform's pid_max (macOS caps at 99998), so it can never be a live process: this is
// the SIGKILLed / OOM-killed / rebooted daemon whose status.json is still sitting on disk.
const DEAD_PID = 999_999;

function runtimeStatus(
  port: number,
  mode: "audit" | "assist" = "audit",
  pid: number = process.pid,
): Record<string, unknown> {
  return {
    protocol_version: 1,
    pid,
    host: "127.0.0.1",
    port,
    mode,
    started_at: "2026-07-13T06:00:00.000Z",
    database_path: "/tmp/local.db",
    token_path: "/tmp/token",
  };
}

// The hook is run asynchronously on purpose: a stub runtime lives on this same event loop, and a
// synchronous spawn would block it, so every request would "time out" and the test would pass for
// the wrong reason.
function runAdapter(
  project: string,
  payload: Record<string, unknown>,
  env: NodeJS.ProcessEnv = {},
): Promise<{ status: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn("bash", [ADAPTER_SCRIPT], { cwd: project, env: { ...process.env, ...env } });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString("utf8"); });
    child.once("error", reject);
    child.once("close", (status) => resolve({ status, stdout, stderr }));
    child.stdin.end(JSON.stringify(payload));
  });
}

// --- Claude hook payload mapping -------------------------------------------------------

test("Claude prompt payload maps to one privacy-classified event", () => {
  const event = claudeHookToEvent("prompt", {
    cwd: "/repo",
    session_id: "session-1",
    prompt: "fix the refund flow",
  }, fixtureRepositoryIdentity());
  assert.ok(event, "prompt payload produces an event");
  assert.equal(event.event_type, "prompt");
  assert.equal(event.privacy_class, "local_raw");
  assert.match(event.source_fingerprint, /^[a-f0-9]{64}$/);
  assert.equal(event.protocol_version, 1);
  assert.equal(event.repository_id, "repo_fixture");
  assert.equal(event.payload.text, "fix the refund flow");
});

test("Claude hook event names map to protocol event types by tool", () => {
  assert.equal(claudeEventType("SessionStart", ""), "session_start");
  assert.equal(claudeEventType("UserPromptSubmit", ""), "prompt");
  assert.equal(claudeEventType("PreToolUse", "Read"), "file_open");
  assert.equal(claudeEventType("PreToolUse", "Edit"), "file_edit");
  assert.equal(claudeEventType("PreToolUse", "MultiEdit"), "file_edit");
  assert.equal(claudeEventType("PostToolUse", "Bash"), "tool_result");
  assert.equal(claudeEventType("PostToolUseFailure", "Bash"), "tool_result");
  assert.equal(claudeEventType("SessionEnd", ""), "session_end");
  // Unknown hooks are skipped rather than forced into a protocol type: protocol v1 is frozen.
  assert.equal(claudeEventType("PreCompact", ""), null);
  assert.equal(claudeEventType("Notification", ""), null);
});

test("file events carry paths only — never file or tool content", () => {
  const edit = claudeHookToEvent("file_edit", {
    cwd: "/repo",
    session_id: "session-1",
    tool_name: "Edit",
    tool_input: { file_path: "/repo/src/refund.ts", old_string: "SECRET-OLD", new_string: "SECRET-NEW" },
  }, fixtureRepositoryIdentity());
  assert.ok(edit);
  assert.equal(edit.event_type, "file_edit");
  assert.equal(edit.privacy_class, "team_metadata");
  assert.equal(edit.payload.path, "/repo/src/refund.ts");
  const serialized = JSON.stringify(edit);
  assert.ok(!serialized.includes("SECRET-OLD"), "old file content is not in the event");
  assert.ok(!serialized.includes("SECRET-NEW"), "new file content is not in the event");
});

test("a failed tool call is distinguishable from a successful one", () => {
  // Phase A is a MEASUREMENT phase: if every tool_result says "ok", the data cannot tell a
  // working session from a thrashing one. Claude Code has no PostToolUseFailure event — the
  // failure is in the tool_response of an ordinary PostToolUse.
  const failed = claudeHookToEvent("tool_result", {
    cwd: "/repo",
    session_id: "session-1",
    hook_event_name: "PostToolUse",
    tool_name: "Bash",
    tool_response: { stdout: "", stderr: "command not found", is_error: true },
  }, fixtureRepositoryIdentity());
  const ok = claudeHookToEvent("tool_result", {
    cwd: "/repo",
    session_id: "session-1",
    hook_event_name: "PostToolUse",
    tool_name: "Bash",
    tool_response: { stdout: "done" },
  }, fixtureRepositoryIdentity());
  assert.ok(failed && ok);
  assert.equal(failed.payload.outcome, "error");
  assert.equal(ok.payload.outcome, "ok");
  // No tool text rides along with the outcome.
  assert.ok(!JSON.stringify(failed).includes("command not found"));
});

test("evidence fingerprints are stable per signal so a retried post deduplicates", () => {
  const payload = { cwd: "/repo", session_id: "session-1", prompt: "fix the refund flow" };
  const first = claudeHookToEvent("prompt", payload, fixtureRepositoryIdentity(), new Date("2026-07-13T06:00:00.000Z"));
  const retry = claudeHookToEvent("prompt", payload, fixtureRepositoryIdentity(), new Date("2026-07-13T06:00:00.000Z"));
  const other = claudeHookToEvent("prompt", { ...payload, prompt: "fix the payout flow" }, fixtureRepositoryIdentity(), new Date("2026-07-13T06:00:00.000Z"));
  assert.ok(first && retry && other);
  assert.equal(first.source_fingerprint, retry.source_fingerprint);
  assert.notEqual(first.source_fingerprint, other.source_fingerprint);
  // A random event_id alone must not defeat the store's fingerprint dedupe.
  assert.notEqual(first.event_id, retry.event_id);
});

test("the same session in the same repo is one task across hooks", () => {
  const repository = fixtureRepositoryIdentity();
  const start = claudeHookToEvent("session_start", { cwd: "/repo", session_id: "session-1" }, repository);
  const prompt = claudeHookToEvent("prompt", { cwd: "/repo", session_id: "session-1", prompt: "hi" }, repository);
  assert.ok(start && prompt);
  assert.equal(start.task_id, prompt.task_id);
  assert.equal(start.task_id, claudeTaskIdentity(repository, "session-1").task_id);
  const handshake = claudeHandshake(repository, "session-1");
  assert.equal(handshake.task.task_id, start.task_id);
  assert.equal(handshake.adapter_id, CLAUDE_ADAPTER_ID);
  assert.equal(handshake.protocol_version, 1);
});

test("repository identity is stable for a worktree and requires no kernel import", () => {
  const first = claudeRepositoryIdentity("/repo", { remote: "git@github.com:acme/app.git", branch: "main", commit: "abc" });
  const second = claudeRepositoryIdentity("/repo", { remote: "git@github.com:acme/app.git", branch: "other", commit: "def" });
  assert.equal(first.repo_id, second.repo_id, "branch and commit do not change repo identity");
  assert.match(first.repo_id, /^repo_[a-f0-9]{32}$/);
  const noRemote = claudeRepositoryIdentity("/repo", {});
  assert.equal(noRemote.remote, null);
  assert.match(noRemote.repo_id, /^repo_[a-f0-9]{32}$/);
});

test("the context block is delimited and carries only capsule sections", () => {
  const block = renderContextBlock(fixtureCapsule());
  assert.ok(block.startsWith(KAGE_CONTEXT_BEGIN));
  assert.ok(block.trimEnd().endsWith(KAGE_CONTEXT_END));
  assert.ok(block.includes("Refunds are idempotent"));
  assert.ok(block.includes("Every refund path checks the ledger first."));
  assert.equal(renderContextBlock({ ...fixtureCapsule(), sections: [] }), "", "an empty capsule prints nothing");
});

// --- Adapter client: fail open everywhere ----------------------------------------------

test("adapter client fails open when kaged is unavailable", async () => {
  const result = await sendAdapterEvent({
    url: "http://127.0.0.1:1",
    token: "none",
    event: fixtureEvidenceEvent(),
    timeout_ms: 50,
  });
  assert.equal(result.status, "failed_open");
  assert.equal(result.reason, "unreachable");
});

test("adapter client delivers an event to a live runtime", async () => {
  const stub = await startStubRuntime((_req, res) => {
    res.writeHead(202, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "inserted" }));
  });
  try {
    const result = await sendAdapterEvent({ url: stub.url, token: TOKEN, event: fixtureEvidenceEvent() });
    assert.equal(result.status, "accepted");
    assert.equal(stub.requests.length, 1);
    assert.equal(stub.requests[0].path, "/v2/events");
    assert.equal(stub.requests[0].authorization, `Bearer ${TOKEN}`);
  } finally {
    await stub.close();
  }
});

test("an authentication failure fails open and never echoes the prompt", async () => {
  const stub = await startStubRuntime((_req, res) => {
    res.writeHead(401, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "unauthorized" }));
  });
  try {
    const result = await sendAdapterEvent({ url: stub.url, token: "klt_wrong", event: fixtureEvidenceEvent() });
    assert.equal(result.status, "failed_open");
    assert.equal(result.reason, "unauthorized");
    assert.ok(!result.reason.includes("refund"), "the prompt text never reaches an adapter reason");
  } finally {
    await stub.close();
  }
});

test("a slow event post fails open at the event timeout", async () => {
  const stub = await startStubRuntime(() => {
    // never responds
  });
  try {
    const started = Date.now();
    const result = await sendAdapterEvent({ url: stub.url, token: TOKEN, event: fixtureEvidenceEvent(), timeout_ms: 60 });
    assert.equal(result.status, "failed_open");
    assert.equal(result.reason, "timeout");
    assert.ok(Date.now() - started < 2_000, "the client aborts instead of hanging the hook");
  } finally {
    await stub.close();
  }
});

test("a cold context build times out, fails open, and does NOT cost the evidence event", async () => {
  // The central Task 5 behavior: /v2/context can take tens of seconds on a cold code graph.
  // The adapter must abort the context request and still deliver its evidence.
  const stub = await startStubRuntime((req, res) => {
    if (req.url === "/v2/context") return; // hangs forever, like a cold code-graph build
    res.writeHead(202, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "inserted" }));
  });
  try {
    const context = await requestAdapterContext({
      url: stub.url,
      token: TOKEN,
      request: fixtureContextRequest(),
      timeout_ms: 80,
    });
    assert.equal(context.status, "failed_open");
    assert.equal(context.reason, "timeout");
    assert.equal(context.capsule, undefined);

    const event = await sendAdapterEvent({ url: stub.url, token: TOKEN, event: fixtureEvidenceEvent() });
    assert.equal(event.status, "accepted", "the evidence event survives a context timeout");
    assert.ok(stub.requests.some((entry) => entry.path === "/v2/events"));
  } finally {
    await stub.close();
  }
});

test("a malformed or off-protocol capsule reply fails open instead of injecting garbage", async () => {
  const stub = await startStubRuntime((req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(req.url === "/v2/context" ? "{not json" : JSON.stringify({ status: "inserted" }));
  });
  try {
    const malformed = await requestAdapterContext({ url: stub.url, token: TOKEN, request: fixtureContextRequest() });
    assert.equal(malformed.status, "failed_open");
    assert.equal(malformed.reason, "malformed_response");
    assert.equal(malformed.capsule, undefined);
  } finally {
    await stub.close();
  }

  const wrongShape = await startStubRuntime((_req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ protocol_version: 99, sections: "not-an-array" }));
  });
  try {
    const result = await requestAdapterContext({ url: wrongShape.url, token: TOKEN, request: fixtureContextRequest() });
    assert.equal(result.status, "failed_open");
    assert.equal(result.reason, "malformed_response");
  } finally {
    await wrongShape.close();
  }
});

test("a live capsule is delivered and a source failure (503) fails open", async () => {
  const capsule = fixtureCapsule();
  let fail = false;
  const stub = await startStubRuntime((_req, res) => {
    if (fail) {
      res.writeHead(503, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "context_source_unavailable" }));
      return;
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(capsule));
  });
  try {
    const delivered = await requestAdapterContext({ url: stub.url, token: TOKEN, request: fixtureContextRequest() });
    assert.equal(delivered.status, "delivered");
    assert.equal(delivered.capsule?.capsule_id, "capsule_1");
    fail = true;
    const unavailable = await requestAdapterContext({ url: stub.url, token: TOKEN, request: fixtureContextRequest() });
    assert.equal(unavailable.status, "failed_open");
    assert.equal(unavailable.reason, "runtime_error");
  } finally {
    await stub.close();
  }
});

test("handshake failures fail open too — a session never breaks on Kage", async () => {
  const unreachable = await sendAdapterHandshake({
    url: "http://127.0.0.1:1",
    token: TOKEN,
    handshake: claudeHandshake(fixtureRepositoryIdentity(), "session-1"),
    timeout_ms: 50,
  });
  assert.equal(unreachable.status, "failed_open");
});

test("adapter timeouts are the budgeted 150 ms and 500 ms", () => {
  assert.equal(ADAPTER_EVENT_TIMEOUT_MS, 150);
  assert.equal(ADAPTER_CONTEXT_TIMEOUT_MS, 500);
});

// --- Runtime connection discovery ------------------------------------------------------

test("the adapter reads url, token, and mode from the runtime status file", () => {
  const project = stubProject(runtimeStatus(45_678, "assist"));
  try {
    const connection = readAdapterConnection(project);
    assert.ok(connection);
    assert.equal(connection.url, "http://127.0.0.1:45678");
    assert.equal(connection.token, TOKEN);
    assert.equal(connection.mode, "assist");
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test("a missing, malformed, off-mode, or tokenless runtime yields no connection — never a throw", () => {
  const cases: Array<[string, string]> = [
    ["no runtime directory at all", mkdtempSync(join(tmpdir(), "kage-adapter-"))],
    ["no status file", stubProject(null)],
    ["status is not a runtime status", stubProject({ port: "not-a-port", mode: "audit" })],
    ["mode is not audit or assist", stubProject(runtimeStatus(45_678) as Record<string, unknown> & { mode: string })],
    ["token file missing", stubProject(runtimeStatus(45_678), null)],
  ];
  // Off-mode case: rewrite mode to something the runtime never publishes.
  const offMode = cases[3][1];
  writeFileSync(
    join(offMode, ".agent_memory", "daemon", "vnext", "status.json"),
    JSON.stringify({ ...runtimeStatus(45_678), mode: "protect" }),
    "utf8",
  );
  try {
    for (const [label, project] of cases) {
      assert.equal(readAdapterConnection(project), null, label);
    }
  } finally {
    for (const [, project] of cases) rmSync(project, { recursive: true, force: true });
  }
});

// --- Shell adapter: the process the Claude hook actually runs ---------------------------

test("the shell adapter posts prompt evidence and prints only the delimited context block", async () => {
  const capsule = fixtureCapsule();
  const stub = await startStubRuntime((req, res) => {
    if (req.url === "/v2/context") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(capsule));
      return;
    }
    res.writeHead(202, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "inserted" }));
  });
  const port = Number(new URL(stub.url).port);
  const project = stubProject(runtimeStatus(port, "assist"));
  try {
    const run = await runAdapter(project, {
      hook_event_name: "UserPromptSubmit",
      cwd: project,
      session_id: "session-1",
      prompt: "fix the refund flow",
    });
    assert.equal(run.status, 0);
    const printed = JSON.parse(run.stdout) as { additionalContext?: string };
    assert.ok(printed.additionalContext?.includes(KAGE_CONTEXT_BEGIN));
    assert.ok(printed.additionalContext?.includes("Refunds are idempotent"));

    const events = stub.requests.filter((entry) => entry.path === "/v2/events");
    assert.equal(events.length, 1, "one prompt event was posted");
    const event = events[0].body as EvidenceEvent;
    assert.equal(event.event_type, "prompt");
    assert.equal(event.privacy_class, "local_raw");
    assert.equal(event.protocol_version, 1);
    assert.match(event.source_fingerprint, /^[a-f0-9]{64}$/);
    assert.equal(events[0].authorization, `Bearer ${TOKEN}`);
    assert.ok(stub.requests.some((entry) => entry.path === "/v2/context"), "context was requested");
  } finally {
    rmSync(project, { recursive: true, force: true });
    await stub.close();
  }
});

test("the shell adapter exits 0 and prints nothing when the daemon is dead", async () => {
  // Port 1 is never listening: connection refused, the most common outage.
  const project = stubProject(runtimeStatus(1));
  try {
    const run = await runAdapter(project, {
      hook_event_name: "UserPromptSubmit",
      cwd: project,
      session_id: "session-1",
      prompt: "fix the refund flow",
    });
    assert.equal(run.status, 0, "a dead daemon must never fail the hook");
    assert.equal(run.stdout.trim(), "", "no partial or error output reaches the transcript");
    assert.ok(!run.stderr.includes("fix the refund flow"), "the prompt is never echoed to stderr");
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test("the shell adapter exits 0 when the runtime is not running or not vnext", async () => {
  const noRuntime = mkdtempSync(join(tmpdir(), "kage-adapter-"));
  const garbage = stubProject(null);
  writeFileSync(join(garbage, ".agent_memory", "daemon", "vnext", "status.json"), "{not json", "utf8");
  try {
    for (const project of [noRuntime, garbage]) {
      const run = await runAdapter(project, {
        hook_event_name: "UserPromptSubmit",
        cwd: project,
        session_id: "session-1",
        prompt: "fix the refund flow",
      });
      assert.equal(run.status, 0);
      assert.equal(run.stdout.trim(), "");
    }
  } finally {
    rmSync(noRuntime, { recursive: true, force: true });
    rmSync(garbage, { recursive: true, force: true });
  }
});

test("the shell adapter hangs on nothing: a stalled daemon still exits 0 fast", async () => {
  const stub = await startStubRuntime(() => {
    // never responds — a cold code-graph build
  });
  const port = Number(new URL(stub.url).port);
  const project = stubProject(runtimeStatus(port, "assist"));
  try {
    const started = Date.now();
    const run = await runAdapter(project, {
      hook_event_name: "UserPromptSubmit",
      cwd: project,
      session_id: "session-1",
      prompt: "fix the refund flow",
    });
    const elapsed = Date.now() - started;
    assert.equal(run.status, 0, "a stalled daemon must never fail the hook");
    assert.equal(run.stdout.trim(), "", "no context block when the capsule never arrived");
    assert.ok(elapsed < 5_000, `the adapter must abort quickly, took ${elapsed}ms`);
  } finally {
    rmSync(project, { recursive: true, force: true });
    await stub.close();
  }
});

// --- The shipped path: the mapping the committed shell script actually performs -----------
//
// claude.ts is the reference mapping; kage-vnext-adapter.sh is the mapping that SHIPS. Asserting
// the reference alone would let the shell regress silently, so every headline behavior below is
// asserted against the real committed script, and the two mappings are pinned to each other.

async function postedEvents(stub: StubRuntime): Promise<EvidenceEvent[]> {
  return stub.requests.filter((entry) => entry.path === "/v2/events").map((entry) => entry.body as EvidenceEvent);
}

function acceptEverything(capsule?: ContextCapsule): StubHandler {
  return (req, res) => {
    if (req.url === "/v2/context" && capsule) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(capsule));
      return;
    }
    res.writeHead(202, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "inserted" }));
  };
}

test("the shell adapter and the TypeScript mapping agree on identity, fingerprint, and git facts", async () => {
  const stub = await startStubRuntime(acceptEverything());
  const project = stubProject(runtimeStatus(Number(new URL(stub.url).port), "assist"));
  execFileSync("git", ["init", "-q"], { cwd: project });
  execFileSync("git", ["config", "user.email", "t@example.com"], { cwd: project });
  execFileSync("git", ["config", "user.name", "t"], { cwd: project });
  execFileSync("git", ["commit", "-q", "--allow-empty", "-m", "root"], { cwd: project });
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: project, encoding: "utf8" }).trim();
  try {
    const run = await runAdapter(project, {
      hook_event_name: "SessionStart",
      cwd: project,
      // Trailing whitespace on the session id must not fork the task: claude.ts trims it, and the
      // shell has to trim it too or the same session gets two task_ids.
      session_id: "  session-1  ",
    });
    assert.equal(run.status, 0);

    const handshakes = stub.requests.filter((entry) => entry.path === "/v2/handshakes");
    assert.equal(handshakes.length, 1);
    const handshake = handshakes[0].body as { repository: { commit: string | null; branch: string | null }; task: { session_id: string } };
    assert.equal(handshake.repository.commit, head, "the shell reports HEAD, like claudeRepositoryIdentity");
    assert.equal(handshake.task.session_id, "session-1", "the session id is trimmed on both paths");

    const events = await postedEvents(stub);
    assert.equal(events.length, 1);
    const event = events[0];
    const repository = claudeRepositoryIdentity(project, { remote: null, branch: handshake.repository.branch, commit: head });
    assert.equal(event.repository_id, repository.repo_id, "repo identity matches the TypeScript mapping");
    assert.equal(event.task_id, claudeTaskIdentity(repository, "session-1").task_id, "task identity matches");
    // The fingerprint describes the SIGNAL (no event_id), and it is byte-identical to the one
    // claude.ts computes for the same event — the store dedupes across both adapters.
    assert.equal(
      event.source_fingerprint,
      claudeSourceFingerprint(event.repository_id, event.task_id, event.event_type, event.occurred_at, event.payload),
    );
    assert.notEqual(event.source_fingerprint, event.event_id);
  } finally {
    rmSync(project, { recursive: true, force: true });
    await stub.close();
  }
});

test("the shell adapter emits paths only — never file content", async () => {
  const stub = await startStubRuntime(acceptEverything());
  const project = stubProject(runtimeStatus(Number(new URL(stub.url).port), "assist"));
  try {
    const run = await runAdapter(project, {
      hook_event_name: "PreToolUse",
      cwd: project,
      session_id: "session-1",
      tool_name: "Edit",
      tool_input: { file_path: `${project}/src/refund.ts`, old_string: "SECRET-OLD", new_string: "SECRET-NEW" },
    });
    assert.equal(run.status, 0);
    const events = await postedEvents(stub);
    assert.equal(events.length, 1);
    assert.equal(events[0].event_type, "file_edit");
    assert.equal(events[0].privacy_class, "team_metadata");
    assert.equal(events[0].payload.path, `${project}/src/refund.ts`);
    const wire = JSON.stringify(stub.requests);
    assert.ok(!wire.includes("SECRET-OLD"), "old file content never leaves the hook");
    assert.ok(!wire.includes("SECRET-NEW"), "new file content never leaves the hook");
  } finally {
    rmSync(project, { recursive: true, force: true });
    await stub.close();
  }
});

test("the shell adapter records a failed tool call as an error outcome", async () => {
  const stub = await startStubRuntime(acceptEverything());
  const project = stubProject(runtimeStatus(Number(new URL(stub.url).port), "assist"));
  try {
    await runAdapter(project, {
      hook_event_name: "PostToolUse",
      cwd: project,
      session_id: "session-1",
      tool_name: "Bash",
      tool_response: { stdout: "", stderr: "no such file", is_error: true },
    });
    const events = await postedEvents(stub);
    assert.equal(events.length, 1);
    assert.equal(events[0].event_type, "tool_result");
    assert.equal(events[0].payload.outcome, "error", "the shell mapping distinguishes failures too");
    assert.ok(!JSON.stringify(stub.requests).includes("no such file"), "tool output never leaves the hook");
  } finally {
    rmSync(project, { recursive: true, force: true });
    await stub.close();
  }
});

test("the shell adapter never emits a file event for a path outside the repo", async () => {
  // team_metadata is the SHAREABLE tier. A Read of ~/.ssh/config or another employer's checkout
  // must not put that path — a username, a client name — into it. Memory is repo-scoped.
  const stub = await startStubRuntime(acceptEverything());
  const project = stubProject(runtimeStatus(Number(new URL(stub.url).port), "assist"));
  try {
    for (const outside of ["/etc/passwd", `${process.env.HOME ?? "/root"}/.ssh/config`, "../other-employer/src/app.ts"]) {
      const run = await runAdapter(project, {
        hook_event_name: "PreToolUse",
        cwd: project,
        session_id: "session-1",
        tool_name: "Read",
        tool_input: { file_path: outside },
      });
      assert.equal(run.status, 0);
    }
    assert.equal((await postedEvents(stub)).length, 0, "no out-of-repo path is ever emitted");

    // The in-repo control: the same hook, a path under the root, does emit.
    await runAdapter(project, {
      hook_event_name: "PreToolUse",
      cwd: project,
      session_id: "session-1",
      tool_name: "Read",
      tool_input: { file_path: `${project}/src/app.ts` },
    });
    const events = await postedEvents(stub);
    assert.equal(events.length, 1);
    assert.equal(events[0].event_type, "file_open");
  } finally {
    rmSync(project, { recursive: true, force: true });
    await stub.close();
  }
});

test("audit mode observes and never injects; assist mode injects", async () => {
  // Phase A's whole purpose is a clean baseline: if the hook injects context in audit, the
  // "original" bytes it measures already contain Kage's context and the savings number is wrong.
  const capsule = fixtureCapsule();
  for (const [mode, injects] of [["audit", false], ["assist", true]] as const) {
    const stub = await startStubRuntime(acceptEverything(capsule));
    const project = stubProject(runtimeStatus(Number(new URL(stub.url).port), mode));
    try {
      const run = await runAdapter(project, {
        hook_event_name: "UserPromptSubmit",
        cwd: project,
        session_id: "session-1",
        prompt: "fix the refund flow",
      });
      assert.equal(run.status, 0);
      assert.equal((await postedEvents(stub)).length, 1, `${mode} still records the evidence`);
      const asked = stub.requests.some((entry) => entry.path === "/v2/context");
      assert.equal(asked, injects, `${mode}: context is requested only in assist`);
      assert.equal(run.stdout.trim() !== "", injects, `${mode}: context is injected only in assist`);
    } finally {
      rmSync(project, { recursive: true, force: true });
      await stub.close();
    }
  }
});

test("a stalled daemon costs the context block but NOT the evidence event", async () => {
  // The central Task 5 requirement, on the shipped path: /v2/context hangs (a cold code-graph
  // build), the hook aborts it, exits 0, prints nothing — and the evidence still landed.
  const stub = await startStubRuntime((req, res) => {
    if (req.url === "/v2/context") return; // never responds
    res.writeHead(202, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "inserted" }));
  });
  const project = stubProject(runtimeStatus(Number(new URL(stub.url).port), "assist"));
  try {
    const started = Date.now();
    const run = await runAdapter(project, {
      hook_event_name: "UserPromptSubmit",
      cwd: project,
      session_id: "session-1",
      prompt: "fix the refund flow",
    });
    const elapsed = Date.now() - started;
    assert.equal(run.status, 0, "a stalled daemon must never fail the hook");
    assert.equal(run.stdout.trim(), "", "no context block when the capsule never arrived");
    assert.ok(elapsed < 5_000, `the adapter must abort quickly, took ${elapsed}ms`);
    const events = await postedEvents(stub);
    assert.equal(events.length, 1, "the evidence event still landed while context timed out");
    assert.equal(events[0].event_type, "prompt");
  } finally {
    rmSync(project, { recursive: true, force: true });
    await stub.close();
  }
});

test("the shell adapter spends the budgeted 150 ms on events and 500 ms on context", () => {
  const script = readFileSync(ADAPTER_SCRIPT, "utf8");
  const curls = script.match(/curl[^\n]*/g) ?? [];
  assert.ok(curls.length > 0, "the adapter talks to the daemon with curl");
  for (const call of curls) {
    assert.match(call, /--max-time (0\.15|0\.5)\b/, `every curl is time-capped at a budget: ${call}`);
  }
  assert.ok(curls.some((call) => call.includes("--max-time 0.15")), `events use the ${ADAPTER_EVENT_TIMEOUT_MS}ms budget`);
  assert.ok(curls.some((call) => call.includes("--max-time 0.5")), `context uses the ${ADAPTER_CONTEXT_TIMEOUT_MS}ms budget`);
  assert.ok(script.includes("exit 0"), "the adapter exits 0");
  // A hook that is killed mid-run must not leave the prompt sitting in a temp file.
  assert.match(script, /trap '[^']*' EXIT INT TERM HUP/, "the temp dir is removed on signals, not only on EXIT");
});

test("the shell adapter does no work at all for an event it cannot map", async () => {
  // PreToolUse fires on EVERY tool call (Bash, Grep, TodoWrite). Spawning python3 and git for
  // each one, only to discover there is nothing to post, is a tax on every tool call.
  const stub = await startStubRuntime(acceptEverything());
  const project = stubProject(runtimeStatus(Number(new URL(stub.url).port), "assist"));
  // A git that reports being run. The adapter must route the event BEFORE it shells out.
  const bin = mkdtempSync(join(tmpdir(), "kage-bin-"));
  const gitMarker = join(bin, "git-was-called");
  writeFileSync(join(bin, "git"), `#!/usr/bin/env bash\necho "$@" >> "${gitMarker}"\n`, { mode: 0o755 });
  try {
    for (const payload of [
      { hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "ls" } },
      { hook_event_name: "PreToolUse", tool_name: "TodoWrite", tool_input: {} },
      { hook_event_name: "PreCompact" },
      { hook_event_name: "Stop" },
      { hook_event_name: "Notification" },
    ]) {
      const run = await runAdapter(
        project,
        { ...payload, cwd: project, session_id: "session-1" },
        { PATH: `${bin}:${process.env.PATH ?? ""}` },
      );
      assert.equal(run.status, 0);
      assert.equal(run.stdout.trim(), "");
    }
    assert.equal(stub.requests.length, 0, "an unmapped event reaches the network never");
    assert.equal(existsSync(gitMarker), false, "an unmapped event does not even pay for a git call");
  } finally {
    rmSync(bin, { recursive: true, force: true });
    rmSync(project, { recursive: true, force: true });
    await stub.close();
  }
});

// --- Liveness and trust: a stale status file is NOT a runtime ---------------------------

test("a status file left behind by a killed daemon is not a live runtime", () => {
  // status.json is removed only on a graceful close. SIGKILL, an OOM kill, or a reboot leaves it
  // behind, and the recorded port may since have been taken by any other local process.
  const dead = stubProject(runtimeStatus(45_678, "assist", DEAD_PID));
  const live = stubProject(runtimeStatus(45_678, "assist"));
  try {
    assert.equal(readAdapterConnection(dead), null, "a dead pid means no runtime");
    assert.ok(readAdapterConnection(live), "a live pid still connects");
  } finally {
    rmSync(dead, { recursive: true, force: true });
    rmSync(live, { recursive: true, force: true });
  }
});

test("the shell adapter posts NOTHING to the port of a dead runtime", async () => {
  // The dangerous case: the daemon died, something else now listens on that port, and the hook
  // would hand it the raw prompt plus the bearer token.
  const impostor = await startStubRuntime(acceptEverything(fixtureCapsule()));
  const project = stubProject(runtimeStatus(Number(new URL(impostor.url).port), "assist", DEAD_PID));
  try {
    const run = await runAdapter(project, {
      hook_event_name: "UserPromptSubmit",
      cwd: project,
      session_id: "session-1",
      prompt: "fix the refund flow",
    });
    assert.equal(run.status, 0);
    assert.equal(run.stdout.trim(), "", "nothing from an unverified listener is ever injected");
    assert.equal(impostor.requests.length, 0, "the prompt and the token never reach the port");
  } finally {
    rmSync(project, { recursive: true, force: true });
    await impostor.close();
  }
});

test("a world-readable or foreign status file is not trusted", () => {
  // A cloned hostile repo can ship .agent_memory/daemon/vnext/status.json + token. The runtime's
  // own files are 0600 in a 0700 directory; anything looser is not the runtime's.
  const loose = stubProject(runtimeStatus(45_678, "assist"));
  chmodSync(join(loose, ".agent_memory", "daemon", "vnext", "status.json"), 0o644);
  const looseToken = stubProject(runtimeStatus(45_678, "assist"));
  chmodSync(join(looseToken, ".agent_memory", "daemon", "vnext", "token"), 0o666);
  const looseDir = stubProject(runtimeStatus(45_678, "assist"));
  chmodSync(join(looseDir, ".agent_memory", "daemon", "vnext"), 0o755);
  try {
    assert.equal(readAdapterConnection(loose), null, "a world-readable status file is not the runtime's");
    assert.equal(readAdapterConnection(looseToken), null, "a world-readable token is not the runtime's");
    assert.equal(readAdapterConnection(looseDir), null, "a world-readable runtime directory is not the runtime's");
  } finally {
    for (const project of [loose, looseToken, looseDir]) rmSync(project, { recursive: true, force: true });
  }
});

// --- Legacy handover: exactly one path runs per hook event ------------------------------

function runLegacyHook(
  script: string,
  project: string,
  marker: string,
  payload: Record<string, unknown> = { hook_event_name: "UserPromptSubmit" },
): Promise<{ status: number | null; stdout: string }> {
  const bin = mkdtempSync(join(tmpdir(), "kage-bin-"));
  // A stand-in for the Kage CLI: it records that the legacy path actually invoked it.
  writeFileSync(join(bin, "kage"), `#!/usr/bin/env bash\necho "$@" >> "${marker}"\n`, { mode: 0o755 });
  return new Promise((resolve, reject) => {
    const child = spawn("bash", [join(PLUGIN_HOOKS, script)], {
      cwd: project,
      env: { ...process.env, PATH: `${bin}:${process.env.PATH ?? ""}` },
    });
    let stdout = "";
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString("utf8"); });
    child.stderr.resume();
    child.once("error", reject);
    child.once("close", (status) => {
      rmSync(bin, { recursive: true, force: true });
      resolve({ status, stdout });
    });
    child.stdin.end(JSON.stringify({
      cwd: project,
      session_id: "session-1",
      prompt: "fix the refund flow",
      ...payload,
    }));
  });
}

test("legacy hooks stand down while the vNext runtime is live, and stay in charge when it is not", async () => {
  // Both paths running would double-post the evidence and inject two context blocks.
  const live = stubProject(runtimeStatus(1, "audit"));
  const legacy = stubProject(null);
  const liveMarker = join(live, "kage-was-called");
  const legacyMarker = join(legacy, "kage-was-called");
  try {
    const handedOver = await runLegacyHook("observe.sh", live, liveMarker);
    assert.equal(handedOver.status, 0);
    assert.equal(handedOver.stdout.trim(), "", "the legacy hook injects nothing while vNext owns the event");
    assert.equal(existsSync(liveMarker), false, "the legacy hook never spawned the Kage CLI");

    // No runtime: the legacy hook is untouched and still drives the Kage CLI. Existing installs
    // (the overwhelming majority) must keep working exactly as before.
    const unchanged = await runLegacyHook("observe.sh", legacy, legacyMarker);
    assert.equal(unchanged.status, 0);
    assert.equal(existsSync(legacyMarker), true, "the legacy hook still runs the Kage CLI without a runtime");
    assert.match(readFileSync(legacyMarker, "utf8"), /observe/);
  } finally {
    rmSync(live, { recursive: true, force: true });
    rmSync(legacy, { recursive: true, force: true });
  }
});

test("a dead daemon does not disable Kage: every legacy hook keeps running", async () => {
  // The silent-death scenario. The guard reads mode "audit" from a stale status file, all five
  // legacy scripts stand down, the adapter's post is refused — and ZERO paths run, forever.
  const stale = stubProject(runtimeStatus(1, "audit", DEAD_PID));
  const marker = join(stale, "kage-was-called");
  try {
    for (const script of ["observe.sh", "kage-read-context.sh", "kage-edit-context.sh"]) {
      rmSync(marker, { force: true });
      const run = await runLegacyHook(script, stale, marker, {
        hook_event_name: script === "observe.sh" ? "UserPromptSubmit" : "PreToolUse",
        tool_name: script === "kage-edit-context.sh" ? "Edit" : "Read",
        tool_input: { file_path: join(stale, "src", "app.ts") },
      });
      assert.equal(run.status, 0);
      assert.equal(existsSync(marker), true, `${script} must keep working when the runtime is only a stale file`);
    }
  } finally {
    rmSync(stale, { recursive: true, force: true });
  }
});

test("a legacy hook stands down ONLY for an event the adapter actually handles", async () => {
  // The adapter is registered for 6 of the 9 events. Standing down on the other three (Stop,
  // PreCompact, SubagentStop) silently kills refresh, pr summarize, the reconcile gate, and
  // distillation — with nothing at all taking over.
  const live = stubProject(runtimeStatus(1, "audit"));
  mkdirSync(join(live, ".agent_memory", "observations"), { recursive: true });
  const marker = join(live, "kage-was-called");
  try {
    for (const event of ["PreCompact", "SubagentStop"]) {
      rmSync(marker, { force: true });
      const run = await runLegacyHook("observe.sh", live, marker, { hook_event_name: event });
      assert.equal(run.status, 0);
      assert.equal(existsSync(marker), true, `observe.sh must still run for ${event}: no adapter handles it`);
      assert.match(readFileSync(marker, "utf8"), /distill/, `${event} must still distill`);
    }
    rmSync(marker, { force: true });
    const stop = await runLegacyHook("stop.sh", live, marker, { hook_event_name: "Stop" });
    assert.equal(stop.status, 0);
    assert.equal(existsSync(marker), true, "stop.sh must still run: no adapter handles Stop");

    // And the events the adapter DOES handle still hand over.
    rmSync(marker, { force: true });
    const handed = await runLegacyHook("observe.sh", live, marker, { hook_event_name: "PostToolUse", tool_name: "Bash" });
    assert.equal(handed.status, 0);
    assert.equal(existsSync(marker), false, "observe.sh hands PostToolUse to the adapter");
  } finally {
    rmSync(live, { recursive: true, force: true });
  }
});

test("every hooks.json event has exactly one effective handler while the runtime is live", async () => {
  // No event may end up with zero handlers (memory capture dies silently) or two (double-posted
  // evidence, two context blocks). This walks the wiring that actually ships.
  const wiring = JSON.parse(readFileSync(join(PLUGIN_HOOKS, "hooks.json"), "utf8")) as {
    hooks: Record<string, Array<{ matcher?: string; hooks: Array<{ command: string }> }>>;
  };
  const payloads: Record<string, Record<string, unknown>> = {
    SessionStart: {},
    UserPromptSubmit: { prompt: "fix the refund flow" },
    PreToolUse: { tool_name: "Read" },
    PostToolUse: { tool_name: "Bash", tool_response: { stdout: "ok" } },
    PostToolUseFailure: { tool_name: "Bash", tool_response: { error: "boom" } },
    PreCompact: {},
    Stop: {},
    SessionEnd: { reason: "clear" },
    SubagentStop: {},
  };

  for (const [event, entries] of Object.entries(wiring.hooks)) {
    const stub = await startStubRuntime(acceptEverything(fixtureCapsule()));
    const project = stubProject(runtimeStatus(Number(new URL(stub.url).port), "assist"));
    mkdirSync(join(project, ".agent_memory", "observations"), { recursive: true });
    const marker = join(project, "kage-was-called");
    const effective: string[] = [];
    try {
      for (const entry of entries) {
        for (const hook of entry.hooks) {
          const script = hook.command.replace(/^.*hooks\//, "").replace(/"$/, "");
          rmSync(marker, { force: true });
          const before = stub.requests.length;
          const payload = {
            hook_event_name: event,
            cwd: project,
            session_id: "session-1",
            tool_input: { file_path: join(project, "src", "app.ts") },
            ...payloads[event],
          };
          const run = script === "kage-vnext-adapter.sh"
            ? await runAdapter(project, payload)
            : await runLegacyHook(script, project, marker, payload);
          assert.equal(run.status, 0, `${event}/${script} must always exit 0`);
          const acted = existsSync(marker) || run.stdout.trim() !== "" || stub.requests.length > before;
          if (acted) effective.push(script);
        }
      }
      assert.deepEqual(
        effective.length,
        1,
        `${event}: expected exactly one effective handler while the runtime is live, got [${effective.join(", ")}]`,
      );
    } finally {
      rmSync(project, { recursive: true, force: true });
      await stub.close();
    }
  }
});

test("the vNext stand-down guard is behavioral, not a comment: no runtime means the legacy path runs", async () => {
  // A substring grep for the guard would pass even if its body were `if false`. This drives it.
  const projects: Array<[string, string, Record<string, unknown>]> = [
    ["observe.sh", "UserPromptSubmit", {}],
    ["kage-read-context.sh", "PreToolUse", { tool_name: "Read" }],
    ["kage-edit-context.sh", "PreToolUse", { tool_name: "Edit" }],
  ];
  for (const [script, event, extra] of projects) {
    const live = stubProject(runtimeStatus(1, "audit"));
    const dark = stubProject(null);
    try {
      for (const [project, expected] of [[live, false], [dark, true]] as const) {
        const marker = join(project, "kage-was-called");
        const run = await runLegacyHook(script, project, marker, {
          hook_event_name: event,
          // A fresh path per project keeps the read/edit hooks' /tmp dedupe from hiding a run.
          tool_input: { file_path: join(project, "src", `${script}-${Date.now()}.ts`) },
          ...extra,
        });
        assert.equal(run.status, 0);
        assert.equal(existsSync(marker), expected, `${script} with runtime=${project === live ? "live" : "absent"}`);
      }
    } finally {
      rmSync(live, { recursive: true, force: true });
      rmSync(dark, { recursive: true, force: true });
    }
  }
});
