import type { Repository } from "../repo-model/repository.js";
import type { ClaimRecord, EntityKind, EntityRecord, ImpactClass } from "../repo-model/types.js";
import { isInjectableTrustState } from "../repo-model/types.js";
import type { CapsuleSection } from "../protocol/index.js";
import type { ContextCandidate, ContextRequest, ContextSource } from "./source.js";

/**
 * A model-backed context source.
 *
 * It answers a context request from the Phase B repository model rather than the legacy packet store:
 * it seeds entities from the task query and the changed/target paths, expands at most two relation
 * hops, and emits ONE candidate per grounded, injectable claim on the reached entities. Critical
 * invariants and verification surfaces are prioritized so the budget keeps them.
 *
 * The single honesty gate: only `verified`/`approved` claims are ever emitted (isInjectableTrustState).
 * Every non-injectable claim it examines is recorded as a REJECTION with a reason — never surfaced,
 * never silently dropped. The source proposes nothing and verifies nothing; it reads the trust the
 * store already holds and injects only what the store already made injectable.
 *
 * Deterministic: for a fixed model and request, `find` returns the same candidates in the same order.
 */

const MAX_RELATION_HOPS = 2;

// Entity kind → capsule section kind. Every model entity kind maps to exactly one section kind; a
// kind not listed here falls back to "feature" (a readable, non-privileged bucket) rather than being
// dropped.
const SECTION_KIND_BY_ENTITY: Record<EntityKind, CapsuleSection["kind"]> = {
  repository: "orientation",
  feature: "feature",
  component: "feature",
  flow: "entry_point",
  contract: "invariant",
  data_model: "invariant",
  invariant: "invariant",
  runbook: "runbook",
  decision: "decision",
  incident: "runbook",
  owner: "orientation",
  dependency: "orientation",
  test_surface: "verification",
};

// Priority is composed so a DIRECT query/target match always outranks anything reached by expansion,
// while critical invariants and verification surfaces are lifted within their hop so the budget keeps
// them. Seed = hop 0 (base 100); each hop costs 20. The kind/impact boosts are strictly smaller than
// one hop, so they re-order peers without ever promoting a distant claim above a direct match.
const HOP_BASE = 100;
const HOP_COST = 20;

const KIND_BOOST: Partial<Record<CapsuleSection["kind"], number>> = {
  invariant: 6,
  verification: 5,
  entry_point: 4,
  decision: 3,
  runbook: 2,
};

const IMPACT_BOOST: Record<ImpactClass, number> = {
  critical: 10,
  high: 5,
  medium: 2,
  low: 0,
};

const STOPWORDS = new Set([
  "how", "does", "do", "the", "and", "for", "with", "what", "why", "when", "where", "which",
  "who", "work", "works", "this", "that", "into", "from", "are", "was", "were", "can", "should",
  "would", "will", "about", "over", "under", "your", "you", "our", "its", "has", "have",
]);

function queryTokens(query: string): string[] {
  return [
    ...new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 4 && !STOPWORDS.has(token)),
    ),
  ];
}

function slugTokens(entity: EntityRecord): Set<string> {
  return new Set(
    `${entity.slug} ${entity.canonical_name} ${entity.summary}`
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 4),
  );
}

function pathMatchesTarget(anchorPath: string | null, targets: ReadonlySet<string>): boolean {
  if (!anchorPath) return false;
  if (targets.has(anchorPath)) return true;
  // A `path#symbol` target matches the file-level anchor, and a bare directory/file target matches a
  // deeper anchor path prefixed by it. Both are ground-truth, not name heuristics.
  for (const target of targets) {
    const file = target.split("#", 1)[0];
    if (file === anchorPath) return true;
    if (anchorPath === file || anchorPath.startsWith(`${file}/`)) return true;
  }
  return false;
}

export interface ModelSourceRejection {
  entity_id: string;
  claim_id: string | null;
  reason: string;
}

export interface ExplainedFind {
  candidates: ContextCandidate[];
  rejections: ModelSourceRejection[];
}

// A context source that can explain what it rejected, so a shadow comparison can record rejection
// reasons alongside the candidate set. Every ModelContextSource is one; the comparison degrades
// gracefully for sources that only implement `find`.
export interface ExplainingContextSource extends ContextSource {
  explain(request: ContextRequest): Promise<ExplainedFind>;
}

export function isExplainingSource(source: ContextSource): source is ExplainingContextSource {
  return typeof (source as ExplainingContextSource).explain === "function";
}

interface ReachedEntity {
  entity: EntityRecord;
  hop: number;
}

