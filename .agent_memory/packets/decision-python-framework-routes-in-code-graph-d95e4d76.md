---
type: "Decision"
title: "Python framework routes in code graph"
description: "Kage code graph now extracts Python framework routes for FastAPI/APIRouter decorators, Flask @app.route methods lists, and Django path/re path declarations. Route params are normalized to :param so recall and viewer rout"
resource: "mcp/kernel.ts"
tags: ["session-learning", "code-graph", "python-routes", "frameworks", "release"]
timestamp: "2026-06-15T21:58:00.164Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:python-framework-routes-in-code-graph-1778820514857"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "verified"
x-kage-paths: ["mcp/kernel.ts", "mcp/kernel.test.ts", "README.md", "mcp/README.md", "docs/guide.html", "docs/releases.html", "CHANGELOG.md"]
---

# Python framework routes in code graph

> Kage code graph now extracts Python framework routes for FastAPI/APIRouter decorators, Flask @app.route methods lists…

Kage code graph now extracts Python framework routes for FastAPI/APIRouter decorators, Flask @app.route methods lists, and Django path/re_path declarations. Route params are normalized to :param so recall and viewer route facts compare consistently across frameworks. Verified by npm test --prefix mcp and npm pack --dry-run for 1.1.28.
Verified by: npm test --prefix mcp; npm pack --dry-run

## Verification

npm test --prefix mcp; npm pack --dry-run

# Citations

[1] explicit_capture (2026-05-15T04:48:34.857Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:python-framework-routes-in-code-graph-1778820514857","title":"Python framework routes in code graph","summary":"Kage code graph now extracts Python framework routes for FastAPI/APIRouter decorators, Flask @app.route methods lists, and Django path/re path declarations. Route params are normalized to :param so recall and viewer rout","body":"Kage code graph now extracts Python framework routes for FastAPI/APIRouter decorators, Flask @app.route methods lists, and Django path/re_path declarations. Route params are normalized to :param so recall and viewer route facts compare consistently across frameworks. Verified by npm test --prefix mcp and npm pack --dry-run for 1.1.28.\nVerified by: npm test --prefix mcp; npm pack --dry-run","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","code-graph","python-routes","frameworks","release"],"paths":["mcp/kernel.ts","mcp/kernel.test.ts","README.md","mcp/README.md","docs/guide.html","docs/releases.html","CHANGELOG.md"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-15T04:48:34.857Z"}],"context":{"fact":"Kage code graph now extracts Python framework routes for FastAPI/APIRouter decorators, Flask @app.route methods lists, and Django path/re_path declarations. Route params are normalized to :param so recall and viewer route facts compare consistently across frameworks. Verified by npm test --prefix mcp and npm pack --dry-run for 1.1.28.\nVerified by: npm test --prefix mcp; npm pack --dry-run","verification":"npm test --prefix mcp; npm pack --dry-run"},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:00.164Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"framework","kind":"constant","sha256":"cb381325be9217683b113006f82ffbcd46b3baf69b1a4be3620de53b07f1ad3b"},{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526},{"path":"README.md","sha256":"9a533eee7962e84cdceef1bd8c9463233a575138fa143acafc8abd42f723944a","size":10477},{"path":"mcp/README.md","sha256":"5c852f608754e299c2cff74495862f1ce4775d0bda5776d7ce4f070f4e4a6494","size":10129},{"path":"docs/guide.html","sha256":"33b57e522b1a49e48631042940e2ca7d281084371c3feb3210604e213e0e7f28","size":51769},{"path":"docs/releases.html","sha256":"140753f257c74e24bb1a62c3ab5c5ff165c9cfb5ac6501645be913eab1e03a88","size":11134},{"path":"CHANGELOG.md","sha256":"1d00aff932a74d380dad6e0d60ae0aed37e40aa5a03ae7ec0acb71f824d0ef0c","size":46022}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":98,"reverified_at":"2026-06-15T21:58:00.164Z"},"created_at":"2026-05-15T04:48:34.857Z","updated_at":"2026-06-15T21:58:00.164Z"}
```

