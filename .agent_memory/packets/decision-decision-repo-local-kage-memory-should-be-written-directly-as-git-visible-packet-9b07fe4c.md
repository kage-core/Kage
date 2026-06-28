---
type: "Decision"
title: "Decision: repo-local Kage memory should be written directly as git-visible packets; human"
description: "Decision: repo local Kage memory should be written directly as git visible packets; human review is required only when promoting memory to org, global, public, registry, or CDN scopes."
resource: "mcp/kernel.ts"
tags: ["session-learning", "trust-model", "repo-memory", "promotion-review"]
timestamp: "2026-06-15T21:58:22.287Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:decision-repo-local-kage-memory-should-be-written-directly-as-git-visible-packet"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "verified"
x-kage-paths: ["mcp/kernel.ts", "README.md", "docs/index.html"]
---

# Decision: repo-local Kage memory should be written directly as git-visible packets; human

> Decision: repo local Kage memory should be written directly as git visible packets; human review is required only whe…

Decision: repo-local Kage memory should be written directly as git-visible packets; human review is required only when promoting memory to org, global, public, registry, or CDN scopes.
Verified by: npm test --prefix mcp

# Citations

[1] explicit_capture (2026-05-02T14:02:13.758Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:decision-repo-local-kage-memory-should-be-written-directly-as-git-visible-packet","title":"Decision: repo-local Kage memory should be written directly as git-visible packets; human","summary":"Decision: repo local Kage memory should be written directly as git visible packets; human review is required only when promoting memory to org, global, public, registry, or CDN scopes.","body":"Decision: repo-local Kage memory should be written directly as git-visible packets; human review is required only when promoting memory to org, global, public, registry, or CDN scopes.\nVerified by: npm test --prefix mcp","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","trust-model","repo-memory","promotion-review"],"paths":["mcp/kernel.ts","README.md","docs/index.html"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-02T14:02:13.758Z"}],"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:22.287Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"},{"name":"when","kind":"constant","sha256":"48bfd58b3cdbf2d407e4443b90727d548d96eceaa4372c099dcd22c52f498452"}]},{"path":"README.md","sha256":"9a533eee7962e84cdceef1bd8c9463233a575138fa143acafc8abd42f723944a","size":10477},{"path":"docs/index.html","sha256":"97fa35c70c0a4682eb5e927543bea68306f073a0d683c92751aa021cc23f0d2c","size":33562}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":110,"reverified_at":"2026-06-15T21:58:22.287Z"},"created_at":"2026-05-02T14:02:13.758Z","updated_at":"2026-06-15T21:58:22.287Z"}
```

