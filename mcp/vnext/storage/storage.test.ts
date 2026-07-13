import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { EvidenceEvent, TransformationReceipt } from "../protocol/index.js";
import { assertVnextRuntime } from "../runtime/runtime-version.js";
import { openVnextDatabase } from "./database.js";
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

test("file database locks down only its immediate runtime directory and SQLite files", () => {
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
    assert.equal(fileMode(runtimeDir), 0o700, "immediate runtime directory");
    assert.equal(fileMode(databasePath), 0o600, "database");
    assert.equal(fileMode(`${databasePath}-wal`), 0o600, "WAL");
    assert.equal(fileMode(`${databasePath}-shm`), 0o600, "SHM");
  } finally {
    db?.close();
    process.umask(originalUmask);
    rmSync(ancestorDir, { recursive: true, force: true });
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

test("migration 001 records its version once and is idempotent", () => {
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
    assert.equal(secondRows.length, 1);
    assert.equal(secondRows[0].version, 1);
    assert.match(secondRows[0].applied_at, /^\d{4}-\d{2}-\d{2}T/);
    assert.deepEqual(
      tables.map(({ name }) => name),
      ["context_deliveries", "evidence_events", "schema_migrations", "tasks", "transformation_receipts"],
    );
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
      2,
      "2026-07-13T00:00:00.000Z",
    );

    assert.throws(() => migrateLocalDatabase(db), /schema version 2.*newer than supported version 1/i);
    const versions = db
      .prepare("SELECT version FROM schema_migrations ORDER BY version")
      .all() as Array<{ version: number }>;
    assert.deepEqual(versions.map(({ version }) => version), [1, 2]);
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
      /schema version 9007199254740992.*newer than supported version 1/i,
    );
  } finally {
    db.close();
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
