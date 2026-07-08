---
type: "Decision"
title: "Decision: Kage now has a coding-memory quality benchmark designed around interna"
description: "Decision: Kage now has a coding memory quality benchmark inspired by coding-memory retrieval evaluation patterns, but implemented as Kage owned synthetic repo memory data. The harness lives in benchmarks/coding memory quali"
resource: "benchmarks/coding-memory-quality.mjs"
tags: ["session-learning", "benchmarks"]
timestamp: "2026-05-17T20:49:01.524Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:decision-kage-now-has-a-coding-memory-quality-benchmark-inspired-by-external-memory-tools"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["benchmarks/coding-memory-quality.mjs"]
---

# Decision: Kage now has a coding-memory quality benchmark designed around interna

> Decision: Kage now has a coding memory quality benchmark inspired by coding-memory retrieval evaluation patterns, but…

Decision: Kage now has a coding-memory quality benchmark inspired by coding-memory retrieval evaluation patterns, but implemented as Kage-owned synthetic repo-memory data. The harness lives in benchmarks/coding-memory-quality.mjs, generates 240 labeled packets with runbooks, decisions, bug causes, code explanations, and hard-negative adjacent notes, runs Kage recall, and reports R@5/R@10/R@20, precision@5, NDCG@10, MRR, latency, and context reduction. Current default local run: 240 packets, 20 queries, 437ms refresh, 100% R@5/R@10/R@20, 1.0000 NDCG@10/MRR, 19ms median recall, 95.08% context reduction. Why: Kage should prove coding-agent memory quality with reproducible benchmark artifacts, not only LongMemEval or README claims. Verify with node --check benchmarks/coding-memory-quality.mjs and node benchmarks/coding-memory-quality.mjs --out /tmp/kage-coding-memory-quality-default.json.

## Why

Kage should prove coding-agent memory quality with reproducible benchmark artifacts, not only LongMemEval or README claims. Verify with node --check benchmarks/coding-memory-quality.mjs and node benchmarks/coding-memory-quality.mjs --out /tmp/kage-coding-memory-quality-default.json.

# Citations

[1] explicit_capture (2026-05-17T20:49:01.524Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:decision-kage-now-has-a-coding-memory-quality-benchmark-inspired-by-external-memory-tools","title":"Decision: Kage now has a coding-memory quality benchmark designed around interna","summary":"Decision: Kage now has a coding memory quality benchmark inspired by coding-memory retrieval evaluation patterns, but implemented as Kage owned synthetic repo memory data. The harness lives in benchmarks/coding memory quali","body":"Decision: Kage now has a coding-memory quality benchmark inspired by coding-memory retrieval evaluation patterns, but implemented as Kage-owned synthetic repo-memory data. The harness lives in benchmarks/coding-memory-quality.mjs, generates 240 labeled packets with runbooks, decisions, bug causes, code explanations, and hard-negative adjacent notes, runs Kage recall, and reports R@5/R@10/R@20, precision@5, NDCG@10, MRR, latency, and context reduction. Current default local run: 240 packets, 20 queries, 437ms refresh, 100% R@5/R@10/R@20, 1.0000 NDCG@10/MRR, 19ms median recall, 95.08% context reduction. Why: Kage should prove coding-agent memory quality with reproducible benchmark artifacts, not only LongMemEval or README claims. Verify with node --check benchmarks/coding-memory-quality.mjs and node benchmarks/coding-memory-quality.mjs --out /tmp/kage-coding-memory-quality-default.json.","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","benchmarks"],"paths":["benchmarks/coding-memory-quality.mjs"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-17T20:49:01.524Z"}],"context":{"fact":"Kage now has a coding-memory quality benchmark inspired by coding-memory retrieval evaluation patterns, but implemented as Kage-owned synthetic repo-memory data. The harness lives in benchmarks/coding-memory-quality.mjs, generates 240 labeled packets with runbooks, decisions, bug causes, code explanations, and hard-negative adjacent notes, runs Kage recall, and reports R@5/R@10/R@20, precision@5, NDCG@10, MRR, latency, and context reduction. Current default local run: 240 packets, 20 queries, 437ms refresh, 100% R@5/R@10/R@20, 1.0000 NDCG@10/MRR, 19ms median recall, 95.08% context reduction.","why":"Kage should prove coding-agent memory quality with reproducible benchmark artifacts, not only LongMemEval or README claims. Verify with node --check benchmarks/coding-memory-quality.mjs and node benchmarks/coding-memory-quality.mjs --out /tmp/kage-coding-memory-quality-default.json."},"freshness":{"ttl_days":365,"last_verified_at":"2026-05-17T20:49:01.524Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":1,"votes_down":0,"uses_30d":1,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":224,"total_uses":1,"last_accessed_at":"2026-07-08T21:12:08.038Z"},"created_at":"2026-05-17T20:49:01.524Z","updated_at":"2026-07-03T16:16:26.702Z"}
```

