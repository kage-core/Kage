import test from "node:test";
import assert from "node:assert/strict";

import type { MemoryPacket } from "../../kernel.js";
import { openVnextDatabase, type LocalDatabase } from "../storage/database.js";
import { migrateLocalDatabase } from "../storage/migrations.js";
import { Repository } from "../repo-model/repository.js";
import { readMigration } from "./packet-importer.js";
import { planMigration, applyMigration } from "./migration-report.js";

const NOW = "2026-07-13T00:00:00.000Z";

function migratedDatabase(): LocalDatabase {
  const db = openVnextDatabase(":memory:");
  migrateLocalDatabase(db);
  return db;
}

function fixtureModel(): Repository {
  return new Repository(migratedDatabase());
}

function packet(overrides: Partial<MemoryPacket>): MemoryPacket {
  return {
    schema_version: 2,
    id: overrides.id ?? "repo:demo:reference:x",
    title: "A documented behavior",
    summary: "A documented behavior about the system.",
    body: "A documented behavior about the system.",
    type: "reference",
    scope: "repo",
    visibility: "team",
    sensitivity: "internal",
    status: "approved",
    confidence: 0.7,
    tags: [],
    paths: ["src/a.ts"],
    stack: [],
    source_refs: [],
    freshness: {},
    edges: [],
    quality: {},
    created_at: NOW,
    updated_at: NOW,
    author_name: null,
    ...overrides,
  };
}

function corpus(): MemoryPacket[] {
  return [
    packet({ id: "p-create", title: "Create me", paths: ["src/create.ts"] }),
    packet({ id: "p-archive", title: "Archive me", status: "superseded", paths: ["src/arch.ts"] }),
    packet({ id: "p-review", title: "Decide me", type: "decision", paths: ["src/dec.ts"] }),
    packet({ id: "p-ungrounded", title: "Ungrounded me", paths: [] }),
    packet({ id: "p-junk", title: "", body: "", summary: "" }),
  ];
}

test("planMigration reports per-disposition counts without writing to the model", () => {
  const model = fixtureModel();
  const plan = planMigration(corpus(), model, { now: () => NOW });

  assert.equal(plan.counts.create, 1);
  assert.equal(plan.counts.archive, 1);
  assert.equal(plan.counts.review, 1);
  assert.equal(plan.counts.ungrounded, 1);
  assert.equal(plan.counts.rejected_junk, 1);
  assert.equal(plan.counts.merge, 0);
  assert.equal(plan.entries.length, 5);

  // A dry run writes nothing.
  assert.equal(model.countClaims(), 0);
  assert.equal(model.listEntities("repository:local").length, 0);
  // Every entry carries the fingerprint apply will re-check.
  for (const entry of plan.entries) assert.match(entry.source_fingerprint, /^[0-9a-f]{64}$/);
});

test("applyMigration imports the planned packets and records every mapping", () => {
  const model = fixtureModel();
  const packets = corpus();
  const plan = planMigration(packets, model, { now: () => NOW });
  const result = applyMigration(plan, packets, model, { now: () => NOW });

  // Four non-junk packets produced claims; junk produced none.
  assert.equal(result.applied, 5);
  assert.equal(result.skipped_fingerprint_mismatch, 0);
  assert.equal(model.countClaims(), 4);
  for (const id of ["p-create", "p-archive", "p-review", "p-ungrounded", "p-junk"]) {
    assert.ok(readMigration(model, id), `mapping recorded for ${id}`);
  }
  // Nothing imported is injectable.
  for (const entity of model.listEntities("repository:local")) {
    assert.equal(model.injectableClaims(entity.entity_id).length, 0);
  }
});

test("applyMigration refuses an entry whose packet drifted since the plan was made", () => {
  const model = fixtureModel();
  const planned = [packet({ id: "p-drift", title: "Original", body: "original body", paths: ["src/d.ts"] })];
  const plan = planMigration(planned, model, { now: () => NOW });

  // The packet on disk changed after the plan was computed.
  const drifted = [packet({ id: "p-drift", title: "Original", body: "rewritten body", paths: ["src/d.ts"] })];
  const result = applyMigration(plan, drifted, model, { now: () => NOW });

  assert.equal(result.applied, 0);
  assert.equal(result.skipped_fingerprint_mismatch, 1);
  assert.equal(model.countClaims(), 0);
  // The drifted packet was NOT imported and NOT recorded as migrated.
  assert.equal(readMigration(model, "p-drift"), null);
});

test("applyMigration is idempotent: a second apply merges rather than duplicating", () => {
  const model = fixtureModel();
  const packets = corpus();
  const plan = planMigration(packets, model, { now: () => NOW });

  applyMigration(plan, packets, model, { now: () => NOW });
  const claimsAfterFirst = model.countClaims();

  // Re-plan against the now-populated model and apply again.
  const plan2 = planMigration(packets, model, { now: () => NOW });
  const second = applyMigration(plan2, packets, model, { now: () => NOW });

  assert.equal(model.countClaims(), claimsAfterFirst);
  // The four claim-bearing packets fold onto their existing claims.
  assert.equal(second.entries.filter((e) => e.disposition === "merge").length, 4);
});
