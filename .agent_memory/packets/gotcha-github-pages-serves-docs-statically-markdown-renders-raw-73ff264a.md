---
type: "Gotcha"
title: "GitHub Pages serves docs/ statically; markdown renders raw"
description: "pages.yml uploads docs/ with no Jekyll, so TRUST.md/BENCHMARKS.md serve as raw text and are unlinked. Public docs need HTML pages docs/benchmarks.html added to the nav; deep methodology can link to GitHub rendered md."
resource: "docs/benchmarks.html"
tags: ["session-learning"]
timestamp: "2026-06-11T15:18:19.000Z"
x-kage-id: "repo:memory:gotcha:github-pages-serves-docs-statically-markdown-renders-raw-1780660446532"
x-kage-type: "gotcha"
x-kage-status: "superseded"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "superseded"
x-kage-paths: ["docs/benchmarks.html", ".github/workflows/pages.yml"]
---

# GitHub Pages serves docs/ statically; markdown renders raw

> pages.yml uploads docs/ with no Jekyll, so TRUST.md/BENCHMARKS.md serve as raw text and are unlinked. Public docs nee…

pages.yml uploads docs/ with no Jekyll, so TRUST.md/BENCHMARKS.md serve as raw text and are unlinked. Public docs need HTML pages (docs/benchmarks.html) added to the nav; deep methodology can link to GitHub-rendered md.
Verified by: benchmarks.html renders; nav updated

## Verification

benchmarks.html renders; nav updated

# Citations

[1] explicit_capture (2026-06-05T11:54:06.532Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:memory:gotcha:github-pages-serves-docs-statically-markdown-renders-raw-1780660446532","title":"GitHub Pages serves docs/ statically; markdown renders raw","summary":"pages.yml uploads docs/ with no Jekyll, so TRUST.md/BENCHMARKS.md serve as raw text and are unlinked. Public docs need HTML pages docs/benchmarks.html added to the nav; deep methodology can link to GitHub rendered md.","body":"pages.yml uploads docs/ with no Jekyll, so TRUST.md/BENCHMARKS.md serve as raw text and are unlinked. Public docs need HTML pages (docs/benchmarks.html) added to the nav; deep methodology can link to GitHub-rendered md.\nVerified by: benchmarks.html renders; nav updated","type":"gotcha","scope":"repo","visibility":"team","sensitivity":"internal","status":"superseded","confidence":0.7,"tags":["session-learning"],"paths":["docs/benchmarks.html",".github/workflows/pages.yml"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-06-05T11:54:06.532Z"}],"context":{"fact":"pages.yml uploads docs/ with no Jekyll, so TRUST.md/BENCHMARKS.md serve as raw text and are unlinked. Public docs need HTML pages (docs/benchmarks.html) added to the nav; deep methodology can link to GitHub-rendered md.\nVerified by: benchmarks.html renders; nav updated","verification":"benchmarks.html renders; nav updated"},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-11T15:18:19.000Z","path_fingerprints":[{"path":"docs/benchmarks.html","sha256":"693a4eaf1a9b97caf60120a1fbec9f569060b9ee40c2d6bf8e8f0dca36e94fb6","size":6627},{"path":".github/workflows/pages.yml","sha256":"cab3422f94a17999d2de650be09a0917a2c15174b78f98e041dfc1f2961d69c6","size":5019}],"path_fingerprint_policy":"source_hash_staleness","verification":"repo_local_agent_capture","superseded_at":"2026-06-12T11:52:47.082Z","superseded_by":"repo:https-github-com-kage-core-kage:gotcha:github-pages-serves-docs-statically-markdown-links-render-raw-still-true-1781265","superseded_reason":"Newer repo memory supersedes this packet."},"edges":[{"relation":"superseded_by","to":"repo:https-github-com-kage-core-kage:gotcha:github-pages-serves-docs-statically-markdown-links-render-raw-still-true-1781265","evidence":"Newer repo memory supersedes this packet.","created_at":"2026-06-12T11:52:47.082Z"}],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":68,"stale":true,"stale_reasons":["packet status is superseded","linked path changed since memory was verified: docs/benchmarks.html, .github/workflows/pages.yml"],"suggested_action":"mark_stale","superseded_by":"repo:https-github-com-kage-core-kage:gotcha:github-pages-serves-docs-statically-markdown-links-render-raw-still-true-1781265","superseded_reason":"Newer repo memory supersedes this packet."},"created_at":"2026-06-05T11:54:06.532Z","updated_at":"2026-06-15T08:29:24.806Z","author_branch":"chore/dogfood"}
```

