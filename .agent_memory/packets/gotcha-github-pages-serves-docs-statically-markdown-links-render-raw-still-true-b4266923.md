---
type: "Gotcha"
title: "GitHub Pages serves docs/ statically; markdown links render raw (still true)"
description: "The site is GitHub Pages over docs/ as static files: linking to a .md file e.g. CLOUD.md from index.html serves raw markdown, not rendered HTML. Link to .html pages for anything user facing, or accept raw rendering for d"
resource: "docs/index.html"
tags: ["session-learning", "github-pages"]
timestamp: "2026-06-12T11:52:29.070Z"
x-kage-id: "repo:https-github-com-kage-core-kage:gotcha:github-pages-serves-docs-statically-markdown-links-render-raw-still-true-1781265"
x-kage-type: "gotcha"
x-kage-status: "superseded"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "superseded"
x-kage-paths: ["docs/index.html"]
---

# GitHub Pages serves docs/ statically; markdown links render raw (still true)

> The site is GitHub Pages over docs/ as static files: linking to a .md file e.g. CLOUD.md from index.html serves raw m…

The site is GitHub Pages over docs/ as static files: linking to a .md file (e.g. CLOUD.md from index.html) serves raw markdown, not rendered HTML. Link to .html pages for anything user-facing, or accept raw rendering for design docs. Unchanged by the v2 redesign — benchmarks.html only gained webfont links.

# Citations

[1] explicit_capture (2026-06-12T11:52:29.070Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:gotcha:github-pages-serves-docs-statically-markdown-links-render-raw-still-true-1781265","title":"GitHub Pages serves docs/ statically; markdown links render raw (still true)","summary":"The site is GitHub Pages over docs/ as static files: linking to a .md file e.g. CLOUD.md from index.html serves raw markdown, not rendered HTML. Link to .html pages for anything user facing, or accept raw rendering for d","body":"The site is GitHub Pages over docs/ as static files: linking to a .md file (e.g. CLOUD.md from index.html) serves raw markdown, not rendered HTML. Link to .html pages for anything user-facing, or accept raw rendering for design docs. Unchanged by the v2 redesign — benchmarks.html only gained webfont links.","type":"gotcha","scope":"repo","visibility":"team","sensitivity":"internal","status":"superseded","confidence":0.7,"tags":["session-learning","github-pages"],"paths":["docs/index.html"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-06-12T11:52:29.070Z"}],"context":{"fact":"The site is GitHub Pages over docs/ as static files: linking to a .md file (e.g. CLOUD.md from index.html) serves raw markdown, not rendered HTML. Link to .html pages for anything user-facing, or accept raw rendering for design docs. Unchanged by the v2 redesign — benchmarks.html only gained webfont links."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-12T11:52:29.070Z","path_fingerprints":[{"path":"docs/index.html","sha256":"9b7834b3c87fc5e429dfbf31612af67b863b72df035ac8674e49fcccc895f6e8","size":25415}],"path_fingerprint_policy":"source_hash_staleness","verification":"repo_local_agent_capture","superseded_at":"2026-06-12T12:48:50.692Z","superseded_by":"repo:https-github-com-kage-core-kage:gotcha:github-pages-serves-docs-statically-markdown-renders-raw-verified-after-2-2-1-si","superseded_reason":"Newer repo memory supersedes this packet."},"edges":[{"relation":"supersedes","to":"repo:memory:gotcha:github-pages-serves-docs-statically-markdown-renders-raw-1780660446532","evidence":"Newer repo memory supersedes this packet.","created_at":"2026-06-12T11:52:47.082Z"},{"relation":"superseded_by","to":"repo:https-github-com-kage-core-kage:gotcha:github-pages-serves-docs-statically-markdown-renders-raw-verified-after-2-2-1-si","evidence":"Newer repo memory supersedes this packet.","created_at":"2026-06-12T12:48:50.692Z"}],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"discovery_tokens":8000,"discovery_tokens_estimated":true,"score":96,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":77,"stale":true,"stale_reasons":["packet status is superseded","linked path changed since memory was verified: docs/index.html"],"suggested_action":"mark_stale","superseded_by":"repo:https-github-com-kage-core-kage:gotcha:github-pages-serves-docs-statically-markdown-renders-raw-verified-after-2-2-1-si","superseded_reason":"Newer repo memory supersedes this packet."},"created_at":"2026-06-12T11:52:29.070Z","updated_at":"2026-06-12T12:49:56.288Z","author_branch":"master"}
```

