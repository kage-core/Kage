// The audit-vs-assist pilot comparison.
//
// A pilot report is what a design partner reads when deciding whether Kage earned its place, so it is
// the single most tempting place in the product to inflate a number. Four rules make that structurally
// hard:
//
//   1. NO DATA MEANS "not_run". An empty pilot reports status `not_run` with null comparisons — never a
//      zeroed table that looks like a completed pilot with neutral results. This is what lets the Phase E
//      GA report state honestly that design-partner pilots have not been run.
//
//   2. A COHORT TIME TREND IS NOT MONEY. Time-to-verified-change is milliseconds. It becomes dollars only
//      when the CUSTOMER has explicitly configured a cost model (their own rate, their own decision), and
//      even then the result is labeled `cohort_estimate` / exactness `cohort` and is reported in its own
//      section — never added to, or compared against, the exact measured request economics.
//
//   3. A DELTA NEEDS BOTH ARMS. Every comparison is null unless BOTH arms measured the quantity. An arm
//      with no exact receipts cannot produce an exact cost delta; subtracting from a missing baseline is
//      how "we saved 100%" gets manufactured.
//
//   4. SMALL COHORTS ARE SUPPRESSED. If either arm is below MINIMUM_COHORT, the behaviour trends stay
//      suppressed (metrics.ts already withholds them) and the pilot is `insufficient_data`.
//
// PURE + DETERMINISTIC: no I/O, no wall clock, no randomness.
import {
  MINIMUM_COHORT,
  buildTeamMetrics,
  type TeamMetricsReport,
  type TeamTaskOutcomeRecord,
} from "./metrics.js";

/**
 * A customer-configured engineering cost model. There is NO default and no inferred rate: absent this
 * object, a time trend is never expressed in dollars. `configured_by` / `configured_at` are recorded so a
 * dollarized figure can always be traced to the human who chose the rate.
 */
export interface PilotCostModel {
  usd_per_engineer_hour: number;
  configured_by: string;
  configured_at: string;
}

export interface PilotComparison {
  /** assist − audit over EXACT receipts in both arms. Negative = assist requests cost measurably less. */
  exact_input_cost_delta_usd: number | null;
  p50_latency_delta_ms: number | null;
  p95_latency_delta_ms: number | null;
  verified_reuse_delta_percent: number | null;
  /** assist − audit p50 time to verified change. Negative = assist reached verified change sooner. */
  time_to_verified_change_delta_ms: number | null;
  review_burden_delta_per_task: number | null;
  failed_open_delta_percent: number | null;
}

export type TimeSavingsBasis =
  | "no_cost_model_configured"
  | "no_measured_time_delta"
  | "cohort_estimate";

export interface PilotTimeSavings {
  usd: number | null;
  basis: TimeSavingsBasis;
  exactness: "cohort" | "unavailable";
  /** The exact arithmetic, spelled out, so a reader can re-derive or reject the figure. */
  formula: string | null;
}

export type PilotStatus = "not_run" | "insufficient_data" | "reportable";

export interface PilotReport {
  pilot_id: string;
  status: PilotStatus;
  audit: TeamMetricsReport;
  assist: TeamMetricsReport;
  comparison: PilotComparison;
  time_savings: PilotTimeSavings;
  caveats: string[];
}

export interface PilotReportInput {
  pilot_id: string;
  /** Baseline arm: Kage observing only. */
  audit: readonly TeamTaskOutcomeRecord[];
  /** Treatment arm: Kage assisting. */
  assist: readonly TeamTaskOutcomeRecord[];
  cost_model?: PilotCostModel | null;
}

/** assist − audit, but only when BOTH sides are measured. One measured side yields null, never the side. */
function delta(assist: number | null, audit: number | null): number | null {
  if (assist === null || audit === null) return null;
  return round(assist - audit);
}

