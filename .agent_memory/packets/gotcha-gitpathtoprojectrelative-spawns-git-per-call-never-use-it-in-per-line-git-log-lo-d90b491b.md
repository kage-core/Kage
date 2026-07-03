---
type: "Gotcha"
title: "gitPathToProjectRelative spawns git per call — never use it in per-line git log loops"
description: "gitPathToProjectRelative mcp/kernel.ts calls gitProjectPrefix, which runs 'git rev parse show prefix' via execFileSync on every invocation, plus an existsSync fallback. Calling it once per name line while parsing a full"
resource: "mcp/kernel.ts"
tags: ["session-learning", "performance", "git", "scan", "gotcha"]
timestamp: "2026-07-03T06:27:02.921Z"
x-kage-id: "repo:https-github-com-kage-core-kage:gotcha:gitpathtoprojectrelative-spawns-git-per-call-never-use-it-in-per-line-git-log-lo"
x-kage-type: "gotcha"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts"]
---

# gitPathToProjectRelative spawns git per call — never use it in per-line git log loops

> gitPathToProjectRelative mcp/kernel.ts calls gitProjectPrefix, which runs 'git rev parse show prefix' via execFileSyn…

gitPathToProjectRelative (mcp/kernel.ts) calls gitProjectPrefix, which runs 'git rev-parse --show-prefix' via execFileSync on every invocation, plus an existsSync fallback. Calling it once per name-line while parsing a full-history 'git log --name-only' walk made kage scan take ~66s on express (6k commits) — 99% of CPU in spawnSync. Fix used by truthReport: resolve the prefix once before the loop and strip it inline, then filter against the code-graph file set; scan dropped to ~0.3s. Any future kernel feature that maps git log paths in bulk must hoist the prefix resolution the same way. (Rescued from a stale agent worktree where it was stranded — originally captured during the v2 truth-report build.)
Evidence: node --cpu-prof showed 99.4% of samples in spawnSync during kage scan on express; hoisting the prefix dropped scan from ~66s to ~0.3s
Verified by: cpu profile + before/after scan timing on express (6k commits)

## Verification

node --cpu-prof showed 99.4% of samples in spawnSync during kage scan on express; hoisting the prefix dropped scan from ~66s to ~0.3s

# Citations

