import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { EvidenceEvent, TransformationReceipt } from "../protocol/index.js";
import { assertVnextRuntime } from "../runtime/runtime-version.js";
import { openVnextDatabase } from "./database.js";
import { DeliveryStore, type StoredContextDelivery } from "./delivery-store.js";
import {
  drainDeliverySpool,
  deliverySpoolDirectory,
  spoolContextDelivery,
} from "./delivery-spool.js";
import { EventStore } from "./event-store.js";
import { migrateLocalDatabase } from "./migrations.js";
import { ReceiptStore } from "./receipt-store.js";

const RUNTIME_ERROR =
  "Kage vNext runtime requires Node 22.5+; legacy Kage commands remain available on Node 18+.";

function fixtureEvidenceEvent(): EvidenceEvent {
  return {
    protocol_version: 1,
    event_id: "event-1",
    event_type: "prompt",
    occurred_at: "2026-07-13T00:00:00.000Z",
    repository_id: "repo-1",
    task_id: "task-1",
    privacy_class: "local_raw",
    source_fingerprint: "sha256:source-1",
    payload: {
      text: "prompt text",
      metadata: { attempt: 1, labels: ["local", "raw"] },
    },
  };
}

function fixtureReceipt(): TransformationReceipt {
  return {
    receipt_id: "receipt-1",
    task_id: "task-1",
    request_id: "request-1",
    provider: "anthropic",
    model: "claude-sonnet",
    mode: "assist",
    measurement_quality: "exact",
    before_input_bytes: 2_000,
    after_input_bytes: 1_250,
    before_input_tokens: 500,
    after_input_tokens: 300,
    output_tokens: 100,
    kage_processing_cost_usd: 0.0001,
    provider_input_cost_before_usd: 0.0015,
    provider_input_cost_after_usd: 0.0009,
    latency_ms: 12.5,
    transformations: ["remove_duplicate_context", "compact_tool_results"],
    created_at: "2026-07-13T00:00:01.000Z",
  };
}

function assertRuntimeRejected(version: string): void {
  assert.throws(
    () => assertVnextRuntime(version),
    (error: unknown) => error instanceof Error && error.message === RUNTIME_ERROR,
    version || "empty version",
  );
}

function fileMode(path: string): number {
  return statSync(path).mode & 0o777;
}

function isKagePathError(error: unknown, path: string): boolean {
  return (
    error instanceof Error &&
    error.message.includes("Kage vNext") &&
    error.message.includes(path) &&
    /regular.*file/i.test(error.message)
  );
}

function assertContextualCorruption(
  action: () => unknown,
  table: string,
  column: string,
  rowId: string,
): void {
  assert.throws(
    action,
    (error: unknown) =>
      error instanceof Error &&
      error.message.includes(table) &&
      error.message.includes(column) &&
      error.message.includes(rowId),
    `${table}.${column}:${rowId}`,
  );
}

test("runtime boundary accepts canonical Node 22.5+ versions", () => {
  for (const version of ["22.5.0", "22.5.1", "22.6.0", "23.0.0", "25.9.0"]) {
    assert.doesNotThrow(() => assertVnextRuntime(version), version);
  }
});

test("runtime boundary rejects canonical versions below Node 22.5", () => {
  for (const version of ["22.4.99", "18.20.8", "0.0.0"]) {
    assertRuntimeRejected(version);
  }
});

test("runtime boundary rejects malformed or noncanonical versions", () => {
  for (const version of ["22.5", "23.0", "22.05.0", "023.0.0", "23.0.00", "22.x.0", "banana", ""]) {
    assertRuntimeRejected(version);
  }
});

test("database module loads without evaluating node:sqlite", () => {
  const shimDir = mkdtempSync(join(tmpdir(), "kage-vnext-no-sqlite-"));
  const shimPath = join(shimDir, "block-sqlite.cjs");
  writeFileSync(
    shimPath,
    [
      "const Module = require('module');",
      "const originalLoad = Module._load;",
      "Module._load = function (request) {",
      "  if (request === 'node:sqlite') throw new Error('node:sqlite loaded eagerly');",
      "  return originalLoad.apply(this, arguments);",
      "};",
    ].join("\n"),
    "utf8",
  );

  try {
    const databaseModule = join(__dirname, "database.js");
    const output = execFileSync(
      process.execPath,
      ["--require", shimPath, "-e", `require(${JSON.stringify(databaseModule)}); process.stdout.write("loaded")`],
      { encoding: "utf8" },
    );
    assert.equal(output, "loaded");
  } finally {
    rmSync(shimDir, { recursive: true, force: true });
  }
});

test("database open configures WAL, foreign keys, and busy timeout", () => {
  const databaseDir = mkdtempSync(join(tmpdir(), "kage-vnext-db-"));
  const databasePath = join(databaseDir, "kage.db");
  const db = openVnextDatabase(databasePath);

  try {
    const journal = db.prepare("PRAGMA journal_mode").get() as { journal_mode: string };
    const foreignKeys = db.prepare("PRAGMA foreign_keys").get() as { foreign_keys: number };
    const busyTimeout = db.prepare("PRAGMA busy_timeout").get() as { timeout: number };

    assert.equal(journal.journal_mode, "wal");
    assert.equal(foreignKeys.foreign_keys, 1);
    assert.equal(busyTimeout.timeout, 5_000);
  } finally {
    db.close();
    rmSync(databaseDir, { recursive: true, force: true });
  }
});

test("file database preserves a pre-existing parent while locking down SQLite files", () => {
  const ancestorDir = mkdtempSync(join(tmpdir(), "kage-vnext-private-db-"));
  const runtimeDir = join(ancestorDir, "runtime");
  const databasePath = join(runtimeDir, "kage.db");
  chmodSync(ancestorDir, 0o755);
  mkdirSync(runtimeDir, { mode: 0o755 });
  chmodSync(runtimeDir, 0o755);
  const originalUmask = process.umask(0o022);
  let db: ReturnType<typeof openVnextDatabase> | undefined;

  try {
    db = openVnextDatabase(databasePath);
    migrateLocalDatabase(db);
    db.prepare(`
      INSERT INTO tasks (task_id, session_id, repository_id, agent_surface, started_at)
      VALUES (?, ?, ?, ?, ?)
    `).run("task-permissions", "session-1", "repo-1", "codex", "2026-07-13T00:00:00.000Z");

    assert.equal(fileMode(ancestorDir), 0o755, "higher ancestor");
    assert.equal(fileMode(runtimeDir), 0o755, "pre-existing immediate parent");
    assert.equal(fileMode(databasePath), 0o600, "database");
    assert.equal(fileMode(`${databasePath}-wal`), 0o600, "WAL");
    assert.equal(fileMode(`${databasePath}-shm`), 0o600, "SHM");
  } finally {
    db?.close();
    process.umask(originalUmask);
    rmSync(ancestorDir, { recursive: true, force: true });
  }
});

