// Phase E Task 9 — packaging the workspace for managed and self-hosted operation.
//
// WHAT THIS SUITE PROVES, AND WHAT IT HONESTLY CANNOT.
//
// It proves, against a REAL ephemeral PostgreSQL 18 and the REAL shipped shell scripts:
//   - the service migrates to the shipped schema version BEFORE it accepts a single connection, and
//     refuses to serve a database that a NEWER build has already migrated;
//   - the health probe the container runs exits non-zero for a dead port AND for a live server whose
//     schema is behind the build (a half-migrated pod must fail its readiness check, not serve);
//   - a backup taken through `deploy/workspace/backup.sh` restores knowledge, the audit log, and
//     entitlements into an EMPTY database through `deploy/workspace/restore.sh`, with checksums
//     verified, sequences advanced, and the object-storage manifest carried;
//   - a restore refuses a tampered file, a wrong key, a schema version it cannot honour without an
//     explicit migration plan, and a non-empty target;
//   - a backup contains no session token and no raw payload field;
//   - a workspace outage leaves the local daemon working, and the batch queued during the outage is
//     applied EXACTLY ONCE when the workspace comes back (a rolling restart must not duplicate).
//
// It does NOT prove that `docker build` succeeds or that the image runs: there is no Docker daemon in
// this environment. The Dockerfile and compose file are therefore checked STRUCTURALLY here (pinned
// base digests, multi-stage, non-root, exec-form entrypoint, read-only rootfs, dropped capabilities,
// no baked secrets) and the actual build/run is recorded as an honest gap (`docker_build_not_run_here`).
// A structural check is not a build; this file never claims otherwise.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createServer } from "node:http";
import { createServer as createSocketServer } from "node:net";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { networkInterfaces, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..");
const mcpDir = join(repoRoot, "mcp");
const dist = join(mcpDir, "dist", "vnext");

// The compiled modules are CommonJS (module: Node16). Importing the namespace and destructuring off it
// avoids depending on the CJS named-export lexer for anything.
const { startTestPostgres } = await import(`${dist}/workspace/test-support/pg.js`).then((m) => m.default ?? m);
const { createDb } = await import(`${dist}/workspace/db.js`).then((m) => m.default ?? m);
const { migrate, currentVersion, LATEST_MIGRATION } = await import(`${dist}/workspace/migrate.js`).then(
  (m) => m.default ?? m,
);
const { bootWorkspaceService, readBootConfigFromEnv, BootError, main, readServerOptionsFromEnv } =
  await import(`${dist}/workspace/boot.js`).then((m) => m.default ?? m);
const { computeSignature } = await import(`${dist}/workspace/github/signature.js`).then(
  (m) => m.default ?? m,
);
const { createBackup, readBackup, restoreBackup, verifyBackup, BackupError, BACKUP_FORMAT } =
  await import(`${dist}/workspace/backup.js`).then((m) => m.default ?? m);
const { createSession } = await import(`${dist}/workspace/auth/session.js`).then((m) => m.default ?? m);
const { fixtureSyncBatch } = await import(`${dist}/sync/fixtures.js`).then((m) => m.default ?? m);
const { Outbox } = await import(`${dist}/sync/outbox.js`).then((m) => m.default ?? m);
const { drainOutbox, httpTransport } = await import(`${dist}/sync/client.js`).then((m) => m.default ?? m);

const dockerfile = readFileSync(join(here, "Dockerfile"), "utf8");
const compose = readFileSync(join(here, "docker-compose.yml"), "utf8");
const entrypoint = readFileSync(join(here, "entrypoint.sh"), "utf8");
const backupScript = readFileSync(join(here, "backup.sh"), "utf8");
const restoreScript = readFileSync(join(here, "restore.sh"), "utf8");
const envExample = readFileSync(join(here, "env.example"), "utf8");

let embedded = null;
/** The "production" database the backup is taken from. */
let db;
/** A second, empty database on the same instance: the restore target. */
let restoreDb;
let baseUrl;
let workDir;

const BACKUP_KEY = Buffer.alloc(32, 7).toString("base64");
const workspaceId = randomUUID();

before(async () => {
  workDir = mkdtempSync(join(tmpdir(), "kage-deploy-test-"));
  let url = process.env.KAGE_TEST_DATABASE_URL;
  if (!url) {
    embedded = await startTestPostgres();
    url = embedded.url;
  }
  baseUrl = url;
  db = createDb(url);
  await migrate(db);
  await seedProductionData();
  // A second database on the SAME instance, created empty. The restore target must be a real, separate
  // database: restoring over the source would prove nothing about a disaster-recovery restore.
  await db.query(`CREATE DATABASE kage_restore_target`);
  restoreDb = createDb(url.replace(/\/[^/]+$/, "/kage_restore_target"));
});

after(async () => {
  await restoreDb?.close();
  await db?.close();
  await embedded?.stop();
  if (workDir) rmSync(workDir, { recursive: true, force: true });
});

/** A tenant with knowledge, an audit trail, a subscription, an object key, and a sync ledger entry. */
async function seedProductionData() {
  await db.query(`INSERT INTO workspaces(workspace_id, name, slug, plan) VALUES($1, $2, $3, 'team')`, [
    workspaceId,
    "backup-tenant",
    `backup-tenant-${workspaceId.slice(0, 8)}`,
  ]);
  await db.query(
    `INSERT INTO repositories(workspace_id, repository_id, provider, external_id, name, default_branch)
       VALUES($1, 'repo-main', 'github', '99', 'main-repo', 'main')`,
    [workspaceId],
  );
  await db.query(
    `INSERT INTO workspace_entities(workspace_id, repository_id, entity_id, model_version, record_json, updated_at)
       VALUES($1, 'repo-main', 'ent-1', 1, $2, now())`,
    [workspaceId, JSON.stringify({ entity_id: "ent-1", kind: "component" })],
  );
  for (const claimId of ["claim-1", "claim-2", "claim-3"]) {
    await db.query(
      `INSERT INTO workspace_claims(workspace_id, repository_id, claim_id, entity_id, trust_state,
                                    impact_class, record_json, updated_at)
         VALUES($1, 'repo-main', $2, 'ent-1', 'verified', 'high', $3, now())`,
      [workspaceId, claimId, JSON.stringify({ claim_id: claimId, statement: "approved claim" })],
    );
  }
  await db.query(
    `INSERT INTO workspace_evidence(workspace_id, repository_id, evidence_id, privacy_class,
                                    metadata_json, object_key, updated_at)
       VALUES($1, 'repo-main', 'ev-1', 'team_shared', $2, 'blobs/ev-1.json', now())`,
    [workspaceId, JSON.stringify({ kind: "test_run" })],
  );
  for (const action of ["claim.accept", "claim.reject"]) {
    await db.query(
      `INSERT INTO audit_events(audit_id, workspace_id, actor_type, actor_id, action, target_type,
                                target_id, metadata_json)
         VALUES($1, $2, 'user', 'reviewer-1', $3, 'claim', 'claim-1', '{}'::jsonb)`,
      [randomUUID(), workspaceId, action],
    );
  }
  await db.query(
    `INSERT INTO workspace_subscriptions(workspace_id, plan_id, status, current_period_end, seats)
       VALUES($1, 'team', 'active', now() + interval '30 days', 12)`,
    [workspaceId],
  );
  // A live session: the backup must NOT carry it (a restore is a new trust boundary).
  const principalId = randomUUID();
  await db.query(
    `INSERT INTO workspace_principals(workspace_id, principal_id, principal_type, role, repository_ids)
       VALUES($1, $2, 'user', 'owner', NULL)`,
    [workspaceId, principalId],
  );
  await createSession(db, { workspace_id: workspaceId, principal_id: principalId });
}

async function count(target, table) {
  const { rows } = await target.query(`SELECT COUNT(*)::text AS count FROM ${table}`);
  return Number.parseInt(rows[0].count, 10);
}

/** Reserve a free localhost port. */
async function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createSocketServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

async function portRefuses(port) {
  try {
    await fetch(`http://127.0.0.1:${port}/v1/health`);
    return false;
  } catch {
    return true;
  }
}

/** Run one of the shipped shell scripts with the repo's built dist as the app dir. */
function runScript(script, args, extraEnv = {}) {
  return execFileSync("/bin/sh", [join(here, script), ...args], {
    env: {
      ...process.env,
      KAGE_APP_DIR: mcpDir,
      KAGE_WORKSPACE_DATABASE_URL: baseUrl,
      KAGE_BACKUP_KEY: BACKUP_KEY,
      ...extraEnv,
    },
    encoding: "utf8",
  });
}

// ---------------------------------------------------------------------------------------------
// Boot ordering: migrations complete before the port is open.
// ---------------------------------------------------------------------------------------------

test("workspace image starts only after migrations and health passes", async () => {
  const port = await freePort();
  const seen = [];
  const booted = await bootWorkspaceService({
    connectionString: baseUrl,
    port,
    onEvent: (event) => seen.push(event.phase),
  });
  try {
    assert.equal(booted.schema_version, LATEST_MIGRATION);
    const response = await fetch(`http://127.0.0.1:${booted.port}/v1/health`);
    const health = await response.json();
    assert.equal(response.status, 200);
    assert.equal(health.status, "ok");
    assert.equal(health.database_migration, LATEST_MIGRATION);
    // The phases an operator sees in the container log, in order. This is a LOG check, not the ordering
    // proof — a log line can be emitted at the wrong moment. The real proof that nothing listens before
    // the migration finished is the next test, which asks the port itself.
    assert.deepEqual(seen, ["migrating", "migrated", "listening"]);
  } finally {
    await booted.close();
  }
});

test("the port stays closed for the whole time migrations are running", async () => {
  const port = await freePort();
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  let observedDuringMigration = null;
  // A db seam whose FIRST migration statement blocks until the test has checked the port.
  const slowDb = () => {
    const real = createDb(baseUrl);
    let gated = false;
    return {
      ...real,
      async query(text, params) {
        if (!gated) {
          gated = true;
          observedDuringMigration = await portRefuses(port);
          release();
        }
        return real.query(text, params);
      },
      transaction: (fn) => real.transaction(fn),
      close: () => real.close(),
    };
  };
  const booting = bootWorkspaceService({ connectionString: baseUrl, port, createDbFn: slowDb });
  await gate;
  const booted = await booting;
  try {
    assert.equal(observedDuringMigration, true, "the port accepted a connection before migrating");
  } finally {
    await booted.close();
  }
});

test("boot refuses a database migrated by a newer build instead of serving it", async () => {
  const port = await freePort();
  await db.query(`INSERT INTO schema_migrations(version) VALUES($1)`, [LATEST_MIGRATION + 1]);
  try {
    await assert.rejects(
      () => bootWorkspaceService({ connectionString: baseUrl, port }),
      (error) => {
        assert.ok(error instanceof BootError);
        assert.equal(error.code, "schema_newer_than_build");
        return true;
      },
    );
    assert.equal(await portRefuses(port), true);
  } finally {
    await db.query(`DELETE FROM schema_migrations WHERE version = $1`, [LATEST_MIGRATION + 1]);
  }
});

test("boot refuses to start without an explicit database url rather than defaulting to one", () => {
  assert.throws(
    () => readBootConfigFromEnv({}),
    (error) => error instanceof BootError && error.code === "missing_database_url",
  );
  const config = readBootConfigFromEnv({
    KAGE_WORKSPACE_DATABASE_URL: "postgres://u:p@db:5432/kage",
    KAGE_WORKSPACE_PORT: "8787",
  });
  assert.equal(config.port, 8787);
});

test("close() stops listening and is safe to call twice (graceful SIGTERM path)", async () => {
  const port = await freePort();
  const booted = await bootWorkspaceService({ connectionString: baseUrl, port });
  await booted.close();
  await booted.close();
  assert.equal(await portRefuses(port), true);
});

// ---------------------------------------------------------------------------------------------
// The container health probe.
// ---------------------------------------------------------------------------------------------

function runHealthcheck(env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(here, "healthcheck.mjs")], {
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    child.stdout.on("data", (chunk) => (out += chunk));
    child.stderr.on("data", (chunk) => (out += chunk));
    child.on("close", (code) => resolve({ code, out }));
  });
}

