---
type: "Decision"
title: "Kage viewer benchmark reports now include a proof ledger with the measured metric, target"
description: "Kage viewer benchmark reports now include a proof ledger with the measured metric, target threshold, pass state, exact command, and next action for coding memory retrieval, memory scale sanity, and repo trust gates. This"
resource: "mcp/daemon.ts"
tags: ["session-learning", "benchmark", "viewer", "proof-ledger"]
timestamp: "2026-06-15T21:58:27.113Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:kage-viewer-benchmark-reports-now-include-a-proof-ledger-with-the-measured-metri"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/daemon.ts", "mcp/daemon.test.ts", "README.md", "benchmarks/README.md", "mcp/README.md", "docs/guide.html"]
---

# Kage viewer benchmark reports now include a proof ledger with the measured metric, target

> Kage viewer benchmark reports now include a proof ledger with the measured metric, target threshold, pass state, exac…

Kage viewer benchmark reports now include a proof ledger with the measured metric, target threshold, pass state, exact command, and next action for coding-memory retrieval, memory-scale sanity, and repo trust gates. This was added after comparing benchmark-reporting best practices: Kage should make proof reproducible and visible in the viewer, not only store scores in benchmark JSON or README prose.
Verified by: npm test --prefix mcp; node --check mcp/viewer/app.js; node --check docs/viewer/app.js

## Verification

npm test --prefix mcp; node --check mcp/viewer/app.js; node --check docs/viewer/app.js

# Citations

[1] explicit_capture (2026-05-17T22:40:42.005Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:kage-viewer-benchmark-reports-now-include-a-proof-ledger-with-the-measured-metri","title":"Kage viewer benchmark reports now include a proof ledger with the measured metric, target","summary":"Kage viewer benchmark reports now include a proof ledger with the measured metric, target threshold, pass state, exact command, and next action for coding memory retrieval, memory scale sanity, and repo trust gates. This","body":"Kage viewer benchmark reports now include a proof ledger with the measured metric, target threshold, pass state, exact command, and next action for coding-memory retrieval, memory-scale sanity, and repo trust gates. This was added after comparing benchmark-reporting best practices: Kage should make proof reproducible and visible in the viewer, not only store scores in benchmark JSON or README prose.\nVerified by: npm test --prefix mcp; node --check mcp/viewer/app.js; node --check docs/viewer/app.js","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","benchmark","viewer","proof-ledger"],"paths":["mcp/daemon.ts","mcp/daemon.test.ts","README.md","benchmarks/README.md","mcp/README.md","docs/guide.html"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-17T22:40:42.005Z"}],"context":{"fact":"Kage viewer benchmark reports now include a proof ledger with the measured metric, target threshold, pass state, exact command, and next action for coding-memory retrieval, memory-scale sanity, and repo trust gates. This was added after comparing benchmark-reporting best practices: Kage should make proof reproducible and visible in the viewer, not only store scores in benchmark JSON or README prose.\nVerified by: npm test --prefix mcp; node --check mcp/viewer/app.js; node --check docs/viewer/app.js","verification":"npm test --prefix mcp; node --check mcp/viewer/app.js; node --check docs/viewer/app.js"},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:27.113Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/daemon.ts","sha256":"4d558ba09071b09ab3d1a62d40af04edf17609c9ea98a571405883424cc1bf2f","size":38423,"symbols":[{"name":"gates","kind":"constant","sha256":"a1192d06de1fa74133b91caae5ac98af1fa094f213eeab6e7c69e30efaf6ff4e"},{"name":"json","kind":"function","sha256":"c6cfd13a6f9203c85fedf4efd643fcb209309a376a34ce77909c444a05e9b0e5"},{"name":"reports","kind":"constant","sha256":"519ba3efc1950f2775b99f1d94f37e91b5caf269d027aedf80130fb06e9737ce"}]},{"path":"mcp/daemon.test.ts","sha256":"ef48ce8b21ff33ed39379a9be695f863280d552399973a742c0e3932c21bfe1e","size":12250,"symbols":[{"name":"reports","kind":"constant","sha256":"8d1873e277e7aaba043a57764409144f854d581cfc938e6edb9defca99edab0b"}]},{"path":"README.md","sha256":"9a533eee7962e84cdceef1bd8c9463233a575138fa143acafc8abd42f723944a","size":10477},{"path":"benchmarks/README.md","sha256":"34ffe0979b86578a900bfb7c13e6236aa7952b5867af6090c1501a54d9a41c16","size":9904},{"path":"mcp/README.md","sha256":"5c852f608754e299c2cff74495862f1ce4775d0bda5776d7ce4f070f4e4a6494","size":10129},{"path":"docs/guide.html","sha256":"33b57e522b1a49e48631042940e2ca7d281084371c3feb3210604e213e0e7f28","size":51769}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":1,"votes_down":0,"uses_30d":20,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":126,"reverified_at":"2026-06-15T21:58:27.113Z","total_uses":44,"last_accessed_at":"2026-07-06T13:50:08.678Z"},"created_at":"2026-05-17T22:40:42.005Z","updated_at":"2026-07-03T16:16:26.707Z"}
```

