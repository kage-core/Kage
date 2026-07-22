// Cost cohorts and protect-mode automation for Phase D.
//
// A cohort is an HONEST roll-up of transformation receipts into the signals the budget engine and
// the Phase D gate consume. Two disciplines it never breaks, both inherited from runtime/commands.ts:
//
//   1. MEASURED OR NULL, never zero. A percentile is taken only over the receipts that actually
//      measured the quantity. A net cost delta counts only the receipts priced on BOTH sides (a
//      one-sided cost is unusable, never zero — `before - 0` would book the whole request as a
//      saving). An empty cohort reports null, not a flattering zero.
//
//   2. INPUT ECONOMICS ARE SEPARATE FROM OUTCOME TRENDS. The exact request cost/token deltas (what
//      the transform did to the prompt) are reported apart from output-token and Kage-processing-cost
//      trends, so a change in model output can never be dressed up as a prompt saving.
//
// SIGN CONVENTION: a net delta is `after - before`. POSITIVE means Kage made the request larger or
// more expensive (harm); NEGATIVE is a saving. This matches BudgetCohort.p50_net_cost_delta_usd in
// budget-engine.ts, so a cohort feeds decideMode directly.
//
// PURE + DETERMINISTIC: no I/O, no wall-clock, no randomness.

import type { TransformationReceipt } from "../protocol/index.js";
import type { BudgetMode, ContextBudgetPolicy } from "./budget-policy.js";
import { decideMode, type BudgetCohort } from "./budget-engine.js";

// ---------------------------------------------------------------------------------------------
// percentiles — linear interpolation between closest ranks
// ---------------------------------------------------------------------------------------------

/**
 * The percentile of a sample by linear interpolation between the two closest ranks. Null for an
 * empty sample — a percentile of nothing is not zero. This is deliberately the interpolating
 * definition (not commands.ts's nearest-rank latency percentile): a cohort's p50 net cost delta is
 * a distribution statistic, and the true median of an even sample is the mean of its two middle
 * values, so a two-receipt cohort of −0.02 and −0.01 reports −0.015, not −0.02.
 */
export function interpolatedPercentile(values: readonly number[], fraction: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  if (sorted.length === 1) return sorted[0];
  const clamped = Math.min(1, Math.max(0, fraction));
  const index = clamped * (sorted.length - 1);
  const low = Math.floor(index);
  const high = Math.ceil(index);
  if (low === high) return sorted[low];
  const weight = index - low;
  return sorted[low] + (sorted[high] - sorted[low]) * weight;
}

// ---------------------------------------------------------------------------------------------
// cohort metrics
// ---------------------------------------------------------------------------------------------

export interface CohortMetrics {
  receipts: number;

  // measurement coverage of the transformed requests
  exact_receipts: number;
  partial_receipts: number;
  unavailable_receipts: number;

  // INPUT COST economics — over receipts priced on BOTH sides only. Positive delta = more expensive.
  cost_delta_receipts: number;
  p50_net_input_cost_delta_usd: number | null;
  p95_net_input_cost_delta_usd: number | null;
  total_net_input_cost_delta_usd: number | null;

  // INPUT TOKEN economics — over receipts measured on BOTH sides only. Positive delta = more tokens.
  token_delta_receipts: number;
  p50_net_input_token_delta: number | null;
  p95_net_input_token_delta: number | null;

  // LOCAL transformation latency — measured on every receipt.
  latency_samples: number;
  p50_latency_ms: number | null;
  p95_latency_ms: number | null;

  // reversibility / retrieval — a lossy transform embeds a retrieval reference, so a payload_compress
  // receipt is a receipt with a retrievable original.
  lossy_receipts: number;
  retrieval_rate: number | null;

  // prompt mutation — receipts whose transformed body was actually FORWARDED (assist/protect with a
  // real transform). Audit forwards the client's exact bytes, so an audit-only cohort measures 0.
  forwarded_receipts: number;

  // KAGE'S OWN PROCESSING COST — measured or null, never a zero that claims the harness is free.
  kage_processing_cost_receipts: number;
  kage_processing_cost_total_usd: number | null;

  // OUTCOME TREND — deliberately separate from input economics above.
  output_token_receipts: number;
  p50_output_tokens: number | null;
  p95_output_tokens: number | null;
}

