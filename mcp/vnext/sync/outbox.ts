// The local synchronization outbox: build privacy-filtered batches and enqueue them exactly once.
//
// TWO invariants live here, and both are security-critical:
//  1. RAW STAYS LOCAL. buildSyncBatch() drops every evidence record whose privacy_class is `local_raw`
//     and keeps only injectable (verified/approved) claims, so a batch can only ever carry approved model
//     records + permitted, already-aggregated measurements. There is no field on the wire that can hold a
//     raw prompt or tool payload.
//  2. EXACTLY ONCE. A batch's id is a deterministic hash of its content, and enqueue() is a no-op when
//     that id is already present. An offline retry re-enqueues the identical batch and changes nothing,
//     which is what keeps duplicate_sync_records at zero end-to-end.
import { createHash } from "node:crypto";
import { isInjectableTrustState } from "../repo-model/types.js";
import type {
  AggregatedMeasurementRecord,
  EvidenceRecord,
  LocalModelSnapshot,
  OutboxRecord,
  ReviewDecisionRecord,
  SyncBatch,
} from "./types.js";

/** Evidence that may leave the machine: local_raw is quarantined to the local store, never synced. */
function isSyncableEvidence(evidence: EvidenceRecord): boolean {
  return evidence.privacy_class !== "local_raw";
}

/** A canonical JSON string (sorted keys) so identical content always hashes to the identical batch id. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

/**
 * Build a sync batch from a local snapshot, applying the privacy filter. Only verified/approved claims
 * and non-local_raw evidence survive; measurements must already be aggregates (the type has no raw body).
 * The returned batch_id is a stable content hash — rebuilding the same snapshot yields the same id.
 */
export function buildSyncBatch(snapshot: LocalModelSnapshot, createdAt = new Date().toISOString()): SyncBatch {
  const claims = snapshot.claims.filter((claim) => isInjectableTrustState(claim.trust_state));
  const evidence = snapshot.evidence.filter(isSyncableEvidence);
  const reviewDecisions: ReviewDecisionRecord[] = snapshot.review_decisions ?? [];
  const measurements: AggregatedMeasurementRecord[] = snapshot.measurements ?? [];

  const body = {
    protocol_version: 1 as const,
    workspace_id: snapshot.workspace_id,
    repository_id: snapshot.repository_id,
    base_cursor: snapshot.base_cursor ?? null,
    entities: snapshot.entities,
    claims,
    evidence,
    relations: snapshot.relations,
    review_decisions: reviewDecisions,
    measurements,
  };
  const batchId = createHash("sha256").update(canonical(body)).digest("hex");

  const batch: SyncBatch = { ...body, batch_id: batchId, created_at: createdAt };
  assertNoRawPayload(batch);
  return batch;
}

/**
 * Defense in depth: refuse to emit a batch that still contains local_raw evidence. buildSyncBatch already
 * filters, but a caller that hand-assembles a batch must not be able to smuggle raw content past the wire.
 */
export function assertNoRawPayload(batch: SyncBatch): void {
  const leaked = batch.evidence.find((item) => item.privacy_class === "local_raw");
  if (leaked) {
    throw new Error(`sync batch would transmit local_raw evidence ${leaked.evidence_id}; raw payloads never sync`);
  }
}

/**
 * An append-only, dedupe-by-id local outbox. Enqueue is idempotent on batch_id, so a retried batch never
 * produces a second record; markSynced records the workspace acknowledgement. The default store is
 * in-memory; a durable store can be layered later without changing this contract.
 */
export class Outbox {
  private readonly records = new Map<string, OutboxRecord>();

  /** Enqueue a batch. Returns the stored record; a second enqueue of the same batch_id is a no-op. */
  enqueue(batch: SyncBatch): OutboxRecord {
    assertNoRawPayload(batch);
    const existing = this.records.get(batch.batch_id);
    if (existing) return existing;
    const record: OutboxRecord = {
      batch_id: batch.batch_id,
      workspace_id: batch.workspace_id,
      repository_id: batch.repository_id,
      batch,
      enqueued_at: new Date().toISOString(),
      synced_at: null,
    };
    this.records.set(batch.batch_id, record);
    return record;
  }

  /** Every not-yet-acknowledged batch, oldest first, ready to (re)push. */
  pending(): OutboxRecord[] {
    return [...this.records.values()]
      .filter((record) => record.synced_at === null)
      .sort((a, b) => a.enqueued_at.localeCompare(b.enqueued_at));
  }

  /** Mark a batch acknowledged by the workspace so it is no longer pending. Unknown ids are ignored. */
  markSynced(batchId: string, syncedAt = new Date().toISOString()): void {
    const record = this.records.get(batchId);
    if (record) record.synced_at = syncedAt;
  }

  get(batchId: string): OutboxRecord | undefined {
    return this.records.get(batchId);
  }

  size(): number {
    return this.records.size;
  }
}
