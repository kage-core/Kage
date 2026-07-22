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
//   4. A SKIPPED capsule is not an attachment. attachment_success_rate is
//      delivered / (delivered + skipped + failed_open), and an audit-mode skip sits in that
//      denominator: Kage composed context and attached none of it, which is a 0, not a 1.
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
    // Unreadable/absent store: we could not look, so the per-provider attachment split is
    // unavailable (with the reason), NOT an empty split. A READABLE run DOES split attachment per
    // provider now — see the available path below.
    attachment_by_provider: { available: false, reason, providers: {}, unattributed: null },
    measurement: null,
    // Null, not `{}`: an empty object would say "we read the receipts and no provider had traffic";
    // here there was nothing to read.
    by_provider: null,
    measurement_scope: "transformed_requests",
    context_latency_p50_ms: null,
    context_latency_p95_ms: null,
    context_latency_source: null,
    context_latency_samples: null,
    failed_open_requests: null,
    prompt_mutations: null,
    token_delta: { available: false, reason, receipts: 0, before_input_tokens: null, after_input_tokens: null, delta_tokens: null },
    cost_delta: { available: false, reason, receipts: 0, before_usd: null, after_usd: null, delta_usd: null },
    notes: NOTES,
  };
}

const NOTES = [
  "measurement_scope=transformed_requests: Kage writes a receipt only for a request it actually transformed, so these counts describe transformed requests, not all agent traffic.",
  "attachment_success_rate = delivered / (delivered + skipped + failed_open). An audit-mode attempt COMPOSES a capsule and injects none of it, so it is recorded as a skip and sits in that denominator: a correct audit period therefore attaches 0% by design. A skip is never counted as a success.",
  "context latency percentiles are the MEASURED composition latency of the attempts that actually composed a capsule (the hook adapter's /v2/context round trip; the proxy's in-process composition). A failed-open composed nothing and contributes no sample — a timeout is not a composition time. Percentiles are nearest-rank, so every value printed is a latency that really happened, and they are null when no composition was measured.",
  "an exact token delta is not an exact cost delta: an audit-mode receipt measures the unsent candidate with count_tokens, which reports a token total and nothing about caching, so provider_input_cost_after_usd stays null and the cost delta is unavailable rather than zero.",
  "prompt_mutations counts receipts whose transformed body was actually FORWARDED. In audit mode Kage forwards the client's exact bytes, so a correct audit period measures 0 — it is not assumed to be 0.",
  "by_provider splits coverage, tokens, and cost by the receipt's provider (the proxy serves Anthropic, OpenAI, and Gemini). It is never conflated into one flattering number, and a provider with no receipts has NO entry — that absence is 'no traffic', not a fabricated {exact:0,partial:0,unavailable:0} or a $0 cost. The overall `measurement`/`token_delta`/`cost_delta` sit ALONGSIDE it; the overall cost still counts only two-sided-priced receipts, so a null-cost provider is excluded, never added in as $0.",
  "attachment_by_provider splits attachment by the provider RECORDED on each delivery row (migration 003 added a nullable provider column; protocol v1 stays frozen — the delivery is Kage's own record, not a wire value). Only the PROXY knows the provider (it holds the gateway); a Claude-HOOK delivery injects from IDE events and cannot know which API the agent called, so it records null and is counted under `unattributed`, NEVER guessed into a provider. A provider with no delivery has no bucket (absence is no traffic, not a 0%/100%). The overall `attachment`/`attachment_success_rate` are unchanged and still count every row, provider-attributed or not.",
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

  // Deliveries come through the same shipped reader the CLI uses, which DRAINS the adapters' spool
  // first. That matters most for the record no endpoint could ever have taken: a failed-open, which
  // by definition happened while the daemon was unreachable.
  const deliveryQuery = client.readLocalDeliveries(projectDir);
  if (!deliveryQuery.available) return unavailable(deliveryQuery.reason ?? "delivery_store_unreadable");
  const deliveries = deliveryQuery.deliveries;

  let db;
  let tasks;
  try {
    db = database.openVnextDatabase(runtimePaths.databasePath);
    tasks = Number(db.prepare("SELECT COUNT(*) AS count FROM tasks").get().count);
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

  // Both aggregates are the SAME functions `kage status` uses. The report cannot drift into its own
  // more flattering arithmetic.
  const attachment = commands.attachmentReport(deliveries);
  const latency = commands.contextLatency(deliveries);

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
    attachment: {
      delivered: attachment.delivered,
      skipped: attachment.skipped,
      failed_open: attachment.failed_open,
    },
    // Deliveries are the only attachment evidence there is. Null when nothing was attempted:
    // 0 attempts is not a 0% success rate, and it is certainly not a 100% one. An audit period that
    // composed capsules and injected none of them is a MEASURED 0.0 — not a null, and not a 1.0.
    attachment_success_rate: attachment.success_rate,
    // Attachment IS now split per provider, from the provider RECORDED on each delivery row
    // (migration 003), using the SAME shared function `kage status` uses. Only PROXY deliveries carry
    // a provider; a hook delivery records null and lands in `unattributed`, never guessed into a
    // provider. A provider with no delivery has no bucket; the overall `attachment` above is
    // unchanged and still counts every row.
    attachment_by_provider: commands.attachmentByProvider(deliveries),
    measurement: receipts.length ? measurement : null,
    // The per-provider split, from the SAME shared function `kage status` uses — so the two surfaces
    // cannot drift. Null (like `measurement`) when no request was transformed; a provider with no
    // receipts simply has no key, never a fabricated zero.
    by_provider: receipts.length ? commands.byProvider(receipts) : null,
    measurement_scope: "transformed_requests",
    // Measured composition latency, from the delivery rows. Null when no attempt ever composed a
    // capsule — a failed round trip is not a composition time and does not enter a percentile.
    context_latency_p50_ms: latency.p50_ms,
    context_latency_p95_ms: latency.p95_ms,
    context_latency_source: latency.source,
    context_latency_samples: latency.samples,
    failed_open_requests: attachment.failed_open,
    // Measured: a receipt whose transformed body was actually forwarded. Audit forwards the
    // client's exact bytes, so an audit-only period measures 0 here — it does not assume it.
    prompt_mutations: receipts.filter((receipt) => receipt.mode !== "audit" && receipt.transformations.length > 0).length,
    token_delta: commands.tokenDelta(receipts),
    cost_delta: commands.costDelta(receipts),
    notes: NOTES,
  };
}

