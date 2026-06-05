# Kage vs agentmemory — an honest comparison

agentmemory is an excellent, popular tool. If your goal is *"capture every
session and recall conversational context fast,"* it's mature and proven. This
page is honest about where it leads — and about the question it doesn't answer:
**can you trust what your agent memory tells you, and is it true about your
code right now?**

## The reframe: the benchmark matters

agentmemory's headline is **95.2% Recall@5 on LongMemEval-S**. LongMemEval is a
*conversational* memory benchmark — "the user told you X three sessions ago,
recall it." That is the right metric for a chat assistant. It is the **wrong
metric for a coding-memory tool**, where the job is durable repo knowledge
(decisions, bugs, conventions, code paths) that must stay *true as the code
changes*.

Kage measures the category-correct thing:
- **SWE-bench Verified memory ablation** — does memory actually make a coding
  agent resolve more real GitHub issues? (controlled, single-variable; see
  [`benchmark/`](../benchmark/README.md))
- **The Trust Benchmark** — does the memory refuse hallucinated citations,
  withhold stale memory, and stay grounded to real code? (`kage benchmark --trust`)

Recalling a fact fast is worthless if the fact is no longer true. **We benchmark
truth; they benchmark recall.**

### We ran their benchmark — honestly

We ran LongMemEval-S (470 non-abstention questions) so we're not accused of
dodging it. Kage strict, dependency-free recall scores **96.17% R@5 / 98.72%
R@10** (209ms median).

**This is not a clean head-to-head, and we won't pretend it is.** Two caveats
that prevent any "we beat them" claim:

- **Plain BM25 scores 96.60% R@5 in our own harness — higher than Kage.** So 96%
  here reflects an *easy, lexically-tractable protocol*, not a Kage retrieval
  edge. Kage is roughly at the BM25 level on this task.
- **Our BM25 baseline is 96.6%; agentmemory reports a BM25 baseline of 86.2%** —
  a ~10-point gap that proves the **protocols differ**. We retrieve at the
  *session* level (~53 candidate documents/question) on the *cleaned* dataset;
  their harder setup (finer granularity and/or original data) is why their
  vector system's edge over BM25 is larger.

**What we can honestly say:** Kage does strong, dependency-free retrieval on
LongMemEval-S session-level evidence. **What we cannot say:** that Kage beats
agentmemory — that needs their exact protocol (same granularity + dataset), and
they're far faster (14ms vs our 209ms). Reproduce ours:
`node benchmarks/longmemeval-kage-retrieval.mjs --data longmemeval_s_cleaned.json
--limit 470 --top-k 20` (see [benchmarks/LONGMEMEVAL.md](../benchmarks/LONGMEMEVAL.md)).

## Feature-by-feature (honest)

| | Kage | agentmemory |
|---|---|---|
| Automatic capture | ✅ 9 lifecycle hooks | ✅ 12 hooks (slight edge) |
| Retrieval | BM25 + local sparse-vector, **zero deps** | BM25 + vector + KG, RRF + rerank |
| LongMemEval-S | 96.17% R@5 (session-level, cleaned data; ≈ plain BM25) | 95.2% R@5 (different, harder protocol — *not* directly comparable) |
| Coding-correct benchmark | **SWE-bench ablation + Trust 100/100** | none (LongMemEval is conversational) |
| **Code graph + blast radius** | ✅ native | ❌ "no explicit code graph" (external tools) |
| **Write-time citation validation** | ✅ rejects hallucinated citations | ❌ "no validation layer" |
| **Stale exclusion at recall** | ✅ withholds deleted-evidence memory | ❌ "no staleness checking" |
| **Grounding to live code** | ✅ verifies citations exist | `memory_verify` traces to *observations*, not code |
| Storage / ownership | **git-native plain-text packets, reviewed in your PR** | SQLite + git *snapshots* |
| Team model | git-native (merge memory like code) | namespaced DB + p2p mesh |
| Dependencies | zero, no API key | zero external DB; optional LLM/embeddings |
| **Distribution / mindshare** | early | **21K★ (agentmemory leads by a mile)** |

## Where agentmemory genuinely leads
Credit where due: **distribution** (21K stars, Linux Foundation, Trendshift),
**capture breadth** (12 hooks), **retrieval sophistication** (triple-stream +
RRF), **maturity** (48 releases), and **breadth** (53 tools, mesh federation,
session replay). If you want the most-adopted general session-memory tool today,
that's them.

## Where only Kage can take you
Three things agentmemory's own docs say it does *not* do — and that matter most
when an agent acts on memory:
1. **It can't store a hallucinated citation.** Kage rejects memory citing files
   that don't exist, at write time.
2. **It won't serve you stale advice.** When cited code is deleted or expires,
   Kage withholds that memory from recall (and shows you, in the Suppression
   Shelf).
3. **It knows your code, not just your chat.** Memory links to the code graph;
   recall can return the 2-hop blast radius of a change.

And your memory is **plain text in your repo**, reviewed in the same pull request
as the code — not a SQLite blob you hope is right.

## The one-liner
**agentmemory remembers. Kage is the only one that can tell you whether what it
remembers is still true — and prove it on your repo:** `kage benchmark --trust`.
