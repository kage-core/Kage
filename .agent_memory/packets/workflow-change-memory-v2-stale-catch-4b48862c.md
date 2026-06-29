---
type: "Workflow"
title: "Change memory: v2/stale-catch"
description: "Repo-local context for 6 changed repo paths on v2/stale-catch."
resource: "mcp/cli.ts"
tags: ["change-memory", "diff-proposal", "repo-local", "branch:v2-stale-catch"]
timestamp: "2026-06-15T21:58:23.833Z"
x-kage-id: "repo:memory:workflow:change-memory-v2-stale-catch"
x-kage-type: "workflow"
x-kage-status: "deprecated"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.62
x-kage-verified: "deprecated"
x-kage-paths: ["mcp/cli.ts", "mcp/index.ts", "mcp/kernel.test.ts", "mcp/kernel.ts", "mcp/mcp.test.ts"]
---

# Change memory: v2/stale-catch

> Repo-local context for 6 changed repo paths on v2/stale-catch.

Repo-local change memory generated from the current git diff.

Goal: preserve the durable context another agent should receive when it works in this repo later.

What changed:
- .agent_memory/packets/code_explanation-stale-catch-change-time-invalidation-heartbeat-stalecatch-kage-staleguard-b1f7baca.json
- mcp/cli.ts
- mcp/index.ts
- mcp/kernel.test.ts
- mcp/kernel.ts
- mcp/mcp.test.ts

