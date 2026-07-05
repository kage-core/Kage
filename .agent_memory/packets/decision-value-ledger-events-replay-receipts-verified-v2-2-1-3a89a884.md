---
type: "Decision"
title: "Value ledger: events + replay receipts (verified v2.2.1)"
description: "Ledger at .agent memory/reports/value.json: recall served with replay tokens , stale withheld, caller answered, stale caught; valueSummary feeds kage gains and the viewer Gains tab $ at ~15/1M . Receipts report max read"
resource: "mcp/kernel.ts"
tags: ["session-learning"]
timestamp: "2026-06-15T21:58:10.661Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:value-ledger-events-replay-receipts-verified-v2-2-1-1781268533614"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts"]
---

# Value ledger: events + replay receipts (verified v2.2.1)

> Ledger at .agent memory/reports/value.json: recall served with replay tokens , stale withheld, caller answered, stale…

Ledger at .agent_memory/reports/value.json: recall_served (with replay_tokens), stale_withheld, caller_answered, stale_caught; valueSummary feeds kage gains and the viewer Gains tab ($ at ~15/1M). Receipts report max(read-vs-source, replay). Non-empty kage file-context injections record events. Unchanged by 2.2.1.

# Citations

[1] explicit_capture (2026-06-12T12:48:53.614Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:value-ledger-events-replay-receipts-verified-v2-2-1-1781268533614","title":"Value ledger: events + replay receipts (verified v2.2.1)","summary":"Ledger at .agent memory/reports/value.json: recall served with replay tokens , stale withheld, caller answered, stale caught; valueSummary feeds kage gains and the viewer Gains tab $ at ~15/1M . Receipts report max read","body":"Ledger at .agent_memory/reports/value.json: recall_served (with replay_tokens), stale_withheld, caller_answered, stale_caught; valueSummary feeds kage gains and the viewer Gains tab ($ at ~15/1M). Receipts report max(read-vs-source, replay). Non-empty kage file-context injections record events. Unchanged by 2.2.1.","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning"],"paths":["mcp/kernel.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-06-12T12:48:53.614Z"}],"context":{"fact":"Ledger at .agent_memory/reports/value.json: recall_served (with replay_tokens), stale_withheld, caller_answered, stale_caught; valueSummary feeds kage gains and the viewer Gains tab ($ at ~15/1M). Receipts report max(read-vs-source, replay). Non-empty kage file-context injections record events. Unchanged by 2.2.1."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:10.661Z","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"valuesummary","kind":"function","sha256":"a684cb827c143d82fc37eddda6f909938b26e9f289be5c506e6f05cb7d39d2f7"},{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"tokens","kind":"constant","sha256":"a8668ad3e7d13eada95708ada8f509b54a5029bdfa50d80521bb81fe0f3d5d12"},{"name":"read","kind":"constant","sha256":"ffe49534fbcdb7c556f32fa5120c3dd4c00fce60f148c94f79d0d94d71145efd"},{"name":"withheld","kind":"constant","sha256":"eb7d70a0467b39f39545af788776ad26d8bce372b5fdcf2540f1c9433c48a517"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"}]}],"path_fingerprint_policy":"source_hash_staleness","verification":"repo_local_agent_capture"},"edges":[{"relation":"supersedes","to":"repo:https-github-com-kage-core-kage:decision:value-ledger-recall-stale-withheld-caller-answered-replay-receipts-v2-2-0-178126","evidence":"Newer repo memory supersedes this packet.","created_at":"2026-06-12T12:48:53.805Z"}],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":1,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"discovery_tokens":4000,"discovery_tokens_estimated":true,"score":96,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":79,"reverified_at":"2026-06-15T21:58:10.661Z","total_uses":1,"last_accessed_at":"2026-07-05T07:59:51.583Z"},"created_at":"2026-06-12T12:48:53.614Z","updated_at":"2026-07-03T16:16:26.718Z","author_branch":"master"}
```

