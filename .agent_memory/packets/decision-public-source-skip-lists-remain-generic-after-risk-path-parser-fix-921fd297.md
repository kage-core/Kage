---
type: "Decision"
title: "Public source skip lists remain generic after risk path parser fix"
description: "The current kernel change fixes git porcelain path parsing for changed file risk reports and does not reintroduce external tool specific skip names. Public source skip logic should continue using generic generated/depend"
resource: "mcp/kernel.ts"
tags: ["session-learning", "public-source", "risk", "path-parsing"]
timestamp: "2026-06-15T21:58:40.856Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:public-source-skip-lists-remain-generic-after-risk-path-parser-fix-1780217154439"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/kernel.test.ts"]
---

# Public source skip lists remain generic after risk path parser fix

> The current kernel change fixes git porcelain path parsing for changed file risk reports and does not reintroduce ext…

The current kernel change fixes git porcelain path parsing for changed-file risk reports and does not reintroduce external-tool-specific skip names. Public source skip logic should continue using generic generated/dependency directory names only, while report path parsing should preserve real project paths such as mcp/cli.ts instead of trimming them to cp/cli.ts.
Evidence: The regression test in mcp/kernel.test.ts asserts changedReport.targets['src/core.js'] exists and changedReport.targets['rc/core.js'] is undefined after parsePorcelainPath replaced line.slice(3).
Verified by: npm test --prefix mcp -- daemon.test.js; node mcp/dist/cli.js refresh --project .

## Verification

The regression test in mcp/kernel.test.ts asserts changedReport.targets['src/core.js'] exists and changedReport.targets['rc/core.js'] is undefined after parsePorcelainPath replaced line.slice(3).

# Citations

[1] explicit_capture (2026-05-31T08:45:54.439Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:public-source-skip-lists-remain-generic-after-risk-path-parser-fix-1780217154439","title":"Public source skip lists remain generic after risk path parser fix","summary":"The current kernel change fixes git porcelain path parsing for changed file risk reports and does not reintroduce external tool specific skip names. Public source skip logic should continue using generic generated/depend","body":"The current kernel change fixes git porcelain path parsing for changed-file risk reports and does not reintroduce external-tool-specific skip names. Public source skip logic should continue using generic generated/dependency directory names only, while report path parsing should preserve real project paths such as mcp/cli.ts instead of trimming them to cp/cli.ts.\nEvidence: The regression test in mcp/kernel.test.ts asserts changedReport.targets['src/core.js'] exists and changedReport.targets['rc/core.js'] is undefined after parsePorcelainPath replaced line.slice(3).\nVerified by: npm test --prefix mcp -- daemon.test.js; node mcp/dist/cli.js refresh --project .","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","public-source","risk","path-parsing"],"paths":["mcp/kernel.ts","mcp/kernel.test.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-31T08:45:54.439Z"}],"context":{"fact":"The current kernel change fixes git porcelain path parsing for changed-file risk reports and does not reintroduce external-tool-specific skip names. Public source skip logic should continue using generic generated/dependency directory names only, while report path parsing should preserve real project paths such as mcp/cli.ts instead of trimming them to cp/cli.ts.\nEvidence: The regression test in mcp/kernel.test.ts asserts changedReport.targets['src/core.js'] exists and changedReport.targets['rc/core.js'] is undefined after parsePorcelainPath replaced line.slice(3).\nVerified by: npm test --prefix mcp -- daemon.test.js; node mcp/dist/cli.js refresh --project .","verification":"The regression test in mcp/kernel.test.ts asserts changedReport.targets['src/core.js'] exists and changedReport.targets['rc/core.js'] is undefined after parsePorcelainPath replaced line.slice(3)."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:40.856Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"parseporcelainpath","kind":"function","sha256":"a08da812c1c25fc40108627499f50e815f9aad3b54406eaebbfb7edaac79ed95"},{"name":"slice","kind":"constant","sha256":"7292f670b32ecfbbf7334e778494f6d8c6edf6f09dc768bc524df481d4e40b94"},{"name":"risk","kind":"constant","sha256":"d8cefa2e26411c9cf6d7857bd9ff15e58ab6ff3e5ed30b4531801e725978a06d"},{"name":"after","kind":"constant","sha256":"220a1c1969c37d53268e215419dcea650ffa901162d0a25e451bd90831fb0a1b"},{"name":"exists","kind":"constant","sha256":"6e189541e5576d06e12aa58020ef745bc5b3fb28d4371336d421eb5bc4ab9af8"},{"name":"skip","kind":"constant","sha256":"84ce913f797ae6f1160ffe3c80d4f9852f31f1ce9c118d5e1a8be145e564b569"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"changedreport","kind":"constant","sha256":"685473d546c2a8303a34208f95668e5e15010f716963efa689d10bdaf83490a3"},{"name":"changed","kind":"constant","sha256":"8acd4ea8821c48290e59ddcd8f60fc34f9c721f4cc2c515fcff04820d8b159cd"},{"name":"targets","kind":"constant","sha256":"5aa65f0166a610def83e25d42b5b6c3ecab6283b3a3686a4b9766fad0fcce885"},{"name":"real","kind":"constant","sha256":"856bf47487b3742dc24d08df1d5fbdb66e78329577cae25b2d31af5ccc9aade1"},{"name":"replaced","kind":"constant","sha256":"b626c19ff8756e0ae179f5ce3a9f919a30620d921fd348209bde06cd963650b2"}]}]},"edges":[{"relation":"supersedes","to":"repo:https-github-com-kage-core-kage:decision:public-source-avoids-external-tool-specific-skip-names-1779546321185","evidence":"Updated after risk path parser fix; public skip-list decision remains generic.","created_at":"2026-05-31T08:46:12.218Z"}],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":4,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":167,"reverified_at":"2026-06-15T21:58:40.856Z","total_uses":4,"last_accessed_at":"2026-07-06T18:28:23.401Z"},"created_at":"2026-05-31T08:45:54.439Z","updated_at":"2026-07-03T16:16:26.711Z"}
```

