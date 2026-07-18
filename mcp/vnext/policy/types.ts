import type { EvidenceRecord } from "../repo-model/types.js";

/**
 * The Minimal Change Guard's shared vocabulary.
 *
 * The guard is ADVISORY by design: it guides an agent toward the smallest repository-native change,
 * but it never blocks work on subjective model opinion. The single load-bearing honesty rule lives in
 * `normalizeFinding` below — a non-deterministic (model-only) finding can never be `blocking`.
 */

export type MinimalChangeMode = "off" | "advisory" | "pr_warning" | "enforced";

export type FindingKind =
  // Preflight (Task 8) — the reuse ladder, from "change nothing" to "add a justified new abstraction".
  | "no_change"
  | "reuse_existing"
  | "use_standard_library"
  | "use_platform"
  | "use_existing_dependency"
  | "minimal_local_change"
  | "new_abstraction"
  // Post-diff (Task 9) — deterministic diff-scoped findings.
  | "new_dependency"
  | "duplicate_symbol"
  | "scope_expansion"
  | "public_contract"
  | "missing_verification";

export type FindingSeverity = "info" | "warning" | "blocking";

export interface MinimalChangeFinding {
  finding_id: string;
  kind: FindingKind;
  title: string;
  explanation: string;
  // Every recommendation must cite REAL evidence rows from the repository model. A finding with no
  // evidence is an opinion, never a repository-native fact.
  evidence: EvidenceRecord[];
  // `true` only when the finding is derived deterministically from ground truth (the repository model
  // or a parsed diff). A model-authored suggestion is `false` and can never be blocking.
  deterministic: boolean;
  severity: FindingSeverity;
  suggested_files: string[];
}

/**
 * The Minimal Change Guard's load-bearing honesty rule.
 *
 * A finding that is not deterministic — i.e. it rests on model judgment rather than ground truth —
 * can never be `blocking`. If one arrives marked `blocking`, it is downgraded to `warning`. This is
 * the mechanism that keeps the guard advisory: no amount of model confidence turns an opinion into a
 * hard gate. A deterministic finding is returned unchanged (its severity is honest ground truth).
 */
export function normalizeFinding(finding: MinimalChangeFinding): MinimalChangeFinding {
  if (!finding.deterministic && finding.severity === "blocking") {
    return { ...finding, severity: "warning" };
  }
  return finding;
}
