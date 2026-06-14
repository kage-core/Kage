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
    assert.equal(score.passed, true, `agent did not meet expectations: ${unmet.join(", ")} (in ${score.event_count} tool calls)`);
  });
}
