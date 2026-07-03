---
type: "Negative Result"
title: "MemoryArena OpenAI answer benchmark blocked by API quota"
description: "The MemoryArena answer accuracy harness can source .openai bench.env and reach the OpenAI Responses API, but the smoke run with gpt 4.1 mini failed before scoring because the API returned 429 insufficient quota. ChatGPT"
resource: "benchmarks/memoryarena-kage-answer.mjs"
tags: ["session-learning", "benchmark", "memoryarena", "openai", "quota", "negative-result"]
timestamp: "2026-05-18T05:41:45.238Z"
x-kage-id: "repo:https-github-com-kage-core-kage:negative_result:memoryarena-openai-answer-benchmark-blocked-by-api-quota-1779082905238"
x-kage-type: "negative_result"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["benchmarks/memoryarena-kage-answer.mjs", ".gitignore"]
---

# MemoryArena OpenAI answer benchmark blocked by API quota

> The MemoryArena answer accuracy harness can source .openai bench.env and reach the OpenAI Responses API, but the smok…

The MemoryArena answer-accuracy harness can source .openai-bench.env and reach the OpenAI Responses API, but the smoke run with gpt-4.1-mini failed before scoring because the API returned 429 insufficient_quota. ChatGPT login does not imply API quota; the OpenAI API project needs billing/quota before real MemoryArena answer accuracy can be measured.
Evidence: Command: set -a; source .openai-bench.env; set +a; node benchmarks/memoryarena-kage-answer.mjs --dataset /private/tmp/kage-memoryarena/progressive_search.jsonl --suite progressive_search --limit 1 --top-k 10 --provider openai --model gpt-4.1-mini --out /private/tmp/kage-memoryarena/progressive-search-kage-answer-openai-smoke.json. Error: OpenAI response failed: 429 insufficient_quota.
Verified by: API smoke run reached OpenAI and failed with 429 insufficient_quota; .openai-bench.env was added to .gitignore.

## Verification

Command: set -a; source .openai-bench.env; set +a; node benchmarks/memoryarena-kage-answer.mjs --dataset /private/tmp/kage-memoryarena/progressive_search.jsonl --suite progressive_search --limit 1 --top-k 10 --provider openai --model gpt-4.1-mini --out /private/tmp/kage-memoryarena/progressive-search-kage-answer-openai-smoke.json. Error: OpenAI response failed: 429 insufficient_quota.

# Citations

[1] explicit_capture (2026-05-18T05:41:45.238Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:negative_result:memoryarena-openai-answer-benchmark-blocked-by-api-quota-1779082905238","title":"MemoryArena OpenAI answer benchmark blocked by API quota","summary":"The MemoryArena answer accuracy harness can source .openai bench.env and reach the OpenAI Responses API, but the smoke run with gpt 4.1 mini failed before scoring because the API returned 429 insufficient quota. ChatGPT","body":"The MemoryArena answer-accuracy harness can source .openai-bench.env and reach the OpenAI Responses API, but the smoke run with gpt-4.1-mini failed before scoring because the API returned 429 insufficient_quota. ChatGPT login does not imply API quota; the OpenAI API project needs billing/quota before real MemoryArena answer accuracy can be measured.\nEvidence: Command: set -a; source .openai-bench.env; set +a; node benchmarks/memoryarena-kage-answer.mjs --dataset /private/tmp/kage-memoryarena/progressive_search.jsonl --suite progressive_search --limit 1 --top-k 10 --provider openai --model gpt-4.1-mini --out /private/tmp/kage-memoryarena/progressive-search-kage-answer-openai-smoke.json. Error: OpenAI response failed: 429 insufficient_quota.\nVerified by: API smoke run reached OpenAI and failed with 429 insufficient_quota; .openai-bench.env was added to .gitignore.","type":"negative_result","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","benchmark","memoryarena","openai","quota","negative-result"],"paths":["benchmarks/memoryarena-kage-answer.mjs",".gitignore"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-18T05:41:45.238Z"}],"context":{"fact":"The MemoryArena answer-accuracy harness can source .openai-bench.env and reach the OpenAI Responses API, but the smoke run with gpt-4.1-mini failed before scoring because the API returned 429 insufficient_quota. ChatGPT login does not imply API quota; the OpenAI API project needs billing/quota before real MemoryArena answer accuracy can be measured.\nEvidence: Command: set -a; source .openai-bench.env; set +a; node benchmarks/memoryarena-kage-answer.mjs --dataset /private/tmp/kage-memoryarena/progressive_search.jsonl --suite progressive_search --limit 1 --top-k 10 --provider openai --model gpt-4.1-mini --out /private/tmp/kage-memoryarena/progressive-search-kage-answer-openai-smoke.json. Error: OpenAI response failed: 429 insufficient_quota.\nVerified by: API smoke run reached OpenAI and failed with 429 insufficient_quota; .openai-bench.env was added to .gitignore.","verification":"Command: set -a; source .openai-bench.env; set +a; node benchmarks/memoryarena-kage-answer.mjs --dataset /private/tmp/kage-memoryarena/progressive_search.jsonl --suite progressive_search --limit 1 --top-k 10 --provider openai --model gpt-4.1-mini --out /private/tmp/kage-memoryarena/progressive-search-kage-answer-openai-smoke.json. Error: OpenAI response failed: 429 insufficient_quota."},"freshness":{"ttl_days":365,"last_verified_at":"2026-05-18T05:41:45.238Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":219,"total_uses":0},"created_at":"2026-05-18T05:41:45.238Z","updated_at":"2026-07-03T16:16:26.724Z"}
```

