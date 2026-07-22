import test from "node:test";
import assert from "node:assert/strict";

import { openVnextDatabase, type LocalDatabase } from "../storage/database.js";
import { migrateLocalDatabase } from "../storage/migrations.js";
import { Repository } from "../repo-model/repository.js";
import type { EntityKind, EvidenceRecord, TrustState } from "../repo-model/types.js";
import { buildContextCapsule } from "../context/capsule-builder.js";
import type { ContextRequest, ContextSource } from "../context/source.js";
import {
  minimalChangePreflight,
  preflightCandidates,
  type PreflightTask,
} from "./preflight.js";
import { normalizeFinding, type MinimalChangeFinding } from "./types.js";

const NOW = "2026-07-13T00:00:00.000Z";
const REPO = "repository:local";

function migratedDatabase(): LocalDatabase {
  const db = openVnextDatabase(":memory:");
  migrateLocalDatabase(db);
  return db;
}

function emptyModel(): Repository {
  return new Repository(migratedDatabase());
}

function fixtureTask(query: string): PreflightTask {
  return {
    task_id: "task-1",
    repository_id: REPO,
    query,
    targets: [],
    changed_files: [],
  };
}

let counter = 0;

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

function evidence(
  model: Repository,
  path: string,
  symbol: string,
  sourceUri: string,
  verificationState: EvidenceRecord["verification_state"] = "verified",
): EvidenceRecord {
  counter += 1;
  return model.addEvidence({
    evidence_id: `ev-${counter}`,
    repository_id: REPO,
    source_type: "source",
    source_uri: sourceUri,
    source_fingerprint: `fp-${counter}`,
    commit: "abc123",
    path,
    symbol,
    line_start: 1,
    line_end: 10,
    verification_method: "source_fingerprint",
    verification_state: verificationState,
    privacy_class: "team_metadata",
    observed_at: NOW,
  });
}

function claim(
  model: Repository,
  entityId: string,
  content: string,
  trustState: TrustState,
  ev: EvidenceRecord,
): string {
  counter += 1;
  const claimId = `claim-${counter}`;
  if (trustState === "verified") {
    model.createClaim(
      {
        claim_id: claimId,
        entity_id: entityId,
        claim_kind: "capability",
        normalized_content: content,
        trust_state: "verified",
        confidence: 1,
        impact_class: "medium",
        valid_from_commit: null,
        valid_to_commit: null,
        supersedes_claim_id: null,
        review_policy: "automatic",
        created_by: "compiler",
        created_at: NOW,
        updated_at: NOW,
      },
      [{ evidence_id: ev.evidence_id, stance: "supports" }],
    );
    return claimId;
  }
  // proposed (non-injectable) — still linked to real evidence, but not injectable.
  model.createClaim(
    {
      claim_id: claimId,
      entity_id: entityId,
      claim_kind: "capability",
      normalized_content: content,
      trust_state: "proposed",
      confidence: 0.5,
      impact_class: "medium",
      valid_from_commit: null,
      valid_to_commit: null,
      supersedes_claim_id: null,
      review_policy: "automatic",
      created_by: "compiler",
      created_at: NOW,
      updated_at: NOW,
    },
    [{ evidence_id: ev.evidence_id, stance: "supports" }],
  );
  return claimId;
}

// A model whose repository already contains a reusable helper named `helperSymbol`, grounded in a
// verified, source-backed claim.
function fixtureModelWithHelper(helperSymbol: string): Repository {
  const model = emptyModel();
  const netId = entity(model, "component", "Network client", "network-client", "HTTP helpers for the app");
  const ev = evidence(model, "src/net.ts", helperSymbol, `fact:src/net.ts#${helperSymbol}`);
  claim(model, netId, `${helperSymbol} performs an authenticated fetch with the shared credential store.`, "verified", ev);
  return model;
}