test("the health probe passes a fully migrated server and fails a dead port", async () => {
  const port = await freePort();
  const booted = await bootWorkspaceService({ connectionString: baseUrl, port });
  try {
    const ok = await runHealthcheck({ KAGE_WORKSPACE_PORT: String(booted.port) });
    assert.equal(ok.code, 0, ok.out);
  } finally {
    await booted.close();
  }
  const dead = await runHealthcheck({ KAGE_WORKSPACE_PORT: String(port) });
  assert.notEqual(dead.code, 0);
});

test("the health probe fails a server whose schema is behind this build", async () => {
  // A pod that answers 200 while still on an older schema is exactly the pod that must NOT take traffic.
  const stale = createServer((req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok", database_migration: 1 }));
  });
  const port = await freePort();
  await new Promise((resolve) => stale.listen(port, "127.0.0.1", resolve));
  try {
    const result = await runHealthcheck({
      KAGE_WORKSPACE_PORT: String(port),
      KAGE_WORKSPACE_EXPECTED_MIGRATION: String(LATEST_MIGRATION),
    });
    assert.notEqual(result.code, 0);
    assert.match(result.out, /migration/i);
  } finally {
    await new Promise((resolve) => stale.close(resolve));
  }
});

// ---------------------------------------------------------------------------------------------
// Backup and restore, through the shipped scripts.
// ---------------------------------------------------------------------------------------------

