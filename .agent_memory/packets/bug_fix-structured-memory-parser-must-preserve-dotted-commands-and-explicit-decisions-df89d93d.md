---
type: "Bug Fix"
title: "Structured memory parser must preserve dotted commands and explicit decisions"
description: "Fact: Inline structured memory labels must be parsed up to the next known label instead of the next period. Why: Verification commands often contain dotted paths such as mcp/dist/cli.js, and truncating at a period loses"
resource: "mcp/kernel.ts"
tags: ["session-learning", "structured-memory", "parser", "type-inference", "bug-fix"]
timestamp: "2026-06-15T21:58:24.448Z"
x-kage-id: "repo:https-github-com-kage-core-kage:bug_fix:structured-memory-parser-must-preserve-dotted-commands-and-explicit-decisions-17"
x-kage-type: "bug_fix"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/kernel.test.ts"]
x-kage-stack: ["TypeScript", "Node.js"]
---

# Structured memory parser must preserve dotted commands and explicit decisions

> Fact: Inline structured memory labels must be parsed up to the next known label instead of the next period. Why: Veri…

Fact: Inline structured memory labels must be parsed up to the next known label instead of the next period. Why: Verification commands often contain dotted paths such as mcp/dist/cli.js, and truncating at a period loses the actual proof command. Trigger: When editing labeled memory parsing, kage_learn inference, or audit structured-context detection. Action: Use known-label boundaries for inline fields and make explicit Decision wording win before generic Why/Rationale classification. Verified by: npm test in mcp. Risk if forgotten: Kage may store or graph incomplete verification commands, and decision memories with Why sections may be misclassified as rationale.
Evidence: A new test with `node mcp/dist/cli.js audit --project . --json` first exposed command truncation risk, then adding Why to a Decision learning made `learn()` return rationale. Parser and classifier were fixed; npm test passed with 68/68.
Verified by: npm test in mcp

# Citations

[1] explicit_capture (2026-05-05T20:06:57.218Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:bug_fix:structured-memory-parser-must-preserve-dotted-commands-and-explicit-decisions-17","title":"Structured memory parser must preserve dotted commands and explicit decisions","summary":"Fact: Inline structured memory labels must be parsed up to the next known label instead of the next period. Why: Verification commands often contain dotted paths such as mcp/dist/cli.js, and truncating at a period loses","body":"Fact: Inline structured memory labels must be parsed up to the next known label instead of the next period. Why: Verification commands often contain dotted paths such as mcp/dist/cli.js, and truncating at a period loses the actual proof command. Trigger: When editing labeled memory parsing, kage_learn inference, or audit structured-context detection. Action: Use known-label boundaries for inline fields and make explicit Decision wording win before generic Why/Rationale classification. Verified by: npm test in mcp. Risk if forgotten: Kage may store or graph incomplete verification commands, and decision memories with Why sections may be misclassified as rationale.\nEvidence: A new test with `node mcp/dist/cli.js audit --project . --json` first exposed command truncation risk, then adding Why to a Decision learning made `learn()` return rationale. Parser and classifier were fixed; npm test passed with 68/68.\nVerified by: npm test in mcp","type":"bug_fix","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","structured-memory","parser","type-inference","bug-fix"],"paths":["mcp/kernel.ts","mcp/kernel.test.ts"],"stack":["TypeScript","Node.js"],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-05T20:06:57.218Z"}],"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:24.448Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"fact","kind":"constant","sha256":"adb9d6a773dc4dacf5613a3e7d4225436f1a23ff67de02659a247304284b10c6"},{"name":"explicit","kind":"constant","sha256":"3c7dc76a866b9617850dd05c43ef877cc5208ade5be761331cf32181ace414ff"},{"name":"labeled","kind":"constant","sha256":"fe36fb221f479a5ec32e2182365708b4784eca03ef5366d7fa2d20b8f58d1839"},{"name":"labels","kind":"constant","sha256":"778f0005621bcaee46c842df3c8fb0f762390050af67f84ae3ec5c3017c5e515"},{"name":"verification","kind":"constant","sha256":"faeb54eb75a6e60ebcab087f39fdd9f971c8a3a16e25846647ab2dd5802748f3"},{"name":"risk","kind":"constant","sha256":"d8cefa2e26411c9cf6d7857bd9ff15e58ab6ff3e5ed30b4531801e725978a06d"},{"name":"classification","kind":"constant","sha256":"927fc8de18049610c805b615506cb1dafd2154e87a7472f519232a0b824afe19"},{"name":"before","kind":"constant","sha256":"70c005bc3586ccb93799dfa1989dccca69b847916fd3fde1583578730922c50c"},{"name":"learn","kind":"function","sha256":"93c4e74f4a7d140c065b4eaa12b6ef14ffa68bfaee0cfc0a3e3773881af468d3"},{"name":"then","kind":"constant","sha256":"69e63ba481d1d2641d270176aed93aa51e363bcfe7c9903c448b032adf4c4129"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"},{"name":"sections","kind":"constant","sha256":"f96165e061f972c6c7da14d41a49d7170c382a34d2a9521577f92fae79b3731a"},{"name":"fixed","kind":"constant","sha256":"24c94f8af8d6bb9909e676bab33f87fca9b068e7ebf547b89b1ded262de468e1"},{"name":"when","kind":"constant","sha256":"48bfd58b3cdbf2d407e4443b90727d548d96eceaa4372c099dcd22c52f498452"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"store","kind":"constant","sha256":"50e13a48bdc07bc7254139dc46a208986d7363f394fb167c4dfebaff353e10fe"}]}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":1,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":237,"reverified_at":"2026-06-15T21:58:24.448Z","total_uses":1,"last_accessed_at":"2026-07-10T07:43:46.789Z"},"created_at":"2026-05-05T20:06:57.218Z","updated_at":"2026-07-03T16:16:26.689Z"}
```

