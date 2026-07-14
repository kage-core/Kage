import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { lstatSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { isRecord } from "../../type-guards.js";
import type { ContextRequest } from "../context/source.js";
import {
  KAGE_PROTOCOL_VERSION,
  type AdapterHandshake,
  type CapsuleSection,
  type ContextCapsule,
  type ContextDelivery,
  type EvidenceEvent,
} from "../protocol/index.js";
import { resolveRuntimePaths } from "../runtime/paths.js";
import { spoolContextDelivery } from "../storage/delivery-spool.js";
import type { StoredContextDelivery } from "../storage/delivery-store.js";
import { renderContextBlock } from "./claude.js";

// The two budgets Phase A commits to. Event delivery is a background write and gets 150 ms;
// context composition is allowed 500 ms and NO MORE — a cold code-graph build takes tens of
// seconds, so the adapter is expected to abort, fail open, and let the warm cache serve the next
// request. Waiting for the build would hang the user's agent, which is the one thing Kage must
// never do.
export const ADAPTER_EVENT_TIMEOUT_MS = 150;
export const ADAPTER_CONTEXT_TIMEOUT_MS = 500;

// Every reason is a fixed token. Nothing derived from a prompt, a file, or a tool result is ever
// allowed into a reason string, because reasons are printed and logged.
export type AdapterFailureReason =
  | "unreachable"
  | "timeout"
  | "unauthorized"
  | "invalid_protocol"
  | "malformed_response"
  | "runtime_error";

export interface AdapterSendResult {
  status: "accepted" | "skipped" | "failed_open";
  reason: string;
}

export interface AdapterContextResult {
  status: "delivered" | "skipped" | "failed_open";
  reason: string;
  capsule?: ContextCapsule;
}

export interface AdapterConnection {
  url: string;
  token: string;
  mode: "audit" | "assist";
}

function failureReason(status: number): AdapterFailureReason {
  if (status === 401 || status === 403) return "unauthorized";
  if (status === 400 || status === 409 || status === 415 || status === 413) return "invalid_protocol";
  return "runtime_error";
}

function transportReason(error: unknown): AdapterFailureReason {
  // AbortSignal.timeout rejects with a TimeoutError; an explicit abort surfaces as AbortError.
  const name = error instanceof Error ? error.name : "";
  const causeName = error instanceof Error && error.cause instanceof Error ? error.cause.name : "";
  if (name === "TimeoutError" || name === "AbortError" || causeName === "TimeoutError") return "timeout";
  return "unreachable";
}

async function post(
  url: string,
  path: string,
  token: string,
  body: unknown,
  timeoutMs: number,
): Promise<{ ok: true; response: Response } | { ok: false; reason: AdapterFailureReason }> {
  try {
    const response = await fetch(`${url}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    return { ok: true, response };
  } catch (error) {
    return { ok: false, reason: transportReason(error) };
  }
}

async function readJsonBody(response: Response): Promise<unknown | undefined> {
  try {
    return JSON.parse(await response.text()) as unknown;
  } catch {
    return undefined;
  }
}

// The runtime is trusted, but a reply is still a wire value: a truncated body, a proxy's error
// page, or a future runtime speaking protocol 2 must fail open, never be injected as context.
export function parseContextCapsule(value: unknown): ContextCapsule | undefined {
  if (!isRecord(value)) return undefined;
  if (value.protocol_version !== KAGE_PROTOCOL_VERSION) return undefined;
  const sections = value.sections;
  if (!Array.isArray(sections)) return undefined;
  const parsed: CapsuleSection[] = [];
  for (const entry of sections) {
    if (
      !isRecord(entry)
      || typeof entry.kind !== "string"
      || typeof entry.title !== "string"
      || typeof entry.body !== "string"
      || typeof entry.priority !== "number"
      || !Array.isArray(entry.evidence_ids)
      || entry.evidence_ids.some((id) => typeof id !== "string")
    ) return undefined;
    parsed.push({
      kind: entry.kind as CapsuleSection["kind"],
      title: entry.title,
      body: entry.body,
      evidence_ids: entry.evidence_ids as string[],
      priority: entry.priority,
    });
  }
  if (
    typeof value.capsule_id !== "string"
    || typeof value.task_id !== "string"
    || typeof value.repository_id !== "string"
    || typeof value.query !== "string"
    || typeof value.token_budget !== "number"
    || typeof value.estimated_tokens !== "number"
    || typeof value.created_at !== "string"
    || typeof value.expires_at !== "string"
  ) return undefined;
  return {
    protocol_version: KAGE_PROTOCOL_VERSION,
    capsule_id: value.capsule_id,
    task_id: value.task_id,
    repository_id: value.repository_id,
    query: value.query,
    sections: parsed,
    token_budget: value.token_budget,
    estimated_tokens: value.estimated_tokens,
    created_at: value.created_at,
    expires_at: value.expires_at,
  };
}

// The runtime writes status.json and token 0600 inside a 0700 directory it owns (runtime/paths.ts,
// status.ts, token.ts). Those files sit at a repo-relative, CHECKED-OUT path, so a cloned hostile
// repo can ship its own pair and point the harness at a port of its choosing. Trust them only while
// they still look like the runtime's own.
function ownedAndPrivate(path: string, kind: "file" | "directory"): boolean {
  const stats = lstatSync(path);
  if (kind === "file" ? !stats.isFile() : !stats.isDirectory()) return false;
  if (stats.isSymbolicLink()) return false;
  const uid = process.getuid?.();
  if (uid !== undefined && stats.uid !== uid) return false;
  return (stats.mode & 0o077) === 0;
}

// status.json is removed only on a graceful close, so SIGKILL, an OOM kill, or a reboot leaves it
// behind — and the port it names may since have been taken by any other local process. A runtime is
// live only while the process it recorded is still running and still ours. Anything unverifiable is
// "no runtime": when in doubt the legacy path must keep running, because silence is the worst
// possible failure and a redundant legacy hook is a survivable one.
function runtimeProcessAlive(pid: unknown): boolean {
  if (!Number.isInteger(pid) || (pid as number) <= 0) return false;
  try {
    // Signal 0 probes existence and permission: ESRCH (gone) and EPERM (someone else's process,
    // i.e. a recycled pid) both throw, and both mean "not our runtime".
    process.kill(pid as number, 0);
    const comm = execFileSync("ps", ["-p", String(pid), "-o", "comm="], { encoding: "utf8", timeout: 2_000 });
    return basename(comm.trim()).toLowerCase().includes("node");
  } catch {
    return false;
  }
}

// Adapters discover the runtime the same way the shell hook does: the status file the daemon
// publishes, plus the token beside it. Anything missing, unreadable, off-mode, untrusted, or no
// longer alive means "no runtime" — never an exception, because an adapter that throws is an
// adapter that breaks a user's session.
export function readAdapterConnection(projectDir: string): AdapterConnection | null {
  try {
    const paths = resolveRuntimePaths(projectDir);
    if (!ownedAndPrivate(paths.runtimeDirectory, "directory")) return null;
    if (!ownedAndPrivate(paths.statusPath, "file")) return null;
    if (!ownedAndPrivate(paths.tokenPath, "file")) return null;
    const status: unknown = JSON.parse(readFileSync(paths.statusPath, "utf8"));
    if (!isRecord(status)) return null;
    const { host, port, mode, pid } = status;
    if (host !== "127.0.0.1" || !Number.isInteger(port) || (port as number) <= 0 || (port as number) > 65_535) return null;
    if (mode !== "audit" && mode !== "assist") return null;
    if (!runtimeProcessAlive(pid)) return null;
    const token = readFileSync(paths.tokenPath, "utf8").trim();
    if (!token) return null;
    return { url: `http://127.0.0.1:${port as number}`, token, mode };
  } catch {
    return null;
  }
}

export async function sendAdapterHandshake(options: {
  url: string;
  token: string;
  handshake: AdapterHandshake;
  timeout_ms?: number;
}): Promise<AdapterSendResult> {
  const sent = await post(
    options.url,
    "/v2/handshakes",
    options.token,
    options.handshake,
    options.timeout_ms ?? ADAPTER_EVENT_TIMEOUT_MS,
  );
  if (!sent.ok) return { status: "failed_open", reason: sent.reason };
  if (!sent.response.ok) return { status: "failed_open", reason: failureReason(sent.response.status) };
  await readJsonBody(sent.response);
  return { status: "accepted", reason: "accepted" };
}

export async function sendAdapterEvent(options: {
  url: string;
  token: string;
  event: EvidenceEvent;
  timeout_ms?: number;
}): Promise<AdapterSendResult> {
  const sent = await post(
    options.url,
    "/v2/events",
    options.token,
    options.event,
    options.timeout_ms ?? ADAPTER_EVENT_TIMEOUT_MS,
  );
  if (!sent.ok) return { status: "failed_open", reason: sent.reason };
  if (!sent.response.ok) return { status: "failed_open", reason: failureReason(sent.response.status) };
  const body = await readJsonBody(sent.response);
  const reason = isRecord(body) && typeof body.status === "string" ? body.status : "accepted";
  return { status: "accepted", reason };
}

export async function requestAdapterContext(options: {
  url: string;
  token: string;
  request: ContextRequest;
  timeout_ms?: number;
}): Promise<AdapterContextResult> {
  const sent = await post(
    options.url,
    "/v2/context",
    options.token,
    options.request,
    options.timeout_ms ?? ADAPTER_CONTEXT_TIMEOUT_MS,
  );
  if (!sent.ok) return { status: "failed_open", reason: sent.reason };
  if (!sent.response.ok) return { status: "failed_open", reason: failureReason(sent.response.status) };
  const capsule = parseContextCapsule(await readJsonBody(sent.response));
  if (!capsule) return { status: "failed_open", reason: "malformed_response" };
  return { status: "delivered", reason: "delivered", capsule };
}

// A failed attempt has no capsule, and a delivery row's capsule_id is NOT NULL. A fixed token says
// so out loud rather than inventing an id for a capsule that was never composed.
export const NO_CAPSULE_ID = "capsule_unavailable";

export interface AdapterContextAttempt extends AdapterContextResult {
  /** The block that was actually injected. Empty for every status but "delivered". */
  block: string;
  /** The delivery this attempt recorded — the row a report will later count. */
  delivery: StoredContextDelivery;
  /** False when the record could not be spooled. A lost measurement, never a broken session. */
  recorded: boolean;
}

/**
 * One context ATTEMPT, end to end: ask the runtime for a capsule, decide what the session actually
 * gets, and record what happened. This is the only shipped path a Claude-style adapter needs, and
 * it exists because nothing else was writing the evidence that attachment even happened.
 *
 * The three statuses are the three true outcomes, and none of them may be confused for another:
 *
 *   delivered   — a non-empty block reached the session, at `injection_location`, adding
 *                 `added_bytes` measured bytes.
 *   skipped     — Kage composed a capsule and deliberately did not inject it. AUDIT MODE IS THIS
 *                 CASE, always: audit measures and never touches the prompt. A skip is NOT an
 *                 attachment, and counting it as one is the precise lie this phase exists to stop.
 *   failed_open — the runtime was unreachable, slow, unauthorized, or off-protocol. The session
 *                 carries on untouched; the failure is COUNTED rather than hidden.
 *
 * Latency is measured, never estimated: it is the real round trip of the composition request, and
 * it is null when nothing was composed (a timeout is not a composition time).
 */
export async function attachAdapterContext(options: {
  project_dir: string;
  connection: AdapterConnection;
  adapter_id: string;
  request: ContextRequest;
  /** Where the block would go if it is injected. Audit records "none" — because nothing goes. */
  injection_location: Exclude<ContextDelivery["injection_location"], "none">;
  timeout_ms?: number;
  now?: Date;
}): Promise<AdapterContextAttempt> {
  const startedAt = performance.now();
  const result = await requestAdapterContext({
    url: options.connection.url,
    token: options.connection.token,
    request: options.request,
    timeout_ms: options.timeout_ms,
  });
  const latencyMs = performance.now() - startedAt;

  const capsule = result.capsule;
  const block = capsule ? renderContextBlock(capsule) : "";
  const injects = options.connection.mode === "assist" && block !== "";

  let status: ContextDelivery["status"];
  let reason: string;
  if (!capsule) {
    status = "failed_open";
    reason = result.reason;
  } else if (!block) {
    status = "skipped";
    reason = "empty_capsule";
  } else if (!injects) {
    status = "skipped";
    reason = "audit_mode_no_injection";
  } else {
    status = "delivered";
    reason = "delivered";
  }

  const delivered = status === "delivered";
  const delivery: StoredContextDelivery = {
    delivery_id: `delivery_${randomUUID()}`,
    capsule_id: capsule?.capsule_id ?? NO_CAPSULE_ID,
    task_id: options.request.task.task_id,
    adapter_id: options.adapter_id,
    injection_location: delivered ? options.injection_location : "none",
    delivered_at: (options.now ?? new Date()).toISOString(),
    added_bytes: delivered ? Buffer.byteLength(block, "utf8") : 0,
    // Nothing counts the injected block's tokens. bytes/4 would be a fabricated number, so this
    // stays null and the row is honestly "partial" (bytes exact, tokens unmeasured).
    added_tokens: null,
    measurement_quality: delivered ? "partial" : "unavailable",
    status,
    reason,
    composition_latency_ms: capsule ? latencyMs : null,
  };

  return {
    status,
    reason,
    capsule,
    block: delivered ? block : "",
    delivery,
    recorded: spoolContextDelivery(options.project_dir, delivery),
  };
}
