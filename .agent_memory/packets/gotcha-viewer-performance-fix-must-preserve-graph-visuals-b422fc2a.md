---
type: "Gotcha"
title: "Viewer performance fix must preserve graph visuals"
description: "A viewer performance fix that changed the large graph into a striped/static overview was worse than the original. Keep the terminal canvas graph visual semantics intact; optimize responsiveness through cached edge/degree"
tags: ["session-learning", "viewer", "performance", "graph", "ui"]
timestamp: "2026-05-03T07:31:30.344Z"
x-kage-id: "repo:https-github-com-kage-core-kage:gotcha:viewer-performance-fix-must-preserve-graph-visuals-1777793490345"
x-kage-type: "gotcha"
x-kage-status: "deprecated"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "deprecated"
---

# Viewer performance fix must preserve graph visuals

> A viewer performance fix that changed the large graph into a striped/static overview was worse than the original. Kee…

A viewer performance fix that changed the large graph into a striped/static overview was worse than the original. Keep the terminal canvas graph visual semantics intact; optimize responsiveness through cached edge/degree lookups, throttled search and pointer redraws, adjacency caches, and bounded force simulation instead of changing the rendered graph shape.
Evidence: Browser QA on http://127.0.0.1:3124 showed the static large-graph fallback made the graph visually worse; the final patch restores the previous graph look and keeps performance-only optimizations.
Verified by: node --check mcp/viewer/app.js; browser screenshot default high-signal graph

# Citations

[1] explicit_capture (2026-05-03T07:31:30.344Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:gotcha:viewer-performance-fix-must-preserve-graph-visuals-1777793490345","title":"Viewer performance fix must preserve graph visuals","summary":"A viewer performance fix that changed the large graph into a striped/static overview was worse than the original. Keep the terminal canvas graph visual semantics intact; optimize responsiveness through cached edge/degree","body":"A viewer performance fix that changed the large graph into a striped/static overview was worse than the original. Keep the terminal canvas graph visual semantics intact; optimize responsiveness through cached edge/degree lookups, throttled search and pointer redraws, adjacency caches, and bounded force simulation instead of changing the rendered graph shape.\nEvidence: Browser QA on http://127.0.0.1:3124 showed the static large-graph fallback made the graph visually worse; the final patch restores the previous graph look and keeps performance-only optimizations.\nVerified by: node --check mcp/viewer/app.js; browser screenshot default high-signal graph","type":"gotcha","scope":"repo","visibility":"team","sensitivity":"internal","status":"deprecated","confidence":0.7,"tags":["session-learning","viewer","performance","graph","ui"],"paths":[],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-03T07:31:30.344Z"}],"freshness":{"ttl_days":365,"last_verified_at":"2026-05-03T07:31:30.344Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":165,"stale":true,"stale_reasons":["packet status is deprecated"],"suggested_action":"mark_stale"},"created_at":"2026-05-03T07:31:30.344Z","updated_at":"2026-06-05T14:45:41.009Z"}
```

