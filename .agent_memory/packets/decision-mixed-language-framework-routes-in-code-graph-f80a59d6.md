---
type: "Decision"
title: "Mixed-language framework routes in code graph"
description: "Kage code graph now extracts mixed language web framework routes for Rails, Laravel, Spring, Go routers, Rust routers, and ASP.NET in addition to Node/Express/Next and Python frameworks. The implementation uses bounded s"
resource: "mcp/kernel.ts"
tags: ["session-learning", "code-graph", "frameworks", "mixed-language", "routes", "release"]
timestamp: "2026-06-15T21:58:01.415Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:mixed-language-framework-routes-in-code-graph-1778820930541"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/kernel.test.ts", "README.md", "mcp/README.md", "docs/guide.html", "docs/releases.html", "CHANGELOG.md"]
---

# Mixed-language framework routes in code graph

> Kage code graph now extracts mixed language web framework routes for Rails, Laravel, Spring, Go routers, Rust routers…

Kage code graph now extracts mixed-language web framework routes for Rails, Laravel, Spring, Go routers, Rust routers, and ASP.NET in addition to Node/Express/Next and Python frameworks. The implementation uses bounded static route patterns inside extractRoutes so large-repo indexing stays lightweight while surfacing common web entrypoints in mixed-language repos. Verified by npm test --prefix mcp and npm pack --dry-run for 1.1.29.
Verified by: npm test --prefix mcp; npm pack --dry-run

## Verification

npm test --prefix mcp; npm pack --dry-run

# Citations

[1] explicit_capture (2026-05-15T04:55:30.540Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:mixed-language-framework-routes-in-code-graph-1778820930541","title":"Mixed-language framework routes in code graph","summary":"Kage code graph now extracts mixed language web framework routes for Rails, Laravel, Spring, Go routers, Rust routers, and ASP.NET in addition to Node/Express/Next and Python frameworks. The implementation uses bounded s","body":"Kage code graph now extracts mixed-language web framework routes for Rails, Laravel, Spring, Go routers, Rust routers, and ASP.NET in addition to Node/Express/Next and Python frameworks. The implementation uses bounded static route patterns inside extractRoutes so large-repo indexing stays lightweight while surfacing common web entrypoints in mixed-language repos. Verified by npm test --prefix mcp and npm pack --dry-run for 1.1.29.\nVerified by: npm test --prefix mcp; npm pack --dry-run","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","code-graph","frameworks","mixed-language","routes","release"],"paths":["mcp/kernel.ts","mcp/kernel.test.ts","README.md","mcp/README.md","docs/guide.html","docs/releases.html","CHANGELOG.md"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-15T04:55:30.540Z"}],"context":{"fact":"Kage code graph now extracts mixed-language web framework routes for Rails, Laravel, Spring, Go routers, Rust routers, and ASP.NET in addition to Node/Express/Next and Python frameworks. The implementation uses bounded static route patterns inside extractRoutes so large-repo indexing stays lightweight while surfacing common web entrypoints in mixed-language repos. Verified by npm test --prefix mcp and npm pack --dry-run for 1.1.29.\nVerified by: npm test --prefix mcp; npm pack --dry-run","verification":"npm test --prefix mcp; npm pack --dry-run"},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:01.415Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"bounded","kind":"constant","sha256":"c3fc17594c058db2e1a1b9e8f33161d89ca175cd31aebed17389c75ac6709d43"},{"name":"extractroutes","kind":"function","sha256":"f896a91e845e287266c7e385afe93541b0bb79538a28303615717073fcb47763"},{"name":"framework","kind":"constant","sha256":"cb381325be9217683b113006f82ffbcd46b3baf69b1a4be3620de53b07f1ad3b"},{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"bounded","kind":"constant","sha256":"ff3f5c301d4311bd4d0787b820a1c3835be8ee14fbdb641eb003dbf14ffce58a"}]},{"path":"README.md","sha256":"9a533eee7962e84cdceef1bd8c9463233a575138fa143acafc8abd42f723944a","size":10477},{"path":"mcp/README.md","sha256":"5c852f608754e299c2cff74495862f1ce4775d0bda5776d7ce4f070f4e4a6494","size":10129},{"path":"docs/guide.html","sha256":"33b57e522b1a49e48631042940e2ca7d281084371c3feb3210604e213e0e7f28","size":51769},{"path":"docs/releases.html","sha256":"140753f257c74e24bb1a62c3ab5c5ff165c9cfb5ac6501645be913eab1e03a88","size":11134},{"path":"CHANGELOG.md","sha256":"1d00aff932a74d380dad6e0d60ae0aed37e40aa5a03ae7ec0acb71f824d0ef0c","size":46022}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":5,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":123,"reverified_at":"2026-06-15T21:58:01.415Z","total_uses":5,"last_accessed_at":"2026-07-06T19:12:20.768Z"},"created_at":"2026-05-15T04:55:30.540Z","updated_at":"2026-07-03T16:16:26.709Z"}
```