Diff summary:
```text
mcp/cli.ts         |  40 +++++++++++++++++++-
 mcp/index.ts       |  12 ++++--
 mcp/kernel.test.ts |  76 +++++++++++++++++++++++++++++++++++++
 mcp/kernel.ts      | 107 +++++++++++++++++++++++++++++++++++++++++++++++++++--
 mcp/mcp.test.ts    |   5 ++-
 5 files changed, 230 insertions(+), 10 deletions(-)
.agent_memory/packets/code_explanation-stale-catch-change-time-invalidation-heartbeat-stalecatch-kage-staleguard-b1f7baca.json | untracked
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
{"schema_version":2,"id":"repo:memory:workflow:change-memory-v2-stale-catch","title":"Change memory: v2/stale-catch","summary":"Repo-local context for 6 changed repo paths on v2/stale-catch.","body":"Repo-local change memory generated from the current git diff.\n\nGoal: preserve the durable context another agent should receive when it works in this repo later.\n\nWhat changed:\n- .agent_memory/packets/code_explanation-stale-catch-change-time-invalidation-heartbeat-stalecatch-kage-staleguard-b1f7baca.json\n- mcp/cli.ts\n- mcp/index.ts\n- mcp/kernel.test.ts\n- mcp/kernel.ts\n- mcp/mcp.test.ts\n\nDiff summary:\n```text\nmcp/cli.ts         |  40 +++++++++++++++++++-\n mcp/index.ts       |  12 ++++--\n mcp/kernel.test.ts |  76 +++++++++++++++++++++++++++++++++++++\n mcp/kernel.ts      | 107 +++++++++++++++++++++++++++++++++++++++++++++++++++--\n mcp/mcp.test.ts    |   5 ++-\n 5 files changed, 230 insertions(+), 10 deletions(-)\n.agent_memory/packets/code_explanation-stale-catch-change-time-invalidation-heartbeat-stalecatch-kage-staleguard-b1f7baca.json | untracked\n```\n\nHow to verify:\n- Add the exact test, build, or manual verification command when you refine this memory.\n\nImprove this packet when more context is known:\n- The actual feature, fix, or refactor rationale.\n- Why the change was made, including relevant bugs, issues, decisions, and code explanations.\n- The package, API, command, or architectural pattern future agents should understand, verify, or reuse.\n- Any gotchas, follow-up risks, or branch-specific assumptions.\n\nPromote beyond this repo only after explicit org/global review.","type":"workflow","scope":"repo","visibility":"team","sensitivity":"internal","status":"deprecated","confidence":0.62,"tags":["change-memory","diff-proposal","repo-local","branch:v2-stale-catch"],"paths":["mcp/cli.ts","mcp/index.ts","mcp/kernel.test.ts","mcp/kernel.ts","mcp/mcp.test.ts"],"stack":[],"source_refs":[{"kind":"git_diff","branch":"v2/stale-catch","head":"1b3cf7a888169c62066390be141752ed73d2716b","merge_base":"1b3cf7a888169c62066390be141752ed73d2716b","changed_files":[".agent_memory/packets/code_explanation-stale-catch-change-time-invalidation-heartbeat-stalecatch-kage-staleguard-b1f7baca.json","mcp/cli.ts","mcp/index.ts","mcp/kernel.test.ts","mcp/kernel.ts","mcp/mcp.test.ts"],"summary_path":".agent_memory/review/branch-summary-v2-stale-catch.json"}],"context":{"fact":"Current branch v2/stale-catch changes 6 repo paths.","why":"Branch change memory gives future agents durable context from the git diff when they continue, review, or verify this work.","trigger":"Recall when asking what changed on this branch, preparing a PR review, or resuming this work.","action":"Use the changed file list and diff summary as orientation, then inspect the actual diff and source files before making further edits.","verification":"Generated from git diff and refreshed by kage pr summarize or kage propose --from-diff.","risk_if_forgotten":"Future agents may repeat orientation work, miss branch-specific assumptions, or ignore files touched by this change.","stale_when":"The branch diff changes substantially, the branch is merged, or a newer change-memory packet supersedes it."},"freshness":{"last_verified_at":"2026-06-15T21:58:23.833Z","ttl_days":180,"path_fingerprints":[{"path":"mcp/cli.ts","sha256":"a670bc601e227372c9ab3e862f4e25fa87ae4bfa90b63c3bbc61032d332da0d7","size":114201,"symbols":[{"name":"index","kind":"constant","sha256":"c201ee64cf24065dd2ba0bbdc7ff8399e5c1dd89783820e501d28f82019f08a8"},{"name":"review","kind":"function","sha256":"cd5b65cd476d7eaecccc181de3bcad5b3d7c99237dcbfce313709f8eb35f9a13"},{"name":"command","kind":"constant","sha256":"9e594169e1f8559f50d7e73b407f1aa3a9a0f14bf43a676fedefa72734badb98"},{"name":"json","kind":"constant","sha256":"9115381310c6d4c5ecb25a7e67e4fd0bb4b20a9b328adb25b606065454f79370"},{"name":"current","kind":"constant","sha256":"471f3cfbffa04d6ecddb2f3d4013027b71237de766afb69ec418f1f1b8308937"},{"name":"agent","kind":"constant","sha256":"5b9caa614311fe691d6af171b9a8985b0d49464b9df178ad28ff5b9883eb4cf2"},{"name":"from","kind":"constant","sha256":"b386d829bcacbd9e216c726f6dff71fc7d8a53aade383fa45b850387414b780c"},{"name":"summary","kind":"constant","sha256":"0938b0afc17695033381e2248401bba9b7c6abb6f9f0eaae0d2a8ff2c660d662"},{"name":"durable","kind":"constant","sha256":"59e1af86ee722f58562da0478f6f3fe6621ae96f9473de8c0037e63fe779215e"}]},{"path":"mcp/index.ts","sha256":"d5abac0cb8d92d9074ae37a32ee515da8b03c43fe2d1a03d44447ee7b3493861","size":69453,"symbols":[{"name":"summary","kind":"constant","sha256":"16f7c65f25e8bfb3d6fca589dbf7ddcc3930490fe5a6dcdb90e6a7e5dd344398"},{"name":"index","kind":"constant","sha256":"ad98a75521fc0edce4fed6c6cd0503a41df66728efc44c4c3904db6a6ac89d7f"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"packets","kind":"constant","sha256":"f28a69afbf5d7a988e351fc5446a3b291a2451f97b8220c4e1a7629b3a50ffa3"},{"name":"changed","kind":"constant","sha256":"8acd4ea8821c48290e59ddcd8f60fc34f9c721f4cc2c515fcff04820d8b159cd"},{"name":"manual","kind":"constant","sha256":"f8502a2f13344d0dc48912357b32bd77516b46c56e970206fce7993703ff91bf"}]},{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"time","kind":"constant","sha256":"36aa0a901e7fda47d7d7571d9c21879432386e4418ed56010d7e03c9a91f5482"},{"name":"untracked","kind":"constant","sha256":"8d31cffa2e43e8e8498c30a2e6eeb043120941acd973d64ecda430b13f52d855"},{"name":"explicit","kind":"constant","sha256":"3c7dc76a866b9617850dd05c43ef877cc5208ade5be761331cf32181ace414ff"},{"name":"verification","kind":"constant","sha256":"faeb54eb75a6e60ebcab087f39fdd9f971c8a3a16e25846647ab2dd5802748f3"},{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"},{"name":"after","kind":"constant","sha256":"220a1c1969c37d53268e215419dcea650ffa901162d0a25e451bd90831fb0a1b"},{"name":"verify","kind":"constant","sha256":"a52f5b45a4f358248075422f84ac83e7d291e8e7acb866eeabdb692896bc9c0d"},{"name":"relevant","kind":"constant","sha256":"ecda229c929f06ede369f9d72be3d3211fef450b1056b73a121c5d925fac2c2b"},{"name":"durable","kind":"constant","sha256":"3fa48acfe2e95fa0fcf831049f2d1aa3ddf26ddc5a1d10724db5da185389e634"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"},{"name":"stalecatch","kind":"function","sha256":"f5c8a3a19318806b2dd089f0ece8a92a7b5799089c796665109fc20c63fdab9a"},{"name":"when","kind":"constant","sha256":"48bfd58b3cdbf2d407e4443b90727d548d96eceaa4372c099dcd22c52f498452"}]},{"path":"mcp/mcp.test.ts","sha256":"3f5e52ad72a2a4b4db9e8de8bdad60cfb622ec132c2a278523ca6aad79538ec0","size":37910,"symbols":[{"name":"context","kind":"constant","sha256":"94e5c3947ba282a9ec60de88384111292e685f5f46509d61ddf1eadfab8915da"},{"name":"packets","kind":"constant","sha256":"8e24ebb99173a9fd5301b27e9ac55682bbb2605c03f9db6118e86695ee44a56d"},{"name":"summary","kind":"constant","sha256":"ce5a0ae27c7e31896d8b1045100cf88f02038a09fb4ac7e4991f3d466fe095a3"},{"name":"verify","kind":"constant","sha256":"f02dccd643285312f814c4b1bb8a3a55842d18807ca5dda55e9788cd21fd99a2"}]}],"path_fingerprint_policy":"source_hash_staleness","verification":"git_diff","superseded_at":"2026-06-11T19:33:57.968Z","superseded_by":"repo:https-github-com-kage-core-kage:workflow:stale-catch-feature-landed-via-pr-64-kernel-test-ts-seam-carries-both-v2-test-su","superseded_reason":"Branch-time change memory replaced by post-merge verified state (PR #64; kernel.test.ts seam resolution documented)"},"edges":[{"relation":"changes_path","to":"path:.agent_memory/packets/code_explanation-stale-catch-change-time-invalidation-heartbeat-stalecatch-kage-staleguard-b1f7baca.json","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/cli.ts","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/index.ts","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/kernel.test.ts","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/kernel.ts","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/mcp.test.ts","evidence":"git_diff"},{"relation":"superseded_by","to":"repo:https-github-com-kage-core-kage:workflow:stale-catch-feature-landed-via-pr-64-kernel-test-ts-seam-carries-both-v2-test-su","evidence":"Branch-time change memory replaced by post-merge verified state (PR #64; kernel.test.ts seam resolution documented)","created_at":"2026-06-11T19:33:57.968Z"}],"quality":{"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":348,"admission":{"admit":true,"class":"candidate","score":70,"reasons":["durable memory type","has provenance","repo scoped or path grounded","has durable trigger, rationale, issue context, or explanation","substantive enough to reuse"],"risks":[]},"candidate_kind":"change_memory","review_boundary":"git_or_pr","promotion_requires_review":true,"superseded_by":"repo:https-github-com-kage-core-kage:workflow:stale-catch-feature-landed-via-pr-64-kernel-test-ts-seam-carries-both-v2-test-su","superseded_reason":"Branch-time change memory replaced by post-merge verified state (PR #64; kernel.test.ts seam resolution documented)","reverified_at":"2026-06-15T21:58:23.833Z","stale":true,"stale_reasons":["packet status is superseded","linked path changed since memory was verified: mcp/mcp.test.ts"],"suggested_action":"mark_stale"},"created_at":"2026-06-11T14:52:02.865Z","updated_at":"2026-06-29T08:26:42.605Z"}
```