test("backup restores knowledge audit and entitlements into an empty database", async () => {
  const before = {
    claims: await count(db, "workspace_claims"),
    auditEvents: await count(db, "audit_events"),
    entitlements: await count(db, "workspace_subscriptions"),
  };
  assert.ok(before.claims > 0 && before.auditEvents > 0 && before.entitlements > 0);

  const backupPath = join(workDir, "roundtrip.kbk");
  runScript("backup.sh", [backupPath]);
  runScript("restore.sh", [backupPath], {
    KAGE_WORKSPACE_DATABASE_URL: baseUrl.replace(/\/[^/]+$/, "/kage_restore_target"),
  });

  const restored = {
    claims: await count(restoreDb, "workspace_claims"),
    auditEvents: await count(restoreDb, "audit_events"),
    entitlements: await count(restoreDb, "workspace_subscriptions"),
  };
  assert.deepEqual(restored, before);
  // The schema came with it: the restore target was empty and is now at the shipped version.
  assert.equal(await currentVersion(restoreDb), LATEST_MIGRATION);
  // Content, not just counts: a restore that loses the claim body restores nothing worth having.
  const { rows } = await restoreDb.query(
    `SELECT claim_id, trust_state FROM workspace_claims WHERE workspace_id = $1 ORDER BY claim_id`,
    [workspaceId],
  );
  assert.deepEqual(
    rows.map((row) => row.claim_id),
    ["claim-1", "claim-2", "claim-3"],
  );
  assert.equal(rows[0].trust_state, "verified");
});

test("a restored database keeps writing after the rows it restored (sequences advanced)", async () => {
  // audit_seq is a BIGSERIAL. Restored rows carry their original values, so the sequence must be moved
  // past them or the next audit insert collides — a restored instance that cannot write is not restored.
  const { rows: maxRows } = await restoreDb.query(
    `SELECT COALESCE(MAX(audit_seq), 0)::text AS max FROM audit_events`,
  );
  const restoredMax = Number.parseInt(maxRows[0].max, 10);
  await restoreDb.query(
    `INSERT INTO audit_events(audit_id, workspace_id, actor_type, actor_id, action, target_type,
                              target_id, metadata_json)
       VALUES($1, $2, 'user', 'reviewer-2', 'claim.accept', 'claim', 'claim-2', '{}'::jsonb)`,
    [randomUUID(), workspaceId],
  );
  const { rows: nextRows } = await restoreDb.query(
    `SELECT MAX(audit_seq)::text AS max FROM audit_events`,
  );
  assert.ok(Number.parseInt(nextRows[0].max, 10) > restoredMax);

  // workspace_sync_seq is the PULL CURSOR. If it restarts at 1 after a restore, two different claims
  // get the same cursor and every connected daemon silently skips changes. It must resume past the
  // highest restored value.
  const { rows: cursorRows } = await restoreDb.query(
    `SELECT COALESCE(MAX(sync_seq), 0)::text AS max FROM workspace_claims`,
  );
  const restoredCursor = Number.parseInt(cursorRows[0].max, 10);
  assert.ok(restoredCursor > 0);
  await restoreDb.query(
    `INSERT INTO workspace_claims(workspace_id, repository_id, claim_id, entity_id, trust_state,
                                  impact_class, record_json, updated_at)
       VALUES($1, 'repo-main', 'claim-after-restore', 'ent-1', 'verified', 'low', '{}'::jsonb, now())`,
    [workspaceId],
  );
  const { rows: afterRows } = await restoreDb.query(
    `SELECT sync_seq::text AS seq FROM workspace_claims WHERE claim_id = 'claim-after-restore'`,
  );
  assert.ok(Number.parseInt(afterRows[0].seq, 10) > restoredCursor);
});

test("the backup records the object-storage manifest it does not contain", async () => {
  const result = await createBackup(db, { directory: workDir, encryption_key: BACKUP_KEY });
  const opened = await readBackup(result.backup_path, BACKUP_KEY);
  assert.equal(opened.manifest.format, BACKUP_FORMAT);
  assert.equal(opened.manifest.schema_version, LATEST_MIGRATION);
  assert.ok(opened.manifest.app_version.length > 0);
  const keys = opened.manifest.object_manifest.map((entry) => entry.object_key);
  assert.deepEqual(keys, ["blobs/ev-1.json"]);
  // Honesty: blobs live in object storage and are NOT in this file. The manifest says which ones the
  // restored database will expect, so an operator can verify the bucket instead of assuming.
  assert.equal(opened.manifest.object_bytes_included, 0);
});

