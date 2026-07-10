---
type: "Code Explanation"
title: "Viewer 3D graph mode architecture"
description: "The viewer keeps 2D canvas as the default graph renderer and adds an optional Graph Mode=3D Space path. 3D reuses the same visible entity/edge filtering and selection state, lazy loads Three.js from /vendor/three with a"
resource: "mcp/daemon.ts"
tags: ["session-learning", "viewer", "threejs", "code-graph"]
timestamp: "2026-05-11T08:41:16.683Z"
x-kage-id: "repo:https-github-com-kage-core-kage:code_explanation:viewer-3d-graph-mode-architecture-1778488876684"
x-kage-type: "code_explanation"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/daemon.ts"]
---

# Viewer 3D graph mode architecture

> The viewer keeps 2D canvas as the default graph renderer and adds an optional Graph Mode=3D Space path. 3D reuses the…

The viewer keeps 2D canvas as the default graph renderer and adds an optional Graph Mode=3D Space path. 3D reuses the same visible entity/edge filtering and selection state, lazy-loads Three.js from /vendor/three with a CDN fallback for hosted pages, and the daemon serves /vendor/three from mcp/node_modules/three.
Evidence: Implemented in mcp/viewer/app.js, mcp/viewer/index.html, mcp/viewer/styles.css, and mcp/daemon.ts. Verified with npm test and Playwright desktop/mobile WebGL screenshot pixel checks.
Verified by: npm test --prefix mcp; Playwright screenshot/pixel checks for render=3d desktop and mobile

## Verification

Implemented in mcp/viewer/app.js, mcp/viewer/index.html, mcp/viewer/styles.css, and mcp/daemon.ts. Verified with npm test and Playwright desktop/mobile WebGL screenshot pixel checks.

# Citations

[1] explicit_capture (2026-05-11T08:41:16.683Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:code_explanation:viewer-3d-graph-mode-architecture-1778488876684","title":"Viewer 3D graph mode architecture","summary":"The viewer keeps 2D canvas as the default graph renderer and adds an optional Graph Mode=3D Space path. 3D reuses the same visible entity/edge filtering and selection state, lazy loads Three.js from /vendor/three with a","body":"The viewer keeps 2D canvas as the default graph renderer and adds an optional Graph Mode=3D Space path. 3D reuses the same visible entity/edge filtering and selection state, lazy-loads Three.js from /vendor/three with a CDN fallback for hosted pages, and the daemon serves /vendor/three from mcp/node_modules/three.\nEvidence: Implemented in mcp/viewer/app.js, mcp/viewer/index.html, mcp/viewer/styles.css, and mcp/daemon.ts. Verified with npm test and Playwright desktop/mobile WebGL screenshot pixel checks.\nVerified by: npm test --prefix mcp; Playwright screenshot/pixel checks for render=3d desktop and mobile","type":"code_explanation","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","viewer","threejs","code-graph"],"paths":["mcp/daemon.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-11T08:41:16.683Z"}],"context":{"fact":"The viewer keeps 2D canvas as the default graph renderer and adds an optional Graph Mode=3D Space path. 3D reuses the same visible entity/edge filtering and selection state, lazy-loads Three.js from /vendor/three with a CDN fallback for hosted pages, and the daemon serves /vendor/three from mcp/node_modules/three.\nEvidence: Implemented in mcp/viewer/app.js, mcp/viewer/index.html, mcp/viewer/styles.css, and mcp/daemon.ts. Verified with npm test and Playwright desktop/mobile WebGL screenshot pixel checks.\nVerified by: npm test --prefix mcp; Playwright screenshot/pixel checks for render=3d desktop and mobile","verification":"Implemented in mcp/viewer/app.js, mcp/viewer/index.html, mcp/viewer/styles.css, and mcp/daemon.ts. Verified with npm test and Playwright desktop/mobile WebGL screenshot pixel checks."},"freshness":{"ttl_days":365,"last_verified_at":"2026-05-11T08:41:16.683Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":1,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":153,"total_uses":1,"last_accessed_at":"2026-07-10T12:12:21.117Z"},"created_at":"2026-05-11T08:41:16.683Z","updated_at":"2026-07-03T16:16:26.695Z"}
```

