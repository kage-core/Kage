import test from "node:test";
import assert from "node:assert/strict";

import type { ClaimRecord, EntityKind, ImpactClass } from "../repo-model/types.js";
import { EntityResolver, slugify, type EntityAnchor, type EvidenceAnchorInput } from "./entity-resolver.js";
import { consolidate, analyzeContent } from "./consolidator.js";
import type { ClaimCandidate } from "./candidates.js";

const REPO = "repo";

// --- Entity resolver fixtures ------------------------------------------------

function fixtureResolver(
  seeds: Array<{
    entity_id: string;
    canonical_name: string;
    slug: string;
    kind?: EntityKind;
    paths?: readonly string[];
    symbols?: readonly string[];
  }>,
): EntityResolver {
  const anchors: EntityAnchor[] = seeds.map((s) => ({
    entity_id: s.entity_id,
    kind: s.kind ?? "component",
    canonical_name: s.canonical_name,
    slug: s.slug,
    paths: s.paths,
    symbols: s.symbols,
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
  // `packages/auth` is a declared ground-truth path anchor of the component. A name-slug match
  // must not be what teaches the resolver that path (that would be a weak-match anchor); the seed
  // owns it outright, so all three surface forms fold onto the same entity regardless of order.
  const resolver = fixtureResolver([
    {
      entity_id: "component-auth",
      canonical_name: "Authentication Service",
      slug: "auth-service",
      paths: ["packages/auth"],
    },
  ]);
  for (const name of ["auth service", "auth-service", "packages/auth"]) {
    assert.equal(
      resolver.resolve("component", name, [evidenceFor("packages/auth")]).entity_id,
      "component-auth",
    );
  }
});

// Issue 4: resolution must be deterministic irrespective of call order. Previously `packages/auth`
// only resolved because a name-first resolve had learned it as an anchor; resolving the bare path
// first minted a NEW entity. With the seed owning the path anchor, order cannot change the outcome.
test("a bare path resolves to its declared entity regardless of call order", () => {
  const seed = [
    {
      entity_id: "component-auth",
      canonical_name: "Authentication Service",
      slug: "auth-service",
      paths: ["packages/auth"],
    },
  ];

  // Bare path resolved FIRST on a fresh resolver.
  const pathFirst = fixtureResolver(seed);
  const r1 = pathFirst.resolve("component", "packages/auth", [evidenceFor("packages/auth")]);
  assert.equal(r1.entity_id, "component-auth");
  assert.equal(r1.created, false);
  assert.equal(r1.matched_by, "path_anchor");

  // Name resolved first, then the bare path — same outcome.
  const nameFirst = fixtureResolver(seed);
  nameFirst.resolve("component", "auth service", [evidenceFor("packages/auth")]);
  const r2 = nameFirst.resolve("component", "packages/auth", [evidenceFor("packages/auth")]);
  assert.equal(r2.entity_id, "component-auth");
  assert.equal(r2.created, false);
});

// Issue 4 (root cause): when the path is NOT a declared anchor, a name-slug match must not learn it,
// so a subsequent bare-path resolve yields the SAME entity whether or not a name resolved first.
// Previously a name-first call learned the path and folded the bare path onto the component, while a
// path-first call minted a new entity — an order-dependent, non-deterministic result.
test("an undeclared evidence path resolves deterministically regardless of a prior name match", () => {
  const seed = [
    { entity_id: "component-auth", canonical_name: "Authentication Service", slug: "auth-service" },
  ];

  // Bare path with no prior calls: no declared anchor, so a fresh entity is minted.
  const pathOnly = fixtureResolver(seed);
  const baseline = pathOnly.resolve("component", "src/shared/util.ts", [evidenceFor("src/shared/util.ts")]);
  assert.equal(baseline.created, true);

  // A prior name-slug match must not change that outcome by learning the shared path.
  const afterName = fixtureResolver(seed);
  afterName.resolve("component", "auth service", [evidenceFor("src/shared/util.ts")]);
  const withPriorName = afterName.resolve(
    "component",
    "src/shared/util.ts",
    [evidenceFor("src/shared/util.ts")],
  );
  assert.equal(withPriorName.created, true);
  assert.equal(withPriorName.entity_id, baseline.entity_id);
  assert.notEqual(withPriorName.entity_id, "component-auth");
});

// Issue 1: a resolve that matched only by a weak name slug must NOT record its evidence path as a
// durable ground-truth anchor. Shared source files are the norm, so a later, differently-named
// entity citing the same file must never collapse onto the first.
test("a slug match never records the evidence path as a ground-truth anchor", () => {
  const resolver = fixtureResolver([
    { entity_id: "component-auth", canonical_name: "Authentication Service", slug: "auth-service" },
  ]);

  // Matches by the name slug; the cited file is a shared utility, not a defining anchor.
  const first = resolver.resolve("component", "auth service", [evidenceFor("src/shared/util.ts")]);
  assert.equal(first.entity_id, "component-auth");
  assert.equal(first.matched_by, "slug");

  // A distinct component whose evidence cites the same shared file must stand up on its own.
  const second = resolver.resolve("component", "logging utility", [evidenceFor("src/shared/util.ts")]);
  assert.notEqual(second.entity_id, "component-auth");
  assert.equal(second.created, true);
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

// Issue 2: a directional/relational fact and its reverse share the same bag of stemmed words but
// mean opposite things. They must NOT collapse to refresh_evidence (which would keep the stale fact
// and silently discard the reversed one).
test("a reversed directional relation is not a duplicate", () => {
  const result = consolidate(
    existingClaim("billing depends on auth"),
    candidate("auth depends on billing"),
  );
  assert.notEqual(result.action, "refresh_evidence");
  assert.equal(result.action, "supersede");
});

// Issue 3: a real contradiction expressed with extra words (a replacement clause) must still route
// to review, not silently supersede a verified claim with an unverified proposal.
test("a replacement-clause contradiction routes to review, not supersede", () => {
  const result = consolidate(
    existingClaim("Auth uses sessions", { trust_state: "verified" }),
    candidate("Auth uses stateless tokens instead of sessions", { proposed_trust_state: "proposed" }),
  );
  assert.equal(result.action, "review_contradiction");
  if (result.action === "review_contradiction") {
    assert.equal(result.claim_id, "claim-existing");
  }
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
