---
type: "Workflow"
title: "Change memory: gap/auto-capture-continuity"
description: "Repo-local context for 11 changed repo paths on gap/auto-capture-continuity."
resource: "CHANGELOG.md"
tags: ["change-memory", "diff-proposal", "repo-local", "branch:gap-auto-capture-continuity"]
timestamp: "2026-06-15T21:58:19.171Z"
x-kage-id: "repo:agent-a9571b4b7b8fb514a:workflow:change-memory-gap-auto-capture-continuity"
x-kage-type: "workflow"
x-kage-status: "deprecated"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "deprecated"
x-kage-paths: ["CHANGELOG.md", "mcp/cli.ts", "mcp/kernel.test.ts", "mcp/kernel.ts", "plugin/hooks/session-start.sh", "plugin/hooks/stop.sh"]
---

# Change memory: gap/auto-capture-continuity

> Repo-local context for 11 changed repo paths on gap/auto-capture-continuity.

Repo-local change memory generated from the current git diff.

Goal: preserve the durable context another agent should receive when it works in this repo later.

What changed:
- .agent_memory/packets/reference-claude-mem-implementation-teardown-zero-verification-confirmed-5-mechanics-worth-f7674b1c.json
- .agent_memory/packets/workflow-auto-distill-fallback-and-kage-resume-continuity-88de2220.json
- .agent_memory/packets/workflow-change-memory-master-23634276.json
- .agent_memory/packets/workflow-change-memory-release-v2-0-1-d6e19752.json
- .agent_memory/packets/workflow-stale-catch-feature-landed-via-pr-64-kernel-test-ts-seam-carries-both-v2-test-su-9ad40729.json
- CHANGELOG.md
- mcp/cli.ts
- mcp/kernel.test.ts
- mcp/kernel.ts
- plugin/hooks/session-start.sh
- plugin/hooks/stop.sh

