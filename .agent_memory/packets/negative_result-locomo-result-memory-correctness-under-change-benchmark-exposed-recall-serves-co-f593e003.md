---
type: "Negative Result"
title: "LoCoMo result + Memory-Correctness-Under-Change benchmark exposed recall serves content-changed (soft-stale) memory"
description: "Ran real LoCoMo snap research/locomo10.json, 1531 answerable Qs, cat5/evidence less excluded . Retrieval only no LLM : BM25 R@10 60.1%/R@5 51.9%; dense local embeddings R@10 62.2%/R@5 53.2%. HONEST: mediocre — LoCoMo is"
resource: "benchmarks/locomo-kage-retrieval.mjs"
tags: ["session-learning", "benchmark"]
timestamp: "2026-06-14T07:54:48.686Z"
x-kage-id: "repo:https-github-com-kage-core-kage:negative_result:locomo-result-memory-correctness-under-change-benchmark-exposed-recall-serves-co"
x-kage-type: "negative_result"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["benchmarks/locomo-kage-retrieval.mjs"]
---

# LoCoMo result + Memory-Correctness-Under-Change benchmark exposed recall serves content-changed (soft-stale) memory

> Ran real LoCoMo snap research/locomo10.json, 1531 answerable Qs, cat5/evidence less excluded . Retrieval only no LLM …

Ran real LoCoMo (snap-research/locomo10.json, 1531 answerable Qs, cat5/evidence-less excluded). Retrieval-only (no LLM): BM25 R@10 60.1%/R@5 51.9%; dense local embeddings R@10 62.2%/R@5 53.2%. HONEST: mediocre — LoCoMo is conversational, not Kage's code-memory use case; chasing it = fighting Glen/Hivemind on their turf where we're weakest. Do NOT publish as a win. Built benchmarks/locomo-kage-retrieval.mjs + staleness-kage.mjs. The staleness benchmark (the field's missing one: memory correctness AFTER code changes) revealed Kage stale-served = 50%, NOT 0%: it withholds memory whose cited file was DELETED (hard-stale, 15/15 suppressed) but SERVES memory whose cited file CHANGED CONTENT (soft-stale → flagged but returned, 15/15 served), with or without refresh. Naive capture-everything = 100%. FIX (on-brand, high-value): recall-time strict mode that withholds/down-ranks soft-stale (content-changed) memory, not just flags it → ~0% and makes the trust claim airtight. This benchmark is the YC-attention asset: define the category's missing metric, be the only tool that passes it — but only after the fix.

# Citations

[1] explicit_capture (2026-06-14T07:54:48.686Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:negative_result:locomo-result-memory-correctness-under-change-benchmark-exposed-recall-serves-co","title":"LoCoMo result + Memory-Correctness-Under-Change benchmark exposed recall serves content-changed (soft-stale) memory","summary":"Ran real LoCoMo snap research/locomo10.json, 1531 answerable Qs, cat5/evidence less excluded . Retrieval only no LLM : BM25 R@10 60.1%/R@5 51.9%; dense local embeddings R@10 62.2%/R@5 53.2%. HONEST: mediocre — LoCoMo is","body":"Ran real LoCoMo (snap-research/locomo10.json, 1531 answerable Qs, cat5/evidence-less excluded). Retrieval-only (no LLM): BM25 R@10 60.1%/R@5 51.9%; dense local embeddings R@10 62.2%/R@5 53.2%. HONEST: mediocre — LoCoMo is conversational, not Kage's code-memory use case; chasing it = fighting Glen/Hivemind on their turf where we're weakest. Do NOT publish as a win. Built benchmarks/locomo-kage-retrieval.mjs + staleness-kage.mjs. The staleness benchmark (the field's missing one: memory correctness AFTER code changes) revealed Kage stale-served = 50%, NOT 0%: it withholds memory whose cited file was DELETED (hard-stale, 15/15 suppressed) but SERVES memory whose cited file CHANGED CONTENT (soft-stale → flagged but returned, 15/15 served), with or without refresh. Naive capture-everything = 100%. FIX (on-brand, high-value): recall-time strict mode that withholds/down-ranks soft-stale (content-changed) memory, not just flags it → ~0% and makes the trust claim airtight. This benchmark is the YC-attention asset: define the category's missing metric, be the only tool that passes it — but only after the fix.","type":"negative_result","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","benchmark"],"paths":["benchmarks/locomo-kage-retrieval.mjs"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-06-14T07:54:48.686Z"}],"context":{"fact":"Ran real LoCoMo (snap-research/locomo10.json, 1531 answerable Qs, cat5/evidence-less excluded). Retrieval-only (no LLM): BM25 R@10 60.1%/R@5 51.9%; dense local embeddings R@10 62.2%/R@5 53.2%. HONEST: mediocre — LoCoMo is conversational, not Kage's code-memory use case; chasing it = fighting Glen/Hivemind on their turf where we're weakest. Do NOT publish as a win. Built benchmarks/locomo-kage-retrieval.mjs + staleness-kage.mjs. The staleness benchmark (the field's missing one: memory correctness AFTER code changes) revealed Kage stale-served = 50%, NOT 0%: it withholds memory whose cited file was DELETED (hard-stale, 15/15 suppressed) but SERVES memory whose cited file CHANGED CONTENT (soft-stale → flagged but returned, 15/15 served), with or without refresh. Naive capture-everything = 100%. FIX (on-brand, high-value): recall-time strict mode that withholds/down-ranks soft-stale (content-changed) memory, not just flags it → ~0% and makes the trust claim airtight. This benchmark is the YC-attention asset: define the category's missing metric, be the only tool that passes it — but only after the fix."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-14T07:54:48.686Z","path_fingerprints":[{"path":"benchmarks/locomo-kage-retrieval.mjs","sha256":"5fb046afc8cc9b84bfbcb9aadbcf6b7ebcd407ffa740883aaf27446b4a2a5433","size":7253}],"path_fingerprint_policy":"source_hash_staleness","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"discovery_tokens":2000,"discovery_tokens_estimated":true,"score":96,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":279,"total_uses":0,"last_accessed_at":"2026-07-09T22:27:33.173Z"},"created_at":"2026-06-14T07:54:48.686Z","updated_at":"2026-07-03T16:16:26.724Z","author_branch":"master"}
```

