---
type: "Decision"
title: "Viewer workflows stay action-first"
description: "Viewer UX should keep the graph page as the primary canvas, hide diagnostics as advanced, and keep page workflows action first. Memory page should show the packet library full width until a node is selected; only then sh"
tags: ["session-learning"]
timestamp: "2026-05-15T13:19:43.054Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:viewer-workflows-stay-action-first-1778851183054"
x-kage-type: "decision"
x-kage-status: "deprecated"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "deprecated"
---

# Viewer workflows stay action-first

> Viewer UX should keep the graph page as the primary canvas, hide diagnostics as advanced, and keep page workflows act…

Viewer UX should keep the graph page as the primary canvas, hide diagnostics as advanced, and keep page workflows action-first. Memory page should show the packet library full-width until a node is selected; only then show the inspector as a compact context panel. Mobile viewer should use compact primary tabs and keep the graph visible early in the first viewport.
Verified by: node --check mcp/viewer/app.js; node --check docs/viewer/app.js; diff -qr mcp/viewer docs/viewer; git diff --check; npm test --prefix mcp; Playwright desktop/mobile viewer screenshots

## Verification

node --check mcp/viewer/app.js; node --check docs/viewer/app.js; diff -qr mcp/viewer docs/viewer; git diff --check; npm test --prefix mcp; Playwright desktop/mobile viewer screenshots

# Citations

[1] explicit_capture (2026-05-15T13:19:43.054Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:viewer-workflows-stay-action-first-1778851183054","title":"Viewer workflows stay action-first","summary":"Viewer UX should keep the graph page as the primary canvas, hide diagnostics as advanced, and keep page workflows action first. Memory page should show the packet library full width until a node is selected; only then sh","body":"Viewer UX should keep the graph page as the primary canvas, hide diagnostics as advanced, and keep page workflows action-first. Memory page should show the packet library full-width until a node is selected; only then show the inspector as a compact context panel. Mobile viewer should use compact primary tabs and keep the graph visible early in the first viewport.\nVerified by: node --check mcp/viewer/app.js; node --check docs/viewer/app.js; diff -qr mcp/viewer docs/viewer; git diff --check; npm test --prefix mcp; Playwright desktop/mobile viewer screenshots","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"deprecated","confidence":0.7,"tags":["session-learning"],"paths":[],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-15T13:19:43.054Z"}],"context":{"fact":"Viewer UX should keep the graph page as the primary canvas, hide diagnostics as advanced, and keep page workflows action-first. Memory page should show the packet library full-width until a node is selected; only then show the inspector as a compact context panel. Mobile viewer should use compact primary tabs and keep the graph visible early in the first viewport.\nVerified by: node --check mcp/viewer/app.js; node --check docs/viewer/app.js; diff -qr mcp/viewer docs/viewer; git diff --check; npm test --prefix mcp; Playwright desktop/mobile viewer screenshots","verification":"node --check mcp/viewer/app.js; node --check docs/viewer/app.js; diff -qr mcp/viewer docs/viewer; git diff --check; npm test --prefix mcp; Playwright desktop/mobile viewer screenshots"},"freshness":{"ttl_days":365,"last_verified_at":"2026-05-15T13:19:43.054Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":141,"stale":true,"stale_reasons":["packet status is deprecated"],"suggested_action":"mark_stale"},"created_at":"2026-05-15T13:19:43.054Z","updated_at":"2026-06-05T14:45:41.008Z"}
```

