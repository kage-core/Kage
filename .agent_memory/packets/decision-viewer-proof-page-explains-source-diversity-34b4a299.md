---
type: "Decision"
title: "Viewer proof page explains source diversity"
description: "The Kage Proof page now renders source diversity benchmark details as a first class metric card, not only a generic proof ledger row or raw JSON. It shows unique sources, max results from one observed session, and the in"
tags: ["session-learning", "viewer", "benchmark", "proof-ledger", "source-diversity"]
timestamp: "2026-05-17T23:03:17.599Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:viewer-proof-page-explains-source-diversity-1779058997599"
x-kage-type: "decision"
x-kage-status: "deprecated"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "deprecated"
---

# Viewer proof page explains source diversity

> The Kage Proof page now renders source diversity benchmark details as a first class metric card, not only a generic p…

The Kage Proof page now renders source-diversity benchmark details as a first-class metric card, not only a generic proof-ledger row or raw JSON. It shows unique sources, max results from one observed session, and the independent session rank, using benchmark.memory_quality.source_diversity from the viewer benchmark report. The docs viewer app was synced and the viewer HTML cache key was bumped to app.js?v=45 so GitHub Pages refreshes the UI.
Verified by: npm test --prefix mcp -- --test-name-pattern 'viewer benchmark report exposes a proof ledger with runnable commands'; node --check mcp/viewer/app.js; node --check docs/viewer/app.js; git diff --check; local viewer served benchmark report with memory_quality.source_diversity.pass=true

## Verification

npm test --prefix mcp -- --test-name-pattern 'viewer benchmark report exposes a proof ledger with runnable commands'; node --check mcp/viewer/app.js; node --check docs/viewer/app.js; git diff --check; local viewer served benchmark report with memory_quality.source_diversity.pass=true

# Citations

[1] explicit_capture (2026-05-17T23:03:17.599Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:viewer-proof-page-explains-source-diversity-1779058997599","title":"Viewer proof page explains source diversity","summary":"The Kage Proof page now renders source diversity benchmark details as a first class metric card, not only a generic proof ledger row or raw JSON. It shows unique sources, max results from one observed session, and the in","body":"The Kage Proof page now renders source-diversity benchmark details as a first-class metric card, not only a generic proof-ledger row or raw JSON. It shows unique sources, max results from one observed session, and the independent session rank, using benchmark.memory_quality.source_diversity from the viewer benchmark report. The docs viewer app was synced and the viewer HTML cache key was bumped to app.js?v=45 so GitHub Pages refreshes the UI.\nVerified by: npm test --prefix mcp -- --test-name-pattern 'viewer benchmark report exposes a proof ledger with runnable commands'; node --check mcp/viewer/app.js; node --check docs/viewer/app.js; git diff --check; local viewer served benchmark report with memory_quality.source_diversity.pass=true","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"deprecated","confidence":0.7,"tags":["session-learning","viewer","benchmark","proof-ledger","source-diversity"],"paths":[],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-17T23:03:17.599Z"}],"context":{"fact":"The Kage Proof page now renders source-diversity benchmark details as a first-class metric card, not only a generic proof-ledger row or raw JSON. It shows unique sources, max results from one observed session, and the independent session rank, using benchmark.memory_quality.source_diversity from the viewer benchmark report. The docs viewer app was synced and the viewer HTML cache key was bumped to app.js?v=45 so GitHub Pages refreshes the UI.\nVerified by: npm test --prefix mcp -- --test-name-pattern 'viewer benchmark report exposes a proof ledger with runnable commands'; node --check mcp/viewer/app.js; node --check docs/viewer/app.js; git diff --check; local viewer served benchmark report with memory_quality.source_diversity.pass=true","verification":"npm test --prefix mcp -- --test-name-pattern 'viewer benchmark report exposes a proof ledger with runnable commands'; node --check mcp/viewer/app.js; node --check docs/viewer/app.js; git diff --check; local viewer served benchmark report with memory_quality.source_diversity.pass=true"},"freshness":{"ttl_days":365,"last_verified_at":"2026-05-17T23:03:17.599Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":186,"stale":true,"stale_reasons":["packet status is deprecated"],"suggested_action":"mark_stale"},"created_at":"2026-05-17T23:03:17.599Z","updated_at":"2026-06-05T14:45:41.007Z"}
```

