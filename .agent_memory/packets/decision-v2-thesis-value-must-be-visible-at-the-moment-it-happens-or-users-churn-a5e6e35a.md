---
type: "Decision"
title: "V2 thesis: value must be visible at the moment it happens, or users churn"
description: "Kage v1 failed adoption because its value was invisible by design: recall/stale withholding fired silently inside the agent loop. V2 made every benefit visible at its moment: kage scan shocks in 60s on any repo knowledge"
resource: "mcp/kernel.ts"
tags: ["session-learning", "product-thesis", "visibility", "v2", "gains", "scan"]
timestamp: "2026-06-15T21:57:56.756Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:v2-thesis-value-must-be-visible-at-the-moment-it-happens-or-users-churn-17811931"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/cli.ts", "README.md"]
---

# V2 thesis: value must be visible at the moment it happens, or users churn

> Kage v1 failed adoption because its value was invisible by design: recall/stale withholding fired silently inside the…

Kage v1 failed adoption because its value was invisible by design: recall/stale-withholding fired silently inside the agent loop. V2 made every benefit visible at its moment: kage scan shocks in 60s on any repo (knowledge voids, doc lies with file:line proof), every recall prints a token receipt, kage gains totals savings in dollars, staleguard fires at change-time naming invalidated memories, and the viewer lands on the savings receipt. The validated bar for any future feature: it must show its face value from the get-go — one-sentence shock, 2-minute demo, measured numbers, platform-proof. Benchmark discipline that earned 2.0.0: N=3 runs, identical answers to grep, 18% faster, ghost call-edges 524→0.
Verified by: Eleven merged PRs (#56–#66), 199/199 tests, npm 2.0.0 live with smoke test, live gains ledger showing 845K tokens saved

# Citations

[1] explicit_capture (2026-06-11T15:51:54.746Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:v2-thesis-value-must-be-visible-at-the-moment-it-happens-or-users-churn-17811931","title":"V2 thesis: value must be visible at the moment it happens, or users churn","summary":"Kage v1 failed adoption because its value was invisible by design: recall/stale withholding fired silently inside the agent loop. V2 made every benefit visible at its moment: kage scan shocks in 60s on any repo knowledge","body":"Kage v1 failed adoption because its value was invisible by design: recall/stale-withholding fired silently inside the agent loop. V2 made every benefit visible at its moment: kage scan shocks in 60s on any repo (knowledge voids, doc lies with file:line proof), every recall prints a token receipt, kage gains totals savings in dollars, staleguard fires at change-time naming invalidated memories, and the viewer lands on the savings receipt. The validated bar for any future feature: it must show its face value from the get-go — one-sentence shock, 2-minute demo, measured numbers, platform-proof. Benchmark discipline that earned 2.0.0: N=3 runs, identical answers to grep, 18% faster, ghost call-edges 524→0.\nVerified by: Eleven merged PRs (#56–#66), 199/199 tests, npm 2.0.0 live with smoke test, live gains ledger showing 845K tokens saved","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","product-thesis","visibility","v2","gains","scan"],"paths":["mcp/kernel.ts","mcp/cli.ts","README.md"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-06-11T15:51:54.746Z"}],"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:57:56.756Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"time","kind":"constant","sha256":"36aa0a901e7fda47d7d7571d9c21879432386e4418ed56010d7e03c9a91f5482"},{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"call","kind":"constant","sha256":"0e1296678bffa8037b9dc66bffb9dbec82218bdd1cd66c11e341879266eb9454"},{"name":"tokens","kind":"constant","sha256":"a8668ad3e7d13eada95708ada8f509b54a5029bdfa50d80521bb81fe0f3d5d12"},{"name":"token","kind":"constant","sha256":"9289e531e150dbf4533b30373feed670db17040de86f0a87bae921c5fb3ce702"},{"name":"sentence","kind":"constant","sha256":"9ed6a8145bb0e024fa4a669a3518e5d453f6678c80c5f6a973e4b754163a93df"},{"name":"invalidated","kind":"constant","sha256":"091c9ec9a6da9da0aec9dbc1bcd2758e540de06cf60ce2ae280324b46b55c1dd"},{"name":"show","kind":"constant","sha256":"a1286db8e7ca4067e360ba4fb6da776faab1a9b50a1ce06dd8efb185376816f6"}]},{"path":"mcp/cli.ts","sha256":"a670bc601e227372c9ab3e862f4e25fa87ae4bfa90b63c3bbc61032d332da0d7","size":114201,"symbols":[{"name":"value","kind":"constant","sha256":"c9560c65b946f6f8269de6cb5d49d3bb0dbabec6fb3119c445ad738f194d37ba"},{"name":"agent","kind":"constant","sha256":"5b9caa614311fe691d6af171b9a8985b0d49464b9df178ad28ff5b9883eb4cf2"},{"name":"from","kind":"constant","sha256":"b386d829bcacbd9e216c726f6dff71fc7d8a53aade383fa45b850387414b780c"}]},{"path":"README.md","sha256":"9a533eee7962e84cdceef1bd8c9463233a575138fa143acafc8abd42f723944a","size":10477}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":9,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":211,"reverified_at":"2026-06-15T21:57:56.756Z","total_uses":9,"last_accessed_at":"2026-07-09T13:49:12.263Z"},"created_at":"2026-06-11T15:51:54.746Z","updated_at":"2026-07-03T16:16:26.718Z"}
```

