import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  DEFAULT_CONTEXT_BUDGET_POLICY,
  normalizeBudgetPolicy,
  type ContextBudgetPolicy,
} from "./budget-policy.js";
import {
  DEGRADATION_ORDER,
  decideBudget,
  decideMode,
  disabledFeaturesForLevel,
  type BudgetCohort,
  type BudgetInput,
} from "./budget-engine.js";
import { auditConfig, readVnextConfig, writeVnextConfig } from "../runtime/config.js";

function fixturePolicy(overrides: Partial<ContextBudgetPolicy> = {}): ContextBudgetPolicy {
  return { ...DEFAULT_CONTEXT_BUDGET_POLICY, ...overrides };
}

function fixtureBudgetInput(overrides: Partial<BudgetInput> = {}): BudgetInput {
  return { context_window: 200_000, requested_capsule_tokens: 800, ...overrides };
}

function fixtureCohort(overrides: Partial<BudgetCohort> = {}): BudgetCohort {
  return { p50_net_cost_delta_usd: null, p95_latency_ms: null, ...overrides };
}

// ---------------------------------------------------------------------------------------------
// decideBudget — the capsule budget is a MEASURED share of the context window, never estimated
// ---------------------------------------------------------------------------------------------

test("budget keeps Kage additions below the configured task share", () => {
  const decision = decideBudget(
    fixtureBudgetInput({ context_window: 100_000, requested_capsule_tokens: 8_000 }),
    fixturePolicy({ max_context_share: 0.01 }),
  );
  assert.equal(decision.capsule_token_budget, 1_000);
});

test("budget never exceeds the hard max_capsule_tokens ceiling", () => {
  const decision = decideBudget(
    fixtureBudgetInput({ context_window: 1_000_000, requested_capsule_tokens: 50_000 }),
    fixturePolicy({ max_context_share: 0.5, max_capsule_tokens: 1_200 }),
  );
  // share cap would be 500_000 and the request 50_000, but the hard ceiling wins.
  assert.equal(decision.capsule_token_budget, 1_200);
});

test("budget honours the requested tokens when they are under both caps", () => {
  const decision = decideBudget(
    fixtureBudgetInput({ context_window: 200_000, requested_capsule_tokens: 800 }),
    fixturePolicy(),
  );
  // share cap = 200_000 * 0.02 = 4_000; max = 1_200; requested 800 wins.
  assert.equal(decision.capsule_token_budget, 800);
  assert.ok(decision.context_share !== null && decision.context_share > 0);
});

test("an unmeasured context window falls back to the default cap, never a fabricated share", () => {
  const decision = decideBudget(
    fixtureBudgetInput({ context_window: null, requested_capsule_tokens: 5_000 }),
    fixturePolicy({ default_capsule_tokens: 800, max_capsule_tokens: 1_200 }),
  );
  assert.equal(decision.capsule_token_budget, 800);
  assert.equal(decision.context_share, null);
  assert.equal(decision.reason, "no_measured_context_window");
});

// ---------------------------------------------------------------------------------------------
// decideMode — degradation is driven ONLY by measured cohort signals
// ---------------------------------------------------------------------------------------------

test("positive cost and latency cohort enters protect mode", () => {
  const decision = decideMode(
    fixtureCohort({ p50_net_cost_delta_usd: 0.02, p95_latency_ms: 220 }),
    fixturePolicy({ max_p95_latency_ms: 150 }),
  );
  assert.equal(decision.mode, "protect");
  assert.ok(decision.disabled_features.includes("optional_context"));
});

test("an unmeasured cohort never fabricates health or harm; mode stays as configured", () => {
  const decision = decideMode(fixtureCohort(), fixturePolicy({ mode: "assist" }));
  assert.equal(decision.mode, "assist");
  assert.deepEqual(decision.disabled_features, []);
  assert.ok(decision.reasons.includes("no_measured_cohort"));
});

test("a healthy measured cohort keeps the configured mode with nothing disabled", () => {
  const decision = decideMode(
    fixtureCohort({ p50_net_cost_delta_usd: -0.01, p95_latency_ms: 40 }),
    fixturePolicy({ mode: "assist", max_p95_latency_ms: 150 }),
  );
  assert.equal(decision.mode, "assist");
  assert.deepEqual(decision.disabled_features, []);
  assert.equal(decision.degradation_level, 0);
});

