import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SCENARIOS } from "./scenarios.mjs";
import { scoreTrajectory } from "./score.mjs";

// RERUNNABLE replay test (deterministic, no model calls). For each scenario it
// loads the recorded agent trajectory and asserts the agent's self-chosen tool
// use satisfied the behavior rubric. Refresh recordings with record.mjs.
//
// Run: node --test evals/agent-trajectory/replay.test.mjs

const here = dirname(fileURLToPath(import.meta.url));
const recDir = join(here, "recordings");

for (const scenario of SCENARIOS) {
  test(`agent trajectory: ${scenario.id}`, (t) => {
    const file = join(recDir, `${scenario.id}.json`);
    if (!existsSync(file)) {
      t.skip(`no recording yet — run: node evals/agent-trajectory/record.mjs ${scenario.id}`);
      return;
    }
    const trajectory = JSON.parse(readFileSync(file, "utf8"));
    const score = scoreTrajectory(trajectory, scenario);
    const unmet = score.results.filter((r) => !r.ok).map((r) => r.expectation);

    // Aspirational scenarios document a known behavior gap. They never fail the
    // suite — but if the recording starts passing, the skip message says to
    // promote it to enforced.
    if (scenario.aspirational) {
      t.skip(score.passed
        ? `aspirational scenario now PASSES — promote it to enforced`
        : `known gap (aspirational): agent did not meet ${unmet.join(", ")}`);
      return;
    }

    assert.equal(score.passed, true, `agent did not meet expectations: ${unmet.join(", ")} (in ${score.event_count} tool calls)`);
  });
}

// Freshness gate: frozen goldens silently rot — a new model or changed harness can break
// real recall while stale recordings still pass. Fail if any recording ages past the window
// so it gets re-recorded with record.mjs against the current model.
const MAX_RECORDING_AGE_DAYS = 90;
test("agent-trajectory recordings are fresh enough to gate on", () => {
  const now = Date.now();
  const stale = [];
  for (const scenario of SCENARIOS) {
    const file = join(recDir, `${scenario.id}.json`);
    if (!existsSync(file)) continue;
    const at = Date.parse(JSON.parse(readFileSync(file, "utf8")).recorded_at ?? "");
    if (!Number.isFinite(at)) continue;
    const ageDays = (now - at) / 86_400_000;
    if (ageDays > MAX_RECORDING_AGE_DAYS) stale.push(`${scenario.id} (${Math.round(ageDays)}d)`);
  }
  assert.equal(stale.length, 0,
    `stale agent-trajectory recordings (> ${MAX_RECORDING_AGE_DAYS}d) — re-record against the current model: node evals/agent-trajectory/record.mjs <id>. Stale: ${stale.join(", ")}`);
});
