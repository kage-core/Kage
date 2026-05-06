# Kage Subagent Council Review

Date: 2026-04-30

Reviewed:

- `KAGE_MEMORY_SYSTEM_DESIGN.md`
- `KAGE_GRAPH_REGISTRY_DESIGN.md`

Council lanes:

- distributed systems and scale
- security, privacy, and enterprise adoption
- product, adoption, and community ecosystem
- agent memory and retrieval quality

## Consensus

The design is directionally strong. The best part is the core shift from
Markdown notes to source-backed memory packets, with repo/personal/org/public
scopes and `kage_recall` as the primary product surface.

The council's shared concern is scope. The full vision includes a memory system,
public graph, org registry, skill marketplace, MCP manager, docs CDN, PR bot,
and eval harness. That is the right north star, but too much for the first
launch.

The first launch should prove one thing:

> Kage makes a coding agent stop rediscovering repo knowledge.

## Highest Priority Design Changes

### 1. Packets Are Truth

Canonical memory packets are the source of truth. Indexes, graph views,
embeddings, summaries, Markdown, and CDN bundles are disposable generated
artifacts.

Design docs were patched to add source-of-truth rules, index generation IDs,
packet hashes, idempotent writes, and compare-and-swap expectations.

### 2. Redact Before Persistence

DLP after distillation is too late. Event logs may contain commands, diffs,
stack traces, PR comments, test output, secrets, customer IDs, internal URLs, and
emails.

Design docs were patched to require a pre-ingestion privacy gate before storage,
embedding, indexing, logging, or LLM processing.

### 3. Permissions Must Filter Retrieval Early

It is not enough to filter final results. Indexes, source refs, path matches,
embeddings, and "why matched" explanations can leak private architecture.

Design docs were patched to require permission filtering before candidate
generation, plus field/edge-level controls for derived artifacts.

### 4. Registry Content Is Untrusted Context

Read-only docs, public memories, skills, and MCP metadata can still
prompt-inject agents. MCP servers also add supply-chain and execution risk.

Design docs were patched to treat all registry assets as supply-chain inputs,
with signing, provenance, revocation, sandboxing, and trust levels.

### 5. Branch Overlays Need Merge-Base Semantics

The original branch overlay concept was right but underspecified. The council
called for overlays keyed by repo, base SHA, merge-base SHA, and head SHA, with
invalidation based on blob hashes, symbols, package changes, and failed
verification, not just path strings.

Design docs were patched with branch overlay identity and merge behavior.

### 6. Retrieval Should Be Multi-Stage

A static weighted score is too crude. Retrieval should use hard filters,
candidate generation, intent-aware reranking, duplicate/conflict collapse, then
context assembly.

Design docs were patched with a multi-stage pipeline and scope precedence:

```text
branch candidate > repo > team/org > personal > public
```

### 7. Review Must Live In Existing Workflows

Review will become tedious unless it is PR-coupled, one-click, suppressible, and
batched. Public promotion should be separate and opt-in.

Design docs were patched with suppression controls and review burden metrics.

### 8. Do Not Launch The Marketplace First

The registry is a large product. The first launch should ship curated docs and
skill packs for a few ecosystems, with MCP recommendations requiring manual
approval.

Recommended initial ecosystems:

- Next.js
- Stripe
- Prisma

## MVP Cut Line

Build first:

- packet schema v2
- repo-local packets in git
- generated local indexes
- local SQLite FTS
- `kage_recall`
- `kage_capture`
- PR-coupled review
- secret scanning
- source refs
- public graph read-only search

Defer:

- org cloud
- broad registry
- public contribution automation
- reputation profiles
- vector search
- MCP auto-discovery
- cross-repo inference
- complex graph UI

## Product Requirement

Within five minutes of install, Kage must show immediate value:

- detected stack
- run command
- test command
- important paths
- public gotchas relevant to dependencies
- first useful recall during real work

The user should feel:

> My agent knows the repo better already.

## Evaluation Additions

Add metrics beyond recall:

- harmful recall rate
- context block usefulness
- stale memory shown rate
- capture false positives
- capture false negatives
- reviewer burden
- permission leakage tests
- prompt-injection resistance
- long-horizon quality at 100, 1k, and 10k memories

## Final Council Verdict

Proceed, but narrow the first product.

The winning wedge is not "universal memory marketplace." It is:

> trustworthy repo memory plus excellent recall.

Once users trust that, the org registry, public graph, skills, MCPs, and docs CDN
become natural extensions instead of overwhelming infrastructure.
