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
 * The task-count floor for publishing a human-behaviour trend. A median over four tasks is noise wearing
 * a statistic's clothes, and the number is named in the suppression reason so a reader can tell
 * "suppressed" apart from "unmeasured".
 */
export const MINIMUM_COHORT = 5;

/**
 * The PEOPLE floor. A task count alone is not k-anonymity: fifty tasks logged by one engineer are one
 * person's working record published under a team label. Both floors must clear before any human-behaviour
 * trend is published, which is why every task outcome carries a (pseudonymous) actor id — without one the
 * cohort size in people is unknowable and the trend cannot be released at all.
 */
export const MINIMUM_ACTORS = 3;

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
  /**
   * A SALTED PSEUDONYM for the person who ran the task — never a user id, email, or login. The workspace
   * needs it for exactly one purpose: counting distinct people so a "team" trend is not one individual's
   * record. It is never published, never joined to anything, and never returned by a metrics route.
   */
  actor_id: string;
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
  /**
   * Ids of reused knowledge records — identifiers only, never the claim bodies. NULL means this install
   * does not measure reuse at all; `[]` means it does and this task reused nothing. Collapsing the two
   * would publish "your team reuses nothing" as a measurement of something never measured.
   */
  knowledge_ids_reused: string[] | null;
  /** Review decisions attributable to this task; NULL when the install does not attribute them. */
  review_decisions: number | null;
  started_at: string;
  ended_at: string | null;
  /** When the change this task produced became verified; null when it never did (or was not measured). */
  verified_at: string | null;
}

