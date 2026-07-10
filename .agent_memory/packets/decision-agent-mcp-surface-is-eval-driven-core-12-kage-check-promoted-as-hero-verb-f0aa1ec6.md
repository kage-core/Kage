---
type: "Decision"
title: "Agent MCP surface is eval-driven: core=12, kage_check promoted as hero verb"
description: "The default agent facing MCP tool surface CORE TOOLS in mcp/index.ts, returned by listTools unless KAGE TOOLS=full/KAGE ALL TOOLS=1 is now 12 tools: kage check, kage context, kage learn, kage supersede, kage feedback, ka"
resource: "mcp/index.ts"
tags: ["session-learning", "mcp-surface", "core-tools", "kage-check"]
timestamp: "2026-07-03T06:26:34.078Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:agent-mcp-surface-is-eval-driven-core-12-kage-check-promoted-as-hero-verb-178305"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/index.ts", "mcp/mcp.test.ts", "mcp/check.ts"]
---

# Agent MCP surface is eval-driven: core=12, kage_check promoted as hero verb

> The default agent facing MCP tool surface CORE TOOLS in mcp/index.ts, returned by listTools unless KAGE TOOLS=full/KA…

The default agent-facing MCP tool surface (CORE_TOOLS in mcp/index.ts, returned by listTools unless KAGE_TOOLS=full/KAGE_ALL_TOOLS=1) is now 12 tools: kage_check, kage_context, kage_learn, kage_supersede, kage_feedback, kage_pr_check, kage_refresh, kage_skills, kage_risk, kage_decisions, kage_dependency_path, kage_docs_search. kage_check was added 2026-07-03 as the product's hero verb (drift verification of agent-context files, counted not estimated); it is read-only, carries the Glama-TDQS-style full param descriptions and annotations block like every other core tool, and is asserted by the surface test in mcp/mcp.test.ts. The surface remains deliberately curated — operator/diagnostic tools (kage_metrics, kage_xray) still do not leak into the default surface.
Evidence: CORE_TOOLS set in mcp/index.ts; mcp.test.ts "MCP default tool surface is the agent-facing core only" updated and passing
Verified by: npm test: 376 pass 0 fail including the core-surface assertion

## Verification

CORE_TOOLS set in mcp/index.ts; mcp.test.ts "MCP default tool surface is the agent-facing core only" updated and passing

# Citations

