import assert from "node:assert/strict";
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import type { IncomingHttpHeaders } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { AdapterHandshake, EvidenceEvent, TransformationReceipt } from "../protocol/index.js";
import { resolveRuntimePaths } from "./paths.js";
import { startLocalRuntime, type LocalRuntimeHandle } from "./server.js";

const JSON_LIMIT = 2 * 1024 * 1024;

function fixtureHandshake(): AdapterHandshake {
  return {
    protocol_version: 1,
    adapter_id: "adapter-1",
    agent_surface: "codex",
    agent_version: "1.0.0",
    repository: {
      repo_id: "repo-1",
      root: "/repo",
      remote: null,
      branch: "main",
      commit: "abc123",
      worktree: "/repo",
    },
    task: {
      task_id: "task-1",
      session_id: "session-1",
      user_id: null,
      agent_surface: "codex",
    },
    capabilities: ["session_start", "prompt"],
  };
}

function fixtureEvidenceEvent(): EvidenceEvent {
  return {
    protocol_version: 1,
    event_id: "event-1",
    event_type: "prompt",
    occurred_at: "2026-07-13T00:00:00.000Z",
    repository_id: "repo-1",
    task_id: "task-1",
    privacy_class: "local_raw",
    source_fingerprint: "sha256:source-1",
    payload: { text: "prompt text" },
  };
}

function fixtureReceipt(): TransformationReceipt {
  return {
    receipt_id: "receipt-1",
    task_id: "task-1",
    request_id: "request-1",
    provider: "anthropic",
    model: "claude-sonnet",
    mode: "audit",
    measurement_quality: "exact",
    before_input_bytes: 2_000,
    after_input_bytes: 2_000,
    before_input_tokens: 500,
    after_input_tokens: 500,
    output_tokens: 100,
    kage_processing_cost_usd: 0,
    provider_input_cost_before_usd: 0.0015,
    provider_input_cost_after_usd: 0.0015,
    latency_ms: 2.5,
    transformations: [],
    created_at: "2026-07-13T00:00:01.000Z",
  };
}

function authHeaders(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

async function postJson(runtime: LocalRuntimeHandle, path: string, value: unknown): Promise<Response> {
  return fetch(`${runtime.url}${path}`, {
    method: "POST",
    headers: { ...authHeaders(runtime.token), "content-type": "application/json" },
    body: JSON.stringify(value),
  });
}

async function withRuntime(
  action: (runtime: LocalRuntimeHandle, projectDir: string) => Promise<void>,
): Promise<void> {
  const projectDir = mkdtempSync(join(tmpdir(), "kage-vnext-runtime-"));
  let runtime: LocalRuntimeHandle | undefined;
  try {
    runtime = await startLocalRuntime({ projectDir, port: 0, mode: "audit" });
    await action(runtime, projectDir);
  } finally {
    await runtime?.close();
    rmSync(projectDir, { recursive: true, force: true });
  }
}

interface RawResponse {
  status: number;
  headers: IncomingHttpHeaders;
  body: string;
}

function rawRequest(
  url: string,
  options: { method: string; headers?: Record<string, string>; chunks?: readonly (string | Buffer)[] },
): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const req = request(url, { method: options.method, headers: options.headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => resolve({
        status: res.statusCode ?? 0,
        headers: res.headers,
        body: Buffer.concat(chunks).toString("utf8"),
      }));
    });
    req.on("error", reject);
    for (const chunk of options.chunks ?? []) req.write(chunk);
    req.end();
  });
}

function fileMode(path: string): number {
  return statSync(path).mode & 0o777;
}

