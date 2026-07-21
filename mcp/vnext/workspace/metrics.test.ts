// Phase E Task 6 — privacy-safe team metrics, proven both as pure arithmetic and against a REAL
// embedded PostgreSQL.
//
// Two disciplines are on trial here and neither is negotiable:
//
//   1. HONESTY. An exact request measurement is derived ONLY from receipts that measured both sides.
//      A partial or unavailable receipt contributes its presence to coverage and NOTHING to the
//      economics — it never becomes a flattering zero. Cohort outcome trends (time to verified change,
//      review burden, reuse and failed-open rates) are reported separately from the exact dollar
//      economics and are never fused into one ROI number.
//
//   2. PRIVACY. Team metrics carry identifiers, classes, and counts — never prompts, tool payloads,
//      or claim bodies. Below a minimum cohort the human-behaviour trends are SUPPRESSED with a
//      machine-readable reason rather than published for a group small enough to single someone out.
//      Tenancy is enforced in the query: another workspace's tasks are simply not there.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { startTestPostgres, type TestPostgres } from "./test-support/pg.js";
import { createDb, type Db } from "./db.js";
import { migrate } from "./migrate.js";
import {
  MINIMUM_COHORT,
  assertNoRawTaskOutcomeField,
  buildTeamMetrics,
  loadTeamMetrics,
  storeTaskOutcomes,
  type TeamTaskOutcomeRecord,
} from "./metrics.js";
import {
  exactReceipt,
  fixtureTaskOutcome,
  partialReceipt,
  unavailableReceipt,
} from "./test-support/metrics-fixtures.js";
import { startWorkspaceServer, type WorkspaceServer } from "./server.js";
import { applyBatch } from "./sync-routes.js";
import { buildSyncBatch } from "../sync/outbox.js";
import { createSession, type SessionCredentials } from "./auth/session.js";
import type { Principal, WorkspaceRole } from "./auth/types.js";

// ---------------------------------------------------------------------------------------------
// pure aggregation — no database required
// ---------------------------------------------------------------------------------------------

test("team report never derives exact savings from partial receipts", () => {
  const report = buildTeamMetrics([exactReceipt(-0.01), partialReceipt(), unavailableReceipt()]);
  assert.equal(report.exact_cost.receipts, 1);
  assert.equal(report.measurement_quality.partial, 1);
  assert.equal(report.measurement_quality.unavailable, 1);
  assert.equal(report.exact_cost.total_net_input_cost_delta_usd, -0.01);
});

test("a partial receipt carrying a cost number is still excluded from exact economics", () => {
  // A daemon that reports a cost alongside a partial measurement is not trustworthy for economics:
  // the quality class governs, not the presence of a number.
  const report = buildTeamMetrics([partialReceipt({ net_input_cost_delta_usd: -5 })]);
  assert.equal(report.exact_cost.receipts, 0);
  assert.equal(report.exact_cost.total_net_input_cost_delta_usd, null);
  assert.equal(report.exact_cost.p50_net_input_cost_delta_usd, null);
});

test("outcome trend is hidden below the privacy cohort threshold", () => {
  const report = buildTeamMetrics(Array.from({ length: 4 }, () => fixtureTaskOutcome()));
  assert.equal(report.time_to_verified_change, null);
  assert.equal(report.suppression_reason, "minimum_cohort_5");
});

test("outcome trends are published once the cohort reaches the threshold", () => {
  const report = buildTeamMetrics(
    Array.from({ length: MINIMUM_COHORT }, () => fixtureTaskOutcome()),
  );
  assert.equal(report.suppression_reason, null);
  assert.ok(report.time_to_verified_change);
  assert.equal(report.time_to_verified_change?.p50_ms, 120_000);
  assert.equal(report.verified_reuse.rate, 100);
  assert.equal(report.review_burden.decisions_per_task, 1);
  assert.equal(report.failed_open.rate, 0);
});

