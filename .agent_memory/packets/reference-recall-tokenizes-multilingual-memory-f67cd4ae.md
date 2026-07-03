---
type: "Reference"
title: "Recall tokenizes multilingual memory"
description: "Kage recall now uses Unicode aware lexical tokenization and CJK bigrams so repo memory written in Chinese, Japanese, Korean, accented Latin, or mixed code/prose remains searchable even when terms are not space separated."
resource: "mcp/kernel.ts"
tags: ["session-learning", "retrieval"]
timestamp: "2026-06-15T21:58:20.722Z"
x-kage-id: "repo:https-github-com-kage-core-kage:reference:recall-tokenizes-multilingual-memory-1779046695263"
x-kage-type: "reference"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts"]
---

# Recall tokenizes multilingual memory

> Kage recall now uses Unicode aware lexical tokenization and CJK bigrams so repo memory written in Chinese, Japanese, …

Kage recall now uses Unicode-aware lexical tokenization and CJK bigrams so repo memory written in Chinese, Japanese, Korean, accented Latin, or mixed code/prose remains searchable even when terms are not space-separated. This was uses from studying Unicode/CJK BM25 retrieval requirements, but implemented locally without adding dependencies.
Evidence: Implemented in mcp/kernel.ts; documented in README.md, mcp/README.md, and benchmarks/README.md.
Verified by: npm test --prefix mcp

## Verification

Implemented in mcp/kernel.ts; documented in README.md, mcp/README.md, and benchmarks/README.md.

# Citations

[1] explicit_capture (2026-05-17T19:38:15.263Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:reference:recall-tokenizes-multilingual-memory-1779046695263","title":"Recall tokenizes multilingual memory","summary":"Kage recall now uses Unicode aware lexical tokenization and CJK bigrams so repo memory written in Chinese, Japanese, Korean, accented Latin, or mixed code/prose remains searchable even when terms are not space separated.","body":"Kage recall now uses Unicode-aware lexical tokenization and CJK bigrams so repo memory written in Chinese, Japanese, Korean, accented Latin, or mixed code/prose remains searchable even when terms are not space-separated. This was uses from studying Unicode/CJK BM25 retrieval requirements, but implemented locally without adding dependencies.\nEvidence: Implemented in mcp/kernel.ts; documented in README.md, mcp/README.md, and benchmarks/README.md.\nVerified by: npm test --prefix mcp","type":"reference","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","retrieval"],"paths":["mcp/kernel.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-17T19:38:15.263Z"}],"context":{"fact":"Kage recall now uses Unicode-aware lexical tokenization and CJK bigrams so repo memory written in Chinese, Japanese, Korean, accented Latin, or mixed code/prose remains searchable even when terms are not space-separated. This was uses from studying Unicode/CJK BM25 retrieval requirements, but implemented locally without adding dependencies.\nEvidence: Implemented in mcp/kernel.ts; documented in README.md, mcp/README.md, and benchmarks/README.md.\nVerified by: npm test --prefix mcp","verification":"Implemented in mcp/kernel.ts; documented in README.md, mcp/README.md, and benchmarks/README.md."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:20.722Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"readme","kind":"constant","sha256":"aa0f002dd3f57a6ca1e42c5aba625151268ed600bbbd7582f93a0a0bc7714404"},{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"},{"name":"dependencies","kind":"constant","sha256":"949002d544ca234a975724537f4931dee6504ccd95948e2f6e3cb97587a5da36"},{"name":"prose","kind":"constant","sha256":"570d1549dc852a511096fb2055e7e1f1a834049430cf322b73d634413c8ff9b8"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"},{"name":"when","kind":"constant","sha256":"48bfd58b3cdbf2d407e4443b90727d548d96eceaa4372c099dcd22c52f498452"}]}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":90,"reasons":["has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":124,"reverified_at":"2026-06-15T21:58:20.722Z","total_uses":0},"created_at":"2026-05-17T19:38:15.263Z","updated_at":"2026-07-03T16:16:26.727Z"}
```