test("file database creates a missing immediate parent privately", () => {
  const ancestorDir = mkdtempSync(join(tmpdir(), "kage-vnext-new-private-db-"));
  const runtimeDir = join(ancestorDir, "runtime");
  const databasePath = join(runtimeDir, "kage.db");
  const originalUmask = process.umask(0o022);
  let db: ReturnType<typeof openVnextDatabase> | undefined;

  try {
    db = openVnextDatabase(databasePath);

    assert.equal(fileMode(runtimeDir), 0o700, "new immediate parent");
    assert.equal(fileMode(databasePath), 0o600, "database");
  } finally {
    db?.close();
    process.umask(originalUmask);
    rmSync(ancestorDir, { recursive: true, force: true });
  }
});

test("new file database is already private when SQLite opens it", () => {
  interface ModuleLoader {
    _load(request: string, parent: unknown, isMain: boolean): unknown;
  }

  const databaseDir = mkdtempSync(join(tmpdir(), "kage-vnext-precreated-db-"));
  const databasePath = join(databaseDir, "kage.db");
  const moduleLoader = require("node:module") as ModuleLoader;
  const originalLoad = moduleLoader._load;
  const originalUmask = process.umask(0o022);
  let modeAtOpen: number | undefined;

  class InspectingDatabase {
    constructor(path: string) {
      modeAtOpen = existsSync(path) ? fileMode(path) : undefined;
      if (!existsSync(path)) writeFileSync(path, "", "utf8");
    }

    exec(): void {}

    close(): void {}
  }

  moduleLoader._load = (request, parent, isMain) =>
    request === "node:sqlite"
      ? { DatabaseSync: InspectingDatabase }
      : originalLoad.call(moduleLoader, request, parent, isMain);

  try {
    const db = openVnextDatabase(databasePath);
    db.close();
    assert.equal(modeAtOpen, 0o600);
  } finally {
    moduleLoader._load = originalLoad;
    process.umask(originalUmask);
    rmSync(databaseDir, { recursive: true, force: true });
  }
});

test("reopening a legacy WAL database tightens DB, WAL, and SHM without losing data", () => {
  const databaseDir = mkdtempSync(join(tmpdir(), "kage-vnext-legacy-wal-"));
  const databasePath = join(databaseDir, "kage.db");
  const { DatabaseSync } = require("node:sqlite") as typeof import("node:sqlite");
  const originalUmask = process.umask(0o022);
  const legacy = new DatabaseSync(databasePath);
  let reopened: ReturnType<typeof openVnextDatabase> | undefined;

  try {
    legacy.exec(`
      PRAGMA journal_mode=WAL;
      PRAGMA wal_autocheckpoint=0;
      CREATE TABLE legacy_data (value TEXT NOT NULL);
      INSERT INTO legacy_data (value) VALUES ('preserved');
    `);
    assert.equal(existsSync(`${databasePath}-wal`), true, "legacy WAL setup");
    assert.equal(existsSync(`${databasePath}-shm`), true, "legacy SHM setup");
    for (const path of [databasePath, `${databasePath}-wal`, `${databasePath}-shm`]) {
      chmodSync(path, 0o644);
    }

    reopened = openVnextDatabase(databasePath);
    const row = reopened.prepare("SELECT value FROM legacy_data").get() as { value: string };

    assert.equal(row.value, "preserved");
    assert.equal(fileMode(databasePath), 0o600, "database");
    assert.equal(fileMode(`${databasePath}-wal`), 0o600, "WAL");
    assert.equal(fileMode(`${databasePath}-shm`), 0o600, "SHM");
  } finally {
    reopened?.close();
    legacy.close();
    process.umask(originalUmask);
    rmSync(databaseDir, { recursive: true, force: true });
  }
});

test("database path rejects an existing directory without changing its mode", () => {
  const databaseDir = mkdtempSync(join(tmpdir(), "kage-vnext-directory-db-"));
  const databasePath = join(databaseDir, "kage.db");
  mkdirSync(databasePath, { mode: 0o755 });
  chmodSync(databasePath, 0o755);
  let rejection: unknown;

  try {
    try {
      openVnextDatabase(databasePath);
    } catch (error) {
      rejection = error;
    }

    assert.equal(fileMode(databasePath), 0o755);
    assert.equal(isKagePathError(rejection, databasePath), true);
  } finally {
    chmodSync(databasePath, 0o755);
    rmSync(databaseDir, { recursive: true, force: true });
  }
});

test("database path rejects a symlink without changing the link or target", () => {
  const databaseDir = mkdtempSync(join(tmpdir(), "kage-vnext-symlink-db-"));
  const targetPath = join(databaseDir, "target.db");
  const databasePath = join(databaseDir, "kage.db");
  const { DatabaseSync } = require("node:sqlite") as typeof import("node:sqlite");
  const target = new DatabaseSync(targetPath);
  target.exec("CREATE TABLE preserved (value TEXT)");
  target.close();
  chmodSync(targetPath, 0o644);
  symlinkSync(targetPath, databasePath);
  const linkMode = lstatSync(databasePath).mode;
  let opened: ReturnType<typeof openVnextDatabase> | undefined;
  let rejection: unknown;

  try {
    try {
      opened = openVnextDatabase(databasePath);
    } catch (error) {
      rejection = error;
    }

    assert.equal(lstatSync(databasePath).isSymbolicLink(), true);
    assert.equal(lstatSync(databasePath).mode, linkMode);
    assert.equal(readlinkSync(databasePath), targetPath);
    assert.equal(fileMode(targetPath), 0o644);
    assert.equal(isKagePathError(rejection, databasePath), true);
  } finally {
    opened?.close();
    rmSync(databaseDir, { recursive: true, force: true });
  }
});

