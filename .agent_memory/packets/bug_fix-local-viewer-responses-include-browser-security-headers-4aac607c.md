---
type: "Bug Fix"
title: "Local viewer responses include browser security headers"
description: "Kage's local viewer now serves static files with conservative browser security headers: CSP blocks inline scripts and script attributes, nosniff prevents MIME sniffing, referrer policy is no referrer, COOP is same origin"
resource: "mcp/daemon.ts"
tags: ["session-learning", "viewer", "security", "csp", "daemon"]
timestamp: "2026-06-15T21:58:25.058Z"
x-kage-id: "repo:https-github-com-kage-core-kage:bug_fix:local-viewer-responses-include-browser-security-headers-1779050518395"
x-kage-type: "bug_fix"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/daemon.ts", "mcp/daemon.test.ts", "README.md", "mcp/README.md"]
---

# Local viewer responses include browser security headers

> Kage's local viewer now serves static files with conservative browser security headers: CSP blocks inline scripts and…

Kage's local viewer now serves static files with conservative browser security headers: CSP blocks inline scripts and script attributes, nosniff prevents MIME sniffing, referrer-policy is no-referrer, COOP is same-origin, and frame-ancestors is none. This follows the local viewer security review without adding nonce complexity because Kage loads app.js as an external script.
Evidence: Implemented viewerStaticHeaders in mcp/daemon.ts, added daemon regression coverage in mcp/daemon.test.ts, and documented the local viewer hardening in README.md and mcp/README.md.
Verified by: npm test --prefix mcp; curl -I http://127.0.0.1:8767/viewer/index.html

## Verification

Implemented viewerStaticHeaders in mcp/daemon.ts, added daemon regression coverage in mcp/daemon.test.ts, and documented the local viewer hardening in README.md and mcp/README.md.

# Citations

[1] explicit_capture (2026-05-17T20:41:58.395Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:bug_fix:local-viewer-responses-include-browser-security-headers-1779050518395","title":"Local viewer responses include browser security headers","summary":"Kage's local viewer now serves static files with conservative browser security headers: CSP blocks inline scripts and script attributes, nosniff prevents MIME sniffing, referrer policy is no referrer, COOP is same origin","body":"Kage's local viewer now serves static files with conservative browser security headers: CSP blocks inline scripts and script attributes, nosniff prevents MIME sniffing, referrer-policy is no-referrer, COOP is same-origin, and frame-ancestors is none. This follows the local viewer security review without adding nonce complexity because Kage loads app.js as an external script.\nEvidence: Implemented viewerStaticHeaders in mcp/daemon.ts, added daemon regression coverage in mcp/daemon.test.ts, and documented the local viewer hardening in README.md and mcp/README.md.\nVerified by: npm test --prefix mcp; curl -I http://127.0.0.1:8767/viewer/index.html","type":"bug_fix","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","viewer","security","csp","daemon"],"paths":["mcp/daemon.ts","mcp/daemon.test.ts","README.md","mcp/README.md"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-17T20:41:58.395Z"}],"context":{"fact":"Kage's local viewer now serves static files with conservative browser security headers: CSP blocks inline scripts and script attributes, nosniff prevents MIME sniffing, referrer-policy is no-referrer, COOP is same-origin, and frame-ancestors is none. This follows the local viewer security review without adding nonce complexity because Kage loads app.js as an external script.\nEvidence: Implemented viewerStaticHeaders in mcp/daemon.ts, added daemon regression coverage in mcp/daemon.test.ts, and documented the local viewer hardening in README.md and mcp/README.md.\nVerified by: npm test --prefix mcp; curl -I http://127.0.0.1:8767/viewer/index.html","verification":"Implemented viewerStaticHeaders in mcp/daemon.ts, added daemon regression coverage in mcp/daemon.test.ts, and documented the local viewer hardening in README.md and mcp/README.md."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:25.058Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/daemon.ts","sha256":"4d558ba09071b09ab3d1a62d40af04edf17609c9ea98a571405883424cc1bf2f","size":38423,"symbols":[{"name":"viewerstaticheaders","kind":"function","sha256":"79ee8c9984b8adf2a762e5744dab4e12175cb1b138e1da2da42d01aa5d97472a"},{"name":"files","kind":"constant","sha256":"69140299050f3544f2a8f5cdcfa3672dd7f2a78cf8960d3197b23624253b5b9e"}]},{"path":"mcp/daemon.test.ts","sha256":"ef48ce8b21ff33ed39379a9be695f863280d552399973a742c0e3932c21bfe1e","size":12250,"symbols":[{"name":"headers","kind":"constant","sha256":"1f963460b9cc31fd7268aec54bfe87681383604fc46ef85358abdde2197d058f"}]},{"path":"README.md","sha256":"9a533eee7962e84cdceef1bd8c9463233a575138fa143acafc8abd42f723944a","size":10477},{"path":"mcp/README.md","sha256":"5c852f608754e299c2cff74495862f1ce4775d0bda5776d7ce4f070f4e4a6494","size":10129}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":165,"reverified_at":"2026-06-15T21:58:25.058Z","total_uses":0},"created_at":"2026-05-17T20:41:58.395Z","updated_at":"2026-07-03T16:16:26.678Z"}
```

