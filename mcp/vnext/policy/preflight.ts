import type { Repository } from "../repo-model/repository.js";
import type { ClaimRecord, EntityRecord, EvidenceRecord } from "../repo-model/types.js";
import type { ContextCandidate } from "../context/source.js";
import { normalizeFinding, type FindingKind, type MinimalChangeFinding } from "./types.js";

/**
 * Repository-specific Minimal Change preflight (Phase D, Task 8).
 *
 * Before an agent writes code, this walks the Phase B repository model and asks the honest question:
 * "does the smallest repository-native change already exist?" It climbs a fixed ladder — reuse an
 * existing repository symbol before reaching for a new dependency, before inventing a new abstraction —
 * and emits a recommendation ONLY when it is grounded in a real, injectable, evidence-backed claim.
 *
 * Three properties are load-bearing and enforced in code, not merely documented:
 *
 *  1. DETERMINISTIC. For a fixed model and task the findings, their order, and their evidence are
 *     byte-identical across runs. No wall-clock, no randomness, no model call.
 *  2. REPOSITORY-SPECIFIC & EVIDENCE-BACKED. Every recommendation cites real `EvidenceRecord`s drawn
 *     from injectable (`verified`/`approved`) claims. It never invents a helper: an entity with no
 *     injectable, source-anchored claim produces no `reuse_existing` finding.
 *  3. ADVISORY. Findings guide; they do not block. Every finding passes through `normalizeFinding`, so
 *     nothing subjective can be blocking. The preflight only produces deterministic findings, but the
 *     guard-rail is applied unconditionally so the honesty rule holds regardless of future rungs.
 */

export interface PreflightTask {
  task_id: string;
  repository_id: string;
  query: string;
  targets: string[];
  changed_files: string[];
}

export interface MinimalChangePreflightResult {
  task_id: string;
  recommendations: MinimalChangeFinding[];
}

// At most this many recommendations are surfaced. Minimal-change sections rank just below invariants in
// the capsule (KIND_RANK 2), so a long list would starve higher-priority safety context (gotcha G9).
const MAX_RECOMMENDATIONS = 5;

// Words that carry no repository-specific signal for matching a task to an existing symbol: articles,
// pronouns, and the generic verbs a task line opens with ("add a CSV export", "implement fetch").
const STOPWORDS = new Set([
  "add", "added", "adding", "create", "created", "creating", "implement", "implementing", "build",
  "building", "make", "making", "support", "supporting", "new", "use", "using", "fix", "fixing",
  "update", "updating", "change", "changing", "refactor", "wire", "handle", "handling", "enable",
  "the", "and", "for", "with", "that", "this", "into", "from", "over", "under", "your", "our",
  "its", "has", "have", "should", "would", "will", "does", "can", "when", "where", "which", "who",
  "what", "why", "how", "some", "any", "all", "via", "onto", "then", "than", "also",
]);

