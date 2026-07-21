// Privacy-safe team metrics for the Kage workspace.
//
// WHAT A TEAM METRIC IS ALLOWED TO BE. A task outcome record carries identifiers (task/repository/
// agent ids), classes (mode, measurement quality, delivery status, verification outcome), counts, and
// measured numbers. It carries NO prompt text, no tool payload, no model response, no file contents,
// and no claim body — and the type, the table, and `assertNoRawTaskOutcomeField` all enforce that
// independently, so a daemon cannot smuggle a raw payload into "metrics".
//
// THREE HONESTY RULES, inherited from gateway/cohort-metrics.ts and never relaxed here:
//
//   1. MEASURED OR NULL, never zero. Exact economics are computed ONLY over records whose measurement
//      quality is `exact` AND which carry a measured both-sided cost. A partial or unavailable record
//      contributes its presence to coverage and nothing else. An empty window reports null everywhere,
//      not a flattering $0.00.
//
//   2. EXACT REQUEST ECONOMICS ARE SEPARATE FROM COHORT OUTCOME TRENDS. `exact_cost` (dollars, measured
//      per request) and `time_to_verified_change` (milliseconds, a human-behaviour trend) are different
//      sections with different units and different exactness. Nothing in this module multiplies one by
//      the other; only an explicitly configured customer cost model may do that (see pilot-report.ts).
//
//   3. SMALL COHORTS ARE SUPPRESSED, NOT PUBLISHED. Below MINIMUM_COHORT tasks, the human-behaviour
//      trends (time to verified change, review burden per task, reuse rate, failed-open rate) are null
//      with a machine-readable `suppression_reason`, because a "team average" over three tasks is an
//      individual's record wearing a team's clothes. Machine measurements of the request path (exact
//      cost, latency, coverage counts) are not person-identifying and are reported with their own
//      exactness instead.
//
// TENANCY. Every query in this module filters by the SERVER-resolved `principal.workspace_id` and the
// principal's repository allow-list. There is no code path that accepts a client-supplied tenant.
import type { Db } from "./db.js";
import type { Principal } from "./auth/types.js";
import { scopeAllows } from "./auth/authorize.js";
import { interpolatedPercentile } from "../gateway/cohort-metrics.js";

/**
 * The k-anonymity floor for publishing a human-behaviour trend. Five is the smallest cohort at which a
 * median is not simply one person's task, and it is the number the suppression reason names so a reader
 * can tell "suppressed" apart from "unmeasured".
 */
export const MINIMUM_COHORT = 5;

export type MeasurementQualityClass = "exact" | "partial" | "unavailable";
export type TaskMode = "audit" | "assist" | "protect";
export type TaskDeliveryStatus = "delivered" | "failed_open" | "skipped";
export type TaskVerificationOutcome = "verified" | "unverified" | "failed" | "unavailable";

/**
 * One aggregated, privacy-safe task outcome. This is what a local daemon is permitted to sync for
 * metrics: the exact request totals, the quality class, latency, delivery status, the knowledge ids
 * that were reused, the verification outcome, and the task timestamps.
 */
export interface TeamTaskOutcomeRecord {
  task_id: string;
  repository_id: string;
  agent_surface: string;
  mode: TaskMode;
  measurement_quality: MeasurementQualityClass;
  /** after − before over the whole task, measured on BOTH sides; null when not exactly measured. */
  net_input_cost_delta_usd: number | null;
  /** Kage's own measured processing cost; null (never 0) when nothing measured it. */
  kage_processing_cost_usd: number | null;
  latency_ms: number | null;
  delivery_status: TaskDeliveryStatus;
  verification_outcome: TaskVerificationOutcome;
  /** Ids of reused knowledge records — identifiers only, never the claim bodies. */
  knowledge_ids_reused: string[];
  review_decisions: number;
  started_at: string;
  ended_at: string | null;
  /** When the change this task produced became verified; null when it never did (or was not measured). */
  verified_at: string | null;
}

/** The exact field set a task outcome may carry. Anything else is refused as a possible raw payload. */
const ALLOWED_TASK_OUTCOME_FIELDS: ReadonlySet<string> = new Set<keyof TeamTaskOutcomeRecord>([
  "task_id",
  "repository_id",
  "agent_surface",
  "mode",
  "measurement_quality",
  "net_input_cost_delta_usd",
  "kage_processing_cost_usd",
  "latency_ms",
  "delivery_status",
  "verification_outcome",
  "knowledge_ids_reused",
  "review_decisions",
  "started_at",
  "ended_at",
  "verified_at",
]);

