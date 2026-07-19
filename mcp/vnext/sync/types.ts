// Wire shapes for the local -> workspace synchronization outbox.
//
// A SyncBatch is the ONLY thing that ever leaves a local daemon for the team workspace. It carries
// approved/verified model records and permitted (already-aggregated) measurements — never raw prompts
// or tool payloads. The privacy discipline is structural: there is no field on any record here that can
// hold a raw prompt/tool body, and buildSyncBatch() drops any evidence whose privacy_class is local_raw
// before a batch is ever formed. The batch_id is a stable idempotency key: the workspace applies a batch
// exactly once, so a replay (offline retry, at-least-once delivery) is a no-op.
import type {
  ClaimRecord,
  EntityRecord,
  EvidenceRecord,
  RelationRecord,
} from "../repo-model/types.js";

export type {
  ClaimRecord,
  EntityRecord,
  EvidenceRecord,
  RelationRecord,
} from "../repo-model/types.js";

/** A team review decision replicated to the workspace. Metadata only — never the raw prompt/tool text. */
export interface ReviewDecisionRecord {
  decision_id: string;
  repository_id: string;
  claim_id: string;
  action: "accept" | "reject" | "supersede";
  actor_id: string;
  /** The claim version the reviewer acted on; drift against the stored head is a conflict, not a write. */
  expected_version: string | null;
  decision_note: string | null;
  decided_at: string;
}

/**
 * An already-aggregated, privacy-safe measurement. This is a rollup (counts, summed cost, sample size)
 * over a window — never a per-request receipt, never a raw body. The pilot credit and team metrics read
 * these; nothing here is reversible to an individual prompt.
 */
export interface AggregatedMeasurementRecord {
  measurement_id: string;
  repository_id: string;
  metric: string;
  window_start: string;
  window_end: string;
  sample_count: number;
  /** Opaque numeric aggregates (e.g. summed measured input cost). Never a raw payload. */
  values: Record<string, number>;
}

export interface SyncBatch {
  protocol_version: 1;
  batch_id: string;
  workspace_id: string;
  repository_id: string;
  /** The workspace cursor this batch was built against, for ordered pull; null for a first push. */
  base_cursor: string | null;
  entities: EntityRecord[];
  claims: ClaimRecord[];
  evidence: EvidenceRecord[];
  relations: RelationRecord[];
  review_decisions: ReviewDecisionRecord[];
  measurements: AggregatedMeasurementRecord[];
  created_at: string;
}

/** The local, repository-scoped knowledge a daemon wants to publish. buildSyncBatch filters it for privacy. */
export interface LocalModelSnapshot {
  workspace_id: string;
  repository_id: string;
  base_cursor?: string | null;
  entities: EntityRecord[];
  claims: ClaimRecord[];
  evidence: EvidenceRecord[];
  relations: RelationRecord[];
  review_decisions?: ReviewDecisionRecord[];
  measurements?: AggregatedMeasurementRecord[];
}

/** A single immutable outbox entry: one batch, its stable id, and whether it has been acknowledged. */
export interface OutboxRecord {
  batch_id: string;
  workspace_id: string;
  repository_id: string;
  batch: SyncBatch;
  enqueued_at: string;
  synced_at: string | null;
}

/**
 * The result of reconciling two versions of the SAME claim id. Deterministic: identical content is a
 * no-op, a linear supersede fast-forwards to the newer version, and a genuine concurrent divergence
 * preserves BOTH versions and raises a review conflict rather than silently dropping one (last-write-wins
 * loses knowledge). Ordering of preserved_versions is deterministic so the outcome never depends on
 * arrival order.
 */
export type ClaimMergeAction = "identical" | "fast_forward" | "review_conflict";

export interface ClaimMergeResult {
  action: ClaimMergeAction;
  /** The version to keep when the merge is unambiguous; null when a human must choose (review_conflict). */
  winner: ClaimRecord | null;
  /** Every version kept: one for identical/fast_forward, both for a review_conflict. */
  preserved_versions: ClaimRecord[];
}
