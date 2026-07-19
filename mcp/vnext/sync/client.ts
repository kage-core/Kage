// The local -> workspace sync client, and the offline-tolerant drain loop.
//
// FAIL-OPEN is the whole point: the workspace is never on the low-latency local context path, so a push
// that cannot reach the server must not throw into the caller's critical path — it leaves the batch
// pending and returns. The drain loop pushes pending batches in order; the first that cannot be delivered
// stops the drain, leaving it and everything after it pending for the next attempt. Because the workspace
// applies a batch idempotently by batch_id, redelivering a batch that actually reached the server (but
// whose ack was lost) is a harmless no-op.
import type { Outbox } from "./outbox.js";
import type { SyncBatch } from "./types.js";

export interface PushResult {
  batch_id: string;
  status: "applied" | "duplicate";
  applied_counts: Record<string, number>;
}

export interface PullResult {
  cursor: string | null;
  batches: SyncBatch[];
}

export interface SyncTransport {
  /** POST /v1/sync/push. Rejects on a transport/HTTP failure; resolves with the applied result. */
  push(batch: SyncBatch): Promise<PushResult>;
  /** GET /v1/sync/pull?cursor=. Returns changes the authenticated principal is permitted to see. */
  pull(cursor: string | null): Promise<PullResult>;
}

export interface DrainSummary {
  pushed: number;
  remaining: number;
  offline: boolean;
}

/**
 * Drain the outbox against a transport. Pushes pending batches oldest-first; on the first transport
 * failure it stops and reports `offline`, leaving the rest pending. A successful (or duplicate) push
 * marks the batch synced so it is never sent twice on the happy path.
 */
export async function drainOutbox(outbox: Outbox, transport: SyncTransport): Promise<DrainSummary> {
  let pushed = 0;
  for (const record of outbox.pending()) {
    try {
      const result = await transport.push(record.batch);
      outbox.markSynced(result.batch_id);
      pushed += 1;
    } catch {
      return { pushed, remaining: outbox.pending().length, offline: true };
    }
  }
  return { pushed, remaining: outbox.pending().length, offline: false };
}

/** An HTTP transport to a running workspace service, authenticated with a service (daemon) token. */
export function httpTransport(baseUrl: string, serviceToken: string): SyncTransport {
  const headers = {
    "content-type": "application/json",
    authorization: `Bearer ${serviceToken}`,
  };
  return {
    async push(batch: SyncBatch): Promise<PushResult> {
      const response = await fetch(`${baseUrl}/v1/sync/push`, {
        method: "POST",
        headers,
        body: JSON.stringify(batch),
      });
      if (!response.ok) throw new Error(`sync push failed: ${response.status}`);
      return (await response.json()) as PushResult;
    },
    async pull(cursor: string | null): Promise<PullResult> {
      const url = new URL(`${baseUrl}/v1/sync/pull`);
      if (cursor) url.searchParams.set("cursor", cursor);
      const response = await fetch(url, { method: "GET", headers });
      if (!response.ok) throw new Error(`sync pull failed: ${response.status}`);
      return (await response.json()) as PullResult;
    },
  };
}
