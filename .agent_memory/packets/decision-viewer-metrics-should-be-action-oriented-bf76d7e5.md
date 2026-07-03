---
type: "Decision"
title: "Viewer metrics should be action-oriented"
description: "Viewer metrics should present user actionable signals rather than raw implementation counters. Use labels like Agent handoff, Memory coverage, Review queue, Risk signals, Ownership, Source map, Validation, and Memory cod"
resource: "README.md"
tags: ["session-learning"]
timestamp: "2026-05-15T08:53:33.581Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:viewer-metrics-should-be-action-oriented-1778835213581"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["README.md"]
---

# Viewer metrics should be action-oriented

> Viewer metrics should present user actionable signals rather than raw implementation counters. Use labels like Agent …

Viewer metrics should present user-actionable signals rather than raw implementation counters. Use labels like Agent handoff, Memory coverage, Review queue, Risk signals, Ownership, Source map, Validation, and Memory-code links, each with a short meaning or action detail. Avoid prominent raw readiness scores, cache hits, and token estimates in the main dashboard because they do not explain what a user should do next.

# Citations

[1] explicit_capture (2026-05-15T08:53:33.581Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:viewer-metrics-should-be-action-oriented-1778835213581","title":"Viewer metrics should be action-oriented","summary":"Viewer metrics should present user actionable signals rather than raw implementation counters. Use labels like Agent handoff, Memory coverage, Review queue, Risk signals, Ownership, Source map, Validation, and Memory cod","body":"Viewer metrics should present user-actionable signals rather than raw implementation counters. Use labels like Agent handoff, Memory coverage, Review queue, Risk signals, Ownership, Source map, Validation, and Memory-code links, each with a short meaning or action detail. Avoid prominent raw readiness scores, cache hits, and token estimates in the main dashboard because they do not explain what a user should do next.","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning"],"paths":["README.md"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-15T08:53:33.581Z"}],"context":{"fact":"Viewer metrics should present user-actionable signals rather than raw implementation counters. Use labels like Agent handoff, Memory coverage, Review queue, Risk signals, Ownership, Source map, Validation, and Memory-code links, each with a short meaning or action detail. Avoid prominent raw readiness scores, cache hits, and token estimates in the main dashboard because they do not explain what a user should do next."},"freshness":{"ttl_days":365,"last_verified_at":"2026-05-15T08:53:33.581Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":105,"total_uses":0},"created_at":"2026-05-15T08:53:33.581Z","updated_at":"2026-07-03T16:16:26.718Z"}
```

