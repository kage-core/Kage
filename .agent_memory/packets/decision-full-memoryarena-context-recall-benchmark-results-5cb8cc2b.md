---
type: "Decision"
title: "Full MemoryArena context recall benchmark results"
description: "Full MemoryArena context recall benchmark across all five public splits totals 701 tasks with 99.19% weighted average dependency coverage and 98.79% weighted final step dependency coverage. This is MemoryArena context re"
resource: "benchmarks/memoryarena-kage-context.mjs"
tags: ["session-learning", "benchmark", "memoryarena", "context-recall", "results"]
timestamp: "2026-05-18T04:59:38.521Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:full-memoryarena-context-recall-benchmark-results-1779080378521"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["benchmarks/memoryarena-kage-context.mjs", "benchmarks/README.md", "README.md"]
---

# Full MemoryArena context recall benchmark results

> Full MemoryArena context recall benchmark across all five public splits totals 701 tasks with 99.19% weighted average…

Full MemoryArena context-recall benchmark across all five public splits totals 701 tasks with 99.19% weighted average dependency coverage and 98.79% weighted final-step dependency coverage. This is MemoryArena context recall only, not official task-solving accuracy. Weakest split is formal_reasoning_math at 94.99% average and 85.28% final-step coverage, indicating future work should improve symbolic/rationale-aware recall for math chains.
Evidence: Ran benchmarks/memoryarena-kage-context.mjs over bundled_shopping 150, progressive_search 221, group_travel_planner 270, formal_reasoning_math 40, and formal_reasoning_phys 20. Results written under /private/tmp/kage-memoryarena/*-kage-context-full.json.
Verified by: node benchmarks/memoryarena-kage-context.mjs --dataset /private/tmp/kage-memoryarena/<split>.jsonl --suite <split> --limit <full-row-count> --top-k 10 --out /private/tmp/kage-memoryarena/<split>-kage-context-full.json

## Verification

Ran benchmarks/memoryarena-kage-context.mjs over bundled_shopping 150, progressive_search 221, group_travel_planner 270, formal_reasoning_math 40, and formal_reasoning_phys 20. Results written under /private/tmp/kage-memoryarena/*-kage-context-full.json.

# Citations

[1] explicit_capture (2026-05-18T04:59:38.521Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:full-memoryarena-context-recall-benchmark-results-1779080378521","title":"Full MemoryArena context recall benchmark results","summary":"Full MemoryArena context recall benchmark across all five public splits totals 701 tasks with 99.19% weighted average dependency coverage and 98.79% weighted final step dependency coverage. This is MemoryArena context re","body":"Full MemoryArena context-recall benchmark across all five public splits totals 701 tasks with 99.19% weighted average dependency coverage and 98.79% weighted final-step dependency coverage. This is MemoryArena context recall only, not official task-solving accuracy. Weakest split is formal_reasoning_math at 94.99% average and 85.28% final-step coverage, indicating future work should improve symbolic/rationale-aware recall for math chains.\nEvidence: Ran benchmarks/memoryarena-kage-context.mjs over bundled_shopping 150, progressive_search 221, group_travel_planner 270, formal_reasoning_math 40, and formal_reasoning_phys 20. Results written under /private/tmp/kage-memoryarena/*-kage-context-full.json.\nVerified by: node benchmarks/memoryarena-kage-context.mjs --dataset /private/tmp/kage-memoryarena/<split>.jsonl --suite <split> --limit <full-row-count> --top-k 10 --out /private/tmp/kage-memoryarena/<split>-kage-context-full.json","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","benchmark","memoryarena","context-recall","results"],"paths":["benchmarks/memoryarena-kage-context.mjs","benchmarks/README.md","README.md"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-18T04:59:38.521Z"}],"context":{"fact":"Full MemoryArena context-recall benchmark across all five public splits totals 701 tasks with 99.19% weighted average dependency coverage and 98.79% weighted final-step dependency coverage. This is MemoryArena context recall only, not official task-solving accuracy. Weakest split is formal_reasoning_math at 94.99% average and 85.28% final-step coverage, indicating future work should improve symbolic/rationale-aware recall for math chains.\nEvidence: Ran benchmarks/memoryarena-kage-context.mjs over bundled_shopping 150, progressive_search 221, group_travel_planner 270, formal_reasoning_math 40, and formal_reasoning_phys 20. Results written under /private/tmp/kage-memoryarena/*-kage-context-full.json.\nVerified by: node benchmarks/memoryarena-kage-context.mjs --dataset /private/tmp/kage-memoryarena/<split>.jsonl --suite <split> --limit <full-row-count> --top-k 10 --out /private/tmp/kage-memoryarena/<split>-kage-context-full.json","verification":"Ran benchmarks/memoryarena-kage-context.mjs over bundled_shopping 150, progressive_search 221, group_travel_planner 270, formal_reasoning_math 40, and formal_reasoning_phys 20. Results written under /private/tmp/kage-memoryarena/*-kage-context-full.json."},"freshness":{"ttl_days":365,"last_verified_at":"2026-05-18T04:59:38.521Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":235,"total_uses":0,"last_accessed_at":"2026-07-09T22:27:33.173Z"},"created_at":"2026-05-18T04:59:38.521Z","updated_at":"2026-07-03T16:16:26.703Z"}
```

