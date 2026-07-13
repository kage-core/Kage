---
type: "Workflow"
title: "Change memory: codex/kage-vnext-implementation"
description: "Repo-local context for 7 changed repo paths on codex/kage-vnext-implementation."
resource: "mcp/vnext/context/capsule-builder.ts"
tags: ["change-memory", "diff-proposal", "repo-local", "branch:codex-kage-vnext-implementation"]
timestamp: "2026-07-13T18:05:02.011Z"
x-kage-id: "repo:kage-vnext-implementation:workflow:change-memory-codex-kage-vnext-implementation"
x-kage-type: "workflow"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "verified"
x-kage-paths: ["mcp/vnext/context/capsule-builder.ts", "mcp/vnext/context/context.test.ts", "mcp/vnext/context/legacy-source.ts", "mcp/vnext/context/source.ts", "mcp/vnext/context/token-estimate.ts", "mcp/vnext/runtime/server.test.ts", "mcp/vnext/runtime/server.ts"]
---

# Change memory: codex/kage-vnext-implementation

> Repo-local context for 7 changed repo paths on codex/kage-vnext-implementation.

Repo-local change memory generated from the current git diff.

Goal: preserve the durable context another agent should receive when it works in this repo later.

What changed:
- mcp/vnext/context/capsule-builder.ts
- mcp/vnext/context/context.test.ts
- mcp/vnext/context/legacy-source.ts
- mcp/vnext/context/source.ts
- mcp/vnext/context/token-estimate.ts
- mcp/vnext/runtime/server.test.ts
- mcp/vnext/runtime/server.ts

