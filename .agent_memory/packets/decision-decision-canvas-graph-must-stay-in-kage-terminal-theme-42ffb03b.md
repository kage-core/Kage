---
type: "Decision"
title: "Decision: canvas graph must stay in Kage terminal theme"
description: "Decision: Kage's canvas force graph should keep the Kage terminal visual language. Use a restrained near black shell background, phosphor green for memory, cyan for code, amber for tests/review, red only for risk, and mu"
tags: ["session-learning", "viewer", "theme", "ux", "canvas", "brand"]
timestamp: "2026-05-02T20:42:48.561Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:decision-canvas-graph-must-stay-in-kage-terminal-theme-1777754568561"
x-kage-type: "decision"
x-kage-status: "deprecated"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "deprecated"
---

# Decision: canvas graph must stay in Kage terminal theme

> Decision: Kage's canvas force graph should keep the Kage terminal visual language. Use a restrained near black shell …

Decision: Kage's canvas force graph should keep the Kage terminal visual language. Use a restrained near-black shell background, phosphor green for memory, cyan for code, amber for tests/review, red only for risk, and muted gray for dependencies. Prefer outline-first nodes, subtle fills, minimal glow, terminal tooltips, and zoom-aware labels instead of bright per-type gradients or candy-colored graph styling.
Evidence: Updated mcp/viewer/app.js and mcp/viewer/styles.css after visual review showed the session-memory interaction model drifting away from Kage's theme.
Verified by: node --check mcp/viewer/app.js; npm test --prefix mcp; npm --cache /tmp/kage-npm-cache pack --dry-run

# Citations

[1] explicit_capture (2026-05-02T20:42:48.561Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:decision-canvas-graph-must-stay-in-kage-terminal-theme-1777754568561","title":"Decision: canvas graph must stay in Kage terminal theme","summary":"Decision: Kage's canvas force graph should keep the Kage terminal visual language. Use a restrained near black shell background, phosphor green for memory, cyan for code, amber for tests/review, red only for risk, and mu","body":"Decision: Kage's canvas force graph should keep the Kage terminal visual language. Use a restrained near-black shell background, phosphor green for memory, cyan for code, amber for tests/review, red only for risk, and muted gray for dependencies. Prefer outline-first nodes, subtle fills, minimal glow, terminal tooltips, and zoom-aware labels instead of bright per-type gradients or candy-colored graph styling.\nEvidence: Updated mcp/viewer/app.js and mcp/viewer/styles.css after visual review showed the session-memory interaction model drifting away from Kage's theme.\nVerified by: node --check mcp/viewer/app.js; npm test --prefix mcp; npm --cache /tmp/kage-npm-cache pack --dry-run","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"deprecated","confidence":0.7,"tags":["session-learning","viewer","theme","ux","canvas","brand"],"paths":[],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-02T20:42:48.561Z"}],"freshness":{"ttl_days":365,"last_verified_at":"2026-05-02T20:42:48.561Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":346,"stale":true,"stale_reasons":["packet status is deprecated"],"suggested_action":"mark_stale"},"created_at":"2026-05-02T20:42:48.561Z","updated_at":"2026-06-05T14:45:41.000Z"}
```

