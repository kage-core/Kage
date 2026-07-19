// The team workspace audit log — append-only, tenant-scoped, and free of raw prompt/tool content.
//
// Every authority decision (a review accept/reject/supersede, an ownership change) writes exactly one
// audit_events row. The log is immutable: migration 005 installs a trigger that rejects any UPDATE or
// DELETE, so an event can only ever be appended. The metadata deliberately carries ONLY provenance —
// request id, prior/new version, and the human decision reason — never a raw prompt or tool payload.
import { randomUUID } from "node:crypto";
import type { Db } from "./db.js";

/** The provenance recorded with a decision. It is metadata only — never raw prompt/tool content. */
export interface AuditMetadata {
  request_id?: string;
  prior_version?: string | null;
  new_version?: string | null;
  reason?: string | null;
  [key: string]: string | null | undefined;
}

export interface AuditEvent {
  audit_id: string;
  workspace_id: string;
  actor_type: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string;
  metadata: AuditMetadata;
  occurred_at: string;
  audit_seq: string;
}

export interface RecordAuditInput {
  workspace_id: string;
  actor_type: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string;
  metadata: AuditMetadata;
}

/**
 * Append one immutable audit event. Runs on the caller's `Db`, so when a caller has an open transaction
 * on the shared connection (as reviewClaim does) the audit row lands atomically with the decision it
 * records. Returns the generated audit id.
 */
export async function recordAuditEvent(db: Db, input: RecordAuditInput): Promise<string> {
  const auditId = randomUUID();
  await db.query(
    `INSERT INTO audit_events(audit_id, workspace_id, actor_type, actor_id, action, target_type, target_id, metadata_json)
       VALUES($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      auditId,
      input.workspace_id,
      input.actor_type,
      input.actor_id,
      input.action,
      input.target_type,
      input.target_id,
      JSON.stringify(input.metadata),
    ],
  );
  return auditId;
}

/**
 * The audit trail for one target, oldest-first, scoped to a single workspace. Ordering is by the
 * monotonic audit_seq (not the possibly-tied occurred_at timestamp) so `events.at(-1)` is always the
 * most recent decision. Tenant isolation is in the query: another workspace's events are never returned.
 */
export async function forTarget(
  db: Db,
  workspaceId: string,
  targetType: string,
  targetId: string,
): Promise<AuditEvent[]> {
  const { rows } = await db.query<{
    audit_id: string;
    workspace_id: string;
    actor_type: string;
    actor_id: string;
    action: string;
    target_type: string;
    target_id: string;
    metadata_json: AuditMetadata;
    occurred_at: Date | string;
    audit_seq: string;
  }>(
    `SELECT audit_id, workspace_id, actor_type, actor_id, action, target_type, target_id,
            metadata_json, occurred_at, audit_seq
       FROM audit_events
      WHERE workspace_id = $1 AND target_type = $2 AND target_id = $3
      ORDER BY audit_seq`,
    [workspaceId, targetType, targetId],
  );
  return rows.map((row) => ({
    audit_id: row.audit_id,
    workspace_id: row.workspace_id,
    actor_type: row.actor_type,
    actor_id: row.actor_id,
    action: row.action,
    target_type: row.target_type,
    target_id: row.target_id,
    metadata: row.metadata_json,
    occurred_at: row.occurred_at instanceof Date ? row.occurred_at.toISOString() : String(row.occurred_at),
    audit_seq: String(row.audit_seq),
  }));
}
