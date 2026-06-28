---
type: "Decision"
title: "Decision: viewer hides raw full graph scopes"
description: "Decision: Kage viewer should not expose raw Focus selection or Everything graph scopes as normal product controls. Keep memory code edges internally for recall, ranking, stale checks, and evidence, but show them in the i"
tags: ["session-learning", "viewer", "ux", "memory-code"]
timestamp: "2026-05-07T06:06:00.028Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:decision-viewer-hides-raw-full-graph-scopes-1778133960028"
x-kage-type: "decision"
x-kage-status: "deprecated"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "deprecated"
---

# Decision: viewer hides raw full graph scopes

> Decision: Kage viewer should not expose raw Focus selection or Everything graph scopes as normal product controls. Ke…

Decision: Kage viewer should not expose raw Focus selection or Everything graph scopes as normal product controls. Keep memory-code edges internally for recall, ranking, stale checks, and evidence, but show them in the inspector as capped grouped evidence instead of dumping every edge onto the canvas.
Verified by: node --check mcp/viewer/app.js; git diff --check; npm test --prefix mcp

## Verification

node --check mcp/viewer/app.js; git diff --check; npm test --prefix mcp

# Citations

[1] explicit_capture (2026-05-07T06:06:00.028Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:decision-viewer-hides-raw-full-graph-scopes-1778133960028","title":"Decision: viewer hides raw full graph scopes","summary":"Decision: Kage viewer should not expose raw Focus selection or Everything graph scopes as normal product controls. Keep memory code edges internally for recall, ranking, stale checks, and evidence, but show them in the i","body":"Decision: Kage viewer should not expose raw Focus selection or Everything graph scopes as normal product controls. Keep memory-code edges internally for recall, ranking, stale checks, and evidence, but show them in the inspector as capped grouped evidence instead of dumping every edge onto the canvas.\nVerified by: node --check mcp/viewer/app.js; git diff --check; npm test --prefix mcp","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"deprecated","confidence":0.7,"tags":["session-learning","viewer","ux","memory-code"],"paths":[],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-07T06:06:00.028Z"}],"context":{"fact":"Kage viewer should not expose raw Focus selection or Everything graph scopes as normal product controls. Keep memory-code edges internally for recall, ranking, stale checks, and evidence, but show them in the inspector as capped grouped evidence instead of dumping every edge onto the canvas.","verification":"node --check mcp/viewer/app.js; git diff --check; npm test --prefix mcp"},"freshness":{"ttl_days":365,"last_verified_at":"2026-05-07T06:06:00.028Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":97,"stale":true,"stale_reasons":["packet status is deprecated"],"suggested_action":"mark_stale"},"created_at":"2026-05-07T06:06:00.028Z","updated_at":"2026-06-05T14:45:41.001Z"}
```

