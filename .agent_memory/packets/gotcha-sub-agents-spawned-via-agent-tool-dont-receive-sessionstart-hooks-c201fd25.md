---
type: "Gotcha"
title: "Sub-agents spawned via Agent() tool don't receive SessionStart hooks"
description: "Claude Code's SessionStart hook only fires when a human starts a session directly. Sub agents spawned programmatically via the Agent tool start with a fresh context and don't go through the hook pipeline. CLAUDE.md and a"
resource: "mcp/kernel.ts"
tags: ["session-learning", "claude-code", "hooks", "sub-agents", "enforcement"]
timestamp: "2026-06-15T21:58:06.368Z"
x-kage-id: "repo:https-github-com-kage-core-kage:gotcha:sub-agents-spawned-via-agent-tool-dont-receive-sessionstart-hooks-1777737314881"
x-kage-type: "gotcha"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "AGENTS.md"]
---

# Sub-agents spawned via Agent() tool don't receive SessionStart hooks

> Claude Code's SessionStart hook only fires when a human starts a session directly. Sub agents spawned programmaticall…

Claude Code's SessionStart hook only fires when a human starts a session directly. Sub-agents spawned programmatically via the Agent() tool start with a fresh context and don't go through the hook pipeline. CLAUDE.md and alwaysLoad still work for sub-agents (tools are visible, policy is readable) but hook-injected system messages are absent. The only reliable enforcement for sub-agents is CLAUDE.md + alwaysLoad — hooks cannot help there.
Verified by: Tested across 3 sub-agent runs: 0 Kage tool calls despite tools being visible and CLAUDE.md present

# Citations

[1] explicit_capture (2026-05-02T15:55:14.881Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:gotcha:sub-agents-spawned-via-agent-tool-dont-receive-sessionstart-hooks-1777737314881","title":"Sub-agents spawned via Agent() tool don't receive SessionStart hooks","summary":"Claude Code's SessionStart hook only fires when a human starts a session directly. Sub agents spawned programmatically via the Agent tool start with a fresh context and don't go through the hook pipeline. CLAUDE.md and a","body":"Claude Code's SessionStart hook only fires when a human starts a session directly. Sub-agents spawned programmatically via the Agent() tool start with a fresh context and don't go through the hook pipeline. CLAUDE.md and alwaysLoad still work for sub-agents (tools are visible, policy is readable) but hook-injected system messages are absent. The only reliable enforcement for sub-agents is CLAUDE.md + alwaysLoad — hooks cannot help there.\nVerified by: Tested across 3 sub-agent runs: 0 Kage tool calls despite tools being visible and CLAUDE.md present","type":"gotcha","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","claude-code","hooks","sub-agents","enforcement"],"paths":["mcp/kernel.ts","AGENTS.md"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-02T15:55:14.881Z"}],"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:06.368Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"},{"name":"hooks","kind":"constant","sha256":"7291847ee5dfe9b56b32a270d8bb6309f5740dde9443103ede1b01a377155e78"},{"name":"present","kind":"constant","sha256":"b0fc5057457202bcbc10dd345333192f2bfeefdd0cd200d8c52d37c6444a3435"},{"name":"when","kind":"constant","sha256":"48bfd58b3cdbf2d407e4443b90727d548d96eceaa4372c099dcd22c52f498452"}]},{"path":"AGENTS.md","sha256":"d1e074d6887bacd550f629c53dae432477ebedf6548b14765396a408a4544d3a","size":3427}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":2,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":278,"reverified_at":"2026-06-15T21:58:06.368Z","total_uses":2,"last_accessed_at":"2026-07-02T12:34:33.817Z"},"created_at":"2026-05-02T15:55:14.881Z","updated_at":"2026-07-03T16:16:26.723Z"}
```

