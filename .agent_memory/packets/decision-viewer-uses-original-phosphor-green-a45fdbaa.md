---
type: "Decision"
title: "Viewer uses original phosphor green"
description: "Viewer green theme means the original Kage phosphor palette, not pale mint. Use 41ff8f for strong terminal text and active UI, b9fbc0 for normal terminal text, 6ea77d for dim terminal text, and the original monospace sta"
tags: ["session-learning"]
timestamp: "2026-05-15T14:18:54.964Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:viewer-uses-original-phosphor-green-1778854734965"
x-kage-type: "decision"
x-kage-status: "deprecated"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "deprecated"
---

# Viewer uses original phosphor green

> Viewer green theme means the original Kage phosphor palette, not pale mint. Use 41ff8f for strong terminal text and a…

Viewer green theme means the original Kage phosphor palette, not pale mint. Use #41ff8f for strong terminal text and active UI, #b9fbc0 for normal terminal text, #6ea77d for dim terminal text, and the original monospace stack for the terminal feel.
Verified by: Playwright computed h1/nav/panel color rgb(65, 255, 143); screenshot /tmp/kage-viewer-original-green.png; diff -qr mcp/viewer docs/viewer; git diff --check; npm test --prefix mcp

## Verification

Playwright computed h1/nav/panel color rgb(65, 255, 143); screenshot /tmp/kage-viewer-original-green.png; diff -qr mcp/viewer docs/viewer; git diff --check; npm test --prefix mcp

# Citations

[1] explicit_capture (2026-05-15T14:18:54.964Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:viewer-uses-original-phosphor-green-1778854734965","title":"Viewer uses original phosphor green","summary":"Viewer green theme means the original Kage phosphor palette, not pale mint. Use 41ff8f for strong terminal text and active UI, b9fbc0 for normal terminal text, 6ea77d for dim terminal text, and the original monospace sta","body":"Viewer green theme means the original Kage phosphor palette, not pale mint. Use #41ff8f for strong terminal text and active UI, #b9fbc0 for normal terminal text, #6ea77d for dim terminal text, and the original monospace stack for the terminal feel.\nVerified by: Playwright computed h1/nav/panel color rgb(65, 255, 143); screenshot /tmp/kage-viewer-original-green.png; diff -qr mcp/viewer docs/viewer; git diff --check; npm test --prefix mcp","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"deprecated","confidence":0.7,"tags":["session-learning"],"paths":[],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-15T14:18:54.964Z"}],"context":{"fact":"Viewer green theme means the original Kage phosphor palette, not pale mint. Use #41ff8f for strong terminal text and active UI, #b9fbc0 for normal terminal text, #6ea77d for dim terminal text, and the original monospace stack for the terminal feel.\nVerified by: Playwright computed h1/nav/panel color rgb(65, 255, 143); screenshot /tmp/kage-viewer-original-green.png; diff -qr mcp/viewer docs/viewer; git diff --check; npm test --prefix mcp","verification":"Playwright computed h1/nav/panel color rgb(65, 255, 143); screenshot /tmp/kage-viewer-original-green.png; diff -qr mcp/viewer docs/viewer; git diff --check; npm test --prefix mcp"},"freshness":{"ttl_days":365,"last_verified_at":"2026-05-15T14:18:54.964Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":1,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":110,"stale":true,"stale_reasons":["packet status is deprecated"],"suggested_action":"mark_stale"},"created_at":"2026-05-15T14:18:54.964Z","updated_at":"2026-06-05T14:45:41.007Z"}
```

