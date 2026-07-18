# Kage External Benchmarks

> Not to be confused with [`benchmark/`](../benchmark/README.md) (singular) —
> this directory (plural) is the JS **retrieval/scale/staleness** suite
> (LongMemEval, MemoryArena, LoCoMo, synthetic scale). `benchmark/` is the
> Python **task-performance ablation** on real SWE-bench Verified tasks
> (memory on vs. off). Different substrate, different question.

This directory contains reproducible external benchmark harnesses for Kage.

Kage should not claim a generic memory win unless the benchmark proves it. These
scripts are intentionally explicit about what is measured and what is not.

## LongMemEval-S Retrieval

LongMemEval-S measures long-term memory retrieval over multi-session chat
histories. The Kage harness imports each LongMemEval-S session as one approved
repo-local memory packet, asks Kage to recall context for each question, and
checks whether the gold evidence session appears in the retrieved packets.

This is evidence retrieval, not answer-generation accuracy.

By default, relative temporal questions such as "two weeks ago" use the
dataset's question date as retrieval-time metadata. Disable that with
`--no-temporal-query-expansion` when you want a question-text-only run.
The benchmark harness disables Kage's built-in semantic concept expansion by
default, because benchmark-tuned phrase maps would weaken the claim. Pass
`--semantic-expansion` only when you explicitly want to measure the product
recall stack rather than the strict benchmark stack. Kage recall still includes
a low-weight local sparse-vector score. In normal repos that sparse vector index
is persisted at `.agent_memory/indexes/vector-local.json` during `kage refresh`,
so recall can reuse packet vectors instead of rebuilding them for every query.
The lexical tokenizer is Unicode-aware and adds CJK bigrams so multilingual
memory remains searchable even when terms are not space-separated. The plain
BM25 baseline does not use this index.

Kage also supports an optional dense local embedding artifact after installing
`@xenova/transformers` in the same Node environment as Kage:
`kage embeddings build --project .` followed by
`kage recall "query" --project . --embeddings`. The LongMemEval-S harness can
also run this path with `--embeddings --embedding-model Xenova/all-MiniLM-L6-v2`.
The headline numbers below use the strict no-semantic-expansion stack so the
benchmark stays reproducible without model downloads, embedding services, or
dataset-derived phrase tuning.

```sh
node benchmarks/longmemeval-kage-retrieval.mjs \
  --data /path/to/longmemeval_s_cleaned.json \
  --limit 470 \
  --top-k 10 \
  --out /tmp/kage-longmemeval.json
```

Run the optional dense local embedding variant:

```sh
node benchmarks/longmemeval-kage-retrieval.mjs \
  --data /path/to/longmemeval_s_cleaned.json \
  --limit 470 \
  --top-k 10 \
  --embeddings \
  --embedding-model Xenova/all-MiniLM-L6-v2 \
  --out /tmp/kage-longmemeval-embeddings.json
```

Run the product semantic-expansion variant:

```sh
node benchmarks/longmemeval-kage-retrieval.mjs \
  --data /path/to/longmemeval_s_cleaned.json \
  --limit 470 \
  --top-k 10 \
  --semantic-expansion \
  --out /tmp/kage-longmemeval-product-semantic.json
```

Run the plain lexical baseline on the same split:

```sh
node benchmarks/longmemeval-bm25-baseline.mjs \
  --data /path/to/longmemeval_s_cleaned.json \
  --limit 470 \
  --top-k 10 \
  --out /tmp/kage-longmemeval-bm25.json
```

Metrics reported:

- Recall@5, Recall@10, Recall@20
- MRR
- NDCG@5, NDCG@10, NDCG@20
- median and p95 retrieval latency
- per-question-type breakdown

## Synthetic Memory Scale

`scale-kage-memory.mjs` measures how Kage behaves as repo-memory packets grow.
It generates approved repo-local memory packets, runs `kage refresh` through the
kernel, and measures index time, top-k hit rate, recall latency, and context
reduction versus loading all memory text.

```sh
node benchmarks/scale-kage-memory.mjs \
  --sizes 240,1000,5000 \
  --top-k 10 \
  --out /tmp/kage-scale-memory.json
```

This is a scale sanity check, not an academic benchmark. Use it to verify that
Kage keeps cross-session recall useful as shared repo memory grows.

Current local run on 2026-05-17:

