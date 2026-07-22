import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import type { EvidenceEvent } from "../protocol/index.js";
import { Repository } from "../repo-model/repository.js";
import { startLocalRuntime, type LocalRuntimeHandle } from "./server.js";

function authHeaders(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

async function postEvent(runtime: LocalRuntimeHandle, event: EvidenceEvent): Promise<Response> {
  return fetch(`${runtime.url}/v2/events`, {
    method: "POST",
    headers: { ...authHeaders(runtime.token), "content-type": "application/json" },
    body: JSON.stringify(event),
  });
}

async function getStatus(runtime: LocalRuntimeHandle): Promise<Record<string, unknown>> {
  const response = await fetch(`${runtime.url}/v2/status`, { headers: authHeaders(runtime.token) });
  return (await response.json()) as Record<string, unknown>;
}

function event(
  type: EvidenceEvent["event_type"],
  index: number,
  payload: Record<string, unknown> = {},
): EvidenceEvent {
  return {
    protocol_version: 1,
    event_id: `event-${index}`,
    event_type: type,
    occurred_at: new Date(index * 60_000).toISOString(),
    repository_id: "repo-1",
    task_id: "task-1",
    privacy_class: "local_raw",
    source_fingerprint: `sha256:source-${index}`,
    payload,
  };
}

// A debugging episode (resolved failure): it compiles into at least one claim candidate.
const DEBUGGING_EPISODE: EvidenceEvent[] = [
  event("prompt", 0),
  event("file_edit", 1, { path: "src/auth.ts" }),
  event("tool_result", 2, { command: "npm test", exit_code: 1 }),
  event("file_edit", 3, { path: "src/auth.ts" }),
  event("tool_result", 4, { command: "npm test", exit_code: 0 }),
  event("session_end", 5),
];

async function withRuntime(action: (runtime: LocalRuntimeHandle) => Promise<void>): Promise<void> {
  const projectDir = mkdtempSync(join(tmpdir(), "kage-vnext-pipeline-"));
  let runtime: LocalRuntimeHandle | undefined;
  try {
    runtime = await startLocalRuntime({ projectDir, port: 0, mode: "audit" });
    await action(runtime);
  } finally {
    await runtime?.close();
    rmSync(projectDir, { recursive: true, force: true });
  }
}

test("status exposes compilation lag and last-compiled-at, honestly null before any run", async () => {
  await withRuntime(async (runtime) => {
    const status = await getStatus(runtime);
    assert.equal(status.model_lag_events, 0, "no events, no lag");
    assert.equal(status.last_compiled_at, null, "nothing compiled yet");
  });
});

test("posting an event batch schedules compilation off the request path and clears the lag", async () => {
  await withRuntime(async (runtime) => {
    for (const e of DEBUGGING_EPISODE) {
      const response = await postEvent(runtime, e);
      assert.equal(response.status, 202);
    }

    // The daemon schedules compilation after the batch; context/event requests never wait for it.
    // Poll status until the compiler catches up (bounded so a real failure still fails the test).
    let status: Record<string, unknown> = {};
    for (let attempt = 0; attempt < 100; attempt += 1) {
      status = await getStatus(runtime);
      if (status.model_lag_events === 0 && status.last_compiled_at !== null) break;
      await delay(20);
    }
    assert.equal(status.model_lag_events, 0, "compiler caught up with the event batch");
    assert.notEqual(status.last_compiled_at, null, "a compiled-at timestamp is exposed");

    // Compilation actually produced repository claims from the events.
    const model = new Repository(runtime.database);
    assert.ok(model.countClaims() >= 1, "at least one claim was compiled from the batch");
  });
});
