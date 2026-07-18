import test from "node:test";
import assert from "node:assert/strict";

import type { MemoryPacket } from "../../kernel.js";
import { openVnextDatabase, type LocalDatabase } from "../storage/database.js";
import { migrateLocalDatabase } from "../storage/migrations.js";
import { Repository } from "../repo-model/repository.js";
import { importPacket } from "../migration/packet-importer.js";
import type { EvidenceRecord } from "../repo-model/types.js";
import {
  exportModelConcept,
  renderModelConceptMarkdown,
  parseModelConcept,
  exportModel,
  MODEL_STATE_FENCE,
} from "./model-export.js";

const NOW = "2026-07-13T00:00:00.000Z";
const REPO = "repository:local";

function migratedDatabase(): LocalDatabase {
  const db = openVnextDatabase(":memory:");
  migrateLocalDatabase(db);
  return db;
}

function fixturePacket(overrides: Partial<MemoryPacket> = {}): MemoryPacket {
  return {
    schema_version: 2,
    id: "packet-export-1",
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

function verifiedEvidence(overrides: Partial<EvidenceRecord> = {}): EvidenceRecord {
  return {
    evidence_id: "ev-1",
    repository_id: REPO,
    source_type: "source",
    source_uri: "fact:src/refunds.ts#refund",
    source_fingerprint: "fp-1",
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

test("exportModelConcept carries the entity, its claims, evidence, and legacy packet ids", () => {
  const model = new Repository(migratedDatabase());
  const result = importPacket(fixturePacket(), model, { now: () => NOW });
  const entity = model.getEntity(result.entity_id!)!;

  const concept = exportModelConcept(model, entity);
  assert.equal(concept.entity_id, entity.entity_id);
  assert.equal(concept.repository_id, REPO);
  assert.equal(concept.claims.length, 1);
  assert.equal(concept.claims[0].claim_id, result.claim!.claim_id);
  assert.equal(concept.claims[0].trust_state, "proposed");
  assert.deepEqual(concept.legacy_packet_ids, ["packet-export-1"]);
});

test("exported evidence references are source-backed with their verification method and state", () => {
  const model = new Repository(migratedDatabase());
  // Build a verified, evidence-backed claim by hand (the importer alone never mints verified claims).
  model.upsertEntity({
    entity_id: "entity-1",
    repository_id: REPO,
    kind: "component",
    canonical_name: "Refunds",
    slug: "refunds",
    summary: "Refund flow",
    status: "active",
    created_at: NOW,
    updated_at: NOW,
  });
  const evidence = model.addEvidence(verifiedEvidence());
  model.createClaim(
    {
      claim_id: "claim-1",
      entity_id: "entity-1",
      claim_kind: "behavior",
      normalized_content: "retries three times",
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
    },
    [{ evidence_id: evidence.evidence_id, stance: "supports" }],
  );

  const concept = exportModelConcept(model, model.getEntity("entity-1")!);
  assert.equal(concept.claims[0].trust_state, "verified");
  assert.equal(concept.claims[0].evidence.length, 1);
  assert.equal(concept.claims[0].evidence[0].verification_method, "source_fingerprint");
  assert.equal(concept.claims[0].evidence[0].verification_state, "verified");
  assert.equal(concept.claims[0].evidence[0].source_uri, "fact:src/refunds.ts#refund");
});

test("round-trip preserves vNext identifiers even when x-kage-* frontmatter is stripped", () => {
  const model = new Repository(migratedDatabase());
  const result = importPacket(fixturePacket(), model, { now: () => NOW });
  const entity = model.getEntity(result.entity_id!)!;
  const concept = exportModelConcept(model, entity);

  const markdown = renderModelConceptMarkdown(concept);
  assert.ok(markdown.includes(MODEL_STATE_FENCE), "carries the machine-state block in the body");

  // Simulate a FOREIGN OKF consumer that preserves the body but drops every x-kage-* frontmatter key.
  const foreign = stripKageFrontmatter(markdown);
  assert.ok(!/x-kage-/.test(foreign), "foreign consumer dropped kage frontmatter");

  const parsed = parseModelConcept(foreign);
  assert.ok(parsed, "re-parsed from body-only content");
  assert.equal(parsed!.entity_id, concept.entity_id);
  assert.deepEqual(
    parsed!.claims.map((c) => c.claim_id),
    concept.claims.map((c) => c.claim_id),
  );
  assert.deepEqual(parsed!.legacy_packet_ids, concept.legacy_packet_ids);
});

test("exportModel emits one concept per entity and lints as conformant OKF", () => {
  const model = new Repository(migratedDatabase());
  importPacket(fixturePacket({ id: "p1", title: "First thing", paths: ["src/a.ts"] }), model, { now: () => NOW });
  importPacket(fixturePacket({ id: "p2", title: "Second thing", paths: ["src/b.ts"] }), model, { now: () => NOW });

  const concepts = exportModel(model, REPO);
  assert.equal(concepts.length, 2);
  for (const doc of concepts) {
    assert.ok(doc.markdown.startsWith("---"), "has YAML frontmatter");
    assert.match(doc.markdown, /^type:/m);
    // The frontmatter never claims an unearned verification: an imported concept is proposed.
    assert.match(doc.markdown, /x-kage-trust: "proposed"/);
  }
});

// A foreign OKF consumer keeps the concept body but is free to drop unknown producer frontmatter.
function stripKageFrontmatter(markdown: string): string {
  const end = markdown.indexOf("\n---", 3);
  if (!markdown.startsWith("---") || end === -1) return markdown;
  const frontmatter = markdown.slice(3, end);
  const body = markdown.slice(end + 4);
  const kept = frontmatter
    .split("\n")
    .filter((line) => !line.trim().startsWith("x-kage-"))
    .join("\n");
  return `---${kept}\n---${body}`;
}
