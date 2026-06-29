---
type: "Runbook"
title: "Truth Report detectors: lead with reliably-firing signal"
description: "kage scan's original 5 detectors duplicate cluster, ghost export, bus factor, knowledge void, doc lie were tuned so strict that on most real repos only the tautological knowledge void fired, so the report read as 'found"
resource: "mcp/kernel.ts"
tags: ["session-learning"]
timestamp: "2026-06-29T11:59:24.221Z"
x-kage-id: "repo:https-github-com-kage-core-kage:runbook:truth-report-detectors-lead-with-reliably-firing-signal-1781524351131"
x-kage-type: "runbook"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "verified"
x-kage-paths: ["mcp/kernel.ts", "mcp/cli.ts"]
---

# Truth Report detectors: lead with reliably-firing signal

> kage scan's original 5 detectors duplicate cluster, ghost export, bus factor, knowledge void, doc lie were tuned so s…

kage scan's original 5 detectors (duplicate_cluster, ghost_export, bus_factor, knowledge_void, doc_lie) were tuned so strict that on most real repos only the tautological knowledge_void fired, so the report read as 'found nothing'. Fix in truthReport() (mcp/kernel.ts): added three detectors that reliably fire on any codebase with real cited signal — untested_hot (central+churned source file no test imports or covers; needs hasTests, centrality>=5, commits>=2), complexity_hotspot (line_count>=400 with centrality>=3, or >=800 lines), and debt_marker (TODO/FIXME/HACK/XXX/@deprecated counted in top-400 files by centrality). Headline (mcp/kernel.ts) now lists only non-zero categories; CLI (mcp/cli.ts) reframes zero categories as a 'Clean:' reassurance line instead of leading zeros. Do NOT loosen the strict duplicate/ghost/doc-lie thresholds (they exist to avoid the false positives fixed in task #34).
Verified by: scan run on express/got/chalk/lodash + 341 tests pass

## Verification

scan run on express/got/chalk/lodash + 341 tests pass

# Citations

[1] explicit_capture (2026-06-15T11:52:31.131Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:runbook:truth-report-detectors-lead-with-reliably-firing-signal-1781524351131","title":"Truth Report detectors: lead with reliably-firing signal","summary":"kage scan's original 5 detectors duplicate cluster, ghost export, bus factor, knowledge void, doc lie were tuned so strict that on most real repos only the tautological knowledge void fired, so the report read as 'found","body":"kage scan's original 5 detectors (duplicate_cluster, ghost_export, bus_factor, knowledge_void, doc_lie) were tuned so strict that on most real repos only the tautological knowledge_void fired, so the report read as 'found nothing'. Fix in truthReport() (mcp/kernel.ts): added three detectors that reliably fire on any codebase with real cited signal — untested_hot (central+churned source file no test imports or covers; needs hasTests, centrality>=5, commits>=2), complexity_hotspot (line_count>=400 with centrality>=3, or >=800 lines), and debt_marker (TODO/FIXME/HACK/XXX/@deprecated counted in top-400 files by centrality). Headline (mcp/kernel.ts) now lists only non-zero categories; CLI (mcp/cli.ts) reframes zero categories as a 'Clean:' reassurance line instead of leading zeros. Do NOT loosen the strict duplicate/ghost/doc-lie thresholds (they exist to avoid the false positives fixed in task #34).\nVerified by: scan run on express/got/chalk/lodash + 341 tests pass","type":"runbook","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning"],"paths":["mcp/kernel.ts","mcp/cli.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-06-15T11:52:31.131Z"}],"context":{"fact":"kage scan's original 5 detectors (duplicate_cluster, ghost_export, bus_factor, knowledge_void, doc_lie) were tuned so strict that on most real repos only the tautological knowledge_void fired, so the report read as 'found nothing'. Fix in truthReport() (mcp/kernel.ts): added three detectors that reliably fire on any codebase with real cited signal — untested_hot (central+churned source file no test imports or covers; needs hasTests, centrality>=5, commits>=2), complexity_hotspot (line_count>=400 with centrality>=3, or >=800 lines), and debt_marker (TODO/FIXME/HACK/XXX/@deprecated counted in top-400 files by centrality). Headline (mcp/kernel.ts) now lists only non-zero categories; CLI (mcp/cli.ts) reframes zero categories as a 'Clean:' reassurance line instead of leading zeros. Do NOT loosen the strict duplicate/ghost/doc-lie thresholds (they exist to avoid the false positives fixed in task #34).\nVerified by: scan run on express/got/chalk/lodash + 341 tests pass","verification":"scan run on express/got/chalk/lodash + 341 tests pass"},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-29T11:59:24.221Z","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"47e354c97fb903fa7825729fbdb9d1be271f1df13e6fc9fcaf203227588ff438","size":872822,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"clean","kind":"function","sha256":"17cd330796a719d520826491a73ab88f886668a6f03c7ab8c85530d9cb3a996d"},{"name":"truthreport","kind":"function","sha256":"e036d75134eed78ba2e1f3acc4c97ef2549ffe9838c00a6b17e0d9888968e8d4"},{"name":"centrality","kind":"constant","sha256":"23a606d61f709af4956f6f635ac6c16961eeca424364869f2a546d42f404d65a"},{"name":"hastests","kind":"constant","sha256":"790b309e136806fad730cc01324f74925b7470bf6a9ecfb0df79f6fc7ddb0a23"},{"name":"read","kind":"constant","sha256":"ffe49534fbcdb7c556f32fa5120c3dd4c00fce60f148c94f79d0d94d71145efd"},{"name":"categories","kind":"constant","sha256":"e72c016fb290f97d7843e7e5887029979c49cbd26917cc73399ebb6e9bb45522"},{"name":"central","kind":"constant","sha256":"cadb605ec607c15b376bd7ca7283743fcccb5f45190467501d6fc27be9363760"},{"name":"fixed","kind":"constant","sha256":"24c94f8af8d6bb9909e676bab33f87fca9b068e7ebf547b89b1ded262de468e1"}]},{"path":"mcp/cli.ts","sha256":"b89ada934834e665b69f706e4dfb46eb4225429457c9482d99a45dd89d7f2b42","size":120522,"symbols":[{"name":"report","kind":"constant","sha256":"8d05d375165d2273c6ec769d9538b412b0d08e00b21207889ab726b110c4ab04"}]}],"path_fingerprint_policy":"source_hash_staleness","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"discovery_tokens":2000,"discovery_tokens_estimated":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":244,"reverified_at":"2026-06-29T11:59:24.221Z"},"created_at":"2026-06-15T11:52:31.131Z","updated_at":"2026-06-29T11:59:24.221Z","author_branch":"master"}
```

