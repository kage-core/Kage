---
type: "Bug Fix"
title: "CI: kage pr check blocks only on hard-stale memory (verified v2.2.1)"
description: "kage pr check exits 2 only on hard stale memory evidence gone and validation/graph freshness failures; soft stale linked path changed is a non blocking warning. Personal packets structurally excluded RecallResult.persona"
resource: "mcp/kernel.ts"
tags: ["session-learning"]
timestamp: "2026-06-15T21:58:33.426Z"
x-kage-id: "repo:https-github-com-kage-core-kage:bug_fix:ci-kage-pr-check-blocks-only-on-hard-stale-memory-verified-v2-2-1-1781268529908"
x-kage-type: "bug_fix"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts"]
---

# CI: kage pr check blocks only on hard-stale memory (verified v2.2.1)

> kage pr check exits 2 only on hard stale memory evidence gone and validation/graph freshness failures; soft stale lin…

kage pr check exits 2 only on hard-stale memory (evidence gone) and validation/graph-freshness failures; soft-stale (linked path changed) is a non-blocking warning. Personal packets structurally excluded (RecallResult.personal). Unchanged by the 2.2.1 sync rebase/push fixes.

# Citations

[1] explicit_capture (2026-06-12T12:48:49.908Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:bug_fix:ci-kage-pr-check-blocks-only-on-hard-stale-memory-verified-v2-2-1-1781268529908","title":"CI: kage pr check blocks only on hard-stale memory (verified v2.2.1)","summary":"kage pr check exits 2 only on hard stale memory evidence gone and validation/graph freshness failures; soft stale linked path changed is a non blocking warning. Personal packets structurally excluded RecallResult.persona","body":"kage pr check exits 2 only on hard-stale memory (evidence gone) and validation/graph-freshness failures; soft-stale (linked path changed) is a non-blocking warning. Personal packets structurally excluded (RecallResult.personal). Unchanged by the 2.2.1 sync rebase/push fixes.","type":"bug_fix","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning"],"paths":["mcp/kernel.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-06-12T12:48:49.908Z"}],"context":{"fact":"kage pr check exits 2 only on hard-stale memory (evidence gone) and validation/graph-freshness failures; soft-stale (linked path changed) is a non-blocking warning. Personal packets structurally excluded (RecallResult.personal). Unchanged by the 2.2.1 sync rebase/push fixes."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:33.426Z","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"}]}],"path_fingerprint_policy":"source_hash_staleness","verification":"repo_local_agent_capture"},"edges":[{"relation":"supersedes","to":"repo:https-github-com-kage-core-kage:bug_fix:ci-kage-pr-check-blocks-only-on-hard-stale-memory-still-true-in-v2-2-0-178126514","evidence":"Newer repo memory supersedes this packet.","created_at":"2026-06-12T12:48:50.088Z"}],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":2,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"discovery_tokens":8000,"discovery_tokens_estimated":true,"score":96,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":69,"reverified_at":"2026-06-15T21:58:33.426Z","total_uses":2,"last_accessed_at":"2026-07-03T20:01:57.812Z"},"created_at":"2026-06-12T12:48:49.908Z","updated_at":"2026-07-03T16:16:26.676Z","author_branch":"master"}
```

