---
type: "Gotcha"
title: "GitHub Pages serves docs/ statically; markdown renders raw (verified after 2.2.1 site refresh)"
description: "kage core.com is GitHub Pages over docs/: .md links CLOUD.md, BENCHMARKS.md serve raw markdown, not rendered HTML. Use .html for user facing links. Pages sends cache control max age=600 — users see stale pages up to 10 m"
resource: "docs/index.html"
tags: ["session-learning"]
timestamp: "2026-06-12T12:48:50.511Z"
x-kage-id: "repo:https-github-com-kage-core-kage:gotcha:github-pages-serves-docs-statically-markdown-renders-raw-verified-after-2-2-1-si"
x-kage-type: "gotcha"
x-kage-status: "deprecated"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "deprecated"
x-kage-paths: ["docs/index.html"]
---

# GitHub Pages serves docs/ statically; markdown renders raw (verified after 2.2.1 site refresh)

> kage core.com is GitHub Pages over docs/: .md links CLOUD.md, BENCHMARKS.md serve raw markdown, not rendered HTML. Us…

kage-core.com is GitHub Pages over docs/: .md links (CLOUD.md, BENCHMARKS.md) serve raw markdown, not rendered HTML. Use .html for user-facing links. Pages sends cache-control max-age=600 — users see stale pages up to 10 min after deploy; kage-core.github.io/Kage 301s to kage-core.com. Verified intact through the v2.2 content refresh.

# Citations

[1] explicit_capture (2026-06-12T12:48:50.511Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:gotcha:github-pages-serves-docs-statically-markdown-renders-raw-verified-after-2-2-1-si","title":"GitHub Pages serves docs/ statically; markdown renders raw (verified after 2.2.1 site refresh)","summary":"kage core.com is GitHub Pages over docs/: .md links CLOUD.md, BENCHMARKS.md serve raw markdown, not rendered HTML. Use .html for user facing links. Pages sends cache control max age=600 — users see stale pages up to 10 m","body":"kage-core.com is GitHub Pages over docs/: .md links (CLOUD.md, BENCHMARKS.md) serve raw markdown, not rendered HTML. Use .html for user-facing links. Pages sends cache-control max-age=600 — users see stale pages up to 10 min after deploy; kage-core.github.io/Kage 301s to kage-core.com. Verified intact through the v2.2 content refresh.","type":"gotcha","scope":"repo","visibility":"team","sensitivity":"internal","status":"deprecated","confidence":0.7,"tags":["session-learning"],"paths":["docs/index.html"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-06-12T12:48:50.511Z"}],"context":{"fact":"kage-core.com is GitHub Pages over docs/: .md links (CLOUD.md, BENCHMARKS.md) serve raw markdown, not rendered HTML. Use .html for user-facing links. Pages sends cache-control max-age=600 — users see stale pages up to 10 min after deploy; kage-core.github.io/Kage 301s to kage-core.com. Verified intact through the v2.2 content refresh."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-12T12:48:50.511Z","path_fingerprints":[{"path":"docs/index.html","sha256":"eafce78bf6db0c4f7e74c7c97dda3780921c1f538168c5d85c76a2741904de1b","size":29471}],"path_fingerprint_policy":"source_hash_staleness","verification":"repo_local_agent_capture","superseded_at":"2026-06-12T16:06:14.824Z","superseded_by":"repo:https-github-com-kage-core-kage:gotcha:github-pages-serves-docs-statically-markdown-links-render-raw-re-verified-after-","superseded_reason":"Newer repo memory supersedes this packet."},"edges":[{"relation":"supersedes","to":"repo:https-github-com-kage-core-kage:gotcha:github-pages-serves-docs-statically-markdown-links-render-raw-still-true-1781265","evidence":"Newer repo memory supersedes this packet.","created_at":"2026-06-12T12:48:50.692Z"},{"relation":"superseded_by","to":"repo:https-github-com-kage-core-kage:gotcha:github-pages-serves-docs-statically-markdown-links-render-raw-re-verified-after-","evidence":"Newer repo memory supersedes this packet.","created_at":"2026-06-12T16:06:14.824Z"}],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"discovery_tokens":8000,"discovery_tokens_estimated":true,"score":96,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":84,"stale":true,"stale_reasons":["packet status is superseded","linked path changed since memory was verified: docs/index.html"],"suggested_action":"mark_stale","superseded_by":"repo:https-github-com-kage-core-kage:gotcha:github-pages-serves-docs-statically-markdown-links-render-raw-re-verified-after-","superseded_reason":"Newer repo memory supersedes this packet."},"created_at":"2026-06-12T12:48:50.511Z","updated_at":"2026-06-29T08:26:42.587Z","author_branch":"master"}
```

