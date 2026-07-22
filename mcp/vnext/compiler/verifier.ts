import type { EvidenceRecord } from "../repo-model/types.js";

/**
 * Evidence verification against ground truth.
 *
 * A claim is injectable only when a *verified* evidence row backs it (the store's honesty gate). This
 * module decides whether a given evidence row is still verified by re-checking it against ground
 * truth — never by trusting a stored flag. The eight methods Kage recognizes:
 *
 *   - source_fingerprint  — the fingerprint of the cited source region still matches;
 *   - symbol_fingerprint  — the fingerprint of the cited symbol's definition still matches;
 *   - package_script      — a declared package script still exists with the same definition;
 *   - test_pass           — a test that exercises the claim still passes;
 *   - ci_run              — a recorded CI run still corroborates it;
 *   - git_commit          — the cited commit/diff is still present;
 *   - document_anchor     — the cited document anchor still resolves to the same content;
 *   - human_review        — an authorized human accepted it (an authority decision of record).
 *
 * A MODEL ASSERTION IS NOT A VERIFICATION METHOD. A model can propose extraction metadata, but its
 * say-so never verifies a claim: any evidence whose method is not one of the eight above is reported
 * `unavailable` (never `verified`), no matter what a probe would say. This is the load-bearing honesty
 * gate — an estimate is never presented as a measurement.
 *
 * Fail-open on unknown ground truth: when the probe cannot produce the current fingerprint (the source
 * is gone, a test could not be run, CI is unreachable), the verdict is `unavailable` with a reason —
 * never a fabricated `verified` and never an invented `failed`.
 */

export type VerificationMethod =
  | "source_fingerprint"
  | "symbol_fingerprint"
  | "package_script"
  | "test_pass"
  | "ci_run"
  | "git_commit"
  | "document_anchor"
  | "human_review";

// The eight recognized methods. Anything else — above all `model`/`model_assertion` — is extraction
// metadata, not verification.
export const VERIFICATION_METHODS: ReadonlySet<string> = new Set<VerificationMethod>([
  "source_fingerprint",
  "symbol_fingerprint",
  "package_script",
  "test_pass",
  "ci_run",
  "git_commit",
  "document_anchor",
  "human_review",
]);

export function isVerificationMethod(method: string): method is VerificationMethod {
  return VERIFICATION_METHODS.has(method);
}

// A human review is an authority decision, not a fingerprint check, so it is never routed through a
// ground-truth probe. Every other method is fingerprint-checkable.
const FINGERPRINT_METHODS: ReadonlySet<string> = new Set<VerificationMethod>([
  "source_fingerprint",
  "symbol_fingerprint",
  "package_script",
  "test_pass",
  "ci_run",
  "git_commit",
  "document_anchor",
]);

/**
 * A ground-truth probe returns the CURRENT fingerprint for a piece of evidence (the fingerprint of
 * the source region, symbol, script, passing test, CI run, commit, or document anchor as it exists
 * right now), or `null` when that ground truth cannot be established (source deleted, test un-runnable,
 * CI unreachable). Returning `null` — not a guess — is how a probe reports "unknown".
 */
export interface GroundTruthProbe {
  currentFingerprint(evidence: EvidenceRecord): string | null;
}

export type EvidenceVerdict =
  | { state: "verified"; method: string }
  | { state: "failed"; method: string; reason: string }
  | { state: "unavailable"; method: string; reason: string };

export function verifyEvidence(evidence: EvidenceRecord, probe: GroundTruthProbe): EvidenceVerdict {
  const method = evidence.verification_method;

  // Honesty gate #1: a non-verification method (a model assertion, above all) can never verify.
  if (!isVerificationMethod(method)) {
    return {
      state: "unavailable",
      method,
      reason: `"${method}" is extraction metadata, not a verification method`,
    };
  }

  // A human review stands on its recorded decision: an authority acceptance is ground truth of record,
  // not something a fingerprint probe re-derives. It is only ever as strong as what was recorded, so a
  // review that was itself never accepted is not silently promoted.
  if (method === "human_review") {
    if (evidence.verification_state === "verified") {
      return { state: "verified", method };
    }
    return {
      state: "unavailable",
      method,
      reason: "human review is not recorded as accepted",
    };
  }

  if (FINGERPRINT_METHODS.has(method)) {
    const current = probe.currentFingerprint(evidence);
    // Honesty gate #2: unknown ground truth is unavailable, never a fabricated verified/failed.
    if (current === null) {
      return { state: "unavailable", method, reason: "ground truth is unavailable" };
    }
    if (current === evidence.source_fingerprint) {
      return { state: "verified", method };
    }
    return { state: "failed", method, reason: "ground-truth fingerprint changed" };
  }

  // Unreachable given the sets above, but fail-open rather than throw.
  return { state: "unavailable", method, reason: "unhandled verification method" };
}
