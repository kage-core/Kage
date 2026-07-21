// Phase E Task 6 hardening — the CONSUMER side of the team-metrics pipeline.
//
// `buildOverview` grew a `team` parameter that nothing ever passed, so the portal could only ever
// render "No workspace connected" no matter what a workspace held. The link built here is the piece
// that fills it, and it is bound by the architecture rule the whole phase rests on: the workspace is
// NEVER on the low-latency local path. So the link
//   - caches the team panel and answers from memory (a portal request never waits on the network);
//   - swallows every transport failure (an outage yields null, never an exception into the portal);
//   - refuses to serve a panel older than its freshness window, because a stale team number presented
//     as current is worse than an honest "no workspace connected".
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openVnextDatabase } from "../storage/database.js";
import { migrateLocalDatabase } from "../storage/migrations.js";
import { ReceiptStore } from "../storage/receipt-store.js";
import { Repository } from "../repo-model/repository.js";
import { handlePortalRoute } from "../api/router.js";
import type { OverviewDto } from "../api/types.js";
import { buildTeamMetrics } from "../workspace/metrics.js";
import { fixtureTaskOutcome } from "../workspace/test-support/metrics-fixtures.js";
import { fixtureSyncBatch } from "./fixtures.js";
import { createWorkspaceLink } from "./workspace-link.js";
import type { SyncTransport } from "./client.js";
import type { LocalModelSnapshot, SyncBatch } from "./types.js";

const WORKSPACE = "11111111-1111-4111-8111-111111111111";

function report() {
  return buildTeamMetrics(Array.from({ length: 6 }, () => fixtureTaskOutcome()));
}

function offlineTransport(): SyncTransport {
  return {
    async push(): Promise<never> {
      throw new Error("workspace unreachable");
    },
    async pull(): Promise<never> {
      throw new Error("workspace unreachable");
    },
  };
}

function recordingTransport(pushed: SyncBatch[]): SyncTransport {
  return {
    async push(batch) {
      pushed.push(batch);
      return { batch_id: batch.batch_id, status: "applied", applied_counts: {} };
    },
    async pull() {
      return { cursor: null, batches: [] };
    },
  };
}

function snapshot(): LocalModelSnapshot {
  const batch = fixtureSyncBatch(WORKSPACE, "repo-a1");
  return {
    workspace_id: WORKSPACE,
    repository_id: "repo-a1",
    entities: batch.entities,
    claims: batch.claims,
    evidence: batch.evidence,
    relations: batch.relations,
    task_outcomes: [fixtureTaskOutcome({ repository_id: "repo-a1" })],
  };
}

test("a cached team panel answers the portal without touching the network", async () => {
  let calls = 0;
  const link = createWorkspaceLink({
    transport: offlineTransport(),
    fetchTeamMetrics: async () => {
      calls += 1;
      return report();
    },
  });
  assert.equal(link.teamPanel(), null, "nothing is claimed before a workspace has answered");
  await link.refreshTeamPanel();
  const panel = link.teamPanel();
  assert.ok(panel, "a workspace that answered must be projected");
  assert.equal(panel?.tasks, 6);
  // Reading the panel again is pure memory: the portal path never re-fetches.
  link.teamPanel();
  assert.equal(calls, 1);
});

test("a workspace outage leaves the panel null instead of throwing into the portal", async () => {
  const link = createWorkspaceLink({
    transport: offlineTransport(),
    fetchTeamMetrics: async () => {
      throw new Error("workspace unreachable");
    },
  });
  await link.refreshTeamPanel();
  assert.equal(link.teamPanel(), null);
});

test("a panel older than its freshness window is withdrawn, never served as current", async () => {
  let now = 1_000;
  const link = createWorkspaceLink({
    transport: offlineTransport(),
    fetchTeamMetrics: async () => report(),
    maxPanelAgeMs: 60_000,
    now: () => now,
  });
  await link.refreshTeamPanel();
  assert.ok(link.teamPanel());
  now += 59_000;
  assert.ok(link.teamPanel(), "still inside the freshness window");
  now += 2_000;
  assert.equal(link.teamPanel(), null, "a stale team number must not be presented as current");
});

test("an offline sync keeps the batch pending and delivers it exactly once later", async () => {
  const pushed: SyncBatch[] = [];
  let offline = true;
  const transport: SyncTransport = {
    async push(batch) {
      if (offline) throw new Error("workspace unreachable");
      pushed.push(batch);
      return { batch_id: batch.batch_id, status: "applied", applied_counts: {} };
    },
    async pull() {
      return { cursor: null, batches: [] };
    },
  };
  const link = createWorkspaceLink({ transport, fetchTeamMetrics: async () => report() });
  const unchanged = snapshot();

  const first = await link.syncOnce(unchanged);
  assert.equal(first.offline, true);
  assert.equal(first.pushed, 0);
  assert.equal(pushed.length, 0);

  offline = false;
  // The same snapshot re-enqueues the SAME content-hashed batch, so the retry cannot duplicate it.
  const second = await link.syncOnce(unchanged);
  assert.equal(second.offline, false);
  assert.equal(second.pushed, 1);
  const third = await link.syncOnce(unchanged);
  assert.equal(third.pushed, 0, "an acknowledged batch is never pushed twice");
  assert.equal(pushed.length, 1);
  assert.equal(pushed[0].task_outcomes?.length, 1);
});

test("the portal overview renders the linked team panel, and honestly nothing during an outage", async () => {
  const dir = mkdtempSync(join(tmpdir(), "kage-link-portal-"));
  const database = openVnextDatabase(join(dir, "kage.db"));
  try {
    migrateLocalDatabase(database);
    const model = new Repository(database);
    const receiptStore = new ReceiptStore(database);
    const link = createWorkspaceLink({
      transport: recordingTransport([]),
      fetchTeamMetrics: async () => report(),
    });

    const offlineResult = handlePortalRoute(
      { kind: "overview" },
      { model, receiptStore, team: link.teamPanel() },
      new URLSearchParams(),
    );
    assert.equal((offlineResult.body as OverviewDto).team, null);

    await link.refreshTeamPanel();
    const connected = handlePortalRoute(
      { kind: "overview" },
      { model, receiptStore, team: link.teamPanel() },
      new URLSearchParams(),
    );
    const team = (connected.body as OverviewDto).team;
    assert.ok(team, "a connected workspace must reach the portal overview");
    assert.equal(team?.tasks, 6);
    assert.ok(team?.metrics.length ?? 0 > 0);
  } finally {
    database.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
