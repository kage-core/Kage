#!/usr/bin/env node
// Kage vNext — Phase D context-efficiency report.
//
// Phase A measured what the audit did to a single prompt; Phase D rolls the transformation receipts
// into a COST COHORT and reports whether Kage's context-efficiency transform is net-negative overhead
// — measured, reversible, and honest. Like every Kage report, its only job is to be TRUE.
//
// The rules it never breaks (all inherited from runtime/commands.ts and gateway/cohort-metrics.ts):
//
//   1. An absent/unreadable store reports available:false with a REASON, never a zero. "Nothing ran"
//      and "it ran and cost nothing" are different facts.
//   2. A percentile is taken only over the receipts that MEASURED the quantity. A cohort with no
//      two-sided-priced receipt reports a null cost delta, never a fabricated zero.
//   3. INPUT ECONOMICS ARE SEPARATE FROM OUTCOME TRENDS. The provider-input cost/token deltas (what
//      the transform did to the prompt) print apart from output-token and Kage-processing-cost
//      trends, so a change in model output can never be read as a prompt saving.
//   4. The gate thresholds are EVALUATED, not asserted: each shows measured/target and whether it is
//      met, or "unmeasured" when the cohort could not measure it — never a green check on absent data.
//
// Usage: node scripts/vnext-phase-d-report.mjs --project <dir> [--json]

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

// Phase D completion-gate targets (plan "Phase D completion gate").
const TARGETS = {
  min_p50_cost_reduction: 0.2, // >= 20% p50 provider-input cost reduction
  max_kage_cost_share: 0.1, // Kage processing cost < 10% of measured provider savings
  max_p95_latency_ms: 150, // local transformation latency < 150 ms p95
};

const NOTES = [
  "measurement_scope=transformed_requests: Kage writes a receipt only for a request it actually transformed, so these counts describe transformed requests, not all agent traffic.",
  "input economics (cost/token deltas) are the exact request cost — MEASURED on two-sided-priced receipts only — and are reported SEPARATELY from the output-token and kage-processing-cost trends. A change in model output is never read as a prompt saving.",
  "a net delta is after - before: POSITIVE means Kage made the request larger/more expensive (harm); NEGATIVE is a saving. cohort_cost_reduction is -(sum after - sum before)/sum before over two-sided-priced receipts.",
  "gate thresholds are evaluated against MEASURED cohort values; a threshold whose input the cohort could not measure reports met:null (unmeasured), never a passing check on absent data.",
  "protect automation: a MEASURED-unhealthy cohort (positive net cost delta or p95 latency over budget) backs off to protect and records its reason; an unmeasured cohort holds the configured mode (absence is not health).",
];

function unavailable(reason) {
  return {
    ok: true,
    project_dir: projectDir,
    available: false,
    empty: null,
    reason,
    cohort: null,
    gate: null,
    protect: null,
    notes: NOTES,
  };
}

