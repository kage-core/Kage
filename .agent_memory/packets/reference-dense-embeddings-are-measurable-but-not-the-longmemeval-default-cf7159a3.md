---
type: "Reference"
title: "Dense embeddings are measurable but not the LongMemEval default"
description: "A 50 question LongMemEval S slice showed Kage default recall and Kage plus dense local embeddings both reached R@10 100%, MRR 0.9575, and NDCG@10 0.9675. Dense local embeddings were slower on the slice, with 232ms median"
resource: "benchmarks/LONGMEMEVAL.md"
tags: ["session-learning", "benchmark"]
timestamp: "2026-05-17T19:47:52.247Z"
x-kage-id: "repo:https-github-com-kage-core-kage:reference:dense-embeddings-are-measurable-but-not-the-longmemeval-default-1779047272247"
x-kage-type: "reference"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "verified"
x-kage-paths: ["benchmarks/LONGMEMEVAL.md"]
---

# Dense embeddings are measurable but not the LongMemEval default

> A 50 question LongMemEval S slice showed Kage default recall and Kage plus dense local embeddings both reached R@10 1…

A 50-question LongMemEval-S slice showed Kage default recall and Kage plus dense local embeddings both reached R@10 100%, MRR 0.9575, and NDCG@10 0.9675. Dense local embeddings were slower on the slice, with 232ms median latency versus 189ms for default recall, so dense embeddings should stay opt-in and not become the headline/default path from this evidence.
Evidence: Reports written to /private/tmp/kage-external-bench/longmemeval-kage-default-50.json and /private/tmp/kage-external-bench/longmemeval-kage-embeddings-50.json; documented in benchmarks/LONGMEMEVAL.md and benchmarks/README.md.
Verified by: node benchmarks/longmemeval-kage-retrieval.mjs --data /private/tmp/kage-external-bench/longmemeval_s_cleaned.json --limit 50 --top-k 10; node benchmarks/longmemeval-kage-retrieval.mjs --data /private/tmp/kage-external-bench/longmemeval_s_cleaned.json --limit 50 --top-k 10 --embeddings

## Verification

Reports written to /private/tmp/kage-external-bench/longmemeval-kage-default-50.json and /private/tmp/kage-external-bench/longmemeval-kage-embeddings-50.json; documented in benchmarks/LONGMEMEVAL.md and benchmarks/README.md.

# Citations

[1] explicit_capture (2026-05-17T19:47:52.247Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:reference:dense-embeddings-are-measurable-but-not-the-longmemeval-default-1779047272247","title":"Dense embeddings are measurable but not the LongMemEval default","summary":"A 50 question LongMemEval S slice showed Kage default recall and Kage plus dense local embeddings both reached R@10 100%, MRR 0.9575, and NDCG@10 0.9675. Dense local embeddings were slower on the slice, with 232ms median","body":"A 50-question LongMemEval-S slice showed Kage default recall and Kage plus dense local embeddings both reached R@10 100%, MRR 0.9575, and NDCG@10 0.9675. Dense local embeddings were slower on the slice, with 232ms median latency versus 189ms for default recall, so dense embeddings should stay opt-in and not become the headline/default path from this evidence.\nEvidence: Reports written to /private/tmp/kage-external-bench/longmemeval-kage-default-50.json and /private/tmp/kage-external-bench/longmemeval-kage-embeddings-50.json; documented in benchmarks/LONGMEMEVAL.md and benchmarks/README.md.\nVerified by: node benchmarks/longmemeval-kage-retrieval.mjs --data /private/tmp/kage-external-bench/longmemeval_s_cleaned.json --limit 50 --top-k 10; node benchmarks/longmemeval-kage-retrieval.mjs --data /private/tmp/kage-external-bench/longmemeval_s_cleaned.json --limit 50 --top-k 10 --embeddings","type":"reference","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","benchmark"],"paths":["benchmarks/LONGMEMEVAL.md"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-17T19:47:52.247Z"}],"context":{"fact":"A 50-question LongMemEval-S slice showed Kage default recall and Kage plus dense local embeddings both reached R@10 100%, MRR 0.9575, and NDCG@10 0.9675. Dense local embeddings were slower on the slice, with 232ms median latency versus 189ms for default recall, so dense embeddings should stay opt-in and not become the headline/default path from this evidence.\nEvidence: Reports written to /private/tmp/kage-external-bench/longmemeval-kage-default-50.json and /private/tmp/kage-external-bench/longmemeval-kage-embeddings-50.json; documented in benchmarks/LONGMEMEVAL.md and benchmarks/README.md.\nVerified by: node benchmarks/longmemeval-kage-retrieval.mjs --data /private/tmp/kage-external-bench/longmemeval_s_cleaned.json --limit 50 --top-k 10; node benchmarks/longmemeval-kage-retrieval.mjs --data /private/tmp/kage-external-bench/longmemeval_s_cleaned.json --limit 50 --top-k 10 --embeddings","verification":"Reports written to /private/tmp/kage-external-bench/longmemeval-kage-default-50.json and /private/tmp/kage-external-bench/longmemeval-kage-embeddings-50.json; documented in benchmarks/LONGMEMEVAL.md and benchmarks/README.md."},"freshness":{"ttl_days":365,"last_verified_at":"2026-05-17T19:47:52.247Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":90,"reasons":["has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":224},"created_at":"2026-05-17T19:47:52.247Z","updated_at":"2026-05-19T04:50:14.988Z"}
```

