import type { Repository } from "../../repo-model/repository.js";
import type { EvidenceRecord } from "../../repo-model/types.js";
import type { ParsedDiff } from "../diff-parser.js";
import type { MinimalChangeFinding } from "../types.js";

/**
 * Shared plumbing for the deterministic post-diff rules (Phase D, Task 9).
 *
 * A post-diff rule is a PURE function of the parsed diff (ground truth), the task's declared scope, an
 * optional Phase B repository model, and the policy. It returns zero or more findings. Every rule is
 * deterministic: no wall-clock, no randomness, no model call beyond the read-only repository queries.
 */

export interface PostDiffTask {
  task_id: string;
  repository_id: string;
  // Component slugs the task is scoped to. A change under a different component is scope expansion.
  declared_components: string[];
}

export interface PostDiffPolicy {
  // Reuses the guard's advisory-by-default mode enum; post-diff itself never blocks (Task 10 decides).
  manifest_files: string[];
  lockfiles: string[];
  test_path_patterns: string[];
  contract_path_patterns: string[];
}

export interface RuleContext {
  task: PostDiffTask;
  diff: ParsedDiff;
  model: Repository | null;
  policy: PostDiffPolicy;
}

export type Rule = (ctx: RuleContext) => MinimalChangeFinding[];

// The diff has no observation timestamp of its own; using a fixed sentinel keeps evidence deterministic
// (gotcha G10) rather than stamping wall-clock time. It is honest: "derived from the parsed diff".
const DIFF_OBSERVED_AT = "diff";

/**
 * Build an `EvidenceRecord` that cites the parsed diff itself as ground truth. Post-diff findings are
 * grounded in the diff, not the repository model, so their evidence is `source_type: "git"` with a
 * deterministic id. `verification_state` is `verified` because the diff literally contains the change.
 */
export function diffEvidence(input: {
  repository_id: string;
  source_uri: string;
  path: string | null;
  symbol: string | null;
}): EvidenceRecord {
  return {
    evidence_id: `diff:${input.source_uri}${input.symbol ? `#${input.symbol}` : ""}`,
    repository_id: input.repository_id,
    source_type: "git",
    source_uri: input.source_uri,
    source_fingerprint: `diff:${input.path ?? input.source_uri}${input.symbol ? `#${input.symbol}` : ""}`,
    commit: null,
    path: input.path,
    symbol: input.symbol,
    line_start: null,
    line_end: null,
    verification_method: "diff_parse",
    verification_state: "verified",
    privacy_class: "team_metadata",
    observed_at: DIFF_OBSERVED_AT,
  };
}

export function basename(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx >= 0 ? path.slice(idx + 1) : path;
}

export function dirname(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx >= 0 ? path.slice(0, idx) : "";
}

export function isTestPath(path: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => path.includes(pattern));
}

export function matchesAny(path: string, patterns: readonly string[]): boolean {
  const lower = path.toLowerCase();
  return patterns.some((pattern) => lower.includes(pattern.toLowerCase()));
}

/**
 * All supporting evidence rows of the repository's injectable (verified/approved) claims, in a stable
 * order. This is the deterministic "what does the repository already contain" view the duplicate-symbol
 * and scope-expansion rules read. Non-injectable claims are excluded — the guard never grounds a finding
 * on unverified model state.
 */
export function injectableEvidence(model: Repository, repositoryId: string): EvidenceRecord[] {
  const out: EvidenceRecord[] = [];
  const seen = new Set<string>();
  for (const entity of model.listEntities(repositoryId)) {
    for (const claim of model.injectableClaims(entity.entity_id)) {
      for (const link of model.evidenceForClaim(claim.claim_id)) {
        if (link.stance !== "supports") continue;
        if (seen.has(link.evidence.evidence_id)) continue;
        seen.add(link.evidence.evidence_id);
        out.push(link.evidence);
      }
    }
  }
  return out;
}

/**
 * Map each component entity to the source directories it owns, derived from its injectable evidence
 * paths. A change to a file under one of those directories is attributed to that component. Returns
 * entries sorted by descending directory length so the longest (most specific) prefix wins.
 */
export function componentDirectories(
  model: Repository,
  repositoryId: string,
): Array<{ slug: string; directory: string; evidence: EvidenceRecord }> {
  const entries: Array<{ slug: string; directory: string; evidence: EvidenceRecord }> = [];
  for (const entity of model.listEntities(repositoryId, "component")) {
    for (const claim of model.injectableClaims(entity.entity_id)) {
      for (const link of model.evidenceForClaim(claim.claim_id)) {
        if (link.stance !== "supports" || !link.evidence.path) continue;
        entries.push({ slug: entity.slug, directory: dirname(link.evidence.path), evidence: link.evidence });
      }
    }
  }
  entries.sort(
    (a, b) => b.directory.length - a.directory.length || compareText(a.slug, b.slug) || compareText(a.evidence.evidence_id, b.evidence.evidence_id),
  );
  return entries;
}

export function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
