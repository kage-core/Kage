// Phase B gate — the test that has to be true for the portal/gateway to depend on the model.
//
// Phase A proved the audit path is honest. Phase B builds a compiled repository MODEL and a
// model-backed context source, and this gate proves the model can only ever help, never lie:
//
//   - Real repository fixtures produce feature, component, flow, decision, test, owner, and runbook
//     read models.
//   - The model-backed source injects ONLY verified/approved claims — a proposed/stale claim can
//     never reach a capsule.
//   - Deterministic low-risk facts auto-verify; high-impact facts always route to review.
//   - New events consolidate rather than accumulate duplicate claims (idempotent replay).
//   - Staleness invalidates a claim whose ground truth changed, and it drops out of delivery.
//   - Packet migration is dry-run first, fingerprint-guarded, imports nothing injectable, and is
//     reversible by OKF export.
//   - The model source passes shadow comparison against legacy recall (compare delivers legacy; the
//     progression gate measures the five criteria).
//   - The repository-model v1 fixture is deterministic (byte-identical across runs), sorted by id,
//     and carries no generated timestamps.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { openRepositoryModel } from "./migration/model-store.js";
import { Repository } from "./repo-model/repository.js";
import type { EntityKind, EvidenceRecord, ImpactClass } from "./repo-model/types.js";
import { featureReadModel, runbookReadModel } from "./repo-model/queries.js";
import { ModelContextSource } from "./context/model-source.js";
import {
  compareContextSources,
  evaluateProgression,
  type EvalCase,
} from "./context/context-comparison.js";
import type { ContextCandidate, ContextRequest, ContextSource } from "./context/source.js";
import { invalidateChangedEvidence } from "./compiler/staleness.js";
import { admitCandidate } from "./compiler/admission.js";
import type { ClaimCandidate } from "./compiler/candidates.js";
import { planMigration, applyMigration } from "./migration/migration-report.js";
import { exportModelConcept, renderModelConceptMarkdown, parseModelConcept } from "./okf/model-export.js";
import { serializeModelFixture } from "./repo-model/fixture.js";
import { assertVnextRuntime } from "./runtime/runtime-version.js";
import type { MemoryPacket } from "../kernel.js";

// dist/vnext -> repo root is three levels up.
const REPO_ROOT = join(__dirname, "..", "..", "..");
const REPORT_SCRIPT = join(REPO_ROOT, "scripts", "vnext-phase-b-report.mjs");
// dist/vnext -> dist is one level up; the shipped CLI a user actually runs.
const CLI = join(__dirname, "..", "cli.js");

const NOW = "2026-07-13T00:00:00.000Z";
const REPO = "repository:local";

function supportsVnextRuntime(): boolean {
  try {
    assertVnextRuntime();
    return true;
  } catch {
    return false;
  }
}

function tempProject(): string {
  return mkdtempSync(join(tmpdir(), "kage-vnext-phase-b-"));
}

// ---- fixture builder (explicit ids so the eval corpus can reference exact claims) ----

interface ClaimSpec {
  claim_id: string;
  content: string;
  impact: ImpactClass;
  path: string;
  symbol: string;
}

function addEntity(model: Repository, kind: EntityKind, name: string, slug: string, summary: string): string {
  return model.upsertEntity({
    entity_id: `entity:${slug}`,
    repository_id: REPO,
    kind,
    canonical_name: name,
    slug,
    summary,
    status: "active",
    created_at: NOW,
    updated_at: NOW,
  }).entity_id;
}

let evidenceSeq = 0;

