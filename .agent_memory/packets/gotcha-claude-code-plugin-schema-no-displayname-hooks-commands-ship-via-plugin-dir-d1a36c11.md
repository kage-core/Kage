---
type: "Gotcha"
title: "Claude Code plugin schema: no displayName; hooks/commands ship via plugin dir"
description: "claude plugin validate rejects unrecognized keys in plugin/.claude plugin/plugin.json — 'displayName' fails validation use 'name' only . Plugin layout that validates: plugin/.claude plugin/plugin.json +'mcpServers': './."
resource: "plugin/.claude-plugin/plugin.json"
tags: ["session-learning", "plugin"]
timestamp: "2026-06-21T17:14:43.726Z"
x-kage-id: "repo:https-github-com-kage-core-kage:gotcha:claude-code-plugin-schema-no-displayname-hooks-commands-ship-via-plugin-dir-1781"
x-kage-type: "gotcha"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["plugin/.claude-plugin/plugin.json"]
---

# Claude Code plugin schema: no displayName; hooks/commands ship via plugin dir

> claude plugin validate rejects unrecognized keys in plugin/.claude plugin/plugin.json — 'displayName' fails validatio…

claude plugin validate rejects unrecognized keys in plugin/.claude-plugin/plugin.json — 'displayName' fails validation (use 'name' only). Plugin layout that validates: plugin/.claude-plugin/plugin.json (+'mcpServers': './.mcp.json', 'hooks': './hooks/hooks.json'), plugin/hooks/hooks.json using ${CLAUDE_PLUGIN_ROOT} for script paths, plugin/commands/*.md become /kage:<name> slash commands. The hook scripts in plugin/hooks/ are vendored copies of what kernel.ts setupAgent writes to ~/.claude/kage/hooks — keep them in sync when editing either. Validate with: claude plugin validate . (marketplace) and claude plugin validate plugin (plugin manifest).

# Citations

[1] explicit_capture (2026-06-12T03:48:32.785Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:gotcha:claude-code-plugin-schema-no-displayname-hooks-commands-ship-via-plugin-dir-1781","title":"Claude Code plugin schema: no displayName; hooks/commands ship via plugin dir","summary":"claude plugin validate rejects unrecognized keys in plugin/.claude plugin/plugin.json — 'displayName' fails validation use 'name' only . Plugin layout that validates: plugin/.claude plugin/plugin.json +'mcpServers': './.","body":"claude plugin validate rejects unrecognized keys in plugin/.claude-plugin/plugin.json — 'displayName' fails validation (use 'name' only). Plugin layout that validates: plugin/.claude-plugin/plugin.json (+'mcpServers': './.mcp.json', 'hooks': './hooks/hooks.json'), plugin/hooks/hooks.json using ${CLAUDE_PLUGIN_ROOT} for script paths, plugin/commands/*.md become /kage:<name> slash commands. The hook scripts in plugin/hooks/ are vendored copies of what kernel.ts setupAgent writes to ~/.claude/kage/hooks — keep them in sync when editing either. Validate with: claude plugin validate . (marketplace) and claude plugin validate plugin (plugin manifest).","type":"gotcha","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","plugin"],"paths":["plugin/.claude-plugin/plugin.json"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-06-12T03:48:32.785Z"}],"context":{"fact":"claude plugin validate rejects unrecognized keys in plugin/.claude-plugin/plugin.json — 'displayName' fails validation (use 'name' only). Plugin layout that validates: plugin/.claude-plugin/plugin.json (+'mcpServers': './.mcp.json', 'hooks': './hooks/hooks.json'), plugin/hooks/hooks.json using ${CLAUDE_PLUGIN_ROOT} for script paths, plugin/commands/*.md become /kage:<name> slash commands. The hook scripts in plugin/hooks/ are vendored copies of what kernel.ts setupAgent writes to ~/.claude/kage/hooks — keep them in sync when editing either. Validate with: claude plugin validate . (marketplace) and claude plugin validate plugin (plugin manifest)."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-21T17:14:43.726Z","path_fingerprints":[{"path":"plugin/.claude-plugin/plugin.json","sha256":"9f4521259210b15b008a3afc93eaf9138a6d35039c55da84ee2d9c2ffd921cb2","size":735}],"path_fingerprint_policy":"source_hash_staleness","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":164,"reverified_at":"2026-06-21T17:14:43.726Z","total_uses":0},"created_at":"2026-06-12T03:48:32.785Z","updated_at":"2026-07-03T16:16:26.720Z","author_branch":"release/v2.0.1"}
```