test("database open validates every existing path before tightening or opening SQLite", () => {
  interface ModuleLoader {
    _load(request: string, parent: unknown, isMain: boolean): unknown;
  }

  const databaseDir = mkdtempSync(join(tmpdir(), "kage-vnext-sidecar-collision-"));
  const databasePath = join(databaseDir, "kage.db");
  const walPath = `${databasePath}-wal`;
  const shmPath = `${databasePath}-shm`;
  const targetPath = join(databaseDir, "collision-target");
  writeFileSync(databasePath, "", { mode: 0o644 });
  writeFileSync(walPath, "legacy-wal", { mode: 0o644 });
  writeFileSync(targetPath, "do-not-touch", { mode: 0o644 });
  chmodSync(databasePath, 0o644);
  chmodSync(walPath, 0o644);
  chmodSync(targetPath, 0o644);
  symlinkSync(targetPath, shmPath);
  const linkMode = lstatSync(shmPath).mode;
  const moduleLoader = require("node:module") as ModuleLoader;
  const originalLoad = moduleLoader._load;
  let sqliteOpened = false;
  let opened: ReturnType<typeof openVnextDatabase> | undefined;
  let rejection: unknown;

  class InspectingDatabase {
    constructor(_path: string) {
      sqliteOpened = true;
    }

    exec(): void {}

    close(): void {}
  }

  moduleLoader._load = (request, parent, isMain) =>
    request === "node:sqlite"
      ? { DatabaseSync: InspectingDatabase }
      : originalLoad.call(moduleLoader, request, parent, isMain);

  try {
    try {
      opened = openVnextDatabase(databasePath);
    } catch (error) {
      rejection = error;
    }

    assert.equal(sqliteOpened, false);
    assert.equal(fileMode(databasePath), 0o644);
    assert.equal(fileMode(walPath), 0o644);
    assert.equal(readFileSync(walPath, "utf8"), "legacy-wal");
    assert.equal(lstatSync(shmPath).isSymbolicLink(), true);
    assert.equal(lstatSync(shmPath).mode, linkMode);
    assert.equal(readlinkSync(shmPath), targetPath);
    assert.equal(fileMode(targetPath), 0o644);
    assert.equal(readFileSync(targetPath, "utf8"), "do-not-touch");
    assert.equal(isKagePathError(rejection, shmPath), true);
  } finally {
    opened?.close();
    moduleLoader._load = originalLoad;
    rmSync(databaseDir, { recursive: true, force: true });
  }
});

test("database open closes an opened handle when initialization fails", () => {
  interface ModuleLoader {
    _load(request: string, parent: unknown, isMain: boolean): unknown;
  }

  const moduleLoader = require("node:module") as ModuleLoader;
  const originalLoad = moduleLoader._load;
  let closed = false;

  class FailingDatabase {
    constructor(_path: string) {}

    exec(): never {
      throw new Error("injected PRAGMA failure");
    }

    close(): void {
      closed = true;
    }
  }

  moduleLoader._load = (request, parent, isMain) =>
    request === "node:sqlite"
      ? { DatabaseSync: FailingDatabase }
      : originalLoad.call(moduleLoader, request, parent, isMain);

  try {
    assert.throws(() => openVnextDatabase(":memory:"), /injected PRAGMA failure/);
    assert.equal(closed, true);
  } finally {
    moduleLoader._load = originalLoad;
  }
});

test("every migration records its version once and the ledger is idempotent", () => {
  const db = openVnextDatabase(":memory:");

  try {
    migrateLocalDatabase(db);
    const firstRows = db
      .prepare("SELECT version, applied_at FROM schema_migrations ORDER BY version")
      .all() as Array<{ version: number; applied_at: string }>;

    migrateLocalDatabase(db);
    const secondRows = db
      .prepare("SELECT version, applied_at FROM schema_migrations ORDER BY version")
      .all() as Array<{ version: number; applied_at: string }>;
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .all() as Array<{ name: string }>;

    assert.deepEqual(secondRows, firstRows);
    assert.deepEqual(secondRows.map(({ version }) => version), [1, 2, 3, 4, 5]);
    for (const row of secondRows) assert.match(row.applied_at, /^\d{4}-\d{2}-\d{2}T/);
    assert.deepEqual(
      tables.map(({ name }) => name),
      [
        "claim_evidence",
        "claims",
        "compiler_checkpoints",
        "context_deliveries",
        "entities",
        "episodes",
        "evidence",
        "evidence_events",
        "legacy_packet_migrations",
        "relations",
        "review_items",
        "schema_migrations",
        "tasks",
        "transformation_receipts",
      ],
    );
  } finally {
    db.close();
  }
});

// Storage schema != wire protocol. Protocol v1 is frozen and ContextDelivery gains no field, but
// the local store is Kage's own: migration 002 adds the measured context-composition latency, which
// is the only thing that can make the Phase A latency percentiles anything but null.
test("migration 002 adds context-composition latency to context_deliveries, and only that", () => {
  const db = openVnextDatabase(":memory:");

  try {
    migrateLocalDatabase(db);
    const columns = db
      .prepare("PRAGMA table_info(context_deliveries)")
      .all() as unknown as Array<{ name: string; type: string; notnull: number; pk: number }>;

    assert.deepEqual(
      columns.map(({ name }) => name),
      [
        "delivery_id",
        "capsule_id",
        "task_id",
        "adapter_id",
        "injection_location",
        "delivered_at",
        "added_bytes",
        "added_tokens",
        "measurement_quality",
        "status",
        "reason",
        "composition_latency_ms",
        // Migration 003 appends `provider` after latency; migration 002 still owns only the latency
        // column, which this test verifies by name rather than by position.
        "provider",
      ],
    );
    const latency = columns.find(({ name }) => name === "composition_latency_ms");
    assert.ok(latency, "migration 002 adds composition_latency_ms");
    assert.equal(latency.type.toUpperCase(), "REAL");
    // Nullable on purpose: an attempt that never composed a capsule (a failed-open) has NO latency,
    // and a zero there would be an invented measurement.
    assert.equal(latency.notnull, 0);
    assert.equal(latency.pk, 0);
  } finally {
    db.close();
  }
});

