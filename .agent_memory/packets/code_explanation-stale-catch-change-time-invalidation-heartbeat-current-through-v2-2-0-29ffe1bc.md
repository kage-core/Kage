---
type: "Code Explanation"
title: "Stale-catch: change-time invalidation heartbeat (current through v2.2.0)"
description: "staleCatch kernel.ts detects memories invalidated by working tree/diff changes; surfaced by kage pr check lead line and kage staleguard for pre commit; stale caught events feed the value ledger and kage gains. Still accu"
resource: "mcp/kernel.ts"
tags: ["session-learning", "stale-catch"]
timestamp: "2026-06-15T21:58:28.165Z"
x-kage-id: "repo:https-github-com-kage-core-kage:code_explanation:stale-catch-change-time-invalidation-heartbeat-current-through-v2-2-0-1781265198"
x-kage-type: "code_explanation"
x-kage-status: "deprecated"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "deprecated"
x-kage-paths: ["mcp/kernel.ts"]
---

# Stale-catch: change-time invalidation heartbeat (current through v2.2.0)

> staleCatch kernel.ts detects memories invalidated by working tree/diff changes; surfaced by kage pr check lead line a…

staleCatch (kernel.ts) detects memories invalidated by working-tree/diff changes; surfaced by kage pr check lead line and kage staleguard for pre-commit; stale_caught events feed the value ledger and kage gains. Still accurate in v2.2.0 with two additions: quiet refresh on non-default branches computes staleness in memory without persisting metadata rewrites (findings still reported), and personal packets are excluded from stale-catch entirely.

# Citations

[1] explicit_capture (2026-06-12T11:53:18.448Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:code_explanation:stale-catch-change-time-invalidation-heartbeat-current-through-v2-2-0-1781265198","title":"Stale-catch: change-time invalidation heartbeat (current through v2.2.0)","summary":"staleCatch kernel.ts detects memories invalidated by working tree/diff changes; surfaced by kage pr check lead line and kage staleguard for pre commit; stale caught events feed the value ledger and kage gains. Still accu","body":"staleCatch (kernel.ts) detects memories invalidated by working-tree/diff changes; surfaced by kage pr check lead line and kage staleguard for pre-commit; stale_caught events feed the value ledger and kage gains. Still accurate in v2.2.0 with two additions: quiet refresh on non-default branches computes staleness in memory without persisting metadata rewrites (findings still reported), and personal packets are excluded from stale-catch entirely.","type":"code_explanation","scope":"repo","visibility":"team","sensitivity":"internal","status":"deprecated","confidence":0.7,"tags":["session-learning","stale-catch"],"paths":["mcp/kernel.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-06-12T11:53:18.448Z"}],"context":{"fact":"staleCatch (kernel.ts) detects memories invalidated by working-tree/diff changes; surfaced by kage pr check lead line and kage staleguard for pre-commit; stale_caught events feed the value ledger and kage gains. Still accurate in v2.2.0 with two additions: quiet refresh on non-default branches computes staleness in memory without persisting metadata rewrites (findings still reported), and personal packets are excluded from stale-catch entirely."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:28.165Z","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"time","kind":"constant","sha256":"36aa0a901e7fda47d7d7571d9c21879432386e4418ed56010d7e03c9a91f5482"},{"name":"quiet","kind":"constant","sha256":"b0960735ee347c47ea2422888dd7ebfe019320d8af2f0b1ad395c8ef19dd9f6d"},{"name":"surfaced","kind":"constant","sha256":"dd98145f4654c60f06b4cb0037a6eb98de2eebb28c7a013826cdc06795331124"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"},{"name":"stalecatch","kind":"function","sha256":"f5c8a3a19318806b2dd089f0ece8a92a7b5799089c796665109fc20c63fdab9a"},{"name":"invalidated","kind":"constant","sha256":"091c9ec9a6da9da0aec9dbc1bcd2758e540de06cf60ce2ae280324b46b55c1dd"}]}],"path_fingerprint_policy":"source_hash_staleness","verification":"repo_local_agent_capture","superseded_at":"2026-06-12T12:48:52.523Z","superseded_by":"repo:https-github-com-kage-core-kage:code_explanation:stale-catch-change-time-invalidation-heartbeat-verified-v2-2-1-1781268532337","superseded_reason":"Newer repo memory supersedes this packet."},"edges":[{"relation":"supersedes","to":"repo:memory:code_explanation:stale-catch-change-time-invalidation-heartbeat-stalecatch-kage-staleguard-178118","evidence":"Newer repo memory supersedes this packet.","created_at":"2026-06-12T11:54:13.096Z"},{"relation":"superseded_by","to":"repo:https-github-com-kage-core-kage:code_explanation:stale-catch-change-time-invalidation-heartbeat-verified-v2-2-1-1781268532337","evidence":"Newer repo memory supersedes this packet.","created_at":"2026-06-12T12:48:52.523Z"}],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"discovery_tokens":2000,"discovery_tokens_estimated":true,"score":96,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":112,"superseded_by":"repo:https-github-com-kage-core-kage:code_explanation:stale-catch-change-time-invalidation-heartbeat-verified-v2-2-1-1781268532337","superseded_reason":"Newer repo memory supersedes this packet.","reverified_at":"2026-06-15T21:58:28.165Z","stale":true,"stale_reasons":["packet status is superseded"],"suggested_action":"mark_stale"},"created_at":"2026-06-12T11:53:18.448Z","updated_at":"2026-06-29T08:26:42.566Z","author_branch":"master"}
```

