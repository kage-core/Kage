---
type: "Decision"
title: "Release 1.1.4 ambient policy and Claude hooks"
description: "Release 1.1.4 updates the ambient agent policy and Claude Code hooks so Codex/Claude are instructed to run kage refresh after meaningful file changes, kage pr summarize or kage propose from diff before final handoff, and"
resource: "AGENTS.md"
tags: ["session-learning", "release", "claude-code", "codex", "hooks", "policy", "refresh", "pr-check"]
timestamp: "2026-06-15T21:58:01.716Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:release-1-1-4-ambient-policy-and-claude-hooks-1777780063870"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["AGENTS.md", "CLAUDE.md", "mcp/kernel.ts", "mcp/kernel.test.ts", "README.md"]
---

# Release 1.1.4 ambient policy and Claude hooks

> Release 1.1.4 updates the ambient agent policy and Claude Code hooks so Codex/Claude are instructed to run kage refre…

Release 1.1.4 updates the ambient agent policy and Claude Code hooks so Codex/Claude are instructed to run kage_refresh after meaningful file changes, kage_pr_summarize or kage_propose_from_diff before final handoff, and kage_pr_check before merge-readiness claims. Claude setup now writes both SessionStart and Stop hooks; the Stop hook best-effort refreshes repo graphs and creates PR summary memory when git changes exist. Verified by npm test and npm publish.
Verified by: npm test; npm pack --dry-run; npm publish

# Citations

[1] explicit_capture (2026-05-03T03:47:43.870Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:release-1-1-4-ambient-policy-and-claude-hooks-1777780063870","title":"Release 1.1.4 ambient policy and Claude hooks","summary":"Release 1.1.4 updates the ambient agent policy and Claude Code hooks so Codex/Claude are instructed to run kage refresh after meaningful file changes, kage pr summarize or kage propose from diff before final handoff, and","body":"Release 1.1.4 updates the ambient agent policy and Claude Code hooks so Codex/Claude are instructed to run kage_refresh after meaningful file changes, kage_pr_summarize or kage_propose_from_diff before final handoff, and kage_pr_check before merge-readiness claims. Claude setup now writes both SessionStart and Stop hooks; the Stop hook best-effort refreshes repo graphs and creates PR summary memory when git changes exist. Verified by npm test and npm publish.\nVerified by: npm test; npm pack --dry-run; npm publish","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","release","claude-code","codex","hooks","policy","refresh","pr-check"],"paths":["AGENTS.md","CLAUDE.md","mcp/kernel.ts","mcp/kernel.test.ts","README.md"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-03T03:47:43.870Z"}],"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:01.716Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"AGENTS.md","sha256":"d1e074d6887bacd550f629c53dae432477ebedf6548b14765396a408a4544d3a","size":3427},{"path":"CLAUDE.md","sha256":"d1e074d6887bacd550f629c53dae432477ebedf6548b14765396a408a4544d3a","size":3427},{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"summarize","kind":"function","sha256":"add7c65e848288e0da5633a88ce2fb32445aad7ae524b58b7f291604c733888d"},{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"final","kind":"constant","sha256":"3708518ab34f3096f41253903144e997a6c64f08ba425b1d1c57562018568c7b"},{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"},{"name":"handoff","kind":"constant","sha256":"7ca82bf8dfe8bd9cc41cf7de6d3a0421c3753588836a81fddf5ba5e62ae2781f"},{"name":"graphs","kind":"constant","sha256":"5483925183f5f71c1681f32dbf4b745a68dc9fc52cb81abcc8410e5ad02b3dac"},{"name":"before","kind":"constant","sha256":"70c005bc3586ccb93799dfa1989dccca69b847916fd3fde1583578730922c50c"},{"name":"after","kind":"constant","sha256":"220a1c1969c37d53268e215419dcea650ffa901162d0a25e451bd90831fb0a1b"},{"name":"hooks","kind":"constant","sha256":"7291847ee5dfe9b56b32a270d8bb6309f5740dde9443103ede1b01a377155e78"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"},{"name":"when","kind":"constant","sha256":"48bfd58b3cdbf2d407e4443b90727d548d96eceaa4372c099dcd22c52f498452"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"claude","kind":"constant","sha256":"30e40d593cb285fac2f86d1766fed1b16495cc38548f9b27af90a180acfac1d6"}]},{"path":"README.md","sha256":"9a533eee7962e84cdceef1bd8c9463233a575138fa143acafc8abd42f723944a","size":10477}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":1,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":260,"reverified_at":"2026-06-15T21:58:01.716Z","total_uses":1,"last_accessed_at":"2026-07-09T21:45:43.205Z"},"created_at":"2026-05-03T03:47:43.870Z","updated_at":"2026-07-03T16:16:26.715Z"}
```

