---
type: "Decision"
title: "Recall diversifies observed session sources"
description: "After studying search-result diversity requirements, Kage recall now caps session provenance dominance for distilled observation session packets. recallWithVectorScores ranks all relevant packets, then diversifyRecallEntries a"
resource: "mcp/kernel.ts"
tags: ["session-learning", "recall", "ranking", "session-distillation"]
timestamp: "2026-06-15T21:58:01.111Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:recall-diversifies-observed-session-sources-1779058571895"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/kernel.test.ts"]
---

# Recall diversifies observed session sources

> After studying search-result diversity requirements, Kage recall now caps session provenance dominance for distilled …

After studying search-result diversity requirements, Kage recall now caps session-provenance dominance for distilled observation-session packets. recallWithVectorScores ranks all relevant packets, then diversifyRecallEntries allows at most three packets from the same observation_session source before including independent session sources. This keeps noisy live-agent sessions from crowding out useful teammate memory while leaving normal explicit repo captures ungrouped and preserving existing score order within each source.
Verified by: npm test --prefix mcp -- --test-name-pattern 'recall diversifies results across observed session sources'; node --check mcp/viewer/app.js; node --check docs/viewer/app.js; git diff --check

## Verification

npm test --prefix mcp -- --test-name-pattern 'recall diversifies results across observed session sources'; node --check mcp/viewer/app.js; node --check docs/viewer/app.js; git diff --check

# Citations

[1] explicit_capture (2026-05-17T22:56:11.895Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:recall-diversifies-observed-session-sources-1779058571895","title":"Recall diversifies observed session sources","summary":"After studying search-result diversity requirements, Kage recall now caps session provenance dominance for distilled observation session packets. recallWithVectorScores ranks all relevant packets, then diversifyRecallEntries a","body":"After studying search-result diversity requirements, Kage recall now caps session-provenance dominance for distilled observation-session packets. recallWithVectorScores ranks all relevant packets, then diversifyRecallEntries allows at most three packets from the same observation_session source before including independent session sources. This keeps noisy live-agent sessions from crowding out useful teammate memory while leaving normal explicit repo captures ungrouped and preserving existing score order within each source.\nVerified by: npm test --prefix mcp -- --test-name-pattern 'recall diversifies results across observed session sources'; node --check mcp/viewer/app.js; node --check docs/viewer/app.js; git diff --check","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","recall","ranking","session-distillation"],"paths":["mcp/kernel.ts","mcp/kernel.test.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-17T22:56:11.895Z"}],"context":{"fact":"After studying search-result diversity requirements, Kage recall now caps session-provenance dominance for distilled observation-session packets. recallWithVectorScores ranks all relevant packets, then diversifyRecallEntries allows at most three packets from the same observation_session source before including independent session sources. This keeps noisy live-agent sessions from crowding out useful teammate memory while leaving normal explicit repo captures ungrouped and preserving existing score order within each source.\nVerified by: npm test --prefix mcp -- --test-name-pattern 'recall diversifies results across observed session sources'; node --check mcp/viewer/app.js; node --check docs/viewer/app.js; git diff --check","verification":"npm test --prefix mcp -- --test-name-pattern 'recall diversifies results across observed session sources'; node --check mcp/viewer/app.js; node --check docs/viewer/app.js; git diff --check"},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:01.111Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"order","kind":"constant","sha256":"db30b7ccb07d7f43001699200ace64babea1129360233ab863e59e09e926ef2c"},{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"captures","kind":"constant","sha256":"950d879145f4f4e4ebd8ecf00c5108ded0ecf255269095620bc64abbdee6d4f2"},{"name":"same","kind":"constant","sha256":"b150fada949a5c6d4babe0a0bc108765c6e7e1819d0ddbee55112b9c9a708447"},{"name":"explicit","kind":"constant","sha256":"3c7dc76a866b9617850dd05c43ef877cc5208ade5be761331cf32181ace414ff"},{"name":"diversifyrecallentries","kind":"function","sha256":"b1d80ed8fb48abf7cbc983a867956534964742d596df46f9921778f255a2a23f"},{"name":"recallwithvectorscores","kind":"function","sha256":"870c029c28d0658a5057a2b43fc9f0242d0b578e195e55c6871d18e56ddf444d"},{"name":"before","kind":"constant","sha256":"70c005bc3586ccb93799dfa1989dccca69b847916fd3fde1583578730922c50c"},{"name":"after","kind":"constant","sha256":"220a1c1969c37d53268e215419dcea650ffa901162d0a25e451bd90831fb0a1b"},{"name":"relevant","kind":"constant","sha256":"ecda229c929f06ede369f9d72be3d3211fef450b1056b73a121c5d925fac2c2b"},{"name":"then","kind":"constant","sha256":"69e63ba481d1d2641d270176aed93aa51e363bcfe7c9903c448b032adf4c4129"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"packets","kind":"constant","sha256":"f28a69afbf5d7a988e351fc5446a3b291a2451f97b8220c4e1a7629b3a50ffa3"},{"name":"name","kind":"constant","sha256":"081c81b8ff45c590015f81a59547f9e3c7167d240fc7840015e0afccc683b329"}]}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":5,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":181,"reverified_at":"2026-06-15T21:58:01.111Z","total_uses":5,"last_accessed_at":"2026-07-03T07:16:23.518Z"},"created_at":"2026-05-17T22:56:11.895Z","updated_at":"2026-07-03T16:16:26.712Z"}
```

