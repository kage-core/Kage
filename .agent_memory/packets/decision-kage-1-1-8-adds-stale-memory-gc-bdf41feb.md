---
type: "Decision"
title: "Kage 1.1.8 adds stale memory GC"
description: "Kage 1.1.8 adds kage gc for stale memory cleanup: dry-run preview, exact-file deprecation, forced delete for low-signal stale packets, and artifact refresh."
resource: "mcp/kernel.ts"
tags: ["session-learning", "release", "gc", "stale-memory"]
timestamp: "2026-06-15T21:58:38.248Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:kage-1-1-8-adds-stale-memory-gc-1777792236400"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/cli.ts", "mcp/kernel.test.ts", "README.md", "mcp/README.md"]
---

# Kage 1.1.8 adds stale memory GC

> Kage 1.1.8 adds kage gc for stale memory cleanup: dry-run preview, exact-file deprecation, forced delete for low-sign…

Kage 1.1.8 adds kage gc for stale memory cleanup. The command scans repo packets, previews stale cleanup with --dry-run, marks stale packets deprecated by exact packet file path, rebuilds indexes/knowledge graph/metrics after mutation, and keeps helpful-voted stale memory unless --force is used.
Evidence: npm test --prefix mcp passed 64 tests; kage validate passed; npm pack --dry-run included dist/cli.js and dist/kernel.js for version 1.1.8.
Verified by: npm test --prefix mcp

# Citations

[1] explicit_capture (2026-05-03T07:10:36.400Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:kage-1-1-8-adds-stale-memory-gc-1777792236400","title":"Kage 1.1.8 adds stale memory GC","summary":"Kage 1.1.8 adds kage gc for stale memory cleanup: dry-run preview, exact-file deprecation, forced delete for low-signal stale packets, and artifact refresh.","body":"Kage 1.1.8 adds kage gc for stale memory cleanup. The command scans repo packets, previews stale cleanup with --dry-run, marks stale packets deprecated by exact packet file path, rebuilds indexes/knowledge graph/metrics after mutation, and keeps helpful-voted stale memory unless --force is used.\nEvidence: npm test --prefix mcp passed 64 tests; kage validate passed; npm pack --dry-run included dist/cli.js and dist/kernel.js for version 1.1.8.\nVerified by: npm test --prefix mcp","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","release","gc","stale-memory"],"paths":["mcp/kernel.ts","mcp/cli.ts","mcp/kernel.test.ts","README.md","mcp/README.md"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-03T07:10:36.400Z"}],"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:38.248Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"used","kind":"constant","sha256":"8d494a3272de91027985cda665364b9004e227897e62b1a7ad4810337f40141e"},{"name":"cleanup","kind":"constant","sha256":"44c2ebe266676bac0e9fb42c4a64dcbb729fc44d0bfa44910463b965b8123570"},{"name":"after","kind":"constant","sha256":"220a1c1969c37d53268e215419dcea650ffa901162d0a25e451bd90831fb0a1b"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"}]},{"path":"mcp/cli.ts","sha256":"a670bc601e227372c9ab3e862f4e25fa87ae4bfa90b63c3bbc61032d332da0d7","size":114201,"symbols":[{"name":"command","kind":"constant","sha256":"9e594169e1f8559f50d7e73b407f1aa3a9a0f14bf43a676fedefa72734badb98"},{"name":"force","kind":"constant","sha256":"32f53e21f2cf6ddd6a9a2b7043bf342de01bc358f63649b07f0b41dcbf695929"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"packets","kind":"constant","sha256":"f28a69afbf5d7a988e351fc5446a3b291a2451f97b8220c4e1a7629b3a50ffa3"},{"name":"signal","kind":"constant","sha256":"f084f4945e43a881cf04b4d6eff63df1f052d4d6e933b089af3696e2bc699289"},{"name":"forced","kind":"constant","sha256":"eacb07be46eabf554adf45ab164611105f6b3005aa5dda3fd4add4cf31349722"}]},{"path":"README.md","sha256":"9a533eee7962e84cdceef1bd8c9463233a575138fa143acafc8abd42f723944a","size":10477},{"path":"mcp/README.md","sha256":"5c852f608754e299c2cff74495862f1ce4775d0bda5776d7ce4f070f4e4a6494","size":10129}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":120,"reverified_at":"2026-06-15T21:58:38.248Z","total_uses":0},"created_at":"2026-05-03T07:10:36.400Z","updated_at":"2026-07-03T16:16:26.705Z"}
```

