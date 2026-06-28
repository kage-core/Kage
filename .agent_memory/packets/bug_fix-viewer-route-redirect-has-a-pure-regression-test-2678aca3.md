---
type: "Bug Fix"
title: "Viewer route redirect has a pure regression test"
description: "The local viewer redirect logic is now covered by a pure daemon unit test. viewerRedirectLocation verifies that /, /viewer, and /viewer/ redirect to /viewer/index.html while preserving explicit query params or falling ba"
resource: "mcp/daemon.ts"
tags: ["session-learning", "viewer"]
timestamp: "2026-05-17T20:23:28.267Z"
x-kage-id: "repo:https-github-com-kage-core-kage:bug_fix:viewer-route-redirect-has-a-pure-regression-test-1779049408268"
x-kage-type: "bug_fix"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "verified"
x-kage-paths: ["mcp/daemon.ts"]
---

# Viewer route redirect has a pure regression test

> The local viewer redirect logic is now covered by a pure daemon unit test. viewerRedirectLocation verifies that /, /v…

The local viewer redirect logic is now covered by a pure daemon unit test. viewerRedirectLocation verifies that /, /viewer, and /viewer/ redirect to /viewer/index.html while preserving explicit query params or falling back to the generated local graph query string, and that concrete viewer pages such as /viewer/graph.html do not redirect.
Evidence: Added mcp/daemon.test.ts and exported viewerRedirectLocation from mcp/daemon.ts.
Verified by: npm test --prefix mcp

## Verification

Added mcp/daemon.test.ts and exported viewerRedirectLocation from mcp/daemon.ts.

# Citations

[1] explicit_capture (2026-05-17T20:23:28.267Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:bug_fix:viewer-route-redirect-has-a-pure-regression-test-1779049408268","title":"Viewer route redirect has a pure regression test","summary":"The local viewer redirect logic is now covered by a pure daemon unit test. viewerRedirectLocation verifies that /, /viewer, and /viewer/ redirect to /viewer/index.html while preserving explicit query params or falling ba","body":"The local viewer redirect logic is now covered by a pure daemon unit test. viewerRedirectLocation verifies that /, /viewer, and /viewer/ redirect to /viewer/index.html while preserving explicit query params or falling back to the generated local graph query string, and that concrete viewer pages such as /viewer/graph.html do not redirect.\nEvidence: Added mcp/daemon.test.ts and exported viewerRedirectLocation from mcp/daemon.ts.\nVerified by: npm test --prefix mcp","type":"bug_fix","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","viewer"],"paths":["mcp/daemon.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-17T20:23:28.267Z"}],"context":{"fact":"The local viewer redirect logic is now covered by a pure daemon unit test. viewerRedirectLocation verifies that /, /viewer, and /viewer/ redirect to /viewer/index.html while preserving explicit query params or falling back to the generated local graph query string, and that concrete viewer pages such as /viewer/graph.html do not redirect.\nEvidence: Added mcp/daemon.test.ts and exported viewerRedirectLocation from mcp/daemon.ts.\nVerified by: npm test --prefix mcp","verification":"Added mcp/daemon.test.ts and exported viewerRedirectLocation from mcp/daemon.ts."},"freshness":{"ttl_days":365,"last_verified_at":"2026-05-17T20:23:28.267Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":117},"created_at":"2026-05-17T20:23:28.267Z","updated_at":"2026-05-19T04:50:14.883Z"}
```

