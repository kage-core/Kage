---
type: "Decision"
title: "Public site UX should be onboarding-first and task-scoped"
description: "The Kage public site should be organized around user journeys, not internal feature inventory. Homepage should convert new users with the canonical install/setup flow, short problem/solution sections, agent compatibility"
resource: "docs/index.html"
tags: ["session-learning"]
timestamp: "2026-05-15T12:50:14.555Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:public-site-ux-should-be-onboarding-first-and-task-scoped-1778849414555"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["docs/index.html", "docs/guide.html", "docs/releases.html", "docs/assets/site.css", "README.md", "mcp/README.md", ".github/workflows/pages.yml"]
---

# Public site UX should be onboarding-first and task-scoped

> The Kage public site should be organized around user journeys, not internal feature inventory. Homepage should conver…

The Kage public site should be organized around user journeys, not internal feature inventory. Homepage should convert new users with the canonical install/setup flow, short problem/solution sections, agent compatibility, trust model, and viewer demo. Docs should be onboarding-first, then concepts, CLI/MCP reference, viewer, privacy, and troubleshooting. Releases should show package status and user-impact highlights instead of a changelog wall. Viewer should use task labels like Risks and Review, keep Artifacts as advanced diagnostics, and use absolute public backlinks so local daemon viewers do not dead-end.
Verified by: Subagent product/docs/visual/implementation reviews plus Claude Code implementation; node --check viewer JS; diff -qr mcp/viewer docs/viewer; git diff --check; npm test --prefix mcp; Playwright desktop/mobile layout checks

## Verification

Subagent product/docs/visual/implementation reviews plus Claude Code implementation; node --check viewer JS; diff -qr mcp/viewer docs/viewer; git diff --check; npm test --prefix mcp; Playwright desktop/mobile layout checks

# Citations

[1] explicit_capture (2026-05-15T12:50:14.555Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:public-site-ux-should-be-onboarding-first-and-task-scoped-1778849414555","title":"Public site UX should be onboarding-first and task-scoped","summary":"The Kage public site should be organized around user journeys, not internal feature inventory. Homepage should convert new users with the canonical install/setup flow, short problem/solution sections, agent compatibility","body":"The Kage public site should be organized around user journeys, not internal feature inventory. Homepage should convert new users with the canonical install/setup flow, short problem/solution sections, agent compatibility, trust model, and viewer demo. Docs should be onboarding-first, then concepts, CLI/MCP reference, viewer, privacy, and troubleshooting. Releases should show package status and user-impact highlights instead of a changelog wall. Viewer should use task labels like Risks and Review, keep Artifacts as advanced diagnostics, and use absolute public backlinks so local daemon viewers do not dead-end.\nVerified by: Subagent product/docs/visual/implementation reviews plus Claude Code implementation; node --check viewer JS; diff -qr mcp/viewer docs/viewer; git diff --check; npm test --prefix mcp; Playwright desktop/mobile layout checks","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning"],"paths":["docs/index.html","docs/guide.html","docs/releases.html","docs/assets/site.css","README.md","mcp/README.md",".github/workflows/pages.yml"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-15T12:50:14.555Z"}],"context":{"fact":"The Kage public site should be organized around user journeys, not internal feature inventory. Homepage should convert new users with the canonical install/setup flow, short problem/solution sections, agent compatibility, trust model, and viewer demo. Docs should be onboarding-first, then concepts, CLI/MCP reference, viewer, privacy, and troubleshooting. Releases should show package status and user-impact highlights instead of a changelog wall. Viewer should use task labels like Risks and Review, keep Artifacts as advanced diagnostics, and use absolute public backlinks so local daemon viewers do not dead-end.\nVerified by: Subagent product/docs/visual/implementation reviews plus Claude Code implementation; node --check viewer JS; diff -qr mcp/viewer docs/viewer; git diff --check; npm test --prefix mcp; Playwright desktop/mobile layout checks","verification":"Subagent product/docs/visual/implementation reviews plus Claude Code implementation; node --check viewer JS; diff -qr mcp/viewer docs/viewer; git diff --check; npm test --prefix mcp; Playwright desktop/mobile layout checks"},"freshness":{"ttl_days":365,"last_verified_at":"2026-05-15T12:50:14.555Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":2,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":213,"total_uses":2,"last_accessed_at":"2026-07-09T21:44:42.980Z"},"created_at":"2026-05-15T12:50:14.555Z","updated_at":"2026-07-03T16:16:26.710Z"}
```

