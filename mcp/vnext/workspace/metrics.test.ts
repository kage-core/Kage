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
  MINIMUM_ACTORS,
  MINIMUM_COHORT,
  assertNoRawTaskOutcomeField,
  buildTeamMetrics,
  loadTeamMetrics,
  storeTaskOutcomes,
  validateTaskOutcome,
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
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openVnextDatabase } from "../storage/database.js";
import { migrateLocalDatabase } from "../storage/migrations.js";
import { ReceiptStore } from "../storage/receipt-store.js";
import { DeliveryStore, type StoredContextDelivery } from "../storage/delivery-store.js";
import type { TransformationReceipt } from "../protocol/index.js";
import { collectTaskOutcomes } from "../sync/task-outcomes.js";
import { createWorkspaceLink } from "../sync/workspace-link.js";
import { httpTransport } from "../sync/client.js";
import { teamMetricsPanel } from "../api/read-models.js";
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
  // The team routes are ENTITLED routes: since Task 7's hardening, team sync and team review are refused
  // with 402 on a workspace whose subscription lapsed (see billing/hardening.test.ts, which owns that
  // rule). This suite is about AUTHORITY and TENANCY on a paying workspace, so it states the paid state
  // explicitly rather than relying on an unentitled workspace being allowed to do team work.
  await db.query(
    `INSERT INTO workspace_subscriptions(workspace_id, plan_id, status, current_period_end)
       VALUES($1, 'team', 'active', now() + interval '30 days')
       ON CONFLICT (workspace_id) DO NOTHING`,
    [id],
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

// ---------------------------------------------------------------------------------------------
// Task 6 hardening — suppression that cannot be reversed, per-person k-anonymity, and a validated ingest
// ---------------------------------------------------------------------------------------------

test("a suppressed cohort withholds the numerators its rates are computable from", () => {
  // Nulling only the RATE is not suppression: a reader who is handed tasks, tasks_with_reuse, decisions
  // and failed_open.tasks in the same body simply divides and recovers every withheld figure.
  const records = [
    ...Array.from({ length: 2 }, () => fixtureTaskOutcome()),
    fixtureTaskOutcome({ delivery_status: "failed_open" }),
  ];
  const report = buildTeamMetrics(records);
  assert.equal(report.suppression_reason, "minimum_cohort_5");
  assert.equal(report.verified_reuse.rate, null);
  assert.equal(report.verified_reuse.tasks_with_reuse, null);
  assert.equal(report.verified_reuse.distinct_knowledge_ids, null);
  assert.equal(report.review_burden.decisions, null);
  assert.equal(report.review_burden.decisions_per_task, null);
  assert.equal(report.failed_open.tasks, null);
  assert.equal(report.failed_open.rate, null);
});

test("a cohort of tasks from too few people is one person's record, and is suppressed", () => {
  // MINIMUM_COHORT counts TASKS. Six tasks logged by a single engineer publish that individual's
  // behaviour under a team label, which is exactly what the k-anonymity floor exists to prevent.
  const solo = Array.from({ length: MINIMUM_COHORT + 1 }, () =>
    fixtureTaskOutcome({ actor_id: "engineer-1" }),
  );
  const report = buildTeamMetrics(solo);
  assert.equal(report.actors, 1);
  assert.equal(report.suppression_reason, "minimum_actors_3");
  assert.equal(report.time_to_verified_change, null);
  assert.equal(report.verified_reuse.rate, null);
  assert.equal(report.review_burden.decisions_per_task, null);
  assert.equal(report.failed_open.rate, null);
});

test("a cohort spread across enough people publishes its trends", () => {
  const spread = Array.from({ length: MINIMUM_COHORT }, (_, index) =>
    fixtureTaskOutcome({ actor_id: `engineer-${index % MINIMUM_ACTORS}` }),
  );
  const report = buildTeamMetrics(spread);
  assert.equal(report.actors, MINIMUM_ACTORS);
  assert.equal(report.suppression_reason, null);
  assert.ok(report.time_to_verified_change);
});

test("an empty window is unmeasured, never 'withheld for privacy'", () => {
  // There is nothing to withhold from a workspace with no data; claiming suppression tells a new team
  // its numbers are being hidden from it.
  const report = buildTeamMetrics([]);
  assert.equal(report.tasks, 0);
  assert.equal(report.suppression_reason, null);
  assert.equal(report.actors, 0);
});

test("an identifier field cannot carry free text", () => {
  // The allow-list only proves WHICH keys travel. Unbounded TEXT under a permitted key is where a
  // prompt would actually hide, so shape and length are checked too.
  const leak = "SSN 123-45-6789; the user's full prompt text with customer data";
  assert.throws(() => validateTaskOutcome(fixtureTaskOutcome({ task_id: leak })), /task_id/);
  assert.throws(() => validateTaskOutcome(fixtureTaskOutcome({ agent_surface: leak })), /agent_surface/);
  assert.throws(() => validateTaskOutcome(fixtureTaskOutcome({ repository_id: leak })), /repository_id/);
  assert.throws(() => validateTaskOutcome(fixtureTaskOutcome({ actor_id: leak })), /actor_id/);
  assert.throws(
    () => validateTaskOutcome(fixtureTaskOutcome({ knowledge_ids_reused: [leak] })),
    /knowledge_ids_reused/,
  );
  assert.throws(
    () => validateTaskOutcome(fixtureTaskOutcome({ task_id: "t".repeat(1024) })),
    /task_id/,
  );
});

test("an out-of-vocabulary class or malformed number is refused before Postgres sees it", () => {
  assert.throws(
    () => validateTaskOutcome({ ...fixtureTaskOutcome(), mode: "pwned" } as unknown as TeamTaskOutcomeRecord),
    /mode/,
  );
  assert.throws(
    () => validateTaskOutcome({ task_id: "only-an-id" } as unknown as TeamTaskOutcomeRecord),
    /repository_id|actor_id|agent_surface/,
  );
  assert.throws(
    () => validateTaskOutcome(fixtureTaskOutcome({ review_decisions: -3 })),
    /review_decisions/,
  );
  assert.throws(
    () => validateTaskOutcome(fixtureTaskOutcome({ started_at: "not-a-timestamp" })),
    /started_at/,
  );
  assert.throws(
    () => validateTaskOutcome(fixtureTaskOutcome({ latency_ms: Number.NaN })),
    /latency_ms/,
  );
});

test("a free-text identifier is refused by the store AND by the table itself", async () => {
  const repo = await seedRepository(workspaceA, `repo-${randomUUID().slice(0, 8)}`);
  const leaking = fixtureTaskOutcome({
    repository_id: repo,
    task_id: "SSN 123-45-6789; the user's full prompt text",
  });
  await assert.rejects(() => storeTaskOutcomes(db, workspaceA, repo, [leaking]), /task_id/);

  // Even a direct INSERT that bypasses the TypeScript layer is refused by the schema.
  await assert.rejects(
    () =>
      db.query(
        `INSERT INTO workspace_task_outcomes(
           workspace_id, repository_id, task_id, actor_id, agent_surface, mode, measurement_quality,
           delivery_status, verification_outcome, knowledge_ids_reused, review_decisions, started_at)
         VALUES($1,$2,$3,$4,$5,'assist','exact','delivered','verified',$6,0,now())`,
        [
          workspaceA,
          repo,
          "the user's full prompt text with customer data",
          "actor-1",
          "claude_code",
          ["another whole prompt, verbatim"],
        ],
      ),
    /constraint|check/i,
  );
  const metrics = await loadTeamMetrics(db, principal(workspaceA, "admin"), { repository_id: repo });
  assert.equal(metrics.tasks, 0);
});

test("the metrics route suppresses the numerators too", async () => {
  const repo = await seedRepository(workspaceA, `repo-${randomUUID().slice(0, 8)}`);
  await storeTaskOutcomes(db, workspaceA, repo, [
    fixtureTaskOutcome({ repository_id: repo, task_id: `t-${randomUUID().slice(0, 8)}` }),
  ]);
  const reader = await seedSession(workspaceA, "developer");
  const response = await fetch(
    `http://127.0.0.1:${server.port}/v1/workspaces/${workspaceA}/metrics?repository=${repo}`,
    { headers: { cookie: `kage_session=${reader.token}` } },
  );
  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    metrics: {
      suppression_reason: string | null;
      verified_reuse: { tasks_with_reuse: number | null };
      review_burden: { decisions: number | null };
      failed_open: { tasks: number | null };
    };
  };
  assert.equal(body.metrics.suppression_reason, "minimum_cohort_5");
  assert.equal(body.metrics.verified_reuse.tasks_with_reuse, null);
  assert.equal(body.metrics.review_burden.decisions, null);
  assert.equal(body.metrics.failed_open.tasks, null);
});

