// The portal live-update feed: authenticated Server-Sent Events served at GET /v2/events.
//
// The single load-bearing contract of this module is a PRIVACY BOUNDARY: every event carries only
// IDENTIFIERS and ENUMS — never raw prompt text, normalized claim content, capsule bodies, or evidence
// source bytes. Raw originals are retrieved out-of-band through the content route, never pushed over a
// broadcast feed. This is enforced structurally by `toWirePayload`, whose per-kind ALLOWLIST copies
// only known identifier/enum keys onto the wire, so a field accidentally attached to an event object
// (a smuggled `normalized_content`) can never reach a client.
//
// The transport mirrors the legacy live feed in daemon.ts (`startLiveFeed`): text/event-stream, a
// periodic heartbeat comment, and a monotonic resume id per event with a bounded replay buffer so a
// reconnecting client that sends `Last-Event-ID` catches up without a full resync. It is distinct from
// the unauthenticated legacy `/kage/events` file-watch feed and never collides with it.

import type { IncomingMessage, ServerResponse } from "node:http";
import type { TrustState } from "../repo-model/types.js";

export type ReviewStatus = "open" | "accepted" | "rejected" | "superseded";
export type IntegrationState = "healthy" | "degraded" | "passthrough" | "disconnected";

// A review item entered the queue. Identifiers + the enums a client needs to route/refresh, nothing more.
export interface ReviewItemCreatedEvent {
  kind: "review_item_created";
  review_item_id: string;
  claim_id: string;
  entity_slug: string | null;
  required_role: string;
  status: ReviewStatus;
  at: string;
}

// A claim's trust state changed (e.g. proposed → approved, verified → superseded).
export interface ClaimUpdatedEvent {
  kind: "claim_updated";
  claim_id: string;
  entity_slug: string | null;
  trust_state: TrustState;
  at: string;
}

// A task accrued or changed receipts; the client re-fetches the aggregate out-of-band.
export interface TaskReceiptUpdatedEvent {
  kind: "task_receipt_updated";
  task_id: string;
  receipt_count: number;
  at: string;
}

// An adapter/integration changed attachment state.
export interface IntegrationStateChangedEvent {
  kind: "integration_state_changed";
  integration_id: string;
  state: IntegrationState;
  at: string;
}

export type PortalEvent =
  | ReviewItemCreatedEvent
  | ClaimUpdatedEvent
  | TaskReceiptUpdatedEvent
  | IntegrationStateChangedEvent;

// The ONLY keys allowed onto the wire, per kind. Anything not listed here — above all any raw content
// field — is dropped by `toWirePayload`. This allowlist is the privacy boundary; keep it identifiers
// and enums only.
const ALLOWED_KEYS: Record<PortalEvent["kind"], readonly string[]> = {
  review_item_created: ["kind", "review_item_id", "claim_id", "entity_slug", "required_role", "status", "at"],
  claim_updated: ["kind", "claim_id", "entity_slug", "trust_state", "at"],
  task_receipt_updated: ["kind", "task_id", "receipt_count", "at"],
  integration_state_changed: ["kind", "integration_id", "state", "at"],
};

// Project an event onto its allowlisted identifier/enum fields. A fresh object is built from the
// allowlist — the input is never spread — so a smuggled extra field cannot ride along.
export function toWirePayload(event: PortalEvent): Record<string, unknown> {
  const source = event as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of ALLOWED_KEYS[event.kind]) out[key] = source[key];
  return out;
}

// One SSE frame: a resume `id:` line and the identifier-only `data:` payload, terminated by a blank line.
export function serializePortalEvent(event: PortalEvent, id: number): string {
  return `id: ${id}\ndata: ${JSON.stringify(toWirePayload(event))}\n\n`;
}

interface BufferedEvent {
  id: number;
  frame: string;
}

const DEFAULT_HEARTBEAT_MS = 15_000;
const DEFAULT_BUFFER_SIZE = 256;

export interface PortalEventStreamOptions {
  heartbeatMs?: number;
  bufferSize?: number;
}

// Parse a `Last-Event-ID` header into a resume cursor, or null if absent/malformed.
function parseLastEventId(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string" || !/^\d+$/.test(raw.trim())) return null;
  const parsed = Number(raw.trim());
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export class PortalEventStream {
  private readonly clients = new Set<ServerResponse>();
  private readonly buffer: BufferedEvent[] = [];
  private readonly bufferSize: number;
  private readonly heartbeat: NodeJS.Timeout;
  private nextId = 1;

  constructor(options: PortalEventStreamOptions = {}) {
    this.bufferSize = options.bufferSize ?? DEFAULT_BUFFER_SIZE;
    const heartbeatMs = options.heartbeatMs ?? DEFAULT_HEARTBEAT_MS;
    this.heartbeat = setInterval(() => {
      for (const res of this.clients) res.write(`: heartbeat ${Date.now()}\n\n`);
    }, heartbeatMs);
    // Never keep the process alive for the heartbeat alone.
    this.heartbeat.unref();
  }

  // Broadcast an event and retain it (bounded) for resume. Returns its assigned resume id.
  emit(event: PortalEvent): number {
    const id = this.nextId;
    this.nextId += 1;
    const frame = serializePortalEvent(event, id);
    this.buffer.push({ id, frame });
    while (this.buffer.length > this.bufferSize) this.buffer.shift();
    for (const res of this.clients) res.write(frame);
    return id;
  }

  // Retained events strictly newer than `lastEventId`, for a resuming client. Pure and testable.
  bufferedSince(lastEventId: number): BufferedEvent[] {
    return this.buffer.filter((event) => event.id > lastEventId);
  }

  // Attach a client. Writes the SSE preamble, replays any missed events for a `Last-Event-ID` resume,
  // then streams live until the request closes.
  handleRequest(req: IncomingMessage, res: ServerResponse): void {
    res.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
      "x-content-type-options": "nosniff",
    });
    res.write(": connected\n\n");
    const lastEventId = parseLastEventId(req.headers["last-event-id"]);
    if (lastEventId !== null) {
      for (const buffered of this.bufferedSince(lastEventId)) res.write(buffered.frame);
    }
    this.clients.add(res);
    req.on("close", () => {
      this.clients.delete(res);
    });
  }

  clientCount(): number {
    return this.clients.size;
  }

  close(): void {
    clearInterval(this.heartbeat);
    for (const res of this.clients) res.end();
    this.clients.clear();
  }
}
