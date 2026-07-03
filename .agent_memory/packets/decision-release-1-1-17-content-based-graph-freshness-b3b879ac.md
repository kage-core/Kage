---
type: "Decision"
title: "Release 1.1.17 content-based graph freshness"
description: "Release 1.1.17 publishes content based graph freshness for kage pr check. Graph artifacts use input hashes for source/config files, approved memory packets, and code index inputs, so push only operations and empty/same t"
resource: "mcp/kernel.ts"
tags: ["session-learning", "release", "npm", "graph", "refresh", "pr-check"]
timestamp: "2026-06-15T21:58:04.223Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:release-1-1-17-content-based-graph-freshness-1778054404602"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/kernel.test.ts", "mcp/package.json", "mcp/package-lock.json", "CHANGELOG.md", "mcp/README.md"]
---

# Release 1.1.17 content-based graph freshness

> Release 1.1.17 publishes content based graph freshness for kage pr check. Graph artifacts use input hashes for source…

Release 1.1.17 publishes content-based graph freshness for kage pr check. Graph artifacts use input hashes for source/config files, approved memory packets, and code-index inputs, so push-only operations and empty/same-tree commits no longer require another kage refresh while real content changes still stale generated graph artifacts.
Evidence: Implemented in mcp/kernel.ts, documented in CHANGELOG.md and mcp/README.md, and versioned in mcp/package.json.
Verified by: npm test --prefix mcp; npm --cache /private/tmp/kage-npm-cache pack --dry-run

## Verification

Implemented in mcp/kernel.ts, documented in CHANGELOG.md and mcp/README.md, and versioned in mcp/package.json.

# Citations

[1] explicit_capture (2026-05-06T08:00:04.602Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:release-1-1-17-content-based-graph-freshness-1778054404602","title":"Release 1.1.17 content-based graph freshness","summary":"Release 1.1.17 publishes content based graph freshness for kage pr check. Graph artifacts use input hashes for source/config files, approved memory packets, and code index inputs, so push only operations and empty/same t","body":"Release 1.1.17 publishes content-based graph freshness for kage pr check. Graph artifacts use input hashes for source/config files, approved memory packets, and code-index inputs, so push-only operations and empty/same-tree commits no longer require another kage refresh while real content changes still stale generated graph artifacts.\nEvidence: Implemented in mcp/kernel.ts, documented in CHANGELOG.md and mcp/README.md, and versioned in mcp/package.json.\nVerified by: npm test --prefix mcp; npm --cache /private/tmp/kage-npm-cache pack --dry-run","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","release","npm","graph","refresh","pr-check"],"paths":["mcp/kernel.ts","mcp/kernel.test.ts","mcp/package.json","mcp/package-lock.json","CHANGELOG.md","mcp/README.md"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-06T08:00:04.602Z"}],"context":{"fact":"Release 1.1.17 publishes content-based graph freshness for kage pr check. Graph artifacts use input hashes for source/config files, approved memory packets, and code-index inputs, so push-only operations and empty/same-tree commits no longer require another kage refresh while real content changes still stale generated graph artifacts.\nEvidence: Implemented in mcp/kernel.ts, documented in CHANGELOG.md and mcp/README.md, and versioned in mcp/package.json.\nVerified by: npm test --prefix mcp; npm --cache /private/tmp/kage-npm-cache pack --dry-run","verification":"Implemented in mcp/kernel.ts, documented in CHANGELOG.md and mcp/README.md, and versioned in mcp/package.json."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:04.223Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"readme","kind":"constant","sha256":"aa0f002dd3f57a6ca1e42c5aba625151268ed600bbbd7582f93a0a0bc7714404"},{"name":"same","kind":"constant","sha256":"b150fada949a5c6d4babe0a0bc108765c6e7e1819d0ddbee55112b9c9a708447"},{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"},{"name":"changelog","kind":"function","sha256":"1b80272f5a58f56742b1e1ffccb8b8bad542436311476eca4a275896297f76af"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"packets","kind":"constant","sha256":"f28a69afbf5d7a988e351fc5446a3b291a2451f97b8220c4e1a7629b3a50ffa3"},{"name":"approved","kind":"constant","sha256":"171aaa19fb00d03fd3ac915407ce29bf1b975dd242d15989e08241caf5c05506"},{"name":"config","kind":"constant","sha256":"dadedb2c7835eb30472da759f3e2177ea09582ea0ac93eaf2fdc871ba1720bde"},{"name":"real","kind":"constant","sha256":"856bf47487b3742dc24d08df1d5fbdb66e78329577cae25b2d31af5ccc9aade1"}]},{"path":"mcp/package.json","sha256":"e77b80c8e3ef4eb7ccdf9f7dc775b51f18f1a7994092b538f81df874e8c91c5a","size":1193},{"path":"mcp/package-lock.json","sha256":"5cc3c1aa35fce1dc164444bb08d352f15590aa7fccfddbd7df1b6b7aaac67221","size":42685},{"path":"CHANGELOG.md","sha256":"1d00aff932a74d380dad6e0d60ae0aed37e40aa5a03ae7ec0acb71f824d0ef0c","size":46022},{"path":"mcp/README.md","sha256":"5c852f608754e299c2cff74495862f1ce4775d0bda5776d7ce4f070f4e4a6494","size":10129}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":137,"reverified_at":"2026-06-15T21:58:04.223Z","total_uses":0},"created_at":"2026-05-06T08:00:04.602Z","updated_at":"2026-07-03T16:16:26.715Z"}
```

