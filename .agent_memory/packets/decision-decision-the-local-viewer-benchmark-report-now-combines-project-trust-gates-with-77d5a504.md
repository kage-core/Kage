---
type: "Decision"
title: "Decision: The local viewer benchmark report now combines project trust gates with the pack"
description: "Decision: The local viewer benchmark report now combines project trust gates with the packaged coding memory retrieval proof. startViewer writes .agent memory/reports/benchmark.json through viewerBenchmarkReport, preserv"
resource: "mcp/daemon.ts"
tags: ["session-learning", "viewer"]
timestamp: "2026-05-17T21:04:39.512Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:decision-the-local-viewer-benchmark-report-now-combines-project-trust-gates-with"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "verified"
x-kage-paths: ["mcp/daemon.ts"]
---

# Decision: The local viewer benchmark report now combines project trust gates with the pack

> Decision: The local viewer benchmark report now combines project trust gates with the packaged coding memory retrieva…

Decision: The local viewer benchmark report now combines project trust gates with the packaged coding-memory retrieval proof. startViewer writes .agent_memory/reports/benchmark.json through viewerBenchmarkReport, preserving benchmarkProject gates while adding summary and memory_quality from benchmarkCodingMemoryQuality. The viewer labels this as Retrieval proof rather than External retrieval so synthetic coding-memory proof is not misrepresented as an external benchmark. Why: dashboard users should see concrete retrieval quality and context reduction without manually running a separate script, while kage refresh remains lightweight. Verified by: npm test --prefix mcp; node --check mcp/viewer/app.js; node --check docs/viewer/app.js; local viewer generated benchmark.json with summary.recall_at_10_percent=100 and gates.length=4.

## Why

dashboard users should see concrete retrieval quality and context reduction without manually running a separate script, while kage refresh remains lightweight.

## Verification

npm test --prefix mcp; node --check mcp/viewer/app.js; node --check docs/viewer/app.js; local viewer generated benchmark.json with summary.recall_at_10_percent=100 and gates.length=4.

# Citations

[1] explicit_capture (2026-05-17T21:04:39.512Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:decision-the-local-viewer-benchmark-report-now-combines-project-trust-gates-with","title":"Decision: The local viewer benchmark report now combines project trust gates with the pack","summary":"Decision: The local viewer benchmark report now combines project trust gates with the packaged coding memory retrieval proof. startViewer writes .agent memory/reports/benchmark.json through viewerBenchmarkReport, preserv","body":"Decision: The local viewer benchmark report now combines project trust gates with the packaged coding-memory retrieval proof. startViewer writes .agent_memory/reports/benchmark.json through viewerBenchmarkReport, preserving benchmarkProject gates while adding summary and memory_quality from benchmarkCodingMemoryQuality. The viewer labels this as Retrieval proof rather than External retrieval so synthetic coding-memory proof is not misrepresented as an external benchmark. Why: dashboard users should see concrete retrieval quality and context reduction without manually running a separate script, while kage refresh remains lightweight. Verified by: npm test --prefix mcp; node --check mcp/viewer/app.js; node --check docs/viewer/app.js; local viewer generated benchmark.json with summary.recall_at_10_percent=100 and gates.length=4.","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","viewer"],"paths":["mcp/daemon.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-17T21:04:39.512Z"}],"context":{"fact":"The local viewer benchmark report now combines project trust gates with the packaged coding-memory retrieval proof. startViewer writes .agent_memory/reports/benchmark.json through viewerBenchmarkReport, preserving benchmarkProject gates while adding summary and memory_quality from benchmarkCodingMemoryQuality. The viewer labels this as Retrieval proof rather than External retrieval so synthetic coding-memory proof is not misrepresented as an external benchmark.","why":"dashboard users should see concrete retrieval quality and context reduction without manually running a separate script, while kage refresh remains lightweight.","verification":"npm test --prefix mcp; node --check mcp/viewer/app.js; node --check docs/viewer/app.js; local viewer generated benchmark.json with summary.recall_at_10_percent=100 and gates.length=4."},"freshness":{"ttl_days":365,"last_verified_at":"2026-05-17T21:04:39.512Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":210},"created_at":"2026-05-17T21:04:39.512Z","updated_at":"2026-05-19T04:50:14.901Z"}
```

