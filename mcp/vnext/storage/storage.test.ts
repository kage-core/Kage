import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
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

test("runtime boundary accepts Node 22.5+ and rejects older or malformed versions", () => {
  for (const version of ["22.5.0", "22.6.0", "23.0.0", "25.9.0"]) {
    assert.doesNotThrow(() => assertVnextRuntime(version), version);
  }

  for (const version of ["22.4.99", "18.20.8", "23", "22.x.0", "banana", ""]) {
    assert.throws(
      () => assertVnextRuntime(version),
      (error: unknown) => error instanceof Error && error.message === RUNTIME_ERROR,
      version || "empty version",
    );
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