[1] explicit_capture (2026-07-03T06:26:34.078Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:agent-mcp-surface-is-eval-driven-core-12-kage-check-promoted-as-hero-verb-178305","title":"Agent MCP surface is eval-driven: core=12, kage_check promoted as hero verb","summary":"The default agent facing MCP tool surface CORE TOOLS in mcp/index.ts, returned by listTools unless KAGE TOOLS=full/KAGE ALL TOOLS=1 is now 12 tools: kage check, kage context, kage learn, kage supersede, kage feedback, ka","body":"The default agent-facing MCP tool surface (CORE_TOOLS in mcp/index.ts, returned by listTools unless KAGE_TOOLS=full/KAGE_ALL_TOOLS=1) is now 12 tools: kage_check, kage_context, kage_learn, kage_supersede, kage_feedback, kage_pr_check, kage_refresh, kage_skills, kage_risk, kage_decisions, kage_dependency_path, kage_docs_search. kage_check was added 2026-07-03 as the product's hero verb (drift verification of agent-context files, counted not estimated); it is read-only, carries the Glama-TDQS-style full param descriptions and annotations block like every other core tool, and is asserted by the surface test in mcp/mcp.test.ts. The surface remains deliberately curated — operator/diagnostic tools (kage_metrics, kage_xray) still do not leak into the default surface.\nEvidence: CORE_TOOLS set in mcp/index.ts; mcp.test.ts \"MCP default tool surface is the agent-facing core only\" updated and passing\nVerified by: npm test: 376 pass 0 fail including the core-surface assertion","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","mcp-surface","core-tools","kage-check"],"paths":["mcp/index.ts","mcp/mcp.test.ts","mcp/check.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-07-03T06:26:34.078Z"}],"context":{"fact":"The default agent-facing MCP tool surface (CORE_TOOLS in mcp/index.ts, returned by listTools unless KAGE_TOOLS=full/KAGE_ALL_TOOLS=1) is now 12 tools: kage_check, kage_context, kage_learn, kage_supersede, kage_feedback, kage_pr_check, kage_refresh, kage_skills, kage_risk, kage_decisions, kage_dependency_path, kage_docs_search. kage_check was added 2026-07-03 as the product's hero verb (drift verification of agent-context files, counted not estimated); it is read-only, carries the Glama-TDQS-style full param descriptions and annotations block like every other core tool, and is asserted by the surface test in mcp/mcp.test.ts. The surface remains deliberately curated — operator/diagnostic tools (kage_metrics, kage_xray) still do not leak into the default surface.\nEvidence: CORE_TOOLS set in mcp/index.ts; mcp.test.ts \"MCP default tool surface is the agent-facing core only\" updated and passing\nVerified by: npm test: 376 pass 0 fail including the core-surface assertion","verification":"CORE_TOOLS set in mcp/index.ts; mcp.test.ts \"MCP default tool surface is the agent-facing core only\" updated and passing"},"freshness":{"ttl_days":365,"last_verified_at":"2026-07-03T06:26:34.078Z","path_fingerprints":[{"path":"mcp/index.ts","sha256":"468fd426b18d5add82329e76be15a7f048ace72d377728605c0aa376b8842af2","size":75862,"symbols":[{"name":"core_tools","kind":"constant","sha256":"3772d9a5dca8c47bc3d74d8396f44a47f27acd0cf09365d76b6af7fabf935b2d"},{"name":"listtools","kind":"function","sha256":"2309a601263df388889723959571f6ed1c207198dbdbdacead29a8a66ffea8a2"},{"name":"index","kind":"constant","sha256":"ad98a75521fc0edce4fed6c6cd0503a41df66728efc44c4c3904db6a6ac89d7f"}]},{"path":"mcp/mcp.test.ts","sha256":"e1e33da2ead7342b13f4dc95f8194cf1ec9cbe3b951360b651e907d1d2c6c634","size":38105,"symbols":[{"name":"core","kind":"constant","sha256":"57cd814974b6f0449f12266cd73c5483d34372211de55cf8791e1bdb7253b0b2"},{"name":"tool","kind":"constant","sha256":"c730b2f983ea9b4965a3ae0d8eec26c8af27380cfb28c180ae2d9f2493727d7b"},{"name":"context","kind":"constant","sha256":"94e5c3947ba282a9ec60de88384111292e685f5f46509d61ddf1eadfab8915da"},{"name":"check","kind":"constant","sha256":"620d8c4c121a80c990afb6b6c9d3145a945f6c38957782dcfc0b0632ffe8c087"}]},{"path":"mcp/check.ts","sha256":"b624cefdb8f2a0b018d07d34b6da9a969fbc57660405c6145f164442ad2d9d47","size":29864,"symbols":[{"name":"files","kind":"constant","sha256":"9097d05bc008bb898f0241936453315fdfe25a312832915a8f070cc75ed68083"},{"name":"verified","kind":"constant","sha256":"6b951ec6612b0fe292b3c678ba8789041061382ca15c22cfc8658b3ad43cd12c"},{"name":"evidence","kind":"constant","sha256":"1ee27540857821a59d13ec3959246e81dede3afcace29315221729223b18026e"}]}],"path_fingerprint_policy":"source_hash_staleness","verification":"repo_local_agent_capture"},"edges":[{"relation":"supersedes","to":"repo:https-github-com-kage-core-kage:decision:agent-mcp-surface-is-eval-driven-core-11-kage-code-graph-deleted-1781464149960","evidence":"Newer repo memory supersedes this packet.","created_at":"2026-07-03T06:27:18.853Z"}],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"discovery_tokens":4000,"discovery_tokens_estimated":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":245,"total_uses":0,"last_accessed_at":"2026-07-06T19:36:35.586Z"},"created_at":"2026-07-03T06:26:34.078Z","updated_at":"2026-07-03T16:16:26.699Z","author_branch":"master"}
```