test("a backup carries no session token and no raw payload field", async () => {
  const result = await createBackup(db, { directory: workDir, encryption_key: BACKUP_KEY });
  const opened = await readBackup(result.backup_path, BACKUP_KEY);
  assert.equal(opened.data.workspace_sessions, undefined);
  assert.ok(opened.manifest.excluded_tables.includes("workspace_sessions"));
  const serialized = JSON.stringify(opened.data);
  for (const forbidden of ['"prompt"', '"tool_payload"', '"raw_payload"', '"response_text"']) {
    assert.equal(serialized.includes(forbidden), false, `backup leaked ${forbidden}`);
  }
});

test("restore refuses a tampered backup rather than loading part of it", async () => {
  const result = await createBackup(db, { directory: workDir, encryption_key: BACKUP_KEY });
  const bytes = readFileSync(result.backup_path);
  bytes[bytes.length - 1] ^= 0xff;
  const tamperedPath = join(workDir, "tampered.kbk");
  writeFileSync(tamperedPath, bytes);
  await assert.rejects(
    () => readBackup(tamperedPath, BACKUP_KEY),
    (error) => error instanceof BackupError && error.code === "unreadable",
  );
});

test("restore refuses a backup from an incompatible schema without an explicit migration plan", async () => {
  const result = await createBackup(db, { directory: workDir, encryption_key: BACKUP_KEY });
  const older = join(workDir, "older.kbk");
  await rewriteManifest(result.backup_path, older, (manifest) => ({
    ...manifest,
    schema_version: LATEST_MIGRATION - 1,
  }));
  await assert.rejects(
    () => restoreBackup(restoreDb, older, BACKUP_KEY, { allow_nonempty: true }),
    (error) => error instanceof BackupError && error.code === "migration_plan_required",
  );
  const newer = join(workDir, "newer.kbk");
  await rewriteManifest(result.backup_path, newer, (manifest) => ({
    ...manifest,
    schema_version: LATEST_MIGRATION + 1,
  }));
  // A plan cannot help here: this build does not have the migrations that produced the file.
  await assert.rejects(
    () =>
      restoreBackup(restoreDb, newer, BACKUP_KEY, {
        allow_nonempty: true,
        migration_plan: { from: LATEST_MIGRATION + 1, to: LATEST_MIGRATION },
      }),
    (error) => error instanceof BackupError && error.code === "schema_newer_than_build",
  );
});

test("restore refuses a non-empty target unless the operator says so", async () => {
  const result = await createBackup(db, { directory: workDir, encryption_key: BACKUP_KEY });
  await assert.rejects(
    () => restoreBackup(restoreDb, result.backup_path, BACKUP_KEY),
    (error) => error instanceof BackupError && error.code === "target_not_empty",
  );
});

test("restore refuses a file whose hash does not match the catalogued one", async () => {
  // The operator's own record of what they backed up. A restore from the wrong file — a stale copy, a
  // half-uploaded object — must stop here rather than quietly returning yesterday's knowledge.
  const result = await createBackup(db, { directory: workDir, encryption_key: BACKUP_KEY });
  await assert.rejects(
    () =>
      restoreBackup(restoreDb, result.backup_path, BACKUP_KEY, {
        allow_nonempty: true,
        expect_sha256: "0".repeat(64),
      }),
    (error) => error instanceof BackupError && error.code === "sha256_mismatch",
  );
  // The real hash is accepted by the same check (proving the guard is not simply always-refusing).
  const verified = await verifyBackup(result.backup_path, BACKUP_KEY, { expect_sha256: result.sha256 });
  assert.equal(verified.sha256_verified, true);
  assert.equal(verified.manifest.schema_version, LATEST_MIGRATION);
});

test("restore refuses the wrong key", async () => {
  const result = await createBackup(db, { directory: workDir, encryption_key: BACKUP_KEY });
  await assert.rejects(
    () => readBackup(result.backup_path, Buffer.alloc(32, 9)),
    (error) => error instanceof BackupError && error.code === "unreadable",
  );
});

/** Re-encrypt a backup with an altered manifest, keeping the file format intact. */
async function rewriteManifest(sourcePath, targetPath, mutate) {
  const opened = await readBackup(sourcePath, BACKUP_KEY);
  const { writeBackupFile } = await import(`${dist}/workspace/backup.js`).then((m) => m.default ?? m);
  writeBackupFile(targetPath, mutate(opened.manifest), opened.data, BACKUP_KEY);
}

// ---------------------------------------------------------------------------------------------
// Operating through a workspace outage.
// ---------------------------------------------------------------------------------------------

test("a workspace outage leaves the local daemon working and duplicates nothing on recovery", async () => {
  const outageWorkspace = randomUUID();
  await db.query(`INSERT INTO workspaces(workspace_id, name, slug, plan) VALUES($1, $2, $3, 'team')`, [
    outageWorkspace,
    "outage-tenant",
    `outage-tenant-${outageWorkspace.slice(0, 8)}`,
  ]);
  await db.query(
    `INSERT INTO repositories(workspace_id, repository_id, provider, name)
       VALUES($1, 'repo-a1', 'github', 'repo-a1')`,
    [outageWorkspace],
  );
  await db.query(
    `INSERT INTO workspace_subscriptions(workspace_id, plan_id, status, current_period_end)
       VALUES($1, 'team', 'active', now() + interval '30 days')`,
    [outageWorkspace],
  );
  const principalId = randomUUID();
  await db.query(
    `INSERT INTO workspace_principals(workspace_id, principal_id, principal_type, role, repository_ids)
       VALUES($1, $2, 'service', 'developer', NULL)`,
    [outageWorkspace, principalId],
  );
  const session = await createSession(db, {
    workspace_id: outageWorkspace,
    principal_id: principalId,
  });

  const port = await freePort();
  const outbox = new Outbox();
  outbox.enqueue(fixtureSyncBatch(outageWorkspace, "repo-a1"));
  const transport = httpTransport(`http://127.0.0.1:${port}`, session.token);

  // The workspace is DOWN. The drain must report offline and keep the batch — never throw.
  const duringOutage = await drainOutbox(outbox, transport);
  assert.equal(duringOutage.offline, true);
  assert.equal(duringOutage.pushed, 0);
  assert.equal(duringOutage.remaining, 1);

  const booted = await bootWorkspaceService({ connectionString: baseUrl, port });
  try {
    const recovered = await drainOutbox(outbox, transport);
    assert.equal(recovered.offline, false);
    assert.equal(recovered.pushed, 1);
    // A second drain after a re-enqueue (an at-least-once delivery) applies nothing new.
    outbox.enqueue(fixtureSyncBatch(outageWorkspace, "repo-a1"));
    await drainOutbox(outbox, transport);
    const { rows } = await db.query(
      `SELECT COUNT(*)::text AS count FROM sync_batches WHERE workspace_id = $1`,
      [outageWorkspace],
    );
    assert.equal(Number.parseInt(rows[0].count, 10), 1);
  } finally {
    await booted.close();
  }
});

