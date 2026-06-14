import { PREDICATES } from "./rubric.mjs";

// Pure scorer: given a recorded trajectory and a scenario's expectation rubric,
// return per-expectation pass/fail and an overall verdict. No I/O, no model calls —
// this is what makes the replay test deterministic and rerunnable.
export function scoreTrajectory(trajectory, scenario) {
  const events = (trajectory && trajectory.events) || [];
  const evalPredicate = (name) => {
    const pred = PREDICATES[name];
    if (!pred) throw new Error(`unknown rubric predicate: ${name}`);
    return Boolean(pred(events, scenario));
  };

  const must = (scenario.expect.must || []).map((name) => ({
    expectation: name,
    kind: "must",
    ok: evalPredicate(name),
  }));
  const mustNot = (scenario.expect.mustNot || []).map((name) => ({
    expectation: `not:${name}`,
    kind: "mustNot",
    ok: !evalPredicate(name),
  }));

  const results = [...must, ...mustNot];
  return {
    scenario: scenario.id,
    passed: results.every((r) => r.ok),
    results,
    event_count: events.length,
  };
}