test("an empty window reports unavailable, never a fabricated zero", () => {
  const report = buildTeamMetrics([]);
  assert.equal(report.tasks, 0);
  assert.equal(report.exact_cost.total_net_input_cost_delta_usd, null);
  assert.equal(report.exact_cost.p50_net_input_cost_delta_usd, null);
  assert.equal(report.latency.p50_ms, null);
  assert.equal(report.measurement_quality.coverage, null);
  assert.equal(report.verified_reuse.rate, null);
  assert.equal(report.failed_open.rate, null);
  assert.equal(report.window_start, null);
});

test("kage processing cost is null when nothing measured it", () => {
  const report = buildTeamMetrics(
    Array.from({ length: MINIMUM_COHORT }, () => partialReceipt()),
  );
  assert.equal(report.exact_cost.kage_processing_cost_receipts, 0);
  assert.equal(report.exact_cost.kage_processing_cost_usd, null);
});

test("report counts repositories and agents without listing individual actors", () => {
  const report = buildTeamMetrics([
    fixtureTaskOutcome({ repository_id: "repo-a", agent_surface: "claude_code" }),
    fixtureTaskOutcome({ repository_id: "repo-b", agent_surface: "claude_code" }),
    fixtureTaskOutcome({ repository_id: "repo-b", agent_surface: "codex" }),
  ]);
  assert.equal(report.repositories, 2);
  assert.equal(report.agents, 2);
  assert.equal(report.tasks, 3);
  // No per-person or per-task detail leaks into the aggregate report.
  assert.equal(JSON.stringify(report).includes("task-"), false);
});

test("a cohort time trend is never expressed in dollars", () => {
  const report = buildTeamMetrics(Array.from({ length: 8 }, () => fixtureTaskOutcome()));
  assert.equal(report.time_to_verified_change?.unit, "milliseconds");
  // The only dollar-denominated numbers in the report live under exact_cost.
  const dollarKeys = Object.keys(report.time_to_verified_change ?? {}).filter((key) =>
    key.includes("usd"),
  );
  assert.deepEqual(dollarKeys, []);
});

test("failed-open tasks are counted and rated separately from delivery", () => {
  const records = [
    ...Array.from({ length: 4 }, () => fixtureTaskOutcome()),
    fixtureTaskOutcome({ delivery_status: "failed_open" }),
  ];
  const report = buildTeamMetrics(records);
  assert.equal(report.failed_open.tasks, 1);
  assert.equal(report.failed_open.rate, 20);
});

test("a raw payload field on a task outcome is refused", () => {
  const smuggled = { ...fixtureTaskOutcome(), prompt: "secret customer prompt" };
  assert.throws(
    () => assertNoRawTaskOutcomeField(smuggled as unknown as TeamTaskOutcomeRecord),
    /prompt/,
  );
});

// ---------------------------------------------------------------------------------------------
// tenant-scoped storage — REAL PostgreSQL
// ---------------------------------------------------------------------------------------------

let embedded: TestPostgres | null = null;
let db: Db;
let server: WorkspaceServer;

const workspaceA = randomUUID();
const workspaceB = randomUUID();

before(async () => {
  let url = process.env.KAGE_TEST_DATABASE_URL;
  if (!url) {
    embedded = await startTestPostgres();
    url = embedded.url;
  }
  db = createDb(url);
  await migrate(db);
  await seedWorkspace(workspaceA, "alpha");
  await seedWorkspace(workspaceB, "beta");
  server = await startWorkspaceServer(db);
});

after(async () => {
  await server?.close();
  await db?.close();
  await embedded?.stop();
});

async function seedWorkspace(id: string, slug: string): Promise<void> {
  await db.query(
    `INSERT INTO workspaces(workspace_id, name, slug, plan) VALUES($1, $2, $3, 'team')
       ON CONFLICT (workspace_id) DO NOTHING`,
    [id, slug, `${slug}-${id.slice(0, 8)}`],
  );
}

async function seedRepository(workspaceId: string, repositoryId: string): Promise<string> {
  await db.query(
    `INSERT INTO repositories(workspace_id, repository_id, provider, name)
       VALUES($1, $2, 'github', $2) ON CONFLICT DO NOTHING`,
    [workspaceId, repositoryId],
  );
  return repositoryId;
}

function principal(
  workspaceId: string,
  role: WorkspaceRole,
  repositoryIds: string[] | "all" = "all",
): Principal {
  return {
    principal_id: randomUUID(),
    workspace_id: workspaceId,
    principal_type: "user",
    role,
    repository_ids: repositoryIds,
  };
}