// ---------------------------------------------------------------------------------------------
// Packaging contract. Structural only — see the header: no Docker daemon here.
// ---------------------------------------------------------------------------------------------

test("the image is multi-stage, digest-pinned, and runs as a non-root user", () => {
  const froms = dockerfile.match(/^FROM .+$/gm) ?? [];
  assert.ok(froms.length >= 2, "expected a multi-stage build");
  const args = new Map(
    [...dockerfile.matchAll(/^ARG (\w+)=(.+)$/gm)].map((match) => [match[1], match[2].trim()]),
  );
  const stages = new Set([...dockerfile.matchAll(/^FROM \S+ AS (\S+)$/gm)].map((match) => match[1]));
  for (const from of froms) {
    const reference = from
      .replace(/^FROM\s+/, "")
      .split(/\s+/)[0]
      .replace(/\$\{(\w+)\}/g, (_, name) => args.get(name) ?? "");
    // A stage built FROM a previous stage is not an image reference.
    if (stages.has(reference)) continue;
    assert.match(reference, /@sha256:[0-9a-f]{64}$/, `unpinned base image: ${from}`);
  }
  const user = [...dockerfile.matchAll(/^USER (.+)$/gm)].pop();
  assert.ok(user, "no USER instruction: the runtime would be root");
  assert.notEqual(user[1].trim(), "root");
  assert.notEqual(user[1].trim(), "0");
  assert.match(dockerfile, /ENV NODE_ENV=production/);
});

test("the container command is exec form and execs node, not a forking npm wrapper", () => {
  const entry = dockerfile.match(/^ENTRYPOINT (.+)$/m);
  assert.ok(entry, "no ENTRYPOINT");
  assert.match(entry[1], /^\[".+"\]$/, "ENTRYPOINT must be exec form so SIGTERM reaches the process");
  // `npm start` forks node under a shell that does not forward SIGTERM: a graceful shutdown becomes a
  // 10-second SIGKILL on every deploy. The entrypoint script execs node, so node ends up as PID 1.
  assert.equal(/CMD .*npm/.test(dockerfile), false);
  assert.equal(/ENTRYPOINT .*npm/.test(dockerfile), false);
  assert.match(entrypoint, /^exec node /m);
  assert.match(dockerfile, /HEALTHCHECK[\s\S]*healthcheck\.mjs/);
});

test("the image ships no source maps and no baked secrets", () => {
  // Source maps embed the TypeScript source, and a stack trace from a customer's instance should not
  // hand back the whole server. They are stripped in the runtime stage.
  assert.match(dockerfile, /\*\.map/);
  for (const line of dockerfile.split("\n")) {
    if (!/^(ENV|ARG)\s/.test(line)) continue;
    const assignment = line.replace(/^(ENV|ARG)\s+/, "");
    if (!/(SECRET|PASSWORD|TOKEN|_KEY)=/i.test(assignment)) continue;
    const value = assignment.split("=").slice(1).join("=").trim();
    assert.equal(value, "", `secret baked into the image: ${line}`);
  }
});

