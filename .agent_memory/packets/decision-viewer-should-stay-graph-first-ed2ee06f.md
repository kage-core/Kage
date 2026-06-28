---
type: "Decision"
title: "Viewer should stay graph-first"
description: "Viewer UX should follow a graph first model inspired by repo-dashboard-style graph pages: keep the canvas primary, put common graph actions in a compact floating toolbar, and keep secondary surfaces as one active side workspac"
tags: ["session-learning", "viewer", "ui", "graph"]
timestamp: "2026-05-15T06:41:24.194Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:viewer-should-stay-graph-first-1778827284194"
x-kage-type: "decision"
x-kage-status: "deprecated"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "deprecated"
---

# Viewer should stay graph-first

> Viewer UX should follow a graph first model inspired by repo-dashboard-style graph pages: keep the canvas primary, pu…

Viewer UX should follow a graph-first model inspired by repo-dashboard-style graph pages: keep the canvas primary, put common graph actions in a compact floating toolbar, and keep secondary surfaces as one active side workspace/tab at a time. Avoid returning to a dashboard wall where controls, inspector, intelligence, review, and tables are all visible together.
Verified by: Playwright smoke for quick scope/mode controls, Path Finder focus, and npm --prefix mcp test

## Verification

Playwright smoke for quick scope/mode controls, Path Finder focus, and npm --prefix mcp test

# Citations

[1] explicit_capture (2026-05-15T06:41:24.194Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:viewer-should-stay-graph-first-1778827284194","title":"Viewer should stay graph-first","summary":"Viewer UX should follow a graph first model inspired by repo-dashboard-style graph pages: keep the canvas primary, put common graph actions in a compact floating toolbar, and keep secondary surfaces as one active side workspac","body":"Viewer UX should follow a graph-first model inspired by repo-dashboard-style graph pages: keep the canvas primary, put common graph actions in a compact floating toolbar, and keep secondary surfaces as one active side workspace/tab at a time. Avoid returning to a dashboard wall where controls, inspector, intelligence, review, and tables are all visible together.\nVerified by: Playwright smoke for quick scope/mode controls, Path Finder focus, and npm --prefix mcp test","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"deprecated","confidence":0.7,"tags":["session-learning","viewer","ui","graph"],"paths":[],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-15T06:41:24.194Z"}],"context":{"fact":"Viewer UX should follow a graph-first model inspired by repo-dashboard-style graph pages: keep the canvas primary, put common graph actions in a compact floating toolbar, and keep secondary surfaces as one active side workspace/tab at a time. Avoid returning to a dashboard wall where controls, inspector, intelligence, review, and tables are all visible together.\nVerified by: Playwright smoke for quick scope/mode controls, Path Finder focus, and npm --prefix mcp test","verification":"Playwright smoke for quick scope/mode controls, Path Finder focus, and npm --prefix mcp test"},"freshness":{"ttl_days":365,"last_verified_at":"2026-05-15T06:41:24.194Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":116,"stale":true,"stale_reasons":["packet status is deprecated"],"suggested_action":"mark_stale"},"created_at":"2026-05-15T06:41:24.194Z","updated_at":"2026-06-05T14:45:41.007Z"}
```