/**
 * Refuse a task outcome that carries any field outside the allow-list. This is the metrics-path twin of
 * sync/outbox.ts `assertNoRawPayload`: privacy is enforced by an allow-list (what MAY travel), never by
 * a deny-list of payload names that a new field could slip past.
 */
export function assertNoRawTaskOutcomeField(record: TeamTaskOutcomeRecord): void {
  for (const key of Object.keys(record as unknown as Record<string, unknown>)) {
    if (!ALLOWED_TASK_OUTCOME_FIELDS.has(key)) {
      throw new Error(
        `task outcome carries unpermitted field "${key}"; team metrics transmit identifiers, classes and counts only`,
      );
    }
  }
}

// ---------------------------------------------------------------------------------------------
// the report
// ---------------------------------------------------------------------------------------------

/** Why an outcome trend is absent. Null means "published"; an unmeasured trend is simply null. */
export type SuppressionReason = "minimum_cohort_5";

export interface MeasurementQualityBreakdown {
  exact: number;
  partial: number;
  unavailable: number;
  /** Percentage of tasks with an exact measurement, or null when there are no tasks at all. */
  coverage: number | null;
}

/** EXACT request economics. Dollars, measured per request, never derived from a time trend. */
export interface ExactCostSection {
  receipts: number;
  p50_net_input_cost_delta_usd: number | null;
  p95_net_input_cost_delta_usd: number | null;
  total_net_input_cost_delta_usd: number | null;
  kage_processing_cost_receipts: number;
  kage_processing_cost_usd: number | null;
}

/** A COHORT time trend. Explicitly carries its unit so it can never be mistaken for money. */
export interface TimeTrendSection {
  unit: "milliseconds";
  samples: number;
  p50_ms: number | null;
  p95_ms: number | null;
}

export interface TeamMetricsReport {
  window_start: string | null;
  window_end: string | null;
  tasks: number;
  repositories: number;
  agents: number;
  measurement_quality: MeasurementQualityBreakdown;
  exact_cost: ExactCostSection;
  latency: { samples: number; p50_ms: number | null; p95_ms: number | null };
  verified_reuse: {
    tasks_with_reuse: number;
    distinct_knowledge_ids: number;
    /** Percentage of tasks that reused verified knowledge; suppressed below the cohort floor. */
    rate: number | null;
  };
  /** Null below the cohort floor, and null when nothing measured a verified change. */
  time_to_verified_change: TimeTrendSection | null;
  review_burden: { decisions: number; decisions_per_task: number | null };
  failed_open: { tasks: number; rate: number | null };
  suppression_reason: SuppressionReason | null;
  caveats: string[];
}

function percent(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 10_000) / 100;
}

