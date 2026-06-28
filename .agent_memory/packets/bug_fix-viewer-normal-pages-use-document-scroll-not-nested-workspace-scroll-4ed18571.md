---
type: "Bug Fix"
title: "Viewer normal pages use document scroll, not nested workspace scroll"
description: "The viewer scrolling felt broken because normal pages used fixed height .workspace shell containers with overflow:auto. That created nested scroll areas where the browser page did not move unless the cursor was over the"
tags: ["session-learning"]
timestamp: "2026-05-18T10:29:32.186Z"
x-kage-id: "repo:https-github-com-kage-core-kage:bug_fix:viewer-normal-pages-use-document-scroll-not-nested-workspace-scroll-177910017218"
x-kage-type: "bug_fix"
x-kage-status: "deprecated"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "deprecated"
---

# Viewer normal pages use document scroll, not nested workspace scroll

> The viewer scrolling felt broken because normal pages used fixed height .workspace shell containers with overflow:aut…

The viewer scrolling felt broken because normal pages used fixed-height .workspace-shell containers with overflow:auto. That created nested scroll areas where the browser page did not move unless the cursor was over the right panel. Normal pages should use document scrolling: workspace shells use height:auto and overflow:visible, long memory/review/intel lists expand naturally, while only graph-specific and inspector-specific surfaces keep bounded internal scroll.

# Citations

[1] explicit_capture (2026-05-18T10:29:32.186Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:bug_fix:viewer-normal-pages-use-document-scroll-not-nested-workspace-scroll-177910017218","title":"Viewer normal pages use document scroll, not nested workspace scroll","summary":"The viewer scrolling felt broken because normal pages used fixed height .workspace shell containers with overflow:auto. That created nested scroll areas where the browser page did not move unless the cursor was over the","body":"The viewer scrolling felt broken because normal pages used fixed-height .workspace-shell containers with overflow:auto. That created nested scroll areas where the browser page did not move unless the cursor was over the right panel. Normal pages should use document scrolling: workspace shells use height:auto and overflow:visible, long memory/review/intel lists expand naturally, while only graph-specific and inspector-specific surfaces keep bounded internal scroll.","type":"bug_fix","scope":"repo","visibility":"team","sensitivity":"internal","status":"deprecated","confidence":0.7,"tags":["session-learning"],"paths":[],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-18T10:29:32.186Z"}],"context":{"fact":"The viewer scrolling felt broken because normal pages used fixed-height .workspace-shell containers with overflow:auto. That created nested scroll areas where the browser page did not move unless the cursor was over the right panel. Normal pages should use document scrolling: workspace shells use height:auto and overflow:visible, long memory/review/intel lists expand naturally, while only graph-specific and inspector-specific surfaces keep bounded internal scroll."},"freshness":{"ttl_days":365,"last_verified_at":"2026-05-18T10:29:32.186Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":117,"stale":true,"stale_reasons":["packet status is deprecated"],"suggested_action":"mark_stale"},"created_at":"2026-05-18T10:29:32.186Z","updated_at":"2026-06-05T14:45:40.999Z"}
```

