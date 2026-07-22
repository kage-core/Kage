import test from "node:test";
import assert from "node:assert/strict";

import { openVnextDatabase, type LocalDatabase } from "../storage/database.js";
import { migrateLocalDatabase } from "../storage/migrations.js";
import { Repository } from "../repo-model/repository.js";
import type { EntityKind, EvidenceRecord } from "../repo-model/types.js";
import type { ContextCandidate, ContextRequest, ContextSource } from "./source.js";
import { ModelContextSource } from "./model-source.js";
import { compareContextSources, ProgressiveContextSource } from "./context-comparison.js";

const NOW = "2026-07-13T00:00:00.000Z";
const REPO = "repository:local";

function migratedDatabase(): LocalDatabase {
  const db = openVnextDatabase(":memory:");
  migrateLocalDatabase(db);
  return db;
}

let evidenceCounter = 0;

// A verified, source-backed evidence row anchored at a real path/symbol.
function verifiedEvidence(model: Repository, path: string, symbol: string): EvidenceRecord {
  evidenceCounter += 1;
  return model.addEvidence({
    evidence_id: `ev-${evidenceCounter}`,
    repository_id: REPO,
    source_type: "source",
    source_uri: `fact:${path}#${symbol}`,
    source_fingerprint: `fp-${evidenceCounter}`,
    commit: "abc123",
    path,
    symbol,
    line_start: 1,
    line_end: 10,
    verification_method: "source_fingerprint",
    verification_state: "verified",
    privacy_class: "team_metadata",
    observed_at: NOW,
  });
}

function entity(model: Repository, kind: EntityKind, name: string, slug: string, summary: string): string {
  const created = model.upsertEntity({
    entity_id: `entity:${slug}`,
    repository_id: REPO,
    kind,
    canonical_name: name,
    slug,
    summary,
    status: "active",
    created_at: NOW,
    updated_at: NOW,
  });
  return created.entity_id;
}

let claimCounter = 0;

function verifiedClaim(
  model: Repository,
  entityId: string,
  claimKind: string,
  content: string,
  impact: "low" | "medium" | "high" | "critical",
  evidencePath: string,
  evidenceSymbol: string,
): string {
  claimCounter += 1;
  const evidence = verifiedEvidence(model, evidencePath, evidenceSymbol);
  const claim = model.createClaim(
    {
      claim_id: `claim-${claimCounter}`,
      entity_id: entityId,
      claim_kind: claimKind,
      normalized_content: content,
      trust_state: "verified",
      confidence: 1,
      impact_class: impact,
      valid_from_commit: null,
      valid_to_commit: null,
      supersedes_claim_id: null,
      review_policy: "automatic",
      created_by: "compiler",
      created_at: NOW,
      updated_at: NOW,
    },
    [{ evidence_id: evidence.evidence_id, stance: "supports" }],
  );
  return claim.claim_id;
}

function proposedClaim(model: Repository, entityId: string, content: string): string {
  claimCounter += 1;
  const claim = model.createClaim({
    claim_id: `claim-${claimCounter}`,
    entity_id: entityId,
    claim_kind: "behavior",
    normalized_content: content,
    trust_state: "proposed",
    confidence: 0.5,
    impact_class: "low",
    valid_from_commit: null,
    valid_to_commit: null,
    supersedes_claim_id: null,
    review_policy: "automatic",
    created_by: "compiler",
    created_at: NOW,
    updated_at: NOW,
  });
  return claim.claim_id;
}

let relationCounter = 0;

function relate(model: Repository, from: string, type: string, to: string): void {
  relationCounter += 1;
  model.addRelation({
    relation_id: `rel-${relationCounter}`,
    repository_id: REPO,
    from_entity_id: from,
    relation_type: type,
    to_entity_id: to,
    evidence_id: null,
    created_at: NOW,
  });
}

