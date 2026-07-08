---
type: "Decision"
title: "Memory audit is first-class mutation governance"
description: "Kage now writes a repo local memory audit trail for explicit memory mutations. Captures, feedback, pending approve/reject, supersede, GC deprecate, and GC delete actions append JSONL entries under .agent memory/audit/eve"
resource: "mcp/kernel.ts"
tags: ["session-learning", "external-memory-tool", "audit", "memory-governance", "collaboration"]
timestamp: "2026-06-15T21:58:27.299Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:memory-audit-is-first-class-mutation-governance-1779055805538"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/cli.ts", "mcp/index.ts", "mcp/daemon.ts"]
---

# Memory audit is first-class mutation governance

> Kage now writes a repo local memory audit trail for explicit memory mutations. Captures, feedback, pending approve/re…

Kage now writes a repo-local memory audit trail for explicit memory mutations. Captures, feedback, pending approve/reject, supersede, GC deprecate, and GC delete actions append JSONL entries under .agent_memory/audit/events.jsonl with packet ids, titles, actor, branch, head, timestamp, and details. Use kage memory-audit or the viewer Memory audit section to review what changed before handoff.

# Citations

[1] explicit_capture (2026-05-17T22:10:05.538Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:memory-audit-is-first-class-mutation-governance-1779055805538","title":"Memory audit is first-class mutation governance","summary":"Kage now writes a repo local memory audit trail for explicit memory mutations. Captures, feedback, pending approve/reject, supersede, GC deprecate, and GC delete actions append JSONL entries under .agent memory/audit/eve","body":"Kage now writes a repo-local memory audit trail for explicit memory mutations. Captures, feedback, pending approve/reject, supersede, GC deprecate, and GC delete actions append JSONL entries under .agent_memory/audit/events.jsonl with packet ids, titles, actor, branch, head, timestamp, and details. Use kage memory-audit or the viewer Memory audit section to review what changed before handoff.","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","external-memory-tool","audit","memory-governance","collaboration"],"paths":["mcp/kernel.ts","mcp/cli.ts","mcp/index.ts","mcp/daemon.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-17T22:10:05.538Z"}],"context":{"fact":"Kage now writes a repo-local memory audit trail for explicit memory mutations. Captures, feedback, pending approve/reject, supersede, GC deprecate, and GC delete actions append JSONL entries under .agent_memory/audit/events.jsonl with packet ids, titles, actor, branch, head, timestamp, and details. Use kage memory-audit or the viewer Memory audit section to review what changed before handoff."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:27.299Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"captures","kind":"constant","sha256":"950d879145f4f4e4ebd8ecf00c5108ded0ecf255269095620bc64abbdee6d4f2"},{"name":"explicit","kind":"constant","sha256":"3c7dc76a866b9617850dd05c43ef877cc5208ade5be761331cf32181ace414ff"},{"name":"feedback","kind":"constant","sha256":"ca4f6feef0c8b815fb22dd0e7de4f7c907e1bf511a374e367a1398fb5bc32c60"},{"name":"handoff","kind":"constant","sha256":"7ca82bf8dfe8bd9cc41cf7de6d3a0421c3753588836a81fddf5ba5e62ae2781f"},{"name":"before","kind":"constant","sha256":"70c005bc3586ccb93799dfa1989dccca69b847916fd3fde1583578730922c50c"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"},{"name":"section","kind":"constant","sha256":"94139d33e03721319bcd2ffe4b54948b3d0a4bb19839ff90b5383343a1eb4a41"},{"name":"actions","kind":"constant","sha256":"e9fa77511d2aa4381951ce36c45b1035a092e6f2d981cc5d88c52c646b028c6d"}]},{"path":"mcp/cli.ts","sha256":"a670bc601e227372c9ab3e862f4e25fa87ae4bfa90b63c3bbc61032d332da0d7","size":114201,"symbols":[{"name":"review","kind":"function","sha256":"cd5b65cd476d7eaecccc181de3bcad5b3d7c99237dcbfce313709f8eb35f9a13"},{"name":"pending","kind":"constant","sha256":"a5c954f82ccd521900e167411c7765f13e7112ccae3bb034e8ad0d6c8996187a"},{"name":"agent","kind":"constant","sha256":"5b9caa614311fe691d6af171b9a8985b0d49464b9df178ad28ff5b9883eb4cf2"}]},{"path":"mcp/index.ts","sha256":"d5abac0cb8d92d9074ae37a32ee515da8b03c43fe2d1a03d44447ee7b3493861","size":69453},{"path":"mcp/daemon.ts","sha256":"4d558ba09071b09ab3d1a62d40af04edf17609c9ea98a571405883424cc1bf2f","size":38423,"symbols":[{"name":"events","kind":"constant","sha256":"2b0aedca3d99c794be26575d8a62560478191aaa1d6092f7bc5756b69e0f320b"}]}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":2,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":96,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":99,"reverified_at":"2026-06-15T21:58:27.299Z","total_uses":2,"last_accessed_at":"2026-07-08T20:23:31.613Z"},"created_at":"2026-05-17T22:10:05.538Z","updated_at":"2026-07-03T16:16:26.708Z"}
```