function verifiedClaim(model: Repository, entityId: string, claimKind: string, spec: ClaimSpec): void {
  evidenceSeq += 1;
  const evidence: EvidenceRecord = {
    evidence_id: `ev-${spec.claim_id}`,
    repository_id: REPO,
    source_type: "source",
    source_uri: `fact:${spec.path}#${spec.symbol}`,
    source_fingerprint: `fp-${evidenceSeq}`,
    commit: "abc123",
    path: spec.path,
    symbol: spec.symbol,
    line_start: 1,
    line_end: 10,
    verification_method: "source_fingerprint",
    verification_state: "verified",
    privacy_class: "team_metadata",
    observed_at: NOW,
  };
  model.addEvidence(evidence);
  model.createClaim(
    {
      claim_id: spec.claim_id,
      entity_id: entityId,
      claim_kind: claimKind,
      normalized_content: spec.content,
      trust_state: "verified",
      confidence: 1,
      impact_class: spec.impact,
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
}

let relSeq = 0;

function relate(model: Repository, from: string, type: string, to: string): void {
  relSeq += 1;
  model.addRelation({
    relation_id: `rel-${relSeq}`,
    repository_id: REPO,
    from_entity_id: from,
    relation_type: type,
    to_entity_id: to,
    evidence_id: null,
    created_at: NOW,
  });
}

// A realistic authentication feature wired to all seven read-model kinds, plus one non-injectable
// (proposed) claim that must never be surfaced.
function seedRepositoryModel(model: Repository): void {
  const feature = addEntity(model, "feature", "Authentication", "authentication", "How a user authenticates.");
  verifiedClaim(model, feature, "architecture", {
    claim_id: "claim-auth-arch",
    content: "Authentication flow: a request enters through the login entry point and passes session validation.",
    impact: "high",
    path: "src/auth/login.ts",
    symbol: "login",
  });

  const component = addEntity(model, "component", "Session store", "session-store", "Stores sessions.");
  verifiedClaim(model, component, "behavior", {
    claim_id: "claim-session",
    content: "The session store persists sessions in Redis.",
    impact: "medium",
    path: "src/auth/session.ts",
    symbol: "SessionStore",
  });
  // A proposed (non-injectable) claim: examined, rejected, never surfaced.
  model.createClaim({
    claim_id: "claim-proposed",
    entity_id: component,
    claim_kind: "behavior",
    normalized_content: "The session store MIGHT switch to Postgres (unverified).",
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
  relate(model, feature, "depends_on", component);

  const flow = addEntity(model, "flow", "Login flow", "login-flow", "The login request flow.");
  verifiedClaim(model, flow, "behavior", {
    claim_id: "claim-flow",
    content: "The login flow validates credentials then issues a session token.",
    impact: "medium",
    path: "src/auth/login.ts",
    symbol: "handleLogin",
  });
  relate(model, feature, "has_flow", flow);

  const invariant = addEntity(model, "invariant", "No password logging", "no-password-logging", "Passwords must never be logged.");
  verifiedClaim(model, invariant, "invariant", {
    claim_id: "claim-inv",
    content: "Passwords are never written to logs; the logger redacts credential fields.",
    impact: "critical",
    path: "src/auth/logger.ts",
    symbol: "redact",
  });
  relate(model, feature, "constrained_by", invariant);

  const decision = addEntity(model, "decision", "Use JWT sessions", "use-jwt-sessions", "We chose JWT sessions.");
  verifiedClaim(model, decision, "decision", {
    claim_id: "claim-decision",
    content: "Sessions use signed JWTs so the store stays stateless.",
    impact: "medium",
    path: "docs/adr/0007-jwt.md",
    symbol: "adr-0007",
  });
  relate(model, feature, "decided_by", decision);

  const test = addEntity(model, "test_surface", "Auth tests", "auth-tests", "Tests for authentication.");
  verifiedClaim(model, test, "verification", {
    claim_id: "claim-test",
    content: "auth.test.ts exercises login, logout, and session expiry.",
    impact: "low",
    path: "src/auth/auth.test.ts",
    symbol: "auth-suite",
  });
  relate(model, feature, "verified_by", test);

  const owner = addEntity(model, "owner", "Platform team", "platform-team", "Owns authentication.");
  verifiedClaim(model, owner, "ownership", {
    claim_id: "claim-owner",
    content: "The platform team owns the authentication feature.",
    impact: "low",
    path: "CODEOWNERS",
    symbol: "auth",
  });
  relate(model, feature, "owned_by", owner);

  const runbook = addEntity(model, "runbook", "Rotate signing key", "rotate-signing-key", "How to rotate the JWT signing key.");
  verifiedClaim(model, runbook, "runbook", {
    claim_id: "claim-runbook",
    content: "To rotate the signing key, deploy the new key, then revoke the old one after 24h.",
    impact: "medium",
    path: "docs/runbooks/rotate-key.md",
    symbol: "rotate",
  });
  relate(model, feature, "operated_by", runbook);
}

function contextRequest(query: string): ContextRequest {
  return {
    repository: { repo_id: REPO, root: "/repo", remote: null, branch: "main", commit: "abc123", worktree: "/repo" },
    task: { task_id: "task-1", session_id: "session-1", user_id: null, agent_surface: "claude-code" },
    query,
    targets: [],
    changed_files: [],
    token_budget: 4_000,
  };
}

// A legacy source stand-in: verbose, non-answering orientation notes. Larger than the model capsule,
// and it surfaces no feature/runbook and none of the answer evidence — so a truthful comparison shows
// the model at least matching it on every criterion.
function legacySource(): ContextSource {
  const body = `Historical implementation note. ${"Old context that no longer answers the question. ".repeat(40)}`;
  return {
    async find(): Promise<ContextCandidate[]> {
      return [
        {
          candidate_id: "legacy-1",
          kind: "orientation",
          title: "Legacy note A",
          body,
          evidence_ids: ["legacy-packet-1"],
          trust_state: "approved",
          priority: 5,
        },
        {
          candidate_id: "legacy-2",
          kind: "orientation",
          title: "Legacy note B",
          body,
          evidence_ids: ["legacy-packet-2"],
          trust_state: "approved",
          priority: 4,
        },
      ];
    },
  };
}

test("Gate B: the model-backed source and Phase B honesty gates hold end to end", { concurrency: false }, async (t) => {
  if (!supportsVnextRuntime()) {
    t.skip("node:sqlite is unavailable on this runtime");
    return;
  }

  const project = tempProject();
  const opened = openRepositoryModel(project);
  const model = opened.model;
  seedRepositoryModel(model);

  // ---- 1. Real repository fixtures produce the seven read models ----
  const kinds: EntityKind[] = ["feature", "component", "flow", "decision", "test_surface", "owner", "runbook"];
  for (const kind of kinds) {
    assert.equal(model.listEntities(REPO, kind).length >= 1, true, `read model present for ${kind}`);
  }
  const feature = featureReadModel(model, "entity:authentication");
  assert.equal(feature.feature.canonical_name, "Authentication");
  assert.equal(feature.components.length >= 1, true, "feature read model resolves its component");
  assert.equal(feature.flows.length >= 1, true, "feature read model resolves its flow");
  assert.equal(feature.owners.length >= 1, true, "feature read model resolves its owner");
  assert.equal(feature.tests.length >= 1, true, "feature read model resolves its test surface");
  assert.equal(feature.health.missing_required_fields.length, 0, "feature is documented (owner + tests)");
  const runbook = runbookReadModel(model, "entity:rotate-signing-key");
  assert.equal(runbook.runbook.canonical_name, "Rotate signing key");

  // ---- 2. The model source injects ONLY verified/approved claims ----
  const source = new ModelContextSource(model);
  const explained = await source.explain(contextRequest("how does authentication work?"));
  assert.equal(
    explained.candidates.every((c) => c.trust_state === "verified" || c.trust_state === "approved"),
    true,
    "no non-injectable candidate is ever surfaced",
  );
  // The proposed claim was examined and rejected with a reason — never silently dropped.
  assert.equal(
    explained.rejections.some((r) => r.claim_id === "claim-proposed" && r.reason.includes("non_injectable")),
    true,
  );
  // The authentication feature is the first candidate and reads like current architecture.
  assert.equal(explained.candidates[0].kind, "feature");
  assert.match(explained.candidates[0].body, /entry point|flow|invariant/i);

  // ---- 3. Deterministic low-risk facts auto-verify; high-impact facts route to review ----
  const lowRisk: ClaimCandidate = {
    candidate_id: "cand-low",
    repository_id: REPO,
    entity_kind: "component",
    entity_name: "Session store",
    claim_kind: "behavior",
    content: "The `SessionStore` persists sessions in Redis.",
    evidence_ids: ["ev-claim-session"],
    proposed_trust_state: "verified",
    impact_class: "low",
    extraction_method: "deterministic",
    review_policy: "automatic",
  };
  const lowResult = admitCandidate(lowRisk);
  assert.equal(lowResult.admit, true);
  assert.equal(lowResult.trust_state, "verified", "a deterministic low-risk fact auto-verifies");

  const criticalInvariant: ClaimCandidate = {
    candidate_id: "cand-crit",
    repository_id: REPO,
    entity_kind: "invariant",
    entity_name: "No password logging",
    claim_kind: "invariant",
    content: "Passwords are never written to `logs`.",
    evidence_ids: ["ev-claim-inv"],
    proposed_trust_state: "verified",
    impact_class: "critical",
    extraction_method: "deterministic",
    review_policy: "security",
  };
  const critResult = admitCandidate(criticalInvariant);
  assert.equal(critResult.trust_state, "proposed", "a critical invariant is never auto-verified");
  assert.equal(critResult.review_policy, "security", "it routes to a human security review");

  // The store enforces the same gate: a claim cannot be born verified without verified evidence, and
  // cannot be born approved without an accepted review item.
  assert.throws(
    () =>
      model.createClaim({
        claim_id: "claim-unbacked",
        entity_id: "entity:authentication",
        claim_kind: "architecture",
        normalized_content: "Unbacked assertion.",
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
      }),
    /verified supporting evidence/,
  );

  // ---- 4. Shadow comparison: compare delivers legacy, records the model set ----
  const legacy = legacySource();
  const compareResult = await compareContextSources(contextRequest("how does authentication work?"), legacy, source);
  assert.equal(compareResult.delivered_source, "legacy");
  assert.deepEqual(compareResult.delivered.map((c) => c.candidate_id), ["legacy-1", "legacy-2"]);
  assert.equal(compareResult.comparison.model_candidate_ids.length > 0, true);
  assert.equal(compareResult.comparison.model_candidate_ids.includes("model:claim-auth-arch"), true);

  // ---- 5. The progression gate: the model passes every criterion against legacy recall ----
  const corpus: EvalCase[] = [
    {
      request: contextRequest("how does authentication work?"),
      answer_evidence_ids: ["model:claim-auth-arch"],
      critical_invariant_evidence_ids: ["model:claim-inv"],
    },
    {
      request: contextRequest("how do I rotate the signing key runbook?"),
      answer_evidence_ids: ["model:claim-runbook"],
    },
  ];
  const decision = await evaluateProgression(corpus, legacy, source);
  assert.equal(decision.criteria.no_stale_or_disputed_injection, true);
  assert.equal(decision.criteria.answer_support_rate_at_least_legacy, true);
  assert.equal(decision.criteria.median_capsule_size_leq_legacy, true);
  assert.equal(decision.criteria.feature_runbook_coverage_geq_legacy, true);
  assert.equal(decision.criteria.no_critical_invariant_regression, true);
  assert.equal(decision.ready, true, "the model source passes shadow comparison");
  assert.equal(decision.measured.non_injectable_model_candidates, 0);

  // ---- 6. The v1 fixture is deterministic, sorted, and timestamp-free (in-process check) ----
  const fixtureA = serializeModelFixture(model, REPO);
  const fixtureB = serializeModelFixture(model, REPO);
  assert.deepEqual(fixtureA, fixtureB, "two serializations of the same model are identical");
  assert.equal(fixtureA.fixture_version, "repository-model.v1");
  assert.deepEqual(
    fixtureA.entities.map((e) => e.entity_id),
    [...fixtureA.entities.map((e) => e.entity_id)].sort(),
    "entities are sorted by stable id",
  );
  const fixtureJson = JSON.stringify(fixtureA);
  assert.doesNotMatch(fixtureJson, /created_at|updated_at|observed_at/, "no generated timestamps ride in the fixture");

  opened.close();

  // ---- 7. The shipped CLI emits a byte-identical fixture across runs ----
  const outA = join(project, "fixture-a.json");
  const outB = join(project, "fixture-b.json");
  execFileSync(process.execPath, [CLI, "model", "export-fixture", "--project", project, "--out", outA], { encoding: "utf8" });
  execFileSync(process.execPath, [CLI, "model", "export-fixture", "--project", project, "--out", outB], { encoding: "utf8" });
  const bytesA = readFileSync(outA, "utf8");
  const bytesB = readFileSync(outB, "utf8");
  assert.equal(bytesA, bytesB, "the shipped CLI fixture is deterministic across runs");
  const parsed = JSON.parse(bytesA) as { fixture_version: string; claims: Array<{ trust_state: string }> };
  assert.equal(parsed.fixture_version, "repository-model.v1");
  assert.equal(parsed.claims.filter((c) => c.trust_state === "proposed").length, 1, "the proposed claim rides as proposed");

  // ---- 8. The shipped Phase B report reads the real store honestly ----
  const report = JSON.parse(
    execFileSync(process.execPath, [REPORT_SCRIPT, "--project", project, "--json"], { encoding: "utf8" }),
  ) as Record<string, any>;
  assert.equal(report.available, true);
  assert.equal(report.empty, false);
  assert.equal(report.claims.injectable, 8, "eight verified claims are injectable");
  assert.equal(report.claims.by_trust_state.proposed, 1, "one proposed claim is counted, never injectable");
  assert.equal(report.context_source, "legacy", "the default delivered source is legacy");
  assert.equal(report.model_lag_events, 0, "no events, so no compilation lag");

  // ---- 9. Staleness: a changed ground-truth ref invalidates its claim and it leaves delivery ----
  const reopened = openRepositoryModel(project);
  try {
    const staleSource = new ModelContextSource(reopened.model);
    const before = await staleSource.find(contextRequest("how does authentication work?"));
    assert.equal(before.some((c) => c.candidate_id === "model:claim-auth-arch"), true);

    const result = invalidateChangedEvidence(reopened.model, ["src/auth/login.ts#login"]);
    assert.deepEqual(result.invalidated, ["claim-auth-arch"], "only the symbol-anchored claim goes stale");
    assert.equal(reopened.model.getClaim("claim-auth-arch")!.trust_state, "stale");

    const after = await staleSource.find(contextRequest("how does authentication work?"));
    assert.equal(after.some((c) => c.candidate_id === "model:claim-auth-arch"), false, "a stale claim leaves delivery");
    // The sibling claim anchored at the same file but a different symbol is untouched.
    assert.equal(reopened.model.getClaim("claim-flow")!.trust_state, "verified");
  } finally {
    reopened.close();
  }
});

// ---- Packet migration: dry-run first, fingerprint-guarded, non-injectable, reversible by OKF ----

function legacyPacket(overrides: Partial<MemoryPacket> = {}): MemoryPacket {
  return {
    schema_version: 2,
    id: "packet-refunds-1",
    title: "Refund flow retries three times",
    summary: "The refund worker retries a failed gateway call three times.",
    body: "The refund worker retries a failed gateway call three times before giving up.",
    type: "reference",
    scope: "repo",
    visibility: "team",
    sensitivity: "internal",
    status: "approved",
    confidence: 0.7,
    tags: ["refunds"],
    paths: ["src/refunds.ts"],
    stack: ["typescript"],
    source_refs: [],
    freshness: {},
    edges: [],
    quality: {},
    created_at: NOW,
    updated_at: NOW,
    author_name: "A. Dev",
    ...overrides,
  };
}

test("Gate B: packet migration is dry-run first, imports nothing injectable, and re-applies idempotently", (t) => {
  if (!supportsVnextRuntime()) {
    t.skip("node:sqlite is unavailable on this runtime");
    return;
  }

  const project = tempProject();
  const opened = openRepositoryModel(project);
  try {
    const model = opened.model;
    const packets = [legacyPacket()];

    // Plan is a pure dry run: it writes nothing to the model.
    const plan = planMigration(packets, model, { now: () => NOW });
    assert.equal(model.listEntities(plan.repository_id).length, 0, "plan writes nothing");
    assert.equal(model.countClaims(), 0);
    assert.equal(plan.entries.length, 1);

    // Apply imports the packet — but a legacy 'approved' packet becomes a PROPOSED (non-injectable)
    // claim, never an injectable one. Legacy trust is not laundered into vNext trust.
    const applied = applyMigration(plan, packets, model, { now: () => NOW });
    assert.equal(applied.applied, 1);
    assert.equal(model.countClaims(), 1);
    const imported = model
      .listEntities(plan.repository_id)
      .flatMap((entity) => model.claimsForEntity(entity.entity_id));
    assert.equal(imported.length, 1);
    assert.equal(imported[0].trust_state, "proposed", "legacy trust is never laundered into injectable trust");

    // A drifted packet is refused: apply the same plan against changed content and nothing new lands.
    const drifted = [legacyPacket({ body: "The refund worker now retries FIVE times." })];
    const reapplyDrift = applyMigration(plan, drifted, model, { now: () => NOW });
    assert.equal(reapplyDrift.applied, 0, "a fingerprint mismatch is refused");
    assert.equal(reapplyDrift.skipped_fingerprint_mismatch, 1);

    // Re-applying the same plan folds onto the existing claim (idempotent), never a duplicate.
    applyMigration(plan, packets, model, { now: () => NOW });
    assert.equal(model.countClaims(), 1, "re-apply consolidates rather than duplicating");

    // Reversible by OKF export: the imported entity round-trips its identifiers through a foreign OKF
    // consumer that strips x-kage-* frontmatter (the body machine-state block carries them).
    const entity = model.listEntities(plan.repository_id)[0];
    const concept = exportModelConcept(model, entity);
    const markdown = renderModelConceptMarkdown(concept);
    const roundTripped = parseModelConcept(markdown);
    assert.ok(roundTripped, "the exported concept parses back");
    assert.equal(roundTripped!.entity_id, entity.entity_id, "the exported concept round-trips its entity id");
    assert.equal(roundTripped!.claims[0].trust_state, "proposed", "export never invents trust");
  } finally {
    opened.close();
  }
});