test("compose starts the workspace only after Postgres is healthy and locks the container down", () => {
  assert.match(compose, /condition:\s*service_healthy/);
  assert.match(compose, /healthcheck:/);
  assert.match(compose, /read_only:\s*true/);
  assert.match(compose, /tmpfs:/);
  assert.match(compose, /no-new-privileges:true/);
  assert.match(compose, /cap_drop:\s*\n\s*-\s*ALL/);
  assert.match(compose, /@sha256:[0-9a-f]{64}/);
  // Postgres is reachable only from the compose network, never published to the host by default.
  assert.equal(/^\s+-\s*"?\d+:5432/m.test(compose), false, "Postgres must not be published to the host");
  // Every secret comes from the environment; none is written into the compose file.
  assert.equal(/POSTGRES_PASSWORD:\s*\S*[a-z0-9]\S*\s*$/m.test(compose), false);
});

test("the shipped shell scripts are valid, fail fast, and exec the node process", () => {
  for (const [name, body] of [
    ["entrypoint.sh", entrypoint],
    ["backup.sh", backupScript],
    ["restore.sh", restoreScript],
  ]) {
    execFileSync("/bin/sh", ["-n", join(here, name)]);
    assert.match(body, /set -eu/, `${name} must fail fast`);
    assert.match(body, /^exec /m, `${name} must exec so signals reach the process`);
  }
  // A backup script that silently writes an unencrypted dump when the key is missing is worse than one
  // that refuses: both scripts require the key explicitly.
  assert.match(backupScript, /KAGE_BACKUP_KEY:\?/);
  assert.match(restoreScript, /KAGE_BACKUP_KEY:\?/);
  assert.match(entrypoint, /KAGE_WORKSPACE_DATABASE_URL:\?/);
});

test("backup.sh refuses to run without an encryption key", () => {
  assert.throws(() =>
    execFileSync("/bin/sh", [join(here, "backup.sh"), join(workDir, "never.kbk")], {
      env: { PATH: process.env.PATH, KAGE_APP_DIR: mcpDir, KAGE_WORKSPACE_DATABASE_URL: baseUrl },
      stdio: "pipe",
    }),
  );
});

test("the expected-migration default tracks the schema this build ships", () => {
  // The health probe fails a database behind this number, so a stale default here would either fail
  // every healthy pod or (worse) pass a pod running against an un-migrated database.
  const composeDefault = compose.match(
    /KAGE_WORKSPACE_EXPECTED_MIGRATION:\s*\$\{KAGE_WORKSPACE_EXPECTED_MIGRATION:-(\d+)\}/,
  );
  assert.ok(composeDefault, "compose does not set KAGE_WORKSPACE_EXPECTED_MIGRATION");
  assert.equal(Number(composeDefault[1]), LATEST_MIGRATION);
  const envDefault = envExample.match(/^KAGE_WORKSPACE_EXPECTED_MIGRATION=(\d+)$/m);
  assert.ok(envDefault, "env.example does not document KAGE_WORKSPACE_EXPECTED_MIGRATION");
  assert.equal(Number(envDefault[1]), LATEST_MIGRATION);
});

test("env.example documents every variable the deployment reads and sets no real secret", () => {
  for (const key of [
    "KAGE_WORKSPACE_DATABASE_URL",
    "KAGE_WORKSPACE_PORT",
    "KAGE_BACKUP_KEY",
    "POSTGRES_PASSWORD",
    "KAGE_STRIPE_WEBHOOK_SECRET",
    "KAGE_GITHUB_WEBHOOK_SECRET",
  ]) {
    assert.ok(envExample.includes(key), `env.example is missing ${key}`);
  }
  for (const line of envExample.split("\n")) {
    if (!/(SECRET|PASSWORD|_KEY)=/i.test(line) || line.trim().startsWith("#")) continue;
    const value = line.split("=").slice(1).join("=").trim();
    assert.equal(value, "", `env.example ships a value for ${line.split("=")[0]}`);
  }
});

// ---------------------------------------------------------------------------------------------
// Hardening: the packaging must actually WORK, not merely describe itself correctly.
//
// Every test below started as a reproduction of a defect in the shipped artifacts:
//   1. the process bound loopback inside a container whose port compose publishes — DNAT to the bridge
//      IP reached nothing, so a "(healthy)" container refused every external request;
//   2. migrate() took no lock while boot.ts runs it in every replica — concurrent first starts crashed;
//   3. main() read two variables, so every other secret env.example documents was inert;
//   4. no .dockerignore existed, so `COPY mcp/ ./` shipped the developer's host node_modules;
//   5. a non-32-byte backup key silently degraded to an unsalted single-iteration SHA-256.
// ---------------------------------------------------------------------------------------------

/** The first non-loopback IPv4 address of this host, or null when there is none (rare, but possible). */
function externalIPv4() {
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) return address.address;
    }
  }
  return null;
}

test("the service listens on every interface, so a published container port actually reaches it", async () => {
  // Docker DNATs a published port to the container's bridge IP. A process bound to 127.0.0.1 inside the
  // container is not listening there, so every external request is refused — while the in-container
  // healthcheck (which does talk to 127.0.0.1) reports the container healthy.
  const port = await freePort();
  const booted = await bootWorkspaceService({ connectionString: baseUrl, port });
  try {
    assert.equal(booted.host, "0.0.0.0", "boot must bind every interface by default");
    const external = externalIPv4();
    if (external) {
      const response = await fetch(`http://${external}:${booted.port}/v1/health`);
      assert.equal(response.status, 200, `the published address ${external} refused the request`);
    }
    // Loopback keeps working: that is the address the container healthcheck uses.
    assert.equal((await fetch(`http://127.0.0.1:${booted.port}/v1/health`)).status, 200);
  } finally {
    await booted.close();
  }
});

test("the bind address is configurable and defaults to every interface", () => {
  const defaults = readBootConfigFromEnv({ KAGE_WORKSPACE_DATABASE_URL: "postgres://u:p@db:5432/k" });
  assert.equal(defaults.host, "0.0.0.0");
  const pinned = readBootConfigFromEnv({
    KAGE_WORKSPACE_DATABASE_URL: "postgres://u:p@db:5432/k",
    KAGE_WORKSPACE_HOST: "127.0.0.1",
  });
  assert.equal(pinned.host, "127.0.0.1");
});

