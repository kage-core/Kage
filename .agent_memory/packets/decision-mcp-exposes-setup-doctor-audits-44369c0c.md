---
type: "Decision"
title: "MCP exposes setup doctor audits"
description: "Kage now exposes setup doctor through MCP as kage setup doctor. Agents can audit supported agent setup and Claude Code ambient hook readiness without shelling out, matching the CLI setup doctor output. This extends the A"
resource: "mcp/index.ts"
tags: ["session-learning", "mcp", "setup-doctor", "claude-code", "hooks"]
timestamp: "2026-06-15T21:58:02.020Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:mcp-exposes-setup-doctor-audits-1779060160033"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/index.ts", "mcp/mcp.test.ts", "README.md", "mcp/README.md", "docs/guide.html"]
---

# MCP exposes setup doctor audits

> Kage now exposes setup doctor through MCP as kage setup doctor. Agents can audit supported agent setup and Claude Cod…

Kage now exposes setup doctor through MCP as kage_setup_doctor. Agents can audit supported-agent setup and Claude Code ambient hook readiness without shelling out, matching the CLI setup doctor output. This extends the Kage-native install-proof work to the MCP surface agents actually use.
Verified by: npm test --prefix mcp -- --test-name-pattern 'MCP setup, quality, benchmark, observe, and distill tools work|MCP lists repo-local memory tools'

## Verification

npm test --prefix mcp -- --test-name-pattern 'MCP setup, quality, benchmark, observe, and distill tools work|MCP lists repo-local memory tools'

# Citations

[1] explicit_capture (2026-05-17T23:22:40.033Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:mcp-exposes-setup-doctor-audits-1779060160033","title":"MCP exposes setup doctor audits","summary":"Kage now exposes setup doctor through MCP as kage setup doctor. Agents can audit supported agent setup and Claude Code ambient hook readiness without shelling out, matching the CLI setup doctor output. This extends the A","body":"Kage now exposes setup doctor through MCP as kage_setup_doctor. Agents can audit supported-agent setup and Claude Code ambient hook readiness without shelling out, matching the CLI setup doctor output. This extends the Kage-native install-proof work to the MCP surface agents actually use.\nVerified by: npm test --prefix mcp -- --test-name-pattern 'MCP setup, quality, benchmark, observe, and distill tools work|MCP lists repo-local memory tools'","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","mcp","setup-doctor","claude-code","hooks"],"paths":["mcp/index.ts","mcp/mcp.test.ts","README.md","mcp/README.md","docs/guide.html"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-17T23:22:40.033Z"}],"context":{"fact":"Kage now exposes setup doctor through MCP as kage_setup_doctor. Agents can audit supported-agent setup and Claude Code ambient hook readiness without shelling out, matching the CLI setup doctor output. This extends the Kage-native install-proof work to the MCP surface agents actually use.\nVerified by: npm test --prefix mcp -- --test-name-pattern 'MCP setup, quality, benchmark, observe, and distill tools work|MCP lists repo-local memory tools'","verification":"npm test --prefix mcp -- --test-name-pattern 'MCP setup, quality, benchmark, observe, and distill tools work|MCP lists repo-local memory tools'"},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:02.020Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/index.ts","sha256":"d5abac0cb8d92d9074ae37a32ee515da8b03c43fe2d1a03d44447ee7b3493861","size":69453},{"path":"mcp/mcp.test.ts","sha256":"3f5e52ad72a2a4b4db9e8de8bdad60cfb622ec132c2a278523ca6aad79538ec0","size":37910,"symbols":[{"name":"setup","kind":"constant","sha256":"ada7211745ab22b88e9fa86b08bb0caf1253f5c0d3e52c0e126f14aa9e66fb5d"},{"name":"doctor","kind":"constant","sha256":"230a3a54455be361b9239e7f8261f896561e52b9d796b7e5cdfaccd55001eecc"},{"name":"quality","kind":"constant","sha256":"92c75b7705be31ad8a9e20da51ea9897efd2687645385bd4845f115c2823dfc8"},{"name":"benchmark","kind":"constant","sha256":"f2624166d82120234a3c356d41ef4e92279a1f7aff6550be272fcab217fdb260"}]},{"path":"README.md","sha256":"9a533eee7962e84cdceef1bd8c9463233a575138fa143acafc8abd42f723944a","size":10477},{"path":"mcp/README.md","sha256":"5c852f608754e299c2cff74495862f1ce4775d0bda5776d7ce4f070f4e4a6494","size":10129},{"path":"docs/guide.html","sha256":"33b57e522b1a49e48631042940e2ca7d281084371c3feb3210604e213e0e7f28","size":51769}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":1,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":114,"reverified_at":"2026-06-15T21:58:02.020Z","total_uses":0,"last_accessed_at":"2026-07-08T21:12:08.038Z"},"created_at":"2026-05-17T23:22:40.033Z","updated_at":"2026-07-03T16:16:26.707Z"}
```

