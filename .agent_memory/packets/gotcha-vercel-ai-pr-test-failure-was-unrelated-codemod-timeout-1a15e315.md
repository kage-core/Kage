---
type: "Gotcha"
title: "Vercel AI PR test failure was unrelated codemod timeout"
description: "When checking vercel/ai PR 15154, the red Test 20 job was not caused by the mock array result indexing diff. The failed package was @ai sdk/codemod, with packages/codemod/src/test/remove await fn.test.ts timing out after"
resource: "mcp/kernel.ts"
tags: ["session-learning", "vercel-ai", "ci", "github-actions", "fork", "pr"]
timestamp: "2026-06-15T21:58:04.845Z"
x-kage-id: "repo:https-github-com-kage-core-kage:gotcha:vercel-ai-pr-test-failure-was-unrelated-codemod-timeout-1778593860752"
x-kage-type: "gotcha"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts"]
---

# Vercel AI PR test failure was unrelated codemod timeout

> When checking vercel/ai PR 15154, the red Test 20 job was not caused by the mock array result indexing diff. The fail…

When checking vercel/ai PR #15154, the red Test (20) job was not caused by the mock array result indexing diff. The failed package was @ai-sdk/codemod, with packages/codemod/src/test/remove-await-fn.test.ts timing out after 15000ms on Node 20, while the touched packages/ai mock-language-model and mock-embedding-model tests passed in the same run. The practical response was to rebase the fork branch onto current upstream main and force-push a clean signed commit, which retriggered CI; new runs may be action_required and need maintainer approval for fork workflows.
Evidence: GitHub Actions run 25712291084 failed @ai-sdk/codemod#test; PR #15154 commit 56a0115d25f0cdb06afc9f3f3489652d5f70164d is signed and verified; new CI runs 25738750368/25738750327 were action_required with no jobs.
Verified by: gh run view logs; gh api commit verification; gh pr view/checks

## Verification

GitHub Actions run 25712291084 failed @ai-sdk/codemod#test; PR #15154 commit 56a0115d25f0cdb06afc9f3f3489652d5f70164d is signed and verified; new CI runs 25738750368/25738750327 were action_required with no jobs.

# Citations

[1] explicit_capture (2026-05-12T13:51:00.749Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:gotcha:vercel-ai-pr-test-failure-was-unrelated-codemod-timeout-1778593860752","title":"Vercel AI PR test failure was unrelated codemod timeout","summary":"When checking vercel/ai PR 15154, the red Test 20 job was not caused by the mock array result indexing diff. The failed package was @ai sdk/codemod, with packages/codemod/src/test/remove await fn.test.ts timing out after","body":"When checking vercel/ai PR #15154, the red Test (20) job was not caused by the mock array result indexing diff. The failed package was @ai-sdk/codemod, with packages/codemod/src/test/remove-await-fn.test.ts timing out after 15000ms on Node 20, while the touched packages/ai mock-language-model and mock-embedding-model tests passed in the same run. The practical response was to rebase the fork branch onto current upstream main and force-push a clean signed commit, which retriggered CI; new runs may be action_required and need maintainer approval for fork workflows.\nEvidence: GitHub Actions run 25712291084 failed @ai-sdk/codemod#test; PR #15154 commit 56a0115d25f0cdb06afc9f3f3489652d5f70164d is signed and verified; new CI runs 25738750368/25738750327 were action_required with no jobs.\nVerified by: gh run view logs; gh api commit verification; gh pr view/checks","type":"gotcha","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","vercel-ai","ci","github-actions","fork","pr"],"paths":["mcp/kernel.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-12T13:51:00.749Z"}],"context":{"fact":"When checking vercel/ai PR #15154, the red Test (20) job was not caused by the mock array result indexing diff. The failed package was @ai-sdk/codemod, with packages/codemod/src/test/remove-await-fn.test.ts timing out after 15000ms on Node 20, while the touched packages/ai mock-language-model and mock-embedding-model tests passed in the same run. The practical response was to rebase the fork branch onto current upstream main and force-push a clean signed commit, which retriggered CI; new runs may be action_required and need maintainer approval for fork workflows.\nEvidence: GitHub Actions run 25712291084 failed @ai-sdk/codemod#test; PR #15154 commit 56a0115d25f0cdb06afc9f3f3489652d5f70164d is signed and verified; new CI runs 25738750368/25738750327 were action_required with no jobs.\nVerified by: gh run view logs; gh api commit verification; gh pr view/checks","verification":"GitHub Actions run 25712291084 failed @ai-sdk/codemod#test; PR #15154 commit 56a0115d25f0cdb06afc9f3f3489652d5f70164d is signed and verified; new CI runs 25738750368/25738750327 were action_required with no jobs."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:04.845Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"workflows","kind":"constant","sha256":"2ea5d179e38ba32bc55cd3ed4129070588de07856ed1a212774c8a9c0515bfc6"},{"name":"same","kind":"constant","sha256":"b150fada949a5c6d4babe0a0bc108765c6e7e1819d0ddbee55112b9c9a708447"},{"name":"clean","kind":"function","sha256":"17cd330796a719d520826491a73ab88f886668a6f03c7ab8c85530d9cb3a996d"},{"name":"packages","kind":"constant","sha256":"b3f7f5751231d35d1ebe98313a00f4b11f967ab95d187f7c6ec82578a5ad5177"},{"name":"verification","kind":"constant","sha256":"faeb54eb75a6e60ebcab087f39fdd9f971c8a3a16e25846647ab2dd5802748f3"},{"name":"after","kind":"constant","sha256":"220a1c1969c37d53268e215419dcea650ffa901162d0a25e451bd90831fb0a1b"},{"name":"actions","kind":"constant","sha256":"e9fa77511d2aa4381951ce36c45b1035a092e6f2d981cc5d88c52c646b028c6d"},{"name":"when","kind":"constant","sha256":"48bfd58b3cdbf2d407e4443b90727d548d96eceaa4372c099dcd22c52f498452"}]}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":2,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":218,"reverified_at":"2026-06-15T21:58:04.845Z","total_uses":2,"last_accessed_at":"2026-07-02T07:55:58.339Z"},"created_at":"2026-05-12T13:51:00.749Z","updated_at":"2026-07-03T16:16:26.723Z"}
```

