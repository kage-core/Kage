---
type: "Bug Fix"
title: "Large repo benchmark exposed stale read and exact symbol ranking fixes"
description: "Benchmarking synthetic 5.5k and 20k file repos showed structural indexing works at full coverage, but also exposed two issues: read only code graph queries trusted the old structural manifest after source edits, and natu"
resource: "mcp/kernel.ts"
tags: ["session-learning", "benchmark", "large-repo", "code-graph", "structural-index", "retrieval"]
timestamp: "2026-06-15T21:58:39.145Z"
x-kage-id: "repo:https-github-com-kage-core-kage:bug_fix:large-repo-benchmark-exposed-stale-read-and-exact-symbol-ranking-fixes-177830548"
x-kage-type: "bug_fix"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/kernel.test.ts"]
---

# Large repo benchmark exposed stale read and exact symbol ranking fixes

> Benchmarking synthetic 5.5k and 20k file repos showed structural indexing works at full coverage, but also exposed tw…

Benchmarking synthetic 5.5k and 20k file repos showed structural indexing works at full coverage, but also exposed two issues: read-only code graph queries trusted the old structural manifest after source edits, and natural-language code queries could rank generic Worker symbols above exact identifiers because substring boost matched work. Fix read paths with currentStructuralFingerprint and score boosts with exact/token identifier matches.
Evidence: 5.5k repo: cold refresh 1.92s, warm 2.62s, 100% coverage, 46M .agent_memory. 20k repo: cold refresh 36.67s, warm 13.59s, 100% coverage, 150M .agent_memory. Added regression tests for stale read rebuild and exact symbol ranking.
Verified by: npm --prefix mcp test

## Verification

5.5k repo: cold refresh 1.92s, warm 2.62s, 100% coverage, 46M .agent_memory. 20k repo: cold refresh 36.67s, warm 13.59s, 100% coverage, 150M .agent_memory. Added regression tests for stale read rebuild and exact symbol ranking.

# Citations

[1] explicit_capture (2026-05-09T05:44:47.452Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:bug_fix:large-repo-benchmark-exposed-stale-read-and-exact-symbol-ranking-fixes-177830548","title":"Large repo benchmark exposed stale read and exact symbol ranking fixes","summary":"Benchmarking synthetic 5.5k and 20k file repos showed structural indexing works at full coverage, but also exposed two issues: read only code graph queries trusted the old structural manifest after source edits, and natu","body":"Benchmarking synthetic 5.5k and 20k file repos showed structural indexing works at full coverage, but also exposed two issues: read-only code graph queries trusted the old structural manifest after source edits, and natural-language code queries could rank generic Worker symbols above exact identifiers because substring boost matched work. Fix read paths with currentStructuralFingerprint and score boosts with exact/token identifier matches.\nEvidence: 5.5k repo: cold refresh 1.92s, warm 2.62s, 100% coverage, 46M .agent_memory. 20k repo: cold refresh 36.67s, warm 13.59s, 100% coverage, 150M .agent_memory. Added regression tests for stale read rebuild and exact symbol ranking.\nVerified by: npm --prefix mcp test","type":"bug_fix","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","benchmark","large-repo","code-graph","structural-index","retrieval"],"paths":["mcp/kernel.ts","mcp/kernel.test.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-09T05:44:47.452Z"}],"context":{"fact":"Benchmarking synthetic 5.5k and 20k file repos showed structural indexing works at full coverage, but also exposed two issues: read-only code graph queries trusted the old structural manifest after source edits, and natural-language code queries could rank generic Worker symbols above exact identifiers because substring boost matched work. Fix read paths with currentStructuralFingerprint and score boosts with exact/token identifier matches.\nEvidence: 5.5k repo: cold refresh 1.92s, warm 2.62s, 100% coverage, 46M .agent_memory. 20k repo: cold refresh 36.67s, warm 13.59s, 100% coverage, 150M .agent_memory. Added regression tests for stale read rebuild and exact symbol ranking.\nVerified by: npm --prefix mcp test","verification":"5.5k repo: cold refresh 1.92s, warm 2.62s, 100% coverage, 46M .agent_memory. 20k repo: cold refresh 36.67s, warm 13.59s, 100% coverage, 150M .agent_memory. Added regression tests for stale read rebuild and exact symbol ranking."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:39.145Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"currentstructuralfingerprint","kind":"function","sha256":"7d8081e4c78abf2444adb6c356d8e62bbe71a17d5100171daae90e63437947bd"},{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"},{"name":"token","kind":"constant","sha256":"9289e531e150dbf4533b30373feed670db17040de86f0a87bae921c5fb3ce702"},{"name":"read","kind":"constant","sha256":"ffe49534fbcdb7c556f32fa5120c3dd4c00fce60f148c94f79d0d94d71145efd"},{"name":"matched","kind":"constant","sha256":"2b9912ba51c232af1954ab5ecb2390cf083764ee9abba7531de72c20664b2bf6"},{"name":"after","kind":"constant","sha256":"220a1c1969c37d53268e215419dcea650ffa901162d0a25e451bd90831fb0a1b"},{"name":"full","kind":"constant","sha256":"9213768c4e556655970d7db34f178f135ab91810c1a0a99bba63452c01924f4f"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"added","kind":"constant","sha256":"bc14da9c82da760a8d437c7e912b7909ab47e5de278fb9a951ae4702a8835975"},{"name":"benchmark","kind":"constant","sha256":"5671166b34f289b838cd462807715792f2dda03a9870f4ca9e846b6ddd5ce769"},{"name":"full","kind":"constant","sha256":"6270b632fb8c1ec230ad23878da137aab65feab7105ddd15ff76a1d27e5b5b44"}]}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":1,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":180,"reverified_at":"2026-06-15T21:58:39.145Z","total_uses":1,"last_accessed_at":"2026-07-03T07:16:23.518Z"},"created_at":"2026-05-09T05:44:47.452Z","updated_at":"2026-07-03T16:16:26.677Z"}
```

