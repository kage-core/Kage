import test from "node:test";
import assert from "node:assert/strict";
import { openVnextDatabase } from "../storage/database.js";
import { migrateLocalDatabase } from "../storage/migrations.js";
import { Repository } from "../repo-model/repository.js";
import { ReceiptStore } from "../storage/receipt-store.js";
import { importPacket } from "../migration/packet-importer.js";
import type { MemoryPacket } from "../../kernel.js";
import { matchPortalRoute, handlePortalRoute } from "./router.js";

// The Components/Flows/Runbooks/Decisions browse tabs replaced "arrives in a later Phase C task"
// placeholders. Each is a bare `/v2/<kind>` list route that must NOT collide with the
// `/v2/<kind>/<slug>` detail route, and must return the entities of that kind.

function freshModel(): Repository {
  const db = openVnextDatabase(":memory:");
  migrateLocalDatabase(db);
  return new Repository(db);
}

function packet(overrides: Partial<MemoryPacket>): MemoryPacket {
  return {
    schema_version: 2,
    id: `repo:demo:${overrides.type ?? "decision"}:${overrides.title ?? "x"}`,
    title: "Untitled",
    summary: "s",
    body: "b",
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
    ...overrides,
  };
}

test("matchPortalRoute maps the browse-list paths to entity_list with the right kind", () => {
  assert.deepEqual(matchPortalRoute("/v2/components"), { kind: "entity_list", entityKind: "component" });
  assert.deepEqual(matchPortalRoute("/v2/flows"), { kind: "entity_list", entityKind: "flow" });
  assert.deepEqual(matchPortalRoute("/v2/runbooks"), { kind: "entity_list", entityKind: "runbook" });
  assert.deepEqual(matchPortalRoute("/v2/decisions"), { kind: "entity_list", entityKind: "decision" });
  // The detail route for a slug must still resolve to the detail kind, not the list.
  assert.equal(matchPortalRoute("/v2/components/some-slug")?.kind, "component");
});

test("handlePortalRoute entity_list returns the entities of exactly that kind", () => {
  const model = freshModel();
  importPacket(packet({ type: "gotcha", title: "A component" }), model); // gotcha → component
  importPacket(packet({ type: "decision", title: "A decision" }), model); // decision → decision
  const receiptStore = new ReceiptStore(model.database);

  const components = handlePortalRoute(
    { kind: "entity_list", entityKind: "component" },
    { model, receiptStore, team: null },
    new URLSearchParams(),
  );
  assert.equal(components.status, 200);
  const body = components.body as { kind: string; entities: Array<{ kind: string }> };
  assert.equal(body.kind, "component");
  assert.ok(body.entities.length >= 1, "the imported component must be listed");
  assert.ok(body.entities.every((e) => e.kind === "component"), "no other kind leaks into the component list");
});

test("an empty model yields an honest empty list, not an error", () => {
  const model = freshModel();
  const receiptStore = new ReceiptStore(model.database);
  const result = handlePortalRoute(
    { kind: "entity_list", entityKind: "runbook" },
    { model, receiptStore, team: null },
    new URLSearchParams(),
  );
  assert.equal(result.status, 200);
  assert.deepEqual((result.body as { entities: unknown[] }).entities, []);
});
