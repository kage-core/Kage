---
type: "Decision"
title: "Recall ranking uses BM25 and viewer coalesces memory-code nodes"
description: "Fact: Kage recall now uses BM25 as the lexical ranking stage and sorts repo recall by final hybrid score instead of raw keyword presence. The viewer also coalesces memory graph code entities with code graph nodes through"
resource: "mcp/kernel.ts"
tags: ["session-learning", "recall", "bm25", "viewer", "knowledge-graph"]
timestamp: "2026-06-15T21:57:53.965Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:recall-ranking-uses-bm25-and-viewer-coalesces-memory-code-nodes-1778039331768"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/kernel.test.ts"]
---

# Recall ranking uses BM25 and viewer coalesces memory-code nodes

> Fact: Kage recall now uses BM25 as the lexical ranking stage and sorts repo recall by final hybrid score instead of r…

Fact: Kage recall now uses BM25 as the lexical ranking stage and sorts repo recall by final hybrid score instead of raw keyword presence. The viewer also coalesces memory graph code entities with code graph nodes through aliases and marks memory-code links for filtering/highlighting. Why: raw keyword scoring and visually separate symbol nodes made the product claim stronger than the actual behavior. Trigger: When changing recall scoring, kage_context output, or viewer graph merge behavior. Action: Keep BM25 as the default vectorless lexical stage, keep graph/path/type/quality as boosts, and preserve alias-based coalescing for symbol, test, route, file, and path entities. Risk if forgotten: Future changes can reintroduce presence-only retrieval or a graph that contains memory-code edges in JSON but hides them visually.
Evidence: Implemented in mcp/kernel.ts and mcp/viewer/app.js with regression tests in mcp/kernel.test.ts.
Verified by: npm test

## Why

raw keyword scoring and visually separate symbol nodes made the product claim stronger than the actual behavior.

## Trigger

When changing recall scoring, kage_context output, or viewer graph merge behavior.

## Action

Keep BM25 as the default vectorless lexical stage, keep graph/path/type/quality as boosts, and preserve alias-based coalescing for symbol, test, route, file, and path entities.

## Verification

Implemented in mcp/kernel.ts and mcp/viewer/app.js with regression tests in mcp/kernel.test.ts.

## Risk if forgotten

Future changes can reintroduce presence-only retrieval or a graph that contains memory-code edges in JSON but hides them visually.

# Citations

[1] explicit_capture (2026-05-06T03:48:51.768Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:recall-ranking-uses-bm25-and-viewer-coalesces-memory-code-nodes-1778039331768","title":"Recall ranking uses BM25 and viewer coalesces memory-code nodes","summary":"Fact: Kage recall now uses BM25 as the lexical ranking stage and sorts repo recall by final hybrid score instead of raw keyword presence. The viewer also coalesces memory graph code entities with code graph nodes through","body":"Fact: Kage recall now uses BM25 as the lexical ranking stage and sorts repo recall by final hybrid score instead of raw keyword presence. The viewer also coalesces memory graph code entities with code graph nodes through aliases and marks memory-code links for filtering/highlighting. Why: raw keyword scoring and visually separate symbol nodes made the product claim stronger than the actual behavior. Trigger: When changing recall scoring, kage_context output, or viewer graph merge behavior. Action: Keep BM25 as the default vectorless lexical stage, keep graph/path/type/quality as boosts, and preserve alias-based coalescing for symbol, test, route, file, and path entities. Risk if forgotten: Future changes can reintroduce presence-only retrieval or a graph that contains memory-code edges in JSON but hides them visually.\nEvidence: Implemented in mcp/kernel.ts and mcp/viewer/app.js with regression tests in mcp/kernel.test.ts.\nVerified by: npm test","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","recall","bm25","viewer","knowledge-graph"],"paths":["mcp/kernel.ts","mcp/kernel.test.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-06T03:48:51.768Z"}],"context":{"fact":"Kage recall now uses BM25 as the lexical ranking stage and sorts repo recall by final hybrid score instead of raw keyword presence. The viewer also coalesces memory graph code entities with code graph nodes through aliases and marks memory-code links for filtering/highlighting.","why":"raw keyword scoring and visually separate symbol nodes made the product claim stronger than the actual behavior.","trigger":"When changing recall scoring, kage_context output, or viewer graph merge behavior.","action":"Keep BM25 as the default vectorless lexical stage, keep graph/path/type/quality as boosts, and preserve alias-based coalescing for symbol, test, route, file, and path entities.","verification":"Implemented in mcp/kernel.ts and mcp/viewer/app.js with regression tests in mcp/kernel.test.ts.","risk_if_forgotten":"Future changes can reintroduce presence-only retrieval or a graph that contains memory-code edges in JSON but hides them visually."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:57:53.965Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"fact","kind":"constant","sha256":"adb9d6a773dc4dacf5613a3e7d4225436f1a23ff67de02659a247304284b10c6"},{"name":"final","kind":"constant","sha256":"3708518ab34f3096f41253903144e997a6c64f08ba425b1d1c57562018568c7b"},{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"},{"name":"risk","kind":"constant","sha256":"d8cefa2e26411c9cf6d7857bd9ff15e58ab6ff3e5ed30b4531801e725978a06d"},{"name":"alias","kind":"constant","sha256":"4fdd240f361c472e24c014334866d2c69fd50732f140e5d456083b24abfc3571"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"},{"name":"when","kind":"constant","sha256":"48bfd58b3cdbf2d407e4443b90727d548d96eceaa4372c099dcd22c52f498452"},{"name":"keep","kind":"constant","sha256":"3e5df93c6de57dbae093461e4198d2bc24bb055a50d3f6a8bd6449397fd00f3b"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"quality","kind":"constant","sha256":"06eb60954e6f50dd593cacf74246243dccea1b5754f915a9f1a036ce481e3be7"},{"name":"edges","kind":"constant","sha256":"8c37bcd95245ff6d66b6f8b413ce98901f9c5e8bad1c2b4dc47e75e3b2815f73"}]}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":240,"reverified_at":"2026-06-15T21:57:53.965Z","total_uses":0,"last_accessed_at":"2026-07-06T19:36:01.810Z"},"created_at":"2026-05-06T03:48:51.768Z","updated_at":"2026-07-03T16:16:26.712Z"}
```

