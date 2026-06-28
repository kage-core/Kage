---
type: "Decision"
title: "Structural index uses parallel workers on large repos"
description: "Kage structural index should parallelize per file structural extraction with worker threads once the file count crosses the configured threshold. Keep the public buildStructuralIndex API synchronous for refresh/index/MCP"
resource: "mcp/kernel.ts"
tags: ["session-learning", "performance", "indexing", "large-repo", "structural-index"]
timestamp: "2026-06-15T21:58:00.465Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:structural-index-uses-parallel-workers-on-large-repos-1778295444777"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "verified"
x-kage-paths: ["mcp/kernel.ts", "mcp/structural-worker.ts", "mcp/kernel.test.ts"]
---

# Structural index uses parallel workers on large repos

> Kage structural index should parallelize per file structural extraction with worker threads once the file count cross…

Kage structural index should parallelize per-file structural extraction with worker threads once the file count crosses the configured threshold. Keep the public buildStructuralIndex API synchronous for refresh/index/MCP compatibility; workers write batch results to generated temp files and the parent merges them deterministically. Tune with KAGE_STRUCTURAL_WORKERS and KAGE_STRUCTURAL_PARALLEL_MIN_FILES.
Evidence: Implemented in mcp/kernel.ts and mcp/structural-worker.ts; covered by mcp/kernel.test.ts structural index large-budget test and verified with KAGE_STRUCTURAL_PARALLEL_MIN_FILES=1 node mcp/dist/cli.js structural-index --project . showing Workers: 8.
Verified by: npm test

## Verification

Implemented in mcp/kernel.ts and mcp/structural-worker.ts; covered by mcp/kernel.test.ts structural index large-budget test and verified with KAGE_STRUCTURAL_PARALLEL_MIN_FILES=1 node mcp/dist/cli.js structural-index --project . showing Workers: 8.

# Citations

[1] explicit_capture (2026-05-09T02:57:24.777Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:structural-index-uses-parallel-workers-on-large-repos-1778295444777","title":"Structural index uses parallel workers on large repos","summary":"Kage structural index should parallelize per file structural extraction with worker threads once the file count crosses the configured threshold. Keep the public buildStructuralIndex API synchronous for refresh/index/MCP","body":"Kage structural index should parallelize per-file structural extraction with worker threads once the file count crosses the configured threshold. Keep the public buildStructuralIndex API synchronous for refresh/index/MCP compatibility; workers write batch results to generated temp files and the parent merges them deterministically. Tune with KAGE_STRUCTURAL_WORKERS and KAGE_STRUCTURAL_PARALLEL_MIN_FILES.\nEvidence: Implemented in mcp/kernel.ts and mcp/structural-worker.ts; covered by mcp/kernel.test.ts structural index large-budget test and verified with KAGE_STRUCTURAL_PARALLEL_MIN_FILES=1 node mcp/dist/cli.js structural-index --project . showing Workers: 8.\nVerified by: npm test","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","performance","indexing","large-repo","structural-index"],"paths":["mcp/kernel.ts","mcp/structural-worker.ts","mcp/kernel.test.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-09T02:57:24.777Z"}],"context":{"fact":"Kage structural index should parallelize per-file structural extraction with worker threads once the file count crosses the configured threshold. Keep the public buildStructuralIndex API synchronous for refresh/index/MCP compatibility; workers write batch results to generated temp files and the parent merges them deterministically. Tune with KAGE_STRUCTURAL_WORKERS and KAGE_STRUCTURAL_PARALLEL_MIN_FILES.\nEvidence: Implemented in mcp/kernel.ts and mcp/structural-worker.ts; covered by mcp/kernel.test.ts structural index large-budget test and verified with KAGE_STRUCTURAL_PARALLEL_MIN_FILES=1 node mcp/dist/cli.js structural-index --project . showing Workers: 8.\nVerified by: npm test","verification":"Implemented in mcp/kernel.ts and mcp/structural-worker.ts; covered by mcp/kernel.test.ts structural index large-budget test and verified with KAGE_STRUCTURAL_PARALLEL_MIN_FILES=1 node mcp/dist/cli.js structural-index --project . showing Workers: 8."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:00.465Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"workers","kind":"constant","sha256":"672c1b4e2496cc0f31e596a506edcd9e5641acdd9ccd965ff32ce39c008958bf"},{"name":"buildstructuralindex","kind":"function","sha256":"5291a919aca632725397ff6a4bcaec537af11713805e0aa7fc3aac712d6d94c6"},{"name":"batch","kind":"constant","sha256":"9913f24687eb1de57db30893a21cca8323f02ca6933abde6df3cbd490008722c"},{"name":"keep","kind":"constant","sha256":"3e5df93c6de57dbae093461e4198d2bc24bb055a50d3f6a8bd6449397fd00f3b"}]},{"path":"mcp/structural-worker.ts","sha256":"8ec7b1609f5620cce9c49dd717e7205e055c0bb6f7e28b74cb7b1b3060d9ae48","size":1485,"symbols":[{"name":"results","kind":"constant","sha256":"f590364e856c97f07707909bf4b8eb6071a537f35fec91e93ff74d9fd19557bd"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":172,"reverified_at":"2026-06-15T21:58:00.465Z"},"created_at":"2026-05-09T02:57:24.777Z","updated_at":"2026-06-15T21:58:00.465Z"}
```

