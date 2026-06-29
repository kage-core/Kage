---
type: "Bug Fix"
title: "CI: Kage PR Check must block only on hard-stale memory"
description: "The self referential Kage PR Check gate failed every PR because pr check treated all stale memory incl. soft 'linked code changed since capture' as blocking. Fix: error only on hard stale deleted citations, expired ttl,"
resource: "mcp/kernel.ts"
tags: ["session-learning"]
timestamp: "2026-06-15T21:58:23.552Z"
x-kage-id: "repo:memory:bug_fix:ci-kage-pr-check-must-block-only-on-hard-stale-memory-1780660446179"
x-kage-type: "bug_fix"
x-kage-status: "deprecated"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "deprecated"
x-kage-paths: ["mcp/kernel.ts"]
---

# CI: Kage PR Check must block only on hard-stale memory

> The self referential Kage PR Check gate failed every PR because pr check treated all stale memory incl. soft 'linked …

The self-referential Kage PR Check gate failed every PR because pr check treated all stale memory (incl. soft 'linked code changed since capture') as blocking. Fix: error only on hard-stale (deleted citations, expired ttl, reported) + validation + stale graphs; soft-stale/reconciliation/distillable become warnings.
Verified by: 187 tests; CI green on PRs 21/22

## Verification

187 tests; CI green on PRs 21/22

# Citations

[1] explicit_capture (2026-06-05T11:54:06.179Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:memory:bug_fix:ci-kage-pr-check-must-block-only-on-hard-stale-memory-1780660446179","title":"CI: Kage PR Check must block only on hard-stale memory","summary":"The self referential Kage PR Check gate failed every PR because pr check treated all stale memory incl. soft 'linked code changed since capture' as blocking. Fix: error only on hard stale deleted citations, expired ttl,","body":"The self-referential Kage PR Check gate failed every PR because pr check treated all stale memory (incl. soft 'linked code changed since capture') as blocking. Fix: error only on hard-stale (deleted citations, expired ttl, reported) + validation + stale graphs; soft-stale/reconciliation/distillable become warnings.\nVerified by: 187 tests; CI green on PRs 21/22","type":"bug_fix","scope":"repo","visibility":"team","sensitivity":"internal","status":"deprecated","confidence":0.7,"tags":["session-learning"],"paths":["mcp/kernel.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-06-05T11:54:06.179Z"}],"context":{"fact":"The self-referential Kage PR Check gate failed every PR because pr check treated all stale memory (incl. soft 'linked code changed since capture') as blocking. Fix: error only on hard-stale (deleted citations, expired ttl, reported) + validation + stale graphs; soft-stale/reconciliation/distillable become warnings.\nVerified by: 187 tests; CI green on PRs 21/22","verification":"187 tests; CI green on PRs 21/22"},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:23.552Z","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"},{"name":"citations","kind":"constant","sha256":"78b7b49fddee7f5495108e631981c2962515ed3d581135bfa9b536e2b3f30e9d"},{"name":"graphs","kind":"constant","sha256":"5483925183f5f71c1681f32dbf4b745a68dc9fc52cb81abcc8410e5ad02b3dac"},{"name":"capture","kind":"function","sha256":"d6ab6995f6712c0c94fc325e5aaaf3f495bdd81ba660e115f3d467f89f93ef29"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"}]}],"path_fingerprint_policy":"source_hash_staleness","verification":"repo_local_agent_capture","superseded_at":"2026-06-12T11:52:46.619Z","superseded_by":"repo:https-github-com-kage-core-kage:bug_fix:ci-kage-pr-check-blocks-only-on-hard-stale-memory-still-true-in-v2-2-0-178126514","superseded_reason":"Newer repo memory supersedes this packet."},"edges":[{"relation":"superseded_by","to":"repo:https-github-com-kage-core-kage:bug_fix:ci-kage-pr-check-blocks-only-on-hard-stale-memory-still-true-in-v2-2-0-178126514","evidence":"Newer repo memory supersedes this packet.","created_at":"2026-06-12T11:52:46.619Z"}],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":91,"superseded_by":"repo:https-github-com-kage-core-kage:bug_fix:ci-kage-pr-check-blocks-only-on-hard-stale-memory-still-true-in-v2-2-0-178126514","superseded_reason":"Newer repo memory supersedes this packet.","reverified_at":"2026-06-15T21:58:23.552Z","stale":true,"stale_reasons":["packet status is deprecated","linked path changed since memory was verified: mcp/kernel.ts"],"suggested_action":"mark_stale"},"created_at":"2026-06-05T11:54:06.179Z","updated_at":"2026-06-29T08:35:41.819Z","author_branch":"chore/dogfood"}
```

