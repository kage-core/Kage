---
type: "Workflow"
title: "Change memory: codex/kage-vnext-implementation"
description: "Repo-local context for 3 changed repo paths on codex/kage-vnext-implementation."
resource: "README.md"
tags: ["change-memory", "diff-proposal", "repo-local", "branch:codex-kage-vnext-implementation"]
timestamp: "2026-07-22T19:45:31.738Z"
x-kage-id: "repo:kage-vnext-implementation:workflow:change-memory-codex-kage-vnext-implementation"
x-kage-type: "workflow"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "stale"
x-kage-paths: ["README.md", "mcp/vnext/runtime/attach-status.test.ts", "mcp/vnext/runtime/attach-status.ts"]
---

# Change memory: codex/kage-vnext-implementation

> Repo-local context for 3 changed repo paths on codex/kage-vnext-implementation.

Repo-local change memory generated from the current git diff.

Goal: preserve the durable context another agent should receive when it works in this repo later.

What changed:
- README.md
- mcp/vnext/runtime/attach-status.test.ts
- mcp/vnext/runtime/attach-status.ts

Diff summary:
```text
README.md                               | 20 ++++++++++
 mcp/vnext/runtime/attach-status.test.ts | 65 ++++++++++++++++++++++++++++++---
 mcp/vnext/runtime/attach-status.ts      | 65 +++++++++++++++++++++++++++++++--
 3 files changed, 140 insertions(+), 10 deletions(-)
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
{"schema_version":2,"id":"repo:kage-vnext-implementation:workflow:change-memory-codex-kage-vnext-implementation","title":"Change memory: codex/kage-vnext-implementation","summary":"Repo-local context for 3 changed repo paths on codex/kage-vnext-implementation.","body":"Repo-local change memory generated from the current git diff.\n\nGoal: preserve the durable context another agent should receive when it works in this repo later.\n\nWhat changed:\n- README.md\n- mcp/vnext/runtime/attach-status.test.ts\n- mcp/vnext/runtime/attach-status.ts\n\nDiff summary:\n```text\nREADME.md                               | 20 ++++++++++\n mcp/vnext/runtime/attach-status.test.ts | 65 ++++++++++++++++++++++++++++++---\n mcp/vnext/runtime/attach-status.ts      | 65 +++++++++++++++++++++++++++++++--\n 3 files changed, 140 insertions(+), 10 deletions(-)\n```\n\nHow to verify:\n- Add the exact test, build, or manual verification command when you refine this memory.\n\nImprove this packet when more context is known:\n- The actual feature, fix, or refactor rationale.\n- Why the change was made, including relevant bugs, issues, decisions, and code explanations.\n- The package, API, command, or architectural pattern future agents should understand, verify, or reuse.\n- Any gotchas, follow-up risks, or branch-specific assumptions.\n\nPromote beyond this repo only after explicit org/global review.","type":"workflow","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.62,"tags":["change-memory","diff-proposal","repo-local","branch:codex-kage-vnext-implementation"],"paths":["README.md","mcp/vnext/runtime/attach-status.test.ts","mcp/vnext/runtime/attach-status.ts"],"stack":[],"source_refs":[{"kind":"git_diff","branch":"codex/kage-vnext-implementation","head":"7fe7f90f7e5b2631d0e867aa27e654873ed4d2ed","merge_base":"e2f3d577b46d7f2d68a70eb747706479a94edd0d","changed_files":["README.md","mcp/vnext/runtime/attach-status.test.ts","mcp/vnext/runtime/attach-status.ts"],"summary_path":"/Users/kushaljain/code/Kage/.worktrees/kage-vnext-implementation/.agent_memory/review/branch-summary-codex-kage-vnext-implementation.json"}],"context":{"fact":"Current branch codex/kage-vnext-implementation changes 3 repo paths.","why":"Branch change memory gives future agents durable context from the git diff when they continue, review, or verify this work.","trigger":"Recall when asking what changed on this branch, preparing a PR review, or resuming this work.","action":"Use the changed file list and diff summary as orientation, then inspect the actual diff and source files before making further edits.","verification":"Generated from git diff and refreshed by kage pr summarize or kage propose --from-diff.","risk_if_forgotten":"Future agents may repeat orientation work, miss branch-specific assumptions, or ignore files touched by this change.","stale_when":"The branch diff changes substantially, the branch is merged, or a newer change-memory packet supersedes it."},"freshness":{"last_verified_at":"2026-07-22T19:45:31.738Z","ttl_days":180,"path_fingerprints":[{"path":"README.md","sha256":"48192ae2960a45ea844fe8bb1d71199fcf0b9d0243267c3ce9126b03c64e6198","size":16626},{"path":"mcp/vnext/runtime/attach-status.test.ts","sha256":"5a0f1b37fdef02eeaacabf22c9f855d0a9f2fc4b7d1896196b0c25b496cd52ad","size":6139},{"path":"mcp/vnext/runtime/attach-status.ts","sha256":"5408419636b73a90553240f00549f8f019ffc5d43ac818c5f23d52909db02bbf","size":7143}],"path_fingerprint_policy":"source_hash_staleness","verification":"git_diff"},"edges":[{"relation":"changes_path","to":"path:README.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/vnext/runtime/attach-status.test.ts","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/vnext/runtime/attach-status.ts","evidence":"git_diff"}],"quality":{"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"stale_reasons":["linked path changed since memory was verified: README.md"],"estimated_tokens_saved":274,"admission":{"admit":true,"class":"candidate","score":70,"reasons":["durable memory type","has provenance","repo scoped or path grounded","has durable trigger, rationale, issue context, or explanation","substantive enough to reuse"],"risks":[]},"candidate_kind":"change_memory","review_boundary":"git_or_pr","promotion_requires_review":true,"stale":true,"suggested_action":"update"},"created_at":"2026-07-22T19:45:31.738Z","updated_at":"2026-07-22T19:45:31.738Z"}
```

