---
type: "Decision"
title: "Viewer graph UX is task-first, not graph-engine-first"
description: "The viewer Graph page should default to a small task workflow: search before changing code, filter to untrusted relations, show code without memory, inspect memory code links, and only show Inspector/Path Finder after a"
resource: "README.md"
tags: ["session-learning"]
timestamp: "2026-05-15T12:16:39.056Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:viewer-graph-ux-is-task-first-not-graph-engine-first-1778847399056"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["README.md", "mcp/README.md", "docs/guide.html", "CHANGELOG.md", "docs/releases.html"]
---

# Viewer graph UX is task-first, not graph-engine-first

> The viewer Graph page should default to a small task workflow: search before changing code, filter to untrusted relat…

The viewer Graph page should default to a small task workflow: search before changing code, filter to untrusted relations, show code without memory, inspect memory-code links, and only show Inspector/Path Finder after a meaningful selection. Artifacts should not be primary navigation; it is an advanced diagnostics page for raw generated nodes, relations, evidence, and memory-code join quality. Hidden pages should not be re-rendered on every graph interaction.
Verified by: Claude Code critique plus three subagent reviews; Playwright desktop/mobile route checks; graph action filter checks; npm test --prefix mcp

## Verification

Claude Code critique plus three subagent reviews; Playwright desktop/mobile route checks; graph action filter checks; npm test --prefix mcp

# Citations

[1] explicit_capture (2026-05-15T12:16:39.056Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:viewer-graph-ux-is-task-first-not-graph-engine-first-1778847399056","title":"Viewer graph UX is task-first, not graph-engine-first","summary":"The viewer Graph page should default to a small task workflow: search before changing code, filter to untrusted relations, show code without memory, inspect memory code links, and only show Inspector/Path Finder after a","body":"The viewer Graph page should default to a small task workflow: search before changing code, filter to untrusted relations, show code without memory, inspect memory-code links, and only show Inspector/Path Finder after a meaningful selection. Artifacts should not be primary navigation; it is an advanced diagnostics page for raw generated nodes, relations, evidence, and memory-code join quality. Hidden pages should not be re-rendered on every graph interaction.\nVerified by: Claude Code critique plus three subagent reviews; Playwright desktop/mobile route checks; graph action filter checks; npm test --prefix mcp","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning"],"paths":["README.md","mcp/README.md","docs/guide.html","CHANGELOG.md","docs/releases.html"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-15T12:16:39.056Z"}],"context":{"fact":"The viewer Graph page should default to a small task workflow: search before changing code, filter to untrusted relations, show code without memory, inspect memory-code links, and only show Inspector/Path Finder after a meaningful selection. Artifacts should not be primary navigation; it is an advanced diagnostics page for raw generated nodes, relations, evidence, and memory-code join quality. Hidden pages should not be re-rendered on every graph interaction.\nVerified by: Claude Code critique plus three subagent reviews; Playwright desktop/mobile route checks; graph action filter checks; npm test --prefix mcp","verification":"Claude Code critique plus three subagent reviews; Playwright desktop/mobile route checks; graph action filter checks; npm test --prefix mcp"},"freshness":{"ttl_days":365,"last_verified_at":"2026-05-15T12:16:39.056Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":2,"votes_down":0,"uses_30d":2,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":154,"total_uses":2,"last_accessed_at":"2026-07-03T06:34:17.526Z"},"created_at":"2026-05-15T12:16:39.056Z","updated_at":"2026-07-03T16:16:26.718Z"}
```