[1] explicit_capture (2026-07-02T11:16:45.341Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:gotcha:gitpathtoprojectrelative-spawns-git-per-call-never-use-it-in-per-line-git-log-lo","title":"gitPathToProjectRelative spawns git per call — never use it in per-line git log loops","summary":"gitPathToProjectRelative mcp/kernel.ts calls gitProjectPrefix, which runs 'git rev parse show prefix' via execFileSync on every invocation, plus an existsSync fallback. Calling it once per name line while parsing a full","body":"gitPathToProjectRelative (mcp/kernel.ts) calls gitProjectPrefix, which runs 'git rev-parse --show-prefix' via execFileSync on every invocation, plus an existsSync fallback. Calling it once per name-line while parsing a full-history 'git log --name-only' walk made kage scan take ~66s on express (6k commits) — 99% of CPU in spawnSync. Fix used by truthReport: resolve the prefix once before the loop and strip it inline, then filter against the code-graph file set; scan dropped to ~0.3s. Any future kernel feature that maps git log paths in bulk must hoist the prefix resolution the same way. (Rescued from a stale agent worktree where it was stranded — originally captured during the v2 truth-report build.)\nEvidence: node --cpu-prof showed 99.4% of samples in spawnSync during kage scan on express; hoisting the prefix dropped scan from ~66s to ~0.3s\nVerified by: cpu profile + before/after scan timing on express (6k commits)","type":"gotcha","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","performance","git","scan","gotcha"],"paths":["mcp/kernel.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-07-02T11:16:45.341Z"}],"context":{"fact":"gitPathToProjectRelative (mcp/kernel.ts) calls gitProjectPrefix, which runs 'git rev-parse --show-prefix' via execFileSync on every invocation, plus an existsSync fallback. Calling it once per name-line while parsing a full-history 'git log --name-only' walk made kage scan take ~66s on express (6k commits) — 99% of CPU in spawnSync. Fix used by truthReport: resolve the prefix once before the loop and strip it inline, then filter against the code-graph file set; scan dropped to ~0.3s. Any future kernel feature that maps git log paths in bulk must hoist the prefix resolution the same way. (Rescued from a stale agent worktree where it was stranded — originally captured during the v2 truth-report build.)\nEvidence: node --cpu-prof showed 99.4% of samples in spawnSync during kage scan on express; hoisting the prefix dropped scan from ~66s to ~0.3s\nVerified by: cpu profile + before/after scan timing on express (6k commits)","verification":"node --cpu-prof showed 99.4% of samples in spawnSync during kage scan on express; hoisting the prefix dropped scan from ~66s to ~0.3s"},"freshness":{"ttl_days":365,"last_verified_at":"2026-07-03T06:27:02.921Z","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"6d436dc90c217e5e9ffeba6f191c42598a3c2cd2158bfed3423d6cbddd658c44","size":875644,"symbols":[{"name":"dropped","kind":"constant","sha256":"23c7a39219a66664c66d6c54550b74fe71433b70dc1fd4757733fed0d68e5a66"},{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"gitprojectprefix","kind":"function","sha256":"390046be59cf2eaf1ccc990c3573c273013aad18db651cff7ded5c13b02263d7"},{"name":"gitpathtoprojectrelative","kind":"function","sha256":"7a9b745a50000049ab50d9939e3d36ba235fccebc9be3d8735ad2565333fd5bd"},{"name":"same","kind":"constant","sha256":"b150fada949a5c6d4babe0a0bc108765c6e7e1819d0ddbee55112b9c9a708447"},{"name":"call","kind":"constant","sha256":"0e1296678bffa8037b9dc66bffb9dbec82218bdd1cd66c11e341879266eb9454"},{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"},{"name":"truthreport","kind":"function","sha256":"27824129eaddd5454b9f98439375f51409f3634d754e9a421b2070281533a3ea"},{"name":"used","kind":"constant","sha256":"8d494a3272de91027985cda665364b9004e227897e62b1a7ad4810337f40141e"},{"name":"profile","kind":"constant","sha256":"12d3336e218ec4e336fce0cdb28582cfd51071f325c05f8db10017288592ecbc"},{"name":"before","kind":"constant","sha256":"70c005bc3586ccb93799dfa1989dccca69b847916fd3fde1583578730922c50c"},{"name":"after","kind":"constant","sha256":"220a1c1969c37d53268e215419dcea650ffa901162d0a25e451bd90831fb0a1b"},{"name":"captured","kind":"constant","sha256":"e04b2f71594d268cd1cd207bde02d83cf64a96299b1b11f9c484721b04d6d3a8"},{"name":"then","kind":"constant","sha256":"69e63ba481d1d2641d270176aed93aa51e363bcfe7c9903c448b032adf4c4129"},{"name":"full","kind":"constant","sha256":"9213768c4e556655970d7db34f178f135ab91810c1a0a99bba63452c01924f4f"},{"name":"show","kind":"constant","sha256":"a1286db8e7ca4067e360ba4fb6da776faab1a9b50a1ce06dd8efb185376816f6"}]}],"path_fingerprint_policy":"source_hash_staleness","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":1,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"discovery_tokens":8000,"discovery_tokens_estimated":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":233,"reverified_at":"2026-07-03T06:27:02.921Z","total_uses":1,"last_accessed_at":"2026-07-02T19:49:35.468Z"},"created_at":"2026-07-02T11:16:45.341Z","updated_at":"2026-07-03T16:16:26.722Z","author_branch":"master"}
```