// The upgrade path that actually exists on a dogfooding machine: a store created before these
// changes carries schema version 1 and real rows. It must gain BOTH later columns (latency, then
// provider) and keep every row — inventing neither a latency nor a provider for the old row.
test("migrations 002 and 003 upgrade an existing version 1 database without losing rows", () => {
  const db = openVnextDatabase(":memory:");

  try {
    migrateLocalDatabase(db);
    // Reconstruct a genuine version-1 store: drop both later columns and both later ledger rows.
    db.exec("DELETE FROM schema_migrations WHERE version IN (2, 3)");
    db.exec("ALTER TABLE context_deliveries DROP COLUMN provider");
    db.exec("ALTER TABLE context_deliveries DROP COLUMN composition_latency_ms");
    db.prepare(`
      INSERT INTO context_deliveries (
        delivery_id, capsule_id, task_id, adapter_id, injection_location, delivered_at,
        added_bytes, added_tokens, measurement_quality, status, reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "delivery-legacy",
      "capsule-legacy",
      "task-legacy",
      "claude-code-hooks",
      "user_turn",
      "2026-07-14T00:00:00.000Z",
      120,
      null,
      "partial",
      "delivered",
      "delivered",
    );

    migrateLocalDatabase(db);

    const versions = db
      .prepare("SELECT version FROM schema_migrations ORDER BY version")
      .all() as Array<{ version: number }>;
    assert.deepEqual(versions.map(({ version }) => version), [1, 2, 3, 4, 5]);
    const rows = new DeliveryStore(db).list();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].delivery_id, "delivery-legacy");
    // The pre-existing row has neither a measured latency nor a known provider, and migration invents
    // neither.
    assert.equal(rows[0].composition_latency_ms, null);
    assert.equal(rows[0].provider, null);
  } finally {
    db.close();
  }
});

// Storage schema != wire protocol, again. Protocol v1 stays frozen and ContextDelivery gains no
// field; migration 003 adds `provider` to the local store so attachment can be split per provider.
// It is NULLABLE on purpose: the proxy knows the provider (gateway.provider) but the Claude hook,
// which injects from IDE events, never sees which API the agent called — so its rows record null,
// never a guessed "anthropic".
test("migration 003 adds a nullable provider column to context_deliveries, and only that", () => {
  const db = openVnextDatabase(":memory:");

  try {
    migrateLocalDatabase(db);
    const columns = db
      .prepare("PRAGMA table_info(context_deliveries)")
      .all() as unknown as Array<{ name: string; type: string; notnull: number; pk: number }>;

    // The provider column is appended last, after migration 002's composition_latency_ms.
    assert.deepEqual(
      columns.map(({ name }) => name),
      [
        "delivery_id",
        "capsule_id",
        "task_id",
        "adapter_id",
        "injection_location",
        "delivered_at",
        "added_bytes",
        "added_tokens",
        "measurement_quality",
        "status",
        "reason",
        "composition_latency_ms",
        "provider",
      ],
    );
    const provider = columns[columns.length - 1];
    assert.equal(provider.name, "provider");
    assert.equal(provider.type.toUpperCase(), "TEXT");
    // Nullable: a hook delivery cannot know the provider, and a fabricated "anthropic" there is
    // exactly the dishonest attribution this workstream forbids.
    assert.equal(provider.notnull, 0);
    assert.equal(provider.pk, 0);
  } finally {
    db.close();
  }
});

// The upgrade path a dogfooding machine actually walks: a store migrated to version 2 (delivery
// rows already present, provider column absent) must gain the column, keep every row, and leave the
// existing rows' provider NULL — never invented.
test("migration 003 upgrades a version 2 database, preserving delivery rows with a null provider", () => {
  const db = openVnextDatabase(":memory:");

  try {
    migrateLocalDatabase(db);
    db.exec("DELETE FROM schema_migrations WHERE version = 3");
    db.exec("ALTER TABLE context_deliveries DROP COLUMN provider");
    db.prepare(`
      INSERT INTO context_deliveries (
        delivery_id, capsule_id, task_id, adapter_id, injection_location, delivered_at,
        added_bytes, added_tokens, measurement_quality, status, reason, composition_latency_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "delivery-v2",
      "capsule-v2",
      "task-v2",
      "claude-code-hooks",
      "user_turn",
      "2026-07-15T00:00:00.000Z",
      120,
      null,
      "partial",
      "delivered",
      "delivered",
      42.5,
    );

    migrateLocalDatabase(db);

    const versions = db
      .prepare("SELECT version FROM schema_migrations ORDER BY version")
      .all() as Array<{ version: number }>;
    assert.deepEqual(versions.map(({ version }) => version), [1, 2, 3, 4, 5]);
    const rows = new DeliveryStore(db).list();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].delivery_id, "delivery-v2");
    // The pre-existing row keeps its measured latency and gains a null provider — migration invents
    // neither a provider nor a latency.
    assert.equal(rows[0].composition_latency_ms, 42.5);
    assert.equal(rows[0].provider, null);
  } finally {
    db.close();
  }
});

test("migration 001 rejects a partial incompatible pre-existing schema without recording success", () => {
  const db = openVnextDatabase(":memory:");

  try {
    db.exec("CREATE TABLE tasks (wrong TEXT)");

    assert.throws(() => migrateLocalDatabase(db), /tasks.*already exists|migration 001.*incompatible/i);
    const ledger = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'")
      .get();
    assert.equal(ledger, undefined);
    const columns = db.prepare("PRAGMA table_info(tasks)").all() as Array<Record<string, unknown>>;
    assert.deepEqual(columns.map((column) => ({ ...column })), [
      { cid: 0, name: "wrong", type: "TEXT", notnull: 0, dflt_value: null, pk: 0 },
    ]);
  } finally {
    db.close();
  }
});

test("migration rejects an incompatible schema_migrations ledger", () => {
  const db = openVnextDatabase(":memory:");

  try {
    db.exec("CREATE TABLE schema_migrations (version TEXT PRIMARY KEY, applied_at INTEGER)");

    assert.throws(() => migrateLocalDatabase(db), /schema_migrations.*incompatible/i);
    const row = db.prepare("SELECT COUNT(*) AS count FROM schema_migrations").get() as { count: number };
    assert.equal(row.count, 0);
  } finally {
    db.close();
  }
});

test("migration rejects databases newer than the supported schema version", () => {
  const db = openVnextDatabase(":memory:");

  try {
    migrateLocalDatabase(db);
    db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)").run(
      6,
      "2026-07-13T00:00:00.000Z",
    );

    assert.throws(() => migrateLocalDatabase(db), /schema version 6.*newer than supported version 5/i);
    const versions = db
      .prepare("SELECT version FROM schema_migrations ORDER BY version")
      .all() as Array<{ version: number }>;
    assert.deepEqual(versions.map(({ version }) => version), [1, 2, 3, 4, 5, 6]);
  } finally {
    db.close();
  }
});

test("migration reports an unsupported schema error for future versions beyond safe integers", () => {
  const db = openVnextDatabase(":memory:");

  try {
    migrateLocalDatabase(db);
    db.exec(`
      INSERT INTO schema_migrations (version, applied_at)
      VALUES (9007199254740992, '2026-07-13T00:00:00.000Z')
    `);

    assert.throws(
      () => migrateLocalDatabase(db),
      /schema version 9007199254740992.*newer than supported version 5/i,
    );
  } finally {
    db.close();
  }
});

test("migration rejects and preserves a ledger-only database recorded as schema version 1", () => {
  const db = openVnextDatabase(":memory:");

  try {
    db.exec(`
      CREATE TABLE schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );
      INSERT INTO schema_migrations (version, applied_at)
      VALUES (1, '2026-07-13T00:00:00.000Z');
    `);

    assert.throws(
      () => migrateLocalDatabase(db),
      /schema version 1.*incompatible.*tasks.*missing/i,
    );
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .all() as Array<{ name: string }>;
    const versions = db
      .prepare("SELECT version FROM schema_migrations ORDER BY version")
      .all() as Array<{ version: number }>;
    assert.deepEqual(tables.map(({ name }) => name), ["schema_migrations"]);
    assert.deepEqual(versions.map(({ version }) => version), [1]);
  } finally {
    db.close();
  }
});

