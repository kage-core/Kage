---
type: "Decision"
title: "Symbol-level cleanup candidates stay conservative"
description: "Kage cleanup candidates now include review only unused export and unused internal symbol entries in addition to unreferenced files. Symbol candidates should only surface when the code graph has absence evidence: exported"
resource: "mcp/kernel.ts"
tags: ["session-learning", "cleanup", "dead-code", "code-graph"]
timestamp: "2026-06-15T21:57:53.340Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:symbol-level-cleanup-candidates-stay-conservative-1778821715274"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/kernel.test.ts", "mcp/index.ts", "README.md", "mcp/README.md", "docs/guide.html", "docs/releases.html", "CHANGELOG.md"]
---

# Symbol-level cleanup candidates stay conservative

> Kage cleanup candidates now include review only unused export and unused internal symbol entries in addition to unref…

Kage cleanup candidates now include review-only unused_export and unused_internal_symbol entries in addition to unreferenced files. Symbol candidates should only surface when the code graph has absence evidence: exported symbols are skipped unless the same file has at least one named export that is imported, imported/called/route/test-covered symbols are skipped, and internal symbols are limited to underscore-prefixed helpers. Keep cleanup as review input only; never auto-delete.
Verified by: npm test --prefix mcp; npm pack --dry-run

## Verification

exported symbols are skipped unless the same file has at least one named export that is imported, imported/called/route/test-covered symbols are skipped, and internal symbols are limited to underscore-prefixed helpers. Keep cleanup as review input only; never auto-delete.

# Citations

[1] explicit_capture (2026-05-15T05:08:35.274Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:symbol-level-cleanup-candidates-stay-conservative-1778821715274","title":"Symbol-level cleanup candidates stay conservative","summary":"Kage cleanup candidates now include review only unused export and unused internal symbol entries in addition to unreferenced files. Symbol candidates should only surface when the code graph has absence evidence: exported","body":"Kage cleanup candidates now include review-only unused_export and unused_internal_symbol entries in addition to unreferenced files. Symbol candidates should only surface when the code graph has absence evidence: exported symbols are skipped unless the same file has at least one named export that is imported, imported/called/route/test-covered symbols are skipped, and internal symbols are limited to underscore-prefixed helpers. Keep cleanup as review input only; never auto-delete.\nVerified by: npm test --prefix mcp; npm pack --dry-run","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","cleanup","dead-code","code-graph"],"paths":["mcp/kernel.ts","mcp/kernel.test.ts","mcp/index.ts","README.md","mcp/README.md","docs/guide.html","docs/releases.html","CHANGELOG.md"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-15T05:08:35.274Z"}],"context":{"fact":"Kage cleanup candidates now include review-only unused_export and unused_internal_symbol entries in addition to unreferenced files. Symbol candidates should only surface when the code graph has absence evidence: exported symbols are skipped unless the same file has at least one named export that is imported, imported/called/route/test-covered symbols are skipped, and internal symbols are limited to underscore-prefixed helpers. Keep cleanup as review input only; never auto-delete.\nVerified by: npm test --prefix mcp; npm pack --dry-run","verification":"exported symbols are skipped unless the same file has at least one named export that is imported, imported/called/route/test-covered symbols are skipped, and internal symbols are limited to underscore-prefixed helpers. Keep cleanup as review input only; never auto-delete."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:57:53.340Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"same","kind":"constant","sha256":"b150fada949a5c6d4babe0a0bc108765c6e7e1819d0ddbee55112b9c9a708447"},{"name":"named","kind":"constant","sha256":"c62eae0f2643b356f8af5f31c4a6880c381cdaaf3e19b2609b803199e60b7ead"},{"name":"imported","kind":"constant","sha256":"bc073c5e3e053f87e1399bb0cea66358b2c2d97fba97ee30b27fdfb1d25ad0cc"},{"name":"level","kind":"constant","sha256":"832bbcc09db2b0a822fe5b0f77875aea29528b0343bffcb1c71cf2fe73b9aa5e"},{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"},{"name":"cleanup","kind":"constant","sha256":"44c2ebe266676bac0e9fb42c4a64dcbb729fc44d0bfa44910463b965b8123570"},{"name":"auto","kind":"constant","sha256":"00dfd4334aa51ffac12b575a6a2c33040556f4641b8e8806bee9af6d653df46c"},{"name":"when","kind":"constant","sha256":"48bfd58b3cdbf2d407e4443b90727d548d96eceaa4372c099dcd22c52f498452"},{"name":"keep","kind":"constant","sha256":"3e5df93c6de57dbae093461e4198d2bc24bb055a50d3f6a8bd6449397fd00f3b"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"unused","kind":"constant","sha256":"0221d4eedd1cd760e690872435b895b4e16d8503adc2b03128201d577ffbd58c"},{"name":"skipped","kind":"constant","sha256":"03e81aaef0840624f59a6c0f9369a459eef887581fec1127f145218cfb90d215"},{"name":"entries","kind":"constant","sha256":"d15e7ac38b5c2f8f7204a87c6cf3e0f4ae7df188483aed889568d19113f30c4b"}]},{"path":"mcp/index.ts","sha256":"d5abac0cb8d92d9074ae37a32ee515da8b03c43fe2d1a03d44447ee7b3493861","size":69453},{"path":"README.md","sha256":"9a533eee7962e84cdceef1bd8c9463233a575138fa143acafc8abd42f723944a","size":10477},{"path":"mcp/README.md","sha256":"5c852f608754e299c2cff74495862f1ce4775d0bda5776d7ce4f070f4e4a6494","size":10129},{"path":"docs/guide.html","sha256":"33b57e522b1a49e48631042940e2ca7d281084371c3feb3210604e213e0e7f28","size":51769},{"path":"docs/releases.html","sha256":"140753f257c74e24bb1a62c3ab5c5ff165c9cfb5ac6501645be913eab1e03a88","size":11134},{"path":"CHANGELOG.md","sha256":"1d00aff932a74d380dad6e0d60ae0aed37e40aa5a03ae7ec0acb71f824d0ef0c","size":46022}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":1,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":135,"reverified_at":"2026-06-15T21:57:53.340Z","total_uses":1,"last_accessed_at":"2026-07-01T11:56:54.954Z"},"created_at":"2026-05-15T05:08:35.274Z","updated_at":"2026-07-03T16:16:26.717Z"}
```

