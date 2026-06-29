---
type: "Decision"
title: "Public source avoids external-tool-specific skip names"
description: "Decision update: public Kage source and memory should avoid external tool specific names even in defensive skip lists. The workspace crawler now keeps only generic generated/dependency directories in its built in skip se"
resource: "mcp/kernel.ts"
tags: ["session-learning", "memory-hygiene", "public-oss", "workspace"]
timestamp: "2026-06-15T21:57:54.934Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:public-source-avoids-external-tool-specific-skip-names-1779546321185"
x-kage-type: "decision"
x-kage-status: "deprecated"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "deprecated"
x-kage-paths: ["mcp/kernel.ts", "benchmarks/README.md"]
---

# Public source avoids external-tool-specific skip names

> Decision update: public Kage source and memory should avoid external tool specific names even in defensive skip lists…

Decision update: public Kage source and memory should avoid external-tool-specific names even in defensive skip lists. The workspace crawler now keeps only generic generated/dependency directories in its built-in skip set; users can ignore extra tool output with .kageignore when needed. This keeps public source and shared repo memory focused on Kage behavior instead of naming unrelated products.
Evidence: Removed external-tool-specific workspace skip directories from WORKSPACE_SKIP_DIRS in mcp/kernel.ts; public packet/docs/source scan no longer reports product-name hits.
Verified by: npm test --prefix mcp; searched public docs, source, benchmark docs, and repo memory packets for product-name references

## Verification

Removed external-tool-specific workspace skip directories from WORKSPACE_SKIP_DIRS in mcp/kernel.ts; public packet/docs/source scan no longer reports product-name hits.

# Citations

[1] explicit_capture (2026-05-23T14:25:21.183Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:public-source-avoids-external-tool-specific-skip-names-1779546321185","title":"Public source avoids external-tool-specific skip names","summary":"Decision update: public Kage source and memory should avoid external tool specific names even in defensive skip lists. The workspace crawler now keeps only generic generated/dependency directories in its built in skip se","body":"Decision update: public Kage source and memory should avoid external-tool-specific names even in defensive skip lists. The workspace crawler now keeps only generic generated/dependency directories in its built-in skip set; users can ignore extra tool output with .kageignore when needed. This keeps public source and shared repo memory focused on Kage behavior instead of naming unrelated products.\nEvidence: Removed external-tool-specific workspace skip directories from WORKSPACE_SKIP_DIRS in mcp/kernel.ts; public packet/docs/source scan no longer reports product-name hits.\nVerified by: npm test --prefix mcp; searched public docs, source, benchmark docs, and repo memory packets for product-name references","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"deprecated","confidence":0.7,"tags":["session-learning","memory-hygiene","public-oss","workspace"],"paths":["mcp/kernel.ts","benchmarks/README.md"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-23T14:25:21.183Z"}],"context":{"fact":"Decision update: public Kage source and memory should avoid external-tool-specific names even in defensive skip lists. The workspace crawler now keeps only generic generated/dependency directories in its built-in skip set; users can ignore extra tool output with .kageignore when needed. This keeps public source and shared repo memory focused on Kage behavior instead of naming unrelated products.\nEvidence: Removed external-tool-specific workspace skip directories from WORKSPACE_SKIP_DIRS in mcp/kernel.ts; public packet/docs/source scan no longer reports product-name hits.\nVerified by: npm test --prefix mcp; searched public docs, source, benchmark docs, and repo memory packets for product-name references","verification":"Removed external-tool-specific workspace skip directories from WORKSPACE_SKIP_DIRS in mcp/kernel.ts; public packet/docs/source scan no longer reports product-name hits."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:57:54.934Z","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"extra","kind":"constant","sha256":"e60db0ecfdf0048240c715b5beb9820e4e1fc79c7c2522cbbd54f35860692687"},{"name":"ignore","kind":"function","sha256":"3eee15379e111fc3066636e779769471e2ba26f4ccf38736888f5c1eec25dd08"},{"name":"shared","kind":"constant","sha256":"460b2356d24cb4febb5770d5aad45c46f57c2ae76ff809b94ab2d711ad8ab082"},{"name":"references","kind":"constant","sha256":"8e56a659477f8edc0dfadefc515e9ee2f26df3291d9c4294e8a31a9eac14c367"},{"name":"workspace_skip_dirs","kind":"constant","sha256":"e40bba8369ffeef57b2e0e8e017fb3fecf2e1b13e4dcbbe0b519eee732ffdb77"},{"name":"workspace","kind":"constant","sha256":"fc67e2dd3e7f4ea865d3e01787ca073218c159c6ee26d3ca83996fc9e32abd9e"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"},{"name":"removed","kind":"constant","sha256":"a0797a6325a4353640d2ec426c8c94ea9d093091c3e97fdacfd8387aec73d583"},{"name":"when","kind":"constant","sha256":"48bfd58b3cdbf2d407e4443b90727d548d96eceaa4372c099dcd22c52f498452"},{"name":"skip","kind":"constant","sha256":"84ce913f797ae6f1160ffe3c80d4f9852f31f1ce9c118d5e1a8be145e564b569"}]},{"path":"benchmarks/README.md","sha256":"34ffe0979b86578a900bfb7c13e6236aa7952b5867af6090c1501a54d9a41c16","size":9904}],"path_fingerprint_policy":"source_hash_staleness","verification":"repo_local_agent_capture","superseded_at":"2026-05-31T08:46:12.218Z","superseded_by":"repo:https-github-com-kage-core-kage:decision:public-source-skip-lists-remain-generic-after-risk-path-parser-fix-1780217154439","superseded_reason":"Updated after risk path parser fix; public skip-list decision remains generic."},"edges":[{"relation":"supersedes","to":"repo:https-github-com-kage-core-kage:decision:public-repo-memory-should-avoid-competitor-shorthand-1779545107224","evidence":"Updated after removing the remaining external-tool-specific skip-list entries from source.","created_at":"2026-05-23T14:25:33.235Z"},{"relation":"superseded_by","to":"repo:https-github-com-kage-core-kage:decision:public-source-skip-lists-remain-generic-after-risk-path-parser-fix-1780217154439","evidence":"Updated after risk path parser fix; public skip-list decision remains generic.","created_at":"2026-05-31T08:46:12.218Z"}],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":178,"superseded_by":"repo:https-github-com-kage-core-kage:decision:public-source-skip-lists-remain-generic-after-risk-path-parser-fix-1780217154439","superseded_reason":"Updated after risk path parser fix; public skip-list decision remains generic.","reverified_at":"2026-06-15T21:57:54.934Z","stale":true,"stale_reasons":["packet status is superseded"],"suggested_action":"mark_stale"},"created_at":"2026-05-23T14:25:21.183Z","updated_at":"2026-06-29T08:26:42.581Z"}
```