test("migration validates ordered columns, types, nullability, and primary keys for the current schema", () => {
  const mutations: Array<[string, (sql: string) => string]> = [
    [
      "column order",
      (sql) =>
        sql.replace(
          "task_id TEXT PRIMARY KEY,\n  session_id TEXT NOT NULL",
          "session_id TEXT NOT NULL,\n  task_id TEXT PRIMARY KEY",
        ),
    ],
    ["column type", (sql) => sql.replace("session_id TEXT NOT NULL", "session_id BLOB NOT NULL")],
    ["nullability", (sql) => sql.replace("session_id TEXT NOT NULL", "session_id TEXT")],
    ["primary key", (sql) => sql.replace("task_id TEXT PRIMARY KEY", "task_id TEXT UNIQUE")],
  ];

  for (const [name, mutate] of mutations) {
    const db = openVnextDatabase(":memory:");
    try {
      migrateLocalDatabase(db);
      const row = db
        .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'tasks'")
        .get() as { sql: string };
      const incompatibleSql = mutate(row.sql);
      assert.notEqual(incompatibleSql, row.sql, name);
      db.exec(`DROP TABLE tasks; ${incompatibleSql};`);

      assert.throws(
        () => migrateLocalDatabase(db),
        /schema version 5.*incompatible.*tasks.*columns/i,
        name,
      );
    } finally {
      db.close();
    }
  }
});

test("migration validates required unique keys for the current schema", () => {
  const requiredUniqueKeys = [
    ["evidence_events", "source_fingerprint"],
    ["transformation_receipts", "request_id"],
  ] as const;

  for (const [table, column] of requiredUniqueKeys) {
    const db = openVnextDatabase(":memory:");
    try {
      migrateLocalDatabase(db);
      const row = db
        .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?")
        .get(table) as { sql: string };
      const incompatibleSql = row.sql.replace(" UNIQUE", "");
      assert.notEqual(incompatibleSql, row.sql, `${table}.${column}`);
      db.exec(`DROP TABLE ${table}; ${incompatibleSql};`);

      assert.throws(
        () => migrateLocalDatabase(db),
        new RegExp(`schema version 5.*incompatible.*${table}.*${column}.*unique`, "i"),
        `${table}.${column}`,
      );
    } finally {
      db.close();
    }
  }
});

test("event store is append-only and deduplicates source fingerprints", () => {
  const db = openVnextDatabase(":memory:");
  migrateLocalDatabase(db);
  const store = new EventStore(db);
  const event = fixtureEvidenceEvent();

  try {
    assert.equal(store.append(event).inserted, true);
    assert.equal(
      store.append({
        ...event,
        event_id: "event-2",
        payload: { text: "replacement must not win" },
      }).inserted,
      false,
    );
    assert.deepEqual(store.forTask(event.task_id), [event]);
    assert.equal("update" in store, false);
    assert.equal("delete" in store, false);
    assert.equal("remove" in store, false);
  } finally {
    db.close();
  }
});

test("event store round-trips JSON payloads", () => {
  const db = openVnextDatabase(":memory:");
  migrateLocalDatabase(db);
  const store = new EventStore(db);
  const event = fixtureEvidenceEvent();

  try {
    store.append(event);
    assert.deepEqual(store.forTask(event.task_id), [event]);
  } finally {
    db.close();
  }
});

test("event store rejects lossy or unsupported JSON payloads before SQLite", () => {
  const db = openVnextDatabase(":memory:");
  migrateLocalDatabase(db);
  const store = new EventStore(db);
  const sparseArray: unknown[] = Array(1);
  const cycle: Record<string, unknown> = {};
  cycle.self = cycle;
  const inherited = Object.assign(Object.create({ inherited: true }) as Record<string, unknown>, {
    own: true,
  });
  const symbolKey = { [Symbol("hidden")]: "value" };
  const invalidPayloads: Array<[string, unknown]> = [
    ["undefined", { value: undefined }],
    ["NaN", { value: Number.NaN }],
    ["Infinity", { value: Number.POSITIVE_INFINITY }],
    ["bigint", { value: BigInt(1) }],
    ["function", { value: () => "hidden" }],
    ["symbol", { value: Symbol("hidden") }],
    ["symbol key", symbolKey],
    ["sparse array", { value: sparseArray }],
    ["cycle", cycle],
    ["Date", { value: new Date("2026-07-13T00:00:00.000Z") }],
    ["inherited object", inherited],
    ["array root", []],
  ];

  try {
    for (const [name, payload] of invalidPayloads) {
      const event = {
        ...fixtureEvidenceEvent(),
        event_id: `invalid-${name}`,
        source_fingerprint: `sha256:invalid-${name}`,
        payload,
      } as EvidenceEvent;
      assert.throws(
        () => store.append(event),
        /Invalid evidence_events\.payload_json.*event_id/i,
        name,
      );
    }
    assert.equal(store.forTask("task-1").length, 0);
  } finally {
    db.close();
  }
});

test("event store rejects nested negative zero at the lossless JSON boundary", () => {
  const db = openVnextDatabase(":memory:");
  migrateLocalDatabase(db);
  const store = new EventStore(db);
  const event = {
    ...fixtureEvidenceEvent(),
    event_id: "event-negative-zero",
    source_fingerprint: "sha256:event-negative-zero",
    payload: { nested: { value: -0 } },
  };

  try {
    assert.throws(
      () => store.append(event),
      (error: unknown) =>
        error instanceof Error &&
        error.message.includes("evidence_events.payload_json") &&
        error.message.includes(event.event_id) &&
        error.message.includes("$.nested.value") &&
        /negative zero.*lossless/i.test(error.message),
    );
    assert.equal(store.forTask(event.task_id).length, 0);
  } finally {
    db.close();
  }
});