Diff summary:
```text
...ation-confirmed-5-mechanics-worth-f7674b1c.json |   9 +-
 .../workflow-change-memory-master-23634276.json    |   3 +-
 ...flow-change-memory-release-v2-0-1-d6e19752.json |   4 +-
 ...t-ts-seam-carries-both-v2-test-su-9ad40729.json |   4 +-
 CHANGELOG.md                                       |  15 ++
 mcp/cli.ts                                         |  29 ++-
 mcp/kernel.test.ts                                 | 120 +++++++++++++
 mcp/kernel.ts                                      | 197 ++++++++++++++++++++-
 plugin/hooks/session-start.sh                      |  10 ++
 plugin/hooks/stop.sh                               |  14 ++
 10 files changed, 384 insertions(+), 21 deletions(-)
.agent_memory/packets/workflow-auto-distill-fallback-and-kage-resume-continuity-88de2220.json | untracked
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
{"schema_version":2,"id":"repo:agent-a9571b4b7b8fb514a:workflow:change-memory-gap-auto-capture-continuity","title":"Change memory: gap/auto-capture-continuity","summary":"Repo-local context for 11 changed repo paths on gap/auto-capture-continuity.","body":"Repo-local change memory generated from the current git diff.\n\nGoal: preserve the durable context another agent should receive when it works in this repo later.\n\nWhat changed:\n- .agent_memory/packets/reference-claude-mem-implementation-teardown-zero-verification-confirmed-5-mechanics-worth-f7674b1c.json\n- .agent_memory/packets/workflow-auto-distill-fallback-and-kage-resume-continuity-88de2220.json\n- .agent_memory/packets/workflow-change-memory-master-23634276.json\n- .agent_memory/packets/workflow-change-memory-release-v2-0-1-d6e19752.json\n- .agent_memory/packets/workflow-stale-catch-feature-landed-via-pr-64-kernel-test-ts-seam-carries-both-v2-test-su-9ad40729.json\n- CHANGELOG.md\n- mcp/cli.ts\n- mcp/kernel.test.ts\n- mcp/kernel.ts\n- plugin/hooks/session-start.sh\n- plugin/hooks/stop.sh\n\nDiff summary:\n```text\n...ation-confirmed-5-mechanics-worth-f7674b1c.json |   9 +-\n .../workflow-change-memory-master-23634276.json    |   3 +-\n ...flow-change-memory-release-v2-0-1-d6e19752.json |   4 +-\n ...t-ts-seam-carries-both-v2-test-su-9ad40729.json |   4 +-\n CHANGELOG.md                                       |  15 ++\n mcp/cli.ts                                         |  29 ++-\n mcp/kernel.test.ts                                 | 120 +++++++++++++\n mcp/kernel.ts                                      | 197 ++++++++++++++++++++-\n plugin/hooks/session-start.sh                      |  10 ++\n plugin/hooks/stop.sh                               |  14 ++\n 10 files changed, 384 insertions(+), 21 deletions(-)\n.agent_memory/packets/workflow-auto-distill-fallback-and-kage-resume-continuity-88de2220.json | untracked\n```\n\nHow to verify:\n- Add the exact test, build, or manual verification command when you refine this memory.\n\nImprove this packet when more context is known:\n- The actual feature, fix, or refactor rationale.\n- Why the change was made, including relevant bugs, issues, decisions, and code explanations.\n- The package, API, command, or architectural pattern future agents should understand, verify, or reuse.\n- Any gotchas, follow-up risks, or branch-specific assumptions.\n\nPromote beyond this repo only after explicit org/global review.","type":"workflow","scope":"repo","visibility":"team","sensitivity":"internal","status":"deprecated","confidence":0.62,"tags":["change-memory","diff-proposal","repo-local","branch:gap-auto-capture-continuity"],"paths":["CHANGELOG.md","mcp/cli.ts","mcp/kernel.test.ts","mcp/kernel.ts","plugin/hooks/session-start.sh","plugin/hooks/stop.sh"],"stack":[],"source_refs":[{"kind":"git_diff","branch":"gap/auto-capture-continuity","head":"a19697c3b474c9fc9fd080f7008512b26ecaf09d","merge_base":"a19697c3b474c9fc9fd080f7008512b26ecaf09d","changed_files":[".agent_memory/packets/reference-claude-mem-implementation-teardown-zero-verification-confirmed-5-mechanics-worth-f7674b1c.json",".agent_memory/packets/workflow-auto-distill-fallback-and-kage-resume-continuity-88de2220.json",".agent_memory/packets/workflow-change-memory-master-23634276.json",".agent_memory/packets/workflow-change-memory-release-v2-0-1-d6e19752.json",".agent_memory/packets/workflow-stale-catch-feature-landed-via-pr-64-kernel-test-ts-seam-carries-both-v2-test-su-9ad40729.json","CHANGELOG.md","mcp/cli.ts","mcp/kernel.test.ts","mcp/kernel.ts","plugin/hooks/session-start.sh","plugin/hooks/stop.sh"],"summary_path":"/Users/kushaljain/code/Kage/.claude/worktrees/agent-a9571b4b7b8fb514a/.agent_memory/review/branch-summary-gap-auto-capture-continuity.json"}],"context":{"fact":"Current branch gap/auto-capture-continuity changes 11 repo paths.","why":"Branch change memory gives future agents durable context from the git diff when they continue, review, or verify this work.","trigger":"Recall when asking what changed on this branch, preparing a PR review, or resuming this work.","action":"Use the changed file list and diff summary as orientation, then inspect the actual diff and source files before making further edits.","verification":"Generated from git diff and refreshed by kage pr summarize or kage propose --from-diff.","risk_if_forgotten":"Future agents may repeat orientation work, miss branch-specific assumptions, or ignore files touched by this change.","stale_when":"The branch diff changes substantially, the branch is merged, or a newer change-memory packet supersedes it."},"freshness":{"last_verified_at":"2026-06-15T21:58:19.171Z","ttl_days":180,"path_fingerprints":[{"path":"CHANGELOG.md","sha256":"1d00aff932a74d380dad6e0d60ae0aed37e40aa5a03ae7ec0acb71f824d0ef0c","size":46022},{"path":"mcp/cli.ts","sha256":"a670bc601e227372c9ab3e862f4e25fa87ae4bfa90b63c3bbc61032d332da0d7","size":114201,"symbols":[{"name":"review","kind":"function","sha256":"cd5b65cd476d7eaecccc181de3bcad5b3d7c99237dcbfce313709f8eb35f9a13"},{"name":"command","kind":"constant","sha256":"9e594169e1f8559f50d7e73b407f1aa3a9a0f14bf43a676fedefa72734badb98"},{"name":"json","kind":"constant","sha256":"9115381310c6d4c5ecb25a7e67e4fd0bb4b20a9b328adb25b606065454f79370"},{"name":"current","kind":"constant","sha256":"471f3cfbffa04d6ecddb2f3d4013027b71237de766afb69ec418f1f1b8308937"},{"name":"agent","kind":"constant","sha256":"5b9caa614311fe691d6af171b9a8985b0d49464b9df178ad28ff5b9883eb4cf2"},{"name":"from","kind":"constant","sha256":"b386d829bcacbd9e216c726f6dff71fc7d8a53aade383fa45b850387414b780c"},{"name":"summary","kind":"constant","sha256":"0938b0afc17695033381e2248401bba9b7c6abb6f9f0eaae0d2a8ff2c660d662"},{"name":"durable","kind":"constant","sha256":"59e1af86ee722f58562da0478f6f3fe6621ae96f9473de8c0037e63fe779215e"},{"name":"auto","kind":"constant","sha256":"b35a15a3c084f482674a7f570c7cdc322236fb24a812c3607b8a0e622927f531"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"packets","kind":"constant","sha256":"f28a69afbf5d7a988e351fc5446a3b291a2451f97b8220c4e1a7629b3a50ffa3"},{"name":"changed","kind":"constant","sha256":"8acd4ea8821c48290e59ddcd8f60fc34f9c721f4cc2c515fcff04820d8b159cd"},{"name":"claude","kind":"constant","sha256":"30e40d593cb285fac2f86d1766fed1b16495cc38548f9b27af90a180acfac1d6"},{"name":"manual","kind":"constant","sha256":"f8502a2f13344d0dc48912357b32bd77516b46c56e970206fce7993703ff91bf"},{"name":"reference","kind":"constant","sha256":"ea0156b0af7eca0a3b159bd94ec6d6b12f0506c9bc51164bcfdd4e3b3a294177"}]},{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"untracked","kind":"constant","sha256":"8d31cffa2e43e8e8498c30a2e6eeb043120941acd973d64ecda430b13f52d855"},{"name":"explicit","kind":"constant","sha256":"3c7dc76a866b9617850dd05c43ef877cc5208ade5be761331cf32181ace414ff"},{"name":"verification","kind":"constant","sha256":"faeb54eb75a6e60ebcab087f39fdd9f971c8a3a16e25846647ab2dd5802748f3"},{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"},{"name":"after","kind":"constant","sha256":"220a1c1969c37d53268e215419dcea650ffa901162d0a25e451bd90831fb0a1b"},{"name":"verify","kind":"constant","sha256":"a52f5b45a4f358248075422f84ac83e7d291e8e7acb866eeabdb692896bc9c0d"},{"name":"relevant","kind":"constant","sha256":"ecda229c929f06ede369f9d72be3d3211fef450b1056b73a121c5d925fac2c2b"},{"name":"capture","kind":"function","sha256":"d6ab6995f6712c0c94fc325e5aaaf3f495bdd81ba660e115f3d467f89f93ef29"},{"name":"hooks","kind":"constant","sha256":"7291847ee5dfe9b56b32a270d8bb6309f5740dde9443103ede1b01a377155e78"},{"name":"durable","kind":"constant","sha256":"3fa48acfe2e95fa0fcf831049f2d1aa3ddf26ddc5a1d10724db5da185389e634"},{"name":"auto","kind":"constant","sha256":"00dfd4334aa51ffac12b575a6a2c33040556f4641b8e8806bee9af6d653df46c"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"},{"name":"changelog","kind":"function","sha256":"1b80272f5a58f56742b1e1ffccb8b8bad542436311476eca4a275896297f76af"},{"name":"when","kind":"constant","sha256":"48bfd58b3cdbf2d407e4443b90727d548d96eceaa4372c099dcd22c52f498452"}]},{"path":"plugin/hooks/session-start.sh","sha256":"c56aef5f98ae30cb2b3fb6601695b7a9255d60aeb9fa7b58290242c2796a6c5b","size":1919},{"path":"plugin/hooks/stop.sh","sha256":"cc7414511674dcf61bb40c7c37be23c5b7327f2caa979d8b8b1aebe25d4fbaef","size":2229}],"path_fingerprint_policy":"source_hash_staleness","verification":"git_diff"},"edges":[{"relation":"changes_path","to":"path:.agent_memory/packets/reference-claude-mem-implementation-teardown-zero-verification-confirmed-5-mechanics-worth-f7674b1c.json","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/workflow-auto-distill-fallback-and-kage-resume-continuity-88de2220.json","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/workflow-change-memory-master-23634276.json","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/workflow-change-memory-release-v2-0-1-d6e19752.json","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/workflow-stale-catch-feature-landed-via-pr-64-kernel-test-ts-seam-carries-both-v2-test-su-9ad40729.json","evidence":"git_diff"},{"relation":"changes_path","to":"path:CHANGELOG.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/cli.ts","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/kernel.test.ts","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/kernel.ts","evidence":"git_diff"},{"relation":"changes_path","to":"path:plugin/hooks/session-start.sh","evidence":"git_diff"},{"relation":"changes_path","to":"path:plugin/hooks/stop.sh","evidence":"git_diff"}],"quality":{"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":538,"admission":{"admit":true,"class":"candidate","score":70,"reasons":["durable memory type","has provenance","repo scoped or path grounded","has durable trigger, rationale, issue context, or explanation","substantive enough to reuse"],"risks":[]},"candidate_kind":"change_memory","review_boundary":"git_or_pr","promotion_requires_review":true,"reverified_at":"2026-06-15T21:58:19.171Z","stale":true,"stale_reasons":["packet status is deprecated","linked path changed since memory was verified: mcp/cli.ts, mcp/kernel.ts, plugin/hooks/session-start.sh, plugin/hooks/stop.sh"],"suggested_action":"mark_stale"},"created_at":"2026-06-12T06:06:29.440Z","updated_at":"2026-06-21T17:14:22.802Z"}
```

