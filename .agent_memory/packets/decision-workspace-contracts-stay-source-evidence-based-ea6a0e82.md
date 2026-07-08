---
type: "Decision"
title: "Workspace contracts stay source-evidence based"
description: "Kage workspace should uses repo-intelligence cross repo contract idea only where it can stay deterministic: use existing Kage route facts plus source string evidence from consumer repos to report provider/consumer route links"
resource: "mcp/kernel.ts"
tags: ["session-learning", "workspace", "contracts", "route-graph"]
timestamp: "2026-06-15T21:58:37.305Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:workspace-contracts-stay-source-evidence-based-1778789275421"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/cli.ts", "mcp/kernel.test.ts", "mcp/mcp.test.ts", "README.md", "mcp/README.md", "docs/guide.html"]
---

# Workspace contracts stay source-evidence based

> Kage workspace should uses repo-intelligence cross repo contract idea only where it can stay deterministic: use exist…

Kage workspace should uses repo-intelligence cross-repo contract idea only where it can stay deterministic: use existing Kage route facts plus source string evidence from consumer repos to report provider/consumer route links. Do not add generated API docs or a server database for this layer.
Verified by: npm test --prefix mcp

## Verification

npm test --prefix mcp

# Citations

[1] explicit_capture (2026-05-14T20:07:55.421Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:workspace-contracts-stay-source-evidence-based-1778789275421","title":"Workspace contracts stay source-evidence based","summary":"Kage workspace should uses repo-intelligence cross repo contract idea only where it can stay deterministic: use existing Kage route facts plus source string evidence from consumer repos to report provider/consumer route links","body":"Kage workspace should uses repo-intelligence cross-repo contract idea only where it can stay deterministic: use existing Kage route facts plus source string evidence from consumer repos to report provider/consumer route links. Do not add generated API docs or a server database for this layer.\nVerified by: npm test --prefix mcp","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","workspace","contracts","route-graph"],"paths":["mcp/kernel.ts","mcp/cli.ts","mcp/kernel.test.ts","mcp/mcp.test.ts","README.md","mcp/README.md","docs/guide.html"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-14T20:07:55.421Z"}],"context":{"fact":"Kage workspace should uses repo-intelligence cross-repo contract idea only where it can stay deterministic: use existing Kage route facts plus source string evidence from consumer repos to report provider/consumer route links. Do not add generated API docs or a server database for this layer.\nVerified by: npm test --prefix mcp","verification":"npm test --prefix mcp"},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:37.305Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"workspace","kind":"constant","sha256":"fc67e2dd3e7f4ea865d3e01787ca073218c159c6ee26d3ca83996fc9e32abd9e"},{"name":"server","kind":"constant","sha256":"5fd67f18035e46e58b653d1faddf541c198a3ed53d653138d4751f08353c0054"}]},{"path":"mcp/cli.ts","sha256":"a670bc601e227372c9ab3e862f4e25fa87ae4bfa90b63c3bbc61032d332da0d7","size":114201,"symbols":[{"name":"report","kind":"constant","sha256":"8d05d375165d2273c6ec769d9538b412b0d08e00b21207889ab726b110c4ab04"},{"name":"from","kind":"constant","sha256":"b386d829bcacbd9e216c726f6dff71fc7d8a53aade383fa45b850387414b780c"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"workspace","kind":"constant","sha256":"a9c07f9ec4904f44fdf36d8b1affd2e068f9ee1b6a8666b15672c523953db080"}]},{"path":"mcp/mcp.test.ts","sha256":"3f5e52ad72a2a4b4db9e8de8bdad60cfb622ec132c2a278523ca6aad79538ec0","size":37910,"symbols":[{"name":"workspace","kind":"constant","sha256":"033361cced4154835630cdaffbc5f7df66c4a8e2464fca7f55e3094aecd0e094"}]},{"path":"README.md","sha256":"9a533eee7962e84cdceef1bd8c9463233a575138fa143acafc8abd42f723944a","size":10477},{"path":"mcp/README.md","sha256":"5c852f608754e299c2cff74495862f1ce4775d0bda5776d7ce4f070f4e4a6494","size":10129},{"path":"docs/guide.html","sha256":"33b57e522b1a49e48631042940e2ca7d281084371c3feb3210604e213e0e7f28","size":51769}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":12,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":81,"reverified_at":"2026-06-15T21:58:37.305Z","total_uses":12,"last_accessed_at":"2026-07-06T19:36:35.685Z"},"created_at":"2026-05-14T20:07:55.421Z","updated_at":"2026-07-03T16:16:26.720Z"}
```

