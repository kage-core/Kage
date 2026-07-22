#!/usr/bin/env node
// Kage vNext — Phase B repository-model report.
//
// Phase A measured what the audit did to prompts. Phase B measures the repository MODEL the compiler
// built: entities by kind, claims by trust state, how many are injectable, the review queue, and how
// far compilation lags the event log. Like the Phase A report, its only job is to be TRUE.
//
// The rules it never breaks:
//   1. An absent/unreadable model store reports available:false with a reason — never a zero. "No
//      model was ever built" and "a model was built and is empty" are different facts.
//   2. An empty (migrated but unpopulated) store reports empty:true — again, never a fabricated zero
//      dressed up as a measured result.
//   3. Injectable is counted from the store's own trust gate (verified/approved), never inferred.
//   4. model_lag_events and last_compiled_at are MEASURED from the store; a store with no checkpoint
//      reports last_compiled_at:null, never a wall-clock guess.
//
// Usage: node scripts/vnext-phase-b-report.mjs --project <dir> [--json]

import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "mcp", "dist");

function argValue(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index === process.argv.length - 1) return fallback;
  return process.argv[index + 1];
}

const projectDir = resolve(argValue("--project", process.cwd()));
const asJson = process.argv.includes("--json");

function unavailable(reason) {
  return {
    ok: true,
    project_dir: projectDir,
    available: false,
    empty: null,
    reason,
    context_source: null,
    entities: null,
    claims: null,
    evidence: null,
    review_items: null,
    model_lag_events: null,
    last_compiled_at: null,
  };
}

function emit(report) {
  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  if (!report.available) {
    console.log(`Kage vNext Phase B report — unavailable (${report.reason}).`);
    return;
  }
  if (report.empty) {
    console.log(`Kage vNext Phase B report — model store present but empty (${report.reason}).`);
    return;
  }
  console.log(`Kage vNext Phase B report for ${report.project_dir}`);
  console.log(`  context source: ${report.context_source}`);
  console.log(`  entities: ${report.entities.total} (${Object.entries(report.entities.by_kind).map(([k, v]) => `${k}=${v}`).join(", ")})`);
  console.log(`  claims: ${report.claims.total} — injectable ${report.claims.injectable} (${Object.entries(report.claims.by_trust_state).map(([k, v]) => `${k}=${v}`).join(", ")})`);
  console.log(`  evidence: ${report.evidence.total} (${Object.entries(report.evidence.by_verification_state).map(([k, v]) => `${k}=${v}`).join(", ")})`);
  console.log(`  review queue (open): ${report.review_items.open}`);
  console.log(`  compilation lag: ${report.model_lag_events} events; last compiled ${report.last_compiled_at ?? "never"}`);
}

let resolveRuntimePaths;
let openVnextDatabase;
let migrateLocalDatabase;
let pipeline;
let readVnextConfig;
try {
  ({ resolveRuntimePaths } = require(join(DIST, "vnext", "runtime", "paths.js")));
  ({ openVnextDatabase } = require(join(DIST, "vnext", "storage", "database.js")));
  ({ migrateLocalDatabase } = require(join(DIST, "vnext", "storage", "migrations.js")));
  pipeline = require(join(DIST, "vnext", "compiler", "pipeline.js"));
  ({ readVnextConfig } = require(join(DIST, "vnext", "runtime", "config.js")));
} catch {
  emit(unavailable("dist_unavailable"));
  process.exit(0);
}

const paths = resolveRuntimePaths(projectDir);
if (!existsSync(paths.databasePath)) {
  emit(unavailable("no_model_store"));
  process.exit(0);
}

let db;
try {
  db = openVnextDatabase(paths.databasePath);
  migrateLocalDatabase(db);
} catch {
  // node:sqlite requires Node 22.5+. On an older runtime the store cannot be read at all — that is an
  // honest "unavailable", never a zeroed-out success.
  emit(unavailable("vnext_runtime_unavailable"));
  process.exit(0);
}

function countBy(table, column) {
  const rows = db.prepare(`SELECT ${column} AS k, COUNT(*) AS n FROM ${table} GROUP BY ${column} ORDER BY ${column}`).all();
  const out = {};
  for (const row of rows) out[String(row.k)] = Number(row.n);
  return out;
}

try {
  const entityTotal = Number(db.prepare("SELECT COUNT(*) AS n FROM entities").get().n);
  const claimTotal = Number(db.prepare("SELECT COUNT(*) AS n FROM claims").get().n);
  if (entityTotal === 0 && claimTotal === 0) {
    const empty = unavailable("empty_model");
    empty.available = true;
    empty.empty = true;
    empty.context_source = readVnextConfig(projectDir)?.vnext.context_source ?? "legacy";
    emit(empty);
    process.exit(0);
  }

  const byTrust = countBy("claims", "trust_state");
  const injectable = (byTrust.verified ?? 0) + (byTrust.approved ?? 0);
  const report = {
    ok: true,
    project_dir: projectDir,
    available: true,
    empty: false,
    reason: null,
    context_source: readVnextConfig(projectDir)?.vnext.context_source ?? "legacy",
    entities: { total: entityTotal, by_kind: countBy("entities", "kind") },
    claims: { total: claimTotal, injectable, by_trust_state: byTrust },
    evidence: {
      total: Number(db.prepare("SELECT COUNT(*) AS n FROM evidence").get().n),
      by_verification_state: countBy("evidence", "verification_state"),
    },
    review_items: {
      total: Number(db.prepare("SELECT COUNT(*) AS n FROM review_items").get().n),
      open: Number(db.prepare("SELECT COUNT(*) AS n FROM review_items WHERE status = 'open'").get().n),
    },
    model_lag_events: pipeline.computeModelLag(db),
    last_compiled_at: pipeline.latestCompiledAt(db),
  };
  emit(report);
} finally {
  db.close();
}
