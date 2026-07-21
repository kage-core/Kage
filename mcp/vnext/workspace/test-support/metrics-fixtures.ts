// Deterministic fixtures for team-metrics and pilot-report tests.
//
// Not a test file (no `.test` suffix) so the runner ignores it. Every fixture is a PRIVACY-SAFE task
// outcome: identifiers, classes, counts, and measured numbers only. There is deliberately no field
// here that could carry a prompt, a tool payload, or a claim body — the fixtures cannot express one,
// which is the same structural guarantee the table and the sync record carry.
import type { TeamTaskOutcomeRecord } from "../metrics.js";

const T0 = Date.parse("2026-07-20T00:00:00.000Z");

let counter = 0;

/** A fresh, deterministic task id per call, so a cohort of N fixtures really is N distinct tasks. */
function nextId(): string {
  counter += 1;
  return `task-${String(counter).padStart(4, "0")}`;
}

/** Reset the id counter so a test that asserts on exact ids is independent of execution order. */
export function resetFixtureIds(): void {
  counter = 0;
}

/**
 * A fully measured task outcome: exact both-sided cost measurement, measured latency, a verified
 * change with a recorded verification timestamp, and one reused knowledge id.
 */
export function fixtureTaskOutcome(
  overrides: Partial<TeamTaskOutcomeRecord> = {},
): TeamTaskOutcomeRecord {
  const started = new Date(T0 + counter * 60_000).toISOString();
  return {
    task_id: nextId(),
    repository_id: "repo-a1",
    agent_surface: "claude_code",
    mode: "assist",
    measurement_quality: "exact",
    net_input_cost_delta_usd: -0.02,
    kage_processing_cost_usd: 0.001,
    latency_ms: 40,
    delivery_status: "delivered",
    verification_outcome: "verified",
    knowledge_ids_reused: ["claim-1"],
    review_decisions: 1,
    started_at: started,
    ended_at: new Date(Date.parse(started) + 5_000).toISOString(),
    verified_at: new Date(Date.parse(started) + 120_000).toISOString(),
    ...overrides,
  };
}

/** An EXACT receipt with a specific measured net input-cost delta (negative = a measured saving). */
export function exactReceipt(
  costDelta: number,
  overrides: Partial<TeamTaskOutcomeRecord> = {},
): TeamTaskOutcomeRecord {
  return fixtureTaskOutcome({
    measurement_quality: "exact",
    net_input_cost_delta_usd: costDelta,
    ...overrides,
  });
}

/**
 * A PARTIAL receipt: one side of the request was measured, so no honest cost delta exists. The cost is
 * null — never a zero, which would book the whole request as a wash.
 */
export function partialReceipt(overrides: Partial<TeamTaskOutcomeRecord> = {}): TeamTaskOutcomeRecord {
  return fixtureTaskOutcome({
    measurement_quality: "partial",
    net_input_cost_delta_usd: null,
    kage_processing_cost_usd: null,
    ...overrides,
  });
}

/** An UNAVAILABLE receipt: nothing measured the request at all. */
export function unavailableReceipt(
  overrides: Partial<TeamTaskOutcomeRecord> = {},
): TeamTaskOutcomeRecord {
  return fixtureTaskOutcome({
    measurement_quality: "unavailable",
    net_input_cost_delta_usd: null,
    kage_processing_cost_usd: null,
    latency_ms: null,
    verification_outcome: "unavailable",
    verified_at: null,
    ...overrides,
  });
}
