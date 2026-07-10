---
type: "Gotcha"
title: "Viewer root must redirect to parameterized /viewer/index.html"
description: "The local viewer cannot serve index.html directly at / or /viewer because relative assets like ./app.js resolve to /app.js and 404. Redirect bare viewer routes to /viewer/index.html with the generated graph/code/metrics"
resource: "mcp/daemon.ts"
tags: ["session-learning", "viewer", "daemon", "bugfix"]
timestamp: "2026-05-09T03:30:11.459Z"
x-kage-id: "repo:https-github-com-kage-core-kage:gotcha:viewer-root-must-redirect-to-parameterized-viewer-index-html-1778297411459"
x-kage-type: "gotcha"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/daemon.ts"]
---

# Viewer root must redirect to parameterized /viewer/index.html

> The local viewer cannot serve index.html directly at / or /viewer because relative assets like ./app.js resolve to /a…

The local viewer cannot serve index.html directly at / or /viewer because relative assets like ./app.js resolve to /app.js and 404. Redirect bare viewer routes to /viewer/index.html with the generated graph/code/metrics query string so naked kage viewer URLs render repo data.
Evidence: Verified with curl: /app.js returned 404 from bare root, /viewer/app.js returned 200, patched / returns 302 with graph/code/metrics params, and Chrome rendered the graph.
Verified by: npm --prefix mcp test

## Verification

Verified with curl: /app.js returned 404 from bare root, /viewer/app.js returned 200, patched / returns 302 with graph/code/metrics params, and Chrome rendered the graph.

# Citations

[1] explicit_capture (2026-05-09T03:30:11.459Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:gotcha:viewer-root-must-redirect-to-parameterized-viewer-index-html-1778297411459","title":"Viewer root must redirect to parameterized /viewer/index.html","summary":"The local viewer cannot serve index.html directly at / or /viewer because relative assets like ./app.js resolve to /app.js and 404. Redirect bare viewer routes to /viewer/index.html with the generated graph/code/metrics","body":"The local viewer cannot serve index.html directly at / or /viewer because relative assets like ./app.js resolve to /app.js and 404. Redirect bare viewer routes to /viewer/index.html with the generated graph/code/metrics query string so naked kage viewer URLs render repo data.\nEvidence: Verified with curl: /app.js returned 404 from bare root, /viewer/app.js returned 200, patched / returns 302 with graph/code/metrics params, and Chrome rendered the graph.\nVerified by: npm --prefix mcp test","type":"gotcha","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","viewer","daemon","bugfix"],"paths":["mcp/daemon.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-09T03:30:11.459Z"}],"context":{"fact":"The local viewer cannot serve index.html directly at / or /viewer because relative assets like ./app.js resolve to /app.js and 404. Redirect bare viewer routes to /viewer/index.html with the generated graph/code/metrics query string so naked kage viewer URLs render repo data.\nEvidence: Verified with curl: /app.js returned 404 from bare root, /viewer/app.js returned 200, patched / returns 302 with graph/code/metrics params, and Chrome rendered the graph.\nVerified by: npm --prefix mcp test","verification":"Verified with curl: /app.js returned 404 from bare root, /viewer/app.js returned 200, patched / returns 302 with graph/code/metrics params, and Chrome rendered the graph."},"freshness":{"ttl_days":365,"last_verified_at":"2026-05-09T03:30:11.459Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":123,"total_uses":0,"last_accessed_at":"2026-07-09T06:46:24.532Z"},"created_at":"2026-05-09T03:30:11.459Z","updated_at":"2026-07-03T16:16:26.724Z"}
```