function report() {
  let paths;
  let client;
  let cohortMetrics;
  let budgetEngine;
  let config;
  try {
    paths = require(join(DIST, "vnext", "runtime", "paths.js"));
    client = require(join(DIST, "vnext", "runtime", "client.js"));
    cohortMetrics = require(join(DIST, "vnext", "gateway", "cohort-metrics.js"));
    budgetEngine = require(join(DIST, "vnext", "gateway", "budget-engine.js"));
    config = require(join(DIST, "vnext", "runtime", "config.js"));
  } catch {
    return unavailable("kage_build_missing");
  }

  const runtimePaths = paths.resolveRuntimePaths(projectDir);
  if (!existsSync(runtimePaths.databasePath)) return unavailable("no_receipt_store");

  const receiptQuery = client.readLocalReceipts(projectDir);
  if (!receiptQuery.available) return unavailable(receiptQuery.reason ?? "receipt_store_unreadable");
  const receipts = receiptQuery.receipts;

  if (!receipts.length) return { ...unavailable("empty_cohort"), available: true, empty: true };

  const cohort = cohortMetrics.calculateCohort(receipts);

  // The policy governs the budget engine's mode decision; a config predating the budget block reads
  // as the audit-safe default, never a fabricated permissive state.
  const policy = config.readVnextConfig(projectDir)?.vnext?.budget ?? null;

  // Gate evaluation — each threshold is measured/target with an explicit met flag, or null when the
  // cohort could not measure the input.
  const cohortReduction =
    cohort.total_net_input_cost_delta_usd !== null && cohort.cost_delta_receipts > 0
      ? costReduction(receipts)
      : null;
  const savings = cohortReduction ? cohortReduction.savings_usd : null;
  const kageCost = cohort.kage_processing_cost_total_usd;

  const gate = {
    p50_cost_reduction: threshold(
      cohortReduction ? cohortReduction.reduction : null,
      TARGETS.min_p50_cost_reduction,
      "gte",
    ),
    kage_cost_share:
      savings !== null && savings > 0 && kageCost !== null
        ? threshold(kageCost / savings, TARGETS.max_kage_cost_share, "lt")
        : { measured: null, target: TARGETS.max_kage_cost_share, met: null },
    p95_latency_ms: threshold(cohort.p95_latency_ms, TARGETS.max_p95_latency_ms, "lt"),
    reversible_retrieval_rate: cohort.retrieval_rate,
  };

  // Protect automation: feed the MEASURED cohort to decideMode and report the backoff decision.
  const modeDecision = policy
    ? budgetEngine.decideMode(cohortMetrics.cohortToBudgetCohort(cohort), policy)
    : null;

  return {
    ok: true,
    project_dir: projectDir,
    available: true,
    empty: false,
    reason: null,
    cohort: {
      receipts: cohort.receipts,
      measurement: {
        exact: cohort.exact_receipts,
        partial: cohort.partial_receipts,
        unavailable: cohort.unavailable_receipts,
      },
      input_cost: {
        two_sided_receipts: cohort.cost_delta_receipts,
        p50_net_delta_usd: cohort.p50_net_input_cost_delta_usd,
        p95_net_delta_usd: cohort.p95_net_input_cost_delta_usd,
        total_net_delta_usd: cohort.total_net_input_cost_delta_usd,
        cohort_reduction: cohortReduction ? cohortReduction.reduction : null,
      },
      input_tokens: {
        two_sided_receipts: cohort.token_delta_receipts,
        p50_net_delta: cohort.p50_net_input_token_delta,
        p95_net_delta: cohort.p95_net_input_token_delta,
      },
      latency: { samples: cohort.latency_samples, p50_ms: cohort.p50_latency_ms, p95_ms: cohort.p95_latency_ms },
      reversibility: { lossy_receipts: cohort.lossy_receipts, retrieval_rate: cohort.retrieval_rate },
      forwarded_receipts: cohort.forwarded_receipts,
      // Reported SEPARATELY from input economics: Kage's own cost and the output-token trend.
      kage_processing_cost: {
        receipts: cohort.kage_processing_cost_receipts,
        total_usd: cohort.kage_processing_cost_total_usd,
      },
      output_trend: {
        receipts: cohort.output_token_receipts,
        p50_tokens: cohort.p50_output_tokens,
        p95_tokens: cohort.p95_output_tokens,
      },
    },
    gate,
    protect: modeDecision
      ? { mode: modeDecision.mode, degradation_level: modeDecision.degradation_level, reasons: modeDecision.reasons }
      : { mode: null, degradation_level: null, reasons: ["no_budget_policy"] },
    notes: NOTES,
  };
}

// Cohort cost reduction over the two-sided-priced receipts only.
function costReduction(receipts) {
  let before = 0;
  let after = 0;
  for (const receipt of receipts) {
    if (receipt.provider_input_cost_before_usd === null || receipt.provider_input_cost_after_usd === null) continue;
    before += receipt.provider_input_cost_before_usd;
    after += receipt.provider_input_cost_after_usd;
  }
  if (before <= 0) return null;
  return { savings_usd: before - after, reduction: (before - after) / before };
}

