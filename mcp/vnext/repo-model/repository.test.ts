import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openVnextDatabase, type LocalDatabase } from "../storage/database.js";
import { migrateLocalDatabase } from "../storage/migrations.js";
import { Repository, ReviewStateError } from "./repository.js";
import { featureReadModel } from "./queries.js";
import type {
  ClaimRecord,
  EntityRecord,
  EvidenceRecord,
  ReviewItemRecord,
} from "./types.js";

const NOW = "2026-07-13T00:00:00.000Z";

function migratedDatabase(): LocalDatabase {
  const db = openVnextDatabase(":memory:");
  migrateLocalDatabase(db);
  return db;
}

function fixtureModel(): Repository {
  const model = new Repository(migratedDatabase());
  model.upsertEntity({
    entity_id: "entity-1",
    repository_id: "repo-1",
    kind: "feature",
    canonical_name: "Refunds",
    slug: "refunds",
    summary: "Refund flow",
    status: "active",
    created_at: NOW,
    updated_at: NOW,
  });
  return model;
}

function fixtureClaim(overrides: Partial<ClaimRecord> = {}): ClaimRecord {
  return {
    claim_id: randomUUID(),
    entity_id: "entity-1",
    claim_kind: "behavior",
    normalized_content: "content",
    trust_state: "approved",
    confidence: 1,
    impact_class: "low",
    valid_from_commit: null,
    valid_to_commit: null,
    supersedes_claim_id: null,
    review_policy: "automatic",
    created_by: "compiler",
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function fixtureEvidence(overrides: Partial<EvidenceRecord> = {}): EvidenceRecord {
  return {
    evidence_id: randomUUID(),
    repository_id: "repo-1",
    source_type: "source",
    source_uri: `src/${randomUUID()}.ts`,
    source_fingerprint: randomUUID(),
    commit: "abc123",
    path: "src/refunds.ts",
    symbol: "refund",
    line_start: 1,
    line_end: 10,
    verification_method: "source_fingerprint",
    verification_state: "verified",
    privacy_class: "team_metadata",
    observed_at: NOW,
    ...overrides,
  };
}

function fixtureReview(overrides: Partial<ReviewItemRecord> = {}): ReviewItemRecord {
  return {
    review_item_id: randomUUID(),
    repository_id: "repo-1",
    claim_id: "claim-1",
    reason: "requires owner approval",
    required_role: "owner",
    status: "open",
    assigned_to: null,
    decided_by: null,
    decided_at: null,
    decision_note: null,
    created_at: NOW,
    ...overrides,
  };
}

// Mint an injectable `approved` claim the only legal way: create it `proposed`, attach an accepted
// review item, then transition. Direct creation of an approved claim is (correctly) refused by the
// store, so tests that need one must walk the real lifecycle.
function approvedClaim(model: Repository, overrides: Partial<ClaimRecord> = {}): ClaimRecord {
  const claim = model.createClaim(fixtureClaim({ ...overrides, trust_state: "proposed" }));
  model.createReviewItem(fixtureReview({ claim_id: claim.claim_id, status: "accepted" }));
  return model.transitionClaim(claim.claim_id, "approved", "reviewer");
}

function fixtureEntity(overrides: Partial<EntityRecord> = {}): EntityRecord {
  return {
    entity_id: randomUUID(),
    repository_id: "repo-1",
    kind: "component",
    canonical_name: "Component",
    slug: `slug-${randomUUID()}`,
    summary: "",
    status: "active",
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

test("superseding a claim preserves history and excludes the old claim", () => {
  const model = fixtureModel();
  const evidence = model.addEvidence(fixtureEvidence({ verification_state: "verified" }));
  const first = approvedClaim(model, { normalized_content: "Auth uses sessions." });
  const second = model.supersedeClaim(
    first.claim_id,
    fixtureClaim({ trust_state: "verified", normalized_content: "Auth uses signed sessions." }),
    [{ evidence_id: evidence.evidence_id, stance: "supports" }],
  );
  assert.equal(model.getClaim(first.claim_id)?.trust_state, "superseded");
  assert.equal(second.supersedes_claim_id, first.claim_id);
  assert.deepEqual(model.injectableClaims(first.entity_id).map((claim) => claim.claim_id), [second.claim_id]);
});

test("a verified claim requires verified supporting evidence", () => {
  const model = fixtureModel();
  assert.throws(() => model.createClaim(fixtureClaim({ trust_state: "verified" })), /supporting evidence/);
});

test("a verified claim with verified supporting evidence is created and injectable", () => {
  const model = fixtureModel();
  const evidence = model.addEvidence(fixtureEvidence({ verification_state: "verified" }));
  const claim = model.createClaim(fixtureClaim({ trust_state: "verified" }), [
    { evidence_id: evidence.evidence_id, stance: "supports" },
  ]);
  assert.equal(model.getClaim(claim.claim_id)?.trust_state, "verified");
  assert.deepEqual(model.injectableClaims("entity-1").map((c) => c.claim_id), [claim.claim_id]);
});

test("a verified claim backed only by failed evidence is rejected", () => {
  const model = fixtureModel();
  const evidence = model.addEvidence(fixtureEvidence({ verification_state: "failed" }));
  assert.throws(
    () =>
      model.createClaim(fixtureClaim({ trust_state: "verified" }), [
        { evidence_id: evidence.evidence_id, stance: "supports" },
      ]),
    /supporting evidence/,
  );
});

test("addEvidence is idempotent on the same source fingerprint", () => {
  const model = fixtureModel();
  const shared = fixtureEvidence();
  const a = model.addEvidence(shared);
  const b = model.addEvidence({ ...shared, evidence_id: randomUUID() });
  // Same fingerprint => same stored evidence row is returned, not a duplicate.
  assert.equal(b.evidence_id, a.evidence_id);
  const count = model.countEvidence();
  assert.equal(count, 1);
});

test("upsertEntity preserves identity across repeated upserts", () => {
  const model = fixtureModel();
  const again = model.upsertEntity({
    entity_id: "entity-999",
    repository_id: "repo-1",
    kind: "feature",
    canonical_name: "Refunds Renamed",
    slug: "refunds",
    summary: "Updated",
    status: "active",
    created_at: NOW,
    updated_at: "2026-07-14T00:00:00.000Z",
  });
  assert.equal(again.entity_id, "entity-1");
  assert.equal(again.canonical_name, "Refunds Renamed");
  assert.equal(model.findEntity("repo-1", "feature", "refunds")?.entity_id, "entity-1");
});

test("proposed cannot jump to approved without a completed review item", () => {
  const model = fixtureModel();
  const claim = model.createClaim(fixtureClaim({ trust_state: "proposed" }));
  assert.throws(() => model.transitionClaim(claim.claim_id, "approved", "human"), /review/i);
});

test("approved is allowed once an accepted review item exists", () => {
  const model = fixtureModel();
  const claim = model.createClaim(fixtureClaim({ trust_state: "proposed" }));
  model.createReviewItem(fixtureReview({ claim_id: claim.claim_id, status: "accepted" }));
  const approved = model.transitionClaim(claim.claim_id, "approved", "human");
  assert.equal(approved.trust_state, "approved");
});

test("approved is unreachable from a non-proposed state without an accepted review item", () => {
  // Path A of the hardening: the approved gate must not be scoped to `from === 'proposed'`. A claim
  // that a compiler detected as disputed must not be launderable straight to the injectable
  // `approved` state by an actor who never produced a review item.
  const model = fixtureModel();
  const claim = model.createClaim(fixtureClaim({ trust_state: "proposed" }));
  model.transitionClaim(claim.claim_id, "disputed", "compiler");
  assert.throws(() => model.transitionClaim(claim.claim_id, "approved", "attacker"), /review/i);
  assert.deepEqual(model.injectableClaims("entity-1").map((c) => c.claim_id), []);
});

test("createClaim refuses an approved claim with no accepted review item", () => {
  // Path B of the hardening: `approved` is an injectable state, so minting it at creation with no
  // review item and no evidence would defeat the store-enforced honesty gate.
  const model = fixtureModel();
  assert.throws(() => model.createClaim(fixtureClaim({ trust_state: "approved" })), /review/i);
});

test("approval preserves the original creator's provenance", () => {
  // Issue 2: transitioning to approved must never overwrite created_by with the approver, or the
  // origin of the claim is destroyed and consumers read a fabricated author.
  const model = fixtureModel();
  const claim = model.createClaim(fixtureClaim({ trust_state: "proposed", created_by: "original-compiler" }));
  model.createReviewItem(fixtureReview({ claim_id: claim.claim_id, status: "accepted" }));
  const approved = model.transitionClaim(claim.claim_id, "approved", "reviewer-bob");
  assert.equal(approved.created_by, "original-compiler");
  assert.equal(model.getClaim(claim.claim_id)?.created_by, "original-compiler");
});

test("transitioning to verified requires verified supporting evidence", () => {
  const model = fixtureModel();
  const claim = model.createClaim(fixtureClaim({ trust_state: "proposed" }));
  assert.throws(() => model.transitionClaim(claim.claim_id, "verified", "compiler"), /supporting evidence/);
});

test("no transition is allowed out of a superseded claim", () => {
  const model = fixtureModel();
  const first = model.createClaim(fixtureClaim({ trust_state: "proposed" }));
  model.supersedeClaim(first.claim_id, fixtureClaim({ trust_state: "proposed" }));
  assert.throws(() => model.transitionClaim(first.claim_id, "verified", "compiler"), /superseded|terminal/i);
});

test("no transition is allowed out of an archived claim", () => {
  const model = fixtureModel();
  const claim = model.createClaim(fixtureClaim({ trust_state: "proposed" }));
  model.transitionClaim(claim.claim_id, "archived", "human");
  assert.throws(() => model.transitionClaim(claim.claim_id, "verified", "compiler"), /archived|terminal/i);
});

test("feature read model surfaces only injectable claims but counts the rest in health", () => {
  const model = fixtureModel();
  const injectable = approvedClaim(model, { normalized_content: "A" });
  model.createClaim(fixtureClaim({ trust_state: "proposed", normalized_content: "B" }));
  const disputed = model.createClaim(fixtureClaim({ trust_state: "proposed", normalized_content: "C" }));
  model.transitionClaim(disputed.claim_id, "disputed", "compiler");

  const rm = featureReadModel(model, "entity-1");
  assert.deepEqual(rm.claims.map((c) => c.claim.claim_id), [injectable.claim_id]);
  assert.equal(rm.health.verified, 1); // one approved/verified injectable claim
  assert.equal(rm.health.disputed, 1);
});

test("feature read model buckets related entities by kind and reports missing required fields", () => {
  const model = fixtureModel();
  const owner = model.upsertEntity(fixtureEntity({ kind: "owner", canonical_name: "Alice", slug: "alice" }));
  const evidence = model.addEvidence(fixtureEvidence());
  model.addRelation({
    relation_id: randomUUID(),
    repository_id: "repo-1",
    from_entity_id: "entity-1",
    relation_type: "owned_by",
    to_entity_id: owner.entity_id,
    evidence_id: evidence.evidence_id,
    created_at: NOW,
  });

  const rm = featureReadModel(model, "entity-1");
  assert.deepEqual(rm.owners.map((r) => r.entity.entity_id), [owner.entity_id]);
  assert.equal(rm.components.length, 0);
  // Owner present, but no test surface => "tests" is a missing required field.
  assert.ok(rm.health.missing_required_fields.includes("tests"));
  assert.ok(!rm.health.missing_required_fields.includes("owners"));
});

test("addRelation is idempotent on the same edge", () => {
  const model = fixtureModel();
  const other = model.upsertEntity(fixtureEntity({ kind: "component", slug: "comp" }));
  const edge = {
    relation_id: randomUUID(),
    repository_id: "repo-1",
    from_entity_id: "entity-1",
    relation_type: "depends_on",
    to_entity_id: other.entity_id,
    evidence_id: null,
    created_at: NOW,
  };
  model.addRelation(edge);
  model.addRelation({ ...edge, relation_id: randomUUID() });
  const rm = featureReadModel(model, "entity-1");
  assert.equal(rm.components.length, 1);
});

// A candidate claim (proposed) with an OPEN review item, ready to be accepted-with-supersession.
function candidateWithReview(
  model: Repository,
  overrides: Partial<ClaimRecord> = {},
): { claimId: string; reviewItemId: string } {
  const candidate = model.createClaim(fixtureClaim({ trust_state: "proposed", ...overrides }));
  const reviewItemId = randomUUID();
  model.createReviewItem(fixtureReview({ review_item_id: reviewItemId, claim_id: candidate.claim_id }));
  return { claimId: candidate.claim_id, reviewItemId };
}

test("resolveContradiction supersedes the opposing current claim in the same slot", () => {
  const model = fixtureModel();
  const evidence = model.addEvidence(fixtureEvidence({ verification_state: "verified" }));
  const opposing = model.createClaim(
    fixtureClaim({ trust_state: "verified", claim_kind: "behavior", normalized_content: "old" }),
    [{ evidence_id: evidence.evidence_id, stance: "supports" }],
  );
  const { claimId, reviewItemId } = candidateWithReview(model, {
    claim_kind: "behavior",
    normalized_content: "new",
  });
  const result = model.resolveContradiction(claimId, opposing.claim_id, reviewItemId, "owner-bob", "note");
  assert.equal(result.accepted.trust_state, "approved");
  assert.equal(result.replaced.trust_state, "superseded");
  assert.equal(model.getClaim(opposing.claim_id)?.trust_state, "superseded");
});

test("resolveContradiction refuses an opposing claim in a different entity", () => {
  const model = fixtureModel();
  const other = model.upsertEntity(fixtureEntity({ kind: "feature", slug: "billing" }));
  const evidence = model.addEvidence(fixtureEvidence({ verification_state: "verified" }));
  // A live verified claim that has NOTHING to do with the candidate's slot.
  const unrelated = model.createClaim(
    fixtureClaim({ entity_id: other.entity_id, trust_state: "verified", claim_kind: "behavior" }),
    [{ evidence_id: evidence.evidence_id, stance: "supports" }],
  );
  const { claimId, reviewItemId } = candidateWithReview(model, { entity_id: "entity-1", claim_kind: "behavior" });
  assert.throws(
    () => model.resolveContradiction(claimId, unrelated.claim_id, reviewItemId, "owner-bob", "note"),
    (err: unknown) => err instanceof ReviewStateError && /slot|opposing/i.test((err as ReviewStateError).code),
  );
  // The unrelated verified claim is untouched: still live, still in its slot.
  assert.equal(model.getClaim(unrelated.claim_id)?.trust_state, "verified");
});

test("resolveContradiction refuses an opposing claim in a different claim_kind slot", () => {
  const model = fixtureModel();
  const evidence = model.addEvidence(fixtureEvidence({ verification_state: "verified" }));
  // Same entity, DIFFERENT claim_kind — a different logical slot, must not be retired.
  const unrelated = model.createClaim(
    fixtureClaim({ entity_id: "entity-1", trust_state: "verified", claim_kind: "behavior-other" }),
    [{ evidence_id: evidence.evidence_id, stance: "supports" }],
  );
  const { claimId, reviewItemId } = candidateWithReview(model, { entity_id: "entity-1", claim_kind: "behavior" });
  assert.throws(
    () => model.resolveContradiction(claimId, unrelated.claim_id, reviewItemId, "owner-bob", "note"),
    (err: unknown) => err instanceof ReviewStateError && /slot|opposing/i.test((err as ReviewStateError).code),
  );
  assert.equal(model.getClaim(unrelated.claim_id)?.trust_state, "verified");
});
