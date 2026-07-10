---
type: "Decision"
title: "Workspace topic contracts stay deterministic"
description: "Kage workspace topic/event contract detection should stay deterministic and source evidence based. Detect common publish/subscribe style first string argument topics across sibling repos, exclude route like and URL like"
resource: "mcp/kernel.ts"
tags: ["session-learning", "workspace", "contracts", "topic-events", "viewer"]
timestamp: "2026-06-15T21:57:54.281Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:workspace-topic-contracts-stay-deterministic-1778823117147"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/kernel.test.ts", "mcp/cli.ts", "mcp/index.ts", "README.md", "mcp/README.md", "docs/guide.html", "docs/releases.html", "CHANGELOG.md"]
---

# Workspace topic contracts stay deterministic

> Kage workspace topic/event contract detection should stay deterministic and source evidence based. Detect common publ…

Kage workspace topic/event contract detection should stay deterministic and source-evidence based. Detect common publish/subscribe style first-string-argument topics across sibling repos, exclude route-like and URL-like strings, report producer/consumer links in JSON, CLI text, and viewer summaries, and avoid adding a hosted database or generated API docs for this layer.
Verified by: npm test --prefix mcp; node --check mcp/viewer/app.js; node --check docs/viewer/app.js; git diff --check; npm pack --dry-run

## Verification

npm test --prefix mcp; node --check mcp/viewer/app.js; node --check docs/viewer/app.js; git diff --check; npm pack --dry-run

# Citations

[1] explicit_capture (2026-05-15T05:31:57.147Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:workspace-topic-contracts-stay-deterministic-1778823117147","title":"Workspace topic contracts stay deterministic","summary":"Kage workspace topic/event contract detection should stay deterministic and source evidence based. Detect common publish/subscribe style first string argument topics across sibling repos, exclude route like and URL like","body":"Kage workspace topic/event contract detection should stay deterministic and source-evidence based. Detect common publish/subscribe style first-string-argument topics across sibling repos, exclude route-like and URL-like strings, report producer/consumer links in JSON, CLI text, and viewer summaries, and avoid adding a hosted database or generated API docs for this layer.\nVerified by: npm test --prefix mcp; node --check mcp/viewer/app.js; node --check docs/viewer/app.js; git diff --check; npm pack --dry-run","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","workspace","contracts","topic-events","viewer"],"paths":["mcp/kernel.ts","mcp/kernel.test.ts","mcp/cli.ts","mcp/index.ts","README.md","mcp/README.md","docs/guide.html","docs/releases.html","CHANGELOG.md"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-15T05:31:57.147Z"}],"context":{"fact":"Kage workspace topic/event contract detection should stay deterministic and source-evidence based. Detect common publish/subscribe style first-string-argument topics across sibling repos, exclude route-like and URL-like strings, report producer/consumer links in JSON, CLI text, and viewer summaries, and avoid adding a hosted database or generated API docs for this layer.\nVerified by: npm test --prefix mcp; node --check mcp/viewer/app.js; node --check docs/viewer/app.js; git diff --check; npm pack --dry-run","verification":"npm test --prefix mcp; node --check mcp/viewer/app.js; node --check docs/viewer/app.js; git diff --check; npm pack --dry-run"},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:57:54.281Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"workspace","kind":"constant","sha256":"fc67e2dd3e7f4ea865d3e01787ca073218c159c6ee26d3ca83996fc9e32abd9e"},{"name":"topics","kind":"constant","sha256":"7b90b6c0c23d693aca0b257cad4b9caf99cc36d412a582e07dd745eacd4efd1a"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"workspace","kind":"constant","sha256":"a9c07f9ec4904f44fdf36d8b1affd2e068f9ee1b6a8666b15672c523953db080"},{"name":"event","kind":"constant","sha256":"2b2afdcafe3566b9833fbb23b5f036b65560d8a02f16a3d16a8725e4698da223"}]},{"path":"mcp/cli.ts","sha256":"a670bc601e227372c9ab3e862f4e25fa87ae4bfa90b63c3bbc61032d332da0d7","size":114201,"symbols":[{"name":"report","kind":"constant","sha256":"8d05d375165d2273c6ec769d9538b412b0d08e00b21207889ab726b110c4ab04"},{"name":"json","kind":"constant","sha256":"9115381310c6d4c5ecb25a7e67e4fd0bb4b20a9b328adb25b606065454f79370"},{"name":"event","kind":"constant","sha256":"e4401a825d6163bc16311a92ed99670dc7ea3ac3cf1cece53779972e77fa1527"}]},{"path":"mcp/index.ts","sha256":"d5abac0cb8d92d9074ae37a32ee515da8b03c43fe2d1a03d44447ee7b3493861","size":69453,"symbols":[{"name":"event","kind":"constant","sha256":"39b93629feeb4077605f2bb4417f7bd7098e3957819c689e0da5ec3b45c71bea"}]},{"path":"README.md","sha256":"9a533eee7962e84cdceef1bd8c9463233a575138fa143acafc8abd42f723944a","size":10477},{"path":"mcp/README.md","sha256":"5c852f608754e299c2cff74495862f1ce4775d0bda5776d7ce4f070f4e4a6494","size":10129},{"path":"docs/guide.html","sha256":"33b57e522b1a49e48631042940e2ca7d281084371c3feb3210604e213e0e7f28","size":51769},{"path":"docs/releases.html","sha256":"140753f257c74e24bb1a62c3ab5c5ff165c9cfb5ac6501645be913eab1e03a88","size":11134},{"path":"CHANGELOG.md","sha256":"1d00aff932a74d380dad6e0d60ae0aed37e40aa5a03ae7ec0acb71f824d0ef0c","size":46022}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":128,"reverified_at":"2026-06-15T21:57:54.281Z","total_uses":0,"last_accessed_at":"2026-07-09T22:31:44.699Z"},"created_at":"2026-05-15T05:31:57.147Z","updated_at":"2026-07-03T16:16:26.720Z"}
```

