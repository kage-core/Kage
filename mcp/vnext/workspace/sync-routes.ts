// Workspace-side landing for pushed sync batches, and the permission-scoped pull.
//
// Three guarantees are enforced HERE, in the store, not merely in the HTTP handler:
//  1. IDEMPOTENT. A batch applies exactly once. The batch_id is claimed atomically in sync_batches with
//     INSERT ... ON CONFLICT DO NOTHING; a replay finds the id present and applies nothing, so no record
//     is ever duplicated.
//  2. TENANT-SCOPED. Every write uses the SERVER-resolved principal.workspace_id as the tenant column,
//     never the client-supplied batch.workspace_id. A pull filters by the principal's workspace and its
//     repository allow-list, so a cross-tenant or out-of-scope read returns zero rows.
//  3. RAW STAYS OUT. assertNoRawPayload rejects a batch that still carries local_raw evidence before any
//     row is written.
import { createHash } from "node:crypto";
import type { Db } from "./db.js";
import type { Principal } from "./auth/types.js";
import { scopeAllows } from "./auth/authorize.js";
import { assertNoRawPayload } from "../sync/outbox.js";
import { mergeConcurrentClaims } from "../sync/conflicts.js";
import type { ClaimRecord } from "../repo-model/types.js";
import type { SyncBatch } from "../sync/types.js";

export interface ApplyResult {
  batch_id: string;
  status: "applied" | "duplicate";
  applied_counts: Record<string, number>;
}

/** Repositories a principal may pull from within its own workspace ("all" => the whole workspace). */
function permittedRepositories(principal: Principal): string[] | "all" {
  return principal.repository_ids;
}

/**
 * Apply a pushed batch under the SERVER-resolved principal. Idempotent by batch_id and fully tenant-scoped:
 * the tenant of every write is principal.workspace_id, never anything the client supplied.
 */
