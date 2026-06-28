---
type: "Decision"
title: "Viewer combined mode must balance memory and code"
description: "When loading a repo with a large code graph, Combined + High signal can appear to show only code because thousands of code symbols/routes compete with a small number of memory packets. The viewer should reserve part of t"
tags: ["session-learning", "viewer", "memory-graph", "code-graph", "ui"]
timestamp: "2026-05-03T07:38:20.864Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:viewer-combined-mode-must-balance-memory-and-code-1777793900864"
x-kage-type: "decision"
x-kage-status: "deprecated"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "deprecated"
---

# Viewer combined mode must balance memory and code

> When loading a repo with a large code graph, Combined + High signal can appear to show only code because thousands of…

When loading a repo with a large code graph, Combined + High signal can appear to show only code because thousands of code symbols/routes compete with a small number of memory packets. The viewer should reserve part of the high-signal node budget for memory packet/repo/type/command nodes before filling remaining slots with code, so users always see repo memory and code graph together.
Evidence: ~/kage-repo has 19 memory packets, 108 memory graph entities, 212 memory edges, 45 code files, and 6385 symbols. User saw only code in combined visualization on 3125.
Verified by: node --check mcp/viewer/app.js; npm run build --prefix mcp

# Citations

[1] explicit_capture (2026-05-03T07:38:20.864Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:viewer-combined-mode-must-balance-memory-and-code-1777793900864","title":"Viewer combined mode must balance memory and code","summary":"When loading a repo with a large code graph, Combined + High signal can appear to show only code because thousands of code symbols/routes compete with a small number of memory packets. The viewer should reserve part of t","body":"When loading a repo with a large code graph, Combined + High signal can appear to show only code because thousands of code symbols/routes compete with a small number of memory packets. The viewer should reserve part of the high-signal node budget for memory packet/repo/type/command nodes before filling remaining slots with code, so users always see repo memory and code graph together.\nEvidence: ~/kage-repo has 19 memory packets, 108 memory graph entities, 212 memory edges, 45 code files, and 6385 symbols. User saw only code in combined visualization on 3125.\nVerified by: node --check mcp/viewer/app.js; npm run build --prefix mcp","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"deprecated","confidence":0.7,"tags":["session-learning","viewer","memory-graph","code-graph","ui"],"paths":[],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-03T07:38:20.864Z"}],"freshness":{"ttl_days":365,"last_verified_at":"2026-05-03T07:38:20.864Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":159,"stale":true,"stale_reasons":["packet status is deprecated"],"suggested_action":"mark_stale"},"created_at":"2026-05-03T07:38:20.864Z","updated_at":"2026-06-05T14:45:41.007Z"}
```

