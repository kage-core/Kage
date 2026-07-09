---
type: "Workflow"
title: "Change memory: adopt/sse-live-feed"
description: "Repo-local context for 8 changed repo paths on adopt/sse-live-feed."
resource: "mcp/daemon.test.ts"
tags: ["change-memory", "diff-proposal", "repo-local", "branch:adopt-sse-live-feed"]
timestamp: "2026-06-15T21:58:21.293Z"
x-kage-id: "repo:agent-aff9900007e92076e:workflow:change-memory-adopt-sse-live-feed"
x-kage-type: "workflow"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "verified"
x-kage-paths: ["mcp/daemon.test.ts", "mcp/daemon.ts"]
---

# Change memory: adopt/sse-live-feed

> Repo-local context for 8 changed repo paths on adopt/sse-live-feed.

Repo-local change memory generated from the current git diff.

Goal: preserve the durable context another agent should receive when it works in this repo later.

What changed:
- .agent_memory/packets/workflow-change-memory-master-23634276.json
- .agent_memory/packets/workflow-viewer-live-feed-sse-kage-events-from-fs-watch-on-agent-memory-818902c2.json
- docs/viewer/console.js
- docs/viewer/index.html
- mcp/daemon.test.ts
- mcp/daemon.ts
- mcp/viewer/console.js
- mcp/viewer/index.html

Diff summary:
```text
.../workflow-change-memory-master-23634276.json    |   3 +-
 docs/viewer/console.js                             |  61 ++++++++
 docs/viewer/index.html                             |  11 +-
 mcp/daemon.test.ts                                 |  62 +++++++-
 mcp/daemon.ts                                      | 165 +++++++++++++++++++++
 mcp/viewer/console.js                              |  61 ++++++++
 mcp/viewer/index.html                              |  11 +-
 7 files changed, 369 insertions(+), 5 deletions(-)
.agent_memory/packets/workflow-viewer-live-feed-sse-kage-events-from-fs-watch-on-agent-memory-818902c2.json | untracked
```

How to verify:
- Add the exact test, build, or manual verification command when you refine this memory.

Improve this packet when more context is known:
- The actual feature, fix, or refactor rationale.
- Why the change was made, including relevant bugs, issues, decisions, and code explanations.
- The package, API, command, or architectural pattern future agents should understand, verify, or reuse.
- Any gotchas, follow-up risks, or branch-specific assumptions.

Promote beyond this repo only after explicit org/global review.

## Why

Branch change memory gives future agents durable context from the git diff when they continue, review, or verify this work.

## Trigger

Recall when asking what changed on this branch, preparing a PR review, or resuming this work.

## Action

Use the changed file list and diff summary as orientation, then inspect the actual diff and source files before making further edits.

## Verification

Generated from git diff and refreshed by kage pr summarize or kage propose --from-diff.

## Risk if forgotten

Future agents may repeat orientation work, miss branch-specific assumptions, or ignore files touched by this change.

## Stale when

The branch diff changes substantially, the branch is merged, or a newer change-memory packet supersedes it.

# Citations