// A realistic authentication read model: a feature seeded by the query, wired to a component, a flow,
// a critical invariant, a decision, a test surface, an owner, and a runbook — plus a non-injectable
// (proposed) claim that must never be surfaced.
function repositoryModelFixture(): Repository {
  const db = migratedDatabase();
  const model = new Repository(db);

  const feature = entity(model, "feature", "Authentication", "authentication", "How a user authenticates.");
  verifiedClaim(
    model,
    feature,
    "architecture",
    "Authentication flow: a request enters through the login entry point and passes session validation.",
    "high",
    "src/auth/login.ts",
    "login",
  );

  const component = entity(model, "component", "Session store", "session-store", "Stores sessions.");
  verifiedClaim(model, component, "behavior", "The session store persists sessions in Redis.", "medium", "src/auth/session.ts", "SessionStore");
  proposedClaim(model, component, "The session store MIGHT switch to Postgres (unverified).");
  relate(model, feature, "depends_on", component);

  const flow = entity(model, "flow", "Login flow", "login-flow", "The login request flow.");
  verifiedClaim(model, flow, "behavior", "The login flow validates credentials then issues a session token.", "medium", "src/auth/login.ts", "handleLogin");
  relate(model, feature, "has_flow", flow);

  const invariant = entity(model, "invariant", "No password logging", "no-password-logging", "Passwords must never be logged.");
  verifiedClaim(model, invariant, "invariant", "Passwords are never written to logs; the logger redacts credential fields.", "critical", "src/auth/logger.ts", "redact");
  relate(model, feature, "constrained_by", invariant);

  const decision = entity(model, "decision", "Use JWT sessions", "use-jwt-sessions", "We chose JWT sessions.");
  verifiedClaim(model, decision, "decision", "Sessions use signed JWTs so the store stays stateless.", "medium", "docs/adr/0007-jwt.md", "adr-0007");
  relate(model, feature, "decided_by", decision);

  const test = entity(model, "test_surface", "Auth tests", "auth-tests", "Tests for authentication.");
  verifiedClaim(model, test, "verification", "auth.test.ts exercises login, logout, and session expiry.", "low", "src/auth/auth.test.ts", "auth-suite");
  relate(model, feature, "verified_by", test);

  const owner = entity(model, "owner", "Platform team", "platform-team", "Owns authentication.");
  verifiedClaim(model, owner, "ownership", "The platform team owns the authentication feature.", "low", "CODEOWNERS", "auth");
  relate(model, feature, "owned_by", owner);

  const runbook = entity(model, "runbook", "Rotate signing key", "rotate-signing-key", "How to rotate the JWT signing key.");
  verifiedClaim(model, runbook, "runbook", "To rotate the signing key, deploy the new key, then revoke the old one after 24h.", "high", "docs/runbooks/rotate-key.md", "rotate");
  relate(model, feature, "operated_by", runbook);

  return model;
}

function fixtureContextRequest(overrides: Partial<ContextRequest> = {}): ContextRequest {
  return {
    repository: {
      repo_id: REPO,
      root: "/repo",
      remote: null,
      branch: "main",
      commit: "abc123",
      worktree: "/repo",
    },
    task: {
      task_id: "task-1",
      session_id: "session-1",
      user_id: null,
      agent_surface: "claude-code",
    },
    query: "how does authentication work?",
    targets: [],
    changed_files: [],
    token_budget: 4_000,
    ...overrides,
  };
}

function fixtureModelSource(model: Repository): ModelContextSource {
  return new ModelContextSource(model);
}

// A trivial legacy source stand-in: it returns a single verified candidate so the comparison has both
// sides to record.
function legacySource(): ContextSource {
  return {
    async find(): Promise<ContextCandidate[]> {
      return [
        {
          candidate_id: "memory:legacy-1",
          kind: "feature",
          title: "Legacy note",
          body: "Historical implementation note about authentication.",
          evidence_ids: ["legacy-packet-1"],
          trust_state: "approved",
          priority: 10,
        },
      ];
    },
  };
}

function modelSource(): ContextSource {
  return fixtureModelSource(repositoryModelFixture());
}

