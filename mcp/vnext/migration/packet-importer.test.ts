import test from "node:test";
import assert from "node:assert/strict";

import type { MemoryPacket } from "../../kernel.js";
import { openVnextDatabase, type LocalDatabase } from "../storage/database.js";
import { migrateLocalDatabase } from "../storage/migrations.js";
import { Repository } from "../repo-model/repository.js";
import { importPacket, classifyPacket, packetFingerprint, readMigration } from "./packet-importer.js";

const NOW = "2026-07-13T00:00:00.000Z";

function migratedDatabase(): LocalDatabase {
  const db = openVnextDatabase(":memory:");
  migrateLocalDatabase(db);
  return db;
}

function fixtureModel(): Repository {
  return new Repository(migratedDatabase());
}

function fixturePacket(overrides: Partial<MemoryPacket> = {}): MemoryPacket {
  return {
    schema_version: 2,
    id: "repo:demo:reference:documented-behavior-1",
    title: "Refund flow retries three times",
    summary: "The refund worker retries a failed gateway call three times before giving up.",
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
    source_refs: [{ kind: "explicit_capture", captured_at: NOW }],
    freshness: { ttl_days: 365, last_verified_at: NOW },
    edges: [],
    quality: { reviewer: null, votes_up: 0, votes_down: 0 },
    created_at: NOW,
    updated_at: NOW,
    author_name: null,
    ...overrides,
  };
}

// ── The plan's lossless-migration tests ─────────────────────────────────────

test("packet import preserves identity status attribution and original content", () => {
  const packet = fixturePacket({ id: "packet-1", status: "superseded", author_name: "A. Dev" });
  const result = importPacket(packet, fixtureModel(), { now: () => NOW });
  assert.equal(result.legacy_packet_id, "packet-1");
  assert.equal(result.claim?.trust_state, "superseded");
  assert.equal(result.claim?.created_by, "A. Dev");
  assert.equal(result.original_packet.body, packet.body);
});

test("legacy quality score never establishes vNext trust", () => {
  const result = importPacket(
    fixturePacket({ quality: { score: 100 }, paths: [] }),
    fixtureModel(),
    { now: () => NOW },
  );
  assert.equal(result.claim?.trust_state, "proposed");
});

// ── Disposition + honesty behavior ──────────────────────────────────────────

test("a grounded active packet is created as a proposed, non-injectable claim", () => {
  const model = fixtureModel();
  const result = importPacket(fixturePacket(), model, { now: () => NOW });
  assert.equal(result.disposition, "create");
  assert.equal(result.claim?.trust_state, "proposed");
  assert.notEqual(result.entity_id, null);
  // The claim is persisted and retrievable, and confidence is never a fabricated 1.
  const stored = model.getClaim(result.claim!.claim_id);
  assert.ok(stored);
  assert.ok(stored!.confidence < 1);
  // Nothing imported is ever injectable.
  assert.equal(model.injectableClaims(result.entity_id!).length, 0);
});

test("a deprecated packet is archived, never injectable", () => {
  const result = importPacket(fixturePacket({ status: "deprecated" }), fixtureModel(), { now: () => NOW });
  assert.equal(result.disposition, "archive");
  assert.equal(result.claim?.trust_state, "archived");
});

test("a decision packet routes to review and stays proposed", () => {
  const result = importPacket(
    fixturePacket({ type: "decision", title: "Adopt OKF as the memory format" }),
    fixtureModel(),
    { now: () => NOW },
  );
  assert.equal(result.disposition, "review");
  assert.equal(result.claim?.trust_state, "proposed");
});

test("a packet with no cited paths is ungrounded and stays proposed", () => {
  const result = importPacket(fixturePacket({ paths: [] }), fixtureModel(), { now: () => NOW });
  assert.equal(result.disposition, "ungrounded");
  assert.equal(result.claim?.trust_state, "proposed");
});

test("an empty packet is rejected as junk with no claim written", () => {
  const model = fixtureModel();
  const result = importPacket(fixturePacket({ body: "  ", summary: "  " }), model, { now: () => NOW });
  assert.equal(result.disposition, "rejected_junk");
  assert.equal(result.claim, null);
  assert.equal(result.entity_id, null);
  assert.equal(model.countClaims(), 0);
});

// ── Idempotency + bookkeeping ───────────────────────────────────────────────

test("re-importing the same packet is idempotent and records the mapping once", () => {
  const model = fixtureModel();
  const packet = fixturePacket({ id: "packet-idem" });
  const first = importPacket(packet, model, { now: () => NOW });
  const second = importPacket(packet, model, { now: () => NOW });
  assert.equal(second.disposition, "merge");
  assert.equal(second.claim?.claim_id, first.claim?.claim_id);
  assert.equal(model.countClaims(), 1);
  const record = readMigration(model, "packet-idem");
  assert.ok(record);
  assert.equal(record!.claim_id, first.claim!.claim_id);
  assert.equal(record!.original_packet_json, JSON.stringify(packet));
});

test("classifyPacket is a pure dry run that never writes", () => {
  const model = fixtureModel();
  const decision = classifyPacket(fixturePacket({ type: "decision" }), model);
  assert.equal(decision.disposition, "review");
  assert.equal(decision.trust_state, "proposed");
  // No entity or claim was written by classification.
  assert.equal(model.countClaims(), 0);
  assert.equal(model.listEntities("repository:local").length, 0);
});

test("Kage's own 'Change memory:' branch bookkeeping is excluded from the model as junk", () => {
  // A workflow packet titled "Change memory: <ref>" is auto-generated on every branch in every repo
  // (kage_propose_from_diff). It carries no repository knowledge, so importing it shows a buyer a
  // "flow: Change memory: master" node that reads as noise. It must classify as rejected_junk.
  const model = fixtureModel();
  const changelog = classifyPacket(
    fixturePacket({ type: "workflow", title: "Change memory: master", body: "Repo-local context for 39 changed paths." }),
    model,
  );
  assert.equal(changelog.disposition, "rejected_junk");
});

test("a genuine workflow packet is NOT mistaken for change-memory bookkeeping", () => {
  // Only the "Change memory:" title pattern is excluded — a real workflow/process packet still imports.
  const model = fixtureModel();
  const realFlow = classifyPacket(
    fixturePacket({ type: "workflow", title: "Release flow: cut, tag, publish", paths: ["scripts/release.ts"] }),
    model,
  );
  assert.notEqual(realFlow.disposition, "rejected_junk");
  assert.equal(realFlow.entity_kind, "flow");
});

test("packet fingerprint is stable for identical content and changes with the body", () => {
  const a = fixturePacket();
  const b = fixturePacket();
  assert.equal(packetFingerprint(a), packetFingerprint(b));
  assert.notEqual(packetFingerprint(a), packetFingerprint(fixturePacket({ body: "different body" })));
});
