import type { Repository } from "./repository.js";
import type { ClaimWithEvidence, EntityKind, EntityRecord, RelatedEntity } from "./types.js";

export interface FeatureHealth {
  verified: number;
  stale: number;
  disputed: number;
  missing_required_fields: string[];
}

export interface FeatureReadModel {
  feature: EntityRecord;
  claims: ClaimWithEvidence[];
  components: RelatedEntity[];
  flows: RelatedEntity[];
  contracts: RelatedEntity[];
  owners: RelatedEntity[];
  tests: RelatedEntity[];
  decisions: RelatedEntity[];
  runbooks: RelatedEntity[];
  incidents: RelatedEntity[];
  health: FeatureHealth;
}

export interface RunbookReadModel {
  runbook: EntityRecord;
  claims: ClaimWithEvidence[];
  components: RelatedEntity[];
  incidents: RelatedEntity[];
}

// A feature is considered documented only when it names an owner and has a test surface. These are
// the required fields whose absence the read model surfaces honestly rather than papering over.
const REQUIRED_FEATURE_FIELDS = ["owners", "tests"] as const;

// Which related-entity kind lands in which bucket. Anything not listed here is intentionally omitted
// from the read model rather than silently dumped into a catch-all.
const KIND_BUCKETS: Record<string, EntityKind> = {
  components: "component",
  flows: "flow",
  contracts: "contract",
  owners: "owner",
  tests: "test_surface",
  decisions: "decision",
  runbooks: "runbook",
  incidents: "incident",
};

function relatedByKind(model: Repository, entityId: string): Record<string, RelatedEntity[]> {
  const buckets: Record<string, RelatedEntity[]> = {};
  for (const bucket of Object.keys(KIND_BUCKETS)) buckets[bucket] = [];
  for (const relation of model.relationsFrom(entityId)) {
    const target = model.getEntity(relation.to_entity_id);
    if (!target) continue; // A dangling relation is not evidence of anything; skip it.
    for (const [bucket, kind] of Object.entries(KIND_BUCKETS)) {
      if (target.kind === kind) {
        buckets[bucket].push({
          entity: target,
          relation_type: relation.relation_type,
          evidence_id: relation.evidence_id,
        });
      }
    }
  }
  return buckets;
}

function injectableClaimsWithEvidence(model: Repository, entityId: string): ClaimWithEvidence[] {
  // `injectableClaims` already excludes proposed/stale/disputed/superseded/archived, so `current`
  // views never leak a non-injectable claim.
  return model.injectableClaims(entityId).map((claim) => ({
    claim,
    evidence: model.evidenceForClaim(claim.claim_id),
  }));
}

export function featureReadModel(model: Repository, featureId: string): FeatureReadModel {
  const feature = model.getEntity(featureId);
  if (!feature) throw new Error(`Unknown feature entity ${featureId}.`);

  const claims = injectableClaimsWithEvidence(model, featureId);
  const buckets = relatedByKind(model, featureId);

  // Health counts span every claim on the entity, not just the injectable ones, so the honest state
  // of the feature (including disputed/stale claims deliberately withheld from `claims`) is visible.
  const allClaims = model.claimsForEntity(featureId);
  const verified = allClaims.filter((c) => c.trust_state === "verified" || c.trust_state === "approved").length;
  const stale = allClaims.filter((c) => c.trust_state === "stale").length;
  const disputed = allClaims.filter((c) => c.trust_state === "disputed").length;

  const missing_required_fields = REQUIRED_FEATURE_FIELDS.filter((field) => buckets[field].length === 0);

  return {
    feature,
    claims,
    components: buckets.components,
    flows: buckets.flows,
    contracts: buckets.contracts,
    owners: buckets.owners,
    tests: buckets.tests,
    decisions: buckets.decisions,
    runbooks: buckets.runbooks,
    incidents: buckets.incidents,
    health: { verified, stale, disputed, missing_required_fields },
  };
}

export function runbookReadModel(model: Repository, runbookId: string): RunbookReadModel {
  const runbook = model.getEntity(runbookId);
  if (!runbook) throw new Error(`Unknown runbook entity ${runbookId}.`);
  const buckets = relatedByKind(model, runbookId);
  return {
    runbook,
    claims: injectableClaimsWithEvidence(model, runbookId),
    components: buckets.components,
    incidents: buckets.incidents,
  };
}