function measuredNumbers(values: readonly (number | null)[]): number[] {
  return values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

/**
 * Roll a set of transformation receipts into an honest cohort. Every percentile is taken only over
 * the receipts that measured the quantity; a receipt that measured nothing contributes nothing but
 * its presence in the coverage counts.
 */
export function calculateCohort(receipts: readonly TransformationReceipt[]): CohortMetrics {
  let exact = 0;
  let partial = 0;
  let unavailable = 0;
  for (const receipt of receipts) {
    if (receipt.measurement_quality === "exact") exact += 1;
    else if (receipt.measurement_quality === "partial") partial += 1;
    else unavailable += 1;
  }

  // Cost delta only where BOTH sides carry a measured cost (mirrors costDelta in commands.ts).
  const costDeltas = receipts
    .filter(
      (receipt) =>
        receipt.provider_input_cost_before_usd !== null && receipt.provider_input_cost_after_usd !== null,
    )
    .map(
      (receipt) =>
        (receipt.provider_input_cost_after_usd as number) - (receipt.provider_input_cost_before_usd as number),
    );

  // Token delta only where BOTH sides carry a measured token count (mirrors tokenDelta).
  const tokenDeltas = receipts
    .filter((receipt) => receipt.before_input_tokens !== null && receipt.after_input_tokens !== null)
    .map((receipt) => (receipt.after_input_tokens as number) - (receipt.before_input_tokens as number));

  const latencies = measuredNumbers(receipts.map((receipt) => receipt.latency_ms));
  const kageCosts = measuredNumbers(receipts.map((receipt) => receipt.kage_processing_cost_usd));
  const outputs = measuredNumbers(receipts.map((receipt) => receipt.output_tokens));

  const lossy = receipts.filter((receipt) => receipt.transformations.includes("payload_compress")).length;
  const forwarded = receipts.filter(
    (receipt) => receipt.mode !== "audit" && receipt.transformations.length > 0,
  ).length;

  return {
    receipts: receipts.length,
    exact_receipts: exact,
    partial_receipts: partial,
    unavailable_receipts: unavailable,

    cost_delta_receipts: costDeltas.length,
    p50_net_input_cost_delta_usd: interpolatedPercentile(costDeltas, 0.5),
    p95_net_input_cost_delta_usd: interpolatedPercentile(costDeltas, 0.95),
    total_net_input_cost_delta_usd: costDeltas.length
      ? costDeltas.reduce((sum, value) => sum + value, 0)
      : null,

    token_delta_receipts: tokenDeltas.length,
    p50_net_input_token_delta: interpolatedPercentile(tokenDeltas, 0.5),
    p95_net_input_token_delta: interpolatedPercentile(tokenDeltas, 0.95),

    latency_samples: latencies.length,
    p50_latency_ms: interpolatedPercentile(latencies, 0.5),
    p95_latency_ms: interpolatedPercentile(latencies, 0.95),

    lossy_receipts: lossy,
    retrieval_rate: receipts.length ? lossy / receipts.length : null,

    forwarded_receipts: forwarded,

    kage_processing_cost_receipts: kageCosts.length,
    kage_processing_cost_total_usd: kageCosts.length
      ? kageCosts.reduce((sum, value) => sum + value, 0)
      : null,

    output_token_receipts: outputs.length,
    p50_output_tokens: interpolatedPercentile(outputs, 0.5),
    p95_output_tokens: interpolatedPercentile(outputs, 0.95),
  };
}

/** Project a cohort onto the two measured signals the budget engine's decideMode consumes. */
export function cohortToBudgetCohort(metrics: CohortMetrics): BudgetCohort {
  return {
    p50_net_cost_delta_usd: metrics.p50_net_input_cost_delta_usd,
    p95_latency_ms: metrics.p95_latency_ms,
  };
}

// ---------------------------------------------------------------------------------------------
// protect-mode automation — measured backoff with an honest recovery window
// ---------------------------------------------------------------------------------------------

/**
 * One observation of a measured cohort, with the number of tasks it summarizes. `tasks` sizes the
 * healthy-recovery window: a measured-healthy observation of N tasks advances recovery by N. An
 * UNMEASURED observation (null signals) never advances recovery — absence is not health.
 */
export interface ProtectObservation {
  p50_net_input_cost_delta_usd: number | null;
  p95_latency_ms: number | null;
  tasks: number;
}

export interface ProtectState {
  mode: BudgetMode;
  /** Machine-readable reasons for the current state. */
  reasons: string[];
  /** Consecutive MEASURED-healthy tasks observed since entering protect. */
  healthy_tasks_observed: number;
}

/**
 * The protect controller adds hysteresis to decideMode: a single measured-unhealthy cohort backs
 * off to protect and RECORDS ITS REASON, and protect HOLDS until a healthy window of at least
 * `policy.protect_window_tasks` measured-healthy tasks has accumulated — only then does it recover
 * to the configured base mode. This prevents a single lucky sample from flapping the mode back.
 *
 * HONESTY: only a MEASURED-and-within-budget observation counts toward recovery. An unmeasured
 * cohort observed while in protect holds protect and advances nothing — the harness may not declare
 * itself healthy without a measurement. A fresh unhealthy signal re-enters protect and resets the
 * window.
 */
export class ProtectController {
  private readonly policy: ContextBudgetPolicy;
  private readonly baseMode: BudgetMode;
  private mode: BudgetMode;
  private reasons: string[];
  private healthyTasks: number;

  constructor(policy: ContextBudgetPolicy) {
    this.policy = policy;
    this.baseMode = policy.mode;
    this.mode = policy.mode;
    this.reasons = ["initial"];
    this.healthyTasks = 0;
  }

  observe(observation: ProtectObservation): void {
    const decision = decideMode(
      {
        p50_net_cost_delta_usd: observation.p50_net_input_cost_delta_usd,
        p95_latency_ms: observation.p95_latency_ms,
      },
      this.policy,
    );

    // A measured-unhealthy cohort backs off to protect and resets the recovery window.
    if (decision.mode === "protect") {
      this.mode = "protect";
      this.reasons = decision.reasons.length ? decision.reasons : ["protect"];
      this.healthyTasks = 0;
      return;
    }

    const measuredHealthy = decision.reasons.includes("within_budget");

    if (this.mode === "protect") {
      if (!measuredHealthy) {
        // Unmeasured (or policy-off) while backed off: hold protect, advance nothing.
        this.reasons = ["holding_protect_no_measurement"];
        return;
      }
      this.healthyTasks += Math.max(0, Math.floor(observation.tasks));
      if (this.healthyTasks >= Math.floor(this.policy.protect_window_tasks)) {
        this.mode = this.baseMode;
        this.reasons = ["recovered_after_healthy_window"];
        this.healthyTasks = 0;
      } else {
        this.reasons = ["holding_protect_pending_healthy_window"];
      }
      return;
    }

    // Not in protect: track the configured base mode, record the (measured or absent) reason.
    this.mode = this.baseMode;
    this.reasons = decision.reasons;
  }

  state(): ProtectState {
    return { mode: this.mode, reasons: [...this.reasons], healthy_tasks_observed: this.healthyTasks };
  }
}
