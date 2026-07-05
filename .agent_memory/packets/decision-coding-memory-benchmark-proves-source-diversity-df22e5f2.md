---
type: "Decision"
title: "Coding-memory benchmark proves source diversity"
description: "Kage's packaged coding memory benchmark now includes a source diversity probe inspired by session-source diversity requirements. The probe creates four high scoring memories from one noisy observation session and one ind"
resource: "mcp/kernel.ts"
tags: ["session-learning", "benchmark", "viewer", "proof-ledger", "recall"]
timestamp: "2026-06-15T21:58:29.094Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:coding-memory-benchmark-proves-source-diversity-1779058804661"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/kernel.test.ts", "mcp/daemon.ts", "mcp/daemon.test.ts", "benchmarks/README.md"]
---

# Coding-memory benchmark proves source diversity

> Kage's packaged coding memory benchmark now includes a source diversity probe inspired by session-source diversity re…

Kage's packaged coding-memory benchmark now includes a source-diversity probe inspired by session-source diversity requirements. The probe creates four high-scoring memories from one noisy observation_session and one independent observation_session, then requires recall top 4 to include the independent source with no more than three results from one session. viewerBenchmarkReport exposes this as a proof-ledger item named source-diversity, so the dashboard can prove noisy live-agent sessions do not crowd out independent teammate memory.
Verified by: npm test --prefix mcp -- --test-name-pattern 'coding memory quality benchmark is package-callable'; node mcp/dist/cli.js benchmark --memory-quality --json; node --check mcp/viewer/app.js; node --check docs/viewer/app.js; git diff --check

## Verification

npm test --prefix mcp -- --test-name-pattern 'coding memory quality benchmark is package-callable'; node mcp/dist/cli.js benchmark --memory-quality --json; node --check mcp/viewer/app.js; node --check docs/viewer/app.js; git diff --check

# Citations

[1] explicit_capture (2026-05-17T23:00:04.661Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:coding-memory-benchmark-proves-source-diversity-1779058804661","title":"Coding-memory benchmark proves source diversity","summary":"Kage's packaged coding memory benchmark now includes a source diversity probe inspired by session-source diversity requirements. The probe creates four high scoring memories from one noisy observation session and one ind","body":"Kage's packaged coding-memory benchmark now includes a source-diversity probe inspired by session-source diversity requirements. The probe creates four high-scoring memories from one noisy observation_session and one independent observation_session, then requires recall top 4 to include the independent source with no more than three results from one session. viewerBenchmarkReport exposes this as a proof-ledger item named source-diversity, so the dashboard can prove noisy live-agent sessions do not crowd out independent teammate memory.\nVerified by: npm test --prefix mcp -- --test-name-pattern 'coding memory quality benchmark is package-callable'; node mcp/dist/cli.js benchmark --memory-quality --json; node --check mcp/viewer/app.js; node --check docs/viewer/app.js; git diff --check","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","benchmark","viewer","proof-ledger","recall"],"paths":["mcp/kernel.ts","mcp/kernel.test.ts","mcp/daemon.ts","mcp/daemon.test.ts","benchmarks/README.md"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-17T23:00:04.661Z"}],"context":{"fact":"Kage's packaged coding-memory benchmark now includes a source-diversity probe inspired by session-source diversity requirements. The probe creates four high-scoring memories from one noisy observation_session and one independent observation_session, then requires recall top 4 to include the independent source with no more than three results from one session. viewerBenchmarkReport exposes this as a proof-ledger item named source-diversity, so the dashboard can prove noisy live-agent sessions do not crowd out independent teammate memory.\nVerified by: npm test --prefix mcp -- --test-name-pattern 'coding memory quality benchmark is package-callable'; node mcp/dist/cli.js benchmark --memory-quality --json; node --check mcp/viewer/app.js; node --check docs/viewer/app.js; git diff --check","verification":"npm test --prefix mcp -- --test-name-pattern 'coding memory quality benchmark is package-callable'; node mcp/dist/cli.js benchmark --memory-quality --json; node --check mcp/viewer/app.js; node --check docs/viewer/app.js; git diff --check"},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:29.094Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"named","kind":"constant","sha256":"c62eae0f2643b356f8af5f31c4a6880c381cdaaf3e19b2609b803199e60b7ead"},{"name":"then","kind":"constant","sha256":"69e63ba481d1d2641d270176aed93aa51e363bcfe7c9903c448b032adf4c4129"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"quality","kind":"constant","sha256":"06eb60954e6f50dd593cacf74246243dccea1b5754f915a9f1a036ce481e3be7"},{"name":"benchmark","kind":"constant","sha256":"5671166b34f289b838cd462807715792f2dda03a9870f4ca9e846b6ddd5ce769"},{"name":"name","kind":"constant","sha256":"081c81b8ff45c590015f81a59547f9e3c7167d240fc7840015e0afccc683b329"}]},{"path":"mcp/daemon.ts","sha256":"4d558ba09071b09ab3d1a62d40af04edf17609c9ea98a571405883424cc1bf2f","size":38423,"symbols":[{"name":"name","kind":"constant","sha256":"4f0acf827cd710685b546f996513b29813d4b8b69c1bb6e221743d70435dd3b0"},{"name":"viewerbenchmarkreport","kind":"function","sha256":"1e57f4e2e80c4548a199d094e645e6b501001fa1855ab014dc2da342d7d3a1da"},{"name":"json","kind":"function","sha256":"c6cfd13a6f9203c85fedf4efd643fcb209309a376a34ce77909c444a05e9b0e5"}]},{"path":"mcp/daemon.test.ts","sha256":"ef48ce8b21ff33ed39379a9be695f863280d552399973a742c0e3932c21bfe1e","size":12250},{"path":"benchmarks/README.md","sha256":"34ffe0979b86578a900bfb7c13e6236aa7952b5867af6090c1501a54d9a41c16","size":9904}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":1,"votes_down":0,"uses_30d":3,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":198,"reverified_at":"2026-06-15T21:58:29.094Z","total_uses":3,"last_accessed_at":"2026-07-03T17:57:29.034Z"},"created_at":"2026-05-17T23:00:04.661Z","updated_at":"2026-07-03T16:16:26.701Z"}
```

