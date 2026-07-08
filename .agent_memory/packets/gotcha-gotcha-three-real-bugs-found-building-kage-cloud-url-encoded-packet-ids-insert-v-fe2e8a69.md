---
type: "Gotcha"
title: "GOTCHA: three real bugs found building kage cloud — URL-encoded packet IDs, INSERT vs upsert, backwards test assertions"
description: "Building+testing mcp/cloud server.ts surfaced three real, non obvious bugs via actual HTTP round trips not caught by writing the code alone : 1 Kage packet IDs contain colons repo:...:decision:... ; the client's encodeUR"
resource: "mcp/cloud-server.ts"
tags: ["session-learning", "cloud", "gotcha", "url-encoding", "sqlite", "upsert", "testing"]
timestamp: "2026-07-08T21:40:37.914Z"
x-kage-id: "repo:https-github-com-kage-core-kage:gotcha:gotcha-three-real-bugs-found-building-kage-cloud-url-encoded-packet-ids-insert-v"
x-kage-type: "gotcha"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/cloud-server.ts", "mcp/cloud-server.test.ts"]
---

# GOTCHA: three real bugs found building kage cloud — URL-encoded packet IDs, INSERT vs upsert, backwards test assertions

> Building+testing mcp/cloud server.ts surfaced three real, non obvious bugs via actual HTTP round trips not caught by …

Building+testing mcp/cloud-server.ts surfaced three real, non-obvious bugs via actual HTTP round trips (not caught by writing the code alone): (1) Kage packet IDs contain colons (repo:...:decision:...); the client's encodeURIComponent() in the approve/reject URL path percent-encodes them, but url.pathname in Node's WHATWG URL does NOT auto-decode — every approve/reject 404'd until the server explicitly decodeURIComponent()'d the path segment before the DB lookup. (2) Packet IDs are deterministic (derived from title+type+repo), so resubmitting after a rejection collided on the SQLite PRIMARY KEY and 500'd; fixed with a real upsert (INSERT ... ON CONFLICT(id) DO UPDATE) that resets status to pending and clears prior approval on any resubmission — correct behavior, since silently re-trusting updated content on an already-approved id would defeat the review gate. (3) My own first test asserted assert.rejects() around a function (cloudPush) that collects per-item failures into a return value instead of throwing — the test failed even though the underlying behavior was correct, because I wrote the assertion backwards.
Evidence: All three found and fixed via real node --test runs against the live server, not code review: node --test dist/cloud-server.test.js failures showed exact 404s, 500s, and a misleading 'missing expected rejection' before each fix.
Verified by: npm test: 399/399 pass after all three fixes

## Verification

All three found and fixed via real node --test runs against the live server, not code review: node --test dist/cloud-server.test.js failures showed exact 404s, 500s, and a misleading 'missing expected rejection' before each fix.

# Citations

[1] explicit_capture (2026-07-08T21:40:37.914Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:gotcha:gotcha-three-real-bugs-found-building-kage-cloud-url-encoded-packet-ids-insert-v","title":"GOTCHA: three real bugs found building kage cloud — URL-encoded packet IDs, INSERT vs upsert, backwards test assertions","summary":"Building+testing mcp/cloud server.ts surfaced three real, non obvious bugs via actual HTTP round trips not caught by writing the code alone : 1 Kage packet IDs contain colons repo:...:decision:... ; the client's encodeUR","body":"Building+testing mcp/cloud-server.ts surfaced three real, non-obvious bugs via actual HTTP round trips (not caught by writing the code alone): (1) Kage packet IDs contain colons (repo:...:decision:...); the client's encodeURIComponent() in the approve/reject URL path percent-encodes them, but url.pathname in Node's WHATWG URL does NOT auto-decode — every approve/reject 404'd until the server explicitly decodeURIComponent()'d the path segment before the DB lookup. (2) Packet IDs are deterministic (derived from title+type+repo), so resubmitting after a rejection collided on the SQLite PRIMARY KEY and 500'd; fixed with a real upsert (INSERT ... ON CONFLICT(id) DO UPDATE) that resets status to pending and clears prior approval on any resubmission — correct behavior, since silently re-trusting updated content on an already-approved id would defeat the review gate. (3) My own first test asserted assert.rejects() around a function (cloudPush) that collects per-item failures into a return value instead of throwing — the test failed even though the underlying behavior was correct, because I wrote the assertion backwards.\nEvidence: All three found and fixed via real node --test runs against the live server, not code review: node --test dist/cloud-server.test.js failures showed exact 404s, 500s, and a misleading 'missing expected rejection' before each fix.\nVerified by: npm test: 399/399 pass after all three fixes","type":"gotcha","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","cloud","gotcha","url-encoding","sqlite","upsert","testing"],"paths":["mcp/cloud-server.ts","mcp/cloud-server.test.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-07-08T21:40:37.914Z"}],"context":{"fact":"...); the client's encodeURIComponent() in the approve/reject URL path percent-encodes them, but url.pathname in Node's WHATWG URL does NOT auto-decode — every approve/reject 404'd until the server explicitly decodeURIComponent()'d the path segment before the DB lookup. (2) Packet IDs are deterministic (derived from title+type+repo), so resubmitting after a rejection collided on the SQLite PRIMARY KEY and 500'd; fixed with a real upsert (INSERT ... ON CONFLICT(id) DO UPDATE) that resets status to pending and clears prior approval on any resubmission — correct behavior, since silently re-trusting updated content on an already-approved id would defeat the review gate. (3) My own first test asserted assert.rejects() around a function (cloudPush) that collects per-item failures into a return value instead of throwing — the test failed even though the underlying behavior was correct, because I wrote the assertion backwards.","verification":"All three found and fixed via real node --test runs against the live server, not code review: node --test dist/cloud-server.test.js failures showed exact 404s, 500s, and a misleading 'missing expected rejection' before each fix."},"freshness":{"ttl_days":365,"last_verified_at":"2026-07-08T21:40:37.914Z","path_fingerprints":[{"path":"mcp/cloud-server.ts","sha256":"dd66ec18bd45b2efd9ecbf9cde954d09ccf1f7a948189082a34811b127d770a8","size":12401},{"path":"mcp/cloud-server.test.ts","sha256":"70334e85c4060bf93dfa59c2e1f2b67548c46515bc29d89f892f4d4f79f056ca","size":6434}],"path_fingerprint_policy":"source_hash_staleness","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"discovery_tokens":8000,"discovery_tokens_estimated":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":357},"created_at":"2026-07-08T21:40:37.914Z","updated_at":"2026-07-08T21:40:37.914Z","author_branch":"master","author_name":"Kushal Jain"}
```

