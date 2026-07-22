import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_CONTEXT_BUDGET_POLICY } from "./budget-policy.js";
import {
  ProtectController,
  calculateCohort,
  cohortToBudgetCohort,
  type CohortMetrics,
} from "./cohort-metrics.js";
import type { TransformationReceipt } from "../protocol/index.js";

// ---------------------------------------------------------------------------------------------
// receipt fixtures — every field is set as it would be WRITTEN, no zero-fill.
// ---------------------------------------------------------------------------------------------

let seq = 0;

function baseReceipt(overrides: Partial<TransformationReceipt> = {}): TransformationReceipt {
  seq += 1;
  return {
    receipt_id: `receipt_${seq}`,
    task_id: `task_${seq}`,
    request_id: `req_${seq}`,
    provider: "anthropic",
    model: "claude-3-5-sonnet-latest",
    mode: "assist",
    measurement_quality: "exact",
    before_input_bytes: 4000,
    after_input_bytes: 3600,
    before_input_tokens: 1000,
    after_input_tokens: 900,
    output_tokens: 200,
    kage_processing_cost_usd: 0.0001,
    provider_input_cost_before_usd: 0.1,
    provider_input_cost_after_usd: 0.08,
    latency_ms: 10,
    transformations: ["payload_compress"],
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * A fully-measured (exact) receipt whose NET input-cost delta (after - before, positive = harm) is
 * `deltaUsd`. A negative value is a saving.
 */
function exactReceipt(deltaUsd: number): TransformationReceipt {
  const before = 0.1;
  return baseReceipt({
    measurement_quality: "exact",
    provider_input_cost_before_usd: before,
    provider_input_cost_after_usd: before + deltaUsd,
  });
}

/** A receipt on which nothing could be measured: null tokens and null costs on both sides. */
function unavailableReceipt(): TransformationReceipt {
  return baseReceipt({
    measurement_quality: "unavailable",
    before_input_tokens: null,
    after_input_tokens: null,
    output_tokens: null,
    kage_processing_cost_usd: null,
    provider_input_cost_before_usd: null,
    provider_input_cost_after_usd: null,
    transformations: ["context_inject"],
  });
}

// ---------------------------------------------------------------------------------------------
// plan Task 11, Step 1 tests
// ---------------------------------------------------------------------------------------------

test("cohort percentiles exclude unavailable receipts from exact savings", () => {
  const metrics = calculateCohort([exactReceipt(-0.02), exactReceipt(-0.01), unavailableReceipt()]);
  assert.equal(metrics.exact_receipts, 2);
  assert.equal(metrics.unavailable_receipts, 1);
  assert.equal(metrics.p50_net_input_cost_delta_usd, -0.015);
});

test("protect mode persists its reason and automatically expires after a healthy window", () => {
  const controller = fixtureProtectController();
  controller.observe(unhealthyCohort());
  assert.equal(controller.state().mode, "protect");
  assert.ok(controller.state().reasons.length > 0, "protect must record a reason");
  controller.observe(healthyCohort({ tasks: 30 }));
  assert.equal(controller.state().mode, "assist");
});

// ---------------------------------------------------------------------------------------------
// honesty gates
// ---------------------------------------------------------------------------------------------

test("a cohort with no two-sided cost reports null cost delta, never zero", () => {
  const oneSided = baseReceipt({ provider_input_cost_after_usd: null, measurement_quality: "partial" });
  const metrics = calculateCohort([oneSided]);
  assert.equal(metrics.cost_delta_receipts, 0);
  assert.equal(metrics.p50_net_input_cost_delta_usd, null);
  assert.equal(metrics.p95_net_input_cost_delta_usd, null);
  assert.equal(metrics.partial_receipts, 1);
});

test("unavailable receipts are excluded from the token delta too", () => {
  const metrics = calculateCohort([
    baseReceipt({ before_input_tokens: 1000, after_input_tokens: 800 }),
    unavailableReceipt(),
  ]);
  assert.equal(metrics.token_delta_receipts, 1);
  // net token delta = after - before = -200 (a saving)
  assert.equal(metrics.p50_net_input_token_delta, -200);
});

test("output-token trend is measured separately from input economics", () => {
  const metrics = calculateCohort([
    baseReceipt({ output_tokens: 100 }),
    baseReceipt({ output_tokens: 300 }),
    baseReceipt({ output_tokens: null }),
  ]);
  assert.equal(metrics.output_token_receipts, 2);
  assert.equal(metrics.p50_output_tokens, 200);
});

test("kage processing cost is null when no receipt measured one", () => {
  const metrics = calculateCohort([
    baseReceipt({ kage_processing_cost_usd: null }),
    baseReceipt({ kage_processing_cost_usd: null }),
  ]);
  assert.equal(metrics.kage_processing_cost_receipts, 0);
  assert.equal(metrics.kage_processing_cost_total_usd, null);
});

test("kage processing cost totals only the measured receipts", () => {
  const metrics = calculateCohort([
    baseReceipt({ kage_processing_cost_usd: 0.0002 }),
    baseReceipt({ kage_processing_cost_usd: null }),
  ]);
  assert.equal(metrics.kage_processing_cost_receipts, 1);
  assert.ok(metrics.kage_processing_cost_total_usd !== null);
  assert.ok(Math.abs((metrics.kage_processing_cost_total_usd as number) - 0.0002) < 1e-12);
});

test("retrieval rate is the share of receipts that produced a lossy transform", () => {
  const metrics = calculateCohort([
    baseReceipt({ transformations: ["payload_compress"] }),
    baseReceipt({ transformations: ["context_inject"] }),
  ]);
  assert.equal(metrics.lossy_receipts, 1);
  assert.equal(metrics.retrieval_rate, 0.5);
});

test("an empty cohort reports null percentiles, never zero", () => {
  const metrics = calculateCohort([]);
  assert.equal(metrics.receipts, 0);
  assert.equal(metrics.p50_net_input_cost_delta_usd, null);
  assert.equal(metrics.p95_latency_ms, null);
  assert.equal(metrics.retrieval_rate, null);
});

test("latency percentiles are measured over every receipt", () => {
  const metrics = calculateCohort([
    baseReceipt({ latency_ms: 10 }),
    baseReceipt({ latency_ms: 20 }),
    baseReceipt({ latency_ms: 30 }),
  ]);
  assert.equal(metrics.latency_samples, 3);
  assert.equal(metrics.p50_latency_ms, 20);
});

// ---------------------------------------------------------------------------------------------
// protect controller — hysteresis and honest recovery
// ---------------------------------------------------------------------------------------------

test("an unmeasured cohort observed while in protect does NOT recover (absence is not health)", () => {
  const controller = fixtureProtectController();
  controller.observe(unhealthyCohort());
  assert.equal(controller.state().mode, "protect");
  // 40 tasks with NO measurement: cannot count as healthy, so protect must hold.
  controller.observe({ p50_net_input_cost_delta_usd: null, p95_latency_ms: null, tasks: 40 });
  assert.equal(controller.state().mode, "protect");
});

test("protect holds until the healthy window fills, then recovers", () => {
  const controller = fixtureProtectController();
  controller.observe(unhealthyCohort());
  assert.equal(controller.state().mode, "protect");
  // a small healthy window is not yet enough to recover
  controller.observe(healthyCohort({ tasks: 10 }));
  assert.equal(controller.state().mode, "protect");
  assert.equal(controller.state().healthy_tasks_observed, 10);
  // crossing the 30-task window recovers
  controller.observe(healthyCohort({ tasks: 25 }));
  assert.equal(controller.state().mode, "assist");
});

test("a fresh unhealthy signal re-enters protect and resets the healthy window", () => {
  const controller = fixtureProtectController();
  controller.observe(unhealthyCohort());
  controller.observe(healthyCohort({ tasks: 20 }));
  assert.equal(controller.state().mode, "protect");
  assert.equal(controller.state().healthy_tasks_observed, 20);
  controller.observe(unhealthyCohort());
  assert.equal(controller.state().mode, "protect");
  assert.equal(controller.state().healthy_tasks_observed, 0);
});

test("cohortToBudgetCohort projects the fields decideMode consumes", () => {
  const metrics: CohortMetrics = calculateCohort([exactReceipt(0.02), baseReceipt({ latency_ms: 300 })]);
  const cohort = cohortToBudgetCohort(metrics);
  assert.equal(cohort.p50_net_cost_delta_usd, metrics.p50_net_input_cost_delta_usd);
  assert.equal(cohort.p95_latency_ms, metrics.p95_latency_ms);
});

// ---------------------------------------------------------------------------------------------
// fixtures used by the plan tests
// ---------------------------------------------------------------------------------------------

function fixtureProtectController(): ProtectController {
  return new ProtectController({ ...DEFAULT_CONTEXT_BUDGET_POLICY, mode: "assist" });
}

function unhealthyCohort() {
  // A MEASURED positive net cost delta (Kage made requests more expensive) — the honest trigger.
  return { p50_net_input_cost_delta_usd: 0.02, p95_latency_ms: 20, tasks: 5 };
}

function healthyCohort(options: { tasks: number }) {
  return { p50_net_input_cost_delta_usd: -0.02, p95_latency_ms: 20, tasks: options.tasks };
}
