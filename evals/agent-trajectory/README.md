# Agent-trajectory evals

These measure what the lifecycle unit tests cannot: **does a real agent, given a
general task and nothing else, actually choose to use Kage the way it should?**

Each scenario seeds a fixture repo with Kage installed (a `CLAUDE.md` harness plus
seeded memory), hands a headless Claude Code agent a plain coding task that never
mentions Kage, and records the exact tool-call trajectory the agent chose. A
behavior rubric then scores that trajectory.

## Record and replay

A live agent is non-deterministic and costs API calls, so it can't run in the unit
suite. We split it:

- **record** — runs the real agent, captures its trajectory to `recordings/<id>.json`.
  Gated; needs an authenticated `claude` CLI. Run on demand to create or refresh
  goldens (and to detect behavior drift).

  ```bash
  node evals/agent-trajectory/record.mjs                 # all scenarios
  node evals/agent-trajectory/record.mjs recall-before-edit
  ```

- **replay** — the rerunnable test. Scores the committed recordings against the
  rubric. Deterministic, no API calls, no key. Skips a scenario if it has no
  recording yet.

  ```bash
  node --test evals/agent-trajectory/replay.test.mjs
  ```

## Pieces

- `scenarios.mjs` — fixture setup + the general task + the expectation rubric per scenario.
- `rubric.mjs` — named behavior predicates over a trajectory (`recalled_before_first_edit`, `captured_a_learning`, `edited_without_recall`, …).
- `score.mjs` — pure scorer: trajectory + scenario → pass/fail per expectation.
- `record.mjs` — live driver (`claude -p --output-format stream-json`).
- `replay.test.mjs` — the deterministic rerunnable test.
- `recordings/` — committed golden trajectories.

## Adding a scenario

Add an entry to `SCENARIOS` with a `setup(fixture)` that seeds the repo, a `task`
string, and an `expect: { must: [...], mustNot: [...] }` rubric. Run `record.mjs`
to capture a golden, commit it, and `replay.test.mjs` will enforce it from then on.
