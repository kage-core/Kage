---
type: "Gotcha"
title: "MCP version skew: launcher --mcp-config pins vendored ~/.claude/kage-mcp, overriding all config files"
description: "The Claude desktop app launches sessions with an inline mcp config flag hardcoding kage to ~/.claude/kage mcp/dist/index.js a vendored copy from the old install.sh, found at v1.1.0 . This OVERRIDES ~/.claude.json and pro"
resource: "mcp/cli.ts"
tags: ["session-learning", "version-skew"]
timestamp: "2026-06-15T21:58:02.504Z"
x-kage-id: "repo:https-github-com-kage-core-kage:gotcha:mcp-version-skew-launcher-mcp-config-pins-vendored-claude-kage-mcp-overriding-al"
x-kage-type: "gotcha"
x-kage-status: "deprecated"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "deprecated"
x-kage-paths: ["mcp/cli.ts"]
---

# MCP version skew: launcher --mcp-config pins vendored ~/.claude/kage-mcp, overriding all config files

> The Claude desktop app launches sessions with an inline mcp config flag hardcoding kage to ~/.claude/kage mcp/dist/in…

The Claude desktop app launches sessions with an inline --mcp-config flag hardcoding kage to ~/.claude/kage-mcp/dist/index.js (a vendored copy from the old install.sh, found at v1.1.0). This OVERRIDES ~/.claude.json and project .mcp.json — so npm-global upgrades and config edits never reach the running server, producing phantom symptoms: 'invalid type code_explanation' validation errors and a 222-file code graph including .claude/worktrees, both already fixed in the installed 2.0.0. Diagnosis path: ps aux | grep kage reveals the launcher flag. Fix: upgrade the vendored copy in place (copy global dist + package.json into ~/.claude/kage-mcp, npm install --omit=dev), keep dist.old for rollback, then restart the agent. Product follow-ups: kage doctor must print running-server version + which config path won; install.sh vendored copies must be migrated or self-update.
Verified by: Live debugging 2026-06-11: three stale-server restarts, ps revealed --mcp-config; vendored 1.1.0 upgraded to 2.0.0 in place, types+tree-sitter verified

## Verification

Live debugging 2026-06-11: three stale-server restarts, ps revealed --mcp-config; vendored 1.1.0 upgraded to 2.0.0 in place, types+tree-sitter verified

# Citations

[1] explicit_capture (2026-06-11T19:15:37.084Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:gotcha:mcp-version-skew-launcher-mcp-config-pins-vendored-claude-kage-mcp-overriding-al","title":"MCP version skew: launcher --mcp-config pins vendored ~/.claude/kage-mcp, overriding all config files","summary":"The Claude desktop app launches sessions with an inline mcp config flag hardcoding kage to ~/.claude/kage mcp/dist/index.js a vendored copy from the old install.sh, found at v1.1.0 . This OVERRIDES ~/.claude.json and pro","body":"The Claude desktop app launches sessions with an inline --mcp-config flag hardcoding kage to ~/.claude/kage-mcp/dist/index.js (a vendored copy from the old install.sh, found at v1.1.0). This OVERRIDES ~/.claude.json and project .mcp.json — so npm-global upgrades and config edits never reach the running server, producing phantom symptoms: 'invalid type code_explanation' validation errors and a 222-file code graph including .claude/worktrees, both already fixed in the installed 2.0.0. Diagnosis path: ps aux | grep kage reveals the launcher flag. Fix: upgrade the vendored copy in place (copy global dist + package.json into ~/.claude/kage-mcp, npm install --omit=dev), keep dist.old for rollback, then restart the agent. Product follow-ups: kage doctor must print running-server version + which config path won; install.sh vendored copies must be migrated or self-update.\nVerified by: Live debugging 2026-06-11: three stale-server restarts, ps revealed --mcp-config; vendored 1.1.0 upgraded to 2.0.0 in place, types+tree-sitter verified","type":"gotcha","scope":"repo","visibility":"team","sensitivity":"internal","status":"deprecated","confidence":0.7,"tags":["session-learning","version-skew"],"paths":["mcp/cli.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-06-11T19:15:37.084Z"}],"context":{"fact":"The Claude desktop app launches sessions with an inline --mcp-config flag hardcoding kage to ~/.claude/kage-mcp/dist/index.js (a vendored copy from the old install.sh, found at v1.1.0). This OVERRIDES ~/.claude.json and project .mcp.json — so npm-global upgrades and config edits never reach the running server, producing phantom symptoms: 'invalid type code_explanation' validation errors and a 222-file code graph including .claude/worktrees, both already fixed in the installed 2.0.0. Diagnosis path: ps aux | grep kage reveals the launcher flag. Fix: upgrade the vendored copy in place (copy global dist + package.json into ~/.claude/kage-mcp, npm install --omit=dev), keep dist.old for rollback, then restart the agent. Product follow-ups: kage doctor must print running-server version + which config path won; install.sh vendored copies must be migrated or self-update.\nVerified by: Live debugging 2026-06-11: three stale-server restarts, ps revealed --mcp-config; vendored 1.1.0 upgraded to 2.0.0 in place, types+tree-sitter verified","verification":"Live debugging 2026-06-11: three stale-server restarts, ps revealed --mcp-config; vendored 1.1.0 upgraded to 2.0.0 in place, types+tree-sitter verified"},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:02.504Z","path_fingerprints":[{"path":"mcp/cli.ts","sha256":"a670bc601e227372c9ab3e862f4e25fa87ae4bfa90b63c3bbc61032d332da0d7","size":114201,"symbols":[{"name":"index","kind":"constant","sha256":"c201ee64cf24065dd2ba0bbdc7ff8399e5c1dd89783820e501d28f82019f08a8"},{"name":"json","kind":"constant","sha256":"9115381310c6d4c5ecb25a7e67e4fd0bb4b20a9b328adb25b606065454f79370"},{"name":"agent","kind":"constant","sha256":"5b9caa614311fe691d6af171b9a8985b0d49464b9df178ad28ff5b9883eb4cf2"},{"name":"from","kind":"constant","sha256":"b386d829bcacbd9e216c726f6dff71fc7d8a53aade383fa45b850387414b780c"},{"name":"type","kind":"constant","sha256":"32ed8eb4ecde4706e2590380969ccb808068c46a3c687040703198e8c72d14e1"}]}],"path_fingerprint_policy":"source_hash_staleness","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":260,"reverified_at":"2026-06-15T21:58:02.504Z","stale":true,"stale_reasons":["packet status is deprecated"],"suggested_action":"mark_stale"},"created_at":"2026-06-11T19:15:37.084Z","updated_at":"2026-06-15T21:58:43.093Z","author_branch":"release/v2.0.0"}
```

