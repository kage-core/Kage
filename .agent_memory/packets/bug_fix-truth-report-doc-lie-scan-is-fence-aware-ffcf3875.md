---
type: "Bug Fix"
title: "Truth Report doc-lie scan is fence-aware"
description: "The truth report's doc lie scan in mcp/kernel.ts tracks fenced code block state while collecting docLines each line carries the enclosing fence's info string, null in prose . Decision: path existence checks skip ALL fenc"
resource: "mcp/kernel.ts"
tags: ["session-learning", "truth-report", "doc-lie", "scan", "false-positive"]
timestamp: "2026-06-15T21:57:53.650Z"
x-kage-id: "repo:https-github-com-kage-core-kage:bug_fix:truth-report-doc-lie-scan-is-fence-aware-1781191819344"
x-kage-type: "bug_fix"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/kernel.test.ts"]
---

# Truth Report doc-lie scan is fence-aware

> The truth report's doc lie scan in mcp/kernel.ts tracks fenced code block state while collecting docLines each line c…

The truth report's doc-lie scan in mcp/kernel.ts tracks fenced code-block state while collecting docLines (each line carries the enclosing fence's info string, null in prose). Decision: path-existence checks skip ALL fenced blocks (fenced content is code samples or quoted output, not prose claims about repo layout — e.g. README ```text blocks quoting Truth Report output from other repos caused false positives like lib/response.js). Command checks (npm run, CLI subcommands) still run inside shell-style fences because those are runnable instructions against this repo, but skip output-style fences listed in TRUTH_OUTPUT_FENCE_INFOS (text/txt/plain/plaintext/console/output/log/logs). Covered by the kernel.test.ts test "truth report doc-lie scan skips paths quoted inside fenced code blocks".
Verified by: cd mcp && npm run build && npm test (200 pass); node dist/cli.js scan --project .. no longer flags README sample blocks, still flags docs/BENCHMARKS.md broken links

# Citations

[1] explicit_capture (2026-06-11T15:30:19.344Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:bug_fix:truth-report-doc-lie-scan-is-fence-aware-1781191819344","title":"Truth Report doc-lie scan is fence-aware","summary":"The truth report's doc lie scan in mcp/kernel.ts tracks fenced code block state while collecting docLines each line carries the enclosing fence's info string, null in prose . Decision: path existence checks skip ALL fenc","body":"The truth report's doc-lie scan in mcp/kernel.ts tracks fenced code-block state while collecting docLines (each line carries the enclosing fence's info string, null in prose). Decision: path-existence checks skip ALL fenced blocks (fenced content is code samples or quoted output, not prose claims about repo layout — e.g. README ```text blocks quoting Truth Report output from other repos caused false positives like lib/response.js). Command checks (npm run, CLI subcommands) still run inside shell-style fences because those are runnable instructions against this repo, but skip output-style fences listed in TRUTH_OUTPUT_FENCE_INFOS (text/txt/plain/plaintext/console/output/log/logs). Covered by the kernel.test.ts test \"truth report doc-lie scan skips paths quoted inside fenced code blocks\".\nVerified by: cd mcp && npm run build && npm test (200 pass); node dist/cli.js scan --project .. no longer flags README sample blocks, still flags docs/BENCHMARKS.md broken links","type":"bug_fix","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","truth-report","doc-lie","scan","false-positive"],"paths":["mcp/kernel.ts","mcp/kernel.test.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-06-11T15:30:19.344Z"}],"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:57:53.650Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"readme","kind":"constant","sha256":"aa0f002dd3f57a6ca1e42c5aba625151268ed600bbbd7582f93a0a0bc7714404"},{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"},{"name":"doclines","kind":"constant","sha256":"067964f2e07bb124994daecc35613d7468d76f5199457881cbc8ae7c955aa2e0"},{"name":"fence","kind":"constant","sha256":"9fb69bce5a7c9e07a7d7bef5df29aba19e65861ab16d4cff75ea3f0f1ff4d978"},{"name":"prose","kind":"constant","sha256":"570d1549dc852a511096fb2055e7e1f1a834049430cf322b73d634413c8ff9b8"},{"name":"skip","kind":"constant","sha256":"84ce913f797ae6f1160ffe3c80d4f9852f31f1ce9c118d5e1a8be145e564b569"},{"name":"state","kind":"constant","sha256":"065fd1c87ce12edcfec7baca76dc9d91e35f5ea16490d33c8f85f3bdc3fee185"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"plain","kind":"constant","sha256":"17bc6a930403f5f0aab4c077a806b44aae44e78241b7ed75ba8385ed48ad3b03"},{"name":"block","kind":"constant","sha256":"0d5a18486daa1bf0551606173de332fbb51d44808bbbaf97560dd6a843388b08"},{"name":"other","kind":"constant","sha256":"87c3104ea91adea004af3ba9984cfa2ad1e0b494b531fa5408096edd0df87f43"}]}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":12,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":244,"reverified_at":"2026-06-15T21:57:53.650Z","total_uses":12,"last_accessed_at":"2026-07-09T06:34:29.304Z"},"created_at":"2026-06-11T15:30:19.344Z","updated_at":"2026-07-03T16:16:26.689Z"}
```

