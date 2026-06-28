---
type: "Decision"
title: "Cleanup candidates are conservative review input"
description: "Kage cleanup candidates is the memory first/local first version of dead code intelligence: it reports conservative unreferenced source file candidates from the existing code graph, with confidence and reasons, but never"
resource: "mcp/kernel.ts"
tags: ["session-learning", "cleanup", "dead-code", "code-graph"]
timestamp: "2026-06-15T21:58:25.233Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:cleanup-candidates-are-conservative-review-input-1778787533888"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "verified"
x-kage-paths: ["mcp/kernel.ts", "mcp/cli.ts", "mcp/index.ts", "mcp/kernel.test.ts", "mcp/mcp.test.ts", "README.md", "docs/guide.html"]
---

# Cleanup candidates are conservative review input

> Kage cleanup candidates is the memory first/local first version of dead code intelligence: it reports conservative un…

Kage cleanup-candidates is the memory-first/local-first version of dead-code intelligence: it reports conservative unreferenced source-file candidates from the existing code graph, with confidence and reasons, but never deletes files. It must skip entrypoint-like files and runtime string references such as structural-worker.ts loaded through structural-worker.js to avoid false positives.
Verified by: npm test --prefix mcp; node mcp/dist/cli.js cleanup-candidates --project . --json

## Verification

npm test --prefix mcp; node mcp/dist/cli.js cleanup-candidates --project . --json

# Citations

[1] explicit_capture (2026-05-14T19:38:53.888Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:cleanup-candidates-are-conservative-review-input-1778787533888","title":"Cleanup candidates are conservative review input","summary":"Kage cleanup candidates is the memory first/local first version of dead code intelligence: it reports conservative unreferenced source file candidates from the existing code graph, with confidence and reasons, but never","body":"Kage cleanup-candidates is the memory-first/local-first version of dead-code intelligence: it reports conservative unreferenced source-file candidates from the existing code graph, with confidence and reasons, but never deletes files. It must skip entrypoint-like files and runtime string references such as structural-worker.ts loaded through structural-worker.js to avoid false positives.\nVerified by: npm test --prefix mcp; node mcp/dist/cli.js cleanup-candidates --project . --json","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","cleanup","dead-code","code-graph"],"paths":["mcp/kernel.ts","mcp/cli.ts","mcp/index.ts","mcp/kernel.test.ts","mcp/mcp.test.ts","README.md","docs/guide.html"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-14T19:38:53.888Z"}],"context":{"fact":"Kage cleanup-candidates is the memory-first/local-first version of dead-code intelligence: it reports conservative unreferenced source-file candidates from the existing code graph, with confidence and reasons, but never deletes files. It must skip entrypoint-like files and runtime string references such as structural-worker.ts loaded through structural-worker.js to avoid false positives.\nVerified by: npm test --prefix mcp; node mcp/dist/cli.js cleanup-candidates --project . --json","verification":"npm test --prefix mcp; node mcp/dist/cli.js cleanup-candidates --project . --json"},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:25.233Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"runtime","kind":"constant","sha256":"0200c560bf0e1efbe2a0fde7ce5f093afd08a442acdc8d50f44dca1bfbb12e70"},{"name":"references","kind":"constant","sha256":"8e56a659477f8edc0dfadefc515e9ee2f26df3291d9c4294e8a31a9eac14c367"},{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"},{"name":"cleanup","kind":"constant","sha256":"44c2ebe266676bac0e9fb42c4a64dcbb729fc44d0bfa44910463b965b8123570"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"},{"name":"skip","kind":"constant","sha256":"84ce913f797ae6f1160ffe3c80d4f9852f31f1ce9c118d5e1a8be145e564b569"}]},{"path":"mcp/cli.ts","sha256":"a670bc601e227372c9ab3e862f4e25fa87ae4bfa90b63c3bbc61032d332da0d7","size":114201,"symbols":[{"name":"review","kind":"function","sha256":"cd5b65cd476d7eaecccc181de3bcad5b3d7c99237dcbfce313709f8eb35f9a13"},{"name":"json","kind":"constant","sha256":"9115381310c6d4c5ecb25a7e67e4fd0bb4b20a9b328adb25b606065454f79370"},{"name":"from","kind":"constant","sha256":"b386d829bcacbd9e216c726f6dff71fc7d8a53aade383fa45b850387414b780c"},{"name":"input","kind":"constant","sha256":"d1d17c5af7ab9a44dc69e4a5fac5e99a63dca89b1ee8252539b2ef74c8491ac3"}]},{"path":"mcp/index.ts","sha256":"d5abac0cb8d92d9074ae37a32ee515da8b03c43fe2d1a03d44447ee7b3493861","size":69453},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526},{"path":"mcp/mcp.test.ts","sha256":"3f5e52ad72a2a4b4db9e8de8bdad60cfb622ec132c2a278523ca6aad79538ec0","size":37910},{"path":"README.md","sha256":"9a533eee7962e84cdceef1bd8c9463233a575138fa143acafc8abd42f723944a","size":10477},{"path":"docs/guide.html","sha256":"33b57e522b1a49e48631042940e2ca7d281084371c3feb3210604e213e0e7f28","size":51769}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":122,"reverified_at":"2026-06-15T21:58:25.233Z"},"created_at":"2026-05-14T19:38:53.888Z","updated_at":"2026-06-15T21:58:25.233Z"}
```

