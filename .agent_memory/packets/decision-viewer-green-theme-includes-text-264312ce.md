---
type: "Decision"
title: "Viewer green theme includes text"
description: "Viewer terminal identity requires visible green text, not only green borders or glow. Keep headings, active navigation, panel titles, memory/review/list titles, status values, and terminal metadata green tinted while pre"
tags: ["session-learning"]
timestamp: "2026-05-15T13:34:05.594Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:viewer-green-theme-includes-text-1778852045595"
x-kage-type: "decision"
x-kage-status: "deprecated"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "deprecated"
---

# Viewer green theme includes text

> Viewer terminal identity requires visible green text, not only green borders or glow. Keep headings, active navigatio…

Viewer terminal identity requires visible green text, not only green borders or glow. Keep headings, active navigation, panel titles, memory/review/list titles, status values, and terminal metadata green-tinted while preserving cyan for code and amber/red for warnings and risks.
Verified by: Playwright screenshot /tmp/kage-viewer-green-text.png; h1 computed color rgb(215, 255, 228); node --check mcp/viewer/app.js; node --check docs/viewer/app.js; diff -qr mcp/viewer docs/viewer; git diff --check; npm test --prefix mcp

## Verification

Playwright screenshot /tmp/kage-viewer-green-text.png; h1 computed color rgb(215, 255, 228); node --check mcp/viewer/app.js; node --check docs/viewer/app.js; diff -qr mcp/viewer docs/viewer; git diff --check; npm test --prefix mcp

# Citations

[1] explicit_capture (2026-05-15T13:34:05.594Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:viewer-green-theme-includes-text-1778852045595","title":"Viewer green theme includes text","summary":"Viewer terminal identity requires visible green text, not only green borders or glow. Keep headings, active navigation, panel titles, memory/review/list titles, status values, and terminal metadata green tinted while pre","body":"Viewer terminal identity requires visible green text, not only green borders or glow. Keep headings, active navigation, panel titles, memory/review/list titles, status values, and terminal metadata green-tinted while preserving cyan for code and amber/red for warnings and risks.\nVerified by: Playwright screenshot /tmp/kage-viewer-green-text.png; h1 computed color rgb(215, 255, 228); node --check mcp/viewer/app.js; node --check docs/viewer/app.js; diff -qr mcp/viewer docs/viewer; git diff --check; npm test --prefix mcp","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"deprecated","confidence":0.7,"tags":["session-learning"],"paths":[],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-15T13:34:05.594Z"}],"context":{"fact":"Viewer terminal identity requires visible green text, not only green borders or glow. Keep headings, active navigation, panel titles, memory/review/list titles, status values, and terminal metadata green-tinted while preserving cyan for code and amber/red for warnings and risks.\nVerified by: Playwright screenshot /tmp/kage-viewer-green-text.png; h1 computed color rgb(215, 255, 228); node --check mcp/viewer/app.js; node --check docs/viewer/app.js; diff -qr mcp/viewer docs/viewer; git diff --check; npm test --prefix mcp","verification":"Playwright screenshot /tmp/kage-viewer-green-text.png; h1 computed color rgb(215, 255, 228); node --check mcp/viewer/app.js; node --check docs/viewer/app.js; diff -qr mcp/viewer docs/viewer; git diff --check; npm test --prefix mcp"},"freshness":{"ttl_days":365,"last_verified_at":"2026-05-15T13:34:05.594Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":131,"stale":true,"stale_reasons":["packet status is deprecated"],"suggested_action":"mark_stale"},"created_at":"2026-05-15T13:34:05.594Z","updated_at":"2026-06-05T14:45:41.007Z"}
```

