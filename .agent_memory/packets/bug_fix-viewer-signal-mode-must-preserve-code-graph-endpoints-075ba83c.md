---
type: "Bug Fix"
title: "Viewer signal mode must preserve code graph endpoints"
description: "Large code graphs can have valid code relations but show zero visible relations if viewer signal ranking keeps only high degree symbols/tests and drops file endpoints. In code view, signal selection should add connected"
resource: "mcp/kernel.test.ts"
tags: ["session-learning", "viewer", "code-graph", "large-repo", "bug-fix"]
timestamp: "2026-06-15T21:58:39.738Z"
x-kage-id: "repo:https-github-com-kage-core-kage:bug_fix:viewer-signal-mode-must-preserve-code-graph-endpoints-1778307976101"
x-kage-type: "bug_fix"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.test.ts"]
---

# Viewer signal mode must preserve code graph endpoints

> Large code graphs can have valid code relations but show zero visible relations if viewer signal ranking keeps only h…

Large code graphs can have valid code relations but show zero visible relations if viewer signal ranking keeps only high-degree symbols/tests and drops file endpoints. In code view, signal selection should add connected peers from visible edges so file-to-symbol/import/call relationships survive the node cap. Verified by viewer test coverage and npm --prefix mcp test.
Evidence: Patched mcp/viewer/app.js connectedSignalEntities and added a viewer VM test with 120 files/symbols that asserts visible code edges remain under a 90-node cap.
Verified by: npm --prefix mcp test

## Verification

Patched mcp/viewer/app.js connectedSignalEntities and added a viewer VM test with 120 files/symbols that asserts visible code edges remain under a 90-node cap.

# Citations

[1] explicit_capture (2026-05-09T06:26:16.101Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:bug_fix:viewer-signal-mode-must-preserve-code-graph-endpoints-1778307976101","title":"Viewer signal mode must preserve code graph endpoints","summary":"Large code graphs can have valid code relations but show zero visible relations if viewer signal ranking keeps only high degree symbols/tests and drops file endpoints. In code view, signal selection should add connected","body":"Large code graphs can have valid code relations but show zero visible relations if viewer signal ranking keeps only high-degree symbols/tests and drops file endpoints. In code view, signal selection should add connected peers from visible edges so file-to-symbol/import/call relationships survive the node cap. Verified by viewer test coverage and npm --prefix mcp test.\nEvidence: Patched mcp/viewer/app.js connectedSignalEntities and added a viewer VM test with 120 files/symbols that asserts visible code edges remain under a 90-node cap.\nVerified by: npm --prefix mcp test","type":"bug_fix","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","viewer","code-graph","large-repo","bug-fix"],"paths":["mcp/kernel.test.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-09T06:26:16.101Z"}],"context":{"fact":"Large code graphs can have valid code relations but show zero visible relations if viewer signal ranking keeps only high-degree symbols/tests and drops file endpoints. In code view, signal selection should add connected peers from visible edges so file-to-symbol/import/call relationships survive the node cap. Verified by viewer test coverage and npm --prefix mcp test.\nEvidence: Patched mcp/viewer/app.js connectedSignalEntities and added a viewer VM test with 120 files/symbols that asserts visible code edges remain under a 90-node cap.\nVerified by: npm --prefix mcp test","verification":"Patched mcp/viewer/app.js connectedSignalEntities and added a viewer VM test with 120 files/symbols that asserts visible code edges remain under a 90-node cap."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:39.738Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"added","kind":"constant","sha256":"bc14da9c82da760a8d437c7e912b7909ab47e5de278fb9a951ae4702a8835975"},{"name":"edges","kind":"constant","sha256":"8c37bcd95245ff6d66b6f8b413ce98901f9c5e8bad1c2b4dc47e75e3b2815f73"},{"name":"signal","kind":"constant","sha256":"f084f4945e43a881cf04b4d6eff63df1f052d4d6e933b089af3696e2bc699289"},{"name":"valid","kind":"constant","sha256":"029777aa55811daaf54b01dd8e2c9c1ab732bfcc7fba76f4e65a958e6cd438f4"}]}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":12,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":144,"reverified_at":"2026-06-15T21:58:39.738Z","total_uses":12,"last_accessed_at":"2026-07-03T06:38:52.530Z"},"created_at":"2026-05-09T06:26:16.101Z","updated_at":"2026-07-03T16:16:26.690Z"}
```

