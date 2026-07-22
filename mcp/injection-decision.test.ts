import test from "node:test";
import assert from "node:assert/strict";
import { decideRecallInjection } from "./kernel.js";

// W3 — the corpus-normalized injection decision (unit level).
//
// The full end-to-end acceptance runs in benchmarks/injection-relevance-kage.mjs against real seeded
// stores through the real composeInjection. These tests pin the DECISION FUNCTION's shape rules so a
// refactor cannot silently invert them:
//   - no candidates -> never inject
//   - a top hit carried by ONE distinct query term is a lexical accident, never injected,
//     regardless of score (the "pong problem")
//   - a spike above a wide noise band injects; a flat band does not, however high its level
//   - tiny corpora decide by runner-up gap + evidence anchor (no distribution exists)
//   - the decision is deterministic

test("no candidates never injects", () => {
  const decision = decideRecallInjection([], 0);
  assert.equal(decision.inject, false);
  assert.equal(decision.confidence, 0);
  assert.equal(decision.candidate_count, 0);
});

test("a single-term lexical accident is refused regardless of score (the pong problem)", () => {
  // A content-free prompt spikes one packet hard on one token ("pong" all over a heartbeat runbook).
  const decision = decideRecallInjection([48, 20, 18, 17, 16, 15], 1);
  assert.equal(decision.inject, false);
  assert.ok(decision.confidence < 0.5);
  assert.match(decision.why, /distinct query term/);
});

test("a real spike above a wide noise band injects", () => {
  // A genuine answer: top far above a 20-candidate noise band, broad term evidence.
  const band = Array.from({ length: 20 }, (_, i) => 22 - i * 0.5);
  const decision = decideRecallInjection([75, ...band], 4);
  assert.equal(decision.inject, true);
  assert.ok(decision.confidence >= 0.5);
});

test("a flat band never injects, however high its absolute level", () => {
  // Topical noise on a big store: high absolute scores, no spike.
  const decision = decideRecallInjection([34, 33, 32.5, 32, 31, 30.5, 30, 29], 3);
  assert.equal(decision.inject, false, `flat band injected: ${decision.why}`);
});

test("tiny corpus: a direct match that dwarfs its runner-up injects", () => {
  const decision = decideRecallInjection([43.8, 8], 5);
  assert.equal(decision.inject, true);
});

test("tiny corpus: a lone weak candidate does not inject; a lone strong direct match does", () => {
  // The single-candidate anchor is 6 (one-term accidents are already refused by the breadth gate,
  // so a lone candidate here carries multi-term evidence): below it stays out, above it injects.
  assert.equal(decideRecallInjection([4], 2).inject, false);
  assert.equal(decideRecallInjection([25], 4).inject, true);
});

test("tiny corpus: a marginal leader does not inject", () => {
  const decision = decideRecallInjection([12, 11, 10], 2);
  assert.equal(decision.inject, false);
});

test("the decision is deterministic", () => {
  const a = decideRecallInjection([60, 20, 18, 15, 12, 10], 3);
  const b = decideRecallInjection([60, 20, 18, 15, 12, 10], 3);
  assert.deepEqual(a, b);
});