test("local runtime exposes public health without leaking its token", async () => {
  await withRuntime(async (runtime) => {
    const response = await fetch(`${runtime.url}/v2/health`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.deepEqual(JSON.parse(body), { ok: true, protocol_version: 1 });
    assert.equal(body.includes(runtime.token), false);
  });
});

test("local runtime protects status and never includes its machine token", async () => {
  await withRuntime(async (runtime) => {
    const unauthorized = await fetch(`${runtime.url}/v2/status`);
    assert.equal(unauthorized.status, 401);

    const response = await fetch(`${runtime.url}/v2/status`, { headers: authHeaders(runtime.token) });
    const body = await response.text();
    assert.equal(response.status, 200);
    assert.deepEqual(JSON.parse(body), runtime.status);
    assert.equal(body.includes(runtime.token), false);
  });
});

test("local runtime accepts a valid handshake and persists its task idempotently", async () => {
  await withRuntime(async (runtime) => {
    const first = await postJson(runtime, "/v2/handshakes", fixtureHandshake());
    const second = await postJson(runtime, "/v2/handshakes", fixtureHandshake());

    assert.equal(first.status, 202);
    assert.equal(second.status, 202);
    const rows = runtime.database
      .prepare("SELECT task_id, session_id, repository_id, agent_surface, user_id, started_at FROM tasks")
      .all() as unknown as Array<Record<string, unknown>>;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].task_id, "task-1");
    assert.equal(rows[0].session_id, "session-1");
    assert.equal(rows[0].repository_id, "repo-1");
    assert.equal(rows[0].agent_surface, "codex");
    assert.equal(rows[0].user_id, null);
    assert.equal(typeof rows[0].started_at, "string");
  });
});

test("local runtime rejects an invalid handshake protocol record", async () => {
  await withRuntime(async (runtime) => {
    const response = await postJson(runtime, "/v2/handshakes", { ...fixtureHandshake(), protocol_version: 2 });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { ok: false, error: "invalid_protocol" });
  });
});