test("the compose file publishes the port to the host loopback, not to every host interface", () => {
  // The service speaks plain HTTP and expects a TLS terminator in front of it. Publishing 0.0.0.0:8787
  // on the HOST puts that plain-HTTP port on every network the host is attached to.
  const published = compose.match(/-\s*"\$\{KAGE_WORKSPACE_PUBLISH_ADDR:-([^}]+)\}/);
  assert.ok(published, "compose does not make the published bind address explicit");
  assert.equal(published[1], "127.0.0.1");
});

test("concurrent replicas migrating the same fresh database all converge on the schema", async () => {
  // `docker compose up --scale workspace=3` and any Deployment with replicas>1 runs migrate() in every
  // pod at once. Without a lock, migration 001's plain CREATE TABLE races: one pod wins and the others
  // reject with `duplicate key value violates unique constraint "pg_type_typname_nsp_index"`, exit(1)
  // before ever listening, and flap through restart backoff.
  const database = `kage_concurrent_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  await db.query(`CREATE DATABASE ${database}`);
  const url = baseUrl.replace(/\/[^/]+$/, `/${database}`);
  const replicas = [createDb(url), createDb(url), createDb(url)];
  try {
    const versions = await Promise.all(replicas.map((replica) => migrate(replica)));
    assert.deepEqual(versions, [LATEST_MIGRATION, LATEST_MIGRATION, LATEST_MIGRATION]);
    // And the schema is applied exactly once: a second pass over an already-migrated database is a no-op.
    assert.equal(await migrate(replicas[0]), LATEST_MIGRATION);
    const { rows } = await replicas[0].query(`SELECT COUNT(*)::text AS count FROM schema_migrations`);
    assert.equal(Number.parseInt(rows[0].count, 10), LATEST_MIGRATION);
  } finally {
    await Promise.all(replicas.map((replica) => replica.close().catch(() => {})));
  }
});

test("main() wires the deployment secrets env.example documents into the running server", async () => {
  // env.example says an unset billing secret leaves the routes off, which implies a set one turns them
  // on. Before this, main() read only the database url and the port: Stripe posted
  // checkout.session.completed into a 404 forever and no subscription ever activated.
  const port = await freePort();
  const installationId = "4242";
  const webhookSecret = "test-github-webhook-secret";
  await db.query(
    `INSERT INTO github_installations(workspace_id, installation_id, account_login,
                                      repository_selection, permissions)
       VALUES($1, $2, 'kage-test-org', 'selected', '{"metadata":"read"}'::jsonb)`,
    [workspaceId, installationId],
  );
  const booted = await main({
    KAGE_WORKSPACE_DATABASE_URL: baseUrl,
    KAGE_WORKSPACE_PORT: String(port),
    KAGE_STRIPE_SECRET_KEY: "sk_test_not_a_real_key",
    KAGE_STRIPE_WEBHOOK_SECRET: "whsec_test_not_a_real_secret",
    KAGE_GITHUB_APP_ID: "1",
    KAGE_GITHUB_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\nnot-a-real-key\n-----END PRIVATE KEY-----",
    KAGE_GITHUB_WEBHOOK_SECRET: webhookSecret,
  });
  assert.ok(booted, "main() did not return the booted service");
  try {
    const base = `http://127.0.0.1:${booted.port}`;
    // Stripe: configured, so the route EXISTS. A forged signature is rejected on its own merits (401),
    // never with the 404 that means "no billing here".
    const stripe = await fetch(`${base}/v1/billing/stripe/webhook`, {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=forged" },
      body: JSON.stringify({ id: "evt_test", type: "checkout.session.completed" }),
    });
    assert.notEqual(stripe.status, 404, "the Stripe webhook route is not mounted");
    assert.equal(stripe.status, 401);

    // GitHub: an invalid signature is 401 BEFORE any parsing, and no delivery is recorded.
    const body = JSON.stringify({ installation: { id: Number(installationId) }, action: "opened" });
    const forged = await fetch(`${base}/v1/github/webhook`, {
      method: "POST",
      headers: {
        "x-hub-signature-256": "sha256=00",
        "x-github-event": "pull_request",
        "x-github-delivery": `forged-${randomUUID()}`,
      },
      body,
    });
    assert.notEqual(forged.status, 404, "the GitHub webhook route is not mounted");
    assert.equal(forged.status, 401);

    // A genuine delivery is recorded once, against the tenant that owns the installation.
    const deliveryId = `delivery-${randomUUID()}`;
    const headers = {
      "x-hub-signature-256": computeSignature(webhookSecret, body),
      "x-github-event": "pull_request",
      "x-github-delivery": deliveryId,
    };
    const accepted = await fetch(`${base}/v1/github/webhook`, { method: "POST", headers, body });
    assert.equal(accepted.status, 202);
    const redelivered = await fetch(`${base}/v1/github/webhook`, { method: "POST", headers, body });
    assert.equal(redelivered.status, 200);
    const { rows } = await db.query(
      `SELECT COUNT(*)::text AS count FROM github_deliveries WHERE workspace_id = $1 AND delivery_id = $2`,
      [workspaceId, deliveryId],
    );
    assert.equal(Number.parseInt(rows[0].count, 10), 1);

    // An installation this deployment has never mapped writes NOTHING: a webhook must not be able to
    // invent a tenant. It is accepted (GitHub must not retry forever) and dropped.
    const unmappedBody = JSON.stringify({ installation: { id: 999999 } });
    const unmapped = await fetch(`${base}/v1/github/webhook`, {
      method: "POST",
      headers: {
        "x-hub-signature-256": computeSignature(webhookSecret, unmappedBody),
        "x-github-event": "pull_request",
        "x-github-delivery": `unmapped-${randomUUID()}`,
      },
      body: unmappedBody,
    });
    assert.equal(unmapped.status, 202);
    const dropped = await db.query(`SELECT COUNT(*)::text AS count FROM github_deliveries`);
    assert.equal(Number.parseInt(dropped.rows[0].count, 10), 1);
  } finally {
    await booted.close();
  }
});

test("an unconfigured deployment leaves both provider routes off rather than half-mounted", async () => {
  const options = readServerOptionsFromEnv({});
  assert.equal(options.stripe, undefined);
  assert.equal(options.github, undefined);
});

/** Strip // line comments, block comments, and # script comments so only real code is scanned. */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, "").replace(/#.*$/, ""))
    .join("\n");
}

/**
 * A KAGE_* variable that is referenced INDIRECTLY, so it never appears as a literal in the code even
 * though the deployment reads it. The OIDC client secret is resolved as `env[row.client_secret_ref]`
 * from a per-workspace row (a database dump then carries no credential); KAGE_OIDC_CLIENT_SECRET is the
 * conventional name an operator points that ref at, documented but never hard-coded.
 */
const DYNAMICALLY_REFERENCED = new Set(["KAGE_OIDC_CLIENT_SECRET"]);

/**
 * A KAGE_* variable the shipped scripts read that is NOT an operator-facing deployment value.
 * KAGE_APP_DIR is where the app is installed inside the image (default `/app/mcp`); the scripts honour an
 * override only so the deploy tests can run them against `mcp/dist`, never something an operator sets.
 */
const INTERNAL_ONLY = new Set(["KAGE_APP_DIR"]);

/** Every KAGE_* variable the production artifacts actually read. Comments and test files are excluded. */
function environmentNamesRead() {
  const names = new Set();
  const collect = (text) => {
    for (const match of stripComments(text).matchAll(/KAGE_[A-Z0-9_]+/g)) names.add(match[0]);
  };
  const walk = (directory) => {
    for (const entry of readdirSync(directory)) {
      const full = join(directory, entry);
      if (statSync(full).isDirectory()) {
        if (entry === "test-support" || entry === "migrations") continue;
        walk(full);
        continue;
      }
      if (!entry.endsWith(".ts") || entry.endsWith(".test.ts")) continue;
      collect(readFileSync(full, "utf8"));
    }
  };
  walk(join(mcpDir, "vnext", "workspace"));
  for (const file of ["healthcheck.mjs", "entrypoint.sh", "backup.sh", "restore.sh", "docker-compose.yml"]) {
    collect(readFileSync(join(here, file), "utf8"));
  }
  return names;
}

