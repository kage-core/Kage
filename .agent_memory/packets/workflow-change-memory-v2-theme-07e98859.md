---
type: "Workflow"
title: "Change memory: v2/theme"
description: "Repo-local context for 12 changed repo paths on v2/theme."
resource: ".github/workflows/pages.yml"
tags: ["change-memory", "diff-proposal", "repo-local", "branch:v2-theme"]
timestamp: "2026-06-15T21:58:21.772Z"
x-kage-id: "repo:agent-a8e00068f536471a0:workflow:change-memory-v2-theme"
x-kage-type: "workflow"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "verified"
x-kage-paths: [".github/workflows/pages.yml", "AGENTS.md", "CLAUDE.md", "docs/assets/site.css", "docs/guide.html", "docs/index.html", "mcp/daemon.test.ts", "mcp/daemon.ts"]
---

# Change memory: v2/theme

> Repo-local context for 12 changed repo paths on v2/theme.

Repo-local change memory generated from the current git diff.

Goal: preserve the durable context another agent should receive when it works in this repo later.

What changed:
- .github/workflows/pages.yml
- AGENTS.md
- CLAUDE.md
- docs/assets/site.css
- docs/guide.html
- docs/index.html
- docs/viewer/console.js
- docs/viewer/index.html
- mcp/daemon.test.ts
- mcp/daemon.ts
- mcp/viewer/console.js
- mcp/viewer/index.html

Diff summary:
```text
...t-block-only-on-hard-stale-memory-f9e2c269.json |   9 +-
 ...unchanged-after-skip-list-cleanup-60335e2b.json |   5 +-
 ...stale-exclusion-is-fingerprint-ba-c575beee.json |   5 +-
 ...re-and-opt-in-recall-token-budget-12d31c53.json |   9 +-
 ...external-tool-specific-skip-names-06a3d2bf.json |   5 +-
 ...om-domain-needs-https-enforcement-87a83226.json |   9 +-
 ...s-statically-markdown-renders-raw-73ff264a.json |   9 +-
 ...eat-prd-memory-quality-mechanisms-a5328ec7.json |   5 +-
 .github/workflows/pages.yml                        |   2 +-
 AGENTS.md                                          |  20 +-
 CLAUDE.md                                          |  20 +-
 docs/assets/site.css                               | 160 +++++++++++-----
 docs/guide.html                                    |   8 +-
 docs/index.html                                    |  55 +++---
 docs/viewer/console.js                             | 183 ++++++++++++++++--
 docs/viewer/index.html                             | 211 +++++++++++++--------
 mcp/daemon.test.ts                                 |  26 ++-
 mcp/daemon.ts                                      | 135 +++++++------
 mcp/viewer/console.js                              | 183 ++++++++++++++++--
 mcp/viewer/index.html                              | 211 +++++++++++++--------
 20 files changed, 866 insertions(+), 404 deletions(-)
```

How to verify:
- Add the exact test, build, or manual verification command when you refine this memory.

Improve this packet when more context is known:
- The actual feature, fix, or refactor rationale.
- The package, API, command, or architectural pattern future agents should reuse.
- Any gotchas, follow-up risks, or branch-specific assumptions.

Promote beyond this repo only after explicit org/global review.

# Citations

