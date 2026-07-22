// Data retention: how long each CATEGORY of workspace data is kept, and the job that enforces it.
//
// WHY CATEGORIES INSTEAD OF ONE NUMBER. "Delete everything older than 90 days" is the wrong shape for
// this product. Evidence metadata and per-task receipts are the operationally sensitive, high-volume
// records a customer usually wants gone quickly. Aggregated metrics carry no individual anything and
// are the thing a team looks back on across quarters. Audit is the record of who authorised what, and
// deleting it early destroys the accountability the review model exists to create. Approved knowledge
// is the customer's actual work product — a retention timer on it would delete the value they built.
// So each category gets its own dial, its own default, and its own floor.
//
// THE DEFAULTS ARE CONSERVATIVE IN DIFFERENT DIRECTIONS ON PURPOSE:
//   - evidence_metadata  180 days — short-lived operational detail.
//   - task_receipts      365 days — a year of measurement, enough for an annual comparison.
//   - aggregated_metrics NULL     — keep: it is already aggregated and carries no individual record.
//   - audit              2555 days (7 years) — the accountability record; a floor of 1 year applies.
//   - approved_knowledge NULL     — keep: this is the customer's work, not our telemetry.
//
// A NULL retention means "keep indefinitely" and is an explicit, stored choice — never a missing value
// that a later code path could reinterpret as zero.
//
// THE AUDIT PURGE IS THE ONE PRIVILEGED OPERATION HERE. `audit_events` rejects UPDATE always and DELETE
// unless the transaction-local `kage.retention_purge` flag is set (migration 011). This module is the
// only place that sets it, it sets it with `set_config(..., true)` so it dies with the transaction, and
// it sets it only for the audit category. Every other category deletes through ordinary SQL.
import { randomUUID } from "node:crypto";
import type { Db } from "../db.js";
import { recordAuditEvent } from "../audit.js";

export type RetentionCategory =
  | "evidence_metadata"
  | "task_receipts"
  | "aggregated_metrics"
  | "audit"
  | "approved_knowledge";

export const RETENTION_CATEGORIES: readonly RetentionCategory[] = [
  "evidence_metadata",
  "task_receipts",
  "aggregated_metrics",
  "audit",
  "approved_knowledge",
];

/** Retention in days when a workspace has expressed no preference. `null` means keep indefinitely. */
export const DEFAULT_RETENTION_DAYS: Readonly<Record<RetentionCategory, number | null>> = Object.freeze({
  evidence_metadata: 180,
  task_receipts: 365,
  aggregated_metrics: null,
  audit: 2555,
  approved_knowledge: null,
});

/**
 * The shortest retention a workspace may configure. The audit floor is the important one: an operator
 * who could set audit retention to a day could erase the record of their own decisions the next morning,
 * which would make the append-only log decorative.
 */
export const MINIMUM_RETENTION_DAYS: Readonly<Record<RetentionCategory, number>> = Object.freeze({
  evidence_metadata: 7,
  task_receipts: 7,
  aggregated_metrics: 30,
  audit: 365,
  approved_knowledge: 30,
});

export type RetentionErrorCode = "unknown_category" | "below_minimum";

export class RetentionPolicyError extends Error {
  constructor(
    readonly code: RetentionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "RetentionPolicyError";
  }
}

export interface RetentionPolicy {
  workspace_id: string;
  category: RetentionCategory;
  retention_days: number | null;
  /** "default" when nothing is stored for this category, "configured" when the workspace set it. */
  source: "default" | "configured";
  updated_by: string | null;
  updated_at: string | null;
}

/**
 * Every category, always — configured values overlaid on the defaults. Returning the full set (rather
 * than only stored rows) means a UI and an operator see the policy actually in force, not a blank where
 * a default silently applies.
 */
export async function loadRetentionPolicies(db: Db, workspaceId: string): Promise<RetentionPolicy[]> {
  const { rows } = await db.query<{
    category: RetentionCategory;
    retention_days: number | null;
    updated_by: string;
    updated_at: Date | string;
  }>(
    `SELECT category, retention_days, updated_by, updated_at
       FROM workspace_retention_policies
      WHERE workspace_id = $1`,
    [workspaceId],
  );
  const configured = new Map(rows.map((row) => [row.category, row]));
  return RETENTION_CATEGORIES.map((category) => {
    const row = configured.get(category);
    if (!row) {
      return {
        workspace_id: workspaceId,
        category,
        retention_days: DEFAULT_RETENTION_DAYS[category],
        source: "default" as const,
        updated_by: null,
        updated_at: null,
      };
    }
    return {
      workspace_id: workspaceId,
      category,
      retention_days: row.retention_days,
      source: "configured" as const,
      updated_by: row.updated_by,
      updated_at:
        row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
    };
  });
}

