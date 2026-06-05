# Kage benchmarks

We publish our own numbers and exactly how to reproduce them. We don't post
head-to-head tables against other tools — scores are only meaningful relative to
the harness that produced them, so cross-tool numbers measured on different
harnesses aren't a fair comparison. Run these yourself.

## 1. Trust Benchmark — the one that matters (and that we lead on)

The question retrieval benchmarks never ask: **can you trust what the memory
returns?** An agent acting on stale or hallucinated memory is worse than one with
none. This is Kage's differentiator.

```sh
kage benchmark --trust --project .
```

| Metric | This repo |
| --- | ---: |
| Hallucinated-citation rejection | 100% |
| Stale-memory exclusion | 100% |
| Live grounding rate | 99% |
| **Trust score** | **100 / 100** |

Methodology and what each gate means: [docs/TRUST.md](TRUST.md). Controlled gates
run in an isolated sandbox; grounding runs on your real repo.

## 2. Retrieval — competitive, dependency-free (a sanity check, not the headline)

We run the recognized long-term-memory retrieval benchmark, **LongMemEval-S**, as
an external sanity check. It is a *conversational* benchmark, not Kage's core use
case (durable repo memory), but it shows our retrieval is strong with **zero
dependencies — no vector database, no embedding model, no API key**.

| Metric | Kage strict recall |
| --- | ---: |
| R@5 | 96.17% |
| R@10 | 98.72% |
| R@20 | 99.79% |
| MRR | 0.909 |
| Median latency | ~210 ms |

```sh
node benchmarks/longmemeval-kage-retrieval.mjs \
  --data longmemeval_s_cleaned.json --limit 470 --top-k 20
```

**Read this honestly:** these are *session-level retrieval recall* scores (does
the gold evidence session appear in the top-K), not end-to-end QA accuracy. On
this dataset a plain BM25 baseline also reaches ~96.6% R@5 — i.e. the benchmark
is lexically tractable and most strong retrievers cluster at 95–97%. The takeaway
is *"Kage matches strong lexical retrieval with no dependencies,"* not *"Kage is
uniquely best at retrieval."* Details: [benchmarks/LONGMEMEVAL.md](../benchmarks/LONGMEMEVAL.md).

## 3. Coding-task memory — the category-correct benchmark

Retrieval recall doesn't tell you whether memory makes a coding agent *better*.
Kage ships a **SWE-bench Verified memory ablation** — a controlled, single-
variable experiment measuring whether repo memory improves real GitHub-issue
resolution. See [benchmark/README.md](../benchmark/README.md) for methodology and
how to run it.

## Principle

Lead with trust (ours, uncontested). Treat retrieval as a sanity check, stated
precisely. Never compare against a number measured on someone else's harness.
Every number here is reproducible with the commands above.
