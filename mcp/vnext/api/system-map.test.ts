import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openVnextDatabase, type LocalDatabase } from "../storage/database.js";
import { migrateLocalDatabase } from "../storage/migrations.js";
import { Repository } from "../repo-model/repository.js";
import type { ClaimRecord, EntityRecord, EvidenceRecord } from "../repo-model/types.js";
import { buildSystemMap } from "./system-map.js";
import { SYSTEM_MAP_LANES } from "./types.js";

const NOW = "2026-07-13T00:00:00.000Z";
const REPO = "repo-1";

function migratedDatabase(): LocalDatabase {
  const db = openVnextDatabase(":memory:");
  migrateLocalDatabase(db);
  return db;
}

function entity(overrides: Partial<EntityRecord> & Pick<EntityRecord, "entity_id" | "kind" | "canonical_name" | "slug">): EntityRecord {
  return {
    repository_id: REPO,
    summary: "",
    status: "active",
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function evidence(): EvidenceRecord {
  return {
    evidence_id: randomUUID(),
    repository_id: REPO,
    source_type: "source",
    source_uri: "src/x.ts",
    source_fingerprint: randomUUID(),
    commit: "abc123",
    path: "src/x.ts",
    symbol: "x",
    line_start: 1,
    line_end: 2,
    verification_method: "source_fingerprint",
    verification_state: "verified",
    privacy_class: "team_metadata",
    observed_at: NOW,
  };
}

function claim(overrides: Partial<ClaimRecord> & Pick<ClaimRecord, "entity_id" | "trust_state">): ClaimRecord {
  return {
    claim_id: randomUUID(),
    claim_kind: "behavior",
    normalized_content: "content",
    confidence: 1,
    impact_class: "low",
    valid_from_commit: null,
    valid_to_commit: null,
    supersedes_claim_id: null,
    review_policy: "automatic",
    created_by: "compiler",
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

// A model with a directed chain that spans four hops so the two-hop window is observable:
//   feature-auth --depends_on--> component-token --persists_to--> data_model-session --owned_by--> owner-team
// plus an isolated feature-billing --exposes--> contract-jwt pair for lane coverage and view roots.
function fixtureModel(): Repository {
  const model = new Repository(migratedDatabase());
  model.upsertEntity(entity({ entity_id: "feature-auth", kind: "feature", canonical_name: "Authentication", slug: "authentication" }));
  model.upsertEntity(entity({ entity_id: "feature-billing", kind: "feature", canonical_name: "Billing", slug: "billing" }));
  model.upsertEntity(entity({ entity_id: "component-token", kind: "component", canonical_name: "Token store", slug: "token-store" }));
  model.upsertEntity(entity({ entity_id: "data-session", kind: "data_model", canonical_name: "Session record", slug: "session-record" }));
  model.upsertEntity(entity({ entity_id: "owner-team", kind: "owner", canonical_name: "Platform team", slug: "platform-team" }));
  model.upsertEntity(entity({ entity_id: "contract-jwt", kind: "contract", canonical_name: "JWT contract", slug: "jwt-contract" }));

  const ev = evidence();
  model.addEvidence(ev);

  // feature-auth: verified + stale => health "stale" (has stale claim).
  model.createClaim(claim({ entity_id: "feature-auth", trust_state: "verified", impact_class: "high" }), [
    { evidence_id: ev.evidence_id, stance: "supports" },
  ]);
  model.createClaim(claim({ entity_id: "feature-auth", trust_state: "stale", impact_class: "high" }));
  // component-token: verified only => health "verified".
  model.createClaim(claim({ entity_id: "component-token", trust_state: "verified" }), [
    { evidence_id: ev.evidence_id, stance: "supports" },
  ]);
  // data-session: disputed => health "disputed".
  model.createClaim(claim({ entity_id: "data-session", trust_state: "disputed" }));
  // feature-billing + owner-team + contract-jwt: no claims => health "unverified".

  const rel = (from: string, type: string, to: string): void => {
    model.addRelation({
      relation_id: randomUUID(),
      repository_id: REPO,
      from_entity_id: from,
      relation_type: type,
      to_entity_id: to,
      evidence_id: null,
      created_at: NOW,
    });
  };
  rel("feature-auth", "depends_on", "component-token");
  rel("component-token", "persists_to", "data-session");
  rel("data-session", "owned_by", "owner-team");
  rel("feature-billing", "exposes", "contract-jwt");

  return model;
}

test("feature map uses stable lanes and deterministic ordering", () => {
  const first = buildSystemMap(fixtureModel(), REPO, "feature");
  const second = buildSystemMap(fixtureModel(), REPO, "feature");
  assert.deepEqual(first, second, "system map must be byte-stable across calls");
  assert.deepEqual(
    first.lanes.map((lane) => lane.lane),
    [...SYSTEM_MAP_LANES],
    "lanes render in a fixed order regardless of contents",
  );
});

test("nodes carry deterministic coordinates, health, and hrefs", () => {
  const map = buildSystemMap(fixtureModel(), REPO, "feature");
  const nodes = new Map(map.lanes.flatMap((l) => l.nodes).map((n) => [n.entity_id, n]));

  const auth = nodes.get("feature-auth")!;
  assert.equal(auth.lane, "feature");
  assert.equal(auth.href, "/features/authentication");
  assert.equal(auth.health, "stale", "verified+stale entity is not 'verified' — stale is surfaced");
  assert.equal(typeof auth.x, "number");
  assert.equal(typeof auth.y, "number");

  assert.equal(nodes.get("component-token")!.health, "verified");
  assert.equal(nodes.get("data-session")!.health, "disputed");
  assert.equal(nodes.get("feature-billing")!.health, "unverified");
  // data models have no dedicated portal page yet — an honest null, not a broken link.
  assert.equal(nodes.get("data-session")!.href, null);

  // Distinct lanes get distinct x; nodes within one lane get distinct y.
  assert.notEqual(nodes.get("feature-auth")!.x, nodes.get("component-token")!.x);
  assert.notEqual(nodes.get("feature-auth")!.y, nodes.get("feature-billing")!.y);
});

test("the table is an accessible equivalent of the shown graph", () => {
  const map = buildSystemMap(fixtureModel(), REPO, "feature");
  const shownIds = new Set(map.lanes.flatMap((l) => l.nodes).map((n) => n.entity_id));
  const tableIds = new Set(map.table.map((r) => r.entity_id));
  assert.deepEqual(tableIds, shownIds, "every shown node has exactly one table row and vice versa");

  const authRow = map.table.find((r) => r.entity_id === "feature-auth")!;
  assert.deepEqual(authRow.downstream, ["Token store"]);
  assert.deepEqual(authRow.upstream, []);

  const tokenRow = map.table.find((r) => r.entity_id === "component-token")!;
  assert.deepEqual(tokenRow.upstream, ["Authentication"]);
  assert.deepEqual(tokenRow.downstream, ["Session record"]);
});

test("initial view is limited to two hops from the view's roots and marks truncation", () => {
  const map = buildSystemMap(fixtureModel(), REPO, "feature");
  const shown = new Set(map.lanes.flatMap((l) => l.nodes).map((n) => n.entity_id));
  // Roots are the features (hop 0); token is hop 1, session hop 2, owner hop 3 (excluded).
  assert.ok(shown.has("feature-auth"));
  assert.ok(shown.has("component-token"));
  assert.ok(shown.has("data-session"));
  assert.ok(!shown.has("owner-team"), "a node three hops out is not rendered in the initial window");

  const session = map.lanes.flatMap((l) => l.nodes).find((n) => n.entity_id === "data-session")!;
  assert.equal(session.truncated, true, "a node whose neighbor is hidden is marked expandable");
  assert.equal(map.truncated, true);
});

test("focusing an entity re-roots the two-hop window on it", () => {
  const map = buildSystemMap(fixtureModel(), REPO, "feature", "feature-auth");
  const shown = new Set(map.lanes.flatMap((l) => l.nodes).map((n) => n.entity_id));
  assert.equal(map.focus_entity_id, "feature-auth");
  assert.ok(shown.has("feature-auth"));
  assert.ok(shown.has("component-token"));
  assert.ok(shown.has("data-session"));
  assert.ok(!shown.has("feature-billing"), "an unrelated feature is excluded when a focus is set");
  assert.ok(!shown.has("owner-team"));
});

test("the ownership view re-roots on owners so a different subgraph is task-relevant", () => {
  const map = buildSystemMap(fixtureModel(), REPO, "ownership");
  const shown = new Set(map.lanes.flatMap((l) => l.nodes).map((n) => n.entity_id));
  // owner-team is hop 0; session hop 1; token hop 2; auth would be hop 3 (excluded).
  assert.ok(shown.has("owner-team"));
  assert.ok(shown.has("data-session"));
  assert.ok(shown.has("component-token"));
  assert.ok(!shown.has("feature-auth"), "ownership view does not reach the feature three hops from the owner");

  // owners have no dedicated detail page yet — an honest null href, not a broken link.
  const owner = map.lanes.flatMap((l) => l.nodes).find((n) => n.entity_id === "owner-team")!;
  assert.equal(owner.href, null);
});

test("an empty repository yields an honest empty map, not a crash", () => {
  const model = new Repository(migratedDatabase());
  const map = buildSystemMap(model, null, "feature");
  assert.deepEqual(map.lanes.map((l) => l.lane), [...SYSTEM_MAP_LANES]);
  assert.equal(map.table.length, 0);
  assert.equal(map.edges.length, 0);
  assert.equal(map.truncated, false);
});
