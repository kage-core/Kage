---
type: "Decision"
title: "Recall reuses persisted local sparse vector index"
description: "Kage now writes a persisted local sparse vector packet index at .agent memory/indexes/vector local.json during indexing and refresh. Recall validates the artifact against approved packet count and latest updated at, then"
resource: "mcp/kernel.ts"
tags: ["session-learning", "recall", "vector-local", "indexing", "performance"]
timestamp: "2026-06-15T21:58:33.725Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:recall-reuses-persisted-local-sparse-vector-index-1779032378023"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/kernel.test.ts", "README.md", "benchmarks/README.md", "benchmarks/LONGMEMEVAL.md"]
---

# Recall reuses persisted local sparse vector index

> Kage now writes a persisted local sparse vector packet index at .agent memory/indexes/vector local.json during indexi…

Kage now writes a persisted local sparse-vector packet index at .agent_memory/indexes/vector-local.json during indexing and refresh. Recall validates the artifact against approved packet count and latest updated_at, then reuses stored packet vectors instead of rebuilding every packet vector for every query. If the artifact is missing or stale, recall falls back to live vector scoring.
Evidence: Implemented SparseVectorIndex helpers, vector-local index writing, setup/doctor index expectations, and indexed recall scoring in mcp/kernel.ts. Added tests for vector-local index generation and recall using vector-local-index explanations.
Verified by: npm test --prefix mcp; git diff --check; node --check benchmarks/longmemeval-kage-retrieval.mjs

## Verification

Implemented SparseVectorIndex helpers, vector-local index writing, setup/doctor index expectations, and indexed recall scoring in mcp/kernel.ts. Added tests for vector-local index generation and recall using vector-local-index explanations.

# Citations

[1] explicit_capture (2026-05-17T15:39:38.023Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:recall-reuses-persisted-local-sparse-vector-index-1779032378023","title":"Recall reuses persisted local sparse vector index","summary":"Kage now writes a persisted local sparse vector packet index at .agent memory/indexes/vector local.json during indexing and refresh. Recall validates the artifact against approved packet count and latest updated at, then","body":"Kage now writes a persisted local sparse-vector packet index at .agent_memory/indexes/vector-local.json during indexing and refresh. Recall validates the artifact against approved packet count and latest updated_at, then reuses stored packet vectors instead of rebuilding every packet vector for every query. If the artifact is missing or stale, recall falls back to live vector scoring.\nEvidence: Implemented SparseVectorIndex helpers, vector-local index writing, setup/doctor index expectations, and indexed recall scoring in mcp/kernel.ts. Added tests for vector-local index generation and recall using vector-local-index explanations.\nVerified by: npm test --prefix mcp; git diff --check; node --check benchmarks/longmemeval-kage-retrieval.mjs","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","recall","vector-local","indexing","performance"],"paths":["mcp/kernel.ts","mcp/kernel.test.ts","README.md","benchmarks/README.md","benchmarks/LONGMEMEVAL.md"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-17T15:39:38.023Z"}],"context":{"fact":"Kage now writes a persisted local sparse-vector packet index at .agent_memory/indexes/vector-local.json during indexing and refresh. Recall validates the artifact against approved packet count and latest updated_at, then reuses stored packet vectors instead of rebuilding every packet vector for every query. If the artifact is missing or stale, recall falls back to live vector scoring.\nEvidence: Implemented SparseVectorIndex helpers, vector-local index writing, setup/doctor index expectations, and indexed recall scoring in mcp/kernel.ts. Added tests for vector-local index generation and recall using vector-local-index explanations.\nVerified by: npm test --prefix mcp; git diff --check; node --check benchmarks/longmemeval-kage-retrieval.mjs","verification":"Implemented SparseVectorIndex helpers, vector-local index writing, setup/doctor index expectations, and indexed recall scoring in mcp/kernel.ts. Added tests for vector-local index generation and recall using vector-local-index explanations."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:33.725Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"vectors","kind":"constant","sha256":"f4c6e8ce042eabf4e4a968e1292b7c68a21782503c4e0b78489d85020ffc9303"},{"name":"sparsevectorindex","kind":"constant","sha256":"200cd96073f8345e0d966d839750b14396813073a9571e3aa29667137dd2a78d"},{"name":"then","kind":"constant","sha256":"69e63ba481d1d2641d270176aed93aa51e363bcfe7c9903c448b032adf4c4129"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"},{"name":"doctor","kind":"constant","sha256":"64f4dea667b9fe091ab2751b52513175faaed7c1fc7206ffee9c115c0684ab5b"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"added","kind":"constant","sha256":"bc14da9c82da760a8d437c7e912b7909ab47e5de278fb9a951ae4702a8835975"},{"name":"approved","kind":"constant","sha256":"171aaa19fb00d03fd3ac915407ce29bf1b975dd242d15989e08241caf5c05506"},{"name":"missing","kind":"constant","sha256":"8c9fa6e4673545533b5cdc9a6ac45e775f0fb7ec7d969a7602c2d97d1411b01e"}]},{"path":"README.md","sha256":"9a533eee7962e84cdceef1bd8c9463233a575138fa143acafc8abd42f723944a","size":10477},{"path":"benchmarks/README.md","sha256":"34ffe0979b86578a900bfb7c13e6236aa7952b5867af6090c1501a54d9a41c16","size":9904},{"path":"benchmarks/LONGMEMEVAL.md","sha256":"5df10a3e759e49d4a1f48d158d4178ac75fcada36ec0efa45012a679359a3e40","size":5319}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":187,"reverified_at":"2026-06-15T21:58:33.725Z","total_uses":0,"last_accessed_at":"2026-07-09T21:58:48.598Z"},"created_at":"2026-05-17T15:39:38.023Z","updated_at":"2026-07-03T16:16:26.712Z"}
```

