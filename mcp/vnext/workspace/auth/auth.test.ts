// Phase E Task 2 — workspace identity, roles, and tenant enforcement, proven against a REAL PostgreSQL.
//
// These are not mocks: the isolation guarantees (a cross-tenant read returns nothing, a repository-scoped
// principal cannot reach another repository) are query-layer behaviour and are only meaningful against a
// real engine. The suite provisions an ephemeral embedded PostgreSQL when KAGE_TEST_DATABASE_URL is absent.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { startTestPostgres, type TestPostgres } from "../test-support/pg.js";
import { createDb, type Db } from "../db.js";
import { migrate } from "../migrate.js";
import { startWorkspaceServer, type WorkspaceServer } from "../server.js";
import { createSession, resolveSession, type SessionCredentials } from "./session.js";
import { can } from "./authorize.js";
import type { WorkspaceRole } from "./types.js";

let embedded: TestPostgres | null = null;
let db: Db;
let server: WorkspaceServer;

// Two separate tenants. Everything below proves a session in one can never observe the other.
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
  // Repositories: workspace A owns repo-a1 and repo-a2; workspace B owns repo-b1.
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

async function seedPrincipal(
  workspaceId: string,
  role: WorkspaceRole,
  repositoryIds: string[] | null,
  principalType: "user" | "service" = "user",
): Promise<SessionCredentials> {
  const principalId = randomUUID();
  await db.query(
    `INSERT INTO workspace_principals(workspace_id, principal_id, principal_type, role, repository_ids)
       VALUES($1, $2, $3, $4, $5)`,
    [workspaceId, principalId, principalType, role, repositoryIds === null ? null : JSON.stringify(repositoryIds)],
  );
  return createSession(db, { workspace_id: workspaceId, principal_id: principalId });
}

async function authedRequest(
  session: SessionCredentials,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const headers: Record<string, string> = {
    cookie: `kage_session=${session.token}`,
    "x-kage-csrf": session.csrf,
  };
  if (body !== undefined) headers["content-type"] = "application/json";
  const response = await fetch(`http://127.0.0.1:${server.port}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const parsed = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: response.status, body: parsed };
}

test("viewer cannot mutate review state", async () => {
  const viewer = await seedPrincipal(workspaceA, "viewer", null);
  const response = await authedRequest(viewer, "POST", "/v1/review-items/item-1/accept", { note: "approve" });
  assert.equal(response.status, 403);
});

test("knowledge owner may mutate review state", async () => {
  const owner = await seedPrincipal(workspaceA, "knowledge_owner", null);
  const response = await authedRequest(owner, "POST", "/v1/review-items/item-1/accept", { note: "approve" });
  assert.equal(response.status, 202);
});

test("workspace session cannot read another workspace by guessed id", async () => {
  const sessionA = await seedPrincipal(workspaceA, "owner", null);
  const response = await authedRequest(sessionA, "GET", `/v1/workspaces/${workspaceB}/repositories`);
  assert.equal(response.status, 404);
});

test("a workspace session lists only its own workspace repositories", async () => {
  const sessionA = await seedPrincipal(workspaceA, "owner", null);
  const response = await authedRequest(sessionA, "GET", `/v1/workspaces/${workspaceA}/repositories`);
  assert.equal(response.status, 200);
  const repos = response.body.repositories as Array<{ repository_id: string }>;
  const ids = repos.map((r) => r.repository_id).sort();
  assert.deepEqual(ids, ["repo-a1", "repo-a2"]);
});

test("a repository-scoped principal sees only its permitted repositories", async () => {
  const scoped = await seedPrincipal(workspaceA, "developer", ["repo-a1"]);
  const response = await authedRequest(scoped, "GET", `/v1/workspaces/${workspaceA}/repositories`);
  assert.equal(response.status, 200);
  const repos = response.body.repositories as Array<{ repository_id: string }>;
  assert.deepEqual(repos.map((r) => r.repository_id), ["repo-a1"]);
});

test("a repository-scoped principal cannot read a repository outside its scope", async () => {
  const scoped = await seedPrincipal(workspaceA, "developer", ["repo-a1"]);
  const response = await authedRequest(scoped, "GET", `/v1/workspaces/${workspaceA}/repositories/repo-a2`);
  assert.equal(response.status, 404);
});

test("an unauthenticated request is rejected", async () => {
  const response = await fetch(`http://127.0.0.1:${server.port}/v1/workspaces/${workspaceA}/repositories`);
  assert.equal(response.status, 401);
});

test("a browser mutation without a CSRF token is refused", async () => {
  const owner = await seedPrincipal(workspaceA, "knowledge_owner", null);
  const response = await fetch(`http://127.0.0.1:${server.port}/v1/review-items/item-1/accept`, {
    method: "POST",
    headers: { cookie: `kage_session=${owner.token}`, "content-type": "application/json" },
    body: JSON.stringify({ note: "approve" }),
  });
  assert.equal(response.status, 403);
  assert.equal(((await response.json()) as { error?: string }).error, "csrf_required");
});

test("sessions persist only a token hash, never the raw token", async () => {
  const owner = await seedPrincipal(workspaceA, "owner", null);
  const { rows } = await db.query<{ token_hash: string }>(
    `SELECT token_hash FROM workspace_sessions WHERE token_hash = $1`,
    // The raw token must NOT be findable; only its hash is stored.
    [owner.token],
  );
  assert.equal(rows.length, 0);
  const resolved = await resolveSession(db, owner.token);
  assert.ok(resolved);
  assert.equal(resolved?.principal.workspace_id, workspaceA);
});

test("a service principal may sync but not review", () => {
  const service = {
    principal_id: "svc-1",
    workspace_id: workspaceA,
    principal_type: "service" as const,
    role: "developer" as WorkspaceRole,
    repository_ids: ["repo-a1"],
  };
  assert.equal(can(service, "sync.push", "repo-a1"), true);
  assert.equal(can(service, "sync.push", "repo-a2"), false);
  assert.equal(can(service, "knowledge.review"), false);
});
