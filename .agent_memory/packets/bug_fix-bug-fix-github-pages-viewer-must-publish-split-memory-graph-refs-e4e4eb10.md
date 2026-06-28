---
type: "Bug Fix"
title: "Bug fix: GitHub Pages viewer must publish split memory graph refs"
description: "Bug fix: GitHub Pages viewer must publish split memory graph refs. The hosted viewer loads data/kage/graph.json, and compact memory graphs reference entities.json, edges.json, and episodes.json beside graph.json. Pages m"
resource: ".github/workflows/pages.yml"
tags: ["session-learning"]
timestamp: "2026-05-09T19:27:29.130Z"
x-kage-id: "repo:https-github-com-kage-core-kage:bug_fix:bug-fix-github-pages-viewer-must-publish-split-memory-graph-refs-1778354849130"
x-kage-type: "bug_fix"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "verified"
x-kage-paths: [".github/workflows/pages.yml"]
---

# Bug fix: GitHub Pages viewer must publish split memory graph refs

> Bug fix: GitHub Pages viewer must publish split memory graph refs. The hosted viewer loads data/kage/graph.json, and …

Bug fix: GitHub Pages viewer must publish split memory graph refs. The hosted viewer loads data/kage/graph.json, and compact memory graphs reference entities.json, edges.json, and episodes.json beside graph.json. Pages must copy .agent_memory/graph/{entities,edges,episodes}.json into docs/viewer/data/kage or the hosted viewer hydrates no memory nodes.

# Citations

[1] explicit_capture (2026-05-09T19:27:29.130Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:bug_fix:bug-fix-github-pages-viewer-must-publish-split-memory-graph-refs-1778354849130","title":"Bug fix: GitHub Pages viewer must publish split memory graph refs","summary":"Bug fix: GitHub Pages viewer must publish split memory graph refs. The hosted viewer loads data/kage/graph.json, and compact memory graphs reference entities.json, edges.json, and episodes.json beside graph.json. Pages m","body":"Bug fix: GitHub Pages viewer must publish split memory graph refs. The hosted viewer loads data/kage/graph.json, and compact memory graphs reference entities.json, edges.json, and episodes.json beside graph.json. Pages must copy .agent_memory/graph/{entities,edges,episodes}.json into docs/viewer/data/kage or the hosted viewer hydrates no memory nodes.","type":"bug_fix","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning"],"paths":[".github/workflows/pages.yml"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-09T19:27:29.130Z"}],"context":{"fact":"Bug fix: GitHub Pages viewer must publish split memory graph refs. The hosted viewer loads data/kage/graph.json, and compact memory graphs reference entities.json, edges.json, and episodes.json beside graph.json. Pages must copy .agent_memory/graph/{entities,edges,episodes}.json into docs/viewer/data/kage or the hosted viewer hydrates no memory nodes."},"freshness":{"ttl_days":365,"last_verified_at":"2026-05-09T19:27:29.130Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":96,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":89},"created_at":"2026-05-09T19:27:29.130Z","updated_at":"2026-05-19T04:50:14.869Z"}
```

