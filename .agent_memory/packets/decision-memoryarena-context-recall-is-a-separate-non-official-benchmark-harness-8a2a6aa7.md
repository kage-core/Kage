---
type: "Decision"
title: "MemoryArena context recall is a separate non-official benchmark harness"
description: "Kage now has a MemoryArena context recall harness that imports prior subtask answers as repo local memory and measures whether later subtasks retrieve those memories. This must be described as MemoryArena context recall,"
resource: "benchmarks/memoryarena-kage-context.mjs"
tags: ["session-learning", "benchmark", "memoryarena", "context-recall", "integrity"]
timestamp: "2026-05-18T04:42:45.172Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:memoryarena-context-recall-is-a-separate-non-official-benchmark-harness-17790793"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["benchmarks/memoryarena-kage-context.mjs", "benchmarks/README.md", "README.md"]
---

# MemoryArena context recall is a separate non-official benchmark harness

> Kage now has a MemoryArena context recall harness that imports prior subtask answers as repo local memory and measure…

Kage now has a MemoryArena context-recall harness that imports prior subtask answers as repo-local memory and measures whether later subtasks retrieve those memories. This must be described as MemoryArena context recall, not official MemoryArena task-solving accuracy, because official scoring requires an agent or LLM to act on recalled context and produce final answers.
Evidence: Added benchmarks/memoryarena-kage-context.mjs and documented it in benchmarks/README.md and README.md. Progressive Search 25-task slice returned 99.00% average dependency coverage and 97.57% final-step dependency coverage with strict semanticExpansion:false recall.
Verified by: node --check benchmarks/memoryarena-kage-context.mjs; node benchmarks/memoryarena-kage-context.mjs --dataset /private/tmp/kage-memoryarena/progressive_search.jsonl --suite progressive_search --limit 25 --top-k 10 --out /private/tmp/kage-memoryarena/progressive-search-kage-context-25.json

## Verification

Added benchmarks/memoryarena-kage-context.mjs and documented it in benchmarks/README.md and README.md. Progressive Search 25-task slice returned 99.00% average dependency coverage and 97.57% final-step dependency coverage with strict semanticExpansion:false recall.

# Citations

[1] explicit_capture (2026-05-18T04:42:45.172Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:memoryarena-context-recall-is-a-separate-non-official-benchmark-harness-17790793","title":"MemoryArena context recall is a separate non-official benchmark harness","summary":"Kage now has a MemoryArena context recall harness that imports prior subtask answers as repo local memory and measures whether later subtasks retrieve those memories. This must be described as MemoryArena context recall,","body":"Kage now has a MemoryArena context-recall harness that imports prior subtask answers as repo-local memory and measures whether later subtasks retrieve those memories. This must be described as MemoryArena context recall, not official MemoryArena task-solving accuracy, because official scoring requires an agent or LLM to act on recalled context and produce final answers.\nEvidence: Added benchmarks/memoryarena-kage-context.mjs and documented it in benchmarks/README.md and README.md. Progressive Search 25-task slice returned 99.00% average dependency coverage and 97.57% final-step dependency coverage with strict semanticExpansion:false recall.\nVerified by: node --check benchmarks/memoryarena-kage-context.mjs; node benchmarks/memoryarena-kage-context.mjs --dataset /private/tmp/kage-memoryarena/progressive_search.jsonl --suite progressive_search --limit 25 --top-k 10 --out /private/tmp/kage-memoryarena/progressive-search-kage-context-25.json","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","benchmark","memoryarena","context-recall","integrity"],"paths":["benchmarks/memoryarena-kage-context.mjs","benchmarks/README.md","README.md"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-18T04:42:45.172Z"}],"context":{"fact":"Kage now has a MemoryArena context-recall harness that imports prior subtask answers as repo-local memory and measures whether later subtasks retrieve those memories. This must be described as MemoryArena context recall, not official MemoryArena task-solving accuracy, because official scoring requires an agent or LLM to act on recalled context and produce final answers.\nEvidence: Added benchmarks/memoryarena-kage-context.mjs and documented it in benchmarks/README.md and README.md. Progressive Search 25-task slice returned 99.00% average dependency coverage and 97.57% final-step dependency coverage with strict semanticExpansion:false recall.\nVerified by: node --check benchmarks/memoryarena-kage-context.mjs; node benchmarks/memoryarena-kage-context.mjs --dataset /private/tmp/kage-memoryarena/progressive_search.jsonl --suite progressive_search --limit 25 --top-k 10 --out /private/tmp/kage-memoryarena/progressive-search-kage-context-25.json","verification":"Added benchmarks/memoryarena-kage-context.mjs and documented it in benchmarks/README.md and README.md. Progressive Search 25-task slice returned 99.00% average dependency coverage and 97.57% final-step dependency coverage with strict semanticExpansion:false recall."},"freshness":{"ttl_days":365,"last_verified_at":"2026-05-18T04:42:45.172Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":6,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":238,"total_uses":6,"last_accessed_at":"2026-07-06T18:42:05.639Z"},"created_at":"2026-05-18T04:42:45.172Z","updated_at":"2026-07-03T16:16:26.709Z"}
```

