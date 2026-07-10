---
type: "Gotcha"
title: "Gotcha: init must bound generated code graph size"
description: "Kage init on larger repos can become unusable if code graph generation indexes huge source blobs or unbounded JS/TS call edges. Keep first run indexing bounded: skip large source files, ignore generated/vendor/cache dire"
resource: "mcp/kernel.ts"
tags: ["session-learning", "init", "performance", "code-graph", "large-repo"]
timestamp: "2026-06-15T21:58:02.203Z"
x-kage-id: "repo:https-github-com-kage-core-kage:gotcha:gotcha-init-must-bound-generated-code-graph-size-1778253238829"
x-kage-type: "gotcha"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/kernel.test.ts"]
---

# Gotcha: init must bound generated code graph size

> Kage init on larger repos can become unusable if code graph generation indexes huge source blobs or unbounded JS/TS c…

Kage init on larger repos can become unusable if code graph generation indexes huge source blobs or unbounded JS/TS call edges. Keep first-run indexing bounded: skip large source files, ignore generated/vendor/cache directories, cap files/symbols/calls, and resolve call callers against same-file symbols rather than the full repo symbol set.
Verified by: npm test --prefix mcp -- --test-name-pattern 'code graph skips huge source blobs|code graph caps noisy call extraction'

## Verification

npm test --prefix mcp -- --test-name-pattern 'code graph skips huge source blobs|code graph caps noisy call extraction'

# Citations

[1] explicit_capture (2026-05-08T15:13:58.829Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:gotcha:gotcha-init-must-bound-generated-code-graph-size-1778253238829","title":"Gotcha: init must bound generated code graph size","summary":"Kage init on larger repos can become unusable if code graph generation indexes huge source blobs or unbounded JS/TS call edges. Keep first run indexing bounded: skip large source files, ignore generated/vendor/cache dire","body":"Kage init on larger repos can become unusable if code graph generation indexes huge source blobs or unbounded JS/TS call edges. Keep first-run indexing bounded: skip large source files, ignore generated/vendor/cache directories, cap files/symbols/calls, and resolve call callers against same-file symbols rather than the full repo symbol set.\nVerified by: npm test --prefix mcp -- --test-name-pattern 'code graph skips huge source blobs|code graph caps noisy call extraction'","type":"gotcha","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","init","performance","code-graph","large-repo"],"paths":["mcp/kernel.ts","mcp/kernel.test.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-08T15:13:58.829Z"}],"context":{"fact":"Kage init on larger repos can become unusable if code graph generation indexes huge source blobs or unbounded JS/TS call edges. Keep first-run indexing bounded: skip large source files, ignore generated/vendor/cache directories, cap files/symbols/calls, and resolve call callers against same-file symbols rather than the full repo symbol set.\nVerified by: npm test --prefix mcp -- --test-name-pattern 'code graph skips huge source blobs|code graph caps noisy call extraction'","verification":"npm test --prefix mcp -- --test-name-pattern 'code graph skips huge source blobs|code graph caps noisy call extraction'"},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:02.203Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"size","kind":"constant","sha256":"9008cc27791958971fe1d1c0049dd1e46d083d1bcf756d40e903520337322226"},{"name":"bounded","kind":"constant","sha256":"c3fc17594c058db2e1a1b9e8f33161d89ca175cd31aebed17389c75ac6709d43"},{"name":"same","kind":"constant","sha256":"b150fada949a5c6d4babe0a0bc108765c6e7e1819d0ddbee55112b9c9a708447"},{"name":"ignore","kind":"function","sha256":"3eee15379e111fc3066636e779769471e2ba26f4ccf38736888f5c1eec25dd08"},{"name":"call","kind":"constant","sha256":"0e1296678bffa8037b9dc66bffb9dbec82218bdd1cd66c11e341879266eb9454"},{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"},{"name":"full","kind":"constant","sha256":"9213768c4e556655970d7db34f178f135ab91810c1a0a99bba63452c01924f4f"},{"name":"skip","kind":"constant","sha256":"84ce913f797ae6f1160ffe3c80d4f9852f31f1ce9c118d5e1a8be145e564b569"},{"name":"init","kind":"constant","sha256":"98655f2d0fc070b28035aca2482248d7700d68ebe4e14487f630c5992d447dcd"},{"name":"keep","kind":"constant","sha256":"3e5df93c6de57dbae093461e4198d2bc24bb055a50d3f6a8bd6449397fd00f3b"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"calls","kind":"constant","sha256":"4b435c2c9448e76bfa4e3a1f26d4c8c42059b4125bd76c0254a3af23bacd66a4"},{"name":"init","kind":"constant","sha256":"f77bb1a709dc85c7dcbac447ceeb4b011141d787df47aa1e1d18ef6431f145d5"},{"name":"edges","kind":"constant","sha256":"8c37bcd95245ff6d66b6f8b413ce98901f9c5e8bad1c2b4dc47e75e3b2815f73"},{"name":"full","kind":"constant","sha256":"6270b632fb8c1ec230ad23878da137aab65feab7105ddd15ff76a1d27e5b5b44"},{"name":"bounded","kind":"constant","sha256":"ff3f5c301d4311bd4d0787b820a1c3835be8ee14fbdb641eb003dbf14ffce58a"},{"name":"name","kind":"constant","sha256":"081c81b8ff45c590015f81a59547f9e3c7167d240fc7840015e0afccc683b329"}]}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":119,"reverified_at":"2026-06-15T21:58:02.203Z","total_uses":0,"last_accessed_at":"2026-07-01T12:21:59.899Z"},"created_at":"2026-05-08T15:13:58.829Z","updated_at":"2026-07-03T16:16:26.722Z"}
```

