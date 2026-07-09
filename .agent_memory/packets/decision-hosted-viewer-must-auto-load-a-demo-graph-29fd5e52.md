---
type: "Decision"
title: "Hosted viewer must auto-load a demo graph"
description: "A hosted GitHub Pages viewer with no default graph is not useful. The viewer now loads mcp/viewer/demo/graph.json and demo/metrics.json when opened without graph/code URL params, so https://kage core.github.io/Kage/viewe"
resource: "README.md"
tags: ["session-learning", "viewer", "pages", "demo", "docs"]
timestamp: "2026-05-03T08:06:44.489Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:hosted-viewer-must-auto-load-a-demo-graph-1777795604489"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["README.md"]
---

# Hosted viewer must auto-load a demo graph

> A hosted GitHub Pages viewer with no default graph is not useful. The viewer now loads mcp/viewer/demo/graph.json and…

A hosted GitHub Pages viewer with no default graph is not useful. The viewer now loads mcp/viewer/demo/graph.json and demo/metrics.json when opened without graph/code URL params, so https://kage-core.github.io/Kage/viewer/ immediately shows an interactive memory graph. Local kage viewer remains preferred for real repos because it passes explicit graph/code/metrics/review/pending params.
Evidence: Local Pages preview at http://127.0.0.1:8129/viewer/ reported hosted demo graph loaded and demo graph JSON has 14 entities, 13 edges, and 5 episodes.
Verified by: browser DOM snapshot; npm test --prefix mcp

# Citations

[1] explicit_capture (2026-05-03T08:06:44.489Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:hosted-viewer-must-auto-load-a-demo-graph-1777795604489","title":"Hosted viewer must auto-load a demo graph","summary":"A hosted GitHub Pages viewer with no default graph is not useful. The viewer now loads mcp/viewer/demo/graph.json and demo/metrics.json when opened without graph/code URL params, so https://kage core.github.io/Kage/viewe","body":"A hosted GitHub Pages viewer with no default graph is not useful. The viewer now loads mcp/viewer/demo/graph.json and demo/metrics.json when opened without graph/code URL params, so https://kage-core.github.io/Kage/viewer/ immediately shows an interactive memory graph. Local kage viewer remains preferred for real repos because it passes explicit graph/code/metrics/review/pending params.\nEvidence: Local Pages preview at http://127.0.0.1:8129/viewer/ reported hosted demo graph loaded and demo graph JSON has 14 entities, 13 edges, and 5 episodes.\nVerified by: browser DOM snapshot; npm test --prefix mcp","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","viewer","pages","demo","docs"],"paths":["README.md"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-03T08:06:44.489Z"}],"freshness":{"ttl_days":365,"last_verified_at":"2026-05-03T08:06:44.489Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":3,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":152,"total_uses":3,"last_accessed_at":"2026-07-09T06:42:22.987Z"},"created_at":"2026-05-03T08:06:44.489Z","updated_at":"2026-07-03T16:16:26.705Z"}
```

