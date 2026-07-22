// Build the local snapshot a daemon publishes to its workspace.
//
// This is the assembly point between the local repository model (Phase B), the local measurement records
// (Phase A) and the sync wire (Phase E). It reads only; it never mutates the local store, and it never
// reaches the network. `buildSyncBatch` then applies the privacy filter — only injectable claims and
// non-local_raw evidence survive — so a snapshot that over-collects still cannot over-transmit.
import type { LocalDatabase } from "../storage/database.js";
import type { Repository } from "../repo-model/repository.js";
import type { TransformationReceipt } from "../protocol/index.js";
import type { StoredContextDelivery } from "../storage/delivery-store.js";
import { collectTaskOutcomes } from "./task-outcomes.js";
import type { ClaimRecord, EvidenceRecord, LocalModelSnapshot, RelationRecord } from "./types.js";

export interface LocalSnapshotInput {
  model: Repository;
  database: LocalDatabase;
  receipts: { forTask(taskId: string): TransformationReceipt[] };
  deliveries: { forTask(taskId: string): StoredContextDelivery[] };
  workspaceId: string;
  repositoryId: string;
  /** Per-install salt for the actor pseudonym carried by task outcomes. */
  actorSalt: string;
  baseCursor?: string | null;
}

/**
 * Assemble everything this install would publish for ONE repository: its entities, their claims, the
 * evidence those claims anchor to, their relations, and the privacy-safe task outcomes that make team
 * metrics possible. Deterministic — same store, same salt, same snapshot.
 */
export function buildLocalSnapshot(input: LocalSnapshotInput): LocalModelSnapshot {
  const entities = input.model.listEntities(input.repositoryId);
  const claims: ClaimRecord[] = [];
  const relations: RelationRecord[] = [];
  const evidenceById = new Map<string, EvidenceRecord>();

  for (const entity of entities) {
    for (const claim of input.model.claimsForEntity(entity.entity_id)) {
      claims.push(claim);
      for (const anchor of input.model.evidenceForClaim(claim.claim_id)) {
        evidenceById.set(anchor.evidence.evidence_id, anchor.evidence);
      }
    }
    for (const relation of input.model.relationsFrom(entity.entity_id)) relations.push(relation);
  }

  return {
    workspace_id: input.workspaceId,
    repository_id: input.repositoryId,
    base_cursor: input.baseCursor ?? null,
    entities,
    claims,
    // Deterministic order so an unchanged store always hashes to the same batch id (and therefore
    // re-enqueues the same batch instead of a second copy of the same knowledge).
    evidence: [...evidenceById.values()].sort((a, b) => a.evidence_id.localeCompare(b.evidence_id)),
    relations,
    task_outcomes: collectTaskOutcomes(
      { database: input.database, receipts: input.receipts, deliveries: input.deliveries },
      { actorSalt: input.actorSalt, repositoryId: input.repositoryId },
    ),
  };
}
