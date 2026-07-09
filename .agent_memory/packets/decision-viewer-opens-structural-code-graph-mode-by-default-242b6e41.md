---
type: "Decision"
title: "Viewer opens structural code graph mode by default"
description: "The local viewer should open kage viewer sessions in Code mode with an explicit structural code graph label, because Combined mode makes the optimized structural code graph look like the old memory heavy graph. Memory an"
resource: "mcp/daemon.ts"
tags: ["session-learning", "viewer", "code-graph", "structural-index", "ux"]
timestamp: "2026-05-09T03:34:34.121Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:viewer-opens-structural-code-graph-mode-by-default-1778297674121"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/daemon.ts"]
---

# Viewer opens structural code graph mode by default

> The local viewer should open kage viewer sessions in Code mode with an explicit structural code graph label, because …

The local viewer should open kage viewer sessions in Code mode with an explicit structural code graph label, because Combined mode makes the optimized structural code graph look like the old memory-heavy graph. Memory and Combined remain available as view controls, but the default should prove the code graph artifact path.
Evidence: Patched mcp/daemon.ts to append view=code, patched mcp/viewer/app.js to read view/mode URL params and label graph/code artifacts, then visually verified Chrome shows View: Code and structural code graph loaded.
Verified by: node --check mcp/viewer/app.js; npm --prefix mcp test

## Verification

Patched mcp/daemon.ts to append view=code, patched mcp/viewer/app.js to read view/mode URL params and label graph/code artifacts, then visually verified Chrome shows View: Code and structural code graph loaded.

# Citations

[1] explicit_capture (2026-05-09T03:34:34.121Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:viewer-opens-structural-code-graph-mode-by-default-1778297674121","title":"Viewer opens structural code graph mode by default","summary":"The local viewer should open kage viewer sessions in Code mode with an explicit structural code graph label, because Combined mode makes the optimized structural code graph look like the old memory heavy graph. Memory an","body":"The local viewer should open kage viewer sessions in Code mode with an explicit structural code graph label, because Combined mode makes the optimized structural code graph look like the old memory-heavy graph. Memory and Combined remain available as view controls, but the default should prove the code graph artifact path.\nEvidence: Patched mcp/daemon.ts to append view=code, patched mcp/viewer/app.js to read view/mode URL params and label graph/code artifacts, then visually verified Chrome shows View: Code and structural code graph loaded.\nVerified by: node --check mcp/viewer/app.js; npm --prefix mcp test","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","viewer","code-graph","structural-index","ux"],"paths":["mcp/daemon.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-09T03:34:34.121Z"}],"context":{"fact":"The local viewer should open kage viewer sessions in Code mode with an explicit structural code graph label, because Combined mode makes the optimized structural code graph look like the old memory-heavy graph. Memory and Combined remain available as view controls, but the default should prove the code graph artifact path.\nEvidence: Patched mcp/daemon.ts to append view=code, patched mcp/viewer/app.js to read view/mode URL params and label graph/code artifacts, then visually verified Chrome shows View: Code and structural code graph loaded.\nVerified by: node --check mcp/viewer/app.js; npm --prefix mcp test","verification":"Patched mcp/daemon.ts to append view=code, patched mcp/viewer/app.js to read view/mode URL params and label graph/code artifacts, then visually verified Chrome shows View: Code and structural code graph loaded."},"freshness":{"ttl_days":365,"last_verified_at":"2026-05-09T03:34:34.121Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":5,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":153,"total_uses":5,"last_accessed_at":"2026-07-09T06:14:07.008Z"},"created_at":"2026-05-09T03:34:34.121Z","updated_at":"2026-07-03T16:16:26.719Z"}
```

