---
type: "Bug Fix"
title: "Viewer combined mode must prioritize visible memory-code links"
description: "The combined viewer can still look weak after memory code bridge support if the visible edge cap spends too much budget on code code and memory only relations. In default combined signal mode, cap the canvas edge count b"
resource: "mcp/kernel.test.ts"
tags: ["session-learning", "viewer", "memory-code", "combined-view", "ux"]
timestamp: "2026-06-15T21:58:13.928Z"
x-kage-id: "repo:https-github-com-kage-core-kage:bug_fix:viewer-combined-mode-must-prioritize-visible-memory-code-links-1778311363534"
x-kage-type: "bug_fix"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "verified"
x-kage-paths: ["mcp/kernel.test.ts"]
---

# Viewer combined mode must prioritize visible memory-code links

> The combined viewer can still look weak after memory code bridge support if the visible edge cap spends too much budg…

The combined viewer can still look weak after memory-code bridge support if the visible edge cap spends too much budget on code-code and memory-only relations. In default combined signal mode, cap the canvas edge count but reserve about half the visible edge budget for memory-code links, add memory-code peer nodes before filling the remaining code budget, and rank path bridge/file peers above generic high-degree symbols. Keep code-code edges visible for structure, but make memory-to-code the dominant visual story. Verified by npm --prefix mcp test and a viewer hook check showing Kage combined mode at 90 nodes renders 360 edges with 233 memory-code edges and 77 code-code edges.
Verified by: npm --prefix mcp test; viewer hook check

## Verification

npm --prefix mcp test; viewer hook check

# Citations

[1] explicit_capture (2026-05-09T07:22:43.533Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:bug_fix:viewer-combined-mode-must-prioritize-visible-memory-code-links-1778311363534","title":"Viewer combined mode must prioritize visible memory-code links","summary":"The combined viewer can still look weak after memory code bridge support if the visible edge cap spends too much budget on code code and memory only relations. In default combined signal mode, cap the canvas edge count b","body":"The combined viewer can still look weak after memory-code bridge support if the visible edge cap spends too much budget on code-code and memory-only relations. In default combined signal mode, cap the canvas edge count but reserve about half the visible edge budget for memory-code links, add memory-code peer nodes before filling the remaining code budget, and rank path bridge/file peers above generic high-degree symbols. Keep code-code edges visible for structure, but make memory-to-code the dominant visual story. Verified by npm --prefix mcp test and a viewer hook check showing Kage combined mode at 90 nodes renders 360 edges with 233 memory-code edges and 77 code-code edges.\nVerified by: npm --prefix mcp test; viewer hook check","type":"bug_fix","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","viewer","memory-code","combined-view","ux"],"paths":["mcp/kernel.test.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-09T07:22:43.533Z"}],"context":{"fact":"The combined viewer can still look weak after memory-code bridge support if the visible edge cap spends too much budget on code-code and memory-only relations. In default combined signal mode, cap the canvas edge count but reserve about half the visible edge budget for memory-code links, add memory-code peer nodes before filling the remaining code budget, and rank path bridge/file peers above generic high-degree symbols. Keep code-code edges visible for structure, but make memory-to-code the dominant visual story. Verified by npm --prefix mcp test and a viewer hook check showing Kage combined mode at 90 nodes renders 360 edges with 233 memory-code edges and 77 code-code edges.\nVerified by: npm --prefix mcp test; viewer hook check","verification":"npm --prefix mcp test; viewer hook check"},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:13.928Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"structure","kind":"constant","sha256":"f60b9908654ca2ff71e7337900d421fab57f358a2060a8648c070247d73f543c"},{"name":"visual","kind":"constant","sha256":"a0630c4ed26b5e862890a7c58fce446a06e8cb913119cf35dd93dd6badc58286"},{"name":"edges","kind":"constant","sha256":"8c37bcd95245ff6d66b6f8b413ce98901f9c5e8bad1c2b4dc47e75e3b2815f73"},{"name":"signal","kind":"constant","sha256":"f084f4945e43a881cf04b4d6eff63df1f052d4d6e933b089af3696e2bc699289"},{"name":"combined","kind":"constant","sha256":"554ec06aae48c9a47df84376a48ae5875cf9f989c81cbc3cead38693c38b4db7"}]}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":185,"reverified_at":"2026-06-15T21:58:13.928Z"},"created_at":"2026-05-09T07:22:43.533Z","updated_at":"2026-06-15T21:58:13.928Z"}
```

