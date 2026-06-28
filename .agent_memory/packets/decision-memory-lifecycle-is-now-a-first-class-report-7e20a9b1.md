---
type: "Decision"
title: "Memory lifecycle is now a first-class report"
description: "Kage now exposes kageMemoryLifecycle, CLI kage lifecycle, MCP kage memory lifecycle, local viewer reports/lifecycle.json, and dashboard/Memory page lifecycle cards. It classifies repo packets as healthy, hot, cold, stale"
resource: "mcp/kernel.ts"
tags: ["session-learning"]
timestamp: "2026-06-15T21:57:57.668Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:memory-lifecycle-is-now-a-first-class-report-1779053861487"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "verified"
x-kage-paths: ["mcp/kernel.ts", "mcp/cli.ts", "mcp/index.ts", "mcp/daemon.ts", "README.md", "mcp/README.md", "docs/guide.html"]
---

# Memory lifecycle is now a first-class report

> Kage now exposes kageMemoryLifecycle, CLI kage lifecycle, MCP kage memory lifecycle, local viewer reports/lifecycle.j…

Kage now exposes kageMemoryLifecycle, CLI kage lifecycle, MCP kage_memory_lifecycle, local viewer reports/lifecycle.json, and dashboard/Memory page lifecycle cards. It classifies repo packets as healthy, hot, cold, stale, disputed, ungrounded, pending, or generated with review actions so Kage uses session-memory lifecycle visibility without hidden auto-decay.

# Citations

[1] explicit_capture (2026-05-17T21:37:41.487Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:memory-lifecycle-is-now-a-first-class-report-1779053861487","title":"Memory lifecycle is now a first-class report","summary":"Kage now exposes kageMemoryLifecycle, CLI kage lifecycle, MCP kage memory lifecycle, local viewer reports/lifecycle.json, and dashboard/Memory page lifecycle cards. It classifies repo packets as healthy, hot, cold, stale","body":"Kage now exposes kageMemoryLifecycle, CLI kage lifecycle, MCP kage_memory_lifecycle, local viewer reports/lifecycle.json, and dashboard/Memory page lifecycle cards. It classifies repo packets as healthy, hot, cold, stale, disputed, ungrounded, pending, or generated with review actions so Kage uses session-memory lifecycle visibility without hidden auto-decay.","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning"],"paths":["mcp/kernel.ts","mcp/cli.ts","mcp/index.ts","mcp/daemon.ts","README.md","mcp/README.md","docs/guide.html"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-17T21:37:41.487Z"}],"context":{"fact":"Kage now exposes kageMemoryLifecycle, CLI kage lifecycle, MCP kage_memory_lifecycle, local viewer reports/lifecycle.json, and dashboard/Memory page lifecycle cards. It classifies repo packets as healthy, hot, cold, stale, disputed, ungrounded, pending, or generated with review actions so Kage uses session-memory lifecycle visibility without hidden auto-decay."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:57:57.668Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"kagememorylifecycle","kind":"function","sha256":"4545fcab084a116d3072c5f0e1856aae0e6a05f211892acf51ce5b21aa9f86e2"},{"name":"lifecycle","kind":"constant","sha256":"4c9035caf232fe3c21c75eb26521182ed429c6816d1c52ca6290dee9b611a22c"},{"name":"cards","kind":"constant","sha256":"0a83c4fdc80e92f8a7db34d744a08c634cf775cf956f218e2c4041d18393c514"},{"name":"auto","kind":"constant","sha256":"00dfd4334aa51ffac12b575a6a2c33040556f4641b8e8806bee9af6d653df46c"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"},{"name":"actions","kind":"constant","sha256":"e9fa77511d2aa4381951ce36c45b1035a092e6f2d981cc5d88c52c646b028c6d"}]},{"path":"mcp/cli.ts","sha256":"a670bc601e227372c9ab3e862f4e25fa87ae4bfa90b63c3bbc61032d332da0d7","size":114201,"symbols":[{"name":"review","kind":"function","sha256":"cd5b65cd476d7eaecccc181de3bcad5b3d7c99237dcbfce313709f8eb35f9a13"},{"name":"pending","kind":"constant","sha256":"a5c954f82ccd521900e167411c7765f13e7112ccae3bb034e8ad0d6c8996187a"},{"name":"report","kind":"constant","sha256":"8d05d375165d2273c6ec769d9538b412b0d08e00b21207889ab726b110c4ab04"},{"name":"json","kind":"constant","sha256":"9115381310c6d4c5ecb25a7e67e4fd0bb4b20a9b328adb25b606065454f79370"},{"name":"auto","kind":"constant","sha256":"b35a15a3c084f482674a7f570c7cdc322236fb24a812c3607b8a0e622927f531"}]},{"path":"mcp/index.ts","sha256":"d5abac0cb8d92d9074ae37a32ee515da8b03c43fe2d1a03d44447ee7b3493861","size":69453},{"path":"mcp/daemon.ts","sha256":"4d558ba09071b09ab3d1a62d40af04edf17609c9ea98a571405883424cc1bf2f","size":38423,"symbols":[{"name":"json","kind":"function","sha256":"c6cfd13a6f9203c85fedf4efd643fcb209309a376a34ce77909c444a05e9b0e5"},{"name":"reports","kind":"constant","sha256":"519ba3efc1950f2775b99f1d94f37e91b5caf269d027aedf80130fb06e9737ce"}]},{"path":"README.md","sha256":"9a533eee7962e84cdceef1bd8c9463233a575138fa143acafc8abd42f723944a","size":10477},{"path":"mcp/README.md","sha256":"5c852f608754e299c2cff74495862f1ce4775d0bda5776d7ce4f070f4e4a6494","size":10129},{"path":"docs/guide.html","sha256":"33b57e522b1a49e48631042940e2ca7d281084371c3feb3210604e213e0e7f28","size":51769}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":96,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":92,"reverified_at":"2026-06-15T21:57:57.668Z"},"created_at":"2026-05-17T21:37:41.487Z","updated_at":"2026-06-15T21:57:57.668Z"}
```