Diff summary:
```text
...ject-trusted-values-from-own-fields-63595f5f.md |   3 +-
 ...-leases-and-a-sqlite-singleton-lock-f04e98bc.md |   7 +-
 mcp/vnext/runtime/server.test.ts                   | 119 +++++++++++++++++++--
 mcp/vnext/runtime/server.ts                        |  32 +++++-
 4 files changed, 144 insertions(+), 17 deletions(-)
.agent_memory/packets/code_explanation-kage-vnext-runtime-composes-bounded-trusted-context-through-a-replaceable-source-f4a6e14b.md | untracked
mcp/vnext/context/capsule-builder.ts | untracked
mcp/vnext/context/context.test.ts | untracked
mcp/vnext/context/legacy-source.ts | untracked
mcp/vnext/context/source.ts | untracked
mcp/vnext/context/token-estimate.ts | untracked
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
{"schema_version":2,"id":"repo:kage-vnext-implementation:workflow:change-memory-codex-kage-vnext-implementation","title":"Change memory: codex/kage-vnext-implementation","summary":"Repo-local context for 7 changed repo paths on codex/kage-vnext-implementation.","body":"Repo-local change memory generated from the current git diff.\n\nGoal: preserve the durable context another agent should receive when it works in this repo later.\n\nWhat changed:\n- mcp/vnext/context/capsule-builder.ts\n- mcp/vnext/context/context.test.ts\n- mcp/vnext/context/legacy-source.ts\n- mcp/vnext/context/source.ts\n- mcp/vnext/context/token-estimate.ts\n- mcp/vnext/runtime/server.test.ts\n- mcp/vnext/runtime/server.ts\n\nDiff summary:\n```text\n...ject-trusted-values-from-own-fields-63595f5f.md |   3 +-\n ...-leases-and-a-sqlite-singleton-lock-f04e98bc.md |   7 +-\n mcp/vnext/runtime/server.test.ts                   | 119 +++++++++++++++++++--\n mcp/vnext/runtime/server.ts                        |  32 +++++-\n 4 files changed, 144 insertions(+), 17 deletions(-)\n.agent_memory/packets/code_explanation-kage-vnext-runtime-composes-bounded-trusted-context-through-a-replaceable-source-f4a6e14b.md | untracked\nmcp/vnext/context/capsule-builder.ts | untracked\nmcp/vnext/context/context.test.ts | untracked\nmcp/vnext/context/legacy-source.ts | untracked\nmcp/vnext/context/source.ts | untracked\nmcp/vnext/context/token-estimate.ts | untracked\n```\n\nHow to verify:\n- Add the exact test, build, or manual verification command when you refine this memory.\n\nImprove this packet when more context is known:\n- The actual feature, fix, or refactor rationale.\n- Why the change was made, including relevant bugs, issues, decisions, and code explanations.\n- The package, API, command, or architectural pattern future agents should understand, verify, or reuse.\n- Any gotchas, follow-up risks, or branch-specific assumptions.\n\nPromote beyond this repo only after explicit org/global review.","type":"workflow","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.62,"tags":["change-memory","diff-proposal","repo-local","branch:codex-kage-vnext-implementation"],"paths":["mcp/vnext/context/capsule-builder.ts","mcp/vnext/context/context.test.ts","mcp/vnext/context/legacy-source.ts","mcp/vnext/context/source.ts","mcp/vnext/context/token-estimate.ts","mcp/vnext/runtime/server.test.ts","mcp/vnext/runtime/server.ts"],"stack":[],"source_refs":[{"kind":"git_diff","branch":"codex/kage-vnext-implementation","head":"011dc0e4fb5747faa0535b8d0994d5c97e9349d3","merge_base":"d3841066df412d29fbb5ba0a58c55566eb85974b","changed_files":[".agent_memory/packets/bug_fix-protocol-validators-project-trusted-values-from-own-fields-63595f5f.md",".agent_memory/packets/code_explanation-kage-vnext-local-runtime-uses-hardened-leases-and-a-sqlite-singleton-lock-f04e98bc.md",".agent_memory/packets/code_explanation-kage-vnext-runtime-composes-bounded-trusted-context-through-a-replaceable-source-f4a6e14b.md","mcp/vnext/context/capsule-builder.ts","mcp/vnext/context/context.test.ts","mcp/vnext/context/legacy-source.ts","mcp/vnext/context/source.ts","mcp/vnext/context/token-estimate.ts","mcp/vnext/runtime/server.test.ts","mcp/vnext/runtime/server.ts"],"summary_path":"/Users/kushaljain/code/Kage/.worktrees/kage-vnext-implementation/.agent_memory/review/branch-summary-codex-kage-vnext-implementation.json"}],"context":{"fact":"Current branch codex/kage-vnext-implementation changes 7 repo paths.","why":"Branch change memory gives future agents durable context from the git diff when they continue, review, or verify this work.","trigger":"Recall when asking what changed on this branch, preparing a PR review, or resuming this work.","action":"Use the changed file list and diff summary as orientation, then inspect the actual diff and source files before making further edits.","verification":"Generated from git diff and refreshed by kage pr summarize or kage propose --from-diff.","risk_if_forgotten":"Future agents may repeat orientation work, miss branch-specific assumptions, or ignore files touched by this change.","stale_when":"The branch diff changes substantially, the branch is merged, or a newer change-memory packet supersedes it."},"freshness":{"last_verified_at":"2026-07-13T18:05:02.011Z","ttl_days":180,"path_fingerprints":[{"path":"mcp/vnext/context/capsule-builder.ts","sha256":"27320e2554e4f8e2c8959ff80b54ed1c2b1a684079708586e59c987cd37d3f6b","size":5083},{"path":"mcp/vnext/context/context.test.ts","sha256":"8bfd28367032689a982921134c00223cc243242040accebc0f358122e05938b9","size":15023},{"path":"mcp/vnext/context/legacy-source.ts","sha256":"ece9438506bece05b201ef26ae17a9fb48514a0cd4ebd81849ee89d68a1004ae","size":7371},{"path":"mcp/vnext/context/source.ts","sha256":"2f2e4dd14b5706acedc054935c47a450e42a5295787f6d843c9d94af11520fd6","size":4529},{"path":"mcp/vnext/context/token-estimate.ts","sha256":"8e779e174fd116d832cfbab89f6f35becee4b71da6e14f92c685bc377c8e51a9","size":114},{"path":"mcp/vnext/runtime/server.test.ts","sha256":"bdcc9efa7a6cabd5bcb65063200443ecba1b9828dbb75a4d7d4ed6a780b8093b","size":38774},{"path":"mcp/vnext/runtime/server.ts","sha256":"03ad38c2c8a2bcd3433de532d34852cc9820e0b6496a72da7a7c5af0fade097b","size":15154}],"path_fingerprint_policy":"source_hash_staleness","verification":"git_diff"},"edges":[{"relation":"changes_path","to":"path:.agent_memory/packets/bug_fix-protocol-validators-project-trusted-values-from-own-fields-63595f5f.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/code_explanation-kage-vnext-local-runtime-uses-hardened-leases-and-a-sqlite-singleton-lock-f04e98bc.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/code_explanation-kage-vnext-runtime-composes-bounded-trusted-context-through-a-replaceable-source-f4a6e14b.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/vnext/context/capsule-builder.ts","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/vnext/context/context.test.ts","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/vnext/context/legacy-source.ts","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/vnext/context/source.ts","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/vnext/context/token-estimate.ts","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/vnext/runtime/server.test.ts","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/vnext/runtime/server.ts","evidence":"git_diff"}],"quality":{"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"stale_reasons":[],"estimated_tokens_saved":418,"admission":{"admit":true,"class":"candidate","score":70,"reasons":["durable memory type","has provenance","repo scoped or path grounded","has durable trigger, rationale, issue context, or explanation","substantive enough to reuse"],"risks":[]},"candidate_kind":"change_memory","review_boundary":"git_or_pr","promotion_requires_review":true},"created_at":"2026-07-13T18:05:02.011Z","updated_at":"2026-07-13T18:05:02.011Z"}
```
