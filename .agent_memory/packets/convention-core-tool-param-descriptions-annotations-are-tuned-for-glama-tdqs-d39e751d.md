---
type: "Convention"
title: "Core tool param descriptions + annotations are tuned for Glama TDQS"
description: "The 11 CORE TOOLS in mcp/index.ts deliberately carry a full 'description' on every inputSchema parameter and an MCP 'annotations' block title + readOnlyHint, plus destructiveHint/idempotentHint for writers like kage supe"
resource: "mcp/index.ts"
tags: ["session-learning"]
timestamp: "2026-07-10T07:33:51.370Z"
x-kage-id: "repo:https-github-com-kage-core-kage:convention:core-tool-param-descriptions-annotations-are-tuned-for-glama-tdqs-1781851892395"
x-kage-type: "convention"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "verified"
x-kage-paths: ["mcp/index.ts"]
---

# Core tool param descriptions + annotations are tuned for Glama TDQS

> The 11 CORE TOOLS in mcp/index.ts deliberately carry a full 'description' on every inputSchema parameter and an MCP '…

The 11 CORE_TOOLS in mcp/index.ts deliberately carry a full 'description' on every inputSchema parameter and an MCP 'annotations' block (title + readOnlyHint, plus destructiveHint/idempotentHint for writers like kage_supersede/kage_refresh/kage_skills/kage_learn/kage_feedback). This is not incidental: Glama's Tool Definition Quality score penalized the Parameters dimension (1/5 at 0% schema description coverage) and Behavior (no annotations). Do not strip param descriptions or annotations when editing these tool defs; they raise TDQS toward A. The score only reflects the PUBLISHED npm version, so changes need a republish to count.
Verified by: Glama Tool Definition Quality eval + listTools() runtime check (11 tools, 0 params missing descriptions)

## Verification

Glama Tool Definition Quality eval + listTools() runtime check (11 tools, 0 params missing descriptions)

# Citations

[1] explicit_capture (2026-06-19T06:51:32.395Z)
[2] reverification

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:convention:core-tool-param-descriptions-annotations-are-tuned-for-glama-tdqs-1781851892395","title":"Core tool param descriptions + annotations are tuned for Glama TDQS","summary":"The 11 CORE TOOLS in mcp/index.ts deliberately carry a full 'description' on every inputSchema parameter and an MCP 'annotations' block title + readOnlyHint, plus destructiveHint/idempotentHint for writers like kage supe","body":"The 11 CORE_TOOLS in mcp/index.ts deliberately carry a full 'description' on every inputSchema parameter and an MCP 'annotations' block (title + readOnlyHint, plus destructiveHint/idempotentHint for writers like kage_supersede/kage_refresh/kage_skills/kage_learn/kage_feedback). This is not incidental: Glama's Tool Definition Quality score penalized the Parameters dimension (1/5 at 0% schema description coverage) and Behavior (no annotations). Do not strip param descriptions or annotations when editing these tool defs; they raise TDQS toward A. The score only reflects the PUBLISHED npm version, so changes need a republish to count.\nVerified by: Glama Tool Definition Quality eval + listTools() runtime check (11 tools, 0 params missing descriptions)","type":"convention","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning"],"paths":["mcp/index.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-06-19T06:51:32.395Z"},{"kind":"reverification","at":"2026-07-10T07:33:51.370Z","verified_by":"npm test: 405/405 + 12/12 pass","evidence":"index.ts changed only by adding one new tool (kage_reverify, with its own new description/annotations) and removing dead local helper functions now duplicated in kernel.ts. No existing tool's description or annotations were edited — confirmed by diff.","changed_paths":[{"path":"mcp/index.ts","prior_sha256":"468fd426b18d5add82329e76be15a7f048ace72d377728605c0aa376b8842af2","sha256":"1abb83f7b03e5a329ce7c99327ae523a49b1229e01bc14c79719ab4b00df6abb"}]}],"context":{"fact":"The 11 CORE_TOOLS in mcp/index.ts deliberately carry a full 'description' on every inputSchema parameter and an MCP 'annotations' block (title + readOnlyHint, plus destructiveHint/idempotentHint for writers like kage_supersede/kage_refresh/kage_skills/kage_learn/kage_feedback). This is not incidental: Glama's Tool Definition Quality score penalized the Parameters dimension (1/5 at 0% schema description coverage) and Behavior (no annotations). Do not strip param descriptions or annotations when editing these tool defs; they raise TDQS toward A. The score only reflects the PUBLISHED npm version, so changes need a republish to count.\nVerified by: Glama Tool Definition Quality eval + listTools() runtime check (11 tools, 0 params missing descriptions)","verification":"Glama Tool Definition Quality eval + listTools() runtime check (11 tools, 0 params missing descriptions)"},"freshness":{"ttl_days":365,"last_verified_at":"2026-07-10T07:33:51.370Z","path_fingerprints":[{"path":"mcp/index.ts","sha256":"1abb83f7b03e5a329ce7c99327ae523a49b1229e01bc14c79719ab4b00df6abb","size":68188,"symbols":[{"name":"core_tools","kind":"constant","sha256":"3772d9a5dca8c47bc3d74d8396f44a47f27acd0cf09365d76b6af7fabf935b2d"},{"name":"listtools","kind":"function","sha256":"6e87e738f23de33c93b11586eda39d040aadeb5b227a37e9ff59ecf40e42da64"}]}],"path_fingerprint_policy":"source_hash_staleness","verification":"evidence_reverification"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"discovery_tokens":2000,"discovery_tokens_estimated":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":189,"reverified_at":"2026-07-10T07:33:51.370Z","total_uses":0,"last_accessed_at":"2026-07-05T08:09:44.000Z"},"created_at":"2026-06-19T06:51:32.395Z","updated_at":"2026-07-10T07:33:51.370Z","author_branch":"master"}
```

