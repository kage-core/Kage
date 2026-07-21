// The explicit, auditable policy that governs how much context Kage may add and when it must back
// off. This module is PURE: no imports, no I/O, no wall-clock. It defines the policy shape, the
// audit-safe defaults, and a normalizer that reads an untrusted config block field-by-field.
//
// HONESTY DISCIPLINE (Phase D):
//   - Defaults are audit-safe: `mode: "audit"` and `lossy_compression: false`. Lossy compression
//     stays off until the retrieval tests pass; a config that predates the budget block must read
//     as the audit-safe default, never as an accidentally-enabled assist/protect/lossy state.
//   - `mode` here is a SEPARATE axis from the runtime/gateway ProxyMode. It can be "protect", which
//     the wire treats like audit (forward the original) while persisting a distinct reason.
//   - The normalizer never yields NaN: an illegible number falls back to the default, and an
//     illegible flag falls back to false.

export type BudgetMode = "off" | "audit" | "assist" | "protect";

const BUDGET_MODES: readonly BudgetMode[] = ["off", "audit", "assist", "protect"];

export interface ContextBudgetPolicy {
  /** Operating axis for the budget engine. Separate from the runtime/gateway ProxyMode. */
  mode: BudgetMode;
  /** Capsule token budget used when no measured context window is available. */
  default_capsule_tokens: number;
  /** Hard ceiling on the capsule token budget, applied after the share cap. */
  max_capsule_tokens: number;
  /** Maximum fraction of a MEASURED context window Kage's additions may occupy. */
  max_context_share: number;
  /** p95 local transformation latency budget, in milliseconds. */
  max_p95_latency_ms: number;
  /** Payloads smaller than this (measured tokens) are not worth compressing. */
  min_payload_tokens_for_compression: number;
  /** Whether lossy compression is permitted. Off until retrieval tests pass. */
  lossy_compression: boolean;
  /**
   * Whether HISTORY digestion is permitted: tool payloads OLDER than the live zone are reduced to a
   * deterministic head/errors/tail digest plus a kage-content retrieval marker (exact original
   * stored first). Off by default — a repo opts in; lossy_compression must ALSO be on, since a
   * digest is a lossy (reversible) transform.
   */
  history_compression: boolean;
  /** Prefix tool payloads smaller than this many bytes are never digested. */
  history_min_bytes: number;
  /** Bounded raw-content retention for the reversible store, in days. */
  raw_content_retention_days: number;
  /** How many recent tasks a protect decision holds for before re-evaluating. */
  protect_window_tasks: number;
}

// Default values per the plan (Task 3, Step 3): audit mode, 800 default capsule tokens, 1,200
// maximum, 2% maximum context share, 150 ms p95 latency, 500-token minimum payload, lossy
// compression disabled, seven-day raw retention, 30-task protect window.
export const DEFAULT_CONTEXT_BUDGET_POLICY: ContextBudgetPolicy = {
  mode: "audit",
  default_capsule_tokens: 800,
  max_capsule_tokens: 1_200,
  max_context_share: 0.02,
  max_p95_latency_ms: 150,
  min_payload_tokens_for_compression: 500,
  lossy_compression: false,
  history_compression: false,
  history_min_bytes: 2_048,
  raw_content_retention_days: 7,
  protect_window_tasks: 30,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function budgetMode(value: unknown): BudgetMode {
  return typeof value === "string" && BUDGET_MODES.includes(value as BudgetMode)
    ? (value as BudgetMode)
    : DEFAULT_CONTEXT_BUDGET_POLICY.mode;
}

// A finite, positive number or the default. Never NaN, never negative.
function positiveNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

// A boolean or false. An illegible flag ("yes", 1, null) reads as false, never as truthy-on.
function strictBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/**
 * Reads an untrusted budget block into a fully-populated policy. Every field falls back to the
 * audit-safe default when absent or illegible, so a hand-edited or truncated config can never read
 * as a fabricated permissive state. An explicit, legible override (a real file edit) is honoured —
 * that is a deliberate user act, the same discipline the model_extraction/context_source readers use.
 */
export function normalizeBudgetPolicy(value: unknown): ContextBudgetPolicy {
  if (!isRecord(value)) return { ...DEFAULT_CONTEXT_BUDGET_POLICY };
  const d = DEFAULT_CONTEXT_BUDGET_POLICY;
  return {
    mode: budgetMode(value.mode),
    default_capsule_tokens: positiveNumber(value.default_capsule_tokens, d.default_capsule_tokens),
    max_capsule_tokens: positiveNumber(value.max_capsule_tokens, d.max_capsule_tokens),
    max_context_share: positiveNumber(value.max_context_share, d.max_context_share),
    max_p95_latency_ms: positiveNumber(value.max_p95_latency_ms, d.max_p95_latency_ms),
    min_payload_tokens_for_compression: positiveNumber(
      value.min_payload_tokens_for_compression,
      d.min_payload_tokens_for_compression,
    ),
    lossy_compression: strictBoolean(value.lossy_compression, d.lossy_compression),
    history_compression: strictBoolean(value.history_compression, d.history_compression),
    history_min_bytes: positiveNumber(value.history_min_bytes, d.history_min_bytes),
    raw_content_retention_days: positiveNumber(value.raw_content_retention_days, d.raw_content_retention_days),
    protect_window_tasks: positiveNumber(value.protect_window_tasks, d.protect_window_tasks),
  };
}