test("event store reports malformed payload JSON as contextual corruption", () => {
  const db = openVnextDatabase(":memory:");
  migrateLocalDatabase(db);
  const store = new EventStore(db);
  const eventId = "event-malformed-json";

  try {
    db.prepare(`
      INSERT INTO evidence_events (
        event_id, event_type, occurred_at, repository_id, task_id,
        privacy_class, source_fingerprint, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      eventId,
      "prompt",
      "2026-07-13T00:00:00.000Z",
      "repo-1",
      "task-malformed-json",
      "local_raw",
      "sha256:event-malformed-json",
      "{",
    );

    assertContextualCorruption(
      () => store.forTask("task-malformed-json"),
      "evidence_events",
      "payload_json",
      eventId,
    );
  } finally {
    db.close();
  }
});

test("event store reports array payload JSON as contextual corruption", () => {
  const db = openVnextDatabase(":memory:");
  migrateLocalDatabase(db);
  const store = new EventStore(db);
  const eventId = "event-array-json";

  try {
    db.prepare(`
      INSERT INTO evidence_events (
        event_id, event_type, occurred_at, repository_id, task_id,
        privacy_class, source_fingerprint, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      eventId,
      "prompt",
      "2026-07-13T00:00:00.000Z",
      "repo-1",
      "task-array-json",
      "local_raw",
      "sha256:event-array-json",
      "[]",
    );

    assertContextualCorruption(
      () => store.forTask("task-array-json"),
      "evidence_events",
      "payload_json",
      eventId,
    );
  } finally {
    db.close();
  }
});

test("receipt store is idempotent by request id and does not replace the original", () => {
  const db = openVnextDatabase(":memory:");
  migrateLocalDatabase(db);
  const store = new ReceiptStore(db);
  const receipt = fixtureReceipt();

  try {
    assert.equal(store.write(receipt).inserted, true);
    assert.equal(
      store.write({
        ...receipt,
        receipt_id: "receipt-2",
        transformations: ["replacement must not win"],
      }).inserted,
      false,
    );
    assert.deepEqual(store.forTask(receipt.task_id), [receipt]);
  } finally {
    db.close();
  }
});

test("receipt store rejects invalid count metrics before SQLite", () => {
  const db = openVnextDatabase(":memory:");
  migrateLocalDatabase(db);
  const store = new ReceiptStore(db);
  const invalidCounts: Array<[keyof TransformationReceipt, number]> = [
    ["before_input_bytes", -1],
    ["after_input_bytes", Number.NaN],
    ["before_input_bytes", Number.POSITIVE_INFINITY],
    ["after_input_bytes", 1.5],
    ["before_input_bytes", Number.MAX_SAFE_INTEGER + 1],
    ["before_input_tokens", -1],
    ["after_input_tokens", Number.NaN],
    ["output_tokens", Number.POSITIVE_INFINITY],
    ["before_input_tokens", 1.5],
    ["after_input_tokens", Number.MAX_SAFE_INTEGER + 1],
  ];

  try {
    for (const [field, value] of invalidCounts) {
      const receipt = { ...fixtureReceipt(), [field]: value } as TransformationReceipt;
      assert.throws(
        () => store.write(receipt),
        new RegExp(`transformation_receipts\\.${field}`),
        `${field}=${String(value)}`,
      );
    }
    assert.equal(store.forTask("task-1").length, 0);
  } finally {
    db.close();
  }
});

test("receipt store rejects invalid cost and latency metrics before SQLite", () => {
  const db = openVnextDatabase(":memory:");
  migrateLocalDatabase(db);
  const store = new ReceiptStore(db);
  const invalidMetrics: Array<[keyof TransformationReceipt, number]> = [
    ["kage_processing_cost_usd", -1],
    ["provider_input_cost_before_usd", Number.NaN],
    ["provider_input_cost_after_usd", Number.POSITIVE_INFINITY],
    ["latency_ms", -1],
    ["latency_ms", Number.NaN],
    ["latency_ms", Number.POSITIVE_INFINITY],
  ];

  try {
    for (const [field, value] of invalidMetrics) {
      const receipt = { ...fixtureReceipt(), [field]: value } as TransformationReceipt;
      assert.throws(
        () => store.write(receipt),
        new RegExp(`transformation_receipts\\.${field}`),
        `${field}=${String(value)}`,
      );
    }
    assert.equal(store.forTask("task-1").length, 0);
  } finally {
    db.close();
  }
});

test("receipt store rejects negative zero counts, costs, and latency losslessly", () => {
  const db = openVnextDatabase(":memory:");
  migrateLocalDatabase(db);
  const store = new ReceiptStore(db);
  const fields: Array<keyof TransformationReceipt> = [
    "before_input_bytes",
    "kage_processing_cost_usd",
    "latency_ms",
  ];

  try {
    for (const field of fields) {
      const receipt = { ...fixtureReceipt(), [field]: -0 } as TransformationReceipt;
      assert.throws(
        () => store.write(receipt),
        (error: unknown) =>
          error instanceof Error &&
          error.message.includes(`transformation_receipts.${field}`) &&
          /negative zero.*lossless/i.test(error.message),
        field,
      );
    }
    assert.equal(store.forTask("task-1").length, 0);
  } finally {
    db.close();
  }
});

test("receipt store rejects invalid transformations JSON before SQLite", () => {
  const db = openVnextDatabase(":memory:");
  migrateLocalDatabase(db);
  const store = new ReceiptStore(db);
  const sparseTransformations: unknown[] = Array(1);
  const inheritedTransformations = ["valid"];
  Object.setPrototypeOf(inheritedTransformations, Object.create(Array.prototype));
  const invalidTransformations: Array<[string, unknown]> = [
    ["non-string", ["valid", 1]],
    ["sparse", sparseTransformations],
    ["wrong root", { value: "valid" }],
    ["inherited array", inheritedTransformations],
  ];

  try {
    for (const [name, transformations] of invalidTransformations) {
      const receipt = {
        ...fixtureReceipt(),
        receipt_id: `invalid-${name}`,
        request_id: `invalid-${name}`,
        transformations,
      } as TransformationReceipt;
      assert.throws(
        () => store.write(receipt),
        /Invalid transformation_receipts\.transformations_json.*receipt_id/i,
        name,
      );
    }
    assert.equal(store.forTask("task-1").length, 0);
  } finally {
    db.close();
  }
});

test("receipt store reports malformed transformations JSON as contextual corruption", () => {
  const db = openVnextDatabase(":memory:");
  migrateLocalDatabase(db);
  const store = new ReceiptStore(db);
  const receiptId = "receipt-malformed-json";

  try {
    db.prepare(`
      INSERT INTO transformation_receipts (
        receipt_id, task_id, request_id, provider, mode, measurement_quality,
        before_input_bytes, after_input_bytes, latency_ms, transformations_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      receiptId,
      "task-malformed-json",
      "request-malformed-json",
      "provider",
      "assist",
      "exact",
      1,
      1,
      1,
      "{",
      "2026-07-13T00:00:00.000Z",
    );

    assertContextualCorruption(
      () => store.forTask("task-malformed-json"),
      "transformation_receipts",
      "transformations_json",
      receiptId,
    );
  } finally {
    db.close();
  }
});

test("receipt store reports non-string transformations JSON as contextual corruption", () => {
  const db = openVnextDatabase(":memory:");
  migrateLocalDatabase(db);
  const store = new ReceiptStore(db);
  const receiptId = "receipt-non-string-json";

  try {
    db.prepare(`
      INSERT INTO transformation_receipts (
        receipt_id, task_id, request_id, provider, mode, measurement_quality,
        before_input_bytes, after_input_bytes, latency_ms, transformations_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      receiptId,
      "task-non-string-json",
      "request-non-string-json",
      "provider",
      "assist",
      "exact",
      1,
      1,
      1,
      '["valid", 1]',
      "2026-07-13T00:00:00.000Z",
    );

    assertContextualCorruption(
      () => store.forTask("task-non-string-json"),
      "transformation_receipts",
      "transformations_json",
      receiptId,
    );
  } finally {
    db.close();
  }
});

test("migration 001 CHECK constraints reject externally written invalid metrics", () => {
  const db = openVnextDatabase(":memory:");
  migrateLocalDatabase(db);

  const insertReceipt = (
    receiptId: string,
    beforeInputBytes: string,
    latencyMs = "1",
    processingCost = "NULL",
  ): void => {
    db.exec(`
      INSERT INTO transformation_receipts (
        receipt_id, task_id, request_id, provider, mode, measurement_quality,
        before_input_bytes, after_input_bytes, kage_processing_cost_usd,
        latency_ms, transformations_json, created_at
      ) VALUES (
        '${receiptId}', 'task-1', '${receiptId}', 'provider', 'assist', 'exact',
        ${beforeInputBytes}, 1, ${processingCost}, ${latencyMs}, '[]', '2026-07-13T00:00:00.000Z'
      )
    `);
  };
  const insertDelivery = (deliveryId: string, addedBytes: string, addedTokens = "NULL"): void => {
    db.exec(`
      INSERT INTO context_deliveries (
        delivery_id, capsule_id, task_id, adapter_id, injection_location,
        delivered_at, added_bytes, added_tokens, measurement_quality, status, reason
      ) VALUES (
        '${deliveryId}', 'capsule-1', 'task-1', 'adapter-1', 'system',
        '2026-07-13T00:00:00.000Z', ${addedBytes}, ${addedTokens}, 'exact', 'delivered', 'test'
      )
    `);
  };

  try {
    for (const [name, write] of [
      ["negative count", () => insertReceipt("negative-count", "-1")],
      ["fractional count", () => insertReceipt("fractional-count", "1.5")],
      ["unsafe count", () => insertReceipt("unsafe-count", "9007199254740992")],
      ["negative latency", () => insertReceipt("negative-latency", "1", "-1")],
      ["infinite latency", () => insertReceipt("infinite-latency", "1", "9e999")],
      ["negative cost", () => insertReceipt("negative-cost", "1", "1", "-1")],
      ["infinite cost", () => insertReceipt("infinite-cost", "1", "1", "9e999")],
      ["negative delivery bytes", () => insertDelivery("negative-delivery", "-1")],
      ["unsafe delivery tokens", () => insertDelivery("unsafe-delivery", "1", "9007199254740992")],
    ] as Array<[string, () => void]>) {
      assert.throws(write, /CHECK constraint failed/i, name);
    }
  } finally {
    db.close();
  }
});

test("receipt store preserves unavailable measurement instead of estimating", () => {
  const db = openVnextDatabase(":memory:");
  migrateLocalDatabase(db);
  const store = new ReceiptStore(db);
  const receipt: TransformationReceipt = {
    ...fixtureReceipt(),
    measurement_quality: "unavailable",
    before_input_tokens: null,
    after_input_tokens: null,
    output_tokens: null,
    kage_processing_cost_usd: null,
    provider_input_cost_before_usd: null,
    provider_input_cost_after_usd: null,
  };

  try {
    store.write(receipt);
    const stored = store.forTask("task-1")[0];
    assert.equal(stored.measurement_quality, "unavailable");
    assert.equal(stored.before_input_tokens, null);
    assert.equal(stored.after_input_tokens, null);
    assert.equal(stored.provider_input_cost_before_usd, null);
    assert.deepEqual(stored, receipt);
  } finally {
    db.close();
  }
});

// --- context deliveries -----------------------------------------------------------------
//
// A delivery is the ONLY evidence that Kage ever attached (or failed to attach) context to a real
// session. Before this store existed, nothing in shipped code wrote one, so attachment_success_rate
// and the context latency percentiles were structurally null forever and the Phase A completion
// gate could not be met no matter how long an audit ran.

function fixtureDelivery(overrides: Partial<StoredContextDelivery> = {}): StoredContextDelivery {
  return {
    delivery_id: "delivery-1",
    capsule_id: "capsule-1",
    task_id: "task-1",
    adapter_id: "claude-code-hooks",
    injection_location: "user_turn",
    delivered_at: "2026-07-15T00:00:00.000Z",
    added_bytes: 512,
    added_tokens: null,
    measurement_quality: "partial",
    status: "delivered",
    reason: "delivered",
    composition_latency_ms: 42.5,
    // Null by default: the fixture stands in for a Claude-hook delivery, which cannot know the
    // provider. The proxy round-trip test below overrides this with a real provider.
    provider: null,
    ...overrides,
  };
}

function skippedDelivery(overrides: Partial<StoredContextDelivery> = {}): StoredContextDelivery {
  return fixtureDelivery({
    delivery_id: "delivery-skipped",
    injection_location: "none",
    added_bytes: 0,
    measurement_quality: "unavailable",
    status: "skipped",
    reason: "audit_mode_no_injection",
    ...overrides,
  });
}

test("delivery store is append-only and round-trips a measured delivery", () => {
  const db = openVnextDatabase(":memory:");
  migrateLocalDatabase(db);
  const store = new DeliveryStore(db);
  const delivery = fixtureDelivery();

  try {
    assert.equal(store.write(delivery).inserted, true);
    // A delivery_id is written once. A retried spool file must never overwrite the recorded facts.
    assert.equal(store.write({ ...delivery, added_bytes: 999_999 }).inserted, false);
    assert.deepEqual(store.forTask("task-1"), [delivery]);
    assert.deepEqual(store.list(), [delivery]);
    assert.equal("update" in store, false);
    assert.equal("delete" in store, false);
  } finally {
    db.close();
  }
});

test("delivery store keeps every status separable and never invents a token count", () => {
  const db = openVnextDatabase(":memory:");
  migrateLocalDatabase(db);
  const store = new DeliveryStore(db);

  try {
    store.write(fixtureDelivery());
    store.write(skippedDelivery({ delivered_at: "2026-07-15T00:00:01.000Z" }));
    store.write(fixtureDelivery({
      delivery_id: "delivery-failed",
      delivered_at: "2026-07-15T00:00:02.000Z",
      capsule_id: "capsule_unavailable",
      injection_location: "none",
      added_bytes: 0,
      measurement_quality: "unavailable",
      status: "failed_open",
      reason: "unreachable",
      // Nothing composed, so there is no composition latency. Zero would be a fabricated number.
      composition_latency_ms: null,
    }));

    const rows = store.list();
    assert.deepEqual(rows.map((row) => row.status), ["delivered", "skipped", "failed_open"]);
    // added_tokens is null on every row: nothing measured the injected block's token count, and a
    // bytes/4 estimate is exactly the fabricated number this phase exists to prevent.
    assert.deepEqual(rows.map((row) => row.added_tokens), [null, null, null]);
    assert.deepEqual(rows.map((row) => row.composition_latency_ms), [42.5, 42.5, null]);
  } finally {
    db.close();
  }
});

// The provider is a STORAGE concern — Kage's own record, added in migration 003 — and it is
// nullable: the proxy knows it, the hook cannot. The store must round-trip both truthfully and never
// coerce a null into a guessed provider.
test("delivery store round-trips a proxy delivery's provider and a hook delivery's null provider", () => {
  const db = openVnextDatabase(":memory:");
  migrateLocalDatabase(db);
  const store = new DeliveryStore(db);

  try {
    // A PROXY delivery: the gateway knows which API it forwarded to, so the row carries that provider.
    assert.equal(
      store.write(fixtureDelivery({
        delivery_id: "delivery-proxy",
        adapter_id: "anthropic-proxy",
        provider: "anthropic",
      })).inserted,
      true,
    );
    // A HOOK delivery: injected from IDE events, blind to which API the agent called, so provider is
    // null — an honest "unknown", never a fabricated "anthropic".
    assert.equal(
      store.write(fixtureDelivery({
        delivery_id: "delivery-hook",
        delivered_at: "2026-07-15T00:00:01.000Z",
        adapter_id: "claude-code-hooks",
        provider: null,
      })).inserted,
      true,
    );

    const rows = new DeliveryStore(db).list();
    assert.deepEqual(rows.map((row) => row.provider), ["anthropic", null]);
  } finally {
    db.close();
  }
});

// A provider is a real provider name or null. An empty string is neither — it is a dishonest
// "attributed to nothing in particular", so the store refuses it at the only door into the table.
test("delivery store rejects an empty-string provider", () => {
  const db = openVnextDatabase(":memory:");
  migrateLocalDatabase(db);
  const store = new DeliveryStore(db);

  try {
    assert.throws(
      () => store.write(fixtureDelivery({ provider: "  " })),
      /Invalid context_deliveries\.provider/i,
    );
    assert.equal(store.list().length, 0);
  } finally {
    db.close();
  }
});

// The invariants that keep a delivery row from being able to lie about what the user's session saw.
test("delivery store rejects a row that claims an attachment it cannot have made", () => {
  const db = openVnextDatabase(":memory:");
  migrateLocalDatabase(db);
  const store = new DeliveryStore(db);

  const invalid: Array<[string, StoredContextDelivery]> = [
    ["delivered into nowhere", fixtureDelivery({ injection_location: "none" })],
    ["delivered zero bytes", fixtureDelivery({ added_bytes: 0 })],
    ["skipped but injected somewhere", skippedDelivery({ injection_location: "system" })],
    ["skipped but added bytes", skippedDelivery({ added_bytes: 128 })],
    ["negative latency", fixtureDelivery({ composition_latency_ms: -1 })],
    ["negative added bytes", fixtureDelivery({ added_bytes: -1 })],
    ["fractional added bytes", fixtureDelivery({ added_bytes: 1.5 })],
    ["unknown status", fixtureDelivery({ status: "ok" as StoredContextDelivery["status"] })],
    [
      "unknown injection location",
      fixtureDelivery({ injection_location: "prompt" as StoredContextDelivery["injection_location"] }),
    ],
  ];

  try {
    for (const [name, delivery] of invalid) {
      assert.throws(() => store.write(delivery), /Invalid context_deliveries\./i, name);
    }
    assert.equal(store.list().length, 0);
  } finally {
    db.close();
  }
});

// The spool is how a delivery reaches the store from a process that has no SQLite handle — and,
// critically, from a hook whose daemon is DEAD. A failed-open cannot be posted to the runtime that
// just failed; it can always be written to a 0600 file inside the runtime's own 0700 directory.
test("the delivery spool carries a record into the store and then removes it", () => {
  const project = mkdtempSync(join(tmpdir(), "kage-spool-"));
  const db = openVnextDatabase(":memory:");
  migrateLocalDatabase(db);

  try {
    // The delivered row carries a provider (a proxy delivery would): the spool must carry it through
    // to the store, since the proxy records its deliveries via this spool and nothing else.
    assert.equal(spoolContextDelivery(project, fixtureDelivery({ provider: "anthropic" })), true);
    assert.equal(spoolContextDelivery(project, skippedDelivery()), true);

    const spool = deliverySpoolDirectory(project);
    assert.equal(lstatSync(spool).mode & 0o777, 0o700);
    assert.equal(drainDeliverySpool(db, project), 2);

    const rows = new DeliveryStore(db).list();
    assert.deepEqual(rows.map((row) => row.status).sort(), ["delivered", "skipped"]);
    assert.deepEqual(rows.find((row) => row.status === "delivered"), fixtureDelivery({ provider: "anthropic" }));
    // Drained files are removed, so the spool cannot grow without bound and a second drain is a
    // no-op rather than a double count.
    assert.equal(drainDeliverySpool(db, project), 0);
    assert.equal(new DeliveryStore(db).list().length, 2);
  } finally {
    db.close();
    rmSync(project, { recursive: true, force: true });
  }
});

test("the delivery spool drops a malformed or lying record instead of storing it", () => {
  const project = mkdtempSync(join(tmpdir(), "kage-spool-bad-"));
  const db = openVnextDatabase(":memory:");
  migrateLocalDatabase(db);

  try {
    const spool = deliverySpoolDirectory(project);
    mkdirSync(spool, { recursive: true, mode: 0o700 });
    writeFileSync(join(spool, "garbage.json"), "{not json", { mode: 0o600 });
    writeFileSync(
      join(spool, "lying.json"),
      JSON.stringify({ ...fixtureDelivery(), status: "delivered", injection_location: "none" }),
      { mode: 0o600 },
    );
    writeFileSync(join(spool, "estimated.json"), JSON.stringify({ ...fixtureDelivery(), added_tokens: 128.5 }), {
      mode: 0o600,
    });

    assert.equal(drainDeliverySpool(db, project), 0);
    assert.equal(new DeliveryStore(db).list().length, 0);
    // Unusable files are consumed too: a permanently unparseable record must not make the spool
    // grow forever, and it is not evidence of anything.
    assert.equal(existsSync(join(spool, "garbage.json")), false);
  } finally {
    db.close();
    rmSync(project, { recursive: true, force: true });
  }
});

test("spooling a delivery never throws, whatever the filesystem does", () => {
  // A delivery write must NEVER break a user's session. An unwritable spool is a lost measurement,
  // which is a lie of omission at worst — a thrown error would be a broken agent.
  const project = mkdtempSync(join(tmpdir(), "kage-spool-ro-"));
  mkdirSync(join(project, ".agent_memory", "daemon"), { recursive: true });
  writeFileSync(join(project, ".agent_memory", "daemon", "vnext"), "not a directory", "utf8");

  try {
    assert.equal(spoolContextDelivery(project, fixtureDelivery()), false);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});
