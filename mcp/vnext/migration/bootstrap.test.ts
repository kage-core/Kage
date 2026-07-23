import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bootstrapPortalModelIfEmpty } from "./bootstrap.js";
import { openRepositoryModel } from "./model-store.js";
import { importPacket } from "./packet-importer.js";

// The portal reads the compiled repository model, so a repo with memory but no migrated model shows a
// blank dashboard — disqualifying the first time a prospect opens it. bootstrapPortalModelIfEmpty
// populates the model on demand, but ONLY when it is empty, and never destructively.

function tmpProject(): string {
  const dir = mkdtempSync(join(tmpdir(), "kage-bootstrap-"));
  mkdirSync(join(dir, ".agent_memory", "packets"), { recursive: true });
  return dir;
}

test("bootstrap is a no-op with a clear reason when there are no approved packets", () => {
  const result = bootstrapPortalModelIfEmpty(tmpProject());
  assert.equal(result.bootstrapped, false);
  assert.equal(result.imported, 0);
  assert.match(result.reason ?? "", /no approved packets/i);
});

test("bootstrap leaves an already-populated model untouched (idempotent, no churn)", () => {
  const dir = tmpProject();
  // Seed one entity directly so the model is non-empty, without going through the packet loader.
  const opened = openRepositoryModel(dir);
  try {
    importPacket(
      {
        schema_version: 2,
        id: "seed:decision:1",
        title: "Why we chose X",
        summary: "Because Y.",
        body: "Because Y.",
        type: "decision",
        scope: "repo",
        visibility: "team",
        sensitivity: "internal",
        status: "approved",
        confidence: 0.7,
        tags: [],
        paths: [],
        stack: [],
        source_refs: [],
        freshness: { ttl_days: 365, last_verified_at: "2026-01-01T00:00:00.000Z" },
        edges: [],
        quality: { reviewer: null, votes_up: 0, votes_down: 0 },
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        author_name: null,
      },
      opened.model,
    );
  } finally {
    opened.close();
  }

  const result = bootstrapPortalModelIfEmpty(dir);
  assert.equal(result.bootstrapped, false);
  assert.ok(result.entities_before > 0, "the seeded entity must be counted");
  assert.match(result.reason ?? "", /already populated/i);
});
