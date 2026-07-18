import { createHash } from "node:crypto";

import type { Repository } from "../repo-model/repository.js";
import { normalizeFinding, type FindingKind, type MinimalChangeFinding } from "./types.js";
import type { ParsedDiff } from "./diff-parser.js";
import { compareText, type PostDiffPolicy, type PostDiffTask, type Rule, type RuleContext } from "./rules/shared.js";
import { newDependencyRule } from "./rules/new-dependency.js";
import { duplicateSymbolRule } from "./rules/duplicate-symbol.js";
import { scopeExpansionRule } from "./rules/scope-expansion.js";
import { publicContractRule } from "./rules/public-contract.js";
import { missingVerificationRule } from "./rules/missing-verification.js";

export type { PostDiffPolicy, PostDiffTask } from "./rules/shared.js";

/**
 * Deterministic post-diff policy checks (Phase D, Task 9).
 *
 * `evaluateDiff` runs the fixed set of deterministic rules over a parsed diff and returns advisory
 * findings. Three properties are load-bearing and enforced here, not merely documented:
 *
 *  1. DETERMINISTIC. Every rule is a pure function of the diff, the task scope, an optional read-only
 *     repository model, and the policy. The output is sorted by a total comparator, so identical inputs
 *     yield byte-identical findings across runs. No wall-clock, no randomness, no model call.
 *  2. ADVISORY, NEVER OPINION-BASED BLOCKING. Every finding passes through `normalizeFinding`, so a
 *     non-deterministic finding can never be `blocking`. Post-diff findings are deterministic and carry
 *     `severity: "warning"`; the enforcement decision (whether a warning gates a PR) belongs to Task 10.
 *  3. EVIDENCE-BACKED. Every finding cites a real evidence record — either the parsed diff itself
 *     (`source_type: "git"`) or an injectable repository-model row. A finding with no evidence is an
 *     opinion; this module never emits one.
 */

// The default policy: which files are dependency manifests / lockfiles / tests / public contracts. It is
// deliberately conservative and explicit so the checks are predictable and repository-tunable.
export const DEFAULT_POST_DIFF_POLICY: PostDiffPolicy = {
  manifest_files: ["package.json", "requirements.txt", "pyproject.toml", "go.mod", "Cargo.toml", "Gemfile", "pom.xml", "build.gradle"],
  lockfiles: ["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "Cargo.lock", "poetry.lock", "Gemfile.lock", "go.sum"],
  test_path_patterns: [".test.", ".spec.", "_test.", "test_", "__tests__/", "/tests/", "/test/"],
  contract_path_patterns: [".proto", ".graphql", ".gql", "openapi", "swagger", "schema.sql", ".d.ts", "/api/"],
};

export interface DiffPolicyContext {
  task: PostDiffTask;
  diff: ParsedDiff;
  model?: Repository | null;
  policy: PostDiffPolicy;
}

// A stable rank so a mixed finding set sorts deterministically, cheapest-to-fix concerns first.
const KIND_RANK: Partial<Record<FindingKind, number>> = {
  scope_expansion: 0,
  duplicate_symbol: 1,
  new_dependency: 2,
  public_contract: 3,
  missing_verification: 4,
};

const RULES: Rule[] = [
  newDependencyRule,
  duplicateSymbolRule,
  scopeExpansionRule,
  publicContractRule,
  missingVerificationRule,
];

export function evaluateDiff(input: DiffPolicyContext): MinimalChangeFinding[] {
  const ctx: RuleContext = {
    task: input.task,
    diff: input.diff,
    model: input.model ?? null,
    policy: input.policy,
  };
  const findings: MinimalChangeFinding[] = [];
  for (const rule of RULES) {
    for (const finding of rule(ctx)) {
      // Defence in depth: even though every rule already normalizes, re-apply the honesty rule so a
      // future rule cannot smuggle a non-deterministic blocking finding through this seam.
      findings.push(normalizeFinding(finding));
    }
  }
  findings.sort(
    (a, b) =>
      (KIND_RANK[a.kind] ?? 99) - (KIND_RANK[b.kind] ?? 99) || compareText(a.finding_id, b.finding_id),
  );
  return findings;
}

// ---- suppression records -------------------------------------------------------------------------

/**
 * A recorded dismissal of a warning. Every dismissal captures who dismissed it, why, the exact finding
 * it silences (by fingerprint), the commit it applied to, and when the dismissal expires. A suppression
 * is scoped to a finding fingerprint that encodes the finding's MATERIAL identity (kind + cited symbols
 * and files) but NOT its line numbers — so a finding that merely moved stays suppressed, while a finding
 * whose material subject changed (a different dependency, a different symbol) is a new fingerprint the
 * old suppression cannot match.
 */
export interface SuppressionRecord {
  finding_fingerprint: string;
  actor: string;
  reason: string;
  commit: string;
  expires_at: string;
}

/**
 * The material identity of a finding, as a stable SHA-256. It hashes the finding kind plus the sorted
 * evidence identities (source_type + source_uri + symbol) and the sorted suggested files. It deliberately
 * excludes line numbers, titles, and prose so a finding that moved lines keeps the same fingerprint, and
 * it deliberately includes the cited symbols/files so a materially different finding gets a new one.
 */
export function fingerprintFinding(finding: MinimalChangeFinding): string {
  const evidence = finding.evidence
    .map((record) => `${record.source_type}|${record.source_uri}|${record.symbol ?? ""}`)
    .sort(compareText);
  const files = [...finding.suggested_files].sort(compareText);
  const canonical = JSON.stringify({ kind: finding.kind, evidence, files });
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

export interface SuppressionResult {
  active: MinimalChangeFinding[];
  suppressed: Array<{ finding: MinimalChangeFinding; suppression: SuppressionRecord }>;
}

/**
 * Partition findings into those still active and those silenced by an unexpired, fingerprint-matching
 * suppression. `now` is an explicit ISO timestamp so the function stays deterministic (no wall-clock).
 */
export function applySuppressions(
  findings: readonly MinimalChangeFinding[],
  suppressions: readonly SuppressionRecord[],
  now: string,
): SuppressionResult {
  const nowMs = Date.parse(now);
  const active: MinimalChangeFinding[] = [];
  const suppressed: Array<{ finding: MinimalChangeFinding; suppression: SuppressionRecord }> = [];

  for (const finding of findings) {
    const fp = fingerprintFinding(finding);
    const match = suppressions.find((record) => {
      if (record.finding_fingerprint !== fp) return false;
      const expiresMs = Date.parse(record.expires_at);
      // An unparseable expiry is treated as expired (fails safe: the finding stays visible).
      if (Number.isNaN(expiresMs)) return false;
      // A suppression is active only strictly before its expiry (and while `now` is parseable).
      return !Number.isNaN(nowMs) && nowMs < expiresMs;
    });
    if (match) suppressed.push({ finding, suppression: match });
    else active.push(finding);
  }
  return { active, suppressed };
}
