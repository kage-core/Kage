---
type: "Bug Fix"
title: "Linked-code reconciliation still uses source fingerprints after risk path parser fix"
description: "The risk path parser fix changes how git porcelain status paths are parsed for reports, but linked code memory reconciliation still relies on source hash fingerprint staleness for memory connected to changed files. If a"
resource: "mcp/kernel.ts"
tags: ["session-learning", "memory-reconciliation", "staleness", "risk"]
timestamp: "2026-06-15T21:58:07.146Z"
x-kage-id: "repo:https-github-com-kage-core-kage:bug_fix:linked-code-reconciliation-still-uses-source-fingerprints-after-risk-path-parser"
x-kage-type: "bug_fix"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "verified"
x-kage-paths: ["mcp/kernel.ts", "mcp/kernel.test.ts"]
---

# Linked-code reconciliation still uses source fingerprints after risk path parser fix

> The risk path parser fix changes how git porcelain status paths are parsed for reports, but linked code memory reconc…

The risk path parser fix changes how git porcelain status paths are parsed for reports, but linked-code memory reconciliation still relies on source-hash fingerprint staleness for memory connected to changed files. If a packet is tied to mcp/kernel.ts or mcp/kernel.test.ts, Kage refresh can mark it stale when those source hashes drift; agents must update or supersede that memory before PR handoff.
Evidence: After the parser fix and viewer UI patch, node mcp/dist/cli.js refresh --project . still reported linked path drift for old fingerprint-backed packets, proving the reconciliation model remains source-fingerprint based.
Verified by: npm test --prefix mcp -- daemon.test.js; node mcp/dist/cli.js refresh --project .

## Verification

After the parser fix and viewer UI patch, node mcp/dist/cli.js refresh --project . still reported linked path drift for old fingerprint-backed packets, proving the reconciliation model remains source-fingerprint based.

# Citations

[1] explicit_capture (2026-05-31T08:45:42.649Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:bug_fix:linked-code-reconciliation-still-uses-source-fingerprints-after-risk-path-parser","title":"Linked-code reconciliation still uses source fingerprints after risk path parser fix","summary":"The risk path parser fix changes how git porcelain status paths are parsed for reports, but linked code memory reconciliation still relies on source hash fingerprint staleness for memory connected to changed files. If a","body":"The risk path parser fix changes how git porcelain status paths are parsed for reports, but linked-code memory reconciliation still relies on source-hash fingerprint staleness for memory connected to changed files. If a packet is tied to mcp/kernel.ts or mcp/kernel.test.ts, Kage refresh can mark it stale when those source hashes drift; agents must update or supersede that memory before PR handoff.\nEvidence: After the parser fix and viewer UI patch, node mcp/dist/cli.js refresh --project . still reported linked path drift for old fingerprint-backed packets, proving the reconciliation model remains source-fingerprint based.\nVerified by: npm test --prefix mcp -- daemon.test.js; node mcp/dist/cli.js refresh --project .","type":"bug_fix","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","memory-reconciliation","staleness","risk"],"paths":["mcp/kernel.ts","mcp/kernel.test.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-31T08:45:42.649Z"}],"context":{"fact":"The risk path parser fix changes how git porcelain status paths are parsed for reports, but linked-code memory reconciliation still relies on source-hash fingerprint staleness for memory connected to changed files. If a packet is tied to mcp/kernel.ts or mcp/kernel.test.ts, Kage refresh can mark it stale when those source hashes drift; agents must update or supersede that memory before PR handoff.\nEvidence: After the parser fix and viewer UI patch, node mcp/dist/cli.js refresh --project . still reported linked path drift for old fingerprint-backed packets, proving the reconciliation model remains source-fingerprint based.\nVerified by: npm test --prefix mcp -- daemon.test.js; node mcp/dist/cli.js refresh --project .","verification":"After the parser fix and viewer UI patch, node mcp/dist/cli.js refresh --project . still reported linked path drift for old fingerprint-backed packets, proving the reconciliation model remains source-fingerprint based."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:07.146Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"},{"name":"mark","kind":"constant","sha256":"caf32f68e6d89f7a52f142c7e3e6bffcad465ab4bc6c4393a6c60f1710430f45"},{"name":"handoff","kind":"constant","sha256":"7ca82bf8dfe8bd9cc41cf7de6d3a0421c3753588836a81fddf5ba5e62ae2781f"},{"name":"risk","kind":"constant","sha256":"d8cefa2e26411c9cf6d7857bd9ff15e58ab6ff3e5ed30b4531801e725978a06d"},{"name":"before","kind":"constant","sha256":"70c005bc3586ccb93799dfa1989dccca69b847916fd3fde1583578730922c50c"},{"name":"after","kind":"constant","sha256":"220a1c1969c37d53268e215419dcea650ffa901162d0a25e451bd90831fb0a1b"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"},{"name":"when","kind":"constant","sha256":"48bfd58b3cdbf2d407e4443b90727d548d96eceaa4372c099dcd22c52f498452"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"packets","kind":"constant","sha256":"f28a69afbf5d7a988e351fc5446a3b291a2451f97b8220c4e1a7629b3a50ffa3"},{"name":"changed","kind":"constant","sha256":"8acd4ea8821c48290e59ddcd8f60fc34f9c721f4cc2c515fcff04820d8b159cd"},{"name":"supersede","kind":"constant","sha256":"3785fba4857300a9cf04157a7552a699255996c8e5db6bbe85b80271e324b839"},{"name":"fingerprints","kind":"constant","sha256":"b12217635fa19bdfc7ef493569889061dfab8dc5aa142873117717cbbce6caf1"},{"name":"reported","kind":"constant","sha256":"ec1c76f9f75507520a36a6adfea93b5399da6eb62bda8c7532b81519cf56b1ff"}]}]},"edges":[{"relation":"supersedes","to":"repo:https-github-com-kage-core-kage:bug_fix:linked-code-reconciliation-unchanged-after-skip-list-cleanup-1779546376043","evidence":"Updated after risk path parser fix; reconciliation remains source-fingerprint based.","created_at":"2026-05-31T08:46:12.217Z"}],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":181,"reverified_at":"2026-06-15T21:58:07.146Z"},"created_at":"2026-05-31T08:45:42.649Z","updated_at":"2026-06-15T21:58:07.146Z"}
```

