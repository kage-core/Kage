---
type: "Decision"
title: "Optional dense embeddings stay rebuildable and opt-in"
description: "Kage now has two local retrieval layers: refresh writes the default dependency free sparse packet index at .agent memory/indexes/vector local.json, while kage embeddings build writes an optional rebuildable dense artifac"
resource: "mcp/kernel.ts"
tags: ["session-learning"]
timestamp: "2026-06-15T21:58:26.774Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:optional-dense-embeddings-stay-rebuildable-and-opt-in-1779032867364"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/cli.ts", "mcp/index.ts", "mcp/kernel.test.ts", "README.md", "benchmarks/LONGMEMEVAL.md"]
---

# Optional dense embeddings stay rebuildable and opt-in

> Kage now has two local retrieval layers: refresh writes the default dependency free sparse packet index at .agent mem…

Kage now has two local retrieval layers: refresh writes the default dependency-free sparse packet index at .agent_memory/indexes/vector-local.json, while kage embeddings build writes an optional rebuildable dense artifact at .agent_memory/indexes/embeddings-local.json for semantic recall via kage recall --embeddings. Keep dense embeddings opt-in because they may download a model and create a larger artifact; normal recall should remain local, fast, inspectable, and dependency-free.

# Citations

[1] explicit_capture (2026-05-17T15:47:47.364Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:optional-dense-embeddings-stay-rebuildable-and-opt-in-1779032867364","title":"Optional dense embeddings stay rebuildable and opt-in","summary":"Kage now has two local retrieval layers: refresh writes the default dependency free sparse packet index at .agent memory/indexes/vector local.json, while kage embeddings build writes an optional rebuildable dense artifac","body":"Kage now has two local retrieval layers: refresh writes the default dependency-free sparse packet index at .agent_memory/indexes/vector-local.json, while kage embeddings build writes an optional rebuildable dense artifact at .agent_memory/indexes/embeddings-local.json for semantic recall via kage recall --embeddings. Keep dense embeddings opt-in because they may download a model and create a larger artifact; normal recall should remain local, fast, inspectable, and dependency-free.","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning"],"paths":["mcp/kernel.ts","mcp/cli.ts","mcp/index.ts","mcp/kernel.test.ts","README.md","benchmarks/LONGMEMEVAL.md"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-17T15:47:47.364Z"}],"context":{"fact":"Kage now has two local retrieval layers: refresh writes the default dependency-free sparse packet index at .agent_memory/indexes/vector-local.json, while kage embeddings build writes an optional rebuildable dense artifact at .agent_memory/indexes/embeddings-local.json for semantic recall via kage recall --embeddings. Keep dense embeddings opt-in because they may download a model and create a larger artifact; normal recall should remain local, fast, inspectable, and dependency-free."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:26.774Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"layers","kind":"constant","sha256":"f67e208d2f8aee744280b58d7bbfcfd596408b109f8da241bb9284d912197643"},{"name":"dense","kind":"constant","sha256":"52ae9e9020c39db70060a071395762a29c87278f8d51f2941b68894aebc0a3b3"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"},{"name":"keep","kind":"constant","sha256":"3e5df93c6de57dbae093461e4198d2bc24bb055a50d3f6a8bd6449397fd00f3b"}]},{"path":"mcp/cli.ts","sha256":"a670bc601e227372c9ab3e862f4e25fa87ae4bfa90b63c3bbc61032d332da0d7","size":114201,"symbols":[{"name":"index","kind":"constant","sha256":"c201ee64cf24065dd2ba0bbdc7ff8399e5c1dd89783820e501d28f82019f08a8"},{"name":"json","kind":"constant","sha256":"9115381310c6d4c5ecb25a7e67e4fd0bb4b20a9b328adb25b606065454f79370"},{"name":"agent","kind":"constant","sha256":"5b9caa614311fe691d6af171b9a8985b0d49464b9df178ad28ff5b9883eb4cf2"}]},{"path":"mcp/index.ts","sha256":"d5abac0cb8d92d9074ae37a32ee515da8b03c43fe2d1a03d44447ee7b3493861","size":69453,"symbols":[{"name":"index","kind":"constant","sha256":"ad98a75521fc0edce4fed6c6cd0503a41df66728efc44c4c3904db6a6ac89d7f"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"free","kind":"constant","sha256":"a956e3f2e300279f08295126a7ed7d7a233fb5952bb1ab2784624dbfbccea581"}]},{"path":"README.md","sha256":"9a533eee7962e84cdceef1bd8c9463233a575138fa143acafc8abd42f723944a","size":10477},{"path":"benchmarks/LONGMEMEVAL.md","sha256":"5df10a3e759e49d4a1f48d158d4178ac75fcada36ec0efa45012a679359a3e40","size":5319}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":122,"reverified_at":"2026-06-15T21:58:26.774Z","total_uses":0},"created_at":"2026-05-17T15:47:47.364Z","updated_at":"2026-07-03T16:16:26.710Z"}
```

