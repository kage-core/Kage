---
type: "Decision"
title: "Codex demo should show recall, code graph, and activation proof"
description: "When demonstrating Kage with Codex, show three concrete steps: kage recall for repo memory, kage code graph for source derived context, and kage setup verify agent for activation proof. If verify agent reports mcp tool r"
resource: "AGENTS.md"
tags: ["session-learning", "codex", "demo", "activation", "ambient-memory"]
timestamp: "2026-06-15T21:57:55.846Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:codex-demo-should-show-recall-code-graph-and-activation-proof-1777873299017"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["AGENTS.md", "mcp/kernel.ts", "README.md"]
---

# Codex demo should show recall, code graph, and activation proof

> When demonstrating Kage with Codex, show three concrete steps: kage recall for repo memory, kage code graph for sourc…

When demonstrating Kage with Codex, show three concrete steps: kage recall for repo memory, kage code-graph for source-derived context, and kage setup verify-agent for activation proof. If verify-agent reports mcp_tool_reachable=false, present it honestly as an installed-but-dormant session that needs Codex restart/MCP reload rather than claiming live MCP usage.
Evidence: This Codex demo recalled setup memory, queried setupAgent/code graph, and verify-agent returned config_present=true, policy_installed=true, recall_works=true, code_graph_works=true, mcp_tool_reachable=false.
Verified by: kage recall; kage code-graph; kage setup verify-agent --agent codex --project . --json

# Citations

[1] explicit_capture (2026-05-04T05:41:39.017Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:codex-demo-should-show-recall-code-graph-and-activation-proof-1777873299017","title":"Codex demo should show recall, code graph, and activation proof","summary":"When demonstrating Kage with Codex, show three concrete steps: kage recall for repo memory, kage code graph for source derived context, and kage setup verify agent for activation proof. If verify agent reports mcp tool r","body":"When demonstrating Kage with Codex, show three concrete steps: kage recall for repo memory, kage code-graph for source-derived context, and kage setup verify-agent for activation proof. If verify-agent reports mcp_tool_reachable=false, present it honestly as an installed-but-dormant session that needs Codex restart/MCP reload rather than claiming live MCP usage.\nEvidence: This Codex demo recalled setup memory, queried setupAgent/code graph, and verify-agent returned config_present=true, policy_installed=true, recall_works=true, code_graph_works=true, mcp_tool_reachable=false.\nVerified by: kage recall; kage code-graph; kage setup verify-agent --agent codex --project . --json","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","codex","demo","activation","ambient-memory"],"paths":["AGENTS.md","mcp/kernel.ts","README.md"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-04T05:41:39.017Z"}],"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:57:55.846Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"AGENTS.md","sha256":"d1e074d6887bacd550f629c53dae432477ebedf6548b14765396a408a4544d3a","size":3427},{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"usage","kind":"constant","sha256":"52472b18f8c657c18e2dd6ed0ee31a90cd58734c517a6bd2168ba2b787eae0ad"},{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"},{"name":"verify","kind":"constant","sha256":"a52f5b45a4f358248075422f84ac83e7d291e8e7acb866eeabdb692896bc9c0d"},{"name":"setupagent","kind":"function","sha256":"0ad3f8f44b973a13b0272e373fee8ac6519f790c0c2dcfafee9c84fe12850444"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"},{"name":"present","kind":"constant","sha256":"b0fc5057457202bcbc10dd345333192f2bfeefdd0cd200d8c52d37c6444a3435"},{"name":"when","kind":"constant","sha256":"48bfd58b3cdbf2d407e4443b90727d548d96eceaa4372c099dcd22c52f498452"},{"name":"show","kind":"constant","sha256":"a1286db8e7ca4067e360ba4fb6da776faab1a9b50a1ce06dd8efb185376816f6"}]},{"path":"README.md","sha256":"9a533eee7962e84cdceef1bd8c9463233a575138fa143acafc8abd42f723944a","size":10477}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":171,"reverified_at":"2026-06-15T21:57:55.846Z","total_uses":0,"last_accessed_at":"2026-07-09T06:07:27.155Z"},"created_at":"2026-05-04T05:41:39.017Z","updated_at":"2026-07-03T16:16:26.701Z"}
```

