#!/usr/bin/env node
// Kage vNext — Phase A audit report.
//
// This is the artifact the whole phase exists to produce, so its only job is to be TRUE. It reads
// the repo-local vNext store (evidence, context deliveries, transformation receipts) and prints
// what was actually MEASURED. It derives nothing, estimates nothing, and prices nothing.
//
// Three rules it never breaks:
//
//   1. An empty audit period reports NULL, not zero. "Kage ran all week and cost nothing" and
//      "nothing ran" are different facts, and a zero would let the second be read as the first.
//   2. Coverage is a share of TRANSFORMED requests, not of all agent traffic. Kage writes a
//      receipt only for a request it actually transformed (a zero-recall request writes none), so
//      `measurement_scope` says so explicitly rather than letting a reader assume total coverage.
//   3. An exact TOKEN delta is not an exact COST delta. In audit mode the forwarded (original)
//      prompt has a provider-measured cache breakdown and therefore a real cost; the candidate
//      body that was NOT sent is measured with count_tokens, which reports a token TOTAL and
//      nothing about caching — so its cost is null and the cost delta is UNAVAILABLE, never zero.
//      A one-sided cost is unusable: `before - 0` would report the entire request as a saving.
//
// Usage: node scripts/vnext-phase-a-report.mjs --project <dir> [--json]

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

// Everything measurable is null. `reason` is a fixed token, never a message with a path in it.
function unavailable(reason) {
  return {
    ok: true,
    project_dir: projectDir,
    available: false,
    empty: null,
    reason,
    mode: null,
    modes_observed: null,
    tasks: null,
    attachment: null,
    attachment_success_rate: null,
    measurement: null,
    measurement_scope: "transformed_requests",
    context_latency_p50_ms: null,
    context_latency_p95_ms: null,
    context_latency_source: null,
    failed_open_requests: null,
    prompt_mutations: null,
    token_delta: { available: false, reason, receipts: 0, before_input_tokens: null, after_input_tokens: null, delta_tokens: null },
    cost_delta: { available: false, reason, receipts: 0, before_usd: null, after_usd: null, delta_usd: null },
    notes: NOTES,
  };
}

const NOTES = [
  "measurement_scope=transformed_requests: Kage writes a receipt only for a request it actually transformed, so these counts describe transformed requests, not all agent traffic.",
  "context latency is not stored by protocol v1: no context-composition latency is recorded anywhere, so the percentiles are null even when the period is not empty. A number here would be invented.",
  "an exact token delta is not an exact cost delta: an audit-mode receipt measures the unsent candidate with count_tokens, which reports a token total and nothing about caching, so provider_input_cost_after_usd stays null and the cost delta is unavailable rather than zero.",
  "prompt_mutations counts receipts whose transformed body was actually FORWARDED. In audit mode Kage forwards the client's exact bytes, so a correct audit period measures 0 — it is not assumed to be 0.",
];

