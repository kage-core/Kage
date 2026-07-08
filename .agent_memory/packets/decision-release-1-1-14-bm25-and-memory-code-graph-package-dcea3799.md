---
type: "Decision"
title: "Release 1.1.14 BM25 and memory-code graph package"
description: "Release 1.1.14 publishes the BM25 recall and memory code graph trust pass. It includes vectorless BM25 lexical ranking with intent boosts, graph registry/audit/inbox/code index surfaces, viewer coalescing for memory grap"
resource: "mcp/package.json"
tags: ["session-learning", "release", "npm", "bm25", "viewer", "graph-registry"]
timestamp: "2026-06-15T21:58:29.738Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:release-1-1-14-bm25-and-memory-code-graph-package-1778047283391"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/package.json", "mcp/package-lock.json", "mcp/README.md", "CHANGELOG.md", "mcp/kernel.ts"]
---

# Release 1.1.14 BM25 and memory-code graph package

> Release 1.1.14 publishes the BM25 recall and memory code graph trust pass. It includes vectorless BM25 lexical rankin…

Release 1.1.14 publishes the BM25 recall and memory-code graph trust pass. It includes vectorless BM25 lexical ranking with intent boosts, graph registry/audit/inbox/code-index surfaces, viewer coalescing for memory graph code entities and source-derived code graph nodes, and updated README/website proof text. Why: npm needed to match the pushed repo state after the retrieval and viewer work. Verified by: npm test --prefix mcp; npm --cache /private/tmp/kage-npm-cache pack --dry-run; npm --cache /private/tmp/kage-npm-cache publish --access public; npm view @kage-core/kage-graph-mcp version; temp install smoke test for @kage-core/kage-graph-mcp@1.1.14.
Evidence: Published @kage-core/kage-graph-mcp@1.1.14 to npm with latest tag and GPL-3.0-only metadata.
Verified by: npm test --prefix mcp; npm pack dry-run; npm publish; npm view; temp install smoke

## Why

npm needed to match the pushed repo state after the retrieval and viewer work.

## Verification

npm test --prefix mcp; npm --cache /private/tmp/kage-npm-cache pack --dry-run; npm --cache /private/tmp/kage-npm-cache publish --access public; npm view @kage-core/kage-graph-mcp version; temp install smoke test for @kage-core/kage-graph-mcp@1.1.14.

# Citations

[1] explicit_capture (2026-05-06T06:01:23.391Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:release-1-1-14-bm25-and-memory-code-graph-package-1778047283391","title":"Release 1.1.14 BM25 and memory-code graph package","summary":"Release 1.1.14 publishes the BM25 recall and memory code graph trust pass. It includes vectorless BM25 lexical ranking with intent boosts, graph registry/audit/inbox/code index surfaces, viewer coalescing for memory grap","body":"Release 1.1.14 publishes the BM25 recall and memory-code graph trust pass. It includes vectorless BM25 lexical ranking with intent boosts, graph registry/audit/inbox/code-index surfaces, viewer coalescing for memory graph code entities and source-derived code graph nodes, and updated README/website proof text. Why: npm needed to match the pushed repo state after the retrieval and viewer work. Verified by: npm test --prefix mcp; npm --cache /private/tmp/kage-npm-cache pack --dry-run; npm --cache /private/tmp/kage-npm-cache publish --access public; npm view @kage-core/kage-graph-mcp version; temp install smoke test for @kage-core/kage-graph-mcp@1.1.14.\nEvidence: Published @kage-core/kage-graph-mcp@1.1.14 to npm with latest tag and GPL-3.0-only metadata.\nVerified by: npm test --prefix mcp; npm pack dry-run; npm publish; npm view; temp install smoke","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","release","npm","bm25","viewer","graph-registry"],"paths":["mcp/package.json","mcp/package-lock.json","mcp/README.md","CHANGELOG.md","mcp/kernel.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-06T06:01:23.391Z"}],"context":{"fact":"Release 1.1.14 publishes the BM25 recall and memory-code graph trust pass. It includes vectorless BM25 lexical ranking with intent boosts, graph registry/audit/inbox/code-index surfaces, viewer coalescing for memory graph code entities and source-derived code graph nodes, and updated README/website proof text. Why: npm needed to match the pushed repo state after the retrieval and viewer work. Verified by: npm test --prefix mcp; npm --cache /private/tmp/kage-npm-cache pack --dry-run; npm --cache /private/tmp/kage-npm-cache publish --access public; npm view @kage-core/kage-graph-mcp version; temp install smoke test for @kage-core/kage-graph-mcp@1.1.14.\nEvidence: Published @kage-core/kage-graph-mcp@1.1.14 to npm with latest tag and GPL-3.0-only metadata.\nVerified by: npm test --prefix mcp; npm pack dry-run; npm publish; npm view; temp install smoke","why":"npm needed to match the pushed repo state after the retrieval and viewer work.","verification":"npm test --prefix mcp; npm --cache /private/tmp/kage-npm-cache pack --dry-run; npm --cache /private/tmp/kage-npm-cache publish --access public; npm view @kage-core/kage-graph-mcp version; temp install smoke test for @kage-core/kage-graph-mcp@1.1.14."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:29.738Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/package.json","sha256":"e77b80c8e3ef4eb7ccdf9f7dc775b51f18f1a7994092b538f81df874e8c91c5a","size":1193},{"path":"mcp/package-lock.json","sha256":"5cc3c1aa35fce1dc164444bb08d352f15590aa7fccfddbd7df1b6b7aaac67221","size":42685},{"path":"mcp/README.md","sha256":"5c852f608754e299c2cff74495862f1ce4775d0bda5776d7ce4f070f4e4a6494","size":10129},{"path":"CHANGELOG.md","sha256":"1d00aff932a74d380dad6e0d60ae0aed37e40aa5a03ae7ec0acb71f824d0ef0c","size":46022},{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"inbox","kind":"constant","sha256":"9d2097586a2527bfa63d55306c098fda29e1c3530771833e9aca5f986632d367"},{"name":"readme","kind":"constant","sha256":"aa0f002dd3f57a6ca1e42c5aba625151268ed600bbbd7582f93a0a0bc7714404"},{"name":"intent","kind":"constant","sha256":"3b69f45a6c78caa2dfa90d9f4c3b0b9b9ea67559d4df1b6f199ed8d7bb47cde9"},{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"},{"name":"after","kind":"constant","sha256":"220a1c1969c37d53268e215419dcea650ffa901162d0a25e451bd90831fb0a1b"},{"name":"trust","kind":"constant","sha256":"c4f3cf768a9a0a966c067fd73a1469f96703dc6373eb12e5440b885221736875"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"},{"name":"state","kind":"constant","sha256":"065fd1c87ce12edcfec7baca76dc9d91e35f5ea16490d33c8f85f3bdc3fee185"}]}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":5,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":215,"reverified_at":"2026-06-15T21:58:29.738Z","total_uses":5,"last_accessed_at":"2026-07-06T19:36:01.810Z"},"created_at":"2026-05-06T06:01:23.391Z","updated_at":"2026-07-03T16:16:26.714Z"}
```