test("local runtime rejects event writes without its machine token", async () => {
  await withRuntime(async ({ url }) => {
    const response = await fetch(`${url}/v2/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(fixtureEvidenceEvent()),
    });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { ok: false, error: "unauthorized" });
  });
});

test("local runtime rejects malformed and inexact bearer credentials", async () => {
  await withRuntime(async (runtime) => {
    for (const authorization of [
      `Bearer  ${runtime.token}`,
      `bearer ${runtime.token}`,
      `Bearer ${runtime.token.slice(0, -1)}x`,
      runtime.token,
    ]) {
      const response = await fetch(`${runtime.url}/v2/status`, { headers: { authorization } });
      assert.equal(response.status, 401, authorization);
      assert.deepEqual(await response.json(), { ok: false, error: "unauthorized" });
    }
  });
});

test("local runtime stores a valid adapter event and reports deduplication", async () => {
  await withRuntime(async (runtime) => {
    const first = await postJson(runtime, "/v2/events", fixtureEvidenceEvent());
    const duplicate = await postJson(runtime, "/v2/events", {
      ...fixtureEvidenceEvent(),
      event_id: "event-duplicate",
    });

    assert.equal(first.status, 202);
    assert.deepEqual(await first.json(), { status: "inserted" });
    assert.equal(duplicate.status, 202);
    assert.deepEqual(await duplicate.json(), { status: "deduplicated" });
    assert.equal(runtime.store.forTask("task-1").length, 1);
  });
});

test("local runtime rejects malformed JSON and invalid event protocol", async () => {
  await withRuntime(async (runtime) => {
    const malformed = await fetch(`${runtime.url}/v2/events`, {
      method: "POST",
      headers: { ...authHeaders(runtime.token), "content-type": "application/json" },
      body: "{not-json",
    });
    assert.equal(malformed.status, 400);
    assert.deepEqual(await malformed.json(), { ok: false, error: "invalid_json" });

    const invalid = await postJson(runtime, "/v2/events", { ...fixtureEvidenceEvent(), task_id: "" });
    assert.equal(invalid.status, 400);
    assert.deepEqual(await invalid.json(), { ok: false, error: "invalid_protocol" });
  });
});

test("local runtime requires JSON content type for JSON POST routes", async () => {
  await withRuntime(async (runtime) => {
    const response = await fetch(`${runtime.url}/v2/events`, {
      method: "POST",
      headers: authHeaders(runtime.token),
      body: JSON.stringify(fixtureEvidenceEvent()),
    });
    assert.equal(response.status, 415);
    assert.deepEqual(await response.json(), { ok: false, error: "unsupported_media_type" });
  });
});

test("local runtime rejects a declared body larger than two MiB", async () => {
  await withRuntime(async (runtime) => {
    const response = await rawRequest(`${runtime.url}/v2/events`, {
      method: "POST",
      headers: {
        ...authHeaders(runtime.token),
        "content-type": "application/json",
        "content-length": String(JSON_LIMIT + 1),
      },
    });
    assert.equal(response.status, 413);
    assert.deepEqual(JSON.parse(response.body), { ok: false, error: "payload_too_large" });
  });
});

test("local runtime enforces the actual two MiB limit for chunked bodies", async () => {
  await withRuntime(async (runtime) => {
    const response = await rawRequest(`${runtime.url}/v2/events`, {
      method: "POST",
      headers: {
        ...authHeaders(runtime.token),
        "content-type": "application/json",
        "transfer-encoding": "chunked",
      },
      chunks: [Buffer.alloc(JSON_LIMIT, 0x20), Buffer.from("x")],
    });
    assert.equal(response.status, 413);
    assert.deepEqual(JSON.parse(response.body), { ok: false, error: "payload_too_large" });
  });
});

test("local runtime reports context source unavailability only for valid object requests", async () => {
  await withRuntime(async (runtime) => {
    const unavailable = await postJson(runtime, "/v2/context", { task_id: "task-1", query: "auth flow" });
    assert.equal(unavailable.status, 503);
    assert.deepEqual(await unavailable.json(), { ok: false, error: "context_source_unavailable" });

    const invalid = await postJson(runtime, "/v2/context", ["not", "an", "object"]);
    assert.equal(invalid.status, 400);
    assert.deepEqual(await invalid.json(), { ok: false, error: "invalid_protocol" });
  });
});

test("local runtime lists task receipts for exactly one safely decoded path segment", async () => {
  await withRuntime(async (runtime) => {
    runtime.receiptStore.write(fixtureReceipt());
    const response = await fetch(`${runtime.url}/v2/tasks/task-1/receipts`, {
      headers: authHeaders(runtime.token),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { receipts: [fixtureReceipt()] });

    for (const path of [
      "/v2/tasks/task-1%2Fother/receipts",
      "/v2/tasks/%ZZ/receipts",
      "/v2/tasks//receipts",
      "/v2/tasks/task-1/other/receipts",
    ]) {
      const invalid = await fetch(`${runtime.url}${path}`, { headers: authHeaders(runtime.token) });
      assert.equal(invalid.status, 404, path);
    }
  });
});

test("local runtime distinguishes unknown paths and wrong methods", async () => {
  await withRuntime(async (runtime) => {
    const unknown = await fetch(`${runtime.url}/v2/unknown`);
    assert.equal(unknown.status, 404);
    assert.deepEqual(await unknown.json(), { ok: false, error: "not_found" });

    const healthMethod = await fetch(`${runtime.url}/v2/health`, { method: "POST" });
    assert.equal(healthMethod.status, 405);
    assert.deepEqual(await healthMethod.json(), { ok: false, error: "method_not_allowed" });

    const eventMethod = await fetch(`${runtime.url}/v2/events`, {
      method: "PUT",
      headers: authHeaders(runtime.token),
    });
    assert.equal(eventMethod.status, 405);
    assert.deepEqual(await eventMethod.json(), { ok: false, error: "method_not_allowed" });
  });
});

test("local runtime binds only to IPv4 loopback", async () => {
  await withRuntime(async (runtime) => {
    const url = new URL(runtime.url);
    assert.equal(url.hostname, "127.0.0.1");
    assert.equal(runtime.status.host, "127.0.0.1");
    assert.equal(runtime.address.address, "127.0.0.1");
    assert.equal(runtime.address.family, "IPv4");
  });
});

test("local runtime rejects symlinked runtime ancestors without writing outside the project", { timeout: 5_000 }, async () => {
  const projectDir = mkdtempSync(join(tmpdir(), "kage-vnext-runtime-ancestor-symlink-"));
  const externalDirectory = mkdtempSync(join(tmpdir(), "kage-vnext-runtime-external-"));
  const memoryDirectory = join(projectDir, ".agent_memory");
  mkdirSync(memoryDirectory);
  symlinkSync(externalDirectory, join(memoryDirectory, "daemon"));
  let runtime: LocalRuntimeHandle | undefined;
  let rejection: unknown;

  try {
    try {
      runtime = await startLocalRuntime({ projectDir, port: 0 });
    } catch (error) {
      rejection = error;
    }
    await runtime?.close();
    assert.match(rejection instanceof Error ? rejection.message : "", /runtime.*symlink|symlink.*runtime/i);
    assert.deepEqual(lstatSync(join(memoryDirectory, "daemon")).isSymbolicLink(), true);
    assert.equal(existsSync(join(externalDirectory, "vnext")), false);
  } finally {
    await runtime?.close();
    rmSync(projectDir, { recursive: true, force: true });
    rmSync(externalDirectory, { recursive: true, force: true });
  }
});

test("local runtime creates private token, status, database, and runtime files", async () => {
  const projectDir = mkdtempSync(join(tmpdir(), "kage-vnext-runtime-permissions-"));
  const parent = join(projectDir, ".agent_memory", "daemon");
  mkdirSync(parent, { recursive: true, mode: 0o755 });
  chmodSync(parent, 0o755);
  let runtime: LocalRuntimeHandle | undefined;
  try {
    runtime = await startLocalRuntime({ projectDir, port: 0, mode: "assist" });
    const paths = resolveRuntimePaths(projectDir);

    assert.equal(fileMode(parent), 0o755, "pre-existing parent");
    assert.equal(fileMode(paths.runtimeDirectory), 0o700, "created runtime directory");
    assert.equal(fileMode(paths.tokenPath), 0o600, "token");
    assert.equal(fileMode(paths.statusPath), 0o600, "status");
    assert.equal(fileMode(paths.databasePath), 0o600, "database");
    assert.match(runtime.token, /^klt_[A-Za-z0-9_-]{43}$/);
    assert.equal(readFileSync(paths.tokenPath, "utf8"), runtime.token);
  } finally {
    await runtime?.close();
    rmSync(projectDir, { recursive: true, force: true });
  }
});

test("local runtime tightens and reuses a valid existing token", async () => {
  const projectDir = mkdtempSync(join(tmpdir(), "kage-vnext-runtime-existing-token-"));
  const paths = resolveRuntimePaths(projectDir);
  mkdirSync(paths.runtimeDirectory, { recursive: true });
  const token = `klt_${"A".repeat(43)}`;
  writeFileSync(paths.tokenPath, token, { mode: 0o644 });
  chmodSync(paths.tokenPath, 0o644);
  let runtime: LocalRuntimeHandle | undefined;
  try {
    runtime = await startLocalRuntime({ projectDir, port: 0 });
    assert.equal(runtime.token, token);
    assert.equal(fileMode(paths.tokenPath), 0o600);
  } finally {
    await runtime?.close();
    rmSync(projectDir, { recursive: true, force: true });
  }
});

test("local runtime rejects empty or malformed existing tokens", async () => {
  for (const token of ["", "not-a-token", `klt_${"A".repeat(42)}`, `klt_${"!".repeat(43)}`]) {
    const projectDir = mkdtempSync(join(tmpdir(), "kage-vnext-runtime-malformed-token-"));
    const paths = resolveRuntimePaths(projectDir);
    mkdirSync(paths.runtimeDirectory, { recursive: true });
    writeFileSync(paths.tokenPath, token, { mode: 0o600 });
    try {
      await assert.rejects(startLocalRuntime({ projectDir, port: 0 }), /token.*malformed|malformed.*token/i);
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  }
});

test("local runtime rejects token symlinks and directories without mutating them", async () => {
  for (const kind of ["symlink", "directory"] as const) {
    const projectDir = mkdtempSync(join(tmpdir(), "kage-vnext-runtime-untrusted-token-"));
    const paths = resolveRuntimePaths(projectDir);
    mkdirSync(paths.runtimeDirectory, { recursive: true });
    const target = join(projectDir, "token-target");
    if (kind === "symlink") {
      writeFileSync(target, `klt_${"A".repeat(43)}`, { mode: 0o644 });
      chmodSync(target, 0o644);
      symlinkSync(target, paths.tokenPath);
    } else {
      mkdirSync(paths.tokenPath, { mode: 0o755 });
      chmodSync(paths.tokenPath, 0o755);
    }

    try {
      await assert.rejects(startLocalRuntime({ projectDir, port: 0 }), /token.*regular file|regular file.*token/i);
      if (kind === "symlink") {
        assert.equal(lstatSync(paths.tokenPath).isSymbolicLink(), true);
        assert.equal(fileMode(target), 0o644);
      } else {
        assert.equal(lstatSync(paths.tokenPath).isDirectory(), true);
        assert.equal(fileMode(paths.tokenPath), 0o755);
      }
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  }
});

test("local runtime rejects an untrusted status symlink without touching its target", async () => {
  const projectDir = mkdtempSync(join(tmpdir(), "kage-vnext-runtime-status-symlink-"));
  const paths = resolveRuntimePaths(projectDir);
  mkdirSync(paths.runtimeDirectory, { recursive: true });
  const target = join(projectDir, "status-target");
  writeFileSync(target, "preserve", { mode: 0o644 });
  chmodSync(target, 0o644);
  symlinkSync(target, paths.statusPath);
  try {
    await assert.rejects(startLocalRuntime({ projectDir, port: 0 }), /status.*regular file|regular file.*status/i);
    assert.equal(lstatSync(paths.statusPath).isSymbolicLink(), true);
    assert.equal(readFileSync(target, "utf8"), "preserve");
    assert.equal(fileMode(target), 0o644);
  } finally {
    rmSync(projectDir, { recursive: true, force: true });
  }
});

test("local runtime close is idempotent and removes only its live status", async () => {
  const projectDir = mkdtempSync(join(tmpdir(), "kage-vnext-runtime-close-"));
  const paths = resolveRuntimePaths(projectDir);
  const runtime = await startLocalRuntime({ projectDir, port: 0 });
  assert.equal(existsSync(paths.statusPath), true);

  await runtime.close();
  await runtime.close();

  assert.equal(existsSync(paths.statusPath), false);
  await assert.rejects(fetch(`${runtime.url}/v2/health`));

  const replacement = JSON.stringify({ newer: true });
  const second = await startLocalRuntime({ projectDir, port: 0 });
  writeFileSync(paths.statusPath, replacement, { mode: 0o600 });
  await second.close();
  assert.equal(readFileSync(paths.statusPath, "utf8"), replacement);
  rmSync(projectDir, { recursive: true, force: true });
});

test("local runtime close does not wait indefinitely for a partial request body", { timeout: 5_000 }, async () => {
  const projectDir = mkdtempSync(join(tmpdir(), "kage-vnext-runtime-partial-close-"));
  const runtime = await startLocalRuntime({ projectDir, port: 0 });
  const partial = request(`${runtime.url}/v2/events`, {
    method: "POST",
    headers: {
      ...authHeaders(runtime.token),
      "content-type": "application/json",
      "content-length": "100",
    },
  });
  partial.on("error", () => {});

  try {
    await new Promise<void>((resolve, reject) => {
      partial.once("error", reject);
      partial.once("socket", (socket) => {
        if (socket.connecting) socket.once("connect", resolve);
        else resolve();
      });
      partial.flushHeaders();
    });
    partial.write("{");
    await new Promise((resolve) => setTimeout(resolve, 25));

    const closedPromptly = await Promise.race([
      runtime.close().then(() => true),
      new Promise<false>((resolve) => setTimeout(() => resolve(false), 200)),
    ]);
    assert.equal(closedPromptly, true);
  } finally {
    partial.destroy();
    await runtime.close();
    rmSync(projectDir, { recursive: true, force: true });
  }
});
