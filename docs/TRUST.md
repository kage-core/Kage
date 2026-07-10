# The Kage Trust Benchmark

Retrieval benchmarks (R@5, NDCG, MRR) answer *"can the system find a memory?"*
They do not answer the question that actually decides whether agent memory helps
or hurts: **can you trust what it returns?** An agent that confidently acts on a
stale or hallucinated memory is worse than an agent with no memory at all.

The Trust Benchmark measures the three failure modes that make agent memory
dangerous — and that Kage is built to prevent.

```bash
kage benchmark --trust --project .
```

## What it measures

| Metric | Question | How Kage scores it |
|---|---|---|
| **Hallucinated-citation rejection** | Can fabricated memory get written? | Strict captures whose every cited path is missing must be *rejected at write time*. |
| **Stale-memory exclusion** | Does deleted-evidence memory still surface? | Memory grounded in real files at capture time must be *withheld from recall* once those files are deleted. |
| **Live grounding rate** | Is the repo's real memory anchored to real code? | Share of approved packets whose citations exist and aren't stale. |
| **Wrong-advice prevented** | Combined defense | Fraction of bad-memory attempts (hallucinated + stale) the system caught. |

## Methodology

The first two gates run in an **isolated sandbox** (a throwaway temp repo) so the
measurement is controlled and deterministic — Kage creates real files, captures
memory grounded in them, then deletes the files and observes recall behavior. The
grounding gate runs on **your real repository**. The sandbox is destroyed after
the run; your repo memory is never modified.

- *Hallucinated-citation rejection*: N strict captures cite files that never
  exist → count rejected. Target **100%**.
- *Stale-memory exclusion*: N memories cite real files (verified recallable
  first), the files are deleted, then recall is re-run → count withheld among the
  previously-recallable. Target **100%**.
- *Live grounding*: `verify_citations` over approved repo memory → grounded and
  not-stale share. Target **≥ 80%**.

The trust score is the mean of the three gate rates.

## Reference result (this repository, as of commit 57a18a3)

```
Kage Trust Benchmark — can this memory be trusted?
Trust score: 99/100  (PASS)
  Hallucinated-citation rejection: 100%  (8/8)
  Stale-memory exclusion:          100%  (8/8)
  Live grounding rate:             97%  (211/217 packets)
  Wrong-advice prevented:          100%
```

The packet count grows as this repo captures more memory, so the exact fraction
above will drift — that's expected. `kage benchmark --trust --project .` is the
same command that produced it; run it to see the current number.

## Why no one else reports this

These metrics are only meaningful if the system *has* the mechanisms to score
on: write-time citation validation, recall-time staleness exclusion, and
code-grounded memory. Tools that auto-capture everything into a vector store have
nothing to measure here — they cannot reject a hallucinated citation they never
checked, or withhold a memory whose grounding they never tracked.

Trust is the benchmark. Run it on your repo and compare.
