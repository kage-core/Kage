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

## Feature-by-feature (honest)

| | Kage | agentmemory |
|---|---|---|
| Automatic capture | ✅ 9 lifecycle hooks | ✅ 12 hooks (slight edge) |
| Retrieval | BM25 + optional local embeddings | BM25 + vector + KG, RRF + rerank (more sophisticated) |
| Headline benchmark | **SWE-bench ablation + Trust 100/100** | 95.2% R@5 LongMemEval (conversational) |
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