[1] git_diff

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:agent-a8e00068f536471a0:workflow:change-memory-v2-theme","title":"Change memory: v2/theme","summary":"Repo-local context for 12 changed repo paths on v2/theme.","body":"Repo-local change memory generated from the current git diff.\n\nGoal: preserve the durable context another agent should receive when it works in this repo later.\n\nWhat changed:\n- .github/workflows/pages.yml\n- AGENTS.md\n- CLAUDE.md\n- docs/assets/site.css\n- docs/guide.html\n- docs/index.html\n- docs/viewer/console.js\n- docs/viewer/index.html\n- mcp/daemon.test.ts\n- mcp/daemon.ts\n- mcp/viewer/console.js\n- mcp/viewer/index.html\n\nDiff summary:\n```text\n...t-block-only-on-hard-stale-memory-f9e2c269.json |   9 +-\n ...unchanged-after-skip-list-cleanup-60335e2b.json |   5 +-\n ...stale-exclusion-is-fingerprint-ba-c575beee.json |   5 +-\n ...re-and-opt-in-recall-token-budget-12d31c53.json |   9 +-\n ...external-tool-specific-skip-names-06a3d2bf.json |   5 +-\n ...om-domain-needs-https-enforcement-87a83226.json |   9 +-\n ...s-statically-markdown-renders-raw-73ff264a.json |   9 +-\n ...eat-prd-memory-quality-mechanisms-a5328ec7.json |   5 +-\n .github/workflows/pages.yml                        |   2 +-\n AGENTS.md                                          |  20 +-\n CLAUDE.md                                          |  20 +-\n docs/assets/site.css                               | 160 +++++++++++-----\n docs/guide.html                                    |   8 +-\n docs/index.html                                    |  55 +++---\n docs/viewer/console.js                             | 183 ++++++++++++++++--\n docs/viewer/index.html                             | 211 +++++++++++++--------\n mcp/daemon.test.ts                                 |  26 ++-\n mcp/daemon.ts                                      | 135 +++++++------\n mcp/viewer/console.js                              | 183 ++++++++++++++++--\n mcp/viewer/index.html                              | 211 +++++++++++++--------\n 20 files changed, 866 insertions(+), 404 deletions(-)\n```\n\nHow to verify:\n- Add the exact test, build, or manual verification command when you refine this memory.\n\nImprove this packet when more context is known:\n- The actual feature, fix, or refactor rationale.\n- The package, API, command, or architectural pattern future agents should reuse.\n- Any gotchas, follow-up risks, or branch-specific assumptions.\n\nPromote beyond this repo only after explicit org/global review.","type":"workflow","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.62,"tags":["change-memory","diff-proposal","repo-local","branch:v2-theme"],"paths":[".github/workflows/pages.yml","AGENTS.md","CLAUDE.md","docs/assets/site.css","docs/guide.html","docs/index.html","mcp/daemon.test.ts","mcp/daemon.ts"],"stack":[],"source_refs":[{"kind":"git_diff","branch":"v2/theme","head":"1b3cf7a888169c62066390be141752ed73d2716b","merge_base":"1b3cf7a888169c62066390be141752ed73d2716b","changed_files":[".github/workflows/pages.yml","AGENTS.md","CLAUDE.md","docs/assets/site.css","docs/guide.html","docs/index.html","mcp/daemon.test.ts","mcp/daemon.ts"],"summary_path":"/Users/kushaljain/code/Kage/.claude/worktrees/agent-a8e00068f536471a0/.agent_memory/review/branch-summary-v2-theme.json"}],"freshness":{"last_verified_at":"2026-06-15T21:58:21.772Z","ttl_days":180,"verification":"git_diff","path_fingerprints":[{"path":".github/workflows/pages.yml","sha256":"0268e0222b1263c3f8a28e766b2b278e2ae269535d08bf2fcfd499d90b579fce","size":5402},{"path":"AGENTS.md","sha256":"d1e074d6887bacd550f629c53dae432477ebedf6548b14765396a408a4544d3a","size":3427},{"path":"CLAUDE.md","sha256":"d1e074d6887bacd550f629c53dae432477ebedf6548b14765396a408a4544d3a","size":3427},{"path":"docs/assets/site.css","sha256":"9f0c41aae773688ad78a04e6b264c9cfb7f93f5c69b4a4f24594de314979bc6f","size":13767},{"path":"docs/guide.html","sha256":"33b57e522b1a49e48631042940e2ca7d281084371c3feb3210604e213e0e7f28","size":51769},{"path":"docs/index.html","sha256":"97fa35c70c0a4682eb5e927543bea68306f073a0d683c92751aa021cc23f0d2c","size":33562},{"path":"mcp/daemon.test.ts","sha256":"ef48ce8b21ff33ed39379a9be695f863280d552399973a742c0e3932c21bfe1e","size":12250},{"path":"mcp/daemon.ts","sha256":"4d558ba09071b09ab3d1a62d40af04edf17609c9ea98a571405883424cc1bf2f","size":38423,"symbols":[{"name":"json","kind":"function","sha256":"c6cfd13a6f9203c85fedf4efd643fcb209309a376a34ce77909c444a05e9b0e5"},{"name":"text","kind":"constant","sha256":"70f68baaeedf940b18569f940046a8a0a978afd00077c6b27618336a05fa1cc1"},{"name":"files","kind":"constant","sha256":"69140299050f3544f2a8f5cdcfa3672dd7f2a78cf8960d3197b23624253b5b9e"}]}]},"edges":[{"relation":"changes_path","to":"path:.github/workflows/pages.yml","evidence":"git_diff"},{"relation":"changes_path","to":"path:AGENTS.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:CLAUDE.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:docs/assets/site.css","evidence":"git_diff"},{"relation":"changes_path","to":"path:docs/guide.html","evidence":"git_diff"},{"relation":"changes_path","to":"path:docs/index.html","evidence":"git_diff"},{"relation":"changes_path","to":"path:docs/viewer/console.js","evidence":"git_diff"},{"relation":"changes_path","to":"path:docs/viewer/index.html","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/daemon.test.ts","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/daemon.ts","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/viewer/console.js","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/viewer/index.html","evidence":"git_diff"}],"quality":{"score":86,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":["possible duplicate memory"],"duplicate_candidates":[{"id":"repo:https-github-com-kage-core-kage:workflow:change-memory-feat-tree-sitter-extraction","title":"Change memory: feat/tree-sitter-extraction","score":0.64,"status":"approved"}],"estimated_tokens_saved":560,"admission":{"admit":true,"class":"candidate","score":46,"reasons":["durable memory type","has provenance","repo scoped or path grounded","has future trigger or rationale","substantive enough to reuse"],"risks":["duplicates existing memory"]},"candidate_kind":"change_memory","review_boundary":"git_or_pr","promotion_requires_review":true,"reverified_at":"2026-06-15T21:58:21.772Z","uses_30d":4,"total_uses":4,"last_accessed_at":"2026-07-06T19:36:34.060Z"},"created_at":"2026-06-11T15:01:59.668Z","updated_at":"2026-07-03T16:16:26.748Z"}
```

