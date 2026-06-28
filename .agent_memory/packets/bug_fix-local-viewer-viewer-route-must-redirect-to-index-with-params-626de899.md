---
type: "Bug Fix"
title: "Local viewer /viewer/ route must redirect to index with params"
description: "The local viewer daemon must treat /viewer/ like /viewer and redirect it to /viewer/index.html while preserving the query string. The Overview nav uses href ./ with the local graph query params, which lands on /viewer/?g"
resource: "mcp/daemon.ts"
tags: ["session-learning", "viewer"]
timestamp: "2026-05-17T20:20:45.274Z"
x-kage-id: "repo:https-github-com-kage-core-kage:bug_fix:local-viewer-viewer-route-must-redirect-to-index-with-params-1779049245274"
x-kage-type: "bug_fix"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "verified"
x-kage-paths: ["mcp/daemon.ts"]
---

# Local viewer /viewer/ route must redirect to index with params

> The local viewer daemon must treat /viewer/ like /viewer and redirect it to /viewer/index.html while preserving the q…

The local viewer daemon must treat /viewer/ like /viewer and redirect it to /viewer/index.html while preserving the query string. The Overview nav uses href ./ with the local graph query params, which lands on /viewer/?graph=...; before this fix the daemon served the directory path as a blank page, breaking click-through navigation from Overview.
Evidence: Fixed in mcp/daemon.ts. Headless Playwright click-through from http://127.0.0.1:8766/ across Overview, Graph, Memory, Risks, Review, Owners, and Artifacts preserved graph params, loaded the real repo graph, had zero console 404s, and no horizontal overflow.
Verified by: npm run build --prefix mcp; headless Playwright local viewer route smoke

## Verification

Fixed in mcp/daemon.ts. Headless Playwright click-through from http://127.0.0.1:8766/ across Overview, Graph, Memory, Risks, Review, Owners, and Artifacts preserved graph params, loaded the real repo graph, had zero console 404s, and no horizontal overflow.

# Citations

[1] explicit_capture (2026-05-17T20:20:45.274Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:bug_fix:local-viewer-viewer-route-must-redirect-to-index-with-params-1779049245274","title":"Local viewer /viewer/ route must redirect to index with params","summary":"The local viewer daemon must treat /viewer/ like /viewer and redirect it to /viewer/index.html while preserving the query string. The Overview nav uses href ./ with the local graph query params, which lands on /viewer/?g","body":"The local viewer daemon must treat /viewer/ like /viewer and redirect it to /viewer/index.html while preserving the query string. The Overview nav uses href ./ with the local graph query params, which lands on /viewer/?graph=...; before this fix the daemon served the directory path as a blank page, breaking click-through navigation from Overview.\nEvidence: Fixed in mcp/daemon.ts. Headless Playwright click-through from http://127.0.0.1:8766/ across Overview, Graph, Memory, Risks, Review, Owners, and Artifacts preserved graph params, loaded the real repo graph, had zero console 404s, and no horizontal overflow.\nVerified by: npm run build --prefix mcp; headless Playwright local viewer route smoke","type":"bug_fix","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","viewer"],"paths":["mcp/daemon.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-17T20:20:45.274Z"}],"context":{"fact":"The local viewer daemon must treat /viewer/ like /viewer and redirect it to /viewer/index.html while preserving the query string. The Overview nav uses href ./ with the local graph query params, which lands on /viewer/?graph=...; before this fix the daemon served the directory path as a blank page, breaking click-through navigation from Overview.\nEvidence: Fixed in mcp/daemon.ts. Headless Playwright click-through from http://127.0.0.1:8766/ across Overview, Graph, Memory, Risks, Review, Owners, and Artifacts preserved graph params, loaded the real repo graph, had zero console 404s, and no horizontal overflow.\nVerified by: npm run build --prefix mcp; headless Playwright local viewer route smoke","verification":"Fixed in mcp/daemon.ts. Headless Playwright click-through from http://127.0.0.1:8766/ across Overview, Graph, Memory, Risks, Review, Owners, and Artifacts preserved graph params, loaded the real repo graph, had zero console 404s, and no horizontal overflow."},"freshness":{"ttl_days":365,"last_verified_at":"2026-05-17T20:20:45.274Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":176},"created_at":"2026-05-17T20:20:45.274Z","updated_at":"2026-05-19T04:50:14.877Z"}
```

