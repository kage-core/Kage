# Kage Memory Ablation on SWE-bench Verified

> Not to be confused with [`benchmarks/`](../benchmarks/README.md) (plural) —
> this directory (singular) is the Python **task-performance ablation**
> (memory on vs. off, scored on real SWE-bench Verified task completion).
> `benchmarks/` is the JS **retrieval/scale/staleness** suite (LongMemEval,
> MemoryArena, LoCoMo, synthetic scale). Different substrate, different question.

A reproducible, **controlled ablation** that measures the effect of Kage's repo
memory on coding-agent task performance using a recognized industry substrate —
not a homegrown metric.

## Why this design

The popular leaderboards (LoCoMo, LongMemEval, BEAM) test *conversational*
personalization memory — "the user told you X three sessions ago, recall it."
That is a different task from what Kage does (durable repo memory: commands,
bugs, conventions, code paths). Scoring Kage on LoCoMo would measure the wrong
thing.

The category-correct standard for a coding-memory tool is **SWE-bench Verified**
(human-verified real GitHub issues — the gold-standard coding-agent substrate),
run as a **memory ablation**: isolate memory as the single independent variable
and measure its effect on the recognized metrics. This mirrors the methodology
of the 2026 coding-agent-memory literature:

- **SWE-Bench-CL** (arXiv:2507.00014) — continual learning on SWE-bench
  Verified: can an agent accumulate experience, transfer knowledge across
  tasks, and resist forgetting.
- **SWE-ContextBench** (Zhu et al., 2026) — experience reuse from prior
  trajectories; oracle summaries lifted resolution ~8pts.
- **"The First Controlled Benchmark of AI Memory in Coding Agents"**
  (Sandelin, 2026) — isolates persistent memory as an independent variable,
  measuring resolution rate, token cost, and completion time on identical
  tasks.

## The experiment

Two arms, **everything identical except the memory layer**:

| | Agent scaffold | Model | Tasks | Step budget | Memory |
|---|---|---|---|---|---|
| `control` | fixed (this repo's `agent.py`) | same | same | same | none |
| `kage` | fixed (same `agent.py`) | same | same | same | Kage context injected per task + cross-task `kage_learn` capture |

Because only the memory layer varies, the **delta** between arms is attributable
to memory. (Absolute resolution rate is scaffold-dependent and is *not* the
headline number — the ablation delta is.)

**Continual-learning axis (Kage's core thesis).** Tasks are grouped by
repository and run in instance-id order, so memory captured on an early task in
a repo is available to later tasks in the same repo. This is the SWE-Bench-CL
"accumulate / transfer / resist forgetting" setup, applied to Kage.

### Metrics (recognized)
- **Resolution rate** — % of tasks whose generated patch passes the hidden
  tests, scored by the **official** SWE-bench evaluation harness.
- **Token cost** — total and per-task prompt + completion tokens.
- **Completion time** — wall-clock per task.

## Requirements

- Python **3.10+** (the official `swebench` harness requires it)
- **Docker** (per-task test-execution sandboxes — mandatory for scoring)
- `ANTHROPIC_API_KEY`
- Kage installed and on `PATH` (`npm i -g @kage-core/kage-graph-mcp`) for the
  `kage` arm
- `pip install -r requirements.txt`

> Sandbox note: this harness was authored in an environment **without Docker and
> on Python 3.9**, so the full scored run has **not** been executed here. The
> code is complete and self-contained; run it on a Docker host / CI to produce
> numbers. `make smoke` runs a no-Docker generation-only check first.

## Run

```bash
# 1. generation: produce patches for both arms (writes predictions + token/time metrics)
make pilot        # ~5 tasks, sanity run
make full         # full SWE-bench Verified

# 2. scoring: official SWE-bench harness (Docker) for each arm
make score ARM=control
make score ARM=kage

# 3. report: combine resolution rate + tokens + time into a table
make report
```

Outputs land in `benchmark/results/<run-id>/`:
- `preds_control.jsonl`, `preds_kage.jsonl` — SWE-bench-format predictions
- `metrics_control.json`, `metrics_kage.json` — tokens + wall-clock per task
- `report.md` — the ablation table (resolution / tokens / time, with deltas)

## Files
- `run_ablation.py` — orchestrator: loads the dataset, runs both arms, writes
  predictions + per-task token/time metrics.
- `agent.py` — the fixed minimal agent scaffold (Anthropic tool-use loop:
  read / grep / edit / run-tests inside the task's git checkout). Identical
  across arms.
- `kage_memory.py` — the swappable memory layer: builds an injected context
  block from `kage recall` for a task, and captures the outcome via `kage learn`
  so later same-repo tasks benefit.
- `score.sh` — wraps the official `swebench.harness.run_evaluation`.
- `report.py` — merges scoring + metrics into `report.md`.
