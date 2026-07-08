---
type: "Decision"
title: "Structural index is canonical for code graph facts"
description: "Kage code graph generation should use the structural index as the canonical source for files, symbols, and imports. buildCodeGraph should no longer run the old capped per file extraction path for those facts; it should d"
resource: "mcp/kernel.ts"
tags: ["session-learning", "code-graph", "structural-index", "large-repo", "performance"]
timestamp: "2026-06-15T21:58:12.704Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:structural-index-is-canonical-for-code-graph-facts-1778296536480"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/kernel.test.ts"]
---

# Structural index is canonical for code graph facts

> Kage code graph generation should use the structural index as the canonical source for files, symbols, and imports. b…

Kage code graph generation should use the structural index as the canonical source for files, symbols, and imports. buildCodeGraph should no longer run the old capped per-file extraction path for those facts; it should derive rich bounded facts like calls, routes, tests, and packages on top of structural data, and keep limits at query/derived-fact time rather than file/symbol indexing time.
Evidence: Implemented in mcp/kernel.ts by adding structural imports, reading structural artifacts into buildCodeGraph, deriving code graph input hashes from structural fingerprint, and updating query/tests so files beyond the old 2000-file cap are in the normal code graph.
Verified by: npm test

## Verification

Implemented in mcp/kernel.ts by adding structural imports, reading structural artifacts into buildCodeGraph, deriving code graph input hashes from structural fingerprint, and updating query/tests so files beyond the old 2000-file cap are in the normal code graph.

# Citations

[1] explicit_capture (2026-05-09T03:15:36.480Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:structural-index-is-canonical-for-code-graph-facts-1778296536480","title":"Structural index is canonical for code graph facts","summary":"Kage code graph generation should use the structural index as the canonical source for files, symbols, and imports. buildCodeGraph should no longer run the old capped per file extraction path for those facts; it should d","body":"Kage code graph generation should use the structural index as the canonical source for files, symbols, and imports. buildCodeGraph should no longer run the old capped per-file extraction path for those facts; it should derive rich bounded facts like calls, routes, tests, and packages on top of structural data, and keep limits at query/derived-fact time rather than file/symbol indexing time.\nEvidence: Implemented in mcp/kernel.ts by adding structural imports, reading structural artifacts into buildCodeGraph, deriving code graph input hashes from structural fingerprint, and updating query/tests so files beyond the old 2000-file cap are in the normal code graph.\nVerified by: npm test","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","code-graph","structural-index","large-repo","performance"],"paths":["mcp/kernel.ts","mcp/kernel.test.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-09T03:15:36.480Z"}],"context":{"fact":"Kage code graph generation should use the structural index as the canonical source for files, symbols, and imports. buildCodeGraph should no longer run the old capped per-file extraction path for those facts; it should derive rich bounded facts like calls, routes, tests, and packages on top of structural data, and keep limits at query/derived-fact time rather than file/symbol indexing time.\nEvidence: Implemented in mcp/kernel.ts by adding structural imports, reading structural artifacts into buildCodeGraph, deriving code graph input hashes from structural fingerprint, and updating query/tests so files beyond the old 2000-file cap are in the normal code graph.\nVerified by: npm test","verification":"Implemented in mcp/kernel.ts by adding structural imports, reading structural artifacts into buildCodeGraph, deriving code graph input hashes from structural fingerprint, and updating query/tests so files beyond the old 2000-file cap are in the normal code graph."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:12.704Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"time","kind":"constant","sha256":"36aa0a901e7fda47d7d7571d9c21879432386e4418ed56010d7e03c9a91f5482"},{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"bounded","kind":"constant","sha256":"c3fc17594c058db2e1a1b9e8f33161d89ca175cd31aebed17389c75ac6709d43"},{"name":"fact","kind":"constant","sha256":"adb9d6a773dc4dacf5613a3e7d4225436f1a23ff67de02659a247304284b10c6"},{"name":"packages","kind":"constant","sha256":"b3f7f5751231d35d1ebe98313a00f4b11f967ab95d187f7c6ec82578a5ad5177"},{"name":"buildcodegraph","kind":"function","sha256":"d04454eff9471f248cf7db3a40c8052b38ee5e3215a41e71b1d3600eb78aa010"},{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"},{"name":"data","kind":"constant","sha256":"491aa781049f0ad6b9dc4a2b393461ed407cfa306b0cf11bfad03315940015d7"},{"name":"keep","kind":"constant","sha256":"3e5df93c6de57dbae093461e4198d2bc24bb055a50d3f6a8bd6449397fd00f3b"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"calls","kind":"constant","sha256":"4b435c2c9448e76bfa4e3a1f26d4c8c42059b4125bd76c0254a3af23bacd66a4"},{"name":"bounded","kind":"constant","sha256":"ff3f5c301d4311bd4d0787b820a1c3835be8ee14fbdb641eb003dbf14ffce58a"},{"name":"capped","kind":"constant","sha256":"3970ad21021b970742071b0ec3b960a6c80a5c8639069172a5cfedccb46da334"}]}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":4,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":173,"reverified_at":"2026-06-15T21:58:12.704Z","total_uses":4,"last_accessed_at":"2026-07-06T19:36:35.685Z"},"created_at":"2026-05-09T03:15:36.480Z","updated_at":"2026-07-03T16:16:26.717Z"}
```

