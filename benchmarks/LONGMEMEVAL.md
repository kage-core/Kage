# LongMemEval-S Retrieval Benchmark

This benchmark evaluates Kage as a long-term memory retrieval system on the
official LongMemEval-S split.

It measures whether Kage retrieves the gold evidence session for each question.
It does not measure answer-generation accuracy.

## Setup

Dataset: `longmemeval_s_cleaned.json`

Questions evaluated: 470 non-abstention questions. The 30 abstention questions
are excluded because they do not have gold evidence sessions to retrieve.

Each LongMemEval-S session is imported as one approved Kage `reference` memory
packet. No LLM summarization, vector service, or answer model is used. Relative
temporal questions use the dataset's question date as retrieval-time metadata.
The headline run disables Kage's built-in semantic concept expansion so the
score is not based on phrase maps added after inspecting LongMemEval-style
misses. Product recall can still apply lightweight concept expansion for common
memory terms, but benchmark reports must label that mode explicitly with
`--semantic-expansion`. `kage recall --explain` exposes `temporal`, `semantic`,
and low-weight local sparse `vector` score components so expanded and vector
matches are inspectable instead of hidden inside a single lexical score.
Optional dense local embeddings are supported by `kage embeddings build` and by
this harness with `--embeddings --embedding-model Xenova/all-MiniLM-L6-v2`. The
reported headline benchmark does not use them so the run remains reproducible
without model downloads.

## Commands

```sh
node benchmarks/longmemeval-kage-retrieval.mjs \
  --data /path/to/longmemeval_s_cleaned.json \
  --limit 470 \
  --top-k 10 \
  --out /tmp/longmemeval-kage.json
```

Plain lexical baseline:

```sh
node benchmarks/longmemeval-bm25-baseline.mjs \
  --data /path/to/longmemeval_s_cleaned.json \
  --limit 470 \
  --top-k 10 \
  --out /tmp/longmemeval-bm25.json
```

Optional dense local embedding variant:

```sh
node benchmarks/longmemeval-kage-retrieval.mjs \
  --data /path/to/longmemeval_s_cleaned.json \
  --limit 470 \
  --top-k 10 \
  --embeddings \
  --embedding-model Xenova/all-MiniLM-L6-v2 \
  --out /tmp/longmemeval-kage-embeddings.json
```

Product semantic-expansion variant:

```sh
node benchmarks/longmemeval-kage-retrieval.mjs \
  --data /path/to/longmemeval_s_cleaned.json \
  --limit 470 \
  --top-k 10 \
  --semantic-expansion \
  --out /tmp/longmemeval-kage-product-semantic.json
```

## Current Result

Run date: 2026-05-18 · reproduced 2026-06-05 (470 questions, identical: 96.17% R@5 / 98.72% R@10, 209ms median)

| System | R@5 | R@10 | R@20 | MRR | NDCG@10 | Median latency |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Kage strict recall | 96.17% | 98.72% | 99.79% | 0.9094 | 0.9279 | 193 ms |
| Plain BM25 baseline | 96.60% | 98.09% | 99.57% | 0.9033 | 0.9215 | 7 ms |

Kage strict recall no longer claims the tuned 100% R@10 result. It trails plain
BM25 slightly on R@5, but still leads on R@10/R@20/MRR/NDCG@10 while using the
same repo-memory packet model Kage uses in product. Plain BM25 remains faster
because it builds a tiny in-memory per-question index and does not load Kage's
repo memory graph, quality metadata, freshness checks, or packet model.

## Dense Embedding Slice

Run date: 2026-05-18

Exploratory 50-question slice, same first 50 non-abstention questions:

| System | Questions | R@5 | R@10 | R@20 | MRR | NDCG@10 | Median latency |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Kage strict recall | 50 | 98.00% | 100.00% | 100.00% | 0.9575 | 0.9675 | 189 ms |
| Kage + dense local embeddings | 50 | 98.00% | 100.00% | 100.00% | 0.9575 | 0.9675 | 232 ms |

Dense local embeddings are useful as an opt-in semantic layer, but this slice
does not justify making them the default or using them as the headline result.
The default dependency-free recall path matched ranking quality on the slice and
was faster.

## Breakdown

| Question type | Questions | Kage R@10 | Kage MRR |
| --- | ---: | ---: | ---: |
| single-session-user | 64 | 100.00% | 0.9668 |
| multi-session | 121 | 99.17% | 0.9143 |
| single-session-preference | 30 | 93.33% | 0.5818 |
| temporal-reasoning | 127 | 97.64% | 0.8751 |
| knowledge-update | 72 | 100.00% | 0.9769 |
| single-session-assistant | 56 | 100.00% | 1.0000 |

## Interpretation

LongMemEval-S is a useful external sanity check for long-term memory retrieval.
It is not Kage's core use case. Kage is optimized for repo-local collaborative
memory: commands, gotchas, code rationale, decisions, files, symbols, tests,
review state, and graph-backed handoff between agents.

The result should be described as:

> On LongMemEval-S retrieval, Kage retrieves the gold evidence session in the
> top 10 for 98.72% of non-abstention questions, with 0.9094 MRR, using strict
> recall with semantic concept expansion disabled.

Do not describe this as LongMemEval answer accuracy.

## Next Retrieval Work

The remaining ranking weakness is first-position accuracy for preference
questions. Kage now persists its local sparse-vector packet index for normal
repo recall and the harness can measure the opt-in dense embedding path. The
next useful run is a full dense local embedding report to see whether semantic
embeddings or a reranker improve rank-one behavior on generic chat-memory
questions.
