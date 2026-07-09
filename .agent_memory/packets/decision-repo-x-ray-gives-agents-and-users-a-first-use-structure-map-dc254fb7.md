---
type: "Decision"
title: "Repo X-Ray gives agents and users a first-use structure map"
description: "Kage now exposes Repo X Ray as a first use orientation layer that combines entry points, core modules, risk signals, tests, memory overlay, and knowledge gaps. The X Ray risk layer must filter generated memory paths such"
resource: "mcp/kernel.ts"
tags: ["session-learning", "repo-xray", "viewer", "first-use", "memory", "risk"]
timestamp: "2026-06-15T21:58:41.781Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:repo-x-ray-gives-agents-and-users-a-first-use-structure-map-1780175077969"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/index.ts", "mcp/daemon.ts", "mcp/cli.ts", "mcp/kernel.test.ts", "mcp/mcp.test.ts", "mcp/daemon.test.ts"]
---

# Repo X-Ray gives agents and users a first-use structure map

> Kage now exposes Repo X Ray as a first use orientation layer that combines entry points, core modules, risk signals, …

Kage now exposes Repo X-Ray as a first-use orientation layer that combines entry points, core modules, risk signals, tests, memory overlay, and knowledge gaps. The X-Ray risk layer must filter generated memory paths such as .agent_memory so the user sees actionable code/module risk, not Kage bookkeeping noise.
Evidence: npm test --prefix mcp passed 173 tests; browser smoke on http://127.0.0.1:3128/ showed #repoXray visible with 6 layers, script 'I mapped your repo.', no .agent_memory risk noise, and no item overflow after CSS wrapping fix.
Verified by: npm test --prefix mcp; git diff --check; in-app browser smoke on local viewer

## Verification

npm test --prefix mcp passed 173 tests; browser smoke on http://127.0.0.1:3128/ showed #repoXray visible with 6 layers, script 'I mapped your repo.', no .agent_memory risk noise, and no item overflow after CSS wrapping fix.

# Citations

[1] explicit_capture (2026-05-30T21:04:37.969Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:repo-x-ray-gives-agents-and-users-a-first-use-structure-map-1780175077969","title":"Repo X-Ray gives agents and users a first-use structure map","summary":"Kage now exposes Repo X Ray as a first use orientation layer that combines entry points, core modules, risk signals, tests, memory overlay, and knowledge gaps. The X Ray risk layer must filter generated memory paths such","body":"Kage now exposes Repo X-Ray as a first-use orientation layer that combines entry points, core modules, risk signals, tests, memory overlay, and knowledge gaps. The X-Ray risk layer must filter generated memory paths such as .agent_memory so the user sees actionable code/module risk, not Kage bookkeeping noise.\nEvidence: npm test --prefix mcp passed 173 tests; browser smoke on http://127.0.0.1:3128/ showed #repoXray visible with 6 layers, script 'I mapped your repo.', no .agent_memory risk noise, and no item overflow after CSS wrapping fix.\nVerified by: npm test --prefix mcp; git diff --check; in-app browser smoke on local viewer","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","repo-xray","viewer","first-use","memory","risk"],"paths":["mcp/kernel.ts","mcp/index.ts","mcp/daemon.ts","mcp/cli.ts","mcp/kernel.test.ts","mcp/mcp.test.ts","mcp/daemon.test.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-30T21:04:37.969Z"}],"context":{"fact":"Kage now exposes Repo X-Ray as a first-use orientation layer that combines entry points, core modules, risk signals, tests, memory overlay, and knowledge gaps. The X-Ray risk layer must filter generated memory paths such as .agent_memory so the user sees actionable code/module risk, not Kage bookkeeping noise.\nEvidence: npm test --prefix mcp passed 173 tests; browser smoke on http://127.0.0.1:3128/ showed #repoXray visible with 6 layers, script 'I mapped your repo.', no .agent_memory risk noise, and no item overflow after CSS wrapping fix.\nVerified by: npm test --prefix mcp; git diff --check; in-app browser smoke on local viewer","verification":"npm test --prefix mcp passed 173 tests; browser smoke on http://127.0.0.1:3128/ showed #repoXray visible with 6 layers, script 'I mapped your repo.', no .agent_memory risk noise, and no item overflow after CSS wrapping fix."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:41.781Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"structure","kind":"constant","sha256":"bf718f9bf54a313f6d7d7d837a0c15da3f32eab535a998be32b659b6d1d9b3ce"},{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"},{"name":"risk","kind":"constant","sha256":"d8cefa2e26411c9cf6d7857bd9ff15e58ab6ff3e5ed30b4531801e725978a06d"},{"name":"layers","kind":"constant","sha256":"f67e208d2f8aee744280b58d7bbfcfd596408b109f8da241bb9284d912197643"},{"name":"after","kind":"constant","sha256":"220a1c1969c37d53268e215419dcea650ffa901162d0a25e451bd90831fb0a1b"},{"name":"module","kind":"constant","sha256":"35d71d6c76896280072befc51e5b4bf9673ffd01c30c4ea7942cee265c5b5d3d"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"}]},{"path":"mcp/index.ts","sha256":"d5abac0cb8d92d9074ae37a32ee515da8b03c43fe2d1a03d44447ee7b3493861","size":69453},{"path":"mcp/daemon.ts","sha256":"4d558ba09071b09ab3d1a62d40af04edf17609c9ea98a571405883424cc1bf2f","size":38423},{"path":"mcp/cli.ts","sha256":"a670bc601e227372c9ab3e862f4e25fa87ae4bfa90b63c3bbc61032d332da0d7","size":114201},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"structure","kind":"constant","sha256":"f60b9908654ca2ff71e7337900d421fab57f358a2060a8648c070247d73f543c"},{"name":"module","kind":"constant","sha256":"dc5a2e5ef2e1b90bde21e834d505abeb7a30ea5b0ffab273efd614333fd318cd"},{"name":"overlay","kind":"constant","sha256":"cfdba230ce317731e73fca5175ad4d220014bb679635cbe510ce3cf98f8f8edb"},{"name":"filter","kind":"constant","sha256":"f9235dbf87bd46a2346156a8d2fb71b581cb2a4e68085cbe25e3db0e2f04ed4a"}]},{"path":"mcp/mcp.test.ts","sha256":"3f5e52ad72a2a4b4db9e8de8bdad60cfb622ec132c2a278523ca6aad79538ec0","size":37910,"symbols":[{"name":"core","kind":"constant","sha256":"57cd814974b6f0449f12266cd73c5483d34372211de55cf8791e1bdb7253b0b2"},{"name":"check","kind":"constant","sha256":"620d8c4c121a80c990afb6b6c9d3145a945f6c38957782dcfc0b0632ffe8c087"}]},{"path":"mcp/daemon.test.ts","sha256":"ef48ce8b21ff33ed39379a9be695f863280d552399973a742c0e3932c21bfe1e","size":12250}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":20,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":159,"reverified_at":"2026-06-15T21:58:41.781Z","total_uses":34,"last_accessed_at":"2026-07-09T06:01:25.582Z"},"created_at":"2026-05-30T21:04:37.969Z","updated_at":"2026-07-03T16:16:26.716Z"}
```

