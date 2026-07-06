---
type: "Runbook"
title: "Claude Code MCP setup: ~/.claude.json + alwaysLoad + SessionStart hook"
description: "Claude Code reads MCP servers from ~/.claude.json not ~/.claude/settings.json . The server entry requires type: \"stdio\" and alwaysLoad: true to make tools immediately visible without ToolSearch. A SessionStart hook at ~/"
resource: "mcp/kernel.ts"
tags: ["session-learning", "claude-code", "mcp", "setup", "hooks", "alwaysLoad"]
timestamp: "2026-06-15T21:58:09.352Z"
x-kage-id: "repo:https-github-com-kage-core-kage:runbook:claude-code-mcp-setup-claude-json-alwaysload-sessionstart-hook-1777737306925"
x-kage-type: "runbook"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "CLAUDE.md", "AGENTS.md"]
---

# Claude Code MCP setup: ~/.claude.json + alwaysLoad + SessionStart hook

> Claude Code reads MCP servers from ~/.claude.json not ~/.claude/settings.json . The server entry requires type: "stdi…

Claude Code reads MCP servers from ~/.claude.json (not ~/.claude/settings.json). The server entry requires type: "stdio" and alwaysLoad: true to make tools immediately visible without ToolSearch. A SessionStart hook at ~/.claude/kage/hooks/session-start.sh injects the full AGENTS.md policy as a system message — this is the only way to get mandatory Codex-equivalent enforcement in Claude Code, since CLAUDE.md is advisory context not a system-level protocol.
Verified by: Manually verified: claude mcp add --scope user --transport stdio wrote correct ~/.claude.json; alwaysLoad confirmed by sub-agent listing 31 kage tools without ToolSearch; hook tested with echo pipe

# Citations

[1] explicit_capture (2026-05-02T15:55:06.925Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:runbook:claude-code-mcp-setup-claude-json-alwaysload-sessionstart-hook-1777737306925","title":"Claude Code MCP setup: ~/.claude.json + alwaysLoad + SessionStart hook","summary":"Claude Code reads MCP servers from ~/.claude.json not ~/.claude/settings.json . The server entry requires type: \"stdio\" and alwaysLoad: true to make tools immediately visible without ToolSearch. A SessionStart hook at ~/","body":"Claude Code reads MCP servers from ~/.claude.json (not ~/.claude/settings.json). The server entry requires type: \"stdio\" and alwaysLoad: true to make tools immediately visible without ToolSearch. A SessionStart hook at ~/.claude/kage/hooks/session-start.sh injects the full AGENTS.md policy as a system message — this is the only way to get mandatory Codex-equivalent enforcement in Claude Code, since CLAUDE.md is advisory context not a system-level protocol.\nVerified by: Manually verified: claude mcp add --scope user --transport stdio wrote correct ~/.claude.json; alwaysLoad confirmed by sub-agent listing 31 kage tools without ToolSearch; hook tested with echo pipe","type":"runbook","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","claude-code","mcp","setup","hooks","alwaysLoad"],"paths":["mcp/kernel.ts","CLAUDE.md","AGENTS.md"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-02T15:55:06.925Z"}],"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:09.352Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"level","kind":"constant","sha256":"832bbcc09db2b0a822fe5b0f77875aea29528b0343bffcb1c71cf2fe73b9aa5e"},{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"},{"name":"server","kind":"constant","sha256":"5fd67f18035e46e58b653d1faddf541c198a3ed53d653138d4751f08353c0054"},{"name":"hooks","kind":"constant","sha256":"7291847ee5dfe9b56b32a270d8bb6309f5740dde9443103ede1b01a377155e78"},{"name":"full","kind":"constant","sha256":"9213768c4e556655970d7db34f178f135ab91810c1a0a99bba63452c01924f4f"}]},{"path":"CLAUDE.md","sha256":"d1e074d6887bacd550f629c53dae432477ebedf6548b14765396a408a4544d3a","size":3427},{"path":"AGENTS.md","sha256":"d1e074d6887bacd550f629c53dae432477ebedf6548b14765396a408a4544d3a","size":3427}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":2,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":336,"reverified_at":"2026-06-15T21:58:09.352Z","total_uses":2,"last_accessed_at":"2026-07-06T09:31:56.369Z"},"created_at":"2026-05-02T15:55:06.925Z","updated_at":"2026-07-03T16:16:26.740Z"}
```

