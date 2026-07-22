import type { EntityKind } from "../../repo-model/types.js";
import type { IndexedFact, RepositorySnapshot } from "../../repo-index/source.js";
import {
  candidateId,
  factEvidenceId,
  impactFor,
  reviewPolicyFor,
  type ClaimCandidate,
} from "../candidates.js";

/**
 * Repository extractor. Turns a repository snapshot's code-graph *facts* into structural claims.
 *
 * Facts are code-graph certainties (confidence 1), so a structural claim grounded directly in a fact
 * is deterministic with current direct evidence — the shape admission permits to auto-verify. The one
 * exception is ownership: a git-derived owner fact is a code-graph grounding, but *who owns what* is
 * an authority judgement, so owner candidates are always proposed with an owner review role (the
 * `ALWAYS_PROPOSED_KINDS` gate enforces this end-to-end).
 *
 * Only the fact kinds that map cleanly to a durable repository entity are surfaced. File and symbol
 * facts are too granular to be durable claims on their own; they remain raw evidence in the snapshot.
 */

interface FactMapping {
  entity_kind: EntityKind;
  claim_kind: string;
  describe: (fact: IndexedFact) => string;
}

const FACT_MAPPINGS: Partial<Record<IndexedFact["kind"], FactMapping>> = {
  script: {
    entity_kind: "runbook",
    claim_kind: "declared_script",
    describe: (fact) => `The repository declares a \`${fact.name}\` script in ${fact.path}.`,
  },
  route: {
    entity_kind: "contract",
    claim_kind: "exposed_route",
    describe: (fact) => `The repository exposes the route \`${fact.name}\`.`,
  },
  test: {
    entity_kind: "test_surface",
    claim_kind: "test_surface",
    describe: (fact) => `\`${fact.path}\` is a test surface in the repository.`,
  },
  dependency: {
    entity_kind: "dependency",
    claim_kind: "declared_dependency",
    describe: (fact) => `The repository depends on \`${fact.name}\` (declared in ${fact.path}).`,
  },
  owner: {
    entity_kind: "owner",
    claim_kind: "code_owner",
    describe: (fact) => `\`${fact.name}\` has authored changes in the repository.`,
  },
};

export function extractRepositoryCandidates(snapshot: RepositorySnapshot): ClaimCandidate[] {
  const candidates: ClaimCandidate[] = [];
  const seen = new Set<string>();

  // Iterate facts in a stable order (sorted by fact_id) so the candidate list is deterministic
  // regardless of snapshot fact ordering.
  const facts = [...snapshot.facts].sort((a, b) => a.fact_id.localeCompare(b.fact_id));

  for (const fact of facts) {
    const mapping = FACT_MAPPINGS[fact.kind];
    if (!mapping) continue;

    const content = mapping.describe(fact);
    const id = candidateId({
      repository_id: snapshot.repository.repo_id,
      entity_kind: mapping.entity_kind,
      entity_name: fact.name,
      claim_kind: mapping.claim_kind,
      content,
    });
    if (seen.has(id)) continue;
    seen.add(id);

    // Ownership is a code-graph grounding but an authority judgement — always proposed. Every other
    // structural fact is a deterministic certainty and may auto-verify (admission is the final gate).
    const verifiable = mapping.entity_kind !== "owner";

    candidates.push({
      candidate_id: id,
      repository_id: snapshot.repository.repo_id,
      entity_kind: mapping.entity_kind,
      entity_name: fact.name,
      claim_kind: mapping.claim_kind,
      content,
      evidence_ids: [factEvidenceId(fact)],
      proposed_trust_state: verifiable ? "verified" : "proposed",
      impact_class: impactFor(mapping.entity_kind),
      extraction_method: "deterministic",
      review_policy: reviewPolicyFor(mapping.entity_kind),
    });
  }

  return candidates;
}
