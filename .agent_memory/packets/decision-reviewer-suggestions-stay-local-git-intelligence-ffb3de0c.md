---
type: "Decision"
title: "Reviewer suggestions stay local git intelligence"
description: "Kage reviewers uses repo-dashboard-style reviewer suggestions using only local git history and Kage graph signals: authorship on target files, recent edits, and primary owners of co change partner files. It does not call Gi"
resource: "mcp/kernel.ts"
tags: ["session-learning", "reviewers", "git-history", "co-change"]
timestamp: "2026-06-15T21:57:54.607Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:reviewer-suggestions-stay-local-git-intelligence-1778787836192"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/cli.ts", "mcp/index.ts", "mcp/kernel.test.ts", "mcp/mcp.test.ts", "README.md", "docs/guide.html"]
---

# Reviewer suggestions stay local git intelligence

> Kage reviewers uses repo-dashboard-style reviewer suggestions using only local git history and Kage graph signals: au…

Kage reviewers uses repo-dashboard-style reviewer suggestions using only local git history and Kage graph signals: authorship on target files, recent edits, and primary owners of co-change partner files. It does not call GitHub or store external account state, keeping Kage repo-local and memory-first.
Verified by: npm test --prefix mcp; node mcp/dist/cli.js reviewers --project . --targets mcp/kernel.ts --json

## Verification

npm test --prefix mcp; node mcp/dist/cli.js reviewers --project . --targets mcp/kernel.ts --json

# Citations

[1] explicit_capture (2026-05-14T19:43:56.192Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:reviewer-suggestions-stay-local-git-intelligence-1778787836192","title":"Reviewer suggestions stay local git intelligence","summary":"Kage reviewers uses repo-dashboard-style reviewer suggestions using only local git history and Kage graph signals: authorship on target files, recent edits, and primary owners of co change partner files. It does not call Gi","body":"Kage reviewers uses repo-dashboard-style reviewer suggestions using only local git history and Kage graph signals: authorship on target files, recent edits, and primary owners of co-change partner files. It does not call GitHub or store external account state, keeping Kage repo-local and memory-first.\nVerified by: npm test --prefix mcp; node mcp/dist/cli.js reviewers --project . --targets mcp/kernel.ts --json","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","reviewers","git-history","co-change"],"paths":["mcp/kernel.ts","mcp/cli.ts","mcp/index.ts","mcp/kernel.test.ts","mcp/mcp.test.ts","README.md","docs/guide.html"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-14T19:43:56.192Z"}],"context":{"fact":"Kage reviewers uses repo-dashboard-style reviewer suggestions using only local git history and Kage graph signals: authorship on target files, recent edits, and primary owners of co-change partner files. It does not call GitHub or store external account state, keeping Kage repo-local and memory-first.\nVerified by: npm test --prefix mcp; node mcp/dist/cli.js reviewers --project . --targets mcp/kernel.ts --json","verification":"npm test --prefix mcp; node mcp/dist/cli.js reviewers --project . --targets mcp/kernel.ts --json"},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:57:54.607Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"call","kind":"constant","sha256":"0e1296678bffa8037b9dc66bffb9dbec82218bdd1cd66c11e341879266eb9454"},{"name":"suggestions","kind":"constant","sha256":"1188fc0cdafe6bbe9e0e866a2e6b88d3a8537ceec0d96e0968a797f667dc3349"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"},{"name":"state","kind":"constant","sha256":"065fd1c87ce12edcfec7baca76dc9d91e35f5ea16490d33c8f85f3bdc3fee185"}]},{"path":"mcp/cli.ts","sha256":"a670bc601e227372c9ab3e862f4e25fa87ae4bfa90b63c3bbc61032d332da0d7","size":114201,"symbols":[{"name":"json","kind":"constant","sha256":"9115381310c6d4c5ecb25a7e67e4fd0bb4b20a9b328adb25b606065454f79370"}]},{"path":"mcp/index.ts","sha256":"d5abac0cb8d92d9074ae37a32ee515da8b03c43fe2d1a03d44447ee7b3493861","size":69453,"symbols":[{"name":"targets","kind":"constant","sha256":"ac238c1bf14291e64499aa4c46c45b651ade6dabdde67c8fe71b5bb3ff5b4ddd"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"target","kind":"constant","sha256":"1f1ed63dcf69e359e228c4565eade0135efa2fee34aa87f65b69bd768972a640"},{"name":"targets","kind":"constant","sha256":"5aa65f0166a610def83e25d42b5b6c3ecab6283b3a3686a4b9766fad0fcce885"},{"name":"store","kind":"constant","sha256":"50e13a48bdc07bc7254139dc46a208986d7363f394fb167c4dfebaff353e10fe"}]},{"path":"mcp/mcp.test.ts","sha256":"3f5e52ad72a2a4b4db9e8de8bdad60cfb622ec132c2a278523ca6aad79538ec0","size":37910},{"path":"README.md","sha256":"9a533eee7962e84cdceef1bd8c9463233a575138fa143acafc8abd42f723944a","size":10477},{"path":"docs/guide.html","sha256":"33b57e522b1a49e48631042940e2ca7d281084371c3feb3210604e213e0e7f28","size":51769}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":1,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":103,"reverified_at":"2026-06-15T21:57:54.607Z","total_uses":1,"last_accessed_at":"2026-07-02T11:16:30.117Z"},"created_at":"2026-05-14T19:43:56.192Z","updated_at":"2026-07-03T16:16:26.716Z"}
```

