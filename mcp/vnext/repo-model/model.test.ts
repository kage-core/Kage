import test from "node:test";
import assert from "node:assert/strict";
import { openVnextDatabase, type LocalDatabase } from "../storage/database.js";
import { migrateLocalDatabase } from "../storage/migrations.js";
import { isInjectableTrustState } from "./types.js";
import type { TrustState } from "../protocol/types.js";

function migratedDatabase(): LocalDatabase {
  const db = openVnextDatabase(":memory:");
  migrateLocalDatabase(db);
  return db;
}

test("model migration creates versioned entity and claim tables", () => {
  const db = migratedDatabase();
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all()
    .map((row) => String((row as { name: string }).name));
  for (const table of [
    "entities",
    "claims",
    "evidence",
    "claim_evidence",
    "relations",
    "episodes",
    "review_items",
    "compiler_checkpoints",
  ]) {
    assert.ok(tables.includes(table), table);
  }
});

test("only verified and approved claims are injectable", () => {
  assert.equal(isInjectableTrustState("verified"), true);
  assert.equal(isInjectableTrustState("approved"), true);
  for (const state of [
    "proposed",
    "disputed",
    "stale",
    "superseded",
    "archived",
  ] as const satisfies readonly TrustState[]) {
    assert.equal(isInjectableTrustState(state), false, state);
  }
});

test("repository-model tables are schema-guarded and idempotent", () => {
  const db = migratedDatabase();
  // Re-running the migration must be a no-op and must not throw the schema validator.
  migrateLocalDatabase(db);
  const versions = db
    .prepare("SELECT version FROM schema_migrations ORDER BY version")
    .all()
    .map((row) => Number((row as { version: number }).version));
  assert.deepEqual(versions, [1, 2, 3, 4, 5]);
});

test("claims enforce the confidence bound and entity foreign key", () => {
  const db = migratedDatabase();
  const now = "2026-07-13T00:00:00.000Z";
  db.prepare(
    `INSERT INTO entities (entity_id, repository_id, kind, canonical_name, slug, summary, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run("entity-1", "repo-1", "feature", "Refunds", "refunds", "Refund flow", "active", now, now);

  // A claim referencing a missing entity is rejected by the foreign key.
  assert.throws(() => {
    db.prepare(
      `INSERT INTO claims (claim_id, entity_id, claim_kind, normalized_content, trust_state, confidence, impact_class, review_policy, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run("claim-x", "missing-entity", "behavior", "content", "proposed", 1, "low", "automatic", "compiler", now, now);
  });

  // A confidence outside [0,1] is rejected by the CHECK constraint.
  assert.throws(() => {
    db.prepare(
      `INSERT INTO claims (claim_id, entity_id, claim_kind, normalized_content, trust_state, confidence, impact_class, review_policy, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run("claim-y", "entity-1", "behavior", "content", "proposed", 1.5, "low", "automatic", "compiler", now, now);
  });

  // A valid claim inserts.
  db.prepare(
    `INSERT INTO claims (claim_id, entity_id, claim_kind, normalized_content, trust_state, confidence, impact_class, review_policy, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run("claim-1", "entity-1", "behavior", "content", "proposed", 1, "low", "automatic", "compiler", now, now);
  const count = db.prepare("SELECT COUNT(*) AS n FROM claims").get() as { n: number };
  assert.equal(Number(count.n), 1);
});
