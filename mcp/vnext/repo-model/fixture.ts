import type { Repository } from "./repository.js";
import type { EntityKind, ImpactClass, TrustState } from "./types.js";

/**
 * A deterministic, cross-phase repository-model fixture (version 1).
 *
 * The point of this fixture is compatibility: a v1 fixture serialized in Phase B must load unchanged
 * in a later phase, and two serializations of the same model must be byte-identical. To get there it:
 *
 *   - excludes every GENERATED TIMESTAMP (created_at/updated_at/observed_at/decided_at): they move on
 *     every re-compile and would defeat determinism;
 *   - excludes RAW PAYLOADS (event bodies live in the event log, never in the model tables this reads);
 *   - excludes LOCAL PATHS: the fixture carries only the repository-relative ground-truth anchors the
 *     model stores (path#symbol), never a host-absolute path — and it drops one defensively if seen;
 *   - sorts every entity, claim, evidence row, relation, review item, and claim-evidence link by its
 *     stable id, so element order never depends on insertion order or SQLite rowids.
 *
 * It reports exactly the trust the store holds. It invents nothing.
 */

export const REPOSITORY_MODEL_FIXTURE_VERSION = "repository-model.v1" as const;

export interface FixtureEntity {
  entity_id: string;
  repository_id: string;
  kind: EntityKind;
  canonical_name: string;
  slug: string;
  summary: string;
  status: string;
}

export interface FixtureClaim {
  claim_id: string;
  entity_id: string;
  claim_kind: string;
  normalized_content: string;
  trust_state: TrustState;
  confidence: number;
  impact_class: ImpactClass;
  valid_from_commit: string | null;
  valid_to_commit: string | null;
  supersedes_claim_id: string | null;
  review_policy: string;
  created_by: string;
}

export interface FixtureEvidence {
  evidence_id: string;
  repository_id: string;
  source_type: string;
  source_uri: string;
  source_fingerprint: string;
  commit: string | null;
  path: string | null;
  symbol: string | null;
  line_start: number | null;
  line_end: number | null;
  verification_method: string;
  verification_state: string;
  privacy_class: string;
}

export interface FixtureClaimEvidence {
  claim_id: string;
  evidence_id: string;
  stance: string;
}

export interface FixtureRelation {
  relation_id: string;
  repository_id: string;
  from_entity_id: string;
  relation_type: string;
  to_entity_id: string;
  evidence_id: string | null;
}

export interface FixtureReviewItem {
  review_item_id: string;
  repository_id: string;
  claim_id: string;
  reason: string;
  required_role: string;
  status: string;
}

export interface RepositoryModelFixtureV1 {
  fixture_version: typeof REPOSITORY_MODEL_FIXTURE_VERSION;
  repository_id: string;
  entities: FixtureEntity[];
  claims: FixtureClaim[];
  evidence: FixtureEvidence[];
  claim_evidence: FixtureClaimEvidence[];
  relations: FixtureRelation[];
  review_items: FixtureReviewItem[];
}

// A host-absolute path never belongs in a portable fixture. The model stores repo-relative anchors,
// but this strips a stray leading "/" defensively so a hand-seeded absolute path cannot leak in.
function portablePath(value: string | null): string | null {
  if (value === null) return null;
  return value.startsWith("/") ? value.replace(/^\/+/, "") : value;
}

export function serializeModelFixture(model: Repository, repositoryId: string): RepositoryModelFixtureV1 {
  const db = model.database;

  const entities = (
    db.prepare(
      `SELECT entity_id, repository_id, kind, canonical_name, slug, summary, status
       FROM entities WHERE repository_id = ? ORDER BY entity_id`,
    ).all(repositoryId) as unknown as FixtureEntity[]
  ).map((row) => ({ ...row }));

  const claims = (
    db.prepare(
      `SELECT c.claim_id, c.entity_id, c.claim_kind, c.normalized_content, c.trust_state, c.confidence,
              c.impact_class, c.valid_from_commit, c.valid_to_commit, c.supersedes_claim_id,
              c.review_policy, c.created_by
       FROM claims c JOIN entities e ON e.entity_id = c.entity_id
       WHERE e.repository_id = ? ORDER BY c.claim_id`,
    ).all(repositoryId) as unknown as FixtureClaim[]
  ).map((row) => ({ ...row }));

  const evidence = (
    db.prepare(
      `SELECT evidence_id, repository_id, source_type, source_uri, source_fingerprint,
              commit_hash AS "commit", path, symbol, line_start, line_end,
              verification_method, verification_state, privacy_class
       FROM evidence WHERE repository_id = ? ORDER BY evidence_id`,
    ).all(repositoryId) as unknown as FixtureEvidence[]
  ).map((row) => ({ ...row, path: portablePath(row.path) }));

  const claimEvidence = (
    db.prepare(
      `SELECT ce.claim_id, ce.evidence_id, ce.stance
       FROM claim_evidence ce
       JOIN claims c ON c.claim_id = ce.claim_id
       JOIN entities e ON e.entity_id = c.entity_id
       WHERE e.repository_id = ?
       ORDER BY ce.claim_id, ce.evidence_id`,
    ).all(repositoryId) as unknown as FixtureClaimEvidence[]
  ).map((row) => ({ ...row }));

  const relations = (
    db.prepare(
      `SELECT relation_id, repository_id, from_entity_id, relation_type, to_entity_id, evidence_id
       FROM relations WHERE repository_id = ? ORDER BY relation_id`,
    ).all(repositoryId) as unknown as FixtureRelation[]
  ).map((row) => ({ ...row }));

  const reviewItems = (
    db.prepare(
      `SELECT review_item_id, repository_id, claim_id, reason, required_role, status
       FROM review_items WHERE repository_id = ? ORDER BY review_item_id`,
    ).all(repositoryId) as unknown as FixtureReviewItem[]
  ).map((row) => ({ ...row }));

  return {
    fixture_version: REPOSITORY_MODEL_FIXTURE_VERSION,
    repository_id: repositoryId,
    entities,
    claims,
    evidence,
    claim_evidence: claimEvidence,
    relations,
    review_items: reviewItems,
  };
}

// A stable, pretty JSON rendering. Two calls over the same model produce byte-identical output.
export function renderModelFixture(fixture: RepositoryModelFixtureV1): string {
  return `${JSON.stringify(fixture, null, 2)}\n`;
}