function threshold(measured, target, comparison) {
  if (measured === null || typeof measured !== "number" || !Number.isFinite(measured)) {
    return { measured: null, target, met: null };
  }
  const met = comparison === "gte" ? measured >= target : measured < target;
  return { measured, target, met };
}

function render(value) {
  const lines = [`Kage vNext Phase D report — ${value.project_dir}`, ""];
  if (!value.available) {
    lines.push(`  status: unavailable (${value.reason}) — no cohort was measured, so every value is null.`);
    return lines.join("\n");
  }
  if (value.empty) {
    lines.push("  status: empty cohort — no request was transformed, so every value is null (not zero).");
    return lines.join("\n");
  }
  const c = value.cohort;
  const pct = (v) => (v === null ? "unmeasured" : `${(v * 100).toFixed(1)}%`);
  const usd = (v) => (v === null ? "unavailable" : `$${v.toFixed(6)}`);
  const metMark = (m) => (m === null ? "unmeasured" : m ? "MET" : "NOT MET");
  lines.push(
    `  receipts:                 ${c.receipts} (exact ${c.measurement.exact}, partial ${c.measurement.partial}, unavailable ${c.measurement.unavailable})`,
    "",
    "  INPUT ECONOMICS (the exact request cost — measured on two-sided-priced receipts only):",
    `    p50/p95 net cost delta: ${usd(c.input_cost.p50_net_delta_usd)} / ${usd(c.input_cost.p95_net_delta_usd)} (negative = saving)`,
    `    cohort cost reduction:  ${pct(c.input_cost.cohort_reduction)} over ${c.input_cost.two_sided_receipts} receipt(s)`,
    `    p50/p95 net token delta:${c.input_tokens.p50_net_delta ?? "null"} / ${c.input_tokens.p95_net_delta ?? "null"} over ${c.input_tokens.two_sided_receipts} receipt(s)`,
    `    p50/p95 local latency:  ${c.latency.p50_ms ?? "null"} / ${c.latency.p95_ms ?? "null"} ms over ${c.latency.samples} sample(s)`,
    `    reversible retrieval:   ${pct(c.reversibility.retrieval_rate)} (${c.reversibility.lossy_receipts} lossy receipt(s))`,
    "",
    "  REPORTED SEPARATELY (outcome trends — never read as a prompt saving):",
    `    kage processing cost:   ${usd(c.kage_processing_cost.total_usd)} over ${c.kage_processing_cost.receipts} measured receipt(s)`,
    `    output tokens p50/p95:  ${c.output_trend.p50_tokens ?? "null"} / ${c.output_trend.p95_tokens ?? "null"} over ${c.output_trend.receipts} receipt(s)`,
    "",
    "  PHASE D GATE (measured / target):",
    `    p50 cost reduction:     ${pct(value.gate.p50_cost_reduction.measured)} / >=${pct(value.gate.p50_cost_reduction.target)}  → ${metMark(value.gate.p50_cost_reduction.met)}`,
    `    kage cost share:        ${pct(value.gate.kage_cost_share.measured)} / <${pct(value.gate.kage_cost_share.target)}  → ${metMark(value.gate.kage_cost_share.met)}`,
    `    p95 local latency:      ${value.gate.p95_latency_ms.measured ?? "unmeasured"} ms / <${value.gate.p95_latency_ms.target} ms  → ${metMark(value.gate.p95_latency_ms.met)}`,
    "",
    `  PROTECT AUTOMATION:       mode ${value.protect.mode ?? "null"} (level ${value.protect.degradation_level ?? "null"}) — ${value.protect.reasons.join(", ")}`,
  );
  return lines.join("\n");
}

const value = report();
console.log(asJson ? JSON.stringify(value, null, 2) : render(value));
