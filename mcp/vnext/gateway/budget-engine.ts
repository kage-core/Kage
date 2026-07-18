// The budget decision engine. Two deterministic decisions, both driven ONLY by measured inputs:
//
//   decideBudget(input, policy) -> how many capsule tokens Kage may add to THIS request. The budget
//     is a share of the MEASURED context window, capped by a hard ceiling. An unmeasured window
//     falls back to a fixed default cap — never a fabricated share of an unknown number.
//
//   decideMode(cohort, policy) -> whether Kage must back off, based on the MEASURED cost/latency
//     cohort. A cohort with no measurement never fabricates health or harm; the mode stays as
//     configured. When a measured signal shows Kage is net-negative (positive cost delta) or too
//     slow (p95 over budget), the engine degrades toward `protect` and sheds features in a fixed,
//     safety-preserving order.
//
// PURE + DETERMINISTIC: no I/O, no wall-clock, no randomness. Same inputs -> same decision bytes.

import type { BudgetMode, ContextBudgetPolicy } from "./budget-policy.js";

// ---------------------------------------------------------------------------------------------
// capsule token budget
// ---------------------------------------------------------------------------------------------

export interface BudgetInput {
  /**
   * The provider's MEASURED context window in tokens, or null when nothing measured it. Null is the
   * honest value; the engine must not invent a window to compute a share against.
   */
  context_window: number | null;
  /** Tokens the context source would like to add to the request. */
  requested_capsule_tokens: number;
}

export interface BudgetDecision {
  /** How many capsule tokens Kage may add. Feeds ContextRequest.token_budget. */
  capsule_token_budget: number;
  /** budget / context_window when the window was measured; null when it was not. */
  context_share: number | null;
  /** Why this budget was chosen: "measured_share" or "no_measured_context_window". */
  reason: string;
}

function nonnegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * The capsule budget for one request. Order of caps, all applied:
 *   1. the requested tokens (never add more than asked),
 *   2. the measured share cap (context_window * max_context_share),
 *   3. the hard ceiling (max_capsule_tokens).
 * The minimum of these is the budget. With no measured window the share cap is UNKNOWN, so we fall
 * back to the fixed default cap rather than pricing a share against a number we do not have.
 */
export function decideBudget(input: BudgetInput, policy: ContextBudgetPolicy): BudgetDecision {
  const requested = Math.floor(nonnegative(input.requested_capsule_tokens));
  const hardMax = Math.floor(nonnegative(policy.max_capsule_tokens));
  const window = input.context_window;

  if (window === null || !Number.isFinite(window) || window <= 0) {
    const defaultCap = Math.floor(nonnegative(policy.default_capsule_tokens));
    // No measured window: cap by the fixed default (and the hard ceiling), honour a smaller request.
    const budget = Math.min(requested === 0 ? defaultCap : requested, defaultCap, hardMax);
    return { capsule_token_budget: budget, context_share: null, reason: "no_measured_context_window" };
  }

  const shareCap = Math.floor(window * policy.max_context_share);
  const budget = Math.min(requested, Math.max(0, shareCap), hardMax);
  return {
    capsule_token_budget: budget,
    context_share: window > 0 ? budget / window : null,
    reason: "measured_share",
  };
}

// ---------------------------------------------------------------------------------------------
// degradation order — what Kage sheds under cost/latency pressure, in a fixed safety-preserving order
// ---------------------------------------------------------------------------------------------

// The order features are shed as pressure rises (plan Task 3, Step 4). Two categories of context are
// DELIBERATELY ABSENT from this list and can never be shed: critical safety invariants and the
// verification contract. Shedding a lower-priority summary to keep a critical invariant is correct;
// the reverse is forbidden.
export const DEGRADATION_ORDER = [
  "optional_context", // 1. optional orientation
  "historical_decisions", // 2. historical decisions
  "lossy_compression", // 3. lossy compression
  "noncritical_feature_context", // 4. non-critical feature context
  "all_noncritical", // 5. all context except critical invariants + verification contract
] as const;

export type DegradableFeature = (typeof DEGRADATION_ORDER)[number];

/**
 * The features disabled at a given degradation level: the first `level` entries of the order. Level
 * 0 (or below) disables nothing; a level past the end of the order is clamped to the whole order —
 * it never fabricates an extra feature, and it never reaches a critical invariant (those are not in
 * the order at all). After the last shed step the only thing left is full passthrough.
 */
export function disabledFeaturesForLevel(level: number): DegradableFeature[] {
  if (!Number.isFinite(level) || level <= 0) return [];
  const count = Math.min(Math.floor(level), DEGRADATION_ORDER.length);
  return DEGRADATION_ORDER.slice(0, count);
}

// ---------------------------------------------------------------------------------------------
// mode decision — MEASURED cohort in, backoff decision out
// ---------------------------------------------------------------------------------------------

export interface BudgetCohort {
  /**
   * p50 net input-cost delta in USD over receipts measured on BOTH sides. POSITIVE means Kage made
   * requests more expensive (bad). Null when no two-sided cost measurement exists — see costDelta in
   * runtime/commands.ts. Null must never be read as zero.
   */
  p50_net_cost_delta_usd: number | null;
  /** p95 local transformation latency in ms over measured samples, or null when unmeasured. */
  p95_latency_ms: number | null;
}

export interface ModeDecision {
  mode: BudgetMode;
  /** Features shed at this degradation level, top-of-order first. */
  disabled_features: DegradableFeature[];
  /** How many measured signals failed their budget (0, 1, or 2). */
  degradation_level: number;
  /** Machine-readable reasons: which signals were measured and which failed. */
  reasons: string[];
}

/**
 * The backoff decision for a cohort. HONESTY: an unmeasured cohort produces NO degradation — Kage
 * may not claim it is healthy (and keep mutating aggressively) nor claim it is harmful (and back
 * off) without a measurement. It stays at the configured mode. A degradation level is the count of
 * MEASURED signals that failed their budget: a positive net cost delta, and a p95 latency over the
 * policy budget. Any failing signal escalates to `protect` (back off from mutation) and sheds
 * features from the top of the degradation order.
 */
export function decideMode(cohort: BudgetCohort, policy: ContextBudgetPolicy): ModeDecision {
  // A disabled policy is disabled; nothing runs, so nothing degrades.
  if (policy.mode === "off") {
    return { mode: "off", disabled_features: [], degradation_level: 0, reasons: ["policy_off"] };
  }

  const costMeasured =
    typeof cohort.p50_net_cost_delta_usd === "number" && Number.isFinite(cohort.p50_net_cost_delta_usd);
  const latencyMeasured = typeof cohort.p95_latency_ms === "number" && Number.isFinite(cohort.p95_latency_ms);

  if (!costMeasured && !latencyMeasured) {
    // No measured signal at all: hold the configured mode. Not health, not harm — absence.
    return { mode: policy.mode, disabled_features: [], degradation_level: 0, reasons: ["no_measured_cohort"] };
  }

  const reasons: string[] = [];
  let level = 0;
  if (costMeasured && (cohort.p50_net_cost_delta_usd as number) > 0) {
    level += 1;
    reasons.push("positive_net_cost");
  }
  if (latencyMeasured && (cohort.p95_latency_ms as number) > policy.max_p95_latency_ms) {
    level += 1;
    reasons.push("p95_latency_exceeded");
  }

  if (level === 0) {
    // Measured and within budget: keep the configured mode, shed nothing.
    return { mode: policy.mode, disabled_features: [], degradation_level: 0, reasons: ["within_budget"] };
  }

  return { mode: "protect", disabled_features: disabledFeaturesForLevel(level), degradation_level: level, reasons };
}
