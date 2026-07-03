---
type: "Decision"
title: "Generated change-memory packets should not duplicate-warn across branches"
description: "Kage should not treat generated diff proposal change memory packets as duplicate memory when comparing one branch summary to another. Cross branch change memory overlap is expected because branch summaries are generated"
resource: "mcp/kernel.ts"
tags: ["session-learning", "memory-quality", "change-memory", "validation", "branch-handoff"]
timestamp: "2026-06-15T21:58:14.724Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:generated-change-memory-packets-should-not-duplicate-warn-across-branches-177860"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/kernel.test.ts"]
---

# Generated change-memory packets should not duplicate-warn across branches

> Kage should not treat generated diff proposal change memory packets as duplicate memory when comparing one branch sum…

Kage should not treat generated diff-proposal change-memory packets as duplicate memory when comparing one branch summary to another. Cross-branch change-memory overlap is expected because branch summaries are generated handoff metadata, not durable hand-authored facts. Duplicate warnings should remain for normal memory packets, but generated change-memory should not create noisy validation failures.
Evidence: Added regression coverage for two generated branch change-memory packets and updated duplicate candidate filtering to skip generated change-memory vs generated change-memory comparisons.
Verified by: npm test --prefix mcp -- --test-name-pattern 'project validation ignores duplicate warnings between generated branch change memories'; node mcp/dist/cli.js validate --project .

## Verification

Added regression coverage for two generated branch change-memory packets and updated duplicate candidate filtering to skip generated change-memory vs generated change-memory comparisons.

# Citations

[1] explicit_capture (2026-05-12T17:02:50.895Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:generated-change-memory-packets-should-not-duplicate-warn-across-branches-177860","title":"Generated change-memory packets should not duplicate-warn across branches","summary":"Kage should not treat generated diff proposal change memory packets as duplicate memory when comparing one branch summary to another. Cross branch change memory overlap is expected because branch summaries are generated","body":"Kage should not treat generated diff-proposal change-memory packets as duplicate memory when comparing one branch summary to another. Cross-branch change-memory overlap is expected because branch summaries are generated handoff metadata, not durable hand-authored facts. Duplicate warnings should remain for normal memory packets, but generated change-memory should not create noisy validation failures.\nEvidence: Added regression coverage for two generated branch change-memory packets and updated duplicate candidate filtering to skip generated change-memory vs generated change-memory comparisons.\nVerified by: npm test --prefix mcp -- --test-name-pattern 'project validation ignores duplicate warnings between generated branch change memories'; node mcp/dist/cli.js validate --project .","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","memory-quality","change-memory","validation","branch-handoff"],"paths":["mcp/kernel.ts","mcp/kernel.test.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-12T17:02:50.895Z"}],"context":{"fact":"Kage should not treat generated diff-proposal change-memory packets as duplicate memory when comparing one branch summary to another. Cross-branch change-memory overlap is expected because branch summaries are generated handoff metadata, not durable hand-authored facts. Duplicate warnings should remain for normal memory packets, but generated change-memory should not create noisy validation failures.\nEvidence: Added regression coverage for two generated branch change-memory packets and updated duplicate candidate filtering to skip generated change-memory vs generated change-memory comparisons.\nVerified by: npm test --prefix mcp -- --test-name-pattern 'project validation ignores duplicate warnings between generated branch change memories'; node mcp/dist/cli.js validate --project .","verification":"Added regression coverage for two generated branch change-memory packets and updated duplicate candidate filtering to skip generated change-memory vs generated change-memory comparisons."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:14.724Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"handoff","kind":"constant","sha256":"7ca82bf8dfe8bd9cc41cf7de6d3a0421c3753588836a81fddf5ba5e62ae2781f"},{"name":"durable","kind":"constant","sha256":"3fa48acfe2e95fa0fcf831049f2d1aa3ddf26ddc5a1d10724db5da185389e634"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"},{"name":"proposal","kind":"constant","sha256":"2635ae339aa49ea3e4a223598b98a454a35fb29ef89fd02ff6ab0662362ab19f"},{"name":"when","kind":"constant","sha256":"48bfd58b3cdbf2d407e4443b90727d548d96eceaa4372c099dcd22c52f498452"},{"name":"skip","kind":"constant","sha256":"84ce913f797ae6f1160ffe3c80d4f9852f31f1ce9c118d5e1a8be145e564b569"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"packets","kind":"constant","sha256":"f28a69afbf5d7a988e351fc5446a3b291a2451f97b8220c4e1a7629b3a50ffa3"},{"name":"added","kind":"constant","sha256":"bc14da9c82da760a8d437c7e912b7909ab47e5de278fb9a951ae4702a8835975"},{"name":"candidate","kind":"constant","sha256":"1c2bbb00dc467d324f328c699e35d338706dfd5146b8c5c354407980f3bd7551"},{"name":"name","kind":"constant","sha256":"081c81b8ff45c590015f81a59547f9e3c7167d240fc7840015e0afccc683b329"}]}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":198,"reverified_at":"2026-06-15T21:58:14.724Z","total_uses":0},"created_at":"2026-05-12T17:02:50.895Z","updated_at":"2026-07-03T16:16:26.703Z"}
```

