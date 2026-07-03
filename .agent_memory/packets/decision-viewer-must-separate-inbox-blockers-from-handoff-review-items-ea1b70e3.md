---
type: "Decision"
title: "Viewer must separate inbox blockers from handoff review items"
description: "The Review viewer should not use handoff open items as the Memory inbox count. Pending, stale, and duplicate inbox blockers are a separate trust signal from broader handoff review items such as lifecycle, audit, timeline"
resource: "mcp/daemon.test.ts"
tags: ["session-learning", "viewer", "ui", "handoff", "memory-inbox"]
timestamp: "2026-06-15T21:58:15.665Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:viewer-must-separate-inbox-blockers-from-handoff-review-items-1780217074351"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/daemon.test.ts"]
---

# Viewer must separate inbox blockers from handoff review items

> The Review viewer should not use handoff open items as the Memory inbox count. Pending, stale, and duplicate inbox bl…

The Review viewer should not use handoff open_items as the Memory inbox count. Pending, stale, and duplicate inbox blockers are a separate trust signal from broader handoff review items such as lifecycle, audit, timeline, and lineage warnings. Dashboard and review copy should say 'Before You Edit' consistently and avoid stale 'Open risks' language.
Evidence: Added a viewer guard test that fails on 'Open risks' and on handoff open_items overriding inbox counts; patched app.js and viewer shells so the test passes.
Verified by: npm test --prefix mcp -- daemon.test.js

## Verification

Added a viewer guard test that fails on 'Open risks' and on handoff open_items overriding inbox counts; patched app.js and viewer shells so the test passes.

# Citations

[1] explicit_capture (2026-05-31T08:44:34.351Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:viewer-must-separate-inbox-blockers-from-handoff-review-items-1780217074351","title":"Viewer must separate inbox blockers from handoff review items","summary":"The Review viewer should not use handoff open items as the Memory inbox count. Pending, stale, and duplicate inbox blockers are a separate trust signal from broader handoff review items such as lifecycle, audit, timeline","body":"The Review viewer should not use handoff open_items as the Memory inbox count. Pending, stale, and duplicate inbox blockers are a separate trust signal from broader handoff review items such as lifecycle, audit, timeline, and lineage warnings. Dashboard and review copy should say 'Before You Edit' consistently and avoid stale 'Open risks' language.\nEvidence: Added a viewer guard test that fails on 'Open risks' and on handoff open_items overriding inbox counts; patched app.js and viewer shells so the test passes.\nVerified by: npm test --prefix mcp -- daemon.test.js","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","viewer","ui","handoff","memory-inbox"],"paths":["mcp/daemon.test.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-31T08:44:34.351Z"}],"context":{"fact":"The Review viewer should not use handoff open_items as the Memory inbox count. Pending, stale, and duplicate inbox blockers are a separate trust signal from broader handoff review items such as lifecycle, audit, timeline, and lineage warnings. Dashboard and review copy should say 'Before You Edit' consistently and avoid stale 'Open risks' language.\nEvidence: Added a viewer guard test that fails on 'Open risks' and on handoff open_items overriding inbox counts; patched app.js and viewer shells so the test passes.\nVerified by: npm test --prefix mcp -- daemon.test.js","verification":"Added a viewer guard test that fails on 'Open risks' and on handoff open_items overriding inbox counts; patched app.js and viewer shells so the test passes."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:15.665Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/daemon.test.ts","sha256":"ef48ce8b21ff33ed39379a9be695f863280d552399973a742c0e3932c21bfe1e","size":12250}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":1,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":143,"reverified_at":"2026-06-15T21:58:15.665Z","total_uses":1,"last_accessed_at":"2026-06-29T07:45:28.059Z"},"created_at":"2026-05-31T08:44:34.351Z","updated_at":"2026-07-03T16:16:26.719Z"}
```

