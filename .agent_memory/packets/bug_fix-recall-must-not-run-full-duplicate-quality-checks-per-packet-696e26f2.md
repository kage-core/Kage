---
type: "Bug Fix"
title: "Recall must not run full duplicate quality checks per packet"
description: "The synthetic memory scale benchmark exposed a recall latency bug: packets without stored quality.score made recall call evaluateMemoryQuality for every scored packet, which triggered duplicate scans during query time. R"
resource: "mcp/kernel.ts"
tags: ["session-learning"]
timestamp: "2026-06-15T21:58:07.782Z"
x-kage-id: "repo:https-github-com-kage-core-kage:bug_fix:recall-must-not-run-full-duplicate-quality-checks-per-packet-1779046204501"
x-kage-type: "bug_fix"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "benchmarks/scale-kage-memory.mjs", "benchmarks/README.md", "README.md"]
---

# Recall must not run full duplicate quality checks per packet

> The synthetic memory scale benchmark exposed a recall latency bug: packets without stored quality.score made recall c…

The synthetic memory scale benchmark exposed a recall latency bug: packets without stored quality.score made recall call evaluateMemoryQuality for every scored packet, which triggered duplicate scans during query time. Recall now uses a lightweight quality fallback and keeps expensive duplicate detection in validation/review reports. A 5,000-packet scale run now indexes in 7.8s and recalls with 334ms median latency at 100% hit rate @10.

# Citations

[1] explicit_capture (2026-05-17T19:30:04.501Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:bug_fix:recall-must-not-run-full-duplicate-quality-checks-per-packet-1779046204501","title":"Recall must not run full duplicate quality checks per packet","summary":"The synthetic memory scale benchmark exposed a recall latency bug: packets without stored quality.score made recall call evaluateMemoryQuality for every scored packet, which triggered duplicate scans during query time. R","body":"The synthetic memory scale benchmark exposed a recall latency bug: packets without stored quality.score made recall call evaluateMemoryQuality for every scored packet, which triggered duplicate scans during query time. Recall now uses a lightweight quality fallback and keeps expensive duplicate detection in validation/review reports. A 5,000-packet scale run now indexes in 7.8s and recalls with 334ms median latency at 100% hit rate @10.","type":"bug_fix","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning"],"paths":["mcp/kernel.ts","benchmarks/scale-kage-memory.mjs","benchmarks/README.md","README.md"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-17T19:30:04.501Z"}],"context":{"fact":"The synthetic memory scale benchmark exposed a recall latency bug: packets without stored quality.score made recall call evaluateMemoryQuality for every scored packet, which triggered duplicate scans during query time. Recall now uses a lightweight quality fallback and keeps expensive duplicate detection in validation/review reports. A 5,000-packet scale run now indexes in 7.8s and recalls with 334ms median latency at 100% hit rate @10."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:07.782Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"time","kind":"constant","sha256":"36aa0a901e7fda47d7d7571d9c21879432386e4418ed56010d7e03c9a91f5482"},{"name":"recalls","kind":"constant","sha256":"2704a413c046346d8b4cdcd807cad0b679283e78935118aa84244cda4f5b6808"},{"name":"evaluatememoryquality","kind":"function","sha256":"d1f0435c88a48c3afd01a35d2bd0bf315d786caea9a60fc162b7bb33dc9f3ef8"},{"name":"call","kind":"constant","sha256":"0e1296678bffa8037b9dc66bffb9dbec82218bdd1cd66c11e341879266eb9454"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"},{"name":"full","kind":"constant","sha256":"9213768c4e556655970d7db34f178f135ab91810c1a0a99bba63452c01924f4f"}]},{"path":"benchmarks/scale-kage-memory.mjs","sha256":"c0b8645c7ea97c82123e78199e499232c440ecfdbb5d92e7cf6a4469c78a33dc","size":1106},{"path":"benchmarks/README.md","sha256":"34ffe0979b86578a900bfb7c13e6236aa7952b5867af6090c1501a54d9a41c16","size":9904},{"path":"README.md","sha256":"9a533eee7962e84cdceef1bd8c9463233a575138fa143acafc8abd42f723944a","size":10477}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":5,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":110,"reverified_at":"2026-06-15T21:58:07.782Z","total_uses":5,"last_accessed_at":"2026-07-06T19:36:35.058Z"},"created_at":"2026-05-17T19:30:04.501Z","updated_at":"2026-07-03T16:16:26.678Z"}
```

