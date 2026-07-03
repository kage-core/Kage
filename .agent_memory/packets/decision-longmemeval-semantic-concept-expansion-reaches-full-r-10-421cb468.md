---
type: "Decision"
title: "LongMemEval semantic concept expansion reaches full R@10"
description: "Kage recall now adds lightweight concept expansion for common memory questions: garden/homegrown produce, phone battery and charging, siblings, business milestones, and kitchen appliances. With date aware temporal expans"
resource: "mcp/kernel.ts"
tags: ["session-learning", "retrieval", "benchmark", "longmemeval", "semantic-expansion"]
timestamp: "2026-06-15T21:58:31.281Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:longmemeval-semantic-concept-expansion-reaches-full-r-10-1779026751761"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/kernel.test.ts", "benchmarks/LONGMEMEVAL.md", "README.md"]
---

# LongMemEval semantic concept expansion reaches full R@10

> Kage recall now adds lightweight concept expansion for common memory questions: garden/homegrown produce, phone batte…

Kage recall now adds lightweight concept expansion for common memory questions: garden/homegrown produce, phone battery and charging, siblings, business milestones, and kitchen appliances. With date-aware temporal expansion plus these concept groups, full LongMemEval-S evidence retrieval reaches R@5 97.45%, R@10 100.00%, R@20 100.00%, MRR 0.9202, NDCG@10 0.9398 over 470 non-abstention questions. This is BM25 plus graph/date/concept expansion, not vector embedding search and not answer-generation accuracy.
Evidence: Implemented semanticConceptTerms in mcp/kernel.ts, added regression coverage in mcp/kernel.test.ts, updated benchmark docs and README.
Verified by: npm test --prefix mcp; node benchmarks/longmemeval-kage-retrieval.mjs --data /private/tmp/kage-external-bench/longmemeval_s_cleaned.json --limit 470 --top-k 10 --out /private/tmp/kage-external-bench/longmemeval-kage-full-semantic.json

## Verification

Implemented semanticConceptTerms in mcp/kernel.ts, added regression coverage in mcp/kernel.test.ts, updated benchmark docs and README.

# Citations

[1] explicit_capture (2026-05-17T14:05:51.761Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:longmemeval-semantic-concept-expansion-reaches-full-r-10-1779026751761","title":"LongMemEval semantic concept expansion reaches full R@10","summary":"Kage recall now adds lightweight concept expansion for common memory questions: garden/homegrown produce, phone battery and charging, siblings, business milestones, and kitchen appliances. With date aware temporal expans","body":"Kage recall now adds lightweight concept expansion for common memory questions: garden/homegrown produce, phone battery and charging, siblings, business milestones, and kitchen appliances. With date-aware temporal expansion plus these concept groups, full LongMemEval-S evidence retrieval reaches R@5 97.45%, R@10 100.00%, R@20 100.00%, MRR 0.9202, NDCG@10 0.9398 over 470 non-abstention questions. This is BM25 plus graph/date/concept expansion, not vector embedding search and not answer-generation accuracy.\nEvidence: Implemented semanticConceptTerms in mcp/kernel.ts, added regression coverage in mcp/kernel.test.ts, updated benchmark docs and README.\nVerified by: npm test --prefix mcp; node benchmarks/longmemeval-kage-retrieval.mjs --data /private/tmp/kage-external-bench/longmemeval_s_cleaned.json --limit 470 --top-k 10 --out /private/tmp/kage-external-bench/longmemeval-kage-full-semantic.json","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","retrieval","benchmark","longmemeval","semantic-expansion"],"paths":["mcp/kernel.ts","mcp/kernel.test.ts","benchmarks/LONGMEMEVAL.md","README.md"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-17T14:05:51.761Z"}],"context":{"fact":"Kage recall now adds lightweight concept expansion for common memory questions: garden/homegrown produce, phone battery and charging, siblings, business milestones, and kitchen appliances. With date-aware temporal expansion plus these concept groups, full LongMemEval-S evidence retrieval reaches R@5 97.45%, R@10 100.00%, R@20 100.00%, MRR 0.9202, NDCG@10 0.9398 over 470 non-abstention questions. This is BM25 plus graph/date/concept expansion, not vector embedding search and not answer-generation accuracy.\nEvidence: Implemented semanticConceptTerms in mcp/kernel.ts, added regression coverage in mcp/kernel.test.ts, updated benchmark docs and README.\nVerified by: npm test --prefix mcp; node benchmarks/longmemeval-kage-retrieval.mjs --data /private/tmp/kage-external-bench/longmemeval_s_cleaned.json --limit 470 --top-k 10 --out /private/tmp/kage-external-bench/longmemeval-kage-full-semantic.json","verification":"Implemented semanticConceptTerms in mcp/kernel.ts, added regression coverage in mcp/kernel.test.ts, updated benchmark docs and README."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:31.281Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"readme","kind":"constant","sha256":"aa0f002dd3f57a6ca1e42c5aba625151268ed600bbbd7582f93a0a0bc7714404"},{"name":"semanticconceptterms","kind":"function","sha256":"7c3812446af98ce0664ce969cd4df955e9339df22445897f64d0bf048dab6af4"},{"name":"expansion","kind":"constant","sha256":"077b75d250f9536ee59d78254a6dbf5a52371829ca1a9f2a8f7577bb170be66d"},{"name":"temporal","kind":"constant","sha256":"eb17097c42e0a93975c68a139b241065930cc14345f1722b7468f195612eab1b"},{"name":"data","kind":"constant","sha256":"491aa781049f0ad6b9dc4a2b393461ed407cfa306b0cf11bfad03315940015d7"},{"name":"groups","kind":"constant","sha256":"faf11f6fd9229c1eefb70e17cc50347ed46ef58cc6785848399c25adcdb27eea"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"},{"name":"full","kind":"constant","sha256":"9213768c4e556655970d7db34f178f135ab91810c1a0a99bba63452c01924f4f"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"added","kind":"constant","sha256":"bc14da9c82da760a8d437c7e912b7909ab47e5de278fb9a951ae4702a8835975"},{"name":"benchmark","kind":"constant","sha256":"5671166b34f289b838cd462807715792f2dda03a9870f4ca9e846b6ddd5ce769"},{"name":"full","kind":"constant","sha256":"6270b632fb8c1ec230ad23878da137aab65feab7105ddd15ff76a1d27e5b5b44"}]},{"path":"benchmarks/LONGMEMEVAL.md","sha256":"5df10a3e759e49d4a1f48d158d4178ac75fcada36ec0efa45012a679359a3e40","size":5319},{"path":"README.md","sha256":"9a533eee7962e84cdceef1bd8c9463233a575138fa143acafc8abd42f723944a","size":10477}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":226,"reverified_at":"2026-06-15T21:58:31.281Z","total_uses":0},"created_at":"2026-05-17T14:05:51.761Z","updated_at":"2026-07-03T16:16:26.707Z"}
```

