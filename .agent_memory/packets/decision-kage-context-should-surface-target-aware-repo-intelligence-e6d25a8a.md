---
type: "Decision"
title: "kage_context should surface target-aware repo intelligence"
description: "Risk and dependency path workflows should not require agents to remember extra calls. When kage context receives explicit targets, changed files, or path like file mentions in the query, it should include Kage risk signa"
resource: "mcp/index.ts"
tags: ["session-learning", "kage-context", "risk", "dependency-path", "mcp"]
timestamp: "2026-06-15T21:58:10.290Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:kage-context-should-surface-target-aware-repo-intelligence-1778787003394"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "verified"
x-kage-paths: ["mcp/index.ts", "mcp/mcp.test.ts", "README.md", "mcp/README.md", "docs/guide.html"]
---

# kage_context should surface target-aware repo intelligence

> Risk and dependency path workflows should not require agents to remember extra calls. When kage context receives expl…

Risk and dependency-path workflows should not require agents to remember extra calls. When kage_context receives explicit targets, changed files, or path-like file mentions in the query, it should include Kage risk signals and dependency path summaries in the same context block. This keeps Kage ambient while borrowing repo-dashboard-style task workflows.
Verified by: npm test --prefix mcp

## Verification

npm test --prefix mcp

# Citations

[1] explicit_capture (2026-05-14T19:30:03.394Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:kage-context-should-surface-target-aware-repo-intelligence-1778787003394","title":"kage_context should surface target-aware repo intelligence","summary":"Risk and dependency path workflows should not require agents to remember extra calls. When kage context receives explicit targets, changed files, or path like file mentions in the query, it should include Kage risk signa","body":"Risk and dependency-path workflows should not require agents to remember extra calls. When kage_context receives explicit targets, changed files, or path-like file mentions in the query, it should include Kage risk signals and dependency path summaries in the same context block. This keeps Kage ambient while borrowing repo-dashboard-style task workflows.\nVerified by: npm test --prefix mcp","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","kage-context","risk","dependency-path","mcp"],"paths":["mcp/index.ts","mcp/mcp.test.ts","README.md","mcp/README.md","docs/guide.html"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-14T19:30:03.394Z"}],"context":{"fact":"Risk and dependency-path workflows should not require agents to remember extra calls. When kage_context receives explicit targets, changed files, or path-like file mentions in the query, it should include Kage risk signals and dependency path summaries in the same context block. This keeps Kage ambient while borrowing repo-dashboard-style task workflows.\nVerified by: npm test --prefix mcp","verification":"npm test --prefix mcp"},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:10.290Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/index.ts","sha256":"d5abac0cb8d92d9074ae37a32ee515da8b03c43fe2d1a03d44447ee7b3493861","size":69453,"symbols":[{"name":"targets","kind":"constant","sha256":"ac238c1bf14291e64499aa4c46c45b651ade6dabdde67c8fe71b5bb3ff5b4ddd"}]},{"path":"mcp/mcp.test.ts","sha256":"3f5e52ad72a2a4b4db9e8de8bdad60cfb622ec132c2a278523ca6aad79538ec0","size":37910,"symbols":[{"name":"context","kind":"constant","sha256":"94e5c3947ba282a9ec60de88384111292e685f5f46509d61ddf1eadfab8915da"}]},{"path":"README.md","sha256":"9a533eee7962e84cdceef1bd8c9463233a575138fa143acafc8abd42f723944a","size":10477},{"path":"mcp/README.md","sha256":"5c852f608754e299c2cff74495862f1ce4775d0bda5776d7ce4f070f4e4a6494","size":10129},{"path":"docs/guide.html","sha256":"33b57e522b1a49e48631042940e2ca7d281084371c3feb3210604e213e0e7f28","size":51769}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":97,"reverified_at":"2026-06-15T21:58:10.290Z"},"created_at":"2026-05-14T19:30:03.394Z","updated_at":"2026-06-15T21:58:10.290Z"}
```