test("env.example documents exactly the KAGE variables the deployment reads, in both directions", () => {
  // The old one-directional substring check certified the wrong invariant: it passed while env.example
  // named KAGE_GITHUB_APP_PRIVATE_KEY and the code read KAGE_GITHUB_PRIVATE_KEY, so an operator could
  // fill in a private key the service never looked at. This checks BOTH directions, so a documented name
  // nothing reads is caught too.
  const documented = new Set(
    [...envExample.matchAll(/^#?\s*(KAGE_[A-Z0-9_]+)=/gm)].map((match) => match[1]),
  );
  const read = environmentNamesRead();
  for (const name of read) {
    if (INTERNAL_ONLY.has(name)) continue;
    assert.ok(documented.has(name), `${name} is read by the deployment but absent from env.example`);
  }
  for (const name of documented) {
    if (DYNAMICALLY_REFERENCED.has(name)) continue;
    assert.ok(read.has(name), `env.example documents ${name}, which nothing in the deployment reads`);
  }
});

/**
 * A deliberately small .dockerignore matcher: it supports exactly the pattern forms this repository
 * ships (`**` , `*`, a trailing `/`, and a leading `!` negation), which is enough to prove what does and
 * does not enter the build context without re-implementing Docker.
 */
function dockerIgnored(patterns, path) {
  let ignored = false;
  for (const raw of patterns) {
    const negated = raw.startsWith("!");
    const pattern = (negated ? raw.slice(1) : raw).replace(/\/$/, "");
    const regex = new RegExp(
      `^${pattern
        .split("/")
        .map((segment) =>
          segment === "**"
            ? "@@"
            : segment.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*").replace(/\?/g, "[^/]"),
        )
        .join("/")
        .replace(/@@\//g, "(?:[^/]+/)*")
        .replace(/\/@@/g, "(?:/[^/]+)*")}(?:/.*)?$`,
    );
    if (regex.test(path)) ignored = !negated;
  }
  return ignored;
}

test("the build context excludes the host dependency tree and every local secret", () => {
  // `COPY mcp/ ./` runs AFTER `RUN npm ci`, so without a .dockerignore the developer's host
  // mcp/node_modules overwrites the lockfile-resolved tree — and THAT is what the runtime stage copies
  // forward. The pinned lockfile then guarantees nothing at all.
  const ignoreFile = join(repoRoot, ".dockerignore");
  const patterns = readFileSync(ignoreFile, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  for (const path of [
    "mcp/node_modules/pg/index.js",
    "mcp/node_modules/@embedded-postgres/darwin-arm64/native/bin/postgres",
    "platform/web/node_modules/react/index.js",
    ".git/config",
    "mcp/.env",
    "deploy/workspace/.env",
    "keys/github-app.private-key.pem",
    ".agent_memory/packets/anything.md",
    ".worktrees/branch/mcp/index.ts",
    "mcp/dist/index.js",
  ]) {
    assert.equal(dockerIgnored(patterns, path), true, `${path} would enter the build context`);
  }
  for (const path of [
    "mcp/package.json",
    "mcp/package-lock.json",
    "mcp/tsconfig.json",
    "mcp/vnext/workspace/server.ts",
    "mcp/vnext/workspace/migrations/001_workspace.sql",
    "deploy/workspace/Dockerfile",
  ]) {
    assert.equal(dockerIgnored(patterns, path), false, `${path} is needed by the build but excluded`);
  }
});

test("a backup refuses key material that is not a 32-byte key instead of hashing a passphrase", async () => {
  // A .kbk is a whole-instance, every-tenant artifact: claims, audit log, subscriptions, SCIM token
  // hashes. Silently deriving its key with one unsalted SHA-256 pass hands an attacker who obtains one
  // file a raw-hash GPU brute force instead of a 256-bit key.
  for (const weak of ["hunter2", "", "correct horse battery staple", Buffer.alloc(16, 1)]) {
    await assert.rejects(
      () => createBackup(db, { directory: workDir, encryption_key: weak }),
      (error) => error instanceof BackupError && error.code === "weak_key",
      `createBackup accepted ${JSON.stringify(String(weak))}`,
    );
  }
  const strong = await createBackup(db, { directory: workDir, encryption_key: BACKUP_KEY });
  await assert.rejects(
    () => verifyBackup(strong.backup_path, "hunter2"),
    (error) => error instanceof BackupError && error.code === "weak_key",
  );
  await assert.rejects(
    () => readBackup(strong.backup_path, "hunter2"),
    (error) => error instanceof BackupError && error.code === "weak_key",
  );
  // Both documented forms of a real key keep working, so this is a refusal of WEAK material only.
  assert.ok(await readBackup(strong.backup_path, Buffer.from(BACKUP_KEY, "base64")));
  const hexKeyed = await createBackup(db, {
    directory: workDir,
    encryption_key: Buffer.alloc(32, 3).toString("hex"),
    file_name: "hex-keyed.kbk",
  });
  assert.ok(await readBackup(hexKeyed.backup_path, Buffer.alloc(32, 3).toString("hex")));
});

test("backup.sh refuses a passphrase in KAGE_BACKUP_KEY and says what to do instead", () => {
  let message = "";
  assert.throws(
    () => runScript("backup.sh", [join(workDir, "weak.kbk")], { KAGE_BACKUP_KEY: "hunter2" }),
    (error) => {
      message = `${error.stdout ?? ""}${error.stderr ?? ""}`;
      return true;
    },
  );
  assert.match(message, /weak_key|32 bytes|openssl rand -base64 32/);
});

test("the self-hosted runbook does not contradict what the artifacts do", () => {
  const runbook = readFileSync(join(repoRoot, "docs", "deployment", "workspace-self-hosted.md"), "utf8");
  // The doc claimed the service "binds loopback in-process" while the compose file published its port.
  assert.equal(/binds loopback/.test(runbook), false);
  assert.match(runbook, /KAGE_WORKSPACE_HOST/);
  // The multi-replica guidance is only true because migrate() takes an advisory lock; say so.
  assert.match(runbook, /advisory lock/i);
});
