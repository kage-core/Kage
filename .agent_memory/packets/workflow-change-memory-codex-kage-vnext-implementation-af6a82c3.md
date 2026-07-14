---
type: "Workflow"
title: "Change memory: codex/kage-vnext-implementation"
description: "Repo-local context for 7 changed repo paths on codex/kage-vnext-implementation."
resource: "mcp/vnext/context/capsule-builder.ts"
tags: ["change-memory", "diff-proposal", "repo-local", "branch:codex-kage-vnext-implementation"]
timestamp: "2026-07-14T16:22:32.925Z"
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
[2] reverification
[3] reverification

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:kage-vnext-implementation:workflow:change-memory-codex-kage-vnext-implementation","title":"Change memory: codex/kage-vnext-implementation","summary":"Repo-local context for 7 changed repo paths on codex/kage-vnext-implementation.","body":"Repo-local change memory generated from the current git diff.\n\nGoal: preserve the durable context another agent should receive when it works in this repo later.\n\nWhat changed:\n- mcp/vnext/context/capsule-builder.ts\n- mcp/vnext/context/context.test.ts\n- mcp/vnext/context/legacy-source.ts\n- mcp/vnext/context/source.ts\n- mcp/vnext/context/token-estimate.ts\n- mcp/vnext/runtime/server.test.ts\n- mcp/vnext/runtime/server.ts\n\nDiff summary:\n```text\n...ject-trusted-values-from-own-fields-63595f5f.md |   3 +-\n ...-leases-and-a-sqlite-singleton-lock-f04e98bc.md |   7 +-\n mcp/vnext/runtime/server.test.ts                   | 119 +++++++++++++++++++--\n mcp/vnext/runtime/server.ts                        |  32 +++++-\n 4 files changed, 144 insertions(+), 17 deletions(-)\n.agent_memory/packets/code_explanation-kage-vnext-runtime-composes-bounded-trusted-context-through-a-replaceable-source-f4a6e14b.md | untracked\nmcp/vnext/context/capsule-builder.ts | untracked\nmcp/vnext/context/context.test.ts | untracked\nmcp/vnext/context/legacy-source.ts | untracked\nmcp/vnext/context/source.ts | untracked\nmcp/vnext/context/token-estimate.ts | untracked\n```\n\nHow to verify:\n- Add the exact test, build, or manual verification command when you refine this memory.\n\nImprove this packet when more context is known:\n- The actual feature, fix, or refactor rationale.\n- Why the change was made, including relevant bugs, issues, decisions, and code explanations.\n- The package, API, command, or architectural pattern future agents should understand, verify, or reuse.\n- Any gotchas, follow-up risks, or branch-specific assumptions.\n\nPromote beyond this repo only after explicit org/global review.","type":"workflow","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.62,"tags":["change-memory","diff-proposal","repo-local","branch:codex-kage-vnext-implementation"],"paths":["mcp/vnext/context/capsule-builder.ts","mcp/vnext/context/context.test.ts","mcp/vnext/context/legacy-source.ts","mcp/vnext/context/source.ts","mcp/vnext/context/token-estimate.ts","mcp/vnext/runtime/server.test.ts","mcp/vnext/runtime/server.ts"],"stack":[],"source_refs":[{"kind":"git_diff","branch":"codex/kage-vnext-implementation","head":"011dc0e4fb5747faa0535b8d0994d5c97e9349d3","merge_base":"d3841066df412d29fbb5ba0a58c55566eb85974b","changed_files":[".agent_memory/packets/bug_fix-protocol-validators-project-trusted-values-from-own-fields-63595f5f.md",".agent_memory/packets/code_explanation-kage-vnext-local-runtime-uses-hardened-leases-and-a-sqlite-singleton-lock-f04e98bc.md",".agent_memory/packets/code_explanation-kage-vnext-runtime-composes-bounded-trusted-context-through-a-replaceable-source-f4a6e14b.md","mcp/vnext/context/capsule-builder.ts","mcp/vnext/context/context.test.ts","mcp/vnext/context/legacy-source.ts","mcp/vnext/context/source.ts","mcp/vnext/context/token-estimate.ts","mcp/vnext/runtime/server.test.ts","mcp/vnext/runtime/server.ts"],"summary_path":"/Users/kushaljain/code/Kage/.worktrees/kage-vnext-implementation/.agent_memory/review/branch-summary-codex-kage-vnext-implementation.json"},{"kind":"reverification","at":"2026-07-14T15:17:41.699Z","verified_by":"npm run build --prefix mcp; node --test mcp/dist/vnext/context/context.test.js mcp/dist/vnext/runtime/server.test.js (59/59); npm test --prefix mcp (531/531)","evidence":"Task 4 landed on this branch across 5aef382, 236985b, b8a3f54; the cited context and runtime files changed but the packet's claim (repo-local change memory for this branch) still holds.","changed_paths":[{"path":"mcp/vnext/context/capsule-builder.ts","prior_sha256":"27320e2554e4f8e2c8959ff80b54ed1c2b1a684079708586e59c987cd37d3f6b","sha256":"c5bc27701762e8ee71dc2bf7bd3f0499a4f13c89df8fc421f48833e319a596ed"},{"path":"mcp/vnext/context/context.test.ts","prior_sha256":"8bfd28367032689a982921134c00223cc243242040accebc0f358122e05938b9","sha256":"bce83f0469d39e2e47f0612310a9f70d28f03c9be535437e49c44d8ce798e83e"},{"path":"mcp/vnext/context/legacy-source.ts","prior_sha256":"ece9438506bece05b201ef26ae17a9fb48514a0cd4ebd81849ee89d68a1004ae","sha256":"ebc8295ed72e71947110e9609e63b519a6ce57506c63f95dc6645791203c623d"},{"path":"mcp/vnext/context/source.ts","prior_sha256":"2f2e4dd14b5706acedc054935c47a450e42a5295787f6d843c9d94af11520fd6","sha256":"c9392fa8ceb2e10ab3bbc8c45cf97ae9d1059604a16b1e30ed2a78a6855e3885"},{"path":"mcp/vnext/context/token-estimate.ts","prior_sha256":"8e779e174fd116d832cfbab89f6f35becee4b71da6e14f92c685bc377c8e51a9","sha256":"123384c1a507d51929b644ccbf28199f2d9c5494124f89c034df06df53c6a8b2"},{"path":"mcp/vnext/runtime/server.test.ts","prior_sha256":"bdcc9efa7a6cabd5bcb65063200443ecba1b9828dbb75a4d7d4ed6a780b8093b","sha256":"dea8130f1b49612db9a15610d90acf0ea8bb12a9589992bbae5d4782171b86b1"},{"path":"mcp/vnext/runtime/server.ts","prior_sha256":"03ad38c2c8a2bcd3433de532d34852cc9820e0b6496a72da7a7c5af0fade097b","sha256":"e86e525a1436cb3e73f822f9ec998aaf5e081c5c556860f5588f348adce012d5"}]},{"kind":"reverification","at":"2026-07-14T16:22:32.925Z","verified_by":"npm test --prefix mcp (547/547); node --test mcp/dist/vnext/context/context.test.js mcp/dist/vnext/runtime/server.test.js (71/71); dogfood 12/12","evidence":"Cited files changed by the vNext context worker offload (8daa017, 6b25d23) and the MCP unknown-parameter rejection (fbb3531, 880ebec). Re-read each packet's claim against the new code: the claims are unchanged. The MCP change adds unknown-arg rejection and declares two previously-undocumented params; it does not alter the core tool set, param-description convention, recall/capture behavior, or the SDLC pipeline.","changed_paths":[{"path":"mcp/vnext/context/context.test.ts","prior_sha256":"bce83f0469d39e2e47f0612310a9f70d28f03c9be535437e49c44d8ce798e83e","sha256":"368fffc5e331420b25f9f8e09b0db4ab1a03bbe97cd76ffc124f9e6fda914bd9"},{"path":"mcp/vnext/context/legacy-source.ts","prior_sha256":"ebc8295ed72e71947110e9609e63b519a6ce57506c63f95dc6645791203c623d","sha256":"9836d5fb2926d65acb3559ccd84b66361b93d9fed07ce7055105144bd9c7a1c8"},{"path":"mcp/vnext/context/source.ts","prior_sha256":"c9392fa8ceb2e10ab3bbc8c45cf97ae9d1059604a16b1e30ed2a78a6855e3885","sha256":"d83b28f6368cd4573b77da36b66eb60f660178d2bdcadcbe3d0a64f697e412f5"},{"path":"mcp/vnext/runtime/server.test.ts","prior_sha256":"dea8130f1b49612db9a15610d90acf0ea8bb12a9589992bbae5d4782171b86b1","sha256":"1494f76a2c8194daf053740667ab5e54e023c2ce3fec6f2694dd18e912992a49"},{"path":"mcp/vnext/runtime/server.ts","prior_sha256":"e86e525a1436cb3e73f822f9ec998aaf5e081c5c556860f5588f348adce012d5","sha256":"54e27c87aebf4e430a7c0b30fc59e97245104c9aaaec9b6d89c4404ff9c3b514"}]}],"context":{"fact":"Current branch codex/kage-vnext-implementation changes 7 repo paths.","why":"Branch change memory gives future agents durable context from the git diff when they continue, review, or verify this work.","trigger":"Recall when asking what changed on this branch, preparing a PR review, or resuming this work.","action":"Use the changed file list and diff summary as orientation, then inspect the actual diff and source files before making further edits.","verification":"Generated from git diff and refreshed by kage pr summarize or kage propose --from-diff.","risk_if_forgotten":"Future agents may repeat orientation work, miss branch-specific assumptions, or ignore files touched by this change.","stale_when":"The branch diff changes substantially, the branch is merged, or a newer change-memory packet supersedes it."},"freshness":{"last_verified_at":"2026-07-14T16:22:32.925Z","ttl_days":180,"path_fingerprints":[{"path":"mcp/vnext/context/capsule-builder.ts","sha256":"c5bc27701762e8ee71dc2bf7bd3f0499a4f13c89df8fc421f48833e319a596ed","size":7578},{"path":"mcp/vnext/context/context.test.ts","sha256":"368fffc5e331420b25f9f8e09b0db4ab1a03bbe97cd76ffc124f9e6fda914bd9","size":34770},{"path":"mcp/vnext/context/legacy-source.ts","sha256":"9836d5fb2926d65acb3559ccd84b66361b93d9fed07ce7055105144bd9c7a1c8","size":9541},{"path":"mcp/vnext/context/source.ts","sha256":"d83b28f6368cd4573b77da36b66eb60f660178d2bdcadcbe3d0a64f697e412f5","size":6580},{"path":"mcp/vnext/context/token-estimate.ts","sha256":"123384c1a507d51929b644ccbf28199f2d9c5494124f89c034df06df53c6a8b2","size":223},{"path":"mcp/vnext/runtime/server.test.ts","sha256":"1494f76a2c8194daf053740667ab5e54e023c2ce3fec6f2694dd18e912992a49","size":47625},{"path":"mcp/vnext/runtime/server.ts","sha256":"54e27c87aebf4e430a7c0b30fc59e97245104c9aaaec9b6d89c4404ff9c3b514","size":16247}],"path_fingerprint_policy":"source_hash_staleness","verification":"evidence_reverification"},"edges":[{"relation":"changes_path","to":"path:.agent_memory/packets/bug_fix-protocol-validators-project-trusted-values-from-own-fields-63595f5f.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/code_explanation-kage-vnext-local-runtime-uses-hardened-leases-and-a-sqlite-singleton-lock-f04e98bc.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/code_explanation-kage-vnext-runtime-composes-bounded-trusted-context-through-a-replaceable-source-f4a6e14b.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/vnext/context/capsule-builder.ts","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/vnext/context/context.test.ts","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/vnext/context/legacy-source.ts","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/vnext/context/source.ts","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/vnext/context/token-estimate.ts","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/vnext/runtime/server.test.ts","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/vnext/runtime/server.ts","evidence":"git_diff"}],"quality":{"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":418,"admission":{"admit":true,"class":"candidate","score":70,"reasons":["durable memory type","has provenance","repo scoped or path grounded","has durable trigger, rationale, issue context, or explanation","substantive enough to reuse"],"risks":[]},"candidate_kind":"change_memory","review_boundary":"git_or_pr","promotion_requires_review":true,"reverified_at":"2026-07-14T16:22:32.925Z"},"created_at":"2026-07-13T18:05:02.011Z","updated_at":"2026-07-14T16:22:32.925Z"}
```

