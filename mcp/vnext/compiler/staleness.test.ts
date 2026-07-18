import test from "node:test";
import assert from "node:assert/strict";

import { openVnextDatabase, type LocalDatabase } from "../storage/database.js";
import { migrateLocalDatabase } from "../storage/migrations.js";
import { Repository } from "../repo-model/repository.js";
import type { ClaimRecord, EntityRecord, EvidenceRecord } from "../repo-model/types.js";
import { invalidateChangedEvidence } from "./staleness.js";

const NOW = "2026-07-13T00:00:00.000Z";

function migratedDatabase(): LocalDatabase {
  const db = openVnextDatabase(":memory:");
  migrateLocalDatabase(db);
  return db;
}

function entity(overrides: Partial<EntityRecord>): EntityRecord {
  return {
    entity_id: "entity",
    repository_id: "repo-1",
    kind: "component",
    canonical_name: "Component",
    slug: "component",
    summary: "",
    status: "active",
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function evidence(overrides: Partial<EvidenceRecord>): EvidenceRecord {
  return {
    evidence_id: "evidence",
    repository_id: "repo-1",
    source_type: "source",
    source_uri: "source",
    source_fingerprint: "fp",
    commit: null,
    path: null,
    symbol: null,
    line_start: null,
    line_end: null,
    verification_method: "source_fingerprint",
    verification_state: "verified",
    privacy_class: "team_metadata",
    observed_at: NOW,
    ...overrides,
  };
}

function verifiedClaim(overrides: Partial<ClaimRecord>): ClaimRecord {
  return {
    claim_id: "claim",
    entity_id: "entity",
    claim_kind: "behavior",
    normalized_content: "content",
    trust_state: "verified",
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

// Two verified claims, each grounded in verified evidence pointing at a distinct symbol.
function fixtureModelWithTwoClaims(): Repository {
  const model = new Repository(migratedDatabase());

  model.upsertEntity(entity({ entity_id: "auth", slug: "auth", canonical_name: "Auth" }));
  model.upsertEntity(entity({ entity_id: "billing", slug: "billing", canonical_name: "Billing" }));

  model.addEvidence(
    evidence({
      evidence_id: "ev-auth",
      source_uri: "source:src/auth.ts#login",
      path: "src/auth.ts",
      symbol: "login",
    }),
  );
  model.addEvidence(
    evidence({
      evidence_id: "ev-billing",
      source_uri: "source:src/billing.ts#charge",
      path: "src/billing.ts",
      symbol: "charge",
    }),
  );

  model.createClaim(verifiedClaim({ claim_id: "login-claim", entity_id: "auth" }), [
    { evidence_id: "ev-auth", stance: "supports" },
  ]);
  model.createClaim(verifiedClaim({ claim_id: "billing-claim", entity_id: "billing" }), [
    { evidence_id: "ev-billing", stance: "supports" },
  ]);
  return model;
}

test("changed cited symbol marks only dependent claims stale", async () => {
  const model = fixtureModelWithTwoClaims();
  await invalidateChangedEvidence(model, ["src/auth.ts#login"]);
  assert.equal(model.getClaim("login-claim")?.trust_state, "stale");
  assert.equal(model.getClaim("billing-claim")?.trust_state, "verified");
});

test("a whole-file change invalidates every claim grounded in that file", async () => {
  const model = fixtureModelWithTwoClaims();
  // A bare path (no #symbol) is a file-level change: it invalidates all evidence under that path.
  const result = await invalidateChangedEvidence(model, ["src/auth.ts"]);
  assert.deepEqual(result.invalidated, ["login-claim"]);
  assert.equal(model.getClaim("login-claim")?.trust_state, "stale");
  assert.equal(model.getClaim("billing-claim")?.trust_state, "verified");
});

test("an unrelated change invalidates nothing", async () => {
  const model = fixtureModelWithTwoClaims();
  const result = await invalidateChangedEvidence(model, ["src/other.ts#thing"]);
  assert.deepEqual(result.invalidated, []);
  assert.equal(model.getClaim("login-claim")?.trust_state, "verified");
  assert.equal(model.getClaim("billing-claim")?.trust_state, "verified");
});

test("invalidation is idempotent — replaying the same change re-marks nothing new", async () => {
  const model = fixtureModelWithTwoClaims();
  await invalidateChangedEvidence(model, ["src/auth.ts#login"]);
  const second = await invalidateChangedEvidence(model, ["src/auth.ts#login"]);
  // Already-stale claims are not re-counted (they are no longer injectable).
  assert.deepEqual(second.invalidated, []);
  assert.equal(model.getClaim("login-claim")?.trust_state, "stale");
});
