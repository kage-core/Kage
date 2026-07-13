---
type: "Gotcha"
title: "Validate ISO calendar fields before Date.parse"
description: "Protocol boundary validators must not rely on Date.parse alone for ISO timestamp validity because JavaScript normalizes impossible calendar dates such as 2026 02 30 into March. Validate captured year/month/day and time r"
resource: "mcp/vnext/protocol/validate.ts"
tags: ["session-learning", "vnext", "protocol", "validation", "timestamps"]
timestamp: "2026-07-13T14:04:05.242Z"
x-kage-id: "repo:kage-vnext-implementation:gotcha:validate-iso-calendar-fields-before-date-parse-1783951445242"
x-kage-type: "gotcha"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/vnext/protocol/validate.ts", "mcp/vnext/protocol/protocol.test.ts"]
x-kage-stack: ["TypeScript", "Node.js"]
---

# Validate ISO calendar fields before Date.parse

> Protocol boundary validators must not rely on Date.parse alone for ISO timestamp validity because JavaScript normaliz…

Protocol boundary validators must not rely on Date.parse alone for ISO timestamp validity because JavaScript normalizes impossible calendar dates such as 2026-02-30 into March. Validate captured year/month/day and time ranges before accepting the parsed timestamp.
Evidence: The focused protocol test rejected 2026-02-30 only after explicit calendar-range validation; npm test --prefix mcp then passed.
Verified by: node --test mcp/dist/vnext/protocol/protocol.test.js

## Verification

The focused protocol test rejected 2026-02-30 only after explicit calendar-range validation; npm test --prefix mcp then passed.

# Citations

[1] explicit_capture (2026-07-13T14:04:05.242Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:kage-vnext-implementation:gotcha:validate-iso-calendar-fields-before-date-parse-1783951445242","title":"Validate ISO calendar fields before Date.parse","summary":"Protocol boundary validators must not rely on Date.parse alone for ISO timestamp validity because JavaScript normalizes impossible calendar dates such as 2026 02 30 into March. Validate captured year/month/day and time r","body":"Protocol boundary validators must not rely on Date.parse alone for ISO timestamp validity because JavaScript normalizes impossible calendar dates such as 2026-02-30 into March. Validate captured year/month/day and time ranges before accepting the parsed timestamp.\nEvidence: The focused protocol test rejected 2026-02-30 only after explicit calendar-range validation; npm test --prefix mcp then passed.\nVerified by: node --test mcp/dist/vnext/protocol/protocol.test.js","type":"gotcha","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","vnext","protocol","validation","timestamps"],"paths":["mcp/vnext/protocol/validate.ts","mcp/vnext/protocol/protocol.test.ts"],"stack":["TypeScript","Node.js"],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-07-13T14:04:05.242Z"}],"context":{"fact":"Protocol boundary validators must not rely on Date.parse alone for ISO timestamp validity because JavaScript normalizes impossible calendar dates such as 2026-02-30 into March. Validate captured year/month/day and time ranges before accepting the parsed timestamp.\nEvidence: The focused protocol test rejected 2026-02-30 only after explicit calendar-range validation; npm test --prefix mcp then passed.\nVerified by: node --test mcp/dist/vnext/protocol/protocol.test.js","verification":"The focused protocol test rejected 2026-02-30 only after explicit calendar-range validation; npm test --prefix mcp then passed."},"freshness":{"ttl_days":365,"last_verified_at":"2026-07-13T14:04:05.242Z","path_fingerprints":[{"path":"mcp/vnext/protocol/validate.ts","sha256":"b8436431b40064fb81aab8ad28d6064027f2f9fff97d38c5d2714e77068ade63","size":5188},{"path":"mcp/vnext/protocol/protocol.test.ts","sha256":"d9d6683e636a66b6bf2bd98727a779ab6974d545615cfc0bf573146d9c0a3762","size":5400}],"path_fingerprint_policy":"source_hash_staleness","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"discovery_tokens":8000,"discovery_tokens_estimated":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"stale_reasons":[],"estimated_tokens_saved":117},"created_at":"2026-07-13T14:04:05.242Z","updated_at":"2026-07-13T14:04:05.242Z","author_branch":"codex/kage-vnext-implementation"}
```
