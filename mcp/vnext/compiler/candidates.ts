import { createHash } from "node:crypto";

import type { EvidenceEvent } from "../protocol/index.js";
import type { ClaimRecord, EntityKind, EpisodeRecord, ImpactClass } from "../repo-model/types.js";
import type { IndexedFact } from "../repo-index/source.js";

/**
 * Compiler claim candidates.
 *
 * An extractor turns deterministic observations (episodes of raw events, or a repository snapshot's
 * code-graph facts) into `ClaimCandidate`s. A candidate is a *proposal* of a repository claim: it
 * names the entity, the claim, the evidence backing it, and the trust the extractor believes it has
 * earned. Nothing here writes to the store and nothing here is authoritative about injection — the
 * admission policy (`admission.ts`) is the single gate that decides whether a candidate is admissible
 * at all and clamps its trust to the honest ceiling. Extractors may only ever *propose* a trust
 * state; admission can reject or down-grade, never up-grade.
 */

export interface ClaimCandidate {
  candidate_id: string;
  repository_id: string;
  entity_kind: EntityKind;
  entity_name: string;
  claim_kind: string;
  content: string;
  evidence_ids: string[];
  // An extractor may only propose `proposed` or `verified`. Every other lifecycle state is minted by
  // later stages (consolidation, human review, staleness), never by extraction.
  proposed_trust_state: "proposed" | "verified";
  impact_class: ImpactClass;
  extraction_method: "deterministic" | "model";
  review_policy: ClaimRecord["review_policy"];
}

// An episode paired with the raw events it was built from. Extractors need the event payloads
// (commands, exit codes, paths) that the compact `EpisodeRecord` does not carry.
export interface EpisodeContext {
  episode: EpisodeRecord;
  events: EvidenceEvent[];
}

// Deterministic evidence identifiers. Task 5 does not create evidence rows (Task 7/8 do); it only
// references the evidence a later stage will materialize, so the ids must be a pure function of the
// underlying observation. An execution event is evidenced by its event; a code-graph fact by its
// fact id.
export function eventEvidenceId(event: EvidenceEvent): string {
  return `evidence:event:${event.event_id}`;
}

export function factEvidenceId(fact: IndexedFact): string {
  return `evidence:fact:${fact.fact_id}`;
}

/**
 * A stable candidate id, derived only from the identity-bearing fields. Two extractions of the same
 * observation must yield the same id so consolidation is replay-safe (mirrors the episode-builder's
 * content-derived ids). Fields are length-prefixed so no value can forge a collision.
 */
export function candidateId(parts: {
  repository_id: string;
  entity_kind: EntityKind;
  entity_name: string;
  claim_kind: string;
  content: string;
}): string {
  const encoded = [parts.repository_id, parts.entity_kind, parts.entity_name, parts.claim_kind, parts.content]
    .map((field) => `${Buffer.byteLength(field, "utf8")}:${field}`)
    .join("");
  const digest = createHash("sha256").update(encoded).digest("hex").slice(0, 32);
  return `candidate-${digest}`;
}

// Entity kinds whose claims may never be auto-verified — a decision, an ownership assertion, a
// critical invariant, or an incident is always a human/authority judgement, so extraction can only
// ever propose them for review. This is the entity-level half of the honesty ceiling; the
// impact/method/evidence half lives in admission.
export const ALWAYS_PROPOSED_KINDS: ReadonlySet<EntityKind> = new Set<EntityKind>([
  "decision",
  "owner",
  "invariant",
  "incident",
]);

// The review role a claim about this kind of entity requires. `automatic` is the only role that
// permits deterministic auto-verification; owner/security/operations always route to a human.
export function reviewPolicyFor(kind: EntityKind): ClaimRecord["review_policy"] {
  switch (kind) {
    case "decision":
    case "owner":
      return "owner";
    case "invariant":
      return "security";
    case "incident":
      return "operations";
    default:
      return "automatic";
  }
}

// The default impact of a claim about this kind of entity. Structural certainties (a declared
// script, a route, a test surface, a dependency) are low/medium; decisions/incidents are high;
// invariants are critical. Extractors may raise (never silently lower) this per candidate.
export function impactFor(kind: EntityKind): ImpactClass {
  switch (kind) {
    case "invariant":
      return "critical";
    case "decision":
    case "incident":
      return "high";
    case "runbook":
    case "component":
    case "flow":
    case "feature":
    case "data_model":
    case "owner":
      return "medium";
    default:
      return "low";
  }
}