test("preflight recommends existing helper before new abstraction", async () => {
  const result = await minimalChangePreflight(
    fixtureTask("add authenticated fetch"),
    fixtureModelWithHelper("authenticatedFetch"),
  );
  assert.equal(result.recommendations[0].kind, "reuse_existing");
  assert.match(result.recommendations[0].evidence[0].source_uri, /authenticatedFetch/);
});

test("preflight does not invent a reusable helper without evidence", async () => {
  const result = await minimalChangePreflight(fixtureTask("add CSV export"), emptyModel());
  assert.equal(
    result.recommendations.some((item) => item.kind === "reuse_existing"),
    false,
  );
});

test("preflight will not surface a reuse grounded in a non-injectable claim", async () => {
  const model = emptyModel();
  const netId = entity(model, "component", "Network client", "network-client", "HTTP helpers for the app");
  const ev = evidence(model, "src/net.ts", "authenticatedFetch", "fact:src/net.ts#authenticatedFetch");
  claim(model, netId, "authenticatedFetch performs an authenticated fetch.", "proposed", ev);

  const result = await minimalChangePreflight(fixtureTask("add authenticated fetch"), model);
  assert.equal(
    result.recommendations.some((item) => item.kind === "reuse_existing"),
    false,
  );
});

test("every reuse recommendation is deterministic and cites a real evidence record", async () => {
  const model = fixtureModelWithHelper("authenticatedFetch");
  const result = await minimalChangePreflight(fixtureTask("add authenticated fetch"), model);
  const reuse = result.recommendations.find((item) => item.kind === "reuse_existing");
  assert.ok(reuse);
  assert.equal(reuse.deterministic, true);
  assert.ok(reuse.evidence.length >= 1);
  // The cited evidence is a real, retrievable row in the model, not a fabricated reference.
  const stored = model.getEvidence(reuse.evidence[0].evidence_id);
  assert.ok(stored);
  assert.equal(stored.evidence_id, reuse.evidence[0].evidence_id);
});

test("preflight is deterministic: same model and task yield identical findings", async () => {
  const model = fixtureModelWithHelper("authenticatedFetch");
  const first = await minimalChangePreflight(fixtureTask("add authenticated fetch"), model);
  const second = await minimalChangePreflight(fixtureTask("add authenticated fetch"), model);
  assert.deepEqual(first, second);
});

test("normalizeFinding downgrades a non-deterministic blocking finding to a warning", () => {
  const base: MinimalChangeFinding = {
    finding_id: "f1",
    kind: "reuse_existing",
    title: "Reuse authenticatedFetch",
    explanation: "A helper already exists.",
    evidence: [],
    deterministic: false,
    severity: "blocking",
    suggested_files: [],
  };
  assert.equal(normalizeFinding(base).severity, "warning");
  // A deterministic finding keeps its severity.
  assert.equal(normalizeFinding({ ...base, deterministic: true }).severity, "blocking");
});

test("preflight findings flow through the capsule builder as minimal_change sections", async () => {
  const model = fixtureModelWithHelper("authenticatedFetch");
  const result = await minimalChangePreflight(fixtureTask("add authenticated fetch"), model);
  const candidates = preflightCandidates(result);
  assert.ok(candidates.length >= 1);
  assert.ok(candidates.every((candidate) => candidate.kind === "minimal_change"));

  const source: ContextSource = { find: async () => candidates };
  const request: ContextRequest = {
    repository: {
      repo_id: REPO,
      root: "/repo",
      remote: null,
      branch: "main",
      commit: "abc123",
      worktree: "/repo",
    },
    task: { task_id: "task-1", session_id: "s1", user_id: null, agent_surface: "test" },
    query: "add authenticated fetch",
    targets: [],
    changed_files: [],
    token_budget: 4000,
  };
  const capsule = await buildContextCapsule(source, request);
  assert.ok(capsule.sections.some((section) => section.kind === "minimal_change"));
});
