---
type: "Runbook"
title: "kage_context is the single session-start tool replacing 4 separate calls"
description: "kage context project dir, query replaces the old 4 step validate + recall + code graph + graph sequence. It runs all four in one call and returns a combined context block. Added in mcp/index.ts callTool handler and liste"
resource: "mcp/index.ts"
tags: ["session-learning", "kage_context", "session-start", "mcp", "alwaysLoad", "deferred-tools"]
timestamp: "2026-06-15T21:58:39.449Z"
x-kage-id: "repo:https-github-com-kage-core-kage:runbook:kage-context-is-the-single-session-start-tool-replacing-4-separate-calls-1777792"
x-kage-type: "runbook"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/index.ts", "mcp/kernel.ts", "AGENTS.md", "CLAUDE.md"]
---

# kage_context is the single session-start tool replacing 4 separate calls

> kage context project dir, query replaces the old 4 step validate + recall + code graph + graph sequence. It runs all …

kage_context(project_dir, query) replaces the old 4-step validate + recall + code_graph + graph sequence. It runs all four in one call and returns a combined context block. Added in mcp/index.ts callTool() handler and listed first in the MCP tool list. AGENTS.md and CLAUDE.md updated to reference kage_context. Requires Claude Code v2.1.121+ with alwaysLoad: true in ~/.claude.json for tools to be immediately available (not deferred). On older versions alwaysLoad silently does nothing and tools end up deferred requiring ToolSearch.
Verified by: 64/64 tests passing, global MCP install updated

# Citations

[1] explicit_capture (2026-05-03T07:18:03.317Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:runbook:kage-context-is-the-single-session-start-tool-replacing-4-separate-calls-1777792","title":"kage_context is the single session-start tool replacing 4 separate calls","summary":"kage context project dir, query replaces the old 4 step validate + recall + code graph + graph sequence. It runs all four in one call and returns a combined context block. Added in mcp/index.ts callTool handler and liste","body":"kage_context(project_dir, query) replaces the old 4-step validate + recall + code_graph + graph sequence. It runs all four in one call and returns a combined context block. Added in mcp/index.ts callTool() handler and listed first in the MCP tool list. AGENTS.md and CLAUDE.md updated to reference kage_context. Requires Claude Code v2.1.121+ with alwaysLoad: true in ~/.claude.json for tools to be immediately available (not deferred). On older versions alwaysLoad silently does nothing and tools end up deferred requiring ToolSearch.\nVerified by: 64/64 tests passing, global MCP install updated","type":"runbook","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","kage_context","session-start","mcp","alwaysLoad","deferred-tools"],"paths":["mcp/index.ts","mcp/kernel.ts","AGENTS.md","CLAUDE.md"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-03T07:18:03.317Z"}],"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:39.449Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/index.ts","sha256":"d5abac0cb8d92d9074ae37a32ee515da8b03c43fe2d1a03d44447ee7b3493861","size":69453,"symbols":[{"name":"calltool","kind":"function","sha256":"87a6ef6bc62a00ba9d50c5a20cfba1b80a75677206b3c461097eb8936154309d"},{"name":"index","kind":"constant","sha256":"ad98a75521fc0edce4fed6c6cd0503a41df66728efc44c4c3904db6a6ac89d7f"}]},{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"call","kind":"constant","sha256":"0e1296678bffa8037b9dc66bffb9dbec82218bdd1cd66c11e341879266eb9454"},{"name":"deferred","kind":"constant","sha256":"410a15d3e3e8ae9316e549d5ba407560be7e6a9882907ee2480eabf35aa9276b"},{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"},{"name":"combined","kind":"constant","sha256":"fd2198e3aa074f89cf88de8a00bd11199a1e734513e5d6a1acc79765d2c8338b"},{"name":"step","kind":"constant","sha256":"12e0cf0bb75c9b15151aa0b4cb87f8ad818357d6a7c7a2490efdf7678888fc1b"}]},{"path":"AGENTS.md","sha256":"d1e074d6887bacd550f629c53dae432477ebedf6548b14765396a408a4544d3a","size":3427},{"path":"CLAUDE.md","sha256":"d1e074d6887bacd550f629c53dae432477ebedf6548b14765396a408a4544d3a","size":3427}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":20,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":149,"reverified_at":"2026-06-15T21:58:39.449Z","total_uses":57,"last_accessed_at":"2026-07-08T20:19:49.909Z"},"created_at":"2026-05-03T07:18:03.317Z","updated_at":"2026-07-03T16:16:26.740Z"}
```

