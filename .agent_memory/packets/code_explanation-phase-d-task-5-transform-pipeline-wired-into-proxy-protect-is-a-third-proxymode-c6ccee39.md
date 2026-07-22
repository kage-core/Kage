---
type: "Code Explanation"
title: "Phase D Task 5: transform pipeline wired into proxy; protect is a third ProxyMode"
description: "Legacy memory imported from Markdown."
resource: "mcp/proxy.ts"
tags: ["session-learning"]
timestamp: "2026-07-18T15:51:04.763Z"
x-kage-id: "repo:kage-vnext-implementation:code_explanation:phase-d-task-5-transform-pipeline-wired-into-proxy-protect-is-a-third-proxymode-"
x-kage-type: "code_explanation"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "verified"
x-kage-paths: ["mcp/proxy.ts", "mcp/vnext/adapters/anthropic-proxy.ts", "mcp/vnext/gateway/providers/anthropic.ts", "mcp/cli.ts"]
---

# Phase D Task 5: transform pipeline wired into proxy; protect is a third ProxyMode

> Legacy memory imported from Markdown.

# Citations

[1] explicit_capture (2026-07-18T10:26:58.366Z)
[2] reverification

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:kage-vnext-implementation:code_explanation:phase-d-task-5-transform-pipeline-wired-into-proxy-protect-is-a-third-proxymode-","title":"Phase D Task 5: transform pipeline wired into proxy; protect is a third ProxyMode","summary":"Legacy memory imported from Markdown.","body":"","type":"code_explanation","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning"],"paths":["mcp/proxy.ts","mcp/vnext/adapters/anthropic-proxy.ts","mcp/vnext/gateway/providers/anthropic.ts","mcp/cli.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-07-18T10:26:58.366Z"},{"kind":"reverification","at":"2026-07-18T15:51:04.763Z","verified_by":"npm test --prefix mcp green during Phase D; build clean","evidence":"Phase D Tasks 7-11 (Anthropic-only reversible compression + Minimal Change Guard + cohort metrics) touched proxy.ts/cli.ts/kernel.test.ts/capability-matrix.ts near these citations. Each claim re-read and holds: merge-packet content-sniffing + gc retention unchanged; nudge/watcher removal (hooks are the loop) unchanged; Phase D Task 5 transform pipeline + protect ProxyMode still describes the current proxy (later tasks extended around it, did not replace it); Phase D Task 6 honest capability certification intact (capability-matrix.ts); provider usage.input_tokens is still the UNCACHED remainder and must never be compared to count_tokens — compression changes token COUNTS but not the accounting RULE (receipt semantics preserved). Claims unchanged; cited code moved/grew under additive Phase D work.","changed_paths":[{"path":"mcp/cli.ts","prior_sha256":"dee1ac78f2b543a8a693cb4efeeb34d4b3e877bef5d26f8f834fedd006f36729","sha256":"e861fe1efd6aef8cc7f00cfa32901f5bd3fddd550fc07296e4bd463963fb3718"}]}],"context":{},"freshness":{"ttl_days":365,"last_verified_at":"2026-07-18T15:51:04.763Z","path_fingerprints":[{"path":"mcp/proxy.ts","sha256":"b8aec133c0655cc7b678f5001135f6faa131a67c545646e050a3d9fe140cdda1","size":34031},{"path":"mcp/vnext/adapters/anthropic-proxy.ts","sha256":"d795aa01ba444f9d1ef76f5015546126dab5a7384b115f65201d67435c5a357d","size":19616},{"path":"mcp/vnext/gateway/providers/anthropic.ts","sha256":"3ad277ef64d4c61add1ac27b7cca7084feaa4e2b71229f2c80eb7bc1b8244231","size":3051},{"path":"mcp/cli.ts","sha256":"e861fe1efd6aef8cc7f00cfa32901f5bd3fddd550fc07296e4bd463963fb3718","size":169079}],"path_fingerprint_policy":"source_hash_staleness","verification":"evidence_reverification"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"discovery_tokens":2000,"discovery_tokens_estimated":true,"score":68,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged"],"risks":["too short to be useful"],"duplicate_candidates":[],"estimated_tokens_saved":20,"reverified_at":"2026-07-18T15:51:04.763Z"},"created_at":"2026-07-18T10:26:58.366Z","updated_at":"2026-07-18T15:51:04.763Z","author_branch":"codex/kage-vnext-implementation"}
```