| Packets | Refresh/index | Hit rate @10 | Median recall | p95 recall | Context reduction |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 240 | 372 ms | 100.00% | 13 ms | 17 ms | 95.79% |
| 1,000 | 1,041 ms | 100.00% | 55 ms | 61 ms | 98.99% |
| 5,000 | 7,804 ms | 100.00% | 334 ms | 361 ms | 99.80% |

## Coding Memory Quality

`coding-memory-quality.mjs` is a Kage-native coding-memory quality
benchmark for repo learnings. It creates a labeled 240-packet corpus with
durable runbooks, decisions, bug causes, code explanations, and hard-negative
adjacent notes, then measures whether Kage retrieves the labeled packets for 20
coding-agent queries.

```sh
node benchmarks/coding-memory-quality.mjs \
  --out /tmp/kage-coding-memory-quality.json
```

The same benchmark ships in the Kage package:

```sh
kage benchmark --memory-quality --json
```

The packaged benchmark also includes a source-diversity probe: one noisy
observed session competes with one independent observed session. Passing means
Kage includes the independent source in the top 4 instead of letting one
session occupy every result.

Current local run on 2026-05-18:

| Packets | Queries | Refresh/index | R@5 | R@10 | NDCG@10 | MRR | Median recall | Context reduction | Source diversity |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 240 | 20 | 530 ms | 100.00% | 100.00% | 1.0000 | 1.0000 | 21 ms | 95.36% | pass, 2 sources in top 4 |

## Injection Relevance

`injection-relevance-kage.mjs` answers, repeatably: does the proxy's automatic
memory injection attach the RIGHT memories, and only when the prompt deserves
them? The decision under test is `composeInjection` in `mcp/proxy.ts` — it
injects whatever `recall(projectDir, query, 4, false)` returns, with NO
relevance gate. The harness imports the REAL compiled `composeInjection` from
`mcp/dist/proxy.js` and drives it through a recording fake gateway, so the eval
cannot drift from production; a byte-identical diagnostic `recall` call
(non-mutating, `trackAccess: false`) attaches packet identities and scores, and
any disagreement between the two is reported as a per-case error, never
skipped.