test("a single failing signal degrades by exactly one step from the top of the order", () => {
  const decision = decideMode(
    fixtureCohort({ p50_net_cost_delta_usd: 0.01, p95_latency_ms: 40 }),
    fixturePolicy({ mode: "assist", max_p95_latency_ms: 150 }),
  );
  assert.equal(decision.mode, "protect");
  assert.equal(decision.degradation_level, 1);
  assert.deepEqual(decision.disabled_features, ["optional_context"]);
});

test("degradation with policy.mode off stays off", () => {
  const decision = decideMode(
    fixtureCohort({ p50_net_cost_delta_usd: 0.5, p95_latency_ms: 999 }),
    fixturePolicy({ mode: "off" }),
  );
  assert.equal(decision.mode, "off");
  assert.deepEqual(decision.disabled_features, []);
});

// ---------------------------------------------------------------------------------------------
// degradation order — critical safety context is never sheddable
// ---------------------------------------------------------------------------------------------

test("the degradation order never drops critical invariants or the verification contract", () => {
  for (let level = 0; level <= DEGRADATION_ORDER.length + 3; level += 1) {
    const disabled: string[] = disabledFeaturesForLevel(level);
    assert.ok(!disabled.includes("critical_invariant"), `level ${level} shed a critical invariant`);
    assert.ok(!disabled.includes("verification_contract"), `level ${level} shed the verification contract`);
  }
});

test("disabledFeaturesForLevel is monotonic and prefix-ordered", () => {
  assert.deepEqual(disabledFeaturesForLevel(0), []);
  assert.deepEqual(disabledFeaturesForLevel(1), ["optional_context"]);
  assert.deepEqual(disabledFeaturesForLevel(2), ["optional_context", "historical_decisions"]);
  // Clamped at the end of the order — no fabricated extra features.
  assert.deepEqual(disabledFeaturesForLevel(999), [...DEGRADATION_ORDER]);
});

// ---------------------------------------------------------------------------------------------
// policy normalization + config integration
// ---------------------------------------------------------------------------------------------

test("normalizeBudgetPolicy fills every field from the audit-safe defaults", () => {
  const policy = normalizeBudgetPolicy(undefined);
  assert.deepEqual(policy, DEFAULT_CONTEXT_BUDGET_POLICY);
  assert.equal(policy.mode, "audit");
  assert.equal(policy.lossy_compression, false);
});

test("normalizeBudgetPolicy keeps a legible override but rejects illegible values", () => {
  const policy = normalizeBudgetPolicy({
    mode: "protect",
    max_context_share: 0.05,
    lossy_compression: true,
    max_capsule_tokens: "not-a-number",
  });
  assert.equal(policy.mode, "protect");
  assert.equal(policy.max_context_share, 0.05);
  assert.equal(policy.lossy_compression, true);
  // Illegible number falls back to the default, never NaN.
  assert.equal(policy.max_capsule_tokens, DEFAULT_CONTEXT_BUDGET_POLICY.max_capsule_tokens);
});

test("normalizeBudgetPolicy defaults lossy_compression to false on an illegible flag", () => {
  const policy = normalizeBudgetPolicy({ lossy_compression: "yes" });
  assert.equal(policy.lossy_compression, false);
});

test("auditConfig writes the audit-safe budget policy (audit mode, lossy disabled)", () => {
  const config = auditConfig(["claude-code"]);
  assert.equal(config.vnext.budget.mode, "audit");
  assert.equal(config.vnext.budget.lossy_compression, false);
});

test("a config written without a budget block reads back as the audit-safe default", () => {
  const project = mkdtempSync(join(tmpdir(), "kage-budget-cfg-"));
  const legacy = auditConfig(["claude-code"]);
  const stripped = JSON.parse(JSON.stringify(legacy)) as { vnext: Record<string, unknown> };
  delete stripped.vnext.budget;
  writeVnextConfig(project, stripped as never);
  const read = readVnextConfig(project);
  assert.deepEqual(read?.vnext.budget, DEFAULT_CONTEXT_BUDGET_POLICY);
});