function report() {
  let paths;
  let client;
  let commands;
  let database;
  try {
    paths = require(join(DIST, "vnext", "runtime", "paths.js"));
    client = require(join(DIST, "vnext", "runtime", "client.js"));
    commands = require(join(DIST, "vnext", "runtime", "commands.js"));
    database = require(join(DIST, "vnext", "storage", "database.js"));
  } catch {
    // The report reads the built Kage runtime; without it there is nothing to read, and guessing
    // is not an option.
    return unavailable("kage_build_missing");
  }

  const runtimePaths = paths.resolveRuntimePaths(projectDir);
  if (!existsSync(runtimePaths.databasePath)) return unavailable("no_receipt_store");

  const receiptQuery = client.readLocalReceipts(projectDir);
  if (!receiptQuery.available) return unavailable(receiptQuery.reason ?? "receipt_store_unreadable");
  const receipts = receiptQuery.receipts;

  let db;
  let tasks;
  let deliveries;
  try {
    db = database.openVnextDatabase(runtimePaths.databasePath);
    tasks = Number(db.prepare("SELECT COUNT(*) AS count FROM tasks").get().count);
    deliveries = db.prepare("SELECT status FROM context_deliveries").all();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return unavailable(message.includes("Node 22.5") ? "runtime_unsupported" : "receipt_store_unreadable");
  } finally {
    try {
      db?.close();
    } catch {
      // A close failure cannot invalidate rows that were already read.
    }
  }

  // An audit period in which nothing was recorded reports NULL for every measurable value. Zeroes
  // here would read as a measured result ("no failures, no mutations, no cost"), and no measurement
  // was taken at all.
  if (!tasks && !receipts.length && !deliveries.length) return { ...unavailable("empty_audit_period"), available: true, empty: true };

  const attachment = {
    delivered: deliveries.filter((row) => row.status === "delivered").length,
    skipped: deliveries.filter((row) => row.status === "skipped").length,
    failed_open: deliveries.filter((row) => row.status === "failed_open").length,
  };
  const attempted = attachment.delivered + attachment.skipped + attachment.failed_open;

  const measurement = { exact: 0, partial: 0, unavailable: 0 };
  for (const receipt of receipts) measurement[receipt.measurement_quality] += 1;

  const modes = [...new Set(receipts.map((receipt) => receipt.mode))].sort();

  return {
    ok: true,
    project_dir: projectDir,
    available: true,
    empty: false,
    reason: null,
    // Observed from the receipts themselves, not read from a config file: what Kage was CONFIGURED
    // to do and what it DID are different claims, and only the second one is evidence.
    mode: modes.length === 1 ? modes[0] : null,
    modes_observed: modes,
    tasks,
    attachment,
    // Deliveries are the only attachment evidence there is. Null when nothing was attempted:
    // 0 attempts is not a 0% success rate, and it is certainly not a 100% one.
    attachment_success_rate: attempted ? attachment.delivered / attempted : null,
    measurement: receipts.length ? measurement : null,
    measurement_scope: "transformed_requests",
    // Protocol v1 stores no context-composition latency. Null, always, until a schema that records
    // it exists — the receipts' latency_ms is the PROXY round trip and is not the same quantity.
    context_latency_p50_ms: null,
    context_latency_p95_ms: null,
    context_latency_source: null,
    failed_open_requests: attachment.failed_open,
    // Measured: a receipt whose transformed body was actually forwarded. Audit forwards the
    // client's exact bytes, so an audit-only period measures 0 here — it does not assume it.
    prompt_mutations: receipts.filter((receipt) => receipt.mode !== "audit" && receipt.transformations.length > 0).length,
    token_delta: commands.tokenDelta(receipts),
    cost_delta: commands.costDelta(receipts),
    notes: NOTES,
  };
}

function render(value) {
  const lines = [
    `Kage vNext Phase A audit report — ${value.project_dir}`,
    "",
  ];
  if (!value.available) {
    lines.push(`  status: unavailable (${value.reason}) — no measurement was taken, so every value is null.`);
    return lines.join("\n");
  }
  if (value.empty) {
    lines.push("  status: empty audit period — nothing was recorded, so every value is null (not zero).");
    return lines.join("\n");
  }
  lines.push(
    `  mode:                     ${value.mode ?? `mixed (${value.modes_observed.join(", ")})`}`,
    `  tasks:                    ${value.tasks}`,
    `  attachment:               ${value.attachment.delivered} delivered, ${value.attachment.skipped} skipped, ${value.attachment.failed_open} failed open`,
    `  attachment success rate:  ${value.attachment_success_rate === null ? "null (nothing attempted)" : value.attachment_success_rate.toFixed(3)}`,
    `  failed-open requests:     ${value.failed_open_requests}`,
    `  prompt mutations:         ${value.prompt_mutations} (measured, not assumed)`,
    "",
    "  Measurement of TRANSFORMED requests (a request Kage did not transform writes no receipt):",
    value.measurement
      ? `    exact ${value.measurement.exact}, partial ${value.measurement.partial}, unavailable ${value.measurement.unavailable}`
      : "    null (no request was transformed)",
    `  context latency p50/p95:  null / null (protocol v1 records no context-composition latency)`,
    "",
    value.token_delta.available
      ? `  input tokens:  before ${value.token_delta.before_input_tokens} → after ${value.token_delta.after_input_tokens} (delta ${value.token_delta.delta_tokens}, measured on ${value.token_delta.receipts} receipt(s))`
      : `  input tokens:  unavailable (${value.token_delta.reason})`,
    value.cost_delta.available
      ? `  input cost:    before $${value.cost_delta.before_usd.toFixed(6)} → after $${value.cost_delta.after_usd.toFixed(6)} (delta $${value.cost_delta.delta_usd.toFixed(6)}, measured on ${value.cost_delta.receipts} receipt(s))`
      : `  input cost:    unavailable (${value.cost_delta.reason}) — an exact token delta is not an exact cost delta`,
  );
  return lines.join("\n");
}

const value = report();
console.log(asJson ? JSON.stringify(value, null, 2) : render(value));
