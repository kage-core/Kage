---
type: "Decision"
title: "Strict LongMemEval benchmark disables semantic concept expansion"
description: "Kage LongMemEval S headline benchmarking must run with semanticExpansion disabled. The product recall stack can still use built in semantic concept expansion, but external/adopted benchmark reports should use the strict"
resource: "mcp/kernel.ts"
tags: ["session-learning", "benchmark", "longmemeval", "integrity", "recall"]
timestamp: "2026-06-15T21:58:27.882Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:strict-longmemeval-benchmark-disables-semantic-concept-expansion-1779078721405"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "verified"
x-kage-paths: ["mcp/kernel.ts", "benchmarks/longmemeval-kage-retrieval.mjs", "benchmarks/LONGMEMEVAL.md", "README.md"]
---

# Strict LongMemEval benchmark disables semantic concept expansion

> Kage LongMemEval S headline benchmarking must run with semanticExpansion disabled. The product recall stack can still…

Kage LongMemEval-S headline benchmarking must run with semanticExpansion disabled. The product recall stack can still use built-in semantic concept expansion, but external/adopted benchmark reports should use the strict no-semantic-expansion mode or explicitly label --semantic-expansion as product/tuned. Verified strict full run on 470 non-abstention questions: R@5 96.17%, R@10 98.72%, R@20 99.79%, MRR 0.9094, NDCG@10 0.9279.
Evidence: Changed mcp/kernel.ts to accept semanticExpansion:false, benchmarks/longmemeval-kage-retrieval.mjs defaults to strict no-semantic-expansion, updated README.md and benchmarks/LONGMEMEVAL.md with strict metrics.
Verified by: npm test --prefix mcp -- --test-name-pattern strict external benchmarks|common memory concepts; node benchmarks/longmemeval-kage-retrieval.mjs --data /private/tmp/kage-external-bench/longmemeval_s_cleaned.json --limit 470 --top-k 10 --out /private/tmp/kage-external-bench/longmemeval-kage-strict-no-semantic.json

## Verification

Changed mcp/kernel.ts to accept semanticExpansion:false, benchmarks/longmemeval-kage-retrieval.mjs defaults to strict no-semantic-expansion, updated README.md and benchmarks/LONGMEMEVAL.md with strict metrics.

# Citations

