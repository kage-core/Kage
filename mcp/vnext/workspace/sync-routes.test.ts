// Phase E Task 3 — the workspace-side sync landing, proven against a REAL embedded PostgreSQL.
//
// These are the security-critical, code-provable gates for sync: a replayed batch never duplicates rows
// (duplicate_sync_records=0), a batch that still carries raw evidence is refused (raw_payloads_synced=0),
// a cross-tenant or out-of-scope push/pull sees nothing, and a concurrent claim divergence preserves both
// versions instead of overwriting. None of this is meaningful against a mock, so the suite provisions an
// ephemeral real PostgreSQL when KAGE_TEST_DATABASE_URL is absent.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { startTestPostgres, type TestPostgres } from "./test-support/pg.js";
import { createDb, type Db } from "./db.js";
import { migrate } from "./migrate.js";
import { startWorkspaceServer, type WorkspaceServer } from "./server.js";
import { createSession, type SessionCredentials } from "./auth/session.js";
import { applyBatch, countClaims, pullChanges, ReviewAuthorityError } from "./sync-routes.js";
import type { Principal } from "./auth/types.js";
import { buildSyncBatch } from "../sync/outbox.js";
import { fixtureSyncBatch, makeClaim, makeEntity } from "../sync/fixtures.js";
import type { ReviewDecisionRecord, SyncBatch } from "../sync/types.js";

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
  server = await startWorkspaceServer(db);

  await seedWorkspace(workspaceA, "alpha");
  await seedWorkspace(workspaceB, "beta");
  await seedRepository(workspaceA, "repo-a1");
  await seedRepository(workspaceA, "repo-a2");
  await seedRepository(workspaceB, "repo-b1");
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

async function seedRepository(workspaceId: string, repositoryId: string): Promise<void> {
  await db.query(
    `INSERT INTO repositories(workspace_id, repository_id, provider, name)
       VALUES($1, $2, 'github', $2) ON CONFLICT DO NOTHING`,
    [workspaceId, repositoryId],
  );
}

async function seedService(
  workspaceId: string,
  repositoryIds: string[] | null,
): Promise<{ session: SessionCredentials; principal: Principal }> {
  const principalId = randomUUID();
  await db.query(
    `INSERT INTO workspace_principals(workspace_id, principal_id, principal_type, role, repository_ids)
       VALUES($1, $2, 'service', 'developer', $3)`,
    [workspaceId, principalId, repositoryIds === null ? null : JSON.stringify(repositoryIds)],
  );
  const session = await createSession(db, { workspace_id: workspaceId, principal_id: principalId });
  const principal: Principal = {
    principal_id: principalId,
    workspace_id: workspaceId,
    principal_type: "service",
    role: "developer",
    repository_ids: repositoryIds ?? "all",
  };
  return { session, principal };
}