// Split camelCase/PascalCase boundaries and non-alphanumerics into lowercase tokens. `authenticatedFetch`
// becomes ["authenticated", "fetch"], so a task line and a code symbol share ground-truth tokens.
function tokenize(text: string): string[] {
  return text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function meaningful(tokens: readonly string[]): Set<string> {
  return new Set(tokens.filter((token) => token.length >= 3 && !STOPWORDS.has(token)));
}

// The tokens a task is "about": its query plus any target/changed-file basenames it names.
function taskTokens(task: PreflightTask): Set<string> {
  const raw = [task.query, ...task.targets, ...task.changed_files].flatMap((value) => tokenize(value));
  return meaningful(raw);
}

// The ground-truth tokens a single evidence row anchors: its symbol, its source_uri, and its path.
// Symbol tokens are the strongest anchor — a reuse must overlap a real code symbol, not just a summary.
function evidenceSymbolTokens(record: EvidenceRecord): Set<string> {
  const raw = [record.symbol ?? "", record.source_uri, record.path ?? ""].flatMap((value) => tokenize(value));
  return meaningful(raw);
}

function intersectionSize(left: ReadonlySet<string>, right: ReadonlySet<string>): number {
  let count = 0;
  for (const value of left) if (right.has(value)) count += 1;
  return count;
}

function rungFor(entity: EntityRecord): FindingKind {
  // A change that reaches for an already-present dependency is a different (higher-cost) rung than one
  // that reuses a first-party repository symbol. Everything first-party is `reuse_existing`.
  return entity.kind === "dependency" ? "use_existing_dependency" : "reuse_existing";
}

// Lower rank = higher-value, smaller change; sorted first. Post-diff kinds never come from preflight,
// but are ranked last so a shared comparator is total.
const RUNG_RANK: Record<FindingKind, number> = {
  no_change: 0,
  reuse_existing: 1,
  use_existing_dependency: 2,
  use_standard_library: 3,
  use_platform: 4,
  minimal_local_change: 5,
  new_abstraction: 6,
  new_dependency: 90,
  duplicate_symbol: 91,
  scope_expansion: 92,
  public_contract: 93,
  missing_verification: 94,
};

interface Match {
  entity: EntityRecord;
  claim: ClaimRecord;
  // Supporting evidence, ordered so the strongest symbol match is first.
  evidence: EvidenceRecord[];
  anchorSymbol: string;
  symbolOverlap: number;
  finding: MinimalChangeFinding;
}

export async function minimalChangePreflight(
  task: PreflightTask,
  model: Repository,
): Promise<MinimalChangePreflightResult> {
  const wanted = taskTokens(task);
  const matches: Match[] = [];

  // listEntities is deterministically ordered (kind, slug, entity_id); injectableClaims preserves the
  // store's (created_at, claim_id) order. Every downstream sort is total, so `find` is deterministic.
  for (const entity of model.listEntities(task.repository_id)) {
    for (const claim of model.injectableClaims(entity.entity_id)) {
      const supporting = model
        .evidenceForClaim(claim.claim_id)
        .filter((link) => link.stance === "supports")
        .map((link) => link.evidence);
      if (supporting.length === 0) continue; // No ground-truth anchor => not a repository-native fact.

      // Rank the claim's evidence by how strongly its symbol overlaps the task, so evidence[0] is the
      // reused symbol itself. Ties broken by evidence_id for determinism.
      const scored = supporting
        .map((record) => ({ record, overlap: intersectionSize(evidenceSymbolTokens(record), wanted) }))
        .sort((a, b) => b.overlap - a.overlap || compareText(a.record.evidence_id, b.record.evidence_id));

      const best = scored[0];
      if (!best || best.overlap === 0) continue; // The reuse must anchor to a real, matching symbol.

      const anchorSymbol = best.record.symbol ?? best.record.source_uri;
      const kind = rungFor(entity);
      const orderedEvidence = scored.map((item) => item.record);
      const finding = normalizeFinding({
        finding_id: `mc:${kind}:${claim.claim_id}`,
        kind,
        title: `Reuse ${anchorSymbol}`,
        explanation:
          `${entity.canonical_name} already provides \`${anchorSymbol}\`. Reuse it instead of adding a new implementation.`,
        evidence: orderedEvidence,
        deterministic: true,
        severity: "info",
        suggested_files: uniquePaths(orderedEvidence),
      });
      matches.push({ entity, claim, evidence: orderedEvidence, anchorSymbol, symbolOverlap: best.overlap, finding });
    }
  }

  matches.sort(
    (a, b) =>
      RUNG_RANK[a.finding.kind] - RUNG_RANK[b.finding.kind]
      || b.symbolOverlap - a.symbolOverlap
      || compareText(a.finding.finding_id, b.finding.finding_id),
  );

  const recommendations = matches.slice(0, MAX_RECOMMENDATIONS).map((match) => match.finding);
  return { task_id: task.task_id, recommendations };
}

function uniquePaths(evidence: readonly EvidenceRecord[]): string[] {
  const seen = new Set<string>();
  const paths: string[] = [];
  for (const record of evidence) {
    if (record.path && !seen.has(record.path)) {
      seen.add(record.path);
      paths.push(record.path);
    }
  }
  return paths;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Project preflight recommendations into `minimal_change` context candidates for the capsule builder.
 *
 * Only findings backed by at least one `verified` evidence row become candidates, and they are labelled
 * `trust_state: "verified"` — the same honesty gate the model source enforces, so a minimal-change
 * section can never be injected on unverified ground. Bodies are kept short (gotcha G9): a bloated
 * minimal-change section would starve invariant/verification sections that rank above it.
 */
export function preflightCandidates(result: MinimalChangePreflightResult): ContextCandidate[] {
  const candidates: ContextCandidate[] = [];
  for (const finding of result.recommendations) {
    const verifiedEvidence = finding.evidence.filter((record) => record.verification_state === "verified");
    if (verifiedEvidence.length === 0) continue; // Nothing verified to stand on: do not inject.
    candidates.push({
      candidate_id: `minimal-change:${finding.finding_id}`,
      kind: "minimal_change",
      title: finding.title,
      body: finding.explanation,
      evidence_ids: uniqueEvidenceIds(verifiedEvidence),
      trust_state: "verified",
      priority: 100 - RUNG_RANK[finding.kind],
    });
  }
  return candidates;
}

function uniqueEvidenceIds(evidence: readonly EvidenceRecord[]): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const record of evidence) {
    if (!seen.has(record.evidence_id)) {
      seen.add(record.evidence_id);
      ids.push(record.evidence_id);
    }
  }
  return ids;
}
