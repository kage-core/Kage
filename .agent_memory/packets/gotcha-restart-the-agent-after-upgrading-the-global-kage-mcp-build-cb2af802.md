---
type: "Gotcha"
title: "Restart the agent after upgrading the global Kage MCP build"
description: "The in session MCP server is loaded once at agent start, so a freshly published/installed kage graph mcp build e.g. a loader hardening fix is NOT picked up until the agent restarts. Symptom before restart: kage learn/kag"
resource: "mcp/index.ts"
tags: ["session-learning"]
timestamp: "2026-06-15T21:58:20.440Z"
x-kage-id: "repo:https-github-com-kage-core-kage:gotcha:restart-the-agent-after-upgrading-the-global-kage-mcp-build-1780660835450"
x-kage-type: "gotcha"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/index.ts", "mcp/kernel.ts"]
---

# Restart the agent after upgrading the global Kage MCP build

> The in session MCP server is loaded once at agent start, so a freshly published/installed kage graph mcp build e.g. a…

The in-session MCP server is loaded once at agent start, so a freshly published/installed kage-graph-mcp build (e.g. a loader-hardening fix) is NOT picked up until the agent restarts. Symptom before restart: kage_learn/kage_refresh over MCP crash with 'Unexpected end of JSON input' on a repo with corrupt/merge-conflicted packets, even though the CLI (new build) works. Fix: restart the agent to reload the global MCP server.
Verified by: kage_context + kage_verify_agent ran natively after restart (mcp_tool_reachable: true)

# Citations

[1] explicit_capture (2026-06-05T12:00:35.450Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:gotcha:restart-the-agent-after-upgrading-the-global-kage-mcp-build-1780660835450","title":"Restart the agent after upgrading the global Kage MCP build","summary":"The in session MCP server is loaded once at agent start, so a freshly published/installed kage graph mcp build e.g. a loader hardening fix is NOT picked up until the agent restarts. Symptom before restart: kage learn/kag","body":"The in-session MCP server is loaded once at agent start, so a freshly published/installed kage-graph-mcp build (e.g. a loader-hardening fix) is NOT picked up until the agent restarts. Symptom before restart: kage_learn/kage_refresh over MCP crash with 'Unexpected end of JSON input' on a repo with corrupt/merge-conflicted packets, even though the CLI (new build) works. Fix: restart the agent to reload the global MCP server.\nVerified by: kage_context + kage_verify_agent ran natively after restart (mcp_tool_reachable: true)","type":"gotcha","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning"],"paths":["mcp/index.ts","mcp/kernel.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-06-05T12:00:35.450Z"}],"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:20.440Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/index.ts","sha256":"d5abac0cb8d92d9074ae37a32ee515da8b03c43fe2d1a03d44447ee7b3493861","size":69453,"symbols":[{"name":"server","kind":"constant","sha256":"4c51eb77c75ec82db0638b55b2c9c6e55a03a1594fa82c31b7304f8b924f091e"}]},{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"before","kind":"constant","sha256":"70c005bc3586ccb93799dfa1989dccca69b847916fd3fde1583578730922c50c"},{"name":"after","kind":"constant","sha256":"220a1c1969c37d53268e215419dcea650ffa901162d0a25e451bd90831fb0a1b"},{"name":"learn","kind":"function","sha256":"93c4e74f4a7d140c065b4eaa12b6ef14ffa68bfaee0cfc0a3e3773881af468d3"},{"name":"server","kind":"constant","sha256":"5fd67f18035e46e58b653d1faddf541c198a3ed53d653138d4751f08353c0054"},{"name":"conflicted","kind":"constant","sha256":"fe8cf8eefac7240e454701ec8e4968f319aebc553047d0eb328562fe029510b3"}]}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":132,"reverified_at":"2026-06-15T21:58:20.440Z","total_uses":0},"created_at":"2026-06-05T12:00:35.450Z","updated_at":"2026-07-03T16:16:26.723Z"}
```