async function pushBatch(
  session: SessionCredentials,
  batch: SyncBatch,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await fetch(`http://127.0.0.1:${server.port}/v1/sync/push`, {
    method: "POST",
    headers: { authorization: `Bearer ${session.token}`, "content-type": "application/json" },
    body: JSON.stringify(batch),
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: response.status, body };
}

async function pull(
  session: SessionCredentials,
  cursor?: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const suffix = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  const response = await fetch(`http://127.0.0.1:${server.port}/v1/sync/pull${suffix}`, {
    headers: { authorization: `Bearer ${session.token}` },
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: response.status, body };
}

test("retrying one outbox batch does not duplicate records", async () => {
  const { principal } = await seedService(workspaceA, ["repo-a1"]);
  const batch = fixtureSyncBatch(workspaceA, "repo-a1");
  const first = await applyBatch(db, principal, batch);
  const second = await applyBatch(db, principal, batch);
  assert.equal(first.status, "applied");
  assert.equal(second.status, "duplicate");
  // Only this batch's two claims exist for the workspace — the replay added nothing.
  const total = await countClaims(db, workspaceA);
  assert.equal(total, batch.claims.length);
});

test("a duplicate push over HTTP is acknowledged but applied once", async () => {
  const { session } = await seedService(workspaceA, ["repo-a2"]);
  const batch = fixtureSyncBatch(workspaceA, "repo-a2");
  const first = await pushBatch(session, batch);
  const second = await pushBatch(session, batch);
  assert.equal(first.status, 200);
  assert.equal(first.body.status, "applied");
  assert.equal(second.status, 200);
  assert.equal(second.body.status, "duplicate");
  const { rows } = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM workspace_claims WHERE workspace_id = $1 AND repository_id = 'repo-a2'`,
    [workspaceA],
  );
  assert.equal(Number.parseInt(rows[0].count, 10), batch.claims.length);
});

test("a batch carrying local_raw evidence is refused and no raw row ever lands", async () => {
  const { session } = await seedService(workspaceA, ["repo-a1"]);
  const clean = fixtureSyncBatch(workspaceA, "repo-a1");
  const tampered: SyncBatch = {
    ...clean,
    batch_id: `${clean.batch_id}-raw`,
    evidence: [{ ...clean.evidence[0], evidence_id: "ev-raw", privacy_class: "local_raw" }],
  };
  const response = await pushBatch(session, tampered);
  assert.equal(response.status, 400);
  assert.equal(response.body.error, "raw_payload_rejected");
  const { rows } = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM workspace_evidence WHERE privacy_class = 'local_raw'`,
  );
  assert.equal(Number.parseInt(rows[0].count, 10), 0);
});

test("a service cannot push a batch stamped with another workspace id", async () => {
  const { session } = await seedService(workspaceA, ["repo-a1"]);
  // A batch that claims to belong to workspace B: the server trusts the principal, not the payload.
  const foreign = fixtureSyncBatch(workspaceB, "repo-a1");
  const response = await pushBatch(session, foreign);
  assert.equal(response.status, 404);
  const { rows } = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM workspace_claims WHERE workspace_id = $1`,
    [workspaceB],
  );
  assert.equal(Number.parseInt(rows[0].count, 10), 0);
});

test("a service cannot push to a repository outside its scope", async () => {
  const { session } = await seedService(workspaceA, ["repo-a1"]);
  const outOfScope = fixtureSyncBatch(workspaceA, "repo-a2");
  const response = await pushBatch(session, outOfScope);
  assert.equal(response.status, 404);
});

test("a cross-tenant pull never returns another workspace's knowledge", async () => {
  const a = await seedService(workspaceA, ["repo-a1"]);
  const b = await seedService(workspaceB, ["repo-b1"]);
  await pushBatch(a.session, fixtureSyncBatch(workspaceA, "repo-a1"));

  const bView = await pull(b.session);
  assert.equal(bView.status, 200);
  const claims = bView.body.claims as Array<{ claim_id: string }>;
  // Workspace B sees NONE of workspace A's claims — isolation is enforced in the query, not the handler.
  assert.equal(claims.length, 0);

  const aView = await pull(a.session);
  const aClaims = aView.body.claims as Array<{ claim_id: string }>;
  assert.ok(aClaims.length >= 2);
});

test("pull cursor does not drop a row written at the same timestamp as the previous boundary", async () => {
  // Regression: the cursor must be a monotonic per-row sequence, NOT a non-unique updated_at timestamp.
  // Two claims written with the IDENTICAL updated_at straddle a pull boundary; the second must still be
  // delivered on the next pull. A timestamp cursor (updated_at > boundary) silently and permanently drops
  // the equal-timestamp row.
  await seedRepository(workspaceA, "repo-seq");
  const { principal } = await seedService(workspaceA, ["repo-seq"]);
  const sameTs = "2026-07-20T00:00:00.000Z";
  const entity = makeEntity("seq-entity", "repo-seq");
  const first = makeClaim("seq-x", { entity_id: entity.entity_id, updated_at: sameTs });
  const second = makeClaim("seq-y", { entity_id: entity.entity_id, updated_at: sameTs });

  await applyBatch(
    db,
    principal,
    buildSyncBatch({
      workspace_id: workspaceA,
      repository_id: "repo-seq",
      entities: [entity],
      claims: [first],
      evidence: [],
      relations: [],
    }),
  );
  const pull1 = await pullChanges(db, principal, null);
  const firstIds = (pull1.claims as Array<{ claim_id: string }>).map((c) => c.claim_id);
  assert.ok(firstIds.includes("seq-x"));
  assert.ok(pull1.cursor);

  // A second claim lands with the SAME updated_at as the boundary already returned.
  await applyBatch(
    db,
    principal,
    buildSyncBatch({
      workspace_id: workspaceA,
      repository_id: "repo-seq",
      entities: [],
      claims: [second],
      evidence: [],
      relations: [],
    }),
  );
  const pull2 = await pullChanges(db, principal, pull1.cursor);
  const secondIds = (pull2.claims as Array<{ claim_id: string }>).map((c) => c.claim_id);
  // The equal-timestamp row MUST be delivered; it must never be silently dropped.
  assert.ok(secondIds.includes("seq-y"), "second same-timestamp claim was dropped by the cursor");
  assert.ok(!secondIds.includes("seq-x"), "the boundary row must not be redelivered");
});

test("a sync push cannot forge an approving review decision over a claim needing an authorized reviewer", async () => {
  // A service (sync.push-only) token attempts to land an accept of a claim that requires an authorized
  // reviewer, attributing it to an actor it does not speak for. Approval authority is not delegable to a
  // sync token: the batch is rejected and NO review-decision row lands. This keeps self_approvals === 0.
  await seedRepository(workspaceA, "repo-review");
  const { principal } = await seedService(workspaceA, ["repo-review"]);
  const entity = makeEntity("rev-entity", "repo-review");
  // impact medium + review_policy "owner" (!= automatic) => requires an authorized reviewer.
  const claim = makeClaim("rev-claim", { entity_id: entity.entity_id });
  const forged: ReviewDecisionRecord = {
    decision_id: "dec-forged",
    repository_id: "repo-review",
    claim_id: "rev-claim",
    action: "accept",
    actor_id: "owner-alice",
    expected_version: null,
    decision_note: "forged approval",
    decided_at: "2026-07-20T00:00:00.000Z",
  };
  const batch = buildSyncBatch({
    workspace_id: workspaceA,
    repository_id: "repo-review",
    entities: [entity],
    claims: [claim],
    evidence: [],
    relations: [],
    review_decisions: [forged],
  });
  await assert.rejects(
    () => applyBatch(db, principal, batch),
    (error: unknown) => error instanceof ReviewAuthorityError,
  );
  // The whole batch rolled back: no forged decision, no self-approval accounting to defeat.
  const decisions = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM workspace_review_decisions WHERE workspace_id = $1 AND repository_id = 'repo-review'`,
    [workspaceA],
  );
  assert.equal(Number.parseInt(decisions.rows[0].count, 10), 0);
});

