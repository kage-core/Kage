---
type: "Decision"
title: "Workspace recall stays Kage-native"
description: "Kage should uses repo-intelligence useful multi repo workspace idea by discovering local sibling git repos, reporting memory coverage, detecting package dependencies, and fanning out recall across indexed repos. Keep packets"
resource: "mcp/kernel.ts"
tags: ["session-learning", "workspace", "multi-repo", "recall"]
timestamp: "2026-06-15T21:58:26.166Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:workspace-recall-stays-kage-native-1778788979119"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/cli.ts", "mcp/index.ts", "mcp/kernel.test.ts", "mcp/mcp.test.ts", "README.md", "mcp/README.md", "docs/guide.html"]
---

# Workspace recall stays Kage-native

> Kage should uses repo-intelligence useful multi repo workspace idea by discovering local sibling git repos, reporting…

Kage should uses repo-intelligence useful multi-repo workspace idea by discovering local sibling git repos, reporting memory coverage, detecting package dependencies, and fanning out recall across indexed repos. Keep packets repo-local and shareable through git; workspace recall should aggregate existing memories rather than copying them or requiring a server database.
Verified by: npm test --prefix mcp; node mcp/dist/cli.js workspace --project . --json; node mcp/dist/cli.js workspace recall 'repo-intelligence-tool workspace memory' --project . --json

## Verification

npm test --prefix mcp; node mcp/dist/cli.js workspace --project . --json; node mcp/dist/cli.js workspace recall 'repo-intelligence-tool workspace memory' --project . --json

# Citations

[1] explicit_capture (2026-05-14T20:02:59.119Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:workspace-recall-stays-kage-native-1778788979119","title":"Workspace recall stays Kage-native","summary":"Kage should uses repo-intelligence useful multi repo workspace idea by discovering local sibling git repos, reporting memory coverage, detecting package dependencies, and fanning out recall across indexed repos. Keep packets","body":"Kage should uses repo-intelligence useful multi-repo workspace idea by discovering local sibling git repos, reporting memory coverage, detecting package dependencies, and fanning out recall across indexed repos. Keep packets repo-local and shareable through git; workspace recall should aggregate existing memories rather than copying them or requiring a server database.\nVerified by: npm test --prefix mcp; node mcp/dist/cli.js workspace --project . --json; node mcp/dist/cli.js workspace recall 'repo-intelligence-tool workspace memory' --project . --json","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","workspace","multi-repo","recall"],"paths":["mcp/kernel.ts","mcp/cli.ts","mcp/index.ts","mcp/kernel.test.ts","mcp/mcp.test.ts","README.md","mcp/README.md","docs/guide.html"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-14T20:02:59.119Z"}],"context":{"fact":"Kage should uses repo-intelligence useful multi-repo workspace idea by discovering local sibling git repos, reporting memory coverage, detecting package dependencies, and fanning out recall across indexed repos. Keep packets repo-local and shareable through git; workspace recall should aggregate existing memories rather than copying them or requiring a server database.\nVerified by: npm test --prefix mcp; node mcp/dist/cli.js workspace --project . --json; node mcp/dist/cli.js workspace recall 'repo-intelligence-tool workspace memory' --project . --json","verification":"npm test --prefix mcp; node mcp/dist/cli.js workspace --project . --json; node mcp/dist/cli.js workspace recall 'repo-intelligence-tool workspace memory' --project . --json"},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:26.166Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"dependencies","kind":"constant","sha256":"949002d544ca234a975724537f4931dee6504ccd95948e2f6e3cb97587a5da36"},{"name":"workspace","kind":"constant","sha256":"fc67e2dd3e7f4ea865d3e01787ca073218c159c6ee26d3ca83996fc9e32abd9e"},{"name":"server","kind":"constant","sha256":"5fd67f18035e46e58b653d1faddf541c198a3ed53d653138d4751f08353c0054"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"},{"name":"keep","kind":"constant","sha256":"3e5df93c6de57dbae093461e4198d2bc24bb055a50d3f6a8bd6449397fd00f3b"}]},{"path":"mcp/cli.ts","sha256":"a670bc601e227372c9ab3e862f4e25fa87ae4bfa90b63c3bbc61032d332da0d7","size":114201,"symbols":[{"name":"json","kind":"constant","sha256":"9115381310c6d4c5ecb25a7e67e4fd0bb4b20a9b328adb25b606065454f79370"}]},{"path":"mcp/index.ts","sha256":"d5abac0cb8d92d9074ae37a32ee515da8b03c43fe2d1a03d44447ee7b3493861","size":69453,"symbols":[{"name":"server","kind":"constant","sha256":"4c51eb77c75ec82db0638b55b2c9c6e55a03a1594fa82c31b7304f8b924f091e"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"packets","kind":"constant","sha256":"f28a69afbf5d7a988e351fc5446a3b291a2451f97b8220c4e1a7629b3a50ffa3"},{"name":"workspace","kind":"constant","sha256":"a9c07f9ec4904f44fdf36d8b1affd2e068f9ee1b6a8666b15672c523953db080"}]},{"path":"mcp/mcp.test.ts","sha256":"3f5e52ad72a2a4b4db9e8de8bdad60cfb622ec132c2a278523ca6aad79538ec0","size":37910,"symbols":[{"name":"tool","kind":"constant","sha256":"c730b2f983ea9b4965a3ae0d8eec26c8af27380cfb28c180ae2d9f2493727d7b"},{"name":"packets","kind":"constant","sha256":"8e24ebb99173a9fd5301b27e9ac55682bbb2605c03f9db6118e86695ee44a56d"},{"name":"workspace","kind":"constant","sha256":"033361cced4154835630cdaffbc5f7df66c4a8e2464fca7f55e3094aecd0e094"}]},{"path":"README.md","sha256":"9a533eee7962e84cdceef1bd8c9463233a575138fa143acafc8abd42f723944a","size":10477},{"path":"mcp/README.md","sha256":"5c852f608754e299c2cff74495862f1ce4775d0bda5776d7ce4f070f4e4a6494","size":10129},{"path":"docs/guide.html","sha256":"33b57e522b1a49e48631042940e2ca7d281084371c3feb3210604e213e0e7f28","size":51769}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":1,"votes_down":0,"uses_30d":20,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":135,"reverified_at":"2026-06-15T21:58:26.166Z","total_uses":26,"last_accessed_at":"2026-07-09T22:32:06.390Z"},"created_at":"2026-05-14T20:02:59.119Z","updated_at":"2026-07-03T16:16:26.720Z"}
```