It seeds two deterministic stores at runtime through the kernel's own
`capture()` — a 3-packet SMALL store (payments-idempotency, test-runbook,
deploy-gotcha) and a 150-packet LARGE store (the same 3 topics plus 12
hand-written collision carriers and 135 template-synthesized packets across
decision/gotcha/runbook/convention) — then scores labeled queries in three
classes: CONTENT-FREE ("Reply with the single word: pong", "thanks, looks
good", "ok continue", "yes do it", "hello", "fix it" — should inject nothing),
REAL-RELEVANT (should inject; the top hit must be the labeled packet), and
REAL-BUT-ABSENT (genuine questions whose topic has no packet — injection is
noise).

```sh
npm run build --prefix mcp
node benchmarks/injection-relevance-kage.mjs                  # summary JSON on stdout, baseline block on stderr
node benchmarks/injection-relevance-kage.mjs --json           # full report with the per-case table
node benchmarks/injection-relevance-kage.mjs --out /tmp/kage-injection.json
node benchmarks/injection-relevance-kage.mjs --assert-baseline  # exit 1 only on regression below the recorded baseline
npm run bench:injection --prefix mcp
```

This eval MEASURES; it does not flatter. The recorded 2026-07-16 baseline is
the current ungated injector and it is known-imperfect — the harness records
it and exits 0. It is NOT part of `npm test`. `--assert-baseline` fails only
when a metric regresses below the recorded baseline (or any case errors).

Recorded 2026-07-16 baseline (31 cases, 0 errors):

| Metric | Baseline | Reading |
| --- | ---: | --- |
| injection_precision | 0.1538 | of prompts that injected, how often EVERY injected packet was labeled relevant |
| false_injection_rate (large store) | 1.0000 | every content-free prompt injects on the 150-packet store — the pong problem |
| false_injection_rate (small store) | 0.3333 | "ok continue" and "fix it" inject even on 3 packets |
| small_store_recall | 1.0000 | small-store real questions always inject their expected packet — the metric an absolute score floor destroys |
| expected_top_hit_rate | 1.0000 | when a real question injects, the labeled packet ranks first |
| absent_injection_rate (overall) | 0.8750 | genuine questions on absent topics still attract weakly-related noise |

The score bands reproduce the measured negative result (see the
`negative_result` packet "recall scores are not corpus-normalized"): a
genuinely relevant small-store hit for a naturally-phrased question scores
25.03 — inside the large store's content-free noise band (max 34.64) — and
"fix it" (34.39) outscores a real question's top hit (30.80). Recall scores
are match-strength sums, not corpus-normalized relevance, so no absolute
injection floor can remove large-store noise without silencing small/new
repos.

This harness is the acceptance gate for the "corpus-normalized relevance"
kernel task: a real fix moves false_injection_rate and absent_injection_rate
down and injection_precision up WITHOUT moving small_store_recall or
expected_top_hit_rate down. Run it with `--assert-baseline` before and after
that change.

## Capture Quality

`capture-quality-kage.mjs` is the mirror image of Injection Relevance. That
harness measures the EXTRACTION side (does recall/injection attach the right
memories?); this one measures the INGESTION side — the gate BEFORE recall: does
Kage capture the RIGHT things, quarantine junk, and refuse garbage, so that only
useful, grounded memory ever becomes recall-visible? A memory that never should
have been stored cannot be fixed by a better ranker.

The decision under test is the REAL ingestion surface imported from
`mcp/dist/kernel.js` — `learn()`, `capture()`, `observe()`, `distillSession()` —
plus the REAL `recall()` used to prove visibility. Nothing is mirrored: if the
signal gate (`observationSignalScore` / `AUTO_DISTILL_SIGNAL_THRESHOLD`), the
empty-body reject, the citation reject, the ungrounded-utterance quarantine, the
dedup flag, or recall's exclusion of pending/stale/superseded regresses, this
eval moves. Recall-visibility is defined exactly as production defines it —
`loadApprovedPackets` (the `packets` dir AND status `approved`) minus the
just-in-time staleness gate — so "not recall-visible" here means the same thing
it means to an agent at session start.

It seeds one deterministic project at runtime (real source files so citations
ground) and scores five labeled ingestion classes, several of them the golden
cases the 2026-07-16 audit found by hand:

- GOOD LEARNINGS (4, across decision/runbook/gotcha/convention): grounded,
  substantive, cited to a real seeded file. Must be ACCEPTED (`ok` + `approved`)
  AND recall-visible AND well-scored.
- EMPTY/DEGENERATE (3): empty body, whitespace-only, and the golden
  misnamed-param case (insight under the wrong param name, so `learning` is empty
  but evidence makes the body non-empty). `learn()` must return `ok:false` and
  write NO packet file (checked by counting `packets/` + `pending/` before/after).
- UNGROUNDED (2): a learning citing only a nonexistent path (rejected), and an
  ungrounded conversational outburst (quarantined to `pending`). Neither may
  become a trusted recall-visible repo fact.
- JUNK OBSERVATIONS (4): a raw shell line, a `Tool failed:{json}` command dump, a
  content-free "thanks, looks good", and a generic "file changed" — fed through
  `observe()` / `distillSession(auto)` as the Stop hook does, then asserted NOT
  returned by `recall()` (they may sit gated in `pending`; that is correct).
- DUPLICATES (2): the same substantive learning captured twice. The second must
  be flagged (`quality.duplicate_candidates`), not silently stored.

```sh
npm run build --prefix mcp
node benchmarks/capture-quality-kage.mjs                 # summary JSON on stdout, per-case table + baseline block on stderr
node benchmarks/capture-quality-kage.mjs --json          # full report with the per-case table
node benchmarks/capture-quality-kage.mjs --out /tmp/kage-capture.json
node benchmarks/capture-quality-kage.mjs --assert-baseline  # exit 1 only on regression below the recorded baseline
npm run bench:capture --prefix mcp
```

This eval MEASURES; it does not flatter. The recorded 2026-07-16 baseline is the
current ingestion path, and it is honestly imperfect — the harness records it and
exits 0. It is NOT part of `npm test`. `--assert-baseline` fails only when a
metric regresses below the recorded baseline (or any case errors).

Recorded 2026-07-16 baseline (15 cases, 0 errors):

| Metric | Baseline | Reading |
| --- | ---: | --- |
| junk_quarantine_rate | 1.0000 | fraction of JUNK observations that end up NON-recall-visible (all 4 gate to `low_signal`, 0 approved candidates) |
| false_ingest_rate | 0.0000 | JUNK that DID become recall-visible — the historical-leak metric; target 0 |
| good_acceptance_rate | 1.0000 | GOOD learnings accepted AND recall-visible (quality score 100 each) |
| empty_rejection_rate | 1.0000 | EMPTY/DEGENERATE inputs `learn()` refuses with no file written — includes the golden misnamed-param case |
| ungrounded_containment_rate | 1.0000 | UNGROUNDED inputs that do NOT become trusted recall-visible facts (one rejected, one quarantined) |
| dedup_rate | 0.5000 | DUPLICATE re-captures flagged — see below |

The eval exposed one real ingestion weakness, recorded honestly rather than
hidden: `dedup_rate` is 0.5. An exact re-capture of a learning is flagged
(Jaccard ~0.9 against the original), but a moderate PARAPHRASE of the same
learning falls below the kernel's 0.58 Jaccard duplicate-candidate threshold and
is silently stored as a redundant packet. A stronger near-duplicate matcher would
move this to 1.0 without moving anything else — run with `--assert-baseline`
before and after that change.

## Reuse Value

`reuse-value-kage.mjs` validates Kage's headline claim — the **reuse-savings
thesis**. Kage's proxy INJECTS memory, so on a single prompt it ADDS tokens; it
does not compress. The claim is a REUSE claim: having the memory means the agent
does not re-derive or re-read knowledge it already captured, saving tokens ACROSS
a task. This harness measures the part of that thesis that is DETERMINISTICALLY
measurable with no agent and no network: for a labeled (query, the fact needed to
answer it, the file(s) that carry that fact), does the recalled memory BODY
contain the fact, so the agent could answer from memory instead of opening those
files?

The decision under test is the REAL `recall()` imported from `mcp/dist/kernel.js`
(non-mutating, `trackAccess: false`), not a mirror. It seeds a deterministic store
through the kernel's own `capture()`: 5 RELEVANT packets whose body carries a
non-obvious fact, each cited to real seeded files that ALSO contain that fact, plus
4 CONTROL queries whose ANSWER fact is in NO packet body (three of them deliberately
share topic vocabulary with a packet, so recall DOES return a packet — but not the
answer). Two construction guards keep the labels fair and error loudly if violated:
each relevant fact lives in exactly one packet body (and in each of its cited files),
and each control's absent fact lives in zero packet bodies.

```sh
npm run build --prefix mcp
node benchmarks/reuse-value-kage.mjs                 # summary JSON on stdout, per-case table + baseline block on stderr
node benchmarks/reuse-value-kage.mjs --json          # full report with the per-case table
node benchmarks/reuse-value-kage.mjs --out /tmp/kage-reuse.json
node benchmarks/reuse-value-kage.mjs --assert-baseline  # exit 1 only on regression below the recorded baseline
npm run bench:reuse --prefix mcp
```

This eval MEASURES; it does not flatter. It is NOT part of `npm test`.
`--assert-baseline` fails only when a metric regresses below the recorded baseline
(or any case errors).

Recorded 2026-07-17 baseline (9 cases, 0 errors):

| Metric | Baseline | Reading |
| --- | ---: | --- |
| answer_from_memory_rate | 1.0000 | RELEVANT queries whose recalled memory body contains the labeled fact (all 5 answered, each as the top hit) |
| files_avoided | 8 | cited files the agent would not need to open across the answered relevant queries (of 8 possible) |
| false_help_rate | 0.0000 | CONTROL queries the harness wrongly credited to memory — target 0 |

The honesty proof is in the score bands: `control_recall_returned_rate` is 1.0 —
every control DID recall a topical packet (1–2 each) — yet `false_help_rate` stays
0, because the harness credits memory only when the ANSWER fact is actually present,
never on mere recall. If someone weakened the harness to credit on recall alone, the
topic-overlap controls would flip to false-help and this metric would jump.

**Honest scope.** `answer_from_memory_rate` is a deterministic PROXY for reuse
value: it shows the answer was PRESENT in memory, so the agent COULD skip the cited
files. It is NOT the end-to-end TOKEN DELTA (an agent run WITH memory vs WITHOUT,
netting the injection's own added tokens against the files not read). That delta
needs a live A/B agent run and is deliberately NOT claimed here — no token-savings
number is fabricated.

### Receipts cross-check (the measured cost next to the estimate)

The same script has a `--receipts` mode that puts the MEASURED cost of injection
next to that estimate. It reads the real transformation receipts from the local
vNext store through the same shipped runtime client the audit report uses
(`readLocalReceipts`, `tokenDelta`, `costDelta`), and reports what injection
actually ADDED.

```sh
node benchmarks/reuse-value-kage.mjs --receipts                       # cross-check the current repo's store
node benchmarks/reuse-value-kage.mjs --receipts --project /path/repo  # a specific repo
node benchmarks/reuse-value-kage.mjs --receipts --json
```

Three honesty rules it never breaks:

- **Injected bytes are measured; tokens are only claimed two-sided.** Every
  transformed receipt counts before/after input bytes, so `injected_bytes` is a real
  measured footprint — but it is NEVER converted to tokens. `injected_tokens` needs a
  receipt measured on BOTH sides (before AND after input tokens); an audit-mode
  receipt measures only the forwarded original, so a pure audit store reports
  `injected_tokens` as unavailable, not zero.
- **No receipts → null with a reason, never a fabricated zero.** A repo with no store
  reports `no_receipt_store`; a readable-but-empty store reports `empty_audit_period`.
- **The saving stays an estimate.** `savings_status` is `estimated_only`: this mode
  measures the COST of injection; the rediscovery SAVING it offsets is still the
  estimate from `kage gains`, until a live A/B agent run exists.

Recorded 2026-07-17 cross-check on the Kage repo's own store (8 receipts, all
`measurement_quality: partial`):

| Field | Value | Measured? |
| --- | ---: | --- |
| injected_bytes (added) | 38,737 bytes over 8 receipts (audit +30,449, assist +8,288) | MEASURED |
| injected_tokens | unavailable (`no_measured_token_pair`) | not two-sided → not claimed |
| input_cost | unavailable (`no_two_sided_cost_measurement`) | not priceable → not claimed |
| savings_status | `estimated_only` | the reuse saving is an estimate until a live A/B |

That is the whole point of the cross-check: even the injection COST is only
byte-measured here (no receipt carried both token sides), and the rediscovery SAVING
remains an estimate. The measured number sits next to the estimate, and neither
pretends to be the other.

## Real-Body Compression (Phase D)

`compression-realbody-kage.mjs` measures the OTHER half of Kage's savings story
added in Phase D: the proxy's **protect mode** can now REVERSIBLY compress a request
body (exact original stored in the content-addressed store, a `kage-content:<sha256>`
marker embedded so nothing is irretrievably dropped). The Phase D gate test proves
that mechanism is reversible, byte-preserving-on-failure, and net-negative — but it
measures the savings NUMBER on a synthetic corpus engineered to compress (400
identical log lines). This benchmark instead runs the SHIPPED built-in compressors
over REAL repository bodies and reports the honest per-type savings.

```sh
npm run build --prefix mcp
node benchmarks/compression-realbody-kage.mjs          # per-body table + real-body median net
node benchmarks/compression-realbody-kage.mjs --json   # machine-readable
npm run bench:compression --prefix mcp
```

Measured result (real bodies, shipped compressors, net of the retrieval marker):

| Body | Net saving | Decision |
| --- | ---: | --- |
| real git diff (HEAD) | ~0.1% | keep (marginal) |
| real source (transform.ts) | 0% | passthrough (no compressor supports code) |
| real JSON (mcp/package.json) | negative | passthrough (net-of-marker does not shrink) |
| synthetic repetitive log (contrast) | ~99% | keep |

**The honest headline: real-body median NET saving is ~0%.** Compression pays off
dramatically on genuinely repetitive payloads (repeated log/error runs — the ~99%
row) but nets ~0% on typical diffs, code, and JSON. Crucially, the pipeline PASSES
THROUGH byte-preserving whenever the compressed output plus its marker does not
actually shrink the body, so it never claims a saving it did not achieve. This is
why `kage up` keeps **audit** as the default and `lossy_compression` defaults false:
the compression path is real and safe, but its value is payload-dependent and is
measured, never estimated. This benchmark is NOT part of `npm test`.

## Memory Scale

`scale-kage-memory.mjs` measures whether Kage can search a growing repo-memory
corpus without loading every packet into context.

```sh
node benchmarks/scale-kage-memory.mjs \
  --sizes 240,1000,5000 \
  --out /tmp/kage-scale-memory.json
```

The same benchmark ships in the Kage package:

```sh
kage benchmark --scale --sizes 240,1000,5000 --json
```

It reports per-size refresh time, top-k hit rate, median/p95 recall latency,
all-memory tokens, returned context tokens, and context reduction.

This is not a replacement for LongMemEval-S. Use it as a regression harness for
coding-agent memory behavior: exact repo lore, bug causes, runbooks, decisions,
and hard-negative adjacent context.

When launched with `kage viewer --project .`, Kage writes
`.agent_memory/reports/benchmark.json` with a proof ledger for the dashboard.
Each ledger item includes the measured metric, pass threshold, exact command,
and next action so benchmark claims stay reproducible instead of becoming README
copy.

## Dense Embedding Slice

The LongMemEval-S harness can run optional dense local embeddings. A 50-question
slice on 2026-05-18 matched strict recall quality but was slower:

| Mode | Questions | R@10 | MRR | Median latency |
| --- | ---: | ---: | ---: | ---: |
| Strict Kage recall | 50 | 100.00% | 0.9575 | 189 ms |
| Dense local embeddings | 50 | 100.00% | 0.9575 | 232 ms |

Treat dense embeddings as an opt-in semantic layer, not the default headline.

## SWE-bench Context Retrieval

`swebench-kage-context.mjs` is a context-retrieval harness, not an official
SWE-bench patch evaluation. It checks whether Kage retrieves files touched by
gold patches for SWE-bench instances.

## MemoryArena Context Recall

`memoryarena-kage-context.mjs` is the first MemoryArena adapter for Kage. It is
not the official MemoryArena task-solving score. The harness imports prior
subtask answers as repo-local Kage memory, asks the next subtask as a recall
query, and measures whether Kage retrieves those earlier task memories. This
tests Kage's cross-session context handoff behavior without using an answer
model.

Download a MemoryArena split from Hugging Face:

```sh
mkdir -p /tmp/kage-memoryarena
curl -L \
  https://huggingface.co/datasets/ZexueHe/memoryarena/resolve/main/progressive_search/data.jsonl \
  -o /tmp/kage-memoryarena/progressive_search.jsonl
```

Run the Kage context-recall harness:

```sh
node benchmarks/memoryarena-kage-context.mjs \
  --dataset /tmp/kage-memoryarena/progressive_search.jsonl \
  --suite progressive_search \
  --limit 25 \
  --top-k 10 \
  --out /tmp/kage-memoryarena-progressive-search.json
```

Report this as "MemoryArena context recall", not MemoryArena answer accuracy.
Official MemoryArena scoring needs an agent/LLM to use the recalled context and
produce answers in the environment loop.

Run the official-style answer-accuracy harness when an LLM key is available:

```sh
OPENAI_API_KEY=... node benchmarks/memoryarena-kage-answer.mjs \
  --dataset /tmp/kage-memoryarena/progressive_search.jsonl \
  --suite progressive_search \
  --limit 221 \
  --top-k 10 \
  --provider openai \
  --model gpt-4.1-mini \
  --out /tmp/kage-memoryarena-progressive-search-answer.json
```

The answer harness runs Kage recall, asks the model to answer each subtask, then
compares the model output to the gold answer. After each subtask it saves the
gold answer as memory to model environment feedback available to later
sessions. `--provider gold` exists only to smoke-test the scorer and must never
be reported as model accuracy.

Current full context-recall run on 2026-05-18:

| Split | Tasks | Average dependency coverage | Final-step dependency coverage | Median recall |
| --- | ---: | ---: | ---: | ---: |
| bundled_shopping | 150 | 100.00% | 100.00% | 1 ms |
| progressive_search | 221 | 98.75% | 98.96% | 1 ms |
| group_travel_planner | 270 | 100.00% | 100.00% | 2 ms |
| formal_reasoning_math | 40 | 94.99% | 85.28% | 3 ms |
| formal_reasoning_phys | 20 | 95.43% | 98.38% | 1 ms |
| **Total / weighted** | **701** | **99.19%** | **98.79%** | - |

The weakest split is `formal_reasoning_math`, where several final subtasks need
more symbolic/rationale-aware recall than lexical prior-answer retrieval gives
today.

Official SWE-bench resolved-rate evaluation still requires generated patches and
the official SWE-bench Docker/cloud harness.

```sh
node benchmarks/swebench-kage-context.mjs \
  --dataset /path/to/swebench_lite.jsonl \
  --repo-cache /path/to/repo/checkouts \
  --limit 20 \
  --top-k 10 \
  --out /tmp/kage-swebench-context.json
```
