---
type: "Decision"
title: "Memory access recommends review actions"
description: "Kage memory access now converts local recall telemetry into actionable review recommendations. Hot, reviewable packets become keep verified actions; cold packets become review cold actions; ungrounded cold packets become"
resource: "mcp/kernel.ts"
tags: ["session-learning"]
timestamp: "2026-06-15T21:58:30.300Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:memory-access-recommends-review-actions-1779052638402"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/cli.ts", "mcp/kernel.test.ts"]
---

# Memory access recommends review actions

> Kage memory access now converts local recall telemetry into actionable review recommendations. Hot, reviewable packet…

Kage memory access now converts local recall telemetry into actionable review recommendations. Hot, reviewable packets become keep-verified actions; cold packets become review-cold actions; ungrounded cold packets become add-code-grounding actions. Generated diff change-memory is excluded from recommendations but remains in raw access totals. The viewer Memory page renders these actions in a Review actions section.

# Citations

[1] explicit_capture (2026-05-17T21:17:18.401Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:memory-access-recommends-review-actions-1779052638402","title":"Memory access recommends review actions","summary":"Kage memory access now converts local recall telemetry into actionable review recommendations. Hot, reviewable packets become keep verified actions; cold packets become review cold actions; ungrounded cold packets become","body":"Kage memory access now converts local recall telemetry into actionable review recommendations. Hot, reviewable packets become keep-verified actions; cold packets become review-cold actions; ungrounded cold packets become add-code-grounding actions. Generated diff change-memory is excluded from recommendations but remains in raw access totals. The viewer Memory page renders these actions in a Review actions section.","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning"],"paths":["mcp/kernel.ts","mcp/cli.ts","mcp/kernel.test.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-17T21:17:18.401Z"}],"context":{"fact":"Kage memory access now converts local recall telemetry into actionable review recommendations. Hot, reviewable packets become keep-verified actions; cold packets become review-cold actions; ungrounded cold packets become add-code-grounding actions. Generated diff change-memory is excluded from recommendations but remains in raw access totals. The viewer Memory page renders these actions in a Review actions section."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:30.300Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"reviewable","kind":"constant","sha256":"7390bf680c26d9c8a7223c5694a99b61f4bbcf0e0ef69f28464df147fddebd84"},{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"},{"name":"section","kind":"constant","sha256":"94139d33e03721319bcd2ffe4b54948b3d0a4bb19839ff90b5383343a1eb4a41"},{"name":"actions","kind":"constant","sha256":"e9fa77511d2aa4381951ce36c45b1035a092e6f2d981cc5d88c52c646b028c6d"},{"name":"keep","kind":"constant","sha256":"3e5df93c6de57dbae093461e4198d2bc24bb055a50d3f6a8bd6449397fd00f3b"}]},{"path":"mcp/cli.ts","sha256":"a670bc601e227372c9ab3e862f4e25fa87ae4bfa90b63c3bbc61032d332da0d7","size":114201,"symbols":[{"name":"review","kind":"function","sha256":"cd5b65cd476d7eaecccc181de3bcad5b3d7c99237dcbfce313709f8eb35f9a13"},{"name":"from","kind":"constant","sha256":"b386d829bcacbd9e216c726f6dff71fc7d8a53aade383fa45b850387414b780c"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"packets","kind":"constant","sha256":"f28a69afbf5d7a988e351fc5446a3b291a2451f97b8220c4e1a7629b3a50ffa3"},{"name":"ungrounded","kind":"constant","sha256":"2e58022ec125182b43c2eafab83aa5e017316164a4c3b1517494b024f79401dd"},{"name":"recommendations","kind":"constant","sha256":"5e599aeffa952140e9b7c7d7185cb5d55187686488a139e56f7499a883a0ecc4"},{"name":"section","kind":"constant","sha256":"683601886d338ad3df23a0b933a82e38c6b71a1bb3953c5aa5dd9b9d88470b87"}]}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":96,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":105,"reverified_at":"2026-06-15T21:58:30.300Z","total_uses":0},"created_at":"2026-05-17T21:17:18.401Z","updated_at":"2026-07-03T16:16:26.708Z"}
```

