import assert from "node:assert/strict";
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import type { IncomingHttpHeaders } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { ContextCandidate, ContextRequest, ContextSource } from "../context/source.js";
import { WorkerContextSource } from "../context/worker-source.js";
import type { AdapterHandshake, EvidenceEvent, TransformationReceipt } from "../protocol/index.js";
import { acquireRuntimeLock, releaseRuntimeLock } from "./lock.js";
import { assertRuntimeDirectoryLease, contentRoot, ensureRuntimeDirectory, resolveRuntimePaths } from "./paths.js";
import { startLocalRuntime, type LocalRuntimeHandle } from "./server.js";
import { auditConfig, writeVnextConfig } from "./config.js";
import { ContentStore } from "../gateway/content-store.js";

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

function fixtureContextRequest(overrides: Partial<ContextRequest> = {}): ContextRequest {
  const handshake = fixtureHandshake();
  return {
    repository: handshake.repository,
    task: handshake.task,
    query: "auth flow",
    targets: ["src/auth.ts"],
    changed_files: [],
    token_budget: 1_200,
    ...overrides,
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
  options: { contextSource?: ContextSource | null } = {},
): Promise<void> {
  const projectDir = mkdtempSync(join(tmpdir(), "kage-vnext-runtime-"));
  let runtime: LocalRuntimeHandle | undefined;
  try {
    runtime = await startLocalRuntime({ projectDir, port: 0, mode: "audit", ...options });
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
    const firstStartedAt = (runtime.database
      .prepare("SELECT started_at FROM tasks WHERE task_id = ?")
      .get("task-1") as { started_at: string }).started_at;
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
    assert.equal(rows[0].started_at, firstStartedAt);
  });
});

test("local runtime serves the task-scoped minimal-change route", async () => {
  await withRuntime(async (runtime) => {
    await postJson(runtime, "/v2/handshakes", fixtureHandshake());

    // Unauthorized requests are refused before any work.
    const unauthorized = await fetch(`${runtime.url}/v2/tasks/task-1/minimal-change`);
    assert.equal(unauthorized.status, 401);

    // Non-GET methods are rejected.
    const wrongMethod = await fetch(`${runtime.url}/v2/tasks/task-1/minimal-change`, {
      method: "POST",
      headers: authHeaders(runtime.token),
    });
    assert.equal(wrongMethod.status, 405);

    // A known task with the guard disabled by default returns an explicit disabled envelope.
    const known = await fetch(`${runtime.url}/v2/tasks/task-1/minimal-change`, { headers: authHeaders(runtime.token) });
    assert.equal(known.status, 200);
    const body = (await known.json()) as { task_id: string; enabled: boolean };
    assert.equal(body.task_id, "task-1");
    assert.equal(body.enabled, false);

    // An unknown task is a 404, distinct from "guard disabled".
    const unknown = await fetch(`${runtime.url}/v2/tasks/ghost/minimal-change`, { headers: authHeaders(runtime.token) });
    assert.equal(unknown.status, 404);
  });
});

