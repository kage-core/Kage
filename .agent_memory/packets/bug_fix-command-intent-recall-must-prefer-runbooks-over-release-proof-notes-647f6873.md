---
type: "Bug Fix"
title: "Command-intent recall must prefer runbooks over release proof notes"
description: "Fact: Command style queries such as how do I run tests must boost runbook and repo map packets and mildly penalize release/proof decisions that only mention verification commands. Why: BM25 alone can rank a release note"
resource: "mcp/kernel.ts"
tags: ["session-learning", "recall", "ranking", "runbook", "bm25"]
timestamp: "2026-06-15T21:58:34.840Z"
x-kage-id: "repo:https-github-com-kage-core-kage:bug_fix:command-intent-recall-must-prefer-runbooks-over-release-proof-notes-177803958381"
x-kage-type: "bug_fix"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/kernel.test.ts"]
---

# Command-intent recall must prefer runbooks over release proof notes

> Fact: Command style queries such as how do I run tests must boost runbook and repo map packets and mildly penalize re…

Fact: Command-style queries such as how do I run tests must boost runbook and repo-map packets and mildly penalize release/proof decisions that only mention verification commands. Why: BM25 alone can rank a release note above the actual runbook when the release note repeats npm test more often. Trigger: When changing recall ranking, benchmark scenarios, or command/runbook memory. Action: Preserve recallIntentBoost and regression coverage for runbook intent. Risk if forgotten: kage_context can pass benchmark gates while giving agents a top memory that proves tests ran instead of telling them how to run tests.
Evidence: Observed benchmark top_result for how do I run tests was Kage 1.1.8 adds stale memory GC before adding intent boost.
Verified by: npm test

## Why

BM25 alone can rank a release note above the actual runbook when the release note repeats npm test more often.

## Trigger

When changing recall ranking, benchmark scenarios, or command/runbook memory.

## Action

Preserve recallIntentBoost and regression coverage for runbook intent.

## Verification

Observed benchmark top_result for how do I run tests was Kage 1.1.8 adds stale memory GC before adding intent boost.

## Risk if forgotten

kage_context can pass benchmark gates while giving agents a top memory that proves tests ran instead of telling them how to run tests.

# Citations

[1] explicit_capture (2026-05-06T03:53:03.812Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:bug_fix:command-intent-recall-must-prefer-runbooks-over-release-proof-notes-177803958381","title":"Command-intent recall must prefer runbooks over release proof notes","summary":"Fact: Command style queries such as how do I run tests must boost runbook and repo map packets and mildly penalize release/proof decisions that only mention verification commands. Why: BM25 alone can rank a release note","body":"Fact: Command-style queries such as how do I run tests must boost runbook and repo-map packets and mildly penalize release/proof decisions that only mention verification commands. Why: BM25 alone can rank a release note above the actual runbook when the release note repeats npm test more often. Trigger: When changing recall ranking, benchmark scenarios, or command/runbook memory. Action: Preserve recallIntentBoost and regression coverage for runbook intent. Risk if forgotten: kage_context can pass benchmark gates while giving agents a top memory that proves tests ran instead of telling them how to run tests.\nEvidence: Observed benchmark top_result for how do I run tests was Kage 1.1.8 adds stale memory GC before adding intent boost.\nVerified by: npm test","type":"bug_fix","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","recall","ranking","runbook","bm25"],"paths":["mcp/kernel.ts","mcp/kernel.test.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-06T03:53:03.812Z"}],"context":{"fact":"Command-style queries such as how do I run tests must boost runbook and repo-map packets and mildly penalize release/proof decisions that only mention verification commands.","why":"BM25 alone can rank a release note above the actual runbook when the release note repeats npm test more often.","trigger":"When changing recall ranking, benchmark scenarios, or command/runbook memory.","action":"Preserve recallIntentBoost and regression coverage for runbook intent.","verification":"Observed benchmark top_result for how do I run tests was Kage 1.1.8 adds stale memory GC before adding intent boost.","risk_if_forgotten":"kage_context can pass benchmark gates while giving agents a top memory that proves tests ran instead of telling them how to run tests."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:34.840Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"fact","kind":"constant","sha256":"adb9d6a773dc4dacf5613a3e7d4225436f1a23ff67de02659a247304284b10c6"},{"name":"recallintentboost","kind":"function","sha256":"f9e4d9307e6ee9a2e15c3dddbbeedfb98a0640f54e38f5c9786536801a9f3d77"},{"name":"intent","kind":"constant","sha256":"3b69f45a6c78caa2dfa90d9f4c3b0b9b9ea67559d4df1b6f199ed8d7bb47cde9"},{"name":"verification","kind":"constant","sha256":"faeb54eb75a6e60ebcab087f39fdd9f971c8a3a16e25846647ab2dd5802748f3"},{"name":"risk","kind":"constant","sha256":"d8cefa2e26411c9cf6d7857bd9ff15e58ab6ff3e5ed30b4531801e725978a06d"},{"name":"before","kind":"constant","sha256":"70c005bc3586ccb93799dfa1989dccca69b847916fd3fde1583578730922c50c"},{"name":"scenarios","kind":"constant","sha256":"0169c661b5c94b7cd8cdc6f7d6affcdd6eb0cdb31711e5329a76350b1545c192"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"},{"name":"when","kind":"constant","sha256":"48bfd58b3cdbf2d407e4443b90727d548d96eceaa4372c099dcd22c52f498452"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"packets","kind":"constant","sha256":"f28a69afbf5d7a988e351fc5446a3b291a2451f97b8220c4e1a7629b3a50ffa3"},{"name":"benchmark","kind":"constant","sha256":"5671166b34f289b838cd462807715792f2dda03a9870f4ca9e846b6ddd5ce769"}]}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":1,"votes_down":0,"uses_30d":9,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":191,"reverified_at":"2026-06-15T21:58:34.840Z","total_uses":9,"last_accessed_at":"2026-07-06T19:36:01.810Z"},"created_at":"2026-05-06T03:53:03.812Z","updated_at":"2026-07-03T16:16:26.676Z"}
```

