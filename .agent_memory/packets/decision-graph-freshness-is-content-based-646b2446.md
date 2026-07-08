---
type: "Decision"
title: "Graph freshness is content based"
description: "Kage graph freshness uses input hashes for source files, approved memory packets, and code index inputs instead of requiring repo state.head to match HEAD. Push only operations and empty/same tree commits should not trig"
resource: "mcp/kernel.ts"
tags: ["session-learning", "graph", "refresh", "pr-check", "workflow"]
timestamp: "2026-06-15T21:58:17.379Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:graph-freshness-is-content-based-1778053518901"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/kernel.test.ts", "AGENTS.md", "README.md", "mcp/README.md"]
---

# Graph freshness is content based

> Kage graph freshness uses input hashes for source files, approved memory packets, and code index inputs instead of re…

Kage graph freshness uses input hashes for source files, approved memory packets, and code-index inputs instead of requiring repo_state.head to match HEAD. Push-only operations and empty/same-tree commits should not trigger another kage refresh; real content changes still make kage pr check require refresh.
Evidence: Implemented in mcp/kernel.ts with regression coverage in mcp/kernel.test.ts.
Verified by: npm test --prefix mcp

## Verification

Implemented in mcp/kernel.ts with regression coverage in mcp/kernel.test.ts.

# Citations

[1] explicit_capture (2026-05-06T07:45:18.901Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:graph-freshness-is-content-based-1778053518901","title":"Graph freshness is content based","summary":"Kage graph freshness uses input hashes for source files, approved memory packets, and code index inputs instead of requiring repo state.head to match HEAD. Push only operations and empty/same tree commits should not trig","body":"Kage graph freshness uses input hashes for source files, approved memory packets, and code-index inputs instead of requiring repo_state.head to match HEAD. Push-only operations and empty/same-tree commits should not trigger another kage refresh; real content changes still make kage pr check require refresh.\nEvidence: Implemented in mcp/kernel.ts with regression coverage in mcp/kernel.test.ts.\nVerified by: npm test --prefix mcp","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","graph","refresh","pr-check","workflow"],"paths":["mcp/kernel.ts","mcp/kernel.test.ts","AGENTS.md","README.md","mcp/README.md"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-06T07:45:18.901Z"}],"context":{"fact":"Kage graph freshness uses input hashes for source files, approved memory packets, and code-index inputs instead of requiring repo_state.head to match HEAD. Push-only operations and empty/same-tree commits should not trigger another kage refresh; real content changes still make kage pr check require refresh.\nEvidence: Implemented in mcp/kernel.ts with regression coverage in mcp/kernel.test.ts.\nVerified by: npm test --prefix mcp","verification":"Implemented in mcp/kernel.ts with regression coverage in mcp/kernel.test.ts."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:17.379Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"same","kind":"constant","sha256":"b150fada949a5c6d4babe0a0bc108765c6e7e1819d0ddbee55112b9c9a708447"},{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"},{"name":"state","kind":"constant","sha256":"065fd1c87ce12edcfec7baca76dc9d91e35f5ea16490d33c8f85f3bdc3fee185"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"packets","kind":"constant","sha256":"f28a69afbf5d7a988e351fc5446a3b291a2451f97b8220c4e1a7629b3a50ffa3"},{"name":"approved","kind":"constant","sha256":"171aaa19fb00d03fd3ac915407ce29bf1b975dd242d15989e08241caf5c05506"},{"name":"real","kind":"constant","sha256":"856bf47487b3742dc24d08df1d5fbdb66e78329577cae25b2d31af5ccc9aade1"}]},{"path":"AGENTS.md","sha256":"d1e074d6887bacd550f629c53dae432477ebedf6548b14765396a408a4544d3a","size":3427},{"path":"README.md","sha256":"9a533eee7962e84cdceef1bd8c9463233a575138fa143acafc8abd42f723944a","size":10477},{"path":"mcp/README.md","sha256":"5c852f608754e299c2cff74495862f1ce4775d0bda5776d7ce4f070f4e4a6494","size":10129}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":8,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":108,"reverified_at":"2026-06-15T21:58:17.379Z","total_uses":8,"last_accessed_at":"2026-07-06T19:36:34.287Z"},"created_at":"2026-05-06T07:45:18.901Z","updated_at":"2026-07-03T16:16:26.704Z"}
```