test("a sync push may still land a review decision that asserts no reviewer authority", async () => {
  // Guard against over-blocking: an accept of an automatic-policy, low-impact claim never needed a human
  // gate, so replicating that decision is legitimate and lands.
  await seedRepository(workspaceA, "repo-review2");
  const { principal } = await seedService(workspaceA, ["repo-review2"]);
  const entity = makeEntity("rev2-entity", "repo-review2");
  const base = makeClaim("rev2-claim", { entity_id: entity.entity_id });
  const claim = { ...base, review_policy: "automatic" as const, impact_class: "low" as const };
  const decision: ReviewDecisionRecord = {
    decision_id: "dec-auto",
    repository_id: "repo-review2",
    claim_id: "rev2-claim",
    action: "accept",
    actor_id: "agent",
    expected_version: null,
    decision_note: "automatic acceptance",
    decided_at: "2026-07-20T00:00:00.000Z",
  };
  const batch = buildSyncBatch({
    workspace_id: workspaceA,
    repository_id: "repo-review2",
    entities: [entity],
    claims: [claim],
    evidence: [],
    relations: [],
    review_decisions: [decision],
  });
  const result = await applyBatch(db, principal, batch);
  assert.equal(result.status, "applied");
  const decisions = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM workspace_review_decisions WHERE workspace_id = $1 AND repository_id = 'repo-review2'`,
    [workspaceA],
  );
  assert.equal(Number.parseInt(decisions.rows[0].count, 10), 1);
});

test("concurrent divergent claim versions preserve both instead of overwriting", async () => {
  const { principal } = await seedService(workspaceA, ["repo-a1"]);
  const entity = makeEntity("entity-conflict", "repo-a1");
  const versionA = makeClaim("shared-claim", { content: "version A", entity_id: entity.entity_id });
  const versionB = makeClaim("shared-claim", { content: "version B", entity_id: entity.entity_id });

  const batchA = buildSyncBatch({
    workspace_id: workspaceA,
    repository_id: "repo-a1",
    entities: [entity],
    claims: [versionA],
    evidence: [],
    relations: [],
  });
  const batchB = buildSyncBatch({
    workspace_id: workspaceA,
    repository_id: "repo-a1",
    entities: [entity],
    claims: [versionB],
    evidence: [],
    relations: [],
  });
  await applyBatch(db, principal, batchA);
  await applyBatch(db, principal, batchB);

  // The stored head is unchanged (still version A); version B is preserved as a conflict for review.
  const head = await db.query<{ record_json: { normalized_content: string } }>(
    `SELECT record_json FROM workspace_claims WHERE workspace_id = $1 AND repository_id = 'repo-a1' AND claim_id = 'shared-claim'`,
    [workspaceA],
  );
  assert.equal(head.rows[0].record_json.normalized_content, "version A");
  const conflicts = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM workspace_claim_conflicts WHERE workspace_id = $1 AND claim_id = 'shared-claim'`,
    [workspaceA],
  );
  assert.equal(Number.parseInt(conflicts.rows[0].count, 10), 1);
});

