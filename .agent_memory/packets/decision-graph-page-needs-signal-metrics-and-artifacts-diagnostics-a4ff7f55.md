---
type: "Decision"
title: "Graph page needs signal metrics and Artifacts diagnostics"
description: "The viewer Graph page should not only render nodes. It should lead with Graph Signals: visible code/memory mix, memory code context, review flags, and a suggested Path Finder trace that answers whether two code artifacts"
tags: ["session-learning"]
timestamp: "2026-05-15T11:53:17.673Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:graph-page-needs-signal-metrics-and-artifacts-diagnostics-1778845997673"
x-kage-type: "decision"
x-kage-status: "deprecated"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "deprecated"
---

# Graph page needs signal metrics and Artifacts diagnostics

> The viewer Graph page should not only render nodes. It should lead with Graph Signals: visible code/memory mix, memor…

The viewer Graph page should not only render nodes. It should lead with Graph Signals: visible code/memory mix, memory-code context, review flags, and a suggested Path Finder trace that answers whether two code artifacts are connected before editing. The old Debug route should be framed as Artifacts, a diagnostics page for generated graph shape, evidence coverage, memory-code links, review flags, and raw node/relation inspection.
Verified by: Playwright desktop/mobile route checks for Graph and Artifacts; path suggestion click produced a dependency path; npm test --prefix mcp

## Verification

Playwright desktop/mobile route checks for Graph and Artifacts; path suggestion click produced a dependency path; npm test --prefix mcp

# Citations

[1] explicit_capture (2026-05-15T11:53:17.673Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:graph-page-needs-signal-metrics-and-artifacts-diagnostics-1778845997673","title":"Graph page needs signal metrics and Artifacts diagnostics","summary":"The viewer Graph page should not only render nodes. It should lead with Graph Signals: visible code/memory mix, memory code context, review flags, and a suggested Path Finder trace that answers whether two code artifacts","body":"The viewer Graph page should not only render nodes. It should lead with Graph Signals: visible code/memory mix, memory-code context, review flags, and a suggested Path Finder trace that answers whether two code artifacts are connected before editing. The old Debug route should be framed as Artifacts, a diagnostics page for generated graph shape, evidence coverage, memory-code links, review flags, and raw node/relation inspection.\nVerified by: Playwright desktop/mobile route checks for Graph and Artifacts; path suggestion click produced a dependency path; npm test --prefix mcp","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"deprecated","confidence":0.7,"tags":["session-learning"],"paths":[],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-15T11:53:17.673Z"}],"context":{"fact":"The viewer Graph page should not only render nodes. It should lead with Graph Signals: visible code/memory mix, memory-code context, review flags, and a suggested Path Finder trace that answers whether two code artifacts are connected before editing. The old Debug route should be framed as Artifacts, a diagnostics page for generated graph shape, evidence coverage, memory-code links, review flags, and raw node/relation inspection.\nVerified by: Playwright desktop/mobile route checks for Graph and Artifacts; path suggestion click produced a dependency path; npm test --prefix mcp","verification":"Playwright desktop/mobile route checks for Graph and Artifacts; path suggestion click produced a dependency path; npm test --prefix mcp"},"freshness":{"ttl_days":365,"last_verified_at":"2026-05-15T11:53:17.673Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":1,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":146,"stale":true,"stale_reasons":["packet status is deprecated"],"suggested_action":"mark_stale"},"created_at":"2026-05-15T11:53:17.673Z","updated_at":"2026-06-05T14:45:41.001Z"}
```

