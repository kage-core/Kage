// Phase E Task 1 — the workspace service boundary, verified against a REAL PostgreSQL.
//
// The database is a genuine Postgres instance (from KAGE_TEST_DATABASE_URL when supplied, otherwise an
// ephemeral embedded-postgres provisioned here), never a mock: the tenant NOT-NULL constraints are
// PostgreSQL semantics and can only be proven against a real engine.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { startTestPostgres, type TestPostgres } from "./test-support/pg.js";
import { createDb, type Db } from "./db.js";
import { migrate, LATEST_MIGRATION } from "./migrate.js";
import { startWorkspaceServer, type WorkspaceServer } from "./server.js";

let embedded: TestPostgres | null = null;
let db: Db;
let server: WorkspaceServer;

before(async () => {
  let url = process.env.KAGE_TEST_DATABASE_URL;
  if (!url) {
    embedded = await startTestPostgres();
    url = embedded.url;
  }
  db = createDb(url);
  await migrate(db);
  server = await startWorkspaceServer(db);
});

after(async () => {
  await server?.close();
  await db?.close();
  await embedded?.stop();
});

async function workspaceRequest(
  method: string,
  path: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await fetch(`http://127.0.0.1:${server.port}${path}`, { method });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: response.status, body };
}

test("workspace health checks database migration version", async () => {
  const response = await workspaceRequest("GET", "/v1/health");
  assert.equal(response.status, 200);
  assert.equal(response.body.database_migration, LATEST_MIGRATION);
});

test("knowledge tables require workspace and repository identifiers", async () => {
  // Inserting an entity without its tenant identifiers must be refused by the schema, not silently
  // accepted — this is the isolation foundation the rest of Phase E depends on.
  await assert.rejects(
    () => db.query("INSERT INTO workspace_entities(entity_id) VALUES('e1')"),
    /workspace_id|not-null|null value|violates not-null/i,
  );
});
