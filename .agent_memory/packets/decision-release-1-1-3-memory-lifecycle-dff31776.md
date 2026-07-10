---
type: "Decision"
title: "Release 1.1.3 memory lifecycle"
description: "Release 1.1.3 adds production memory lifecycle commands: kage refresh rebuilds indexes/code graph/memory graph/metrics and marks stale memory from status, feedback, TTL, or path drift; kage pr summarize writes branch cha"
resource: "mcp/kernel.ts"
tags: ["session-learning", "release", "pr-check", "staleness", "refresh", "mcp"]
timestamp: "2026-06-15T21:58:23.072Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:release-1-1-3-memory-lifecycle-1777760408919"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/cli.ts", "mcp/index.ts", "README.md", "mcp/README.md"]
---

# Release 1.1.3 memory lifecycle

> Release 1.1.3 adds production memory lifecycle commands: kage refresh rebuilds indexes/code graph/memory graph/metric…

Release 1.1.3 adds production memory lifecycle commands: kage refresh rebuilds indexes/code graph/memory graph/metrics and marks stale memory from status, feedback, TTL, or path drift; kage pr summarize writes branch change memory; kage pr check verifies graph freshness, stale packets, validation, and memory packet changes before merge; MCP exposes kage_refresh, kage_pr_summarize, and kage_pr_check; kage upgrade updates the global npm package. Verified by npm test --prefix mcp, npm pack --dry-run, CLI smoke demo, and npm publish.
Verified by: npm test --prefix mcp; npm --cache /tmp/kage-npm-cache pack --dry-run; npm publish

# Citations

[1] explicit_capture (2026-05-02T22:20:08.918Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:release-1-1-3-memory-lifecycle-1777760408919","title":"Release 1.1.3 memory lifecycle","summary":"Release 1.1.3 adds production memory lifecycle commands: kage refresh rebuilds indexes/code graph/memory graph/metrics and marks stale memory from status, feedback, TTL, or path drift; kage pr summarize writes branch cha","body":"Release 1.1.3 adds production memory lifecycle commands: kage refresh rebuilds indexes/code graph/memory graph/metrics and marks stale memory from status, feedback, TTL, or path drift; kage pr summarize writes branch change memory; kage pr check verifies graph freshness, stale packets, validation, and memory packet changes before merge; MCP exposes kage_refresh, kage_pr_summarize, and kage_pr_check; kage upgrade updates the global npm package. Verified by npm test --prefix mcp, npm pack --dry-run, CLI smoke demo, and npm publish.\nVerified by: npm test --prefix mcp; npm --cache /tmp/kage-npm-cache pack --dry-run; npm publish","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","release","pr-check","staleness","refresh","mcp"],"paths":["mcp/kernel.ts","mcp/cli.ts","mcp/index.ts","README.md","mcp/README.md"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-02T22:20:08.918Z"}],"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:23.072Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"summarize","kind":"function","sha256":"add7c65e848288e0da5633a88ce2fb32445aad7ae524b58b7f291604c733888d"},{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"lifecycle","kind":"constant","sha256":"4c9035caf232fe3c21c75eb26521182ed429c6816d1c52ca6290dee9b611a22c"},{"name":"feedback","kind":"constant","sha256":"ca4f6feef0c8b815fb22dd0e7de4f7c907e1bf511a374e367a1398fb5bc32c60"},{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"},{"name":"before","kind":"constant","sha256":"70c005bc3586ccb93799dfa1989dccca69b847916fd3fde1583578730922c50c"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"}]},{"path":"mcp/cli.ts","sha256":"a670bc601e227372c9ab3e862f4e25fa87ae4bfa90b63c3bbc61032d332da0d7","size":114201,"symbols":[{"name":"from","kind":"constant","sha256":"b386d829bcacbd9e216c726f6dff71fc7d8a53aade383fa45b850387414b780c"}]},{"path":"mcp/index.ts","sha256":"d5abac0cb8d92d9074ae37a32ee515da8b03c43fe2d1a03d44447ee7b3493861","size":69453,"symbols":[{"name":"validation","kind":"constant","sha256":"98a7747d4e4a450a2444f7de45c545d9527be0675ece8ebe7ba615af1b017a39"}]},{"path":"README.md","sha256":"9a533eee7962e84cdceef1bd8c9463233a575138fa143acafc8abd42f723944a","size":10477},{"path":"mcp/README.md","sha256":"5c852f608754e299c2cff74495862f1ce4775d0bda5776d7ce4f070f4e4a6494","size":10129}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":2,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":316,"reverified_at":"2026-06-15T21:58:23.072Z","total_uses":0,"last_accessed_at":"2026-07-09T21:44:42.980Z"},"created_at":"2026-05-02T22:20:08.918Z","updated_at":"2026-07-03T16:16:26.715Z"}
```

