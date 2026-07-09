---
type: "Decision"
title: "Viewer dashboard shows setup hook readiness"
description: "The viewer now treats setup doctor output as a first class report. kage viewer writes .agent memory/reports/setup.json, passes it to the viewer URL, local and hosted viewer loading both read setup reports, and the dashbo"
resource: "mcp/daemon.ts"
tags: ["session-learning", "viewer", "dashboard", "setup-doctor", "claude-code", "hooks"]
timestamp: "2026-05-17T23:27:58.598Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:viewer-dashboard-shows-setup-hook-readiness-1779060478598"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/daemon.ts"]
---

# Viewer dashboard shows setup hook readiness

> The viewer now treats setup doctor output as a first class report. kage viewer writes .agent memory/reports/setup.jso…

The viewer now treats setup doctor output as a first-class report. kage viewer writes .agent_memory/reports/setup.json, passes it to the viewer URL, local and hosted viewer loading both read setup reports, and the dashboard shows an Agent setup card with configured-agent count, Claude Code hook readiness, missing hook/script count, and the exact setup command to run when automatic memory hooks are incomplete. This closes the Kage-native setup proof gap in the UI instead of leaving it only in CLI or MCP output.
Evidence: Runtime smoke started kage viewer on port 8876 and confirmed the generated URL includes setup=.agent_memory/reports/setup.json; the report showed Codex configured and Claude Code missing UserPromptSubmit/PostToolUse/PostToolUseFailure/PreCompact/Stop/SessionEnd plus observe.sh/stop.sh.
Verified by: node --check mcp/viewer/app.js; node --check docs/viewer/app.js; git diff --check; npm test --prefix mcp -- --test-name-pattern 'viewer benchmark report exposes a proof ledger with runnable commands|MCP setup, quality, benchmark, observe, and distill tools work|setup generates all-agent MCP configuration'; node mcp/dist/cli.js viewer --project . --port 8876

## Verification

Runtime smoke started kage viewer on port 8876 and confirmed the generated URL includes setup=.agent_memory/reports/setup.json; the report showed Codex configured and Claude Code missing UserPromptSubmit/PostToolUse/PostToolUseFailure/PreCompact/Stop/SessionEnd plus observe.sh/stop.sh.

# Citations

[1] explicit_capture (2026-05-17T23:27:58.598Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:viewer-dashboard-shows-setup-hook-readiness-1779060478598","title":"Viewer dashboard shows setup hook readiness","summary":"The viewer now treats setup doctor output as a first class report. kage viewer writes .agent memory/reports/setup.json, passes it to the viewer URL, local and hosted viewer loading both read setup reports, and the dashbo","body":"The viewer now treats setup doctor output as a first-class report. kage viewer writes .agent_memory/reports/setup.json, passes it to the viewer URL, local and hosted viewer loading both read setup reports, and the dashboard shows an Agent setup card with configured-agent count, Claude Code hook readiness, missing hook/script count, and the exact setup command to run when automatic memory hooks are incomplete. This closes the Kage-native setup proof gap in the UI instead of leaving it only in CLI or MCP output.\nEvidence: Runtime smoke started kage viewer on port 8876 and confirmed the generated URL includes setup=.agent_memory/reports/setup.json; the report showed Codex configured and Claude Code missing UserPromptSubmit/PostToolUse/PostToolUseFailure/PreCompact/Stop/SessionEnd plus observe.sh/stop.sh.\nVerified by: node --check mcp/viewer/app.js; node --check docs/viewer/app.js; git diff --check; npm test --prefix mcp -- --test-name-pattern 'viewer benchmark report exposes a proof ledger with runnable commands|MCP setup, quality, benchmark, observe, and distill tools work|setup generates all-agent MCP configuration'; node mcp/dist/cli.js viewer --project . --port 8876","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","viewer","dashboard","setup-doctor","claude-code","hooks"],"paths":["mcp/daemon.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-17T23:27:58.598Z"}],"context":{"fact":"The viewer now treats setup doctor output as a first-class report. kage viewer writes .agent_memory/reports/setup.json, passes it to the viewer URL, local and hosted viewer loading both read setup reports, and the dashboard shows an Agent setup card with configured-agent count, Claude Code hook readiness, missing hook/script count, and the exact setup command to run when automatic memory hooks are incomplete. This closes the Kage-native setup proof gap in the UI instead of leaving it only in CLI or MCP output.\nEvidence: Runtime smoke started kage viewer on port 8876 and confirmed the generated URL includes setup=.agent_memory/reports/setup.json; the report showed Codex configured and Claude Code missing UserPromptSubmit/PostToolUse/PostToolUseFailure/PreCompact/Stop/SessionEnd plus observe.sh/stop.sh.\nVerified by: node --check mcp/viewer/app.js; node --check docs/viewer/app.js; git diff --check; npm test --prefix mcp -- --test-name-pattern 'viewer benchmark report exposes a proof ledger with runnable commands|MCP setup, quality, benchmark, observe, and distill tools work|setup generates all-agent MCP configuration'; node mcp/dist/cli.js viewer --project . --port 8876","verification":"Runtime smoke started kage viewer on port 8876 and confirmed the generated URL includes setup=.agent_memory/reports/setup.json; the report showed Codex configured and Claude Code missing UserPromptSubmit/PostToolUse/PostToolUseFailure/PreCompact/Stop/SessionEnd plus observe.sh/stop.sh."},"freshness":{"ttl_days":365,"last_verified_at":"2026-05-17T23:27:58.598Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":1,"votes_down":0,"uses_30d":20,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":299,"total_uses":23,"last_accessed_at":"2026-07-09T06:54:39.972Z"},"created_at":"2026-05-17T23:27:58.598Z","updated_at":"2026-07-03T16:16:26.718Z"}
```

