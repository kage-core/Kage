---
type: "Decision"
title: "README should stay user-first and concise"
description: "The root and npm package READMEs were rewritten to be user first: value proposition, quick start, daily workflow, storage model, viewer, performance summary, trust model, and development only. Avoid reintroducing long re"
resource: "README.md"
tags: ["session-learning", "readme", "docs", "user-experience", "npm"]
timestamp: "2026-05-10T13:13:32.010Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:readme-should-stay-user-first-and-concise-1778418812011"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["README.md", "mcp/README.md"]
---

# README should stay user-first and concise

> The root and npm package READMEs were rewritten to be user first: value proposition, quick start, daily workflow, sto…

The root and npm package READMEs were rewritten to be user-first: value proposition, quick start, daily workflow, storage model, viewer, performance summary, trust model, and development only. Avoid reintroducing long release notes, maintainer release internals, repeated metrics, or deep implementation details into README files; keep those in changelog/design docs.
Evidence: README.md reduced to 239 lines and mcp/README.md to 153 lines while retaining install, setup, workflow, viewer, storage, performance, trust, and dev sections.
Verified by: npm --prefix mcp test

## Verification

README.md reduced to 239 lines and mcp/README.md to 153 lines while retaining install, setup, workflow, viewer, storage, performance, trust, and dev sections.

# Citations

[1] explicit_capture (2026-05-10T13:13:32.010Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:readme-should-stay-user-first-and-concise-1778418812011","title":"README should stay user-first and concise","summary":"The root and npm package READMEs were rewritten to be user first: value proposition, quick start, daily workflow, storage model, viewer, performance summary, trust model, and development only. Avoid reintroducing long re","body":"The root and npm package READMEs were rewritten to be user-first: value proposition, quick start, daily workflow, storage model, viewer, performance summary, trust model, and development only. Avoid reintroducing long release notes, maintainer release internals, repeated metrics, or deep implementation details into README files; keep those in changelog/design docs.\nEvidence: README.md reduced to 239 lines and mcp/README.md to 153 lines while retaining install, setup, workflow, viewer, storage, performance, trust, and dev sections.\nVerified by: npm --prefix mcp test","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","readme","docs","user-experience","npm"],"paths":["README.md","mcp/README.md"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-10T13:13:32.010Z"}],"context":{"fact":"The root and npm package READMEs were rewritten to be user-first: value proposition, quick start, daily workflow, storage model, viewer, performance summary, trust model, and development only. Avoid reintroducing long release notes, maintainer release internals, repeated metrics, or deep implementation details into README files; keep those in changelog/design docs.\nEvidence: README.md reduced to 239 lines and mcp/README.md to 153 lines while retaining install, setup, workflow, viewer, storage, performance, trust, and dev sections.\nVerified by: npm --prefix mcp test","verification":"README.md reduced to 239 lines and mcp/README.md to 153 lines while retaining install, setup, workflow, viewer, storage, performance, trust, and dev sections."},"freshness":{"ttl_days":365,"last_verified_at":"2026-05-10T13:13:32.010Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":143,"total_uses":0,"last_accessed_at":"2026-06-29T08:10:11.043Z"},"created_at":"2026-05-10T13:13:32.010Z","updated_at":"2026-07-03T16:16:26.711Z"}
```