test("model source returns current architecture rather than historical implementation notes", async () => {
  const source = fixtureModelSource(repositoryModelFixture());
  const candidates = await source.find(fixtureContextRequest({ query: "how does authentication work?" }));
  assert.equal(candidates[0].kind, "feature");
  assert.match(candidates[0].body, /entry point|flow|invariant/i);
  assert.equal(candidates.some((candidate) => candidate.trust_state !== "verified" && candidate.trust_state !== "approved"), false);
});

test("compare mode records both sources but delivers legacy only", async () => {
  const result = await compareContextSources(fixtureContextRequest(), legacySource(), modelSource());
  assert.equal(result.delivered_source, "legacy");
  assert.ok(result.comparison.model_candidate_ids.length > 0);
});

test("the model source never surfaces a non-injectable (proposed) claim", async () => {
  const source = fixtureModelSource(repositoryModelFixture());
  const explained = await source.explain(fixtureContextRequest());
  // The proposed session-store claim was examined and rejected with a reason, never emitted.
  assert.ok(explained.rejections.some((r) => r.reason.includes("non_injectable")));
  assert.equal(explained.candidates.every((c) => c.trust_state === "verified" || c.trust_state === "approved"), true);
});

test("the delivered legacy candidates and recorded model candidates are both captured", async () => {
  const result = await compareContextSources(fixtureContextRequest(), legacySource(), modelSource());
  assert.ok(result.comparison.legacy_candidate_ids.includes("memory:legacy-1"));
  // The model surfaced the authentication feature.
  assert.ok(result.comparison.model_candidate_ids.some((id) => id.includes("authentication") || id.startsWith("model:")));
  // Shadow mode delivers legacy candidates verbatim.
  assert.deepEqual(result.delivered.map((c) => c.candidate_id), ["memory:legacy-1"]);
});

test("ProgressiveContextSource legacy mode delivers legacy and never consults the model", async () => {
  let modelConsulted = false;
  const model: ContextSource = {
    async find(): Promise<ContextCandidate[]> {
      modelConsulted = true;
      return [];
    },
  };
  const source = new ProgressiveContextSource(legacySource(), model, "legacy");
  const delivered = await source.find(fixtureContextRequest());
  assert.deepEqual(delivered.map((c) => c.candidate_id), ["memory:legacy-1"]);
  assert.equal(modelConsulted, false, "legacy mode never runs the model");
  assert.equal(source.comparison(), null);
});

test("ProgressiveContextSource compare mode delivers legacy but records the shadow comparison", async () => {
  const source = new ProgressiveContextSource(legacySource(), modelSource(), "compare");
  const delivered = await source.find(fixtureContextRequest());
  // Delivery is legacy — nothing the model proposes is injected in compare mode.
  assert.deepEqual(delivered.map((c) => c.candidate_id), ["memory:legacy-1"]);
  const comparison = source.comparison();
  assert.ok(comparison, "the shadow comparison was recorded");
  assert.ok(comparison!.model_candidate_ids.length > 0);
  assert.ok(comparison!.legacy_candidate_ids.includes("memory:legacy-1"));
});

test("ProgressiveContextSource compare mode never lets a model failure break delivery", async () => {
  const failingModel: ContextSource = {
    async find(): Promise<ContextCandidate[]> {
      throw new Error("model exploded");
    },
  };
  const source = new ProgressiveContextSource(legacySource(), failingModel, "compare");
  const delivered = await source.find(fixtureContextRequest());
  assert.deepEqual(delivered.map((c) => c.candidate_id), ["memory:legacy-1"], "delivery survives a model failure");
  assert.equal(source.comparison(), null, "a failed shadow records no comparison");
});

test("ProgressiveContextSource model mode delivers the model's verified/approved candidates", async () => {
  const source = new ProgressiveContextSource(legacySource(), modelSource(), "model");
  const delivered = await source.find(fixtureContextRequest());
  assert.ok(delivered.length > 0);
  assert.equal(delivered.every((c) => c.trust_state === "verified" || c.trust_state === "approved"), true);
  assert.equal(delivered.every((c) => c.candidate_id.startsWith("model:")), true);
});