/** Set one category's retention. `null` days means keep indefinitely, which is always permitted. */
export async function setRetentionPolicy(
  db: Db,
  input: {
    workspace_id: string;
    category: RetentionCategory;
    retention_days: number | null;
    actor_id: string;
  },
): Promise<RetentionPolicy> {
  if (!RETENTION_CATEGORIES.includes(input.category)) {
    throw new RetentionPolicyError("unknown_category", `unknown retention category ${input.category}`);
  }
  if (input.retention_days !== null) {
    const floor = MINIMUM_RETENTION_DAYS[input.category];
    if (!Number.isInteger(input.retention_days) || input.retention_days < floor) {
      throw new RetentionPolicyError(
        "below_minimum",
        `${input.category} retention must be at least ${floor} days`,
      );
    }
  }
  return db.transaction(async (tx) => {
    await tx.query(
      `INSERT INTO workspace_retention_policies(workspace_id, category, retention_days, updated_by)
         VALUES($1, $2, $3, $4)
       ON CONFLICT (workspace_id, category) DO UPDATE
         SET retention_days = EXCLUDED.retention_days,
             updated_by = EXCLUDED.updated_by,
             updated_at = now()`,
      [input.workspace_id, input.category, input.retention_days, input.actor_id],
    );
    // A retention change is itself an authority decision: who shortened the record, and when.
    await recordAuditEvent(tx, {
      workspace_id: input.workspace_id,
      actor_type: "user",
      actor_id: input.actor_id,
      action: "retention.policy.set",
      target_type: "retention_category",
      target_id: input.category,
      metadata: {
        new_version: input.retention_days === null ? "indefinite" : `${input.retention_days}d`,
      },
    });
    const policies = await loadRetentionPolicies(tx, input.workspace_id);
    return policies.find((policy) => policy.category === input.category) as RetentionPolicy;
  });
}

/** Where each category's rows live and which column dates them. Tenant scoping is added by the runner. */
const CATEGORY_TARGETS: Readonly<Record<RetentionCategory, { table: string; column: string }>> =
  Object.freeze({
    evidence_metadata: { table: "workspace_evidence", column: "updated_at" },
    task_receipts: { table: "workspace_task_outcomes", column: "started_at" },
    aggregated_metrics: { table: "workspace_measurements", column: "window_end" },
    audit: { table: "audit_events", column: "occurred_at" },
    approved_knowledge: { table: "workspace_claims", column: "updated_at" },
  });

export interface RetentionRunResult {
  workspace_id: string;
  ran_at: string;
  deleted: Record<RetentionCategory, number>;
  cutoffs: Record<RetentionCategory, string | null>;
}

/**
 * Enforce a workspace's retention policy. Tenant-scoped: every DELETE carries `workspace_id = $1`, so a
 * run for one customer can never touch another's rows even if two tenants share a table.
 *
 * Each category runs in its OWN transaction. A failure in one category (a lock, a constraint) therefore
 * does not roll back the categories that already succeeded, and the run row records what actually
 * happened per category rather than an all-or-nothing claim.
 */
export async function applyRetention(
  db: Db,
  workspaceId: string,
  nowMs: number = Date.now(),
): Promise<RetentionRunResult> {
  const policies = await loadRetentionPolicies(db, workspaceId);
  const deleted = {} as Record<RetentionCategory, number>;
  const cutoffs = {} as Record<RetentionCategory, string | null>;
  const ranAt = new Date(nowMs).toISOString();

  for (const policy of policies) {
    if (policy.retention_days === null) {
      // "Keep indefinitely" is a decision, and it is recorded as a run with a null cutoff so an operator
      // can see the job considered this category rather than skipped it by accident.
      deleted[policy.category] = 0;
      cutoffs[policy.category] = null;
      await recordRun(db, workspaceId, policy.category, null, 0);
      continue;
    }
    const cutoff = new Date(nowMs - policy.retention_days * 24 * 60 * 60 * 1000).toISOString();
    cutoffs[policy.category] = cutoff;
    const target = CATEGORY_TARGETS[policy.category];
    const count = await db.transaction(async (tx) => {
      if (policy.category === "audit") {
        // The ONLY place this flag is ever set. `true` = transaction-local: it is discarded on commit or
        // rollback, so no other statement on any other connection inherits permission to delete audit.
        await tx.query(`SELECT set_config('kage.retention_purge', 'on', true)`);
      }
      const result = await tx.query(
        `DELETE FROM ${target.table} WHERE workspace_id = $1 AND ${target.column} < $2`,
        [workspaceId, cutoff],
      );
      return result.rowCount;
    });
    deleted[policy.category] = count;
    await recordRun(db, workspaceId, policy.category, cutoff, count);
  }

  return { workspace_id: workspaceId, ran_at: ranAt, deleted, cutoffs };
}

async function recordRun(
  db: Db,
  workspaceId: string,
  category: RetentionCategory,
  cutoff: string | null,
  deleted: number,
): Promise<void> {
  await db.query(
    `INSERT INTO workspace_retention_runs(run_id, workspace_id, category, cutoff, deleted_count)
       VALUES($1, $2, $3, $4, $5)`,
    [randomUUID(), workspaceId, category, cutoff, deleted],
  );
}