export async function applyBatch(db: Db, principal: Principal, batch: SyncBatch): Promise<ApplyResult> {
  assertNoRawPayload(batch);
  const workspaceId = principal.workspace_id;
  const repositoryId = batch.repository_id;

  const counts: Record<string, number> = {
    entities: batch.entities.length,
    claims: batch.claims.length,
    evidence: batch.evidence.length,
    relations: batch.relations.length,
    review_decisions: batch.review_decisions.length,
    measurements: batch.measurements.length,
  };

  await db.query("BEGIN");
  try {
    // Claim the batch id atomically. If it is already present, this is a replay: apply nothing.
    const claimed = await db.query(
      `INSERT INTO sync_batches(workspace_id, batch_id, repository_id, base_cursor, applied_counts)
         VALUES($1, $2, $3, $4, $5)
       ON CONFLICT (workspace_id, batch_id) DO NOTHING`,
      [workspaceId, batch.batch_id, repositoryId, batch.base_cursor, JSON.stringify(counts)],
    );
    if (claimed.rowCount === 0) {
      await db.query("COMMIT");
      return { batch_id: batch.batch_id, status: "duplicate", applied_counts: {} };
    }

    for (const entity of batch.entities) {
      await db.query(
        `INSERT INTO workspace_entities(workspace_id, repository_id, entity_id, model_version, record_json, updated_at)
           VALUES($1, $2, $3, $4, $5, $6)
         ON CONFLICT (workspace_id, repository_id, entity_id)
           DO UPDATE SET record_json = EXCLUDED.record_json, updated_at = EXCLUDED.updated_at`,
        [workspaceId, repositoryId, entity.entity_id, 1, JSON.stringify(entity), entity.updated_at],
      );
    }

    for (const claim of batch.claims) {
      await applyClaim(db, workspaceId, repositoryId, claim);
    }

    for (const evidence of batch.evidence) {
      await db.query(
        `INSERT INTO workspace_evidence(workspace_id, repository_id, evidence_id, privacy_class, metadata_json, object_key, updated_at)
           VALUES($1, $2, $3, $4, $5, NULL, $6)
         ON CONFLICT (workspace_id, repository_id, evidence_id)
           DO UPDATE SET privacy_class = EXCLUDED.privacy_class, metadata_json = EXCLUDED.metadata_json, updated_at = EXCLUDED.updated_at`,
        [workspaceId, repositoryId, evidence.evidence_id, evidence.privacy_class, JSON.stringify(evidence), evidence.observed_at],
      );
    }

    for (const relation of batch.relations) {
      await db.query(
        `INSERT INTO workspace_relations(workspace_id, repository_id, relation_id, from_entity_id, relation_type, to_entity_id, record_json, updated_at)
           VALUES($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (workspace_id, repository_id, relation_id)
           DO UPDATE SET record_json = EXCLUDED.record_json, updated_at = EXCLUDED.updated_at`,
        [workspaceId, repositoryId, relation.relation_id, relation.from_entity_id, relation.relation_type, relation.to_entity_id, JSON.stringify(relation), relation.created_at],
      );
    }

    for (const decision of batch.review_decisions) {
      await db.query(
        `INSERT INTO workspace_review_decisions(workspace_id, repository_id, decision_id, claim_id, action, actor_id, expected_version, decision_note, decided_at)
           VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (workspace_id, repository_id, decision_id) DO NOTHING`,
        [workspaceId, repositoryId, decision.decision_id, decision.claim_id, decision.action, decision.actor_id, decision.expected_version, decision.decision_note, decision.decided_at],
      );
    }

    for (const measurement of batch.measurements) {
      await db.query(
        `INSERT INTO workspace_measurements(workspace_id, repository_id, measurement_id, metric, window_start, window_end, sample_count, values_json)
           VALUES($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (workspace_id, repository_id, measurement_id) DO NOTHING`,
        [workspaceId, repositoryId, measurement.measurement_id, measurement.metric, measurement.window_start, measurement.window_end, measurement.sample_count, JSON.stringify(measurement.values)],
      );
    }

    await db.query("COMMIT");
    return { batch_id: batch.batch_id, status: "applied", applied_counts: counts };
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
}

/**
 * Land a single claim with deterministic conflict handling. A new claim inserts; a linear supersede
 * updates the head; identical content is a no-op; a concurrent divergence PRESERVES both versions in
 * workspace_claim_conflicts and leaves the stored head untouched (never a silent overwrite).
 */
async function applyClaim(
  db: Db,
  workspaceId: string,
  repositoryId: string,
  incoming: ClaimRecord,
): Promise<void> {
  const existing = await db.query<{ record_json: ClaimRecord }>(
    `SELECT record_json FROM workspace_claims WHERE workspace_id = $1 AND repository_id = $2 AND claim_id = $3`,
    [workspaceId, repositoryId, incoming.claim_id],
  );
  if (existing.rows.length === 0) {
    await insertClaim(db, workspaceId, repositoryId, incoming);
    return;
  }
  const current = existing.rows[0].record_json;
  const merge = mergeConcurrentClaims(current, incoming);
  if (merge.action === "fast_forward" && merge.winner === incoming) {
    await insertClaim(db, workspaceId, repositoryId, incoming);
    return;
  }
  if (merge.action === "review_conflict") {
    const conflictId = createHash("sha256")
      .update(`${incoming.claim_id}:${current.normalized_content}:${incoming.normalized_content}`)
      .digest("hex");
    await db.query(
      `INSERT INTO workspace_claim_conflicts(workspace_id, repository_id, conflict_id, claim_id, incoming_json, existing_json)
         VALUES($1, $2, $3, $4, $5, $6)
       ON CONFLICT (workspace_id, repository_id, conflict_id) DO NOTHING`,
      [workspaceId, repositoryId, conflictId, incoming.claim_id, JSON.stringify(incoming), JSON.stringify(current)],
    );
    return;
  }
  // identical, or a fast_forward whose winner is the version already stored: nothing to write.
}

async function insertClaim(db: Db, workspaceId: string, repositoryId: string, claim: ClaimRecord): Promise<void> {
  await db.query(
    `INSERT INTO workspace_claims(workspace_id, repository_id, claim_id, entity_id, trust_state, impact_class, record_json, updated_at)
       VALUES($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (workspace_id, repository_id, claim_id)
       DO UPDATE SET trust_state = EXCLUDED.trust_state, impact_class = EXCLUDED.impact_class, record_json = EXCLUDED.record_json, updated_at = EXCLUDED.updated_at`,
    [workspaceId, repositoryId, claim.claim_id, claim.entity_id, claim.trust_state, claim.impact_class, JSON.stringify(claim), claim.updated_at],
  );
}

/** Count claims stored for a workspace (all permitted repositories). Used by tests and metrics. */
export async function countClaims(db: Db, workspaceId: string): Promise<number> {
  const { rows } = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM workspace_claims WHERE workspace_id = $1`,
    [workspaceId],
  );
  return Number.parseInt(rows[0]?.count ?? "0", 10);
}

export interface PullResult {
  cursor: string | null;
  entities: unknown[];
  claims: unknown[];
}

/**
 * Return the knowledge a principal may pull: scoped to the principal's workspace AND its repository
 * allow-list. A cross-tenant or out-of-scope row is never returned — the filter is in the query, not the
 * caller. `cursor` (an updated_at high-water mark) returns only changes strictly after it.
 */
export async function pullChanges(db: Db, principal: Principal, cursor: string | null): Promise<PullResult> {
  const workspaceId = principal.workspace_id;
  const repos = permittedRepositories(principal);
  const params: unknown[] = [workspaceId];
  let repoFilter = "";
  if (repos !== "all") {
    if (repos.length === 0) return { cursor, entities: [], claims: [] };
    params.push(repos);
    repoFilter = ` AND repository_id = ANY($${params.length})`;
  }
  let cursorFilter = "";
  if (cursor) {
    params.push(cursor);
    cursorFilter = ` AND updated_at > $${params.length}`;
  }

  const claims = await db.query(
    `SELECT record_json, updated_at FROM workspace_claims WHERE workspace_id = $1${repoFilter}${cursorFilter} ORDER BY updated_at`,
    params,
  );
  const entities = await db.query(
    `SELECT record_json, updated_at FROM workspace_entities WHERE workspace_id = $1${repoFilter}${cursorFilter} ORDER BY updated_at`,
    params,
  );
  const nextCursor = [...claims.rows, ...entities.rows]
    .map((row) => String((row as { updated_at: string }).updated_at))
    .sort()
    .at(-1) ?? cursor;
  return {
    cursor: nextCursor,
    entities: entities.rows.map((row) => (row as { record_json: unknown }).record_json),
    claims: claims.rows.map((row) => (row as { record_json: unknown }).record_json),
  };
}

/** True when this principal may push/pull for the named repository (both action and scope must allow). */
export function maySyncRepository(principal: Principal, repositoryId: string): boolean {
  return scopeAllows(principal, repositoryId);
}
