---
type: "Bug Fix"
title: "Protocol validators project trusted values from own fields"
description: "Kage protocol boundary validators must treat validated output as a privacy allowlist: required schema fields must be own properties, and successful validation must project fresh plain objects containing only declared fie"
resource: "mcp/vnext/protocol/validate.ts"
tags: ["session-learning", "vnext", "protocol", "validation", "privacy", "trust-boundary"]
timestamp: "2026-07-13T14:26:06.590Z"
x-kage-id: "repo:kage-vnext-implementation:bug_fix:protocol-validators-project-trusted-values-from-own-fields-1783952369578"
x-kage-type: "bug_fix"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "verified"
x-kage-paths: ["mcp/vnext/protocol/validate.ts", "mcp/vnext/protocol/protocol.test.ts"]
x-kage-stack: ["TypeScript", "Node.js"]
---

# Protocol validators project trusted values from own fields

> Kage protocol boundary validators must treat validated output as a privacy allowlist: required schema fields must be …

Kage protocol boundary validators must treat validated output as a privacy allowlist: required schema fields must be own properties, and successful validation must project fresh plain objects containing only declared fields. Clone capability arrays and the event payload record so caller-owned prototypes and extra schema fields cannot cross into trusted serialized values; arbitrary own payload entries remain part of the explicit payload boundary.
Evidence: Regression tests demonstrated inherited required fields and extra schema fields crossing the validator boundary before the fix; focused protocol tests and the full MCP suite pass after own-property extraction and projection.
Verified by: npm test --prefix mcp

## Verification

Regression tests demonstrated inherited required fields and extra schema fields crossing the validator boundary before the fix; focused protocol tests and the full MCP suite pass after own-property extraction and projection.

# Citations

[1] explicit_capture (2026-07-13T14:19:29.578Z)
[2] reverification

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:kage-vnext-implementation:bug_fix:protocol-validators-project-trusted-values-from-own-fields-1783952369578","title":"Protocol validators project trusted values from own fields","summary":"Kage protocol boundary validators must treat validated output as a privacy allowlist: required schema fields must be own properties, and successful validation must project fresh plain objects containing only declared fie","body":"Kage protocol boundary validators must treat validated output as a privacy allowlist: required schema fields must be own properties, and successful validation must project fresh plain objects containing only declared fields. Clone capability arrays and the event payload record so caller-owned prototypes and extra schema fields cannot cross into trusted serialized values; arbitrary own payload entries remain part of the explicit payload boundary.\nEvidence: Regression tests demonstrated inherited required fields and extra schema fields crossing the validator boundary before the fix; focused protocol tests and the full MCP suite pass after own-property extraction and projection.\nVerified by: npm test --prefix mcp","type":"bug_fix","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","vnext","protocol","validation","privacy","trust-boundary"],"paths":["mcp/vnext/protocol/validate.ts","mcp/vnext/protocol/protocol.test.ts"],"stack":["TypeScript","Node.js"],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-07-13T14:19:29.578Z"},{"kind":"reverification","at":"2026-07-13T14:26:06.590Z","verified_by":"npm test --prefix mcp","evidence":"Focused protocol tests and npm test --prefix mcp pass after requiring each capability array index to be an own property.","changed_paths":[{"path":"mcp/vnext/protocol/validate.ts","prior_sha256":"35204b2865d0ad2dc491f20b3e8972ec8d8dfcfd4109b96ba58e20c4fec143d4","sha256":"8c6b72d088d0b578503ca3213c5dd2c02f480e95a08857fef1d0adf70e82c7f2"},{"path":"mcp/vnext/protocol/protocol.test.ts","prior_sha256":"3c10d24d8d6dbce9cba7c1ed9f6b355358b80da8b731f3c67a42d6084b638df1","sha256":"0352abe59a563ac7c73bd802a7d0491e48731c11eedb431d0c0d27056572d004"}]}],"context":{"fact":"Kage protocol boundary validators must treat validated output as a privacy allowlist: required schema fields must be own properties, and successful validation must project fresh plain objects containing only declared fields. Clone capability arrays and the event payload record so caller-owned prototypes and extra schema fields cannot cross into trusted serialized values; arbitrary own payload entries remain part of the explicit payload boundary.\nEvidence: Regression tests demonstrated inherited required fields and extra schema fields crossing the validator boundary before the fix; focused protocol tests and the full MCP suite pass after own-property extraction and projection.\nVerified by: npm test --prefix mcp","verification":"Regression tests demonstrated inherited required fields and extra schema fields crossing the validator boundary before the fix; focused protocol tests and the full MCP suite pass after own-property extraction and projection."},"freshness":{"ttl_days":365,"last_verified_at":"2026-07-13T14:26:06.590Z","path_fingerprints":[{"path":"mcp/vnext/protocol/validate.ts","sha256":"8c6b72d088d0b578503ca3213c5dd2c02f480e95a08857fef1d0adf70e82c7f2","size":8903},{"path":"mcp/vnext/protocol/protocol.test.ts","sha256":"0352abe59a563ac7c73bd802a7d0491e48731c11eedb431d0c0d27056572d004","size":9166}],"path_fingerprint_policy":"source_hash_staleness","verification":"evidence_reverification"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"discovery_tokens":8000,"discovery_tokens_estimated":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":180,"reverified_at":"2026-07-13T14:26:06.590Z"},"created_at":"2026-07-13T14:19:29.578Z","updated_at":"2026-07-13T14:26:06.590Z","author_branch":"codex/kage-vnext-implementation"}
```