async function seedSession(
  workspaceId: string,
  role: WorkspaceRole,
): Promise<SessionCredentials> {
  const principalId = randomUUID();
  await db.query(
    `INSERT INTO workspace_principals(workspace_id, principal_id, principal_type, role, repository_ids)
       VALUES($1, $2, 'user', $3, NULL)`,
    [workspaceId, principalId, role],
  );
  return createSession(db, { workspace_id: workspaceId, principal_id: principalId });
}

test("stored task outcomes are readable only within their own workspace", async () => {
  const repo = await seedRepository(workspaceA, `repo-${randomUUID().slice(0, 8)}`);
  await storeTaskOutcomes(
    db,
    workspaceA,
    repo,
    Array.from({ length: MINIMUM_COHORT }, () =>
      fixtureTaskOutcome({ repository_id: repo, task_id: `t-${randomUUID().slice(0, 8)}` }),
    ),
  );

  const mine = await loadTeamMetrics(db, principal(workspaceA, "admin"), { repository_id: repo });
  assert.equal(mine.tasks, MINIMUM_COHORT);

  // The SAME repository id, read by another tenant, yields nothing at all.
  const theirs = await loadTeamMetrics(db, principal(workspaceB, "owner"), { repository_id: repo });
  assert.equal(theirs.tasks, 0);
  assert.equal(theirs.exact_cost.total_net_input_cost_delta_usd, null);
});

test("a repository-scoped principal never sees out-of-scope task outcomes", async () => {
  const permitted = await seedRepository(workspaceA, `repo-${randomUUID().slice(0, 8)}`);
  const other = await seedRepository(workspaceA, `repo-${randomUUID().slice(0, 8)}`);
  await storeTaskOutcomes(db, workspaceA, permitted, [
    fixtureTaskOutcome({ repository_id: permitted, task_id: `t-${randomUUID().slice(0, 8)}` }),
  ]);
  await storeTaskOutcomes(db, workspaceA, other, [
    fixtureTaskOutcome({ repository_id: other, task_id: `t-${randomUUID().slice(0, 8)}` }),
  ]);

  const scoped = await loadTeamMetrics(db, principal(workspaceA, "developer", [permitted]), {});
  assert.equal(scoped.repositories, 1);
  assert.equal(scoped.tasks, 1);

  const empty = await loadTeamMetrics(db, principal(workspaceA, "developer", []), {});
  assert.equal(empty.tasks, 0);
});