// ---------------------------------------------------------------------------------------------
// Task 6 hardening — a logical transaction must own ONE connection
// ---------------------------------------------------------------------------------------------
//
// `Db.query` used to be `pool.query`, so BEGIN / INSERT / COMMIT / ROLLBACK from one logical
// transaction were free to land on DIFFERENT pooled backends. Under concurrency that means a rolled
// back batch can leave rows behind (its ROLLBACK ran on somebody else's connection), and a committed
// batch id can outlive the data it claims to have applied — after which the retry is answered
// "duplicate" and the data is gone for good. Both are proven here against real PostgreSQL.

test("a logical transaction stays on one backend connection under pool contention", async () => {
  const contended = createDb(embedded?.url ?? process.env.KAGE_TEST_DATABASE_URL!);
  try {
    const pids = await contended.transaction(async (tx) => {
      const first = await tx.query<{ pid: number }>("SELECT pg_backend_pid() AS pid");
      // Churn the pool while the transaction is open: any handout-per-query seam changes backend here.
      await Promise.all(
        Array.from({ length: 12 }, () => contended.query("SELECT pg_sleep(0.02)")),
      );
      const second = await tx.query<{ pid: number }>("SELECT pg_backend_pid() AS pid");
      return [first.rows[0].pid, second.rows[0].pid];
    });
    assert.equal(pids[0], pids[1], "a transaction must not change backend mid-flight");
  } finally {
    await contended.close();
  }
});

test("a batch that fails mid-apply leaves NOTHING behind, even with many batches in flight", async () => {
  const repositoryId = "repo-atomic";
  await seedRepository(workspaceA, repositoryId);
  const { principal } = await seedService(workspaceA, [repositoryId]);
  const contended = createDb(embedded?.url ?? process.env.KAGE_TEST_DATABASE_URL!);
  try {
    const attempts = 24;
    const results = await Promise.all(
      Array.from({ length: attempts }, async (_, index) => {
        // A batch whose SECOND entity violates a NOT NULL constraint: the first entity has already been
        // written when the failure hits, so only a real transaction can undo it.
        const good = makeEntity(`atomic-good-${index}`, repositoryId);
        const poisoned = { ...makeEntity(`atomic-bad-${index}`, repositoryId), updated_at: null } as unknown as typeof good;
        const batch: SyncBatch = {
          protocol_version: 1,
          batch_id: `atomic-${index}-${randomUUID()}`,
          workspace_id: workspaceA,
          repository_id: repositoryId,
          base_cursor: null,
          entities: [good, poisoned],
          claims: [],
          evidence: [],
          relations: [],
          review_decisions: [],
          measurements: [],
          task_outcomes: [],
          created_at: new Date().toISOString(),
        };
        try {
          await applyBatch(contended, principal, batch);
          return "applied";
        } catch {
          return "rejected";
        }
      }),
    );
    assert.equal(results.filter((r) => r === "applied").length, 0, "no poisoned batch may apply");

    const entities = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM workspace_entities WHERE workspace_id = $1 AND repository_id = $2`,
      [workspaceA, repositoryId],
    );
    assert.equal(Number.parseInt(entities.rows[0].count, 10), 0, "a rolled-back batch left rows behind");

    // And no batch id may be recorded as applied when its data never landed: that combination makes the
    // retry a no-op ("duplicate") and loses the batch permanently.
    const batches = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM sync_batches WHERE workspace_id = $1 AND repository_id = $2`,
      [workspaceA, repositoryId],
    );
    assert.equal(Number.parseInt(batches.rows[0].count, 10), 0, "a failed batch claimed its batch id");
  } finally {
    await contended.close();
  }
});
