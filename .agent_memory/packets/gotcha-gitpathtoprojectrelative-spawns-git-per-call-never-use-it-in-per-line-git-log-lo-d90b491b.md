---
type: "Gotcha"
title: "gitPathToProjectRelative spawns git per call — never use it in per-line git log loops"
description: "gitPathToProjectRelative mcp/kernel.ts calls gitProjectPrefix, which runs 'git rev parse show prefix' via execFileSync on every invocation, plus an existsSync fallback. Calling it once per name line while parsing a full"
resource: "mcp/kernel.ts"
tags: ["session-learning", "performance", "git", "scan", "gotcha"]
timestamp: "2026-07-10T08:01:03.195Z"
x-kage-id: "repo:https-github-com-kage-core-kage:gotcha:gitpathtoprojectrelative-spawns-git-per-call-never-use-it-in-per-line-git-log-lo"
x-kage-type: "gotcha"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "verified"
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
[2] reverification

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:gotcha:gitpathtoprojectrelative-spawns-git-per-call-never-use-it-in-per-line-git-log-lo","title":"gitPathToProjectRelative spawns git per call — never use it in per-line git log loops","summary":"gitPathToProjectRelative mcp/kernel.ts calls gitProjectPrefix, which runs 'git rev parse show prefix' via execFileSync on every invocation, plus an existsSync fallback. Calling it once per name line while parsing a full","body":"gitPathToProjectRelative (mcp/kernel.ts) calls gitProjectPrefix, which runs 'git rev-parse --show-prefix' via execFileSync on every invocation, plus an existsSync fallback. Calling it once per name-line while parsing a full-history 'git log --name-only' walk made kage scan take ~66s on express (6k commits) — 99% of CPU in spawnSync. Fix used by truthReport: resolve the prefix once before the loop and strip it inline, then filter against the code-graph file set; scan dropped to ~0.3s. Any future kernel feature that maps git log paths in bulk must hoist the prefix resolution the same way. (Rescued from a stale agent worktree where it was stranded — originally captured during the v2 truth-report build.)\nEvidence: node --cpu-prof showed 99.4% of samples in spawnSync during kage scan on express; hoisting the prefix dropped scan from ~66s to ~0.3s\nVerified by: cpu profile + before/after scan timing on express (6k commits)","type":"gotcha","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","performance","git","scan","gotcha"],"paths":["mcp/kernel.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-07-02T11:16:45.341Z"},{"kind":"reverification","at":"2026-07-10T08:01:03.195Z","verified_by":"npm test: 406/406 + 12/12 pass","evidence":"kernel.ts changed in the truthReport() ghost-export/debt-marker detectors and isRecord's location — unrelated to gitPathToProjectRelative, which is untouched.","changed_paths":[{"path":"mcp/kernel.ts","prior_sha256":"6d436dc90c217e5e9ffeba6f191c42598a3c2cd2158bfed3423d6cbddd658c44","sha256":"384cd7133265e1cd3c67b3622586d53c2d2327509bfeb08ad99421b20d041742"}]}],"context":{"fact":"gitPathToProjectRelative (mcp/kernel.ts) calls gitProjectPrefix, which runs 'git rev-parse --show-prefix' via execFileSync on every invocation, plus an existsSync fallback. Calling it once per name-line while parsing a full-history 'git log --name-only' walk made kage scan take ~66s on express (6k commits) — 99% of CPU in spawnSync. Fix used by truthReport: resolve the prefix once before the loop and strip it inline, then filter against the code-graph file set; scan dropped to ~0.3s. Any future kernel feature that maps git log paths in bulk must hoist the prefix resolution the same way. (Rescued from a stale agent worktree where it was stranded — originally captured during the v2 truth-report build.)\nEvidence: node --cpu-prof showed 99.4% of samples in spawnSync during kage scan on express; hoisting the prefix dropped scan from ~66s to ~0.3s\nVerified by: cpu profile + before/after scan timing on express (6k commits)","verification":"node --cpu-prof showed 99.4% of samples in spawnSync during kage scan on express; hoisting the prefix dropped scan from ~66s to ~0.3s"},"freshness":{"ttl_days":365,"last_verified_at":"2026-07-10T08:01:03.195Z","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"384cd7133265e1cd3c67b3622586d53c2d2327509bfeb08ad99421b20d041742","size":923271,"symbols":[{"name":"gitprojectprefix","kind":"function","sha256":"390046be59cf2eaf1ccc990c3573c273013aad18db651cff7ded5c13b02263d7"},{"name":"gitpathtoprojectrelative","kind":"function","sha256":"7a9b745a50000049ab50d9939e3d36ba235fccebc9be3d8735ad2565333fd5bd"},{"name":"truthreport","kind":"function","sha256":"796981d29c76c728e017ed015fab524c765c3ca6281df29cf1f46670c8b9c222"}]}],"path_fingerprint_policy":"source_hash_staleness","verification":"evidence_reverification"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"discovery_tokens":8000,"discovery_tokens_estimated":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":233,"reverified_at":"2026-07-10T08:01:03.195Z","total_uses":0,"last_accessed_at":"2026-07-06T19:36:35.586Z"},"created_at":"2026-07-02T11:16:45.341Z","updated_at":"2026-07-10T08:01:03.195Z","author_branch":"master"}
```