/** The exact field set a task outcome may carry. Anything else is refused as a possible raw payload. */
const ALLOWED_TASK_OUTCOME_FIELDS: ReadonlySet<string> = new Set<keyof TeamTaskOutcomeRecord>([
  "task_id",
  "repository_id",
  "actor_id",
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
// structural validation — the allow-list is only half the guarantee
// ---------------------------------------------------------------------------------------------
//
// An allow-list proves WHICH keys travel. It says nothing about what is INSIDE them, and unbounded TEXT
// under a permitted key is exactly where a prompt would hide: `task_id` = "…the user's full prompt with
// customer data" passes any key check ever written. So an identifier here must LOOK like an identifier —
// bounded length, no whitespace, no punctuation that prose needs — which makes a smuggled payload
// structurally unrepresentable rather than merely against the rules. The same validator also rejects
// out-of-vocabulary classes and malformed numbers, so a hostile client gets a 400 instead of turning a
// Postgres constraint violation into a 500.

/** Identifier shape: bounded, no whitespace, no prose punctuation. Mirrors migration 008's CHECK. */
const IDENTIFIER_PATTERN = /^[A-Za-z0-9._:@/+-]{1,128}$/;
/** ISO-8601 instant, bounded. Mirrors what Postgres will accept into a TIMESTAMPTZ column. */
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/;
/** A task cannot plausibly reuse more knowledge records than this; a longer array is a payload. */
const MAX_KNOWLEDGE_IDS = 64;

const TASK_MODES: ReadonlySet<string> = new Set<TaskMode>(["audit", "assist", "protect"]);
const QUALITY_CLASSES: ReadonlySet<string> = new Set<MeasurementQualityClass>([
  "exact",
  "partial",
  "unavailable",
]);
const DELIVERY_STATUSES: ReadonlySet<string> = new Set<TaskDeliveryStatus>([
  "delivered",
  "failed_open",
  "skipped",
]);
const VERIFICATION_OUTCOMES: ReadonlySet<string> = new Set<TaskVerificationOutcome>([
  "verified",
  "unverified",
  "failed",
  "unavailable",
]);

/** A task outcome that is not structurally admissible. Carries the offending field so callers can 400. */
export class TaskOutcomeValidationError extends Error {
  constructor(public readonly field: string, detail: string) {
    super(`task outcome field "${field}" ${detail}`);
    this.name = "TaskOutcomeValidationError";
  }
}

function assertIdentifier(field: string, value: unknown): void {
  if (typeof value !== "string" || !IDENTIFIER_PATTERN.test(value)) {
    throw new TaskOutcomeValidationError(
      field,
      "must be a bounded identifier (≤128 chars, no whitespace); free text is never a metrics identifier",
    );
  }
}

function assertEnum(field: string, value: unknown, allowed: ReadonlySet<string>): void {
  if (typeof value !== "string" || !allowed.has(value)) {
    throw new TaskOutcomeValidationError(field, `must be one of ${[...allowed].join(", ")}`);
  }
}

function assertNullableFinite(field: string, value: unknown): void {
  if (value === null) return;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TaskOutcomeValidationError(field, "must be null or a finite number");
  }
}

function assertTimestamp(field: string, value: unknown, nullable: boolean): void {
  if (nullable && value === null) return;
  if (typeof value !== "string" || !TIMESTAMP_PATTERN.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new TaskOutcomeValidationError(field, "must be an ISO-8601 instant");
  }
}

/**
 * Validate a task outcome completely: permitted keys, identifier SHAPE, class vocabulary, number
 * finiteness, and timestamp form. Every ingest path runs this before a row can reach Postgres, so an
 * invalid record is a 400 at the boundary rather than a constraint violation surfacing as a 500.
 */
export function validateTaskOutcome(record: TeamTaskOutcomeRecord): TeamTaskOutcomeRecord {
  if (!record || typeof record !== "object") {
    throw new TaskOutcomeValidationError("task_outcome", "must be an object");
  }
  assertNoRawTaskOutcomeField(record);
  assertIdentifier("task_id", record.task_id);
  assertIdentifier("repository_id", record.repository_id);
  assertIdentifier("actor_id", record.actor_id);
  assertIdentifier("agent_surface", record.agent_surface);
  assertEnum("mode", record.mode, TASK_MODES);
  assertEnum("measurement_quality", record.measurement_quality, QUALITY_CLASSES);
  assertEnum("delivery_status", record.delivery_status, DELIVERY_STATUSES);
  assertEnum("verification_outcome", record.verification_outcome, VERIFICATION_OUTCOMES);
  assertNullableFinite("net_input_cost_delta_usd", record.net_input_cost_delta_usd);
  assertNullableFinite("kage_processing_cost_usd", record.kage_processing_cost_usd);
  assertNullableFinite("latency_ms", record.latency_ms);
  if (typeof record.latency_ms === "number" && record.latency_ms < 0) {
    throw new TaskOutcomeValidationError("latency_ms", "cannot be negative");
  }
  if (record.knowledge_ids_reused !== null) {
    if (!Array.isArray(record.knowledge_ids_reused)) {
      throw new TaskOutcomeValidationError("knowledge_ids_reused", "must be null or an array of ids");
    }
    if (record.knowledge_ids_reused.length > MAX_KNOWLEDGE_IDS) {
      throw new TaskOutcomeValidationError(
        "knowledge_ids_reused",
        `must carry at most ${MAX_KNOWLEDGE_IDS} ids`,
      );
    }
    for (const id of record.knowledge_ids_reused) assertIdentifier("knowledge_ids_reused", id);
  }
  if (record.review_decisions !== null) {
    if (!Number.isSafeInteger(record.review_decisions) || record.review_decisions < 0) {
      throw new TaskOutcomeValidationError("review_decisions", "must be null or a nonnegative integer");
    }
  }
  assertTimestamp("started_at", record.started_at, false);
  assertTimestamp("ended_at", record.ended_at, true);
  assertTimestamp("verified_at", record.verified_at, true);
  return record;
}

// ---------------------------------------------------------------------------------------------
// the report
// ---------------------------------------------------------------------------------------------

/**
 * Why an outcome trend is WITHHELD. Null means "not withheld" — either published, or simply never
 * measured. An empty window is unmeasured, NOT suppressed: telling a workspace with no data that its
 * numbers are hidden for privacy is a false statement about a group that does not exist yet.
 */
export type SuppressionReason = "minimum_cohort_5" | "minimum_actors_3";

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
  /** How many distinct PEOPLE the cohort spans. A count only — no actor id ever leaves this module. */
  actors: number;
  measurement_quality: MeasurementQualityBreakdown;
  exact_cost: ExactCostSection;
  latency: { samples: number; p50_ms: number | null; p95_ms: number | null };
  // SUPPRESSION HAS TO WITHHOLD THE NUMERATOR TOO. Publishing `tasks` alongside `tasks_with_reuse`,
  // `decisions` and `failed_open.tasks` while nulling only the rates is not suppression: any reader
  // divides and recovers every withheld figure exactly. Below the floor the numerators are null as well;
  // only the denominators (which reveal nothing on their own) survive.
  verified_reuse: {
    /** Tasks whose install actually measures reuse — the denominator of `rate`. */
    measured_tasks: number;
    tasks_with_reuse: number | null;
    distinct_knowledge_ids: number | null;
    /** Percentage of measured tasks that reused verified knowledge; withheld below the floors. */
    rate: number | null;
  };
  /** Null below the floors, and null when nothing measured a verified change. */
  time_to_verified_change: TimeTrendSection | null;
  review_burden: { measured_tasks: number; decisions: number | null; decisions_per_task: number | null };
  failed_open: { tasks: number | null; rate: number | null };
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

  // Reuse and review burden are computed ONLY over the tasks whose install measures them. A record that
  // reports null is unmeasured; counting it as "reused nothing" would publish a measurement nobody took.
  const reuseMeasured = records.filter((record) => record.knowledge_ids_reused !== null);
  const reuseTasks = reuseMeasured.filter((record) => (record.knowledge_ids_reused ?? []).length > 0).length;
  const distinctKnowledge = new Set<string>();
  for (const record of reuseMeasured) {
    for (const id of record.knowledge_ids_reused ?? []) distinctKnowledge.add(id);
  }

  const reviewMeasured = records.filter((record) => record.review_decisions !== null);
  const decisions = reviewMeasured.reduce((sum, record) => sum + (record.review_decisions ?? 0), 0);
  const failedOpen = records.filter((record) => record.delivery_status === "failed_open").length;
  const actors = new Set(records.map((record) => record.actor_id)).size;

  const timeToVerified = measuredNumbers(
    records.map((record) =>
      record.verified_at ? Date.parse(record.verified_at) - Date.parse(record.started_at) : null,
    ),
  ).filter((value) => value >= 0);

  const timestamps = records.map((record) => Date.parse(record.started_at)).filter(Number.isFinite);
  const endTimestamps = records
    .map((record) => Date.parse(record.ended_at ?? record.started_at))
    .filter(Number.isFinite);

  // The k-anonymity gate, in TWO dimensions. A trend is published only when the cohort is both large
  // enough in tasks and spread across enough people. An EMPTY window is neither: it is unmeasured, and
  // saying "withheld for privacy" over zero data misdescribes a group that does not exist.
  let suppressionReason: SuppressionReason | null = null;
  if (tasks > 0 && tasks < MINIMUM_COHORT) suppressionReason = "minimum_cohort_5";
  else if (tasks > 0 && actors < MINIMUM_ACTORS) suppressionReason = "minimum_actors_3";
  const suppressed = suppressionReason !== null;

  if (tasks === 0) {
    caveats.push("no task outcomes recorded in this window; every metric is unavailable, not zero");
  } else if (suppressionReason === "minimum_cohort_5") {
    caveats.push(
      `outcome trends suppressed: a cohort of ${tasks} task(s) is below the privacy minimum of ${MINIMUM_COHORT} (minimum_cohort_5)`,
    );
  } else if (suppressionReason === "minimum_actors_3") {
    caveats.push(
      `outcome trends suppressed: ${tasks} task(s) from ${actors} person(s) is below the privacy minimum of ${MINIMUM_ACTORS} people (minimum_actors_3); a team average over fewer is one individual's record`,
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
  // A metric nobody measured must SAY nobody measured it. Without these, an unavailable reuse or review
  // figure looks like a suppressed one — or worse, like a team that reuses nothing and reviews nothing.
  if (tasks > 0 && reuseMeasured.length === 0) {
    caveats.push(
      "no task recorded which knowledge it reused, so the verified-reuse rate is unavailable — this is not a measured zero",
    );
  }
  if (tasks > 0 && reviewMeasured.length === 0) {
    caveats.push(
      "no task attributed review decisions, so review burden per task is unavailable — this is not a measured zero",
    );
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
    actors,
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
      measured_tasks: reuseMeasured.length,
      tasks_with_reuse: suppressed ? null : reuseTasks,
      distinct_knowledge_ids: suppressed ? null : distinctKnowledge.size,
      rate: suppressed ? null : percent(reuseTasks, reuseMeasured.length),
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
      measured_tasks: reviewMeasured.length,
      decisions: suppressed ? null : decisions,
      decisions_per_task:
        suppressed || reviewMeasured.length === 0 ? null : round(decisions / reviewMeasured.length, 3),
    },
    failed_open: {
      tasks: suppressed ? null : failedOpen,
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
  actor_id: string;
  agent_surface: string;
  mode: TaskMode;
  measurement_quality: MeasurementQualityClass;
  net_input_cost_delta_usd: number | null;
  kage_processing_cost_usd: number | null;
  latency_ms: number | null;
  delivery_status: TaskDeliveryStatus;
  verification_outcome: TaskVerificationOutcome;
  knowledge_ids_reused: string[] | null;
  review_decisions: number | null;
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
    actor_id: row.actor_id,
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
    // Full structural validation, not just the key allow-list: an out-of-vocabulary class or a
    // free-text "identifier" is refused HERE, so it can never become a Postgres error at the HTTP layer.
    validateTaskOutcome(record);
    await db.query(
      `INSERT INTO workspace_task_outcomes(
         workspace_id, repository_id, task_id, actor_id, agent_surface, mode, measurement_quality,
         net_input_cost_delta_usd, kage_processing_cost_usd, latency_ms, delivery_status,
         verification_outcome, knowledge_ids_reused, review_decisions, started_at, ended_at, verified_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       ON CONFLICT (workspace_id, repository_id, task_id) DO UPDATE SET
         actor_id = EXCLUDED.actor_id,
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
        record.actor_id,
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

/** A window bound that is not an ISO-8601 instant. The HTTP layer maps this to 400, never 500. */
export class MetricsWindowError extends Error {
  constructor(public readonly field: "since" | "until") {
    super(`metrics window "${field}" must be an ISO-8601 instant`);
    this.name = "MetricsWindowError";
  }
}

function assertWindowBound(field: "since" | "until", value: string | undefined): void {
  if (value === undefined) return;
  if (!TIMESTAMP_PATTERN.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new MetricsWindowError(field);
  }
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
  // A window bound the caller supplied is validated HERE. Passing an unparseable string to Postgres
  // raises "invalid input syntax for type timestamp with time zone", which the HTTP layer can only turn
  // into a 500 — an authenticated principal must not be able to fault the service with a query string.
  assertWindowBound("since", window.since);
  assertWindowBound("until", window.until);
  const params: unknown[] = [principal.workspace_id];
  let sql = `SELECT task_id, repository_id, actor_id, agent_surface, mode, measurement_quality,
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