[1] git_diff

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:agent-aff9900007e92076e:workflow:change-memory-adopt-sse-live-feed","title":"Change memory: adopt/sse-live-feed","summary":"Repo-local context for 8 changed repo paths on adopt/sse-live-feed.","body":"Repo-local change memory generated from the current git diff.\n\nGoal: preserve the durable context another agent should receive when it works in this repo later.\n\nWhat changed:\n- .agent_memory/packets/workflow-change-memory-master-23634276.json\n- .agent_memory/packets/workflow-viewer-live-feed-sse-kage-events-from-fs-watch-on-agent-memory-818902c2.json\n- docs/viewer/console.js\n- docs/viewer/index.html\n- mcp/daemon.test.ts\n- mcp/daemon.ts\n- mcp/viewer/console.js\n- mcp/viewer/index.html\n\nDiff summary:\n```text\n.../workflow-change-memory-master-23634276.json    |   3 +-\n docs/viewer/console.js                             |  61 ++++++++\n docs/viewer/index.html                             |  11 +-\n mcp/daemon.test.ts                                 |  62 +++++++-\n mcp/daemon.ts                                      | 165 +++++++++++++++++++++\n mcp/viewer/console.js                              |  61 ++++++++\n mcp/viewer/index.html                              |  11 +-\n 7 files changed, 369 insertions(+), 5 deletions(-)\n.agent_memory/packets/workflow-viewer-live-feed-sse-kage-events-from-fs-watch-on-agent-memory-818902c2.json | untracked\n```\n\nHow to verify:\n- Add the exact test, build, or manual verification command when you refine this memory.\n\nImprove this packet when more context is known:\n- The actual feature, fix, or refactor rationale.\n- Why the change was made, including relevant bugs, issues, decisions, and code explanations.\n- The package, API, command, or architectural pattern future agents should understand, verify, or reuse.\n- Any gotchas, follow-up risks, or branch-specific assumptions.\n\nPromote beyond this repo only after explicit org/global review.","type":"workflow","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.62,"tags":["change-memory","diff-proposal","repo-local","branch:adopt-sse-live-feed"],"paths":["mcp/daemon.test.ts","mcp/daemon.ts"],"stack":[],"source_refs":[{"kind":"git_diff","branch":"adopt/sse-live-feed","head":"c66c8832c306875e89856075d33bac06344bafad","merge_base":"c66c8832c306875e89856075d33bac06344bafad","changed_files":[".agent_memory/packets/workflow-change-memory-master-23634276.json",".agent_memory/packets/workflow-viewer-live-feed-sse-kage-events-from-fs-watch-on-agent-memory-818902c2.json","mcp/daemon.test.ts","mcp/daemon.ts"],"summary_path":"/Users/kushaljain/code/Kage/.claude/worktrees/agent-aff9900007e92076e/.agent_memory/review/branch-summary-adopt-sse-live-feed.json"}],"context":{"fact":"Current branch adopt/sse-live-feed changes 8 repo paths.","why":"Branch change memory gives future agents durable context from the git diff when they continue, review, or verify this work.","trigger":"Recall when asking what changed on this branch, preparing a PR review, or resuming this work.","action":"Use the changed file list and diff summary as orientation, then inspect the actual diff and source files before making further edits.","verification":"Generated from git diff and refreshed by kage pr summarize or kage propose --from-diff.","risk_if_forgotten":"Future agents may repeat orientation work, miss branch-specific assumptions, or ignore files touched by this change.","stale_when":"The branch diff changes substantially, the branch is merged, or a newer change-memory packet supersedes it."},"freshness":{"last_verified_at":"2026-06-15T21:58:21.293Z","ttl_days":180,"path_fingerprints":[{"path":"mcp/daemon.test.ts","sha256":"ef48ce8b21ff33ed39379a9be695f863280d552399973a742c0e3932c21bfe1e","size":12250,"symbols":[{"name":"feed","kind":"constant","sha256":"27c0b444f09314ac7e1e9800fb118a042bd8a36b4b031118e3db976a04bed7f2"}]},{"path":"mcp/daemon.ts","sha256":"4d558ba09071b09ab3d1a62d40af04edf17609c9ea98a571405883424cc1bf2f","size":38423,"symbols":[{"name":"events","kind":"constant","sha256":"2b0aedca3d99c794be26575d8a62560478191aaa1d6092f7bc5756b69e0f320b"},{"name":"json","kind":"function","sha256":"c6cfd13a6f9203c85fedf4efd643fcb209309a376a34ce77909c444a05e9b0e5"},{"name":"text","kind":"constant","sha256":"70f68baaeedf940b18569f940046a8a0a978afd00077c6b27618336a05fa1cc1"},{"name":"files","kind":"constant","sha256":"69140299050f3544f2a8f5cdcfa3672dd7f2a78cf8960d3197b23624253b5b9e"}]}],"path_fingerprint_policy":"source_hash_staleness","verification":"git_diff"},"edges":[{"relation":"changes_path","to":"path:.agent_memory/packets/workflow-change-memory-master-23634276.json","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/workflow-viewer-live-feed-sse-kage-events-from-fs-watch-on-agent-memory-818902c2.json","evidence":"git_diff"},{"relation":"changes_path","to":"path:docs/viewer/console.js","evidence":"git_diff"},{"relation":"changes_path","to":"path:docs/viewer/index.html","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/daemon.test.ts","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/daemon.ts","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/viewer/console.js","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/viewer/index.html","evidence":"git_diff"}],"quality":{"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":421,"admission":{"admit":true,"class":"candidate","score":70,"reasons":["durable memory type","has provenance","repo scoped or path grounded","has durable trigger, rationale, issue context, or explanation","substantive enough to reuse"],"risks":[]},"candidate_kind":"change_memory","review_boundary":"git_or_pr","promotion_requires_review":true,"reverified_at":"2026-06-15T21:58:21.293Z","uses_30d":10,"total_uses":10,"last_accessed_at":"2026-07-09T06:48:38.252Z"},"created_at":"2026-06-12T06:00:44.513Z","updated_at":"2026-07-03T16:16:26.746Z"}
```

