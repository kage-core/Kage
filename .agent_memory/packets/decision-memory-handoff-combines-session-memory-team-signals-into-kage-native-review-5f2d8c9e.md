---
type: "Decision"
title: "Memory handoff combines session-memory team signals into Kage-native review"
description: "Kage now exposes a memory handoff report that composes inbox, lifecycle, audit, timeline, and lineage into one teammate/agent action queue. It does not add a new shared runtime or KV store; it reuses repo local packets,"
resource: "mcp/kernel.ts"
tags: ["session-learning"]
timestamp: "2026-06-15T21:57:59.866Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:memory-handoff-combines-session-memory-team-signals-into-kage-native-review-1"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/cli.ts", "mcp/index.ts", "mcp/daemon.ts", "README.md", "mcp/README.md", "docs/guide.html"]
---

# Memory handoff combines session-memory team signals into Kage-native review

> Kage now exposes a memory handoff report that composes inbox, lifecycle, audit, timeline, and lineage into one teamma…

Kage now exposes a memory handoff report that composes inbox, lifecycle, audit, timeline, and lineage into one teammate/agent action queue. It does not add a new shared runtime or KV store; it reuses repo-local packets, audit JSONL, and generated reports so collaboration stays git-visible and local-first. Use kage handoff or MCP kage_memory_handoff before switching agents, handing work to a teammate, or reviewing memory changes.

# Citations

[1] explicit_capture (2026-05-17T22:20:37.727Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:memory-handoff-combines-session-memory-team-signals-into-kage-native-review-1","title":"Memory handoff combines session-memory team signals into Kage-native review","summary":"Kage now exposes a memory handoff report that composes inbox, lifecycle, audit, timeline, and lineage into one teammate/agent action queue. It does not add a new shared runtime or KV store; it reuses repo local packets,","body":"Kage now exposes a memory handoff report that composes inbox, lifecycle, audit, timeline, and lineage into one teammate/agent action queue. It does not add a new shared runtime or KV store; it reuses repo-local packets, audit JSONL, and generated reports so collaboration stays git-visible and local-first. Use kage handoff or MCP kage_memory_handoff before switching agents, handing work to a teammate, or reviewing memory changes.","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning"],"paths":["mcp/kernel.ts","mcp/cli.ts","mcp/index.ts","mcp/daemon.ts","README.md","mcp/README.md","docs/guide.html"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-17T22:20:37.727Z"}],"context":{"fact":"Kage now exposes a memory handoff report that composes inbox, lifecycle, audit, timeline, and lineage into one teammate/agent action queue. It does not add a new shared runtime or KV store; it reuses repo-local packets, audit JSONL, and generated reports so collaboration stays git-visible and local-first. Use kage handoff or MCP kage_memory_handoff before switching agents, handing work to a teammate, or reviewing memory changes."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:57:59.866Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"inbox","kind":"constant","sha256":"9d2097586a2527bfa63d55306c098fda29e1c3530771833e9aca5f986632d367"},{"name":"lifecycle","kind":"constant","sha256":"4c9035caf232fe3c21c75eb26521182ed429c6816d1c52ca6290dee9b611a22c"},{"name":"timeline","kind":"constant","sha256":"f5715eff3d98cf9f3772e6b7738b8c131d36281f0b0a72b13859f4780c014557"},{"name":"lineage","kind":"constant","sha256":"d95fb2fcf60b740e0ead538d68698eb4a371f46b66a22e0d241a07ef5c085b6b"},{"name":"shared","kind":"constant","sha256":"460b2356d24cb4febb5770d5aad45c46f57c2ae76ff809b94ab2d711ad8ab082"},{"name":"runtime","kind":"constant","sha256":"0200c560bf0e1efbe2a0fde7ce5f093afd08a442acdc8d50f44dca1bfbb12e70"},{"name":"handoff","kind":"constant","sha256":"7ca82bf8dfe8bd9cc41cf7de6d3a0421c3753588836a81fddf5ba5e62ae2781f"},{"name":"before","kind":"constant","sha256":"70c005bc3586ccb93799dfa1989dccca69b847916fd3fde1583578730922c50c"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"}]},{"path":"mcp/cli.ts","sha256":"a670bc601e227372c9ab3e862f4e25fa87ae4bfa90b63c3bbc61032d332da0d7","size":114201,"symbols":[{"name":"review","kind":"function","sha256":"cd5b65cd476d7eaecccc181de3bcad5b3d7c99237dcbfce313709f8eb35f9a13"},{"name":"report","kind":"constant","sha256":"8d05d375165d2273c6ec769d9538b412b0d08e00b21207889ab726b110c4ab04"},{"name":"agent","kind":"constant","sha256":"5b9caa614311fe691d6af171b9a8985b0d49464b9df178ad28ff5b9883eb4cf2"}]},{"path":"mcp/index.ts","sha256":"d5abac0cb8d92d9074ae37a32ee515da8b03c43fe2d1a03d44447ee7b3493861","size":69453},{"path":"mcp/daemon.ts","sha256":"4d558ba09071b09ab3d1a62d40af04edf17609c9ea98a571405883424cc1bf2f","size":38423,"symbols":[{"name":"reports","kind":"constant","sha256":"519ba3efc1950f2775b99f1d94f37e91b5caf269d027aedf80130fb06e9737ce"},{"name":"inbox","kind":"constant","sha256":"8adffb0308864b6c3c291147dfcf76a44c57cfb1428f5a14a3c264135c698704"}]},{"path":"README.md","sha256":"9a533eee7962e84cdceef1bd8c9463233a575138fa143acafc8abd42f723944a","size":10477},{"path":"mcp/README.md","sha256":"5c852f608754e299c2cff74495862f1ce4775d0bda5776d7ce4f070f4e4a6494","size":10129},{"path":"docs/guide.html","sha256":"33b57e522b1a49e48631042940e2ca7d281084371c3feb3210604e213e0e7f28","size":51769}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":108,"reverified_at":"2026-06-15T21:57:59.866Z","total_uses":0},"created_at":"2026-05-17T22:20:37.727Z","updated_at":"2026-07-03T16:16:26.708Z"}
```