test("local runtime rejects conflicting reuse of a persisted task identity", async () => {
  await withRuntime(async (runtime) => {
    const original = fixtureHandshake();
    assert.equal((await postJson(runtime, "/v2/handshakes", original)).status, 202);
    const persisted = runtime.database
      .prepare("SELECT task_id, session_id, repository_id, agent_surface, user_id, started_at FROM tasks WHERE task_id = ?")
      .get("task-1") as Record<string, unknown>;
    const conflicts: Array<[string, AdapterHandshake]> = [
      ["session_id", { ...original, task: { ...original.task, session_id: "session-2" } }],
      ["repository_id", { ...original, repository: { ...original.repository, repo_id: "repo-2" } }],
      ["agent_surface", { ...original, task: { ...original.task, agent_surface: "claude-code" } }],
      ["user_id", { ...original, task: { ...original.task, user_id: "user-2" } }],
    ];

    for (const [field, conflict] of conflicts) {
      const response = await postJson(runtime, "/v2/handshakes", conflict);
      assert.equal(response.status, 409, field);
      assert.deepEqual(await response.json(), { ok: false, error: "task_identity_conflict" }, field);
      const after = runtime.database
        .prepare("SELECT task_id, session_id, repository_id, agent_surface, user_id, started_at FROM tasks WHERE task_id = ?")
        .get("task-1") as Record<string, unknown>;
      assert.deepEqual(after, persisted, field);
    }
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

test("local runtime rejects invalid UTF-8 instead of persisting replacement characters", async () => {
  await withRuntime(async (runtime) => {
    const body = Buffer.from(JSON.stringify(fixtureEvidenceEvent()), "utf8");
    const textOffset = body.indexOf(Buffer.from("prompt text", "utf8"));
    assert.notEqual(textOffset, -1);
    body[textOffset] = 0xff;

    const response = await rawRequest(`${runtime.url}/v2/events`, {
      method: "POST",
      headers: {
        ...authHeaders(runtime.token),
        "content-type": "application/json",
        "content-length": String(body.length),
      },
      chunks: [body],
    });

    assert.equal(response.status, 400);
    assert.deepEqual(JSON.parse(response.body), { ok: false, error: "invalid_json" });
    assert.equal(runtime.store.forTask("task-1").length, 0);
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

test("local runtime composes an authenticated context capsule from a projected request", async () => {
  let received: ContextRequest | undefined;
  const candidate: ContextCandidate = {
    candidate_id: "invariant-1",
    kind: "invariant",
    title: "Authentication invariant",
    body: "Token comparisons are constant-time.",
    evidence_ids: ["src/auth.ts"],
    trust_state: "verified",
    priority: 100,
  };
  const source: ContextSource = {
    async find(request) {
      received = request;
      return [candidate];
    },
  };

  await withRuntime(async (runtime) => {
    const requestBody = fixtureContextRequest();
    const response = await postJson(runtime, "/v2/context", requestBody);
    const capsule = await response.json() as Record<string, unknown>;

    assert.equal(response.status, 200);
    assert.equal(capsule.protocol_version, 1);
    assert.equal(capsule.task_id, "task-1");
    assert.equal(capsule.repository_id, "repo-1");
    assert.deepEqual(capsule.sections, [{
      kind: "invariant",
      title: "Authentication invariant",
      body: "Token comparisons are constant-time.",
      evidence_ids: ["src/auth.ts"],
      priority: 100,
    }]);
    assert.deepEqual(received, requestBody);
    assert.notEqual(received, requestBody);
    assert.notEqual(received?.repository, requestBody.repository);
  }, { contextSource: source });
});

test("local runtime returns a successful empty capsule when trusted context is empty", async () => {
  const source: ContextSource = { async find() { return []; } };

  await withRuntime(async (runtime) => {
    const response = await postJson(runtime, "/v2/context", fixtureContextRequest());
    const capsule = await response.json() as Record<string, unknown>;

    assert.equal(response.status, 200);
    assert.deepEqual(capsule.sections, []);
    assert.equal(capsule.estimated_tokens, 0);
  }, { contextSource: source });
});

test("local runtime maps source failure and explicit unavailability to deterministic 503", async () => {
  const failingSource: ContextSource = {
    async find() {
      throw new Error("private source details");
    },
  };

  for (const contextSource of [failingSource, null]) {
    await withRuntime(async (runtime) => {
      const response = await postJson(runtime, "/v2/context", fixtureContextRequest());
      const body = await response.text();

      assert.equal(response.status, 503);
      assert.deepEqual(JSON.parse(body), { ok: false, error: "context_source_unavailable" });
      assert.equal(body.includes("private source details"), false);
    }, { contextSource });
  }
});

test("local runtime logs the swallowed context source failure instead of hiding a bug", async () => {
  const failingSource: ContextSource = {
    async find() {
      throw new TypeError("private source details");
    },
  };
  const logged: unknown[][] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => { logged.push(args); };

  try {
    await withRuntime(async (runtime) => {
      const response = await postJson(runtime, "/v2/context", fixtureContextRequest());
      assert.equal(response.status, 503);
      assert.equal((await response.text()).includes("private source details"), false);
    }, { contextSource: failingSource });
  } finally {
    console.error = originalError;
  }

  // The client learns nothing; the operator learns everything.
  const text = logged.map((args) => args.map(String).join(" ")).join("\n");
  assert.match(text, /context source failed/i);
  assert.match(text, /private source details/);
});

test("local runtime rejects oversized context inputs before doing kernel work", async () => {
  let calls = 0;
  const source: ContextSource = {
    async find() {
      calls += 1;
      return [];
    },
  };
  // Each stays well under the 2 MiB JSON body cap yet would drive unbounded synchronous
  // kernel work (or an unbounded response body) if it reached the source.
  const overCapRequests: unknown[] = [
    { ...fixtureContextRequest(), query: "q".repeat(64 * 1024) },
    { ...fixtureContextRequest(), targets: Array.from({ length: 50_000 }, (_, index) => `src/file-${index}.ts`) },
    { ...fixtureContextRequest(), changed_files: Array.from({ length: 50_000 }, (_, index) => `src/file-${index}.ts`) },
    { ...fixtureContextRequest(), targets: [`src/${"deep/".repeat(2_000)}file.ts`] },
  ];

  await withRuntime(async (runtime) => {
    for (const requestBody of overCapRequests) {
      const response = await postJson(runtime, "/v2/context", requestBody);
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), { ok: false, error: "invalid_protocol" });
    }
    assert.equal(calls, 0);
  }, { contextSource: source });
});

test("local runtime strictly validates context requests before consulting the source", async () => {
  let calls = 0;
  const source: ContextSource = {
    async find() {
      calls += 1;
      return [];
    },
  };
  const invalidRequests: unknown[] = [
    ["not", "an", "object"],
    { task_id: "task-1", query: "auth flow" },
    { ...fixtureContextRequest(), unexpected: true },
    { ...fixtureContextRequest(), targets: [""] },
    { ...fixtureContextRequest(), token_budget: Number.MAX_SAFE_INTEGER },
  ];

  await withRuntime(async (runtime) => {
    for (const requestBody of invalidRequests) {
      const response = await postJson(runtime, "/v2/context", requestBody);
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), { ok: false, error: "invalid_protocol" });
    }
    assert.equal(calls, 0);
  }, { contextSource: source });
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

test("task receipts carry no minimal-change section until the guard is enabled", async () => {
  await withRuntime(async (runtime) => {
    // A known task, receipts written, but the guard disabled by default: the body is exactly the
    // receipts-only shape — the pre-Task-10 contract is preserved.
    await postJson(runtime, "/v2/handshakes", fixtureHandshake());
    runtime.receiptStore.write(fixtureReceipt());
    const off = await fetch(`${runtime.url}/v2/tasks/task-1/receipts`, { headers: authHeaders(runtime.token) });
    assert.equal(off.status, 200);
    assert.deepEqual(await off.json(), { receipts: [fixtureReceipt()] });
  });
});

test("enabling the guard surfaces the minimal-change projection on GET /v2/tasks/:id/receipts", async () => {
  await withRuntime(async (runtime, projectDir) => {
    await postJson(runtime, "/v2/handshakes", fixtureHandshake());
    runtime.receiptStore.write(fixtureReceipt());

    // Opt the repository into the advisory guard. readVnextConfig is consulted per request, so writing
    // the config after startup is enough to change what the receipts route composes.
    const config = auditConfig(["proxy"]);
    config.vnext.minimal_change = { enabled: true, mode: "advisory", enforced_rules: [] };
    writeVnextConfig(projectDir, config);

    const response = await fetch(`${runtime.url}/v2/tasks/task-1/receipts`, { headers: authHeaders(runtime.token) });
    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      receipts: unknown[];
      minimal_change?: { mode: string; ok: boolean; findings: unknown[]; suppressed: unknown[] };
    };
    // The transformation receipts are still present, untouched.
    assert.deepEqual(body.receipts, [fixtureReceipt()]);
    // The minimal-change projection now rides alongside them. The temp repo has no git diff, so the
    // guard finds nothing — but the section itself is wired through, which is what Step 4 requires.
    assert.ok(body.minimal_change, "expected a minimal_change section once the guard is enabled");
    assert.equal(body.minimal_change!.mode, "advisory");
    assert.equal(body.minimal_change!.ok, true);
    assert.deepEqual(body.minimal_change!.findings, []);
    // Honesty carries over verbatim: no fabricated "lines avoided" figure on the projection.
    assert.equal(Object.prototype.hasOwnProperty.call(body.minimal_change, "lines_avoided"), false);
  });
});

test("local runtime serves exact stored originals over GET /v2/content/:sha256 with task ownership enforced", async () => {
  await withRuntime(async (runtime, projectDir) => {
    const store = new ContentStore({ root: contentRoot(projectDir) });
    const original = "the exact pre-compression tool_result payload\nline two\n";
    const meta = store.put(Buffer.from(original, "utf8"), { media_type: "text/plain", task_id: "task-1" });
    const sha = meta.sha256;

    // Unauthenticated request is rejected before any content is served.
    const anon = await fetch(`${runtime.url}/v2/content/${sha}?task_id=task-1`);
    assert.equal(anon.status, 401);

    // The owning task retrieves the byte-identical original.
    const owner = await fetch(`${runtime.url}/v2/content/${sha}?task_id=task-1`, { headers: authHeaders(runtime.token) });
    assert.equal(owner.status, 200);
    assert.equal(owner.headers.get("x-kage-sha256"), sha);
    assert.equal(await owner.text(), original);

    // A different task is denied.
    const intruder = await fetch(`${runtime.url}/v2/content/${sha}?task_id=task-2`, { headers: authHeaders(runtime.token) });
    assert.equal(intruder.status, 403);

    // Missing task_id is refused.
    const noTask = await fetch(`${runtime.url}/v2/content/${sha}`, { headers: authHeaders(runtime.token) });
    assert.equal(noTask.status, 400);

    // An absent but well-formed id is 404.
    const absent = await fetch(`${runtime.url}/v2/content/${"b".repeat(64)}?task_id=task-1`, { headers: authHeaders(runtime.token) });
    assert.equal(absent.status, 404);

    // A GET-only route rejects other methods.
    const wrongMethod = await fetch(`${runtime.url}/v2/content/${sha}?task_id=task-1`, { method: "POST", headers: authHeaders(runtime.token) });
    assert.equal(wrongMethod.status, 405);
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

test("local runtime tightens a current-user-owned existing runtime directory to 0700", async () => {
  const projectDir = mkdtempSync(join(tmpdir(), "kage-vnext-runtime-existing-directory-"));
  const paths = resolveRuntimePaths(projectDir);
  mkdirSync(paths.runtimeDirectory, { recursive: true, mode: 0o777 });
  chmodSync(paths.runtimeDirectory, 0o777);
  let runtime: LocalRuntimeHandle | undefined;

  try {
    runtime = await startLocalRuntime({ projectDir, port: 0 });
    assert.equal(fileMode(paths.runtimeDirectory), 0o700);
  } finally {
    await runtime?.close();
    rmSync(projectDir, { recursive: true, force: true });
  }
});

test("runtime directory refuses to chmod a directory not owned by the current POSIX uid", () => {
  if (typeof process.getuid !== "function") return;
  const projectDir = mkdtempSync(join(tmpdir(), "kage-vnext-runtime-foreign-owner-"));
  const paths = resolveRuntimePaths(projectDir);
  mkdirSync(paths.runtimeDirectory, { recursive: true, mode: 0o777 });
  chmodSync(paths.runtimeDirectory, 0o777);
  const getuid = process.getuid;
  Object.defineProperty(process, "getuid", { configurable: true, writable: true, value: () => getuid() + 1 });

  try {
    assert.throws(() => ensureRuntimeDirectory(paths.runtimeDirectory), /owned by the current user/i);
    assert.equal(fileMode(paths.runtimeDirectory), 0o777);
  } finally {
    Object.defineProperty(process, "getuid", { configurable: true, writable: true, value: getuid });
    rmSync(projectDir, { recursive: true, force: true });
  }
});

test("runtime directory lease rejects inode replacement", () => {
  const projectDir = mkdtempSync(join(tmpdir(), "kage-vnext-runtime-directory-lease-"));
  const paths = resolveRuntimePaths(projectDir);
  const displaced = join(projectDir, "displaced-vnext");

  try {
    const lease = ensureRuntimeDirectory(paths.runtimeDirectory);
    renameSync(paths.runtimeDirectory, displaced);
    mkdirSync(paths.runtimeDirectory, { mode: 0o700 });

    assert.throws(() => assertRuntimeDirectoryLease(lease), /runtime directory.*replaced/i);
  } finally {
    rmSync(projectDir, { recursive: true, force: true });
  }
});

test("local runtime revalidates its directory after database open before migration", async () => {
  interface ModuleLoader {
    _load(request: string, parent: unknown, isMain: boolean): unknown;
  }

  const projectDir = mkdtempSync(join(tmpdir(), "kage-vnext-runtime-database-lease-"));
  const paths = resolveRuntimePaths(projectDir);
  const displaced = join(projectDir, "displaced-vnext");
  const moduleLoader = require("node:module") as ModuleLoader;
  const originalLoad = moduleLoader._load;
  const sqlite = require("node:sqlite") as typeof import("node:sqlite");
  let replaced = false;

  class ReplacingDatabase {
    constructor(path: string) {
      const database = new sqlite.DatabaseSync(path);
      if (!path.endsWith("local.db")) return database;
      const exec = database.exec.bind(database);
      Object.defineProperty(database, "exec", {
        configurable: true,
        value(sql: string) {
          exec(sql);
          if (!replaced) {
            replaced = true;
            renameSync(paths.runtimeDirectory, displaced);
            mkdirSync(paths.runtimeDirectory, { mode: 0o700 });
          }
        },
      });
      return database;
    }
  }

  moduleLoader._load = (request, parent, isMain) =>
    request === "node:sqlite"
      ? { DatabaseSync: ReplacingDatabase }
      : originalLoad.call(moduleLoader, request, parent, isMain);

  try {
    await assert.rejects(startLocalRuntime({ projectDir, port: 0 }), /runtime directory.*replaced/i);
  } finally {
    moduleLoader._load = originalLoad;
  }

  const displacedDatabase = new sqlite.DatabaseSync(join(displaced, "local.db"));
  try {
    const tasks = displacedDatabase
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'tasks'")
      .get();
    assert.equal(tasks, undefined, "migration must not run after directory replacement");
  } finally {
    displacedDatabase.close();
    rmSync(projectDir, { recursive: true, force: true });
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

test("local runtime startup cleanup releases every resource when database close throws", async () => {
  interface ModuleLoader {
    _load(request: string, parent: unknown, isMain: boolean): unknown;
  }

  const projectDir = mkdtempSync(join(tmpdir(), "kage-vnext-runtime-startup-cleanup-"));
  const paths = resolveRuntimePaths(projectDir);
  mkdirSync(paths.runtimeDirectory, { recursive: true, mode: 0o700 });
  const target = join(projectDir, "status-target");
  writeFileSync(target, "preserve", { mode: 0o644 });
  symlinkSync(target, paths.statusPath);
  const moduleLoader = require("node:module") as ModuleLoader;
  const originalLoad = moduleLoader._load;
  const sqlite = require("node:sqlite") as typeof import("node:sqlite");

  class ThrowingCloseDatabase {
    constructor(path: string) {
      const database = new sqlite.DatabaseSync(path);
      const close = database.close.bind(database);
      Object.defineProperty(database, "close", {
        configurable: true,
        value() {
          close();
          throw new Error(path.endsWith("runtime-lock.db")
            ? "injected lock database close failure"
            : "injected main database close failure");
        },
      });
      return database;
    }
  }

  moduleLoader._load = (request, parent, isMain) =>
    request === "node:sqlite"
      ? { DatabaseSync: ThrowingCloseDatabase }
      : originalLoad.call(moduleLoader, request, parent, isMain);

  let rejection: unknown;
  try {
    try {
      await startLocalRuntime({ projectDir, port: 0 });
    } catch (error) {
      rejection = error;
    }
  } finally {
    moduleLoader._load = originalLoad;
  }

  let probe: ReturnType<typeof acquireRuntimeLock> | undefined;
  let probeFailure: unknown;
  try {
    probe = acquireRuntimeLock(paths.lockPath);
  } catch (error) {
    probeFailure = error;
  } finally {
    if (probe) releaseRuntimeLock(probe);
  }

  try {
    assert.equal(probeFailure, undefined, "startup cleanup must release the lock transaction");
    assert.match(rejection instanceof Error ? rejection.message : "", /status.*regular file|regular file.*status/i);
    assert.equal(lstatSync(paths.statusPath).isSymbolicLink(), true);
    assert.equal(readFileSync(target, "utf8"), "preserve");
  } finally {
    rmSync(projectDir, { recursive: true, force: true });
  }
});

test("local runtime close attempts status and lock cleanup while preserving the first close failure", async () => {
  interface ModuleLoader {
    _load(request: string, parent: unknown, isMain: boolean): unknown;
  }

  const projectDir = mkdtempSync(join(tmpdir(), "kage-vnext-runtime-close-cleanup-"));
  const paths = resolveRuntimePaths(projectDir);
  const moduleLoader = require("node:module") as ModuleLoader;
  const originalLoad = moduleLoader._load;
  const sqlite = require("node:sqlite") as typeof import("node:sqlite");

  class ThrowingCloseDatabase {
    constructor(path: string) {
      const database = new sqlite.DatabaseSync(path);
      const close = database.close.bind(database);
      Object.defineProperty(database, "close", {
        configurable: true,
        value() {
          close();
          throw new Error(path.endsWith("runtime-lock.db")
            ? "injected lock database close failure"
            : "injected main database close failure");
        },
      });
      return database;
    }
  }

  moduleLoader._load = (request, parent, isMain) =>
    request === "node:sqlite"
      ? { DatabaseSync: ThrowingCloseDatabase }
      : originalLoad.call(moduleLoader, request, parent, isMain);

  let runtime: LocalRuntimeHandle | undefined;
  try {
    runtime = await startLocalRuntime({ projectDir, port: 0 });
  } finally {
    moduleLoader._load = originalLoad;
  }

  let rejection: unknown;
  try {
    await runtime.close();
  } catch (error) {
    rejection = error;
  }

  let probe: ReturnType<typeof acquireRuntimeLock> | undefined;
  let probeFailure: unknown;
  try {
    probe = acquireRuntimeLock(paths.lockPath);
  } catch (error) {
    probeFailure = error;
  } finally {
    if (probe) releaseRuntimeLock(probe);
  }

  try {
    assert.equal(probeFailure, undefined, "normal close must release the lock transaction");
    assert.equal(existsSync(paths.statusPath), false, "normal close must remove its status lease");
    assert.equal(rejection instanceof Error ? rejection.message : "", "injected main database close failure");
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

test("local runtime enforces one live owner per project and allows restart after close", { timeout: 5_000 }, async () => {
  const projectDir = mkdtempSync(join(tmpdir(), "kage-vnext-runtime-singleton-"));
  const paths = resolveRuntimePaths(projectDir);
  const lockPath = join(paths.runtimeDirectory, "runtime-lock.db");
  let first: LocalRuntimeHandle | undefined;
  let unexpectedSecond: LocalRuntimeHandle | undefined;
  let third: LocalRuntimeHandle | undefined;
  let secondFailure: unknown;

  try {
    first = await startLocalRuntime({ projectDir, port: 0 });
    const firstStatus = readFileSync(paths.statusPath, "utf8");
    assert.equal(fileMode(lockPath), 0o600);

    try {
      unexpectedSecond = await startLocalRuntime({ projectDir, port: 0 });
    } catch (error) {
      secondFailure = error;
    }
    await unexpectedSecond?.close();

    assert.match(secondFailure instanceof Error ? secondFailure.message : "", /runtime.*already running|live runtime/i);
    assert.equal(readFileSync(paths.statusPath, "utf8"), firstStatus);
    assert.equal((await fetch(`${first.url}/v2/health`)).status, 200);

    await first.close();
    assert.equal(existsSync(lockPath), true, "the persistent lock database is not unlinked on release");
    third = await startLocalRuntime({ projectDir, port: 0 });
    assert.equal((await fetch(`${third.url}/v2/health`)).status, 200);
  } finally {
    await unexpectedSecond?.close();
    await third?.close();
    await first?.close();
    rmSync(projectDir, { recursive: true, force: true });
  }
});

test("runtime lock database blocks a second lease and permits a new lease after release", () => {
  const projectDir = mkdtempSync(join(tmpdir(), "kage-vnext-runtime-direct-lock-"));
  const paths = resolveRuntimePaths(projectDir);
  const lockPath = join(paths.runtimeDirectory, "runtime-lock.db");
  mkdirSync(paths.runtimeDirectory, { recursive: true, mode: 0o700 });
  const first = acquireRuntimeLock(lockPath);

  try {
    assert.throws(() => acquireRuntimeLock(lockPath), /runtime.*already running/i);
    releaseRuntimeLock(first);
    const second = acquireRuntimeLock(lockPath);
    releaseRuntimeLock(second);
    assert.equal(existsSync(lockPath), true, "release preserves the lock database");
    assert.equal(fileMode(lockPath), 0o600);
  } finally {
    releaseRuntimeLock(first);
    rmSync(projectDir, { recursive: true, force: true });
  }
});

test("local runtime rejects an untrusted lock symlink without touching its target", async () => {
  const projectDir = mkdtempSync(join(tmpdir(), "kage-vnext-runtime-lock-symlink-"));
  const paths = resolveRuntimePaths(projectDir);
  const lockPath = join(paths.runtimeDirectory, "runtime-lock.db");
  mkdirSync(paths.runtimeDirectory, { recursive: true, mode: 0o700 });
  const target = join(projectDir, "lock-target");
  const contents = "preserve";
  writeFileSync(target, contents, { mode: 0o644 });
  chmodSync(target, 0o644);
  symlinkSync(target, lockPath);
  let runtime: LocalRuntimeHandle | undefined;
  let rejection: unknown;

  try {
    try {
      runtime = await startLocalRuntime({ projectDir, port: 0 });
    } catch (error) {
      rejection = error;
    }
    await runtime?.close();
    assert.match(rejection instanceof Error ? rejection.message : "", /lock.*regular file|regular file.*lock|database.*regular file/i);
    assert.equal(lstatSync(lockPath).isSymbolicLink(), true);
    assert.equal(readFileSync(target, "utf8"), contents);
    assert.equal(fileMode(target), 0o644);
  } finally {
    await runtime?.close();
    rmSync(projectDir, { recursive: true, force: true });
  }
});

// --- context work is off the request thread ----------------------------------------------
// The fake worker below burns CPU synchronously exactly the way the real kernel (recall,
// kageRisk -> code-graph build) does. It never loads the kernel: what is under test is that
// the runtime's single event loop stays free to answer health, events and receipts while a
// context request is being computed, and that a runaway job is really killed.

function writeSpinWorker(dir: string, mode: "reply" | "runaway"): string {
  const path = join(dir, `spin-worker-${mode}.js`);
  writeFileSync(path, `
const { parentPort, workerData } = require("node:worker_threads");
parentPort.on("message", (message) => {
  ${mode === "runaway" ? "for (;;) {}" : `
  const until = Date.now() + Number(workerData.spinMs);
  while (Date.now() < until) {}
  parentPort.postMessage({
    job_id: message.job_id,
    ok: true,
    candidates: [{
      candidate_id: "worker:auth",
      kind: "invariant",
      title: "Authentication invariant",
      body: "Token comparisons are constant-time.",
      evidence_ids: ["src/auth.ts"],
      trust_state: "verified",
      priority: 100,
    }],
  });`}
});
`, "utf8");
  return path;
}

const RESPONSIVENESS_SPIN_MS = 2_000;
const RESPONSIVENESS_WINDOW_MS = 600;
const RESPONSIVENESS_MIN_PROBES = 5;

test("local runtime keeps answering health and events while a context request is in flight", async () => {
  const workerDir = mkdtempSync(join(tmpdir(), "kage-vnext-worker-"));
  const source = new WorkerContextSource({
    projectDir: workerDir,
    workerPath: writeSpinWorker(workerDir, "reply"),
    workerData: { spinMs: RESPONSIVENESS_SPIN_MS },
  });

  try {
    await withRuntime(async (runtime) => {
      const startedAt = Date.now();
      const context = postJson(runtime, "/v2/context", fixtureContextRequest());

      // Probes are counted only if they COMPLETE inside the window that opens when the context
      // request is fired. On the main-thread source this count is at most 1: the loop is
      // blocked for the whole computation, timers never fire, and fail-open adapters lose
      // their evidence. There is no way to fake this with a timeout on the blocked thread.
      let answered = 0;
      let accepted = 0;
      while (Date.now() - startedAt < RESPONSIVENESS_WINDOW_MS) {
        const health = await fetch(`${runtime.url}/v2/health`);
        const events = await postJson(runtime, "/v2/events", fixtureEvidenceEvent());
        const inWindow = Date.now() - startedAt < RESPONSIVENESS_WINDOW_MS;
        if (health.status === 200 && inWindow) answered += 1;
        if (events.status === 202 && inWindow) accepted += 1;
        await health.arrayBuffer();
        await events.arrayBuffer();
        await new Promise((resolve) => setTimeout(resolve, 25));
      }

      assert.ok(
        answered >= RESPONSIVENESS_MIN_PROBES,
        `runtime must answer health while context computes; answered ${answered}`,
      );
      assert.ok(
        accepted >= RESPONSIVENESS_MIN_PROBES,
        `runtime must accept evidence while context computes; accepted ${accepted}`,
      );

      const response = await context;
      const capsule = await response.json() as Record<string, unknown>;
      assert.equal(response.status, 200);
      assert.equal((capsule.sections as unknown[]).length, 1);
    }, { contextSource: source });
  } finally {
    await source.close();
    rmSync(workerDir, { recursive: true, force: true });
  }
});

test("local runtime turns a runaway context job into a 503 without hanging the loop", async () => {
  const workerDir = mkdtempSync(join(tmpdir(), "kage-vnext-runaway-"));
  const source = new WorkerContextSource({
    projectDir: workerDir,
    workerPath: writeSpinWorker(workerDir, "runaway"),
    timeoutMs: 300,
  });
  const originalError = console.error;
  console.error = () => {};

  try {
    await withRuntime(async (runtime) => {
      const startedAt = Date.now();
      const response = await postJson(runtime, "/v2/context", fixtureContextRequest());
      const elapsed = Date.now() - startedAt;

      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), { ok: false, error: "context_source_unavailable" });
      assert.ok(elapsed < 5_000, `the deadline must preempt the runaway worker; took ${elapsed} ms`);
      assert.equal((await fetch(`${runtime.url}/v2/health`)).status, 200);
    }, { contextSource: source });
  } finally {
    console.error = originalError;
    await source.close();
    rmSync(workerDir, { recursive: true, force: true });
  }
});

test("local runtime tears its context worker down on close", async () => {
  const workerDir = mkdtempSync(join(tmpdir(), "kage-vnext-close-"));
  const source = new WorkerContextSource({
    projectDir: workerDir,
    workerPath: writeSpinWorker(workerDir, "reply"),
    workerData: { spinMs: 0 },
  });

  try {
    await withRuntime(async (runtime) => {
      assert.equal((await postJson(runtime, "/v2/context", fixtureContextRequest())).status, 200);
      assert.equal(source.workerRunning(), true);
    }, { contextSource: source });

    // withRuntime already closed the runtime: the worker must be gone with it, or the process
    // would never exit.
    assert.equal(source.workerRunning(), false);
  } finally {
    await source.close();
    rmSync(workerDir, { recursive: true, force: true });
  }
});

test("local runtime defaults its context source to the off-thread worker", async () => {
  await withRuntime(async (runtime) => {
    const response = await postJson(runtime, "/v2/context", fixtureContextRequest());
    const capsule = await response.json() as { sections: { title: string }[] };

    // No contextSource was injected, so this is the shipped default: the legacy kernel really
    // ran and produced its target-context section for the requested file.
    assert.equal(response.status, 200);
    assert.ok(
      capsule.sections.some((section) => section.title === "Target context: src/auth.ts"),
      `default source must produce real kernel context; got ${JSON.stringify(capsule.sections)}`,
    );
    // ...and it ran OFF the request thread. Asserting only on the capsule above would pass just
    // as well with the kernel running on the runtime's event loop, so reverting the default to
    // an on-thread LegacyContextSource would be a silent one-line regression. This is the guard.
    assert.ok(
      runtime.contextSource instanceof WorkerContextSource,
      `default context source must be off-thread; got ${runtime.contextSource?.constructor.name}`,
    );
  });
});
