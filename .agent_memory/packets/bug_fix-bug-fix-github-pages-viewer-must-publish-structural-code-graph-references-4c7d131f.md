---
type: "Bug Fix"
title: "Bug fix: GitHub Pages viewer must publish structural code graph references"
description: "Bug fix: GitHub Pages viewer must publish structural code graph references. The hosted viewer loads data/kage/code graph/graph.json, and compact code graphs reference ../structural/files.json, symbols.json, and imports.j"
resource: ".github/workflows/pages.yml"
tags: ["session-learning"]
timestamp: "2026-05-09T19:21:12.825Z"
x-kage-id: "repo:https-github-com-kage-core-kage:bug_fix:bug-fix-github-pages-viewer-must-publish-structural-code-graph-references-177835"
x-kage-type: "bug_fix"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: [".github/workflows/pages.yml"]
---

# Bug fix: GitHub Pages viewer must publish structural code graph references

> Bug fix: GitHub Pages viewer must publish structural code graph references. The hosted viewer loads data/kage/code gr…

Bug fix: GitHub Pages viewer must publish structural code graph references. The hosted viewer loads data/kage/code_graph/graph.json, and compact code graphs reference ../structural/files.json, symbols.json, and imports.json. Pages must copy .agent_memory/structural/{files,symbols,imports}.json into docs/viewer/data/kage/structural or the hosted viewer hydrates no code nodes.

# Citations

[1] explicit_capture (2026-05-09T19:21:12.825Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:bug_fix:bug-fix-github-pages-viewer-must-publish-structural-code-graph-references-177835","title":"Bug fix: GitHub Pages viewer must publish structural code graph references","summary":"Bug fix: GitHub Pages viewer must publish structural code graph references. The hosted viewer loads data/kage/code graph/graph.json, and compact code graphs reference ../structural/files.json, symbols.json, and imports.j","body":"Bug fix: GitHub Pages viewer must publish structural code graph references. The hosted viewer loads data/kage/code_graph/graph.json, and compact code graphs reference ../structural/files.json, symbols.json, and imports.json. Pages must copy .agent_memory/structural/{files,symbols,imports}.json into docs/viewer/data/kage/structural or the hosted viewer hydrates no code nodes.","type":"bug_fix","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning"],"paths":[".github/workflows/pages.yml"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-09T19:21:12.825Z"}],"context":{"fact":"Bug fix: GitHub Pages viewer must publish structural code graph references. The hosted viewer loads data/kage/code_graph/graph.json, and compact code graphs reference ../structural/files.json, symbols.json, and imports.json. Pages must copy .agent_memory/structural/{files,symbols,imports}.json into docs/viewer/data/kage/structural or the hosted viewer hydrates no code nodes."},"freshness":{"ttl_days":365,"last_verified_at":"2026-05-09T19:21:12.825Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":96,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":95,"total_uses":0},"created_at":"2026-05-09T19:21:12.825Z","updated_at":"2026-07-03T16:16:26.675Z"}
```

