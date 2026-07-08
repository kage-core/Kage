---
type: "Decision"
title: "Quick code indexing defers source files instead of silently skipping them"
description: "Quick code indexing may use per run limits, but source files over quick file size or file count limits must be recorded as deferred in .agent memory/code graph/index manifest.json, not silently skipped. Metrics should ex"
resource: "mcp/kernel.ts"
tags: ["session-learning", "indexing", "large-repo", "code-graph", "metrics"]
timestamp: "2026-06-15T21:58:04.540Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:quick-code-indexing-defers-source-files-instead-of-silently-skipping-them-177825"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/kernel.test.ts"]
---

# Quick code indexing defers source files instead of silently skipping them

> Quick code indexing may use per run limits, but source files over quick file size or file count limits must be record…

Quick code indexing may use per-run limits, but source files over quick file-size or file-count limits must be recorded as deferred in .agent_memory/code_graph/index-manifest.json, not silently skipped. Metrics should expose index_status, indexable_files, indexed_files, deferred_files, ignored_files, and coverage so users know whether Kage has complete or partial code coverage. Generated/vendor/cache and unsupported files may be ignored with summary counts.
Evidence: Implemented in mcp/kernel.ts with CodeIndexManifest and metrics fields; regression coverage in mcp/kernel.test.ts for over-size and over-count deferred files.
Verified by: npm test --prefix mcp; node mcp/dist/cli.js pr check --project . --json

## Verification

Implemented in mcp/kernel.ts with CodeIndexManifest and metrics fields; regression coverage in mcp/kernel.test.ts for over-size and over-count deferred files.

# Citations

[1] explicit_capture (2026-05-08T16:24:56.140Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:quick-code-indexing-defers-source-files-instead-of-silently-skipping-them-177825","title":"Quick code indexing defers source files instead of silently skipping them","summary":"Quick code indexing may use per run limits, but source files over quick file size or file count limits must be recorded as deferred in .agent memory/code graph/index manifest.json, not silently skipped. Metrics should ex","body":"Quick code indexing may use per-run limits, but source files over quick file-size or file-count limits must be recorded as deferred in .agent_memory/code_graph/index-manifest.json, not silently skipped. Metrics should expose index_status, indexable_files, indexed_files, deferred_files, ignored_files, and coverage so users know whether Kage has complete or partial code coverage. Generated/vendor/cache and unsupported files may be ignored with summary counts.\nEvidence: Implemented in mcp/kernel.ts with CodeIndexManifest and metrics fields; regression coverage in mcp/kernel.test.ts for over-size and over-count deferred files.\nVerified by: npm test --prefix mcp; node mcp/dist/cli.js pr check --project . --json","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","indexing","large-repo","code-graph","metrics"],"paths":["mcp/kernel.ts","mcp/kernel.test.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-08T16:24:56.140Z"}],"context":{"fact":"Quick code indexing may use per-run limits, but source files over quick file-size or file-count limits must be recorded as deferred in .agent_memory/code_graph/index-manifest.json, not silently skipped. Metrics should expose index_status, indexable_files, indexed_files, deferred_files, ignored_files, and coverage so users know whether Kage has complete or partial code coverage. Generated/vendor/cache and unsupported files may be ignored with summary counts.\nEvidence: Implemented in mcp/kernel.ts with CodeIndexManifest and metrics fields; regression coverage in mcp/kernel.test.ts for over-size and over-count deferred files.\nVerified by: npm test --prefix mcp; node mcp/dist/cli.js pr check --project . --json","verification":"Implemented in mcp/kernel.ts with CodeIndexManifest and metrics fields; regression coverage in mcp/kernel.test.ts for over-size and over-count deferred files."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:04.540Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"size","kind":"constant","sha256":"9008cc27791958971fe1d1c0049dd1e46d083d1bcf756d40e903520337322226"},{"name":"deferred","kind":"constant","sha256":"410a15d3e3e8ae9316e549d5ba407560be7e6a9882907ee2480eabf35aa9276b"},{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"skipped","kind":"constant","sha256":"03e81aaef0840624f59a6c0f9369a459eef887581fec1127f145218cfb90d215"},{"name":"partial","kind":"constant","sha256":"f9e4183f517a106cecc182a13a4123aef78b16eeee87eccb096b62a7aacda8f5"}]}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":3,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":179,"reverified_at":"2026-06-15T21:58:04.540Z","total_uses":3,"last_accessed_at":"2026-07-08T21:17:02.424Z"},"created_at":"2026-05-08T16:24:56.140Z","updated_at":"2026-07-03T16:16:26.711Z"}
```

