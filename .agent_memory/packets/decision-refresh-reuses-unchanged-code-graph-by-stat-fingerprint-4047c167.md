---
type: "Decision"
title: "Refresh reuses unchanged code graph by stat fingerprint"
description: "Kage refresh should persist a cheap stat fingerprint for selected code graph inputs and return the current code graph when that fingerprint is unchanged. This prevents repeated refresh on large unchanged repos from rerea"
resource: "mcp/kernel.ts"
tags: ["session-learning", "performance", "refresh", "large-repo", "code-graph"]
timestamp: "2026-06-15T21:58:39.949Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:refresh-reuses-unchanged-code-graph-by-stat-fingerprint-1778264078132"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/kernel.test.ts"]
---

# Refresh reuses unchanged code graph by stat fingerprint

> Kage refresh should persist a cheap stat fingerprint for selected code graph inputs and return the current code graph…

Kage refresh should persist a cheap stat fingerprint for selected code graph inputs and return the current code graph when that fingerprint is unchanged. This prevents repeated refresh on large unchanged repos from rereading and rehashing all selected source files while preserving the content-hash rebuild path when inputs change or graph artifacts are missing.
Verified by: npm test --prefix mcp

## Verification

npm test --prefix mcp

# Citations

[1] explicit_capture (2026-05-08T18:14:38.132Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:refresh-reuses-unchanged-code-graph-by-stat-fingerprint-1778264078132","title":"Refresh reuses unchanged code graph by stat fingerprint","summary":"Kage refresh should persist a cheap stat fingerprint for selected code graph inputs and return the current code graph when that fingerprint is unchanged. This prevents repeated refresh on large unchanged repos from rerea","body":"Kage refresh should persist a cheap stat fingerprint for selected code graph inputs and return the current code graph when that fingerprint is unchanged. This prevents repeated refresh on large unchanged repos from rereading and rehashing all selected source files while preserving the content-hash rebuild path when inputs change or graph artifacts are missing.\nVerified by: npm test --prefix mcp","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","performance","refresh","large-repo","code-graph"],"paths":["mcp/kernel.ts","mcp/kernel.test.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-08T18:14:38.132Z"}],"context":{"fact":"Kage refresh should persist a cheap stat fingerprint for selected code graph inputs and return the current code graph when that fingerprint is unchanged. This prevents repeated refresh on large unchanged repos from rereading and rehashing all selected source files while preserving the content-hash rebuild path when inputs change or graph artifacts are missing.\nVerified by: npm test --prefix mcp","verification":"npm test --prefix mcp"},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:39.949Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"selected","kind":"constant","sha256":"58196000de777be320b239d181cc9912a63881ea70a626d2ae9e2f75645983dc"},{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"},{"name":"when","kind":"constant","sha256":"48bfd58b3cdbf2d407e4443b90727d548d96eceaa4372c099dcd22c52f498452"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"missing","kind":"constant","sha256":"8c9fa6e4673545533b5cdc9a6ac45e775f0fb7ec7d969a7602c2d97d1411b01e"}]}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":100,"reverified_at":"2026-06-15T21:58:39.949Z","total_uses":0},"created_at":"2026-05-08T18:14:38.132Z","updated_at":"2026-07-03T16:16:26.714Z"}
```