[1] explicit_capture (2026-05-18T04:32:01.405Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:strict-longmemeval-benchmark-disables-semantic-concept-expansion-1779078721405","title":"Strict LongMemEval benchmark disables semantic concept expansion","summary":"Kage LongMemEval S headline benchmarking must run with semanticExpansion disabled. The product recall stack can still use built in semantic concept expansion, but external/adopted benchmark reports should use the strict","body":"Kage LongMemEval-S headline benchmarking must run with semanticExpansion disabled. The product recall stack can still use built-in semantic concept expansion, but external/adopted benchmark reports should use the strict no-semantic-expansion mode or explicitly label --semantic-expansion as product/tuned. Verified strict full run on 470 non-abstention questions: R@5 96.17%, R@10 98.72%, R@20 99.79%, MRR 0.9094, NDCG@10 0.9279.\nEvidence: Changed mcp/kernel.ts to accept semanticExpansion:false, benchmarks/longmemeval-kage-retrieval.mjs defaults to strict no-semantic-expansion, updated README.md and benchmarks/LONGMEMEVAL.md with strict metrics.\nVerified by: npm test --prefix mcp -- --test-name-pattern strict external benchmarks|common memory concepts; node benchmarks/longmemeval-kage-retrieval.mjs --data /private/tmp/kage-external-bench/longmemeval_s_cleaned.json --limit 470 --top-k 10 --out /private/tmp/kage-external-bench/longmemeval-kage-strict-no-semantic.json","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","benchmark","longmemeval","integrity","recall"],"paths":["mcp/kernel.ts","benchmarks/longmemeval-kage-retrieval.mjs","benchmarks/LONGMEMEVAL.md","README.md"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-18T04:32:01.405Z"}],"context":{"fact":"Kage LongMemEval-S headline benchmarking must run with semanticExpansion disabled. The product recall stack can still use built-in semantic concept expansion, but external/adopted benchmark reports should use the strict no-semantic-expansion mode or explicitly label --semantic-expansion as product/tuned. Verified strict full run on 470 non-abstention questions: R@5 96.17%, R@10 98.72%, R@20 99.79%, MRR 0.9094, NDCG@10 0.9279.\nEvidence: Changed mcp/kernel.ts to accept semanticExpansion:false, benchmarks/longmemeval-kage-retrieval.mjs defaults to strict no-semantic-expansion, updated README.md and benchmarks/LONGMEMEVAL.md with strict metrics.\nVerified by: npm test --prefix mcp -- --test-name-pattern strict external benchmarks|common memory concepts; node benchmarks/longmemeval-kage-retrieval.mjs --data /private/tmp/kage-external-bench/longmemeval_s_cleaned.json --limit 470 --top-k 10 --out /private/tmp/kage-external-bench/longmemeval-kage-strict-no-semantic.json","verification":"Changed mcp/kernel.ts to accept semanticExpansion:false, benchmarks/longmemeval-kage-retrieval.mjs defaults to strict no-semantic-expansion, updated README.md and benchmarks/LONGMEMEVAL.md with strict metrics."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:27.882Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"readme","kind":"constant","sha256":"aa0f002dd3f57a6ca1e42c5aba625151268ed600bbbd7582f93a0a0bc7714404"},{"name":"expansion","kind":"constant","sha256":"077b75d250f9536ee59d78254a6dbf5a52371829ca1a9f2a8f7577bb170be66d"},{"name":"data","kind":"constant","sha256":"491aa781049f0ad6b9dc4a2b393461ed407cfa306b0cf11bfad03315940015d7"},{"name":"concepts","kind":"constant","sha256":"b8443d3c45db4bc188524e5b5913dbfc61742d88d269e72c423d182ec66016b3"},{"name":"mode","kind":"constant","sha256":"8bd576eb1331064328ee58c6045807752b97bb5b2e94fc37cf9f79d5a6fa6f91"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"},{"name":"full","kind":"constant","sha256":"9213768c4e556655970d7db34f178f135ab91810c1a0a99bba63452c01924f4f"}]},{"path":"benchmarks/longmemeval-kage-retrieval.mjs","sha256":"83ba9c74cb46c4947adbc05c807fa3592ba9e15200a5888a75c7bfd3f2ec0ae6","size":11728,"symbols":[{"name":"kernel","kind":"constant","sha256":"57bca4a7a2d87a532d86a1bc9d8798b7ba2db2e1748c14b17be1cf9ea170e472"},{"name":"limit","kind":"constant","sha256":"0e2a17e846a5fdf03268968ec1830066d5709310b0694af277ce9171a5751e89"},{"name":"semanticexpansion","kind":"constant","sha256":"1a6dfe375494f597c3c3613a020d62b57bb9ca9dac6f6c4154c7e0ba012eefab"},{"name":"data","kind":"constant","sha256":"6cab80023def84e843bbcabb8d5ff162dea81906193f82f3f4f955fa4bab9f55"}]},{"path":"benchmarks/LONGMEMEVAL.md","sha256":"5df10a3e759e49d4a1f48d158d4178ac75fcada36ec0efa45012a679359a3e40","size":5319},{"path":"README.md","sha256":"9a533eee7962e84cdceef1bd8c9463233a575138fa143acafc8abd42f723944a","size":10477}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":244,"reverified_at":"2026-06-15T21:58:27.882Z"},"created_at":"2026-05-18T04:32:01.405Z","updated_at":"2026-06-15T21:58:27.882Z"}
```

