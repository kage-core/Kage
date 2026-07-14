import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

function stubProject(status: Record<string, unknown> | null, token: string | null = TOKEN): string {
  const project = mkdtempSync(join(tmpdir(), "kage-adapter-"));
  const runtimeDir = join(project, ".agent_memory", "daemon", "vnext");
  mkdirSync(runtimeDir, { recursive: true, mode: 0o700 });
  if (status) writeFileSync(join(runtimeDir, "status.json"), `${JSON.stringify(status, null, 2)}\n`, "utf8");
  if (token) writeFileSync(join(runtimeDir, "token"), `${token}\n`, { mode: 0o600 });
  return project;
}

function runtimeStatus(port: number, mode: "audit" | "assist" = "audit"): Record<string, unknown> {
  return {
    protocol_version: 1,
    pid: process.pid,
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
): Promise<{ status: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn("bash", [ADAPTER_SCRIPT], { cwd: project });
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

// --- Legacy handover: exactly one path runs per hook event ------------------------------

function runLegacyHook(script: string, project: string, marker: string): Promise<{ status: number | null; stdout: string }> {
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
      hook_event_name: "UserPromptSubmit",
      cwd: project,
      session_id: "session-1",
      prompt: "fix the refund flow",
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

test("every legacy hook script carries the vNext stand-down guard", () => {
  for (const script of ["session-start.sh", "observe.sh", "stop.sh", "kage-read-context.sh", "kage-edit-context.sh"]) {
    const text = readFileSync(join(PLUGIN_HOOKS, script), "utf8");
    assert.ok(
      text.includes(".agent_memory/daemon/vnext/status.json"),
      `${script} must hand over to the vNext adapter when the runtime is live`,
    );
  }
});

test("the shell adapter caps every network call with curl --max-time 0.5", () => {
  const script = execFileSync("cat", [ADAPTER_SCRIPT], { encoding: "utf8" });
  const curls = script.match(/curl[^\n]*/g) ?? [];
  assert.ok(curls.length > 0, "the adapter talks to the daemon with curl");
  for (const call of curls) {
    assert.ok(call.includes("--max-time 0.5"), `every curl is time-capped: ${call}`);
  }
  assert.ok(script.includes("exit 0"), "the adapter exits 0");
});
