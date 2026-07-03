---
type: "Decision"
title: "Contributor profiles stay local git intelligence"
description: "Kage contributors should uses repo-dashboard-style contributor profiles using only local git history and the existing code graph: commits, recent activity, touched files/modules, primary owned files, ownership silos, hotspot"
resource: "mcp/kernel.ts"
tags: ["session-learning", "contributors", "git-history", "repo-intelligence"]
timestamp: "2026-06-15T21:58:13.285Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:contributor-profiles-stay-local-git-intelligence-1778816813971"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/cli.ts", "mcp/index.ts", "mcp/daemon.ts", "mcp/kernel.test.ts", "mcp/mcp.test.ts", "README.md", "mcp/README.md", "docs/guide.html"]
---

# Contributor profiles stay local git intelligence

> Kage contributors should uses repo-dashboard-style contributor profiles using only local git history and the existing…

Kage contributors should uses repo-dashboard-style contributor profiles using only local git history and the existing code graph: commits, recent activity, touched files/modules, primary-owned files, ownership silos, hotspot ownership, and commit category mix. Expose it through CLI, MCP, viewer reports, and docs without contacting GitHub or adding a hosted database.

# Citations

[1] explicit_capture (2026-05-15T03:46:53.971Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:contributor-profiles-stay-local-git-intelligence-1778816813971","title":"Contributor profiles stay local git intelligence","summary":"Kage contributors should uses repo-dashboard-style contributor profiles using only local git history and the existing code graph: commits, recent activity, touched files/modules, primary owned files, ownership silos, hotspot","body":"Kage contributors should uses repo-dashboard-style contributor profiles using only local git history and the existing code graph: commits, recent activity, touched files/modules, primary-owned files, ownership silos, hotspot ownership, and commit category mix. Expose it through CLI, MCP, viewer reports, and docs without contacting GitHub or adding a hosted database.","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","contributors","git-history","repo-intelligence"],"paths":["mcp/kernel.ts","mcp/cli.ts","mcp/index.ts","mcp/daemon.ts","mcp/kernel.test.ts","mcp/mcp.test.ts","README.md","mcp/README.md","docs/guide.html"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-15T03:46:53.971Z"}],"context":{"fact":"Kage contributors should uses repo-dashboard-style contributor profiles using only local git history and the existing code graph: commits, recent activity, touched files/modules, primary-owned files, ownership silos, hotspot ownership, and commit category mix. Expose it through CLI, MCP, viewer reports, and docs without contacting GitHub or adding a hosted database."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:13.285Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"},{"name":"category","kind":"constant","sha256":"de5b1a1360d73520733ceb536ad6f643eff3a546282114b560cb208022570a5a"},{"name":"profiles","kind":"constant","sha256":"44fc778ade998864e5c7e4496ad0b7fa6a24e483fa4a68876b36c0db2c08ffae"},{"name":"owned","kind":"constant","sha256":"68108b21e8206384bf54d6c132cb94a11ccdbe8ae69ddf35883f62ccf5555423"},{"name":"hotspot","kind":"constant","sha256":"d94f6427028e0223b1fe04f004faf734b771f626adb0078ee8e07f7b42925f3e"}]},{"path":"mcp/cli.ts","sha256":"a670bc601e227372c9ab3e862f4e25fa87ae4bfa90b63c3bbc61032d332da0d7","size":114201},{"path":"mcp/index.ts","sha256":"d5abac0cb8d92d9074ae37a32ee515da8b03c43fe2d1a03d44447ee7b3493861","size":69453},{"path":"mcp/daemon.ts","sha256":"4d558ba09071b09ab3d1a62d40af04edf17609c9ea98a571405883424cc1bf2f","size":38423,"symbols":[{"name":"existing","kind":"constant","sha256":"b9b358748d6dc1c1d9ad2964f1b22b76b1c39935bd965ba3312dfd82aef5f87f"},{"name":"reports","kind":"constant","sha256":"519ba3efc1950f2775b99f1d94f37e91b5caf269d027aedf80130fb06e9737ce"},{"name":"files","kind":"constant","sha256":"69140299050f3544f2a8f5cdcfa3672dd7f2a78cf8960d3197b23624253b5b9e"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"activity","kind":"constant","sha256":"a80482c5192039511415530c1afdf046e38b61162b0bf9721c56a117d8b35880"}]},{"path":"mcp/mcp.test.ts","sha256":"3f5e52ad72a2a4b4db9e8de8bdad60cfb622ec132c2a278523ca6aad79538ec0","size":37910},{"path":"README.md","sha256":"9a533eee7962e84cdceef1bd8c9463233a575138fa143acafc8abd42f723944a","size":10477},{"path":"mcp/README.md","sha256":"5c852f608754e299c2cff74495862f1ce4775d0bda5776d7ce4f070f4e4a6494","size":10129},{"path":"docs/guide.html","sha256":"33b57e522b1a49e48631042940e2ca7d281084371c3feb3210604e213e0e7f28","size":51769}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":2,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":96,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":91,"reverified_at":"2026-06-15T21:58:13.285Z","total_uses":2,"last_accessed_at":"2026-07-02T12:26:17.750Z"},"created_at":"2026-05-15T03:46:53.971Z","updated_at":"2026-07-03T16:16:26.701Z"}
```