test("an unparseable metrics window is a 400, not a 500", async () => {
  const reader = await seedSession(workspaceA, "developer");
  const response = await fetch(
    `http://127.0.0.1:${server.port}/v1/workspaces/${workspaceA}/metrics?since=not-a-date`,
    { headers: { cookie: `kage_session=${reader.token}` } },
  );
  assert.equal(response.status, 400);
  const body = (await response.json()) as { error: string };
  assert.equal(body.error, "invalid_window");
});

test("an invalid pushed task outcome is a 400, not a 500", async () => {
  const repo = await seedRepository(workspaceA, `repo-${randomUUID().slice(0, 8)}`);
  const principalId = randomUUID();
  await db.query(
    `INSERT INTO workspace_principals(workspace_id, principal_id, principal_type, role, repository_ids)
       VALUES($1, $2, 'service', 'developer', $3)`,
    [workspaceA, principalId, JSON.stringify([repo])],
  );
  const session = await createSession(db, { workspace_id: workspaceA, principal_id: principalId });
  const response = await fetch(`http://127.0.0.1:${server.port}/v1/sync/push`, {
    method: "POST",
    headers: { authorization: `Bearer ${session.token}`, "content-type": "application/json" },
    body: JSON.stringify({
      protocol_version: 1,
      batch_id: `invalid-${randomUUID()}`,
      workspace_id: workspaceA,
      repository_id: repo,
      base_cursor: null,
      entities: [],
      claims: [],
      evidence: [],
      relations: [],
      review_decisions: [],
      measurements: [],
      task_outcomes: [{ ...fixtureTaskOutcome({ repository_id: repo }), mode: "pwned" }],
      created_at: new Date().toISOString(),
    }),
  });
  assert.equal(response.status, 400);
  const body = (await response.json()) as { error: string };
  assert.equal(body.error, "invalid_task_outcome");
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

// ---------------------------------------------------------------------------------------------
// Task 6 hardening — the pipeline on REAL data, end to end
// ---------------------------------------------------------------------------------------------
//
// Every privacy and honesty rule above was unit-green over hand-written fixtures while NOTHING in the
// product produced a task outcome and NOTHING consumed the team panel. This test runs the whole path on
// records a real install writes: local sqlite tasks + receipts + deliveries -> the producer -> the
// outbox -> a real HTTP push -> real PostgreSQL -> the metrics route -> the portal panel.

test("local task records reach the portal team panel through the real sync path", async () => {
  const repo = await seedRepository(workspaceA, `repo-${randomUUID().slice(0, 8)}`);
  const dir = mkdtempSync(join(tmpdir(), "kage-pipeline-"));
  const localDb = openVnextDatabase(join(dir, "kage.db"));
  try {
    migrateLocalDatabase(localDb);
    const receiptStore = new ReceiptStore(localDb);
    const deliveryStore = new DeliveryStore(localDb);
    const engineers = ["ada@example.com", "grace@example.com", "alan@example.com"];
    for (let index = 0; index < 6; index += 1) {
      const taskId = `local-task-${index}`;
      localDb
        .prepare(
          `INSERT INTO tasks (task_id, session_id, repository_id, agent_surface, user_id, started_at, ended_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          taskId,
          `session-${index}`,
          repo,
          "claude_code",
          engineers[index % engineers.length],
          "2026-07-20T00:00:00.000Z",
          "2026-07-20T00:05:00.000Z",
        );
      const receipt: TransformationReceipt = {
        receipt_id: `r-${index}`,
        task_id: taskId,
        request_id: `req-${index}`,
        provider: "anthropic",
        model: "claude-sonnet",
        mode: "assist",
        measurement_quality: "exact",
        before_input_bytes: 4_000,
        after_input_bytes: 2_000,
        before_input_tokens: 1_000,
        after_input_tokens: 500,
        output_tokens: 300,
        kage_processing_cost_usd: 0.001,
        provider_input_cost_before_usd: 0.05,
        provider_input_cost_after_usd: 0.03,
        latency_ms: 40,
        transformations: ["compress"],
        created_at: "2026-07-20T00:00:01.000Z",
      };
      receiptStore.write(receipt);
      const delivery: StoredContextDelivery = {
        protocol_version: 1,
        delivery_id: `d-${index}`,
        capsule_id: `capsule-${index}`,
        task_id: taskId,
        adapter_id: "claude_code",
        injection_location: "system",
        delivered_at: "2026-07-20T00:00:02.000Z",
        added_bytes: 512,
        added_tokens: 128,
        measurement_quality: "exact",
        status: "delivered",
        reason: "capsule injected",
        composition_latency_ms: 12,
      } as StoredContextDelivery;
      deliveryStore.write(delivery);
    }

    const outcomes = collectTaskOutcomes(
      { database: localDb, receipts: receiptStore, deliveries: deliveryStore },
      { actorSalt: "install-salt", repositoryId: repo },
    );
    assert.equal(outcomes.length, 6);

    // Push over real HTTP with a real service token, exactly as a daemon would.
    const principalId = randomUUID();
    await db.query(
      `INSERT INTO workspace_principals(workspace_id, principal_id, principal_type, role, repository_ids)
         VALUES($1, $2, 'service', 'developer', $3)`,
      [workspaceA, principalId, JSON.stringify([repo])],
    );
    const service = await createSession(db, { workspace_id: workspaceA, principal_id: principalId });
    const reader = await seedSession(workspaceA, "developer");
    const baseUrl = `http://127.0.0.1:${server.port}`;
    const link = createWorkspaceLink({
      transport: httpTransport(baseUrl, service.token),
      async fetchTeamMetrics() {
        const response = await fetch(`${baseUrl}/v1/workspaces/${workspaceA}/metrics?repository=${repo}`, {
          headers: { cookie: `kage_session=${reader.token}` },
        });
        if (!response.ok) throw new Error(`metrics failed: ${response.status}`);
        return ((await response.json()) as { metrics: Awaited<ReturnType<typeof loadTeamMetrics>> }).metrics;
      },
    });

    const summary = await link.syncOnce({
      workspace_id: workspaceA,
      repository_id: repo,
      entities: [],
      claims: [],
      evidence: [],
      relations: [],
      task_outcomes: outcomes,
    });
    assert.equal(summary.offline, false);
    assert.equal(summary.pushed, 1);

    // The workspace holds exactly the six tasks, from three distinct people, so nothing is suppressed.
    const stored = await loadTeamMetrics(db, principal(workspaceA, "admin"), { repository_id: repo });
    assert.equal(stored.tasks, 6);
    assert.equal(stored.actors, 3);
    assert.equal(stored.suppression_reason, null);
    assert.equal(stored.exact_cost.receipts, 6);
    assert.equal(stored.exact_cost.total_net_input_cost_delta_usd, -0.12);

    // No engineer's address, and nothing resembling a payload, survived the trip.
    const raw = await db.query<{ row: string }>(
      `SELECT row_to_json(t)::text AS row FROM workspace_task_outcomes t WHERE workspace_id = $1 AND repository_id = $2`,
      [workspaceA, repo],
    );
    assert.equal(raw.rows.length, 6);
    for (const row of raw.rows) {
      for (const engineer of engineers) assert.equal(row.row.includes(engineer), false);
    }

    await link.refreshTeamPanel();
    const panel = link.teamPanel();
    assert.ok(panel, "the portal panel must be populated from the live workspace");
    assert.equal(panel?.tasks, 6);
    assert.deepEqual(panel, teamMetricsPanel(stored));
  } finally {
    localDb.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
