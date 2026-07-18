import test from "node:test";
import assert from "node:assert/strict";

import type { ClaimRecord, EntityKind, ImpactClass } from "../repo-model/types.js";
import { EntityResolver, slugify, type EntityAnchor, type EvidenceAnchorInput } from "./entity-resolver.js";
import { consolidate, analyzeContent } from "./consolidator.js";
import type { ClaimCandidate } from "./candidates.js";

const REPO = "repo";

// --- Entity resolver fixtures ------------------------------------------------

function fixtureResolver(
  seeds: Array<{ entity_id: string; canonical_name: string; slug: string; kind?: EntityKind }>,
): EntityResolver {
  const anchors: EntityAnchor[] = seeds.map((s) => ({
    entity_id: s.entity_id,
    kind: s.kind ?? "component",
    canonical_name: s.canonical_name,
    slug: s.slug,
  }));
  return new EntityResolver(REPO, anchors);
}

function evidenceFor(path: string): EvidenceAnchorInput {
  return { path, symbol: null };
}

// --- Claim / candidate fixtures ---------------------------------------------

function existingClaim(content: string, overrides: Partial<ClaimRecord> = {}): ClaimRecord {
  return {
    claim_id: "claim-existing",
    entity_id: "entity-1",
    claim_kind: "behavior",
    normalized_content: content,
    trust_state: "verified",
    confidence: 0.9,
    impact_class: "low",
    valid_from_commit: null,
    valid_to_commit: null,
    supersedes_claim_id: null,
    review_policy: "automatic",
    created_by: "compiler",
    created_at: "2026-07-13T00:00:00.000Z",
    updated_at: "2026-07-13T00:00:00.000Z",
    ...overrides,
  };
}

function candidate(content: string, overrides: Partial<ClaimCandidate> = {}): ClaimCandidate {
  const impact: ImpactClass = "low";
  return {
    candidate_id: "candidate-1",
    repository_id: REPO,
    entity_kind: "component",
    entity_name: "entity-1",
    claim_kind: "behavior",
    content,
    evidence_ids: ["evidence:event:e-1"],
    proposed_trust_state: "proposed",
    impact_class: impact,
    extraction_method: "deterministic",
    review_policy: "automatic",
    ...overrides,
  };
}

// --- Resolver tests ----------------------------------------------------------

test("auth service aliases resolve to one component", () => {
  const resolver = fixtureResolver([
    { entity_id: "component-auth", canonical_name: "Authentication Service", slug: "auth-service" },
  ]);
  for (const name of ["auth service", "auth-service", "packages/auth"]) {
    assert.equal(
      resolver.resolve("component", name, [evidenceFor("packages/auth")]).entity_id,
      "component-auth",
    );
  }
});

test("resolver matches an exact stable entity id before any normalization", () => {
  const resolver = fixtureResolver([
    { entity_id: "component-auth", canonical_name: "Authentication Service", slug: "auth-service" },
  ]);
  const r = resolver.resolve("component", "component-auth", []);
  assert.equal(r.entity_id, "component-auth");
  assert.equal(r.matched_by, "stable_id");
  assert.equal(r.created, false);
});

test("resolver matches the canonical name via its slug alias", () => {
  const resolver = fixtureResolver([
    { entity_id: "component-auth", canonical_name: "Authentication Service", slug: "auth-service" },
  ]);
  const r = resolver.resolve("component", "Authentication Service", []);
  assert.equal(r.entity_id, "component-auth");
});

test("resolver does not cross entity kinds when resolving a slug", () => {
  const resolver = fixtureResolver([
    { entity_id: "component-auth", canonical_name: "Authentication Service", slug: "auth-service" },
  ]);
  const r = resolver.resolve("flow", "auth service", []);
  // No flow named auth-service exists, so this must not resolve to the component.
  assert.notEqual(r.entity_id, "component-auth");
  assert.equal(r.created, true);
});

test("an unknown name deterministically creates a new entity id", () => {
  const resolver = fixtureResolver([]);
  const a = resolver.resolve("component", "billing engine", []);
  const b = resolver.resolve("component", "billing engine", []);
  assert.equal(a.created, true);
  assert.equal(a.entity_id, b.entity_id); // deterministic and stable across calls
});

test("slugify normalizes case, spaces, and separators", () => {
  assert.equal(slugify("Authentication Service"), "authentication-service");
  assert.equal(slugify("auth service"), "auth-service");
  assert.equal(slugify("auth-service"), "auth-service");
});

// --- Consolidation tests -----------------------------------------------------

test("same supported fact refreshes evidence instead of appending a duplicate claim", () => {
  const result = consolidate(existingClaim("Tests run with npm test"), candidate("Tests run with npm test"));
  assert.equal(result.action, "refresh_evidence");
  if (result.action === "refresh_evidence") {
    assert.equal(result.claim_id, "claim-existing");
    assert.deepEqual(result.evidence_ids, ["evidence:event:e-1"]);
  }
});

test("opposing supported facts create a contradiction review item", () => {
  const result = consolidate(existingClaim("Auth uses sessions"), candidate("Auth does not use sessions"));
  assert.equal(result.action, "review_contradiction");
  if (result.action === "review_contradiction") {
    assert.equal(result.claim_id, "claim-existing");
  }
});

test("a reworded but equivalent fact refreshes rather than superseding", () => {
  const result = consolidate(existingClaim("Tests run with npm test"), candidate("tests   run  with npm test."));
  assert.equal(result.action, "refresh_evidence");
});

test("a genuinely different fact in the same slot supersedes the old version", () => {
  const result = consolidate(existingClaim("Build uses webpack"), candidate("Build uses vite"));
  assert.equal(result.action, "supersede");
  if (result.action === "supersede") {
    assert.equal(result.claim_id, "claim-existing");
    assert.equal(result.replacement.content, "Build uses vite");
  }
});

test("no existing claim yields a create action", () => {
  const result = consolidate(null, candidate("Auth uses sessions"));
  assert.equal(result.action, "create");
  if (result.action === "create") {
    assert.equal(result.candidate.content, "Auth uses sessions");
  }
});

test("consolidation never mutates the existing claim content in place", () => {
  const existing = existingClaim("Build uses webpack");
  const before = existing.normalized_content;
  consolidate(existing, candidate("Build uses vite"));
  assert.equal(existing.normalized_content, before);
});

test("analyzeContent detects polarity and equivalent word sets", () => {
  const a = analyzeContent("Auth uses sessions");
  const b = analyzeContent("Auth does not use sessions");
  assert.equal(a.polarity, "positive");
  assert.equal(b.polarity, "negative");
  assert.deepEqual([...a.words].sort(), [...b.words].sort());
});