// The per-provider ATTACHMENT block. Never one number; a provider with no attachment attempt has no
// row; and hook deliveries (which carry no provider) appear under an explicit "unattributed"
// heading that says why — never guessed into a provider.
function renderAttachmentByProvider(byProvider) {
  if (!byProvider || !byProvider.available) {
    const reason = byProvider ? byProvider.reason : "unavailable";
    return [`  attachment per provider:  unavailable (${reason}) — the delivery store could not be read`];
  }
  const rate = (a) => (a.success_rate === null ? "null (nothing attempted)" : a.success_rate.toFixed(3));
  const providers = Object.keys(byProvider.providers);
  if (!providers.length && !byProvider.unattributed) {
    return ["  attachment per provider:  none — no context attachment was attempted"];
  }
  const lines = ["  attachment per provider (only the proxy knows the provider; a hook delivery is unattributed, never guessed):"];
  for (const provider of providers) {
    const a = byProvider.providers[provider];
    lines.push(`    ${provider}:  ${a.delivered} delivered, ${a.skipped} skipped, ${a.failed_open} failed open  →  ${rate(a)} attached`);
  }
  if (byProvider.unattributed) {
    const u = byProvider.unattributed;
    lines.push(`    unattributed (hook deliveries — the hook cannot know the provider):  ${u.delivered} delivered, ${u.skipped} skipped, ${u.failed_open} failed open  →  ${rate(u)} attached`);
  }
  return lines;
}

// The per-provider block. Never one conflated number, and never a row for a provider that sent
// nothing — a provider with no receipts simply has no line, which is the honest "no traffic".
function renderProviderBreakdown(byProvider) {
  const providers = byProvider ? Object.keys(byProvider) : [];
  if (!providers.length) return ["  per provider:             null (no request was transformed)"];
  const lines = ["  per provider (a provider with no traffic has no row, which is not a zero):"];
  for (const provider of providers) {
    const bucket = byProvider[provider];
    const m = bucket.measurement;
    const tokensPart = bucket.token_delta.available
      ? `tokens ${bucket.token_delta.before_input_tokens}→${bucket.token_delta.after_input_tokens} (delta ${bucket.token_delta.delta_tokens})`
      : `tokens unavailable (${bucket.token_delta.reason})`;
    const costPart = bucket.cost_delta.available
      ? `cost delta $${bucket.cost_delta.delta_usd.toFixed(6)}`
      : `cost unavailable (${bucket.cost_delta.reason})`;
    lines.push(`    ${provider}:  exact ${m.exact}, partial ${m.partial}, unavailable ${m.unavailable}  |  ${tokensPart}  |  ${costPart}`);
  }
  return lines;
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
    `  attachment success rate:  ${value.attachment_success_rate === null ? "null (nothing attempted)" : value.attachment_success_rate.toFixed(3)} (delivered / delivered+skipped+failed_open; an audit-mode skip attaches nothing)`,
    ...renderAttachmentByProvider(value.attachment_by_provider),
    `  failed-open requests:     ${value.failed_open_requests}`,
    `  prompt mutations:         ${value.prompt_mutations} (measured, not assumed)`,
    "",
    "  Measurement of TRANSFORMED requests (a request Kage did not transform writes no receipt):",
    value.measurement
      ? `    exact ${value.measurement.exact}, partial ${value.measurement.partial}, unavailable ${value.measurement.unavailable} (overall, across every provider)`
      : "    null (no request was transformed)",
    value.context_latency_p50_ms === null
      ? `  context latency p50/p95:  null / null (no attempt composed a capsule, so there is nothing to take a percentile of)`
      : `  context latency p50/p95:  ${value.context_latency_p50_ms} / ${value.context_latency_p95_ms} ms (nearest-rank over ${value.context_latency_samples} measured composition(s))`,
    "",
    value.token_delta.available
      ? `  input tokens:  before ${value.token_delta.before_input_tokens} → after ${value.token_delta.after_input_tokens} (delta ${value.token_delta.delta_tokens}, measured on ${value.token_delta.receipts} receipt(s))`
      : `  input tokens:  unavailable (${value.token_delta.reason})`,
    value.cost_delta.available
      ? `  input cost:    before $${value.cost_delta.before_usd.toFixed(6)} → after $${value.cost_delta.after_usd.toFixed(6)} (delta $${value.cost_delta.delta_usd.toFixed(6)}, measured on ${value.cost_delta.receipts} receipt(s))`
      : `  input cost:    unavailable (${value.cost_delta.reason}) — an exact token delta is not an exact cost delta`,
    "",
    ...renderProviderBreakdown(value.by_provider),
  );
  return lines.join("\n");
}

const value = report();
console.log(asJson ? JSON.stringify(value, null, 2) : render(value));