function round(value: number | null, places = 6): number | null {
  if (value === null) return null;
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function measuredNumbers(values: readonly (number | null)[]): number[] {
  return values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

/**
 * Roll privacy-safe task outcomes into a team report. Pure and deterministic: no I/O, no wall clock,
 * no randomness — the same records always produce the same report.
 */
export function buildTeamMetrics(records: readonly TeamTaskOutcomeRecord[]): TeamMetricsReport {
  const tasks = records.length;
  const caveats: string[] = [];

  let exact = 0;
  let partial = 0;
  let unavailable = 0;
  for (const record of records) {
    if (record.measurement_quality === "exact") exact += 1;
    else if (record.measurement_quality === "partial") partial += 1;
    else unavailable += 1;
  }

  // EXACT economics: the quality class governs. A cost number attached to a partial/unavailable record
  // is not admissible evidence — one measured side cannot produce an honest delta.
  const exactRecords = records.filter((record) => record.measurement_quality === "exact");
  const costDeltas = measuredNumbers(exactRecords.map((record) => record.net_input_cost_delta_usd));
  const kageCosts = measuredNumbers(exactRecords.map((record) => record.kage_processing_cost_usd));
  const latencies = measuredNumbers(records.map((record) => record.latency_ms));

  const reuseTasks = records.filter((record) => record.knowledge_ids_reused.length > 0).length;
  const distinctKnowledge = new Set<string>();
  for (const record of records) for (const id of record.knowledge_ids_reused) distinctKnowledge.add(id);

  const decisions = records.reduce((sum, record) => sum + record.review_decisions, 0);
  const failedOpen = records.filter((record) => record.delivery_status === "failed_open").length;

  const timeToVerified = measuredNumbers(
    records.map((record) =>
      record.verified_at ? Date.parse(record.verified_at) - Date.parse(record.started_at) : null,
    ),
  ).filter((value) => value >= 0);

  const timestamps = records.map((record) => Date.parse(record.started_at)).filter(Number.isFinite);
  const endTimestamps = records
    .map((record) => Date.parse(record.ended_at ?? record.started_at))
    .filter(Number.isFinite);

  // The k-anonymity gate. Below the floor, every human-behaviour trend is withheld with a reason.
  const suppressed = tasks < MINIMUM_COHORT;
  const suppressionReason: SuppressionReason | null = suppressed ? "minimum_cohort_5" : null;

  if (tasks === 0) {
    caveats.push("no task outcomes recorded in this window; every metric is unavailable, not zero");
  } else if (suppressed) {
    caveats.push(
      `outcome trends suppressed: a cohort of ${tasks} task(s) is below the privacy minimum of ${MINIMUM_COHORT} (minimum_cohort_5)`,
    );
  }
  if (tasks > 0 && exact < tasks) {
    caveats.push(
      `exact request economics cover ${exact} of ${tasks} task(s); ${partial} partial and ${unavailable} unavailable measurement(s) contribute nothing to the cost figures`,
    );
  }
  if (tasks > 0 && timeToVerified.length === 0) {
    caveats.push("no task recorded a verified change, so the time-to-verified-change trend is unavailable");
  }
  caveats.push(
    "exact request economics (usd) and cohort outcome trends (milliseconds) are reported separately and are never multiplied into a single savings number",
  );

  return {
    window_start: timestamps.length ? new Date(Math.min(...timestamps)).toISOString() : null,
    window_end: endTimestamps.length ? new Date(Math.max(...endTimestamps)).toISOString() : null,
    tasks,
    repositories: new Set(records.map((record) => record.repository_id)).size,
    agents: new Set(records.map((record) => record.agent_surface)).size,
    measurement_quality: {
      exact,
      partial,
      unavailable,
      coverage: percent(exact, tasks),
    },
    exact_cost: {
      receipts: costDeltas.length,
      p50_net_input_cost_delta_usd: round(interpolatedPercentile(costDeltas, 0.5)),
      p95_net_input_cost_delta_usd: round(interpolatedPercentile(costDeltas, 0.95)),
      total_net_input_cost_delta_usd: costDeltas.length
        ? round(costDeltas.reduce((sum, value) => sum + value, 0))
        : null,
      kage_processing_cost_receipts: kageCosts.length,
      kage_processing_cost_usd: kageCosts.length
        ? round(kageCosts.reduce((sum, value) => sum + value, 0))
        : null,
    },
    latency: {
      samples: latencies.length,
      p50_ms: interpolatedPercentile(latencies, 0.5),
      p95_ms: interpolatedPercentile(latencies, 0.95),
    },
    verified_reuse: {
      tasks_with_reuse: reuseTasks,
      distinct_knowledge_ids: distinctKnowledge.size,
      rate: suppressed ? null : percent(reuseTasks, tasks),
    },
    time_to_verified_change:
      suppressed || timeToVerified.length === 0
        ? null
        : {
            unit: "milliseconds",
            samples: timeToVerified.length,
            p50_ms: interpolatedPercentile(timeToVerified, 0.5),
            p95_ms: interpolatedPercentile(timeToVerified, 0.95),
          },
    review_burden: {
      decisions,
      decisions_per_task: suppressed || tasks === 0 ? null : round(decisions / tasks, 3),
    },
    failed_open: {
      tasks: failedOpen,
      rate: suppressed ? null : percent(failedOpen, tasks),
    },
    suppression_reason: suppressionReason,
    caveats,
  };
}

// ---------------------------------------------------------------------------------------------
// tenant-scoped storage
// ---------------------------------------------------------------------------------------------

interface TaskOutcomeRow {
  task_id: string;
  repository_id: string;
  agent_surface: string;
  mode: TaskMode;
  measurement_quality: MeasurementQualityClass;
  net_input_cost_delta_usd: number | null;
  kage_processing_cost_usd: number | null;
  latency_ms: number | null;
  delivery_status: TaskDeliveryStatus;
  verification_outcome: TaskVerificationOutcome;
  knowledge_ids_reused: string[] | null;
  review_decisions: number;
  started_at: Date | string;
  ended_at: Date | string | null;
  verified_at: Date | string | null;
}

function isoOrNull(value: Date | string | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function rowToRecord(row: TaskOutcomeRow): TeamTaskOutcomeRecord {
  return {
    task_id: row.task_id,
    repository_id: row.repository_id,
    agent_surface: row.agent_surface,
    mode: row.mode,
    measurement_quality: row.measurement_quality,
    net_input_cost_delta_usd: row.net_input_cost_delta_usd,
    kage_processing_cost_usd: row.kage_processing_cost_usd,
    latency_ms: row.latency_ms,
    delivery_status: row.delivery_status,
    verification_outcome: row.verification_outcome,
    knowledge_ids_reused: row.knowledge_ids_reused ?? [],
    review_decisions: row.review_decisions,
    started_at: isoOrNull(row.started_at) as string,
    ended_at: isoOrNull(row.ended_at),
    verified_at: isoOrNull(row.verified_at),
  };
}

/**
 * Land aggregated task outcomes for ONE tenant + repository. Idempotent by (workspace, repository,
 * task): a replayed sync re-states the same row rather than duplicating it, which is what keeps a
 * retried batch from inflating a team's task count. The tenant is always the caller's server-resolved
 * workspace id — this function never reads a workspace id out of a record.
 */
export async function storeTaskOutcomes(
  db: Db,
  workspaceId: string,
  repositoryId: string,
  records: readonly TeamTaskOutcomeRecord[],
): Promise<number> {
  let written = 0;
  for (const record of records) {
    assertNoRawTaskOutcomeField(record);
    await db.query(
      `INSERT INTO workspace_task_outcomes(
         workspace_id, repository_id, task_id, agent_surface, mode, measurement_quality,
         net_input_cost_delta_usd, kage_processing_cost_usd, latency_ms, delivery_status,
         verification_outcome, knowledge_ids_reused, review_decisions, started_at, ended_at, verified_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       ON CONFLICT (workspace_id, repository_id, task_id) DO UPDATE SET
         agent_surface = EXCLUDED.agent_surface,
         mode = EXCLUDED.mode,
         measurement_quality = EXCLUDED.measurement_quality,
         net_input_cost_delta_usd = EXCLUDED.net_input_cost_delta_usd,
         kage_processing_cost_usd = EXCLUDED.kage_processing_cost_usd,
         latency_ms = EXCLUDED.latency_ms,
         delivery_status = EXCLUDED.delivery_status,
         verification_outcome = EXCLUDED.verification_outcome,
         knowledge_ids_reused = EXCLUDED.knowledge_ids_reused,
         review_decisions = EXCLUDED.review_decisions,
         started_at = EXCLUDED.started_at,
         ended_at = EXCLUDED.ended_at,
         verified_at = EXCLUDED.verified_at`,
      [
        workspaceId,
        repositoryId,
        record.task_id,
        record.agent_surface,
        record.mode,
        record.measurement_quality,
        record.net_input_cost_delta_usd,
        record.kage_processing_cost_usd,
        record.latency_ms,
        record.delivery_status,
        record.verification_outcome,
        record.knowledge_ids_reused,
        record.review_decisions,
        record.started_at,
        record.ended_at,
        record.verified_at,
      ],
    );
    written += 1;
  }
  return written;
}

export interface MetricsWindow {
  repository_id?: string;
  since?: string;
  until?: string;
}

/**
 * Read the task outcomes a principal is permitted to see. The workspace filter is ALWAYS the
 * server-resolved `principal.workspace_id`, and the repository filter is ALWAYS the principal's
 * allow-list — a cross-tenant, cross-repository or out-of-scope read returns zero rows from the QUERY,
 * not from a caller's discipline.
 */
export async function loadTaskOutcomes(
  db: Db,
  principal: Principal,
  window: MetricsWindow = {},
): Promise<TeamTaskOutcomeRecord[]> {
  if (window.repository_id && !scopeAllows(principal, window.repository_id)) return [];
  const params: unknown[] = [principal.workspace_id];
  let sql = `SELECT task_id, repository_id, agent_surface, mode, measurement_quality,
                    net_input_cost_delta_usd, kage_processing_cost_usd, latency_ms, delivery_status,
                    verification_outcome, knowledge_ids_reused, review_decisions,
                    started_at, ended_at, verified_at
               FROM workspace_task_outcomes
              WHERE workspace_id = $1`;
  if (principal.repository_ids !== "all") {
    if (principal.repository_ids.length === 0) return [];
    params.push(principal.repository_ids);
    sql += ` AND repository_id = ANY($${params.length})`;
  }
  if (window.repository_id) {
    params.push(window.repository_id);
    sql += ` AND repository_id = $${params.length}`;
  }
  if (window.since) {
    params.push(window.since);
    sql += ` AND started_at >= $${params.length}`;
  }
  if (window.until) {
    params.push(window.until);
    sql += ` AND started_at < $${params.length}`;
  }
  sql += " ORDER BY started_at, task_id";
  const { rows } = await db.query<TaskOutcomeRow>(sql, params);
  return rows.map(rowToRecord);
}

/** Load the permitted task outcomes and roll them into a team report. */
export async function loadTeamMetrics(
  db: Db,
  principal: Principal,
  window: MetricsWindow = {},
): Promise<TeamMetricsReport> {
  return buildTeamMetrics(await loadTaskOutcomes(db, principal, window));
}
