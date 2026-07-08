---
type: "Decision"
title: "Claude Code setup installs ambient capture hooks"
description: "After comparing ambient session-capture requirements, Kage Claude Code setup now installs UserPromptSubmit, PostToolUse, PostToolUseFailure, PreCompact, Stop, and SessionEnd hooks in addition to SessionStart. The obser"
resource: "mcp/kernel.ts"
tags: ["session-learning", "claude-code", "hooks", "session-capture"]
timestamp: "2026-06-15T21:58:36.998Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:claude-code-setup-installs-ambient-capture-hooks-1779059605338"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/kernel.test.ts", "README.md", "mcp/README.md", "docs/guide.html"]
---

# Claude Code setup installs ambient capture hooks

> After comparing ambient session-capture requirements, Kage Claude Code setup now installs UserPromptSubmit, PostToolU…

After comparing ambient session-capture requirements, Kage Claude Code setup now installs UserPromptSubmit, PostToolUse, PostToolUseFailure, PreCompact, Stop, and SessionEnd hooks in addition to SessionStart. The observe hook stores privacy-filtered observations, injects relevant Kage recall context on prompts, and distills durable observations before compaction or session end. The setup test now executes the generated observe hook with a fake kage binary to prove observe, recall, and distill are wired.
Verified by: npm test --prefix mcp -- --test-name-pattern 'setup generates all-agent MCP configuration'

## Verification

npm test --prefix mcp -- --test-name-pattern 'setup generates all-agent MCP configuration'

# Citations

[1] explicit_capture (2026-05-17T23:13:25.337Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:claude-code-setup-installs-ambient-capture-hooks-1779059605338","title":"Claude Code setup installs ambient capture hooks","summary":"After comparing ambient session-capture requirements, Kage Claude Code setup now installs UserPromptSubmit, PostToolUse, PostToolUseFailure, PreCompact, Stop, and SessionEnd hooks in addition to SessionStart. The obser","body":"After comparing ambient session-capture requirements, Kage Claude Code setup now installs UserPromptSubmit, PostToolUse, PostToolUseFailure, PreCompact, Stop, and SessionEnd hooks in addition to SessionStart. The observe hook stores privacy-filtered observations, injects relevant Kage recall context on prompts, and distills durable observations before compaction or session end. The setup test now executes the generated observe hook with a fake kage binary to prove observe, recall, and distill are wired.\nVerified by: npm test --prefix mcp -- --test-name-pattern 'setup generates all-agent MCP configuration'","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","claude-code","hooks","session-capture"],"paths":["mcp/kernel.ts","mcp/kernel.test.ts","README.md","mcp/README.md","docs/guide.html"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-17T23:13:25.337Z"}],"context":{"fact":"After comparing ambient session-capture requirements, Kage Claude Code setup now installs UserPromptSubmit, PostToolUse, PostToolUseFailure, PreCompact, Stop, and SessionEnd hooks in addition to SessionStart. The observe hook stores privacy-filtered observations, injects relevant Kage recall context on prompts, and distills durable observations before compaction or session end. The setup test now executes the generated observe hook with a fake kage binary to prove observe, recall, and distill are wired.\nVerified by: npm test --prefix mcp -- --test-name-pattern 'setup generates all-agent MCP configuration'","verification":"npm test --prefix mcp -- --test-name-pattern 'setup generates all-agent MCP configuration'"},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:36.998Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"},{"name":"before","kind":"constant","sha256":"70c005bc3586ccb93799dfa1989dccca69b847916fd3fde1583578730922c50c"},{"name":"after","kind":"constant","sha256":"220a1c1969c37d53268e215419dcea650ffa901162d0a25e451bd90831fb0a1b"},{"name":"relevant","kind":"constant","sha256":"ecda229c929f06ede369f9d72be3d3211fef450b1056b73a121c5d925fac2c2b"},{"name":"capture","kind":"function","sha256":"d6ab6995f6712c0c94fc325e5aaaf3f495bdd81ba660e115f3d467f89f93ef29"},{"name":"hooks","kind":"constant","sha256":"7291847ee5dfe9b56b32a270d8bb6309f5740dde9443103ede1b01a377155e78"},{"name":"observe","kind":"function","sha256":"ed8233b4571379b1176099bf36cd241bc60cb0e62a835060c6661bddf5d3c76b"},{"name":"durable","kind":"constant","sha256":"3fa48acfe2e95fa0fcf831049f2d1aa3ddf26ddc5a1d10724db5da185389e634"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"claude","kind":"constant","sha256":"30e40d593cb285fac2f86d1766fed1b16495cc38548f9b27af90a180acfac1d6"},{"name":"name","kind":"constant","sha256":"081c81b8ff45c590015f81a59547f9e3c7167d240fc7840015e0afccc683b329"}]},{"path":"README.md","sha256":"9a533eee7962e84cdceef1bd8c9463233a575138fa143acafc8abd42f723944a","size":10477},{"path":"mcp/README.md","sha256":"5c852f608754e299c2cff74495862f1ce4775d0bda5776d7ce4f070f4e4a6494","size":10129},{"path":"docs/guide.html","sha256":"33b57e522b1a49e48631042940e2ca7d281084371c3feb3210604e213e0e7f28","size":51769}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":1,"votes_down":0,"uses_30d":6,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":154,"reverified_at":"2026-06-15T21:58:36.998Z","total_uses":6,"last_accessed_at":"2026-07-08T20:57:14.247Z"},"created_at":"2026-05-17T23:13:25.337Z","updated_at":"2026-07-03T16:16:26.700Z"}
```

