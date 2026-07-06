---
type: "Runbook"
title: "LongMemEval harness can measure dense local embeddings"
description: "The LongMemEval S Kage retrieval harness now supports embeddings and embedding model, building .agent memory/indexes/embeddings local.json for each benchmark project and calling recallWithEmbeddings. This keeps the defau"
resource: "benchmarks/longmemeval-kage-retrieval.mjs"
tags: ["session-learning", "benchmark"]
timestamp: "2026-05-17T19:41:09.635Z"
x-kage-id: "repo:https-github-com-kage-core-kage:runbook:longmemeval-harness-can-measure-dense-local-embeddings-1779046869635"
x-kage-type: "runbook"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["benchmarks/longmemeval-kage-retrieval.mjs"]
---

# LongMemEval harness can measure dense local embeddings

> The LongMemEval S Kage retrieval harness now supports embeddings and embedding model, building .agent memory/indexes/…

The LongMemEval-S Kage retrieval harness now supports --embeddings and --embedding-model, building .agent_memory/indexes/embeddings-local.json for each benchmark project and calling recallWithEmbeddings. This keeps the default no-download benchmark intact while making the optional dense local retrieval path measurable against the same external dataset.
Evidence: Implemented in benchmarks/longmemeval-kage-retrieval.mjs and documented in benchmarks/README.md plus benchmarks/LONGMEMEVAL.md.
Verified by: node --check benchmarks/longmemeval-kage-retrieval.mjs; node benchmarks/longmemeval-kage-retrieval.mjs --data /private/tmp/kage-external-bench/longmemeval_s_cleaned.json --limit 1 --top-k 10 --embeddings; npm test --prefix mcp

## Verification

Implemented in benchmarks/longmemeval-kage-retrieval.mjs and documented in benchmarks/README.md plus benchmarks/LONGMEMEVAL.md.

# Citations

[1] explicit_capture (2026-05-17T19:41:09.635Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:runbook:longmemeval-harness-can-measure-dense-local-embeddings-1779046869635","title":"LongMemEval harness can measure dense local embeddings","summary":"The LongMemEval S Kage retrieval harness now supports embeddings and embedding model, building .agent memory/indexes/embeddings local.json for each benchmark project and calling recallWithEmbeddings. This keeps the defau","body":"The LongMemEval-S Kage retrieval harness now supports --embeddings and --embedding-model, building .agent_memory/indexes/embeddings-local.json for each benchmark project and calling recallWithEmbeddings. This keeps the default no-download benchmark intact while making the optional dense local retrieval path measurable against the same external dataset.\nEvidence: Implemented in benchmarks/longmemeval-kage-retrieval.mjs and documented in benchmarks/README.md plus benchmarks/LONGMEMEVAL.md.\nVerified by: node --check benchmarks/longmemeval-kage-retrieval.mjs; node benchmarks/longmemeval-kage-retrieval.mjs --data /private/tmp/kage-external-bench/longmemeval_s_cleaned.json --limit 1 --top-k 10 --embeddings; npm test --prefix mcp","type":"runbook","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","benchmark"],"paths":["benchmarks/longmemeval-kage-retrieval.mjs"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-17T19:41:09.635Z"}],"context":{"fact":"The LongMemEval-S Kage retrieval harness now supports --embeddings and --embedding-model, building .agent_memory/indexes/embeddings-local.json for each benchmark project and calling recallWithEmbeddings. This keeps the default no-download benchmark intact while making the optional dense local retrieval path measurable against the same external dataset.\nEvidence: Implemented in benchmarks/longmemeval-kage-retrieval.mjs and documented in benchmarks/README.md plus benchmarks/LONGMEMEVAL.md.\nVerified by: node --check benchmarks/longmemeval-kage-retrieval.mjs; node benchmarks/longmemeval-kage-retrieval.mjs --data /private/tmp/kage-external-bench/longmemeval_s_cleaned.json --limit 1 --top-k 10 --embeddings; npm test --prefix mcp","verification":"Implemented in benchmarks/longmemeval-kage-retrieval.mjs and documented in benchmarks/README.md plus benchmarks/LONGMEMEVAL.md."},"freshness":{"ttl_days":365,"last_verified_at":"2026-05-17T19:41:09.635Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":15,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":183,"total_uses":15,"last_accessed_at":"2026-07-06T18:23:57.684Z"},"created_at":"2026-05-17T19:41:09.635Z","updated_at":"2026-07-03T16:16:26.740Z"}
```

