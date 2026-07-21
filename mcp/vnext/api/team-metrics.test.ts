// The portal projection of a team metrics report.
//
// The read model is where an honest backend figure could still be dressed up on its way to a screen.
// These tests hold the projection to the same contract every other portal metric carries: an unmeasured
// value is null with exactness `unavailable`, a cohort trend is labeled `cohort` (never `exact`), a
// privacy-withheld trend states its reason, and every card exposes a formula and a source path.
import test from "node:test";
import assert from "node:assert/strict";
import { teamMetricsPanel } from "./read-models.js";
import { MINIMUM_COHORT, buildTeamMetrics } from "../workspace/metrics.js";
import {
  exactReceipt,
  fixtureTaskOutcome,
  partialReceipt,
} from "../workspace/test-support/metrics-fixtures.js";

function metric(panel: ReturnType<typeof teamMetricsPanel>, id: string) {
  const found = panel.metrics.find((candidate) => candidate.id === id);
  assert.ok(found, `expected a ${id} metric`);
  return found;
}

test("a withheld cohort trend states its suppression reason instead of showing a number", () => {
  const panel = teamMetricsPanel(
    buildTeamMetrics(Array.from({ length: 3 }, () => fixtureTaskOutcome())),
  );
  const trend = metric(panel, "team_time_to_verified_change");
  assert.equal(trend.value, null);
  assert.equal(trend.exactness, "unavailable");
  assert.equal(trend.suppression_reason, "minimum_cohort_5");
  assert.equal(panel.suppression_reason, "minimum_cohort_5");
});

test("a published cohort trend is labeled cohort, never exact", () => {
  const panel = teamMetricsPanel(
    buildTeamMetrics(Array.from({ length: MINIMUM_COHORT }, () => fixtureTaskOutcome())),
  );
  const trend = metric(panel, "team_time_to_verified_change");
  assert.equal(trend.unit, "milliseconds");
  assert.equal(trend.exactness, "cohort");
  assert.equal(trend.value, 120_000);
  assert.equal(trend.suppression_reason, null);
});

test("exact request economics are exact when measured and unavailable when not", () => {
  const measured = teamMetricsPanel(
    buildTeamMetrics(Array.from({ length: MINIMUM_COHORT }, () => exactReceipt(-0.02))),
  );
  const measuredCost = metric(measured, "team_exact_context_cost");
  assert.equal(measuredCost.unit, "usd");
  assert.equal(measuredCost.exactness, "exact");
  assert.equal(measuredCost.value, -0.1);

  const unmeasured = teamMetricsPanel(
    buildTeamMetrics(Array.from({ length: MINIMUM_COHORT }, () => partialReceipt())),
  );
  const unmeasuredCost = metric(unmeasured, "team_exact_context_cost");
  assert.equal(unmeasuredCost.value, null);
  assert.equal(unmeasuredCost.exactness, "unavailable");
});

test("every team metric card carries a formula and a source path", () => {
  const panel = teamMetricsPanel(
    buildTeamMetrics(Array.from({ length: MINIMUM_COHORT }, () => fixtureTaskOutcome())),
  );
  assert.ok(panel.metrics.length >= 5);
  for (const card of panel.metrics) {
    assert.ok(card.formula.length > 0, `${card.id} must publish its formula`);
    assert.ok(card.source_path.length > 0, `${card.id} must publish its source`);
  }
  assert.equal(panel.tasks, MINIMUM_COHORT);
  assert.ok(panel.caveats.length > 0);
});

test("an empty team window projects to unavailable cards, not zeros", () => {
  const panel = teamMetricsPanel(buildTeamMetrics([]));
  assert.equal(panel.tasks, 0);
  for (const card of panel.metrics) {
    assert.equal(card.value, null, `${card.id} must be unavailable, never a fabricated zero`);
  }
});