export class ModelContextSource implements ExplainingContextSource {
  constructor(private readonly model: Repository) {}

  async find(request: ContextRequest): Promise<ContextCandidate[]> {
    return (await this.explain(request)).candidates;
  }

  async explain(request: ContextRequest): Promise<ExplainedFind> {
    const repositoryId = request.repository.repo_id;
    const entities = this.model.listEntities(repositoryId);
    const byId = new Map(entities.map((entity) => [entity.entity_id, entity] as const));

    const tokens = queryTokens(request.query);
    const targets = new Set<string>([...request.targets, ...request.changed_files]);

    const reached = new Map<string, ReachedEntity>();
    const seeds: EntityRecord[] = [];
    for (const entity of entities) {
      if (this.isSeed(entity, tokens, targets)) {
        seeds.push(entity);
        reached.set(entity.entity_id, { entity, hop: 0 });
      }
    }

    // Breadth-first expansion, at most MAX_RELATION_HOPS from any seed. A closer path to the same
    // entity always wins (we never overwrite a lower hop with a higher one).
    let frontier = seeds;
    for (let hop = 1; hop <= MAX_RELATION_HOPS && frontier.length; hop += 1) {
      const next: EntityRecord[] = [];
      for (const from of frontier) {
        for (const relation of this.model.relationsFrom(from.entity_id)) {
          const target = byId.get(relation.to_entity_id);
          if (!target) continue;
          if (reached.has(target.entity_id)) continue;
          reached.set(target.entity_id, { entity: target, hop });
          next.push(target);
        }
      }
      frontier = next;
    }

    const candidates: ContextCandidate[] = [];
    const rejections: ModelSourceRejection[] = [];

    for (const { entity, hop } of reached.values()) {
      const sectionKind = SECTION_KIND_BY_ENTITY[entity.kind] ?? "feature";
      for (const claim of this.model.claimsForEntity(entity.entity_id)) {
        if (!isInjectableTrustState(claim.trust_state)) {
          rejections.push({
            entity_id: entity.entity_id,
            claim_id: claim.claim_id,
            reason: `non_injectable_trust_state:${claim.trust_state}`,
          });
          continue;
        }
        const candidate = this.toCandidate(entity, claim, sectionKind, hop);
        if (!candidate) {
          rejections.push({ entity_id: entity.entity_id, claim_id: claim.claim_id, reason: "empty_content" });
          continue;
        }
        candidates.push(candidate);
      }
    }

    candidates.sort(compareCandidates);
    return { candidates, rejections };
  }

  private isSeed(entity: EntityRecord, tokens: readonly string[], targets: ReadonlySet<string>): boolean {
    if (tokens.length) {
      const entityTokens = slugTokens(entity);
      if (tokens.some((token) => entityTokens.has(token) || entity.slug.includes(token))) return true;
    }
    if (targets.size) {
      for (const claim of this.model.injectableClaims(entity.entity_id)) {
        for (const link of this.model.evidenceForClaim(claim.claim_id)) {
          if (pathMatchesTarget(link.evidence.path, targets)) return true;
        }
      }
    }
    return false;
  }

  private toCandidate(
    entity: EntityRecord,
    claim: ClaimRecord,
    sectionKind: CapsuleSection["kind"],
    hop: number,
  ): ContextCandidate | null {
    const body = claim.normalized_content.trim();
    if (!body) return null;
    // Evidence ids are the claim's SUPPORTING evidence; if an approved claim carries none, the claim
    // id itself is a real, traceable anchor — never a fabricated reference.
    const evidenceIds = this.model
      .evidenceForClaim(claim.claim_id)
      .filter((link) => link.stance === "supports")
      .map((link) => link.evidence.evidence_id);
    return {
      candidate_id: `model:${claim.claim_id}`,
      kind: sectionKind,
      title: entity.canonical_name,
      body,
      evidence_ids: evidenceIds.length ? evidenceIds : [claim.claim_id],
      // Filtered to injectable above; the cast records what the store already guaranteed.
      trust_state: claim.trust_state as "verified" | "approved",
      priority: candidatePriority(sectionKind, claim.impact_class, hop),
    };
  }
}

function candidatePriority(kind: CapsuleSection["kind"], impact: ImpactClass, hop: number): number {
  return HOP_BASE - hop * HOP_COST + (KIND_BOOST[kind] ?? 0) + IMPACT_BOOST[impact];
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

// Highest priority first; ties broken deterministically by candidate id so a fixed model/request
// always yields the same order.
function compareCandidates(left: ContextCandidate, right: ContextCandidate): number {
  return right.priority - left.priority || compareText(left.candidate_id, right.candidate_id);
}
