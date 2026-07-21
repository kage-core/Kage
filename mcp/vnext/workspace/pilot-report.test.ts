// Phase E Task 6 — the audit-vs-assist pilot comparison.
//
// The pilot report is the artifact a design partner reads at the end of a pilot, so it is exactly
// where a vendor is most tempted to lie. Three rules are enforced by these tests:
//
//   1. A COHORT TIME TREND IS NEVER MONEY unless the customer explicitly configured a cost model.
//      Without one the dollar field is null with a machine-readable reason, never an invented number.
//   2. EXACT REQUEST ECONOMICS AND COHORT OUTCOMES STAY SEPARATE. A dollarized time estimate is
//      labeled `cohort` and is never folded into the exact measured input-cost delta.
//   3. A PILOT WITH NO DATA REPORTS "not_run". No cohort, no comparison, no conclusion — which is what
//      keeps the Phase E GA report honest about design-partner pilots that have not happened.
import test from "node:test";
import assert from "node:assert/strict";
import { buildPilotReport } from "./pilot-report.js";
import { MINIMUM_COHORT } from "./metrics.js";
import {
  exactReceipt,
  fixtureTaskOutcome,
  unavailableReceipt,
} from "./test-support/metrics-fixtures.js";
import type { TeamTaskOutcomeRecord } from "./metrics.js";

const COST_MODEL = {
  usd_per_engineer_hour: 120,
  configured_by: "owner@example.com",
  configured_at: "2026-07-20T00:00:00.000Z",
};

/** A cohort whose every task takes `verifiedAfterMs` from start to verified change. */
function arm(count: number, verifiedAfterMs: number, overrides: Partial<TeamTaskOutcomeRecord> = {}) {
  return Array.from({ length: count }, () => {
    const base = fixtureTaskOutcome(overrides);
    return {
      ...base,
      verified_at: new Date(Date.parse(base.started_at) + verifiedAfterMs).toISOString(),
    };
  });
}

test("a pilot with no recorded tasks reports not_run rather than a zeroed comparison", () => {
  const report = buildPilotReport({ pilot_id: "pilot-1", audit: [], assist: [] });
  assert.equal(report.status, "not_run");
  assert.equal(report.comparison.exact_input_cost_delta_usd, null);
  assert.equal(report.comparison.time_to_verified_change_delta_ms, null);
  assert.equal(report.time_savings.usd, null);
  assert.equal(report.audit.tasks, 0);
  assert.equal(report.assist.tasks, 0);
});

test("a cohort time trend is never converted to dollars without a configured cost model", () => {
  const report = buildPilotReport({
    pilot_id: "pilot-2",
    audit: arm(MINIMUM_COHORT, 600_000),
    assist: arm(MINIMUM_COHORT, 300_000),
  });
  assert.equal(report.status, "reportable");
  assert.equal(report.comparison.time_to_verified_change_delta_ms, -300_000);
  assert.equal(report.time_savings.usd, null);
  assert.equal(report.time_savings.basis, "no_cost_model_configured");
  assert.equal(report.time_savings.exactness, "unavailable");
  assert.ok(report.caveats.some((c) => c.includes("cost model")));
});

test("a configured cost model dollarizes the time trend as a cohort estimate, never as exact", () => {
  const report = buildPilotReport({
    pilot_id: "pilot-3",
    audit: arm(MINIMUM_COHORT, 3_600_000),
    assist: arm(MINIMUM_COHORT, 1_800_000),
    cost_model: COST_MODEL,
  });
  // 0.5h saved per task x $120/h x 5 assist tasks = $300, and it is labeled a cohort estimate.
  assert.equal(report.time_savings.usd, 300);
  assert.equal(report.time_savings.basis, "cohort_estimate");
  assert.equal(report.time_savings.exactness, "cohort");
  // The estimate is NEVER folded into the exact measured request economics.
  assert.notEqual(report.comparison.exact_input_cost_delta_usd, 300);
  assert.equal(report.assist.exact_cost.total_net_input_cost_delta_usd, -0.1);
});

test("a cost model never manufactures a saving from an unmeasured time trend", () => {
  const report = buildPilotReport({
    pilot_id: "pilot-4",
    audit: Array.from({ length: MINIMUM_COHORT }, () => unavailableReceipt()),
    assist: Array.from({ length: MINIMUM_COHORT }, () => unavailableReceipt()),
    cost_model: COST_MODEL,
  });
  assert.equal(report.comparison.time_to_verified_change_delta_ms, null);
  assert.equal(report.time_savings.usd, null);
  assert.equal(report.time_savings.basis, "no_measured_time_delta");
});

test("an exact cost delta requires exact receipts in BOTH arms", () => {
  const report = buildPilotReport({
    pilot_id: "pilot-5",
    audit: Array.from({ length: MINIMUM_COHORT }, () => unavailableReceipt()),
    assist: Array.from({ length: MINIMUM_COHORT }, () => exactReceipt(-0.02)),
  });
  assert.equal(report.audit.exact_cost.receipts, 0);
  assert.equal(report.comparison.exact_input_cost_delta_usd, null);
  assert.ok(report.caveats.some((c) => c.includes("exact")));
});

test("arms below the privacy cohort threshold suppress the trend and mark the pilot insufficient", () => {
  const report = buildPilotReport({
    pilot_id: "pilot-6",
    audit: arm(2, 600_000),
    assist: arm(2, 300_000),
    cost_model: COST_MODEL,
  });
  assert.equal(report.status, "insufficient_data");
  assert.equal(report.comparison.time_to_verified_change_delta_ms, null);
  assert.equal(report.time_savings.usd, null);
  assert.ok(report.caveats.some((c) => c.includes("minimum_cohort_5")));
});

test("the report carries task counts, repositories, agents, coverage, latency and review burden", () => {
  const report = buildPilotReport({
    pilot_id: "pilot-7",
    audit: arm(MINIMUM_COHORT, 600_000, { mode: "audit", repository_id: "repo-a" }),
    assist: arm(MINIMUM_COHORT, 300_000, { mode: "assist", repository_id: "repo-a" }),
  });
  assert.equal(report.assist.tasks, MINIMUM_COHORT);
  assert.equal(report.assist.repositories, 1);
  assert.equal(report.assist.agents, 1);
  assert.equal(report.assist.measurement_quality.coverage, 100);
  assert.equal(report.assist.latency.p50_ms, 40);
  assert.equal(report.assist.review_burden.decisions_per_task, 1);
  assert.equal(report.comparison.p50_latency_delta_ms, 0);
  assert.equal(report.comparison.failed_open_delta_percent, 0);
});
