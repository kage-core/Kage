---
type: "Bug Fix"
title: "Viewer memory page keeps scrollable content bounded"
description: "The Memory page felt flimsy because lifecycle, review, timeline, audit, lineage, and session capture sections expanded above the actual memory list, leaving only about 220px of list height in a 1000px viewport. Keep gove"
resource: "mcp/daemon.test.ts"
tags: ["session-learning"]
timestamp: "2026-06-15T21:58:09.632Z"
x-kage-id: "repo:https-github-com-kage-core-kage:bug_fix:viewer-memory-page-keeps-scrollable-content-bounded-1779086811636"
x-kage-type: "bug_fix"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "verified"
x-kage-paths: ["mcp/daemon.test.ts"]
---

# Viewer memory page keeps scrollable content bounded

> The Memory page felt flimsy because lifecycle, review, timeline, audit, lineage, and session capture sections expande…

The Memory page felt flimsy because lifecycle, review, timeline, audit, lineage, and session-capture sections expanded above the actual memory list, leaving only about 220px of list height in a 1000px viewport. Keep governance reports collapsed behind .memory-governance, keep workspace pages viewport-bound, and reveal the inspector after selection so users see what changed. Verified with Playwright on the local viewer and npm test --prefix mcp -- --test-name-pattern 'viewer page workspaces'.
Verified by: Playwright local viewer check; npm test --prefix mcp -- --test-name-pattern 'viewer page workspaces'; node --check mcp/viewer/app.js; git diff --check

## Verification

Playwright local viewer check; npm test --prefix mcp -- --test-name-pattern 'viewer page workspaces'; node --check mcp/viewer/app.js; git diff --check

# Citations

[1] explicit_capture (2026-05-18T06:46:51.636Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:bug_fix:viewer-memory-page-keeps-scrollable-content-bounded-1779086811636","title":"Viewer memory page keeps scrollable content bounded","summary":"The Memory page felt flimsy because lifecycle, review, timeline, audit, lineage, and session capture sections expanded above the actual memory list, leaving only about 220px of list height in a 1000px viewport. Keep gove","body":"The Memory page felt flimsy because lifecycle, review, timeline, audit, lineage, and session-capture sections expanded above the actual memory list, leaving only about 220px of list height in a 1000px viewport. Keep governance reports collapsed behind .memory-governance, keep workspace pages viewport-bound, and reveal the inspector after selection so users see what changed. Verified with Playwright on the local viewer and npm test --prefix mcp -- --test-name-pattern 'viewer page workspaces'.\nVerified by: Playwright local viewer check; npm test --prefix mcp -- --test-name-pattern 'viewer page workspaces'; node --check mcp/viewer/app.js; git diff --check","type":"bug_fix","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning"],"paths":["mcp/daemon.test.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-18T06:46:51.636Z"}],"context":{"fact":"The Memory page felt flimsy because lifecycle, review, timeline, audit, lineage, and session-capture sections expanded above the actual memory list, leaving only about 220px of list height in a 1000px viewport. Keep governance reports collapsed behind .memory-governance, keep workspace pages viewport-bound, and reveal the inspector after selection so users see what changed. Verified with Playwright on the local viewer and npm test --prefix mcp -- --test-name-pattern 'viewer page workspaces'.\nVerified by: Playwright local viewer check; npm test --prefix mcp -- --test-name-pattern 'viewer page workspaces'; node --check mcp/viewer/app.js; git diff --check","verification":"Playwright local viewer check; npm test --prefix mcp -- --test-name-pattern 'viewer page workspaces'; node --check mcp/viewer/app.js; git diff --check"},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:09.632Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/daemon.test.ts","sha256":"ef48ce8b21ff33ed39379a9be695f863280d552399973a742c0e3932c21bfe1e","size":12250,"symbols":[{"name":"reports","kind":"constant","sha256":"8d1873e277e7aaba043a57764409144f854d581cfc938e6edb9defca99edab0b"}]}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":165,"reverified_at":"2026-06-15T21:58:09.632Z"},"created_at":"2026-05-18T06:46:51.636Z","updated_at":"2026-06-15T21:58:09.632Z"}
```