function round(value: number, places = 6): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/** Build the pilot comparison. Deterministic; every absent measurement propagates as null. */
export function buildPilotReport(input: PilotReportInput): PilotReport {
  const audit = buildTeamMetrics(input.audit);
  const assist = buildTeamMetrics(input.assist);
  const caveats: string[] = [];

  const bothArmsHaveExactCost = audit.exact_cost.receipts > 0 && assist.exact_cost.receipts > 0;
  const exactCostDelta = bothArmsHaveExactCost
    ? delta(
        assist.exact_cost.total_net_input_cost_delta_usd,
        audit.exact_cost.total_net_input_cost_delta_usd,
      )
    : null;
  if (!bothArmsHaveExactCost) {
    caveats.push(
      `no exact input-cost delta: exact receipts are audit=${audit.exact_cost.receipts}, assist=${assist.exact_cost.receipts}; a delta requires exact measurement in BOTH arms`,
    );
  }

  const timeDelta = delta(
    assist.time_to_verified_change?.p50_ms ?? null,
    audit.time_to_verified_change?.p50_ms ?? null,
  );

  const comparison: PilotComparison = {
    exact_input_cost_delta_usd: exactCostDelta,
    p50_latency_delta_ms: delta(assist.latency.p50_ms, audit.latency.p50_ms),
    p95_latency_delta_ms: delta(assist.latency.p95_ms, audit.latency.p95_ms),
    verified_reuse_delta_percent: delta(assist.verified_reuse.rate, audit.verified_reuse.rate),
    time_to_verified_change_delta_ms: timeDelta,
    review_burden_delta_per_task: delta(
      assist.review_burden.decisions_per_task,
      audit.review_burden.decisions_per_task,
    ),
    failed_open_delta_percent: delta(assist.failed_open.rate, audit.failed_open.rate),
  };

  // Status. An empty pilot is NOT a neutral result; an under-powered one is not a conclusion.
  let status: PilotStatus;
  if (audit.tasks === 0 && assist.tasks === 0) {
    status = "not_run";
    caveats.push("pilot not run: neither arm recorded a single task outcome");
  } else if (audit.tasks < MINIMUM_COHORT || assist.tasks < MINIMUM_COHORT) {
    status = "insufficient_data";
    caveats.push(
      `insufficient data: arms are audit=${audit.tasks}, assist=${assist.tasks} task(s); outcome trends stay suppressed below ${MINIMUM_COHORT} (minimum_cohort_5)`,
    );
  } else {
    status = "reportable";
  }

  const timeSavings = dollarize(timeDelta, assist.tasks, input.cost_model ?? null, caveats);

  caveats.push(
    "exact request economics are measured per request; the time trend is a cohort observation. They are reported separately and are never summed into one ROI figure.",
  );

  return { pilot_id: input.pilot_id, status, audit, assist, comparison, time_savings: timeSavings, caveats };
}

/**
 * Convert a MEASURED cohort time delta into dollars — and only then. Three gates, in order:
 *   1. no customer-configured cost model -> null, `no_cost_model_configured`;
 *   2. no measured time delta (either arm unmeasured or suppressed) -> null, `no_measured_time_delta`;
 *   3. a delta that is not a saving (assist took longer or matched) -> null, `no_measured_time_delta`,
 *      because this field reports a SAVING and a negative saving is reported by the trend itself.
 * The surviving figure is explicitly a `cohort_estimate`, carries its formula, and is never labeled exact.
 */
function dollarize(
  timeDeltaMs: number | null,
  assistTasks: number,
  costModel: PilotCostModel | null,
  caveats: string[],
): PilotTimeSavings {
  if (!costModel) {
    caveats.push(
      "no customer cost model is configured, so the cohort time trend is NOT converted into dollars",
    );
    return { usd: null, basis: "no_cost_model_configured", exactness: "unavailable", formula: null };
  }
  if (timeDeltaMs === null || timeDeltaMs >= 0 || assistTasks === 0) {
    caveats.push(
      "no measured cohort time saving, so no dollar estimate is produced (an unmeasured or non-positive trend never becomes money)",
    );
    return { usd: null, basis: "no_measured_time_delta", exactness: "unavailable", formula: null };
  }
  const savedHoursPerTask = -timeDeltaMs / 3_600_000;
  const usd = round(savedHoursPerTask * costModel.usd_per_engineer_hour * assistTasks, 2);
  return {
    usd,
    basis: "cohort_estimate",
    exactness: "cohort",
    formula:
      `(audit_p50_time_to_verified_change − assist_p50_time_to_verified_change) ÷ 3600000 × ` +
      `${costModel.usd_per_engineer_hour} usd/engineer-hour (configured by ${costModel.configured_by}) × ${assistTasks} assist task(s)`,
  };
}
