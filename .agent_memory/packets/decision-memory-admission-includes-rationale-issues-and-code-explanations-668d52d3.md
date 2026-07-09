---
type: "Decision"
title: "Memory admission includes rationale, issues, and code explanations"
description: "Fact: Kage memory admission must not use \"would this change what a future agent does\" as the only gate. Source backed rationale, bug causes, issue state, decisions, and non obvious code explanations are durable memory ev"
resource: "AGENTS.md"
tags: ["session-learning", "memory-admission", "product-policy", "distillation", "rationale"]
timestamp: "2026-06-15T21:58:15.032Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:memory-admission-includes-rationale-issues-and-code-explanations-1778014131356"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["AGENTS.md", "docs/MEMORY_ADMISSION.md", "mcp/kernel.ts", "mcp/kernel.test.ts", "mcp/README.md", "README.md"]
---

# Memory admission includes rationale, issues, and code explanations

> Fact: Kage memory admission must not use "would this change what a future agent does" as the only gate. Source backed…

Fact: Kage memory admission must not use "would this change what a future agent does" as the only gate. Source-backed rationale, bug causes, issue state, decisions, and non-obvious code explanations are durable memory even when they primarily change what an agent understands before acting. Why: action-only phrasing discards exactly the context that prevents agents from undoing decisions, repeating bugs, or misreading code. Action: keep raw transcripts and routine command results episodic, but admit structured engineering context with provenance.
Evidence: User corrected the admission rule; implementation updated generated agent policy, admission docs, distillation heuristics, and tests for Code explanation and Issue context prompt observations.
Verified by: npm test

# Citations

[1] explicit_capture (2026-05-05T20:48:51.356Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:memory-admission-includes-rationale-issues-and-code-explanations-1778014131356","title":"Memory admission includes rationale, issues, and code explanations","summary":"Fact: Kage memory admission must not use \"would this change what a future agent does\" as the only gate. Source backed rationale, bug causes, issue state, decisions, and non obvious code explanations are durable memory ev","body":"Fact: Kage memory admission must not use \"would this change what a future agent does\" as the only gate. Source-backed rationale, bug causes, issue state, decisions, and non-obvious code explanations are durable memory even when they primarily change what an agent understands before acting. Why: action-only phrasing discards exactly the context that prevents agents from undoing decisions, repeating bugs, or misreading code. Action: keep raw transcripts and routine command results episodic, but admit structured engineering context with provenance.\nEvidence: User corrected the admission rule; implementation updated generated agent policy, admission docs, distillation heuristics, and tests for Code explanation and Issue context prompt observations.\nVerified by: npm test","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","memory-admission","product-policy","distillation","rationale"],"paths":["AGENTS.md","docs/MEMORY_ADMISSION.md","mcp/kernel.ts","mcp/kernel.test.ts","mcp/README.md","README.md"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-05T20:48:51.356Z"}],"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:15.032Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"AGENTS.md","sha256":"d1e074d6887bacd550f629c53dae432477ebedf6548b14765396a408a4544d3a","size":3427},{"path":"docs/MEMORY_ADMISSION.md","sha256":"48474e728f44a7b0c7ac8c72eda23dd0c13bdbfb291e5d7a0537d1d19fc1ea8d","size":4296},{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"fact","kind":"constant","sha256":"adb9d6a773dc4dacf5613a3e7d4225436f1a23ff67de02659a247304284b10c6"},{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"},{"name":"before","kind":"constant","sha256":"70c005bc3586ccb93799dfa1989dccca69b847916fd3fde1583578730922c50c"},{"name":"durable","kind":"constant","sha256":"3fa48acfe2e95fa0fcf831049f2d1aa3ddf26ddc5a1d10724db5da185389e634"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"},{"name":"admission","kind":"constant","sha256":"0893ed6ea3df19c962facf6604d66888220cd1a5c97243c88597187184870903"},{"name":"when","kind":"constant","sha256":"48bfd58b3cdbf2d407e4443b90727d548d96eceaa4372c099dcd22c52f498452"},{"name":"keep","kind":"constant","sha256":"3e5df93c6de57dbae093461e4198d2bc24bb055a50d3f6a8bd6449397fd00f3b"},{"name":"state","kind":"constant","sha256":"065fd1c87ce12edcfec7baca76dc9d91e35f5ea16490d33c8f85f3bdc3fee185"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"explanation","kind":"constant","sha256":"c10c132807eab421915bb9418c889e93360ed6e3665940873c3b46f9d5446940"},{"name":"issue","kind":"constant","sha256":"e588c193b4787ae8a3a2e9a91e0e30be327a5f1530fc90e3f937037feccda451"}]},{"path":"mcp/README.md","sha256":"5c852f608754e299c2cff74495862f1ce4775d0bda5776d7ce4f070f4e4a6494","size":10129},{"path":"README.md","sha256":"9a533eee7962e84cdceef1bd8c9463233a575138fa143acafc8abd42f723944a","size":10477}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":4,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":194,"reverified_at":"2026-06-15T21:58:15.032Z","total_uses":4,"last_accessed_at":"2026-07-09T06:07:27.155Z"},"created_at":"2026-05-05T20:48:51.356Z","updated_at":"2026-07-03T16:16:26.708Z"}
```