test("storing the same task outcome twice stores it once", async () => {
  const repo = await seedRepository(workspaceA, `repo-${randomUUID().slice(0, 8)}`);
  const record = fixtureTaskOutcome({ repository_id: repo, task_id: "duplicate-task" });
  await storeTaskOutcomes(db, workspaceA, repo, [record]);
  await storeTaskOutcomes(db, workspaceA, repo, [record]);
  const { rows } = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM workspace_task_outcomes
       WHERE workspace_id = $1 AND repository_id = $2`,
    [workspaceA, repo],
  );
  assert.equal(rows[0].count, "1");
});

test("the task outcome table cannot represent a raw payload", async () => {
  const { rows } = await db.query<{ column_name: string; data_type: string }>(
    `SELECT column_name, data_type FROM information_schema.columns
       WHERE table_name = 'workspace_task_outcomes'`,
  );
  assert.ok(rows.length > 0, "workspace_task_outcomes must exist");
  const forbidden = ["prompt", "payload", "body", "content", "response", "message", "text", "evidence"];
  for (const row of rows) {
    for (const word of forbidden) {
      assert.equal(
        row.column_name.includes(word),
        false,
        `workspace_task_outcomes.${row.column_name} looks like a raw payload column`,
      );
    }
  }
});

// ---------------------------------------------------------------------------------------------
// the sync path — aggregated outcomes travel, raw payloads do not
// ---------------------------------------------------------------------------------------------

test("a synced batch lands task outcomes exactly once", async () => {
  const repo = await seedRepository(workspaceA, `repo-${randomUUID().slice(0, 8)}`);
  const service: Principal = {
    principal_id: randomUUID(),
    workspace_id: workspaceA,
    principal_type: "service",
    role: "developer",
    repository_ids: [repo],
  };
  const batch = buildSyncBatch({
    workspace_id: workspaceA,
    repository_id: repo,
    entities: [],
    claims: [],
    evidence: [],
    relations: [],
    task_outcomes: [
      fixtureTaskOutcome({ repository_id: repo, task_id: "sync-task-1" }),
      fixtureTaskOutcome({ repository_id: repo, task_id: "sync-task-2" }),
    ],
  });

  const first = await applyBatch(db, service, batch);
  assert.equal(first.status, "applied");
  assert.equal(first.applied_counts.task_outcomes, 2);

  // A replay is a no-op: the outcome count must not double.
  const replay = await applyBatch(db, service, batch);
  assert.equal(replay.status, "duplicate");

  const metrics = await loadTeamMetrics(db, principal(workspaceA, "admin"), { repository_id: repo });
  assert.equal(metrics.tasks, 2);
});

test("a batch whose task outcome carries a raw payload is refused before anything lands", async () => {
  const repo = await seedRepository(workspaceA, `repo-${randomUUID().slice(0, 8)}`);
  const service: Principal = {
    principal_id: randomUUID(),
    workspace_id: workspaceA,
    principal_type: "service",
    role: "developer",
    repository_ids: [repo],
  };
  const smuggled = {
    ...fixtureTaskOutcome({ repository_id: repo, task_id: "sync-task-raw" }),
    prompt: "the user's actual prompt",
  } as unknown as TeamTaskOutcomeRecord;

  assert.throws(
    () =>
      buildSyncBatch({
        workspace_id: workspaceA,
        repository_id: repo,
        entities: [],
        claims: [],
        evidence: [],
        relations: [],
        task_outcomes: [smuggled],
      }),
    /prompt/,
  );

  // Even a hand-assembled batch that bypasses buildSyncBatch is rejected at the ingest boundary.
  const handAssembled = {
    protocol_version: 1 as const,
    batch_id: `raw-${randomUUID()}`,
    workspace_id: workspaceA,
    repository_id: repo,
    base_cursor: null,
    entities: [],
    claims: [],
    evidence: [],
    relations: [],
    review_decisions: [],
    measurements: [],
    task_outcomes: [smuggled],
    created_at: new Date().toISOString(),
  };
  await assert.rejects(() => applyBatch(db, service, handAssembled), /prompt/);
  const metrics = await loadTeamMetrics(db, principal(workspaceA, "admin"), { repository_id: repo });
  assert.equal(metrics.tasks, 0);
});

test("the metrics route is tenant-scoped and role-gated", async () => {
  const repo = await seedRepository(workspaceA, `repo-${randomUUID().slice(0, 8)}`);
  await storeTaskOutcomes(db, workspaceA, repo, [
    fixtureTaskOutcome({ repository_id: repo, task_id: `t-${randomUUID().slice(0, 8)}` }),
  ]);
  const reader = await seedSession(workspaceA, "developer");
  const viewer = await seedSession(workspaceA, "viewer");
  const stranger = await seedSession(workspaceB, "owner");

  const ok = await fetch(
    `http://127.0.0.1:${server.port}/v1/workspaces/${workspaceA}/metrics`,
    { headers: { cookie: `kage_session=${reader.token}` } },
  );
  assert.equal(ok.status, 200);
  const body = (await ok.json()) as { metrics: { tasks: number } };
  assert.ok(body.metrics.tasks >= 1);

  // A viewer has no metrics.read authority.
  const denied = await fetch(
    `http://127.0.0.1:${server.port}/v1/workspaces/${workspaceA}/metrics`,
    { headers: { cookie: `kage_session=${viewer.token}` } },
  );
  assert.equal(denied.status, 403);

  // Another tenant asking for workspace A's metrics is a 404 — existence is never disclosed.
  const crossTenant = await fetch(
    `http://127.0.0.1:${server.port}/v1/workspaces/${workspaceA}/metrics`,
    { headers: { cookie: `kage_session=${stranger.token}` } },
  );
  assert.equal(crossTenant.status, 404);
});
