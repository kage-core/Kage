---
type: "Workflow"
title: "Change memory: gap/private-tags"
description: "Repo-local context for 9 changed repo paths on gap/private-tags."
resource: "CHANGELOG.md"
tags: ["change-memory", "diff-proposal", "repo-local", "branch:gap-private-tags"]
timestamp: "2026-06-15T21:58:07.452Z"
x-kage-id: "repo:agent-a42c797e11994217c:workflow:change-memory-gap-private-tags"
x-kage-type: "workflow"
x-kage-status: "deprecated"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.62
x-kage-verified: "deprecated"
x-kage-paths: ["CHANGELOG.md", "README.md", "mcp/kernel.test.ts", "mcp/kernel.ts"]
---

# Change memory: gap/private-tags

> Repo-local context for 9 changed repo paths on gap/private-tags.

Repo-local change memory generated from the current git diff.

Goal: preserve the durable context another agent should receive when it works in this repo later.

What changed:
- .agent_memory/packets/convention-privacy-private-tags-are-redacted-by-stripprivatespans-before-any-memory-write-e7c147f0.json
- .agent_memory/packets/reference-claude-mem-implementation-teardown-zero-verification-confirmed-5-mechanics-worth-f7674b1c.json
- .agent_memory/packets/workflow-change-memory-master-23634276.json
- .agent_memory/packets/workflow-change-memory-release-v2-0-1-d6e19752.json
- .agent_memory/packets/workflow-stale-catch-feature-landed-via-pr-64-kernel-test-ts-seam-carries-both-v2-test-su-9ad40729.json
- CHANGELOG.md
- README.md
- mcp/kernel.test.ts
- mcp/kernel.ts

Diff summary:
```text
...ation-confirmed-5-mechanics-worth-f7674b1c.json |  9 +-
 .../workflow-change-memory-master-23634276.json    |  3 +-
 ...flow-change-memory-release-v2-0-1-d6e19752.json |  4 +-
 ...t-ts-seam-carries-both-v2-test-su-9ad40729.json |  4 +-
 CHANGELOG.md                                       |  8 ++
 README.md                                          |  4 +
 mcp/kernel.test.ts                                 | 99 ++++++++++++++++++++++
 mcp/kernel.ts                                      | 49 +++++++++++
 8 files changed, 172 insertions(+), 8 deletions(-)
.agent_memory/packets/convention-privacy-private-tags-are-redacted-by-stripprivatespans-before-any-memory-write-e7c147f0.json | untracked
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
{"schema_version":2,"id":"repo:agent-a42c797e11994217c:workflow:change-memory-gap-private-tags","title":"Change memory: gap/private-tags","summary":"Repo-local context for 9 changed repo paths on gap/private-tags.","body":"Repo-local change memory generated from the current git diff.\n\nGoal: preserve the durable context another agent should receive when it works in this repo later.\n\nWhat changed:\n- .agent_memory/packets/convention-privacy-private-tags-are-redacted-by-stripprivatespans-before-any-memory-write-e7c147f0.json\n- .agent_memory/packets/reference-claude-mem-implementation-teardown-zero-verification-confirmed-5-mechanics-worth-f7674b1c.json\n- .agent_memory/packets/workflow-change-memory-master-23634276.json\n- .agent_memory/packets/workflow-change-memory-release-v2-0-1-d6e19752.json\n- .agent_memory/packets/workflow-stale-catch-feature-landed-via-pr-64-kernel-test-ts-seam-carries-both-v2-test-su-9ad40729.json\n- CHANGELOG.md\n- README.md\n- mcp/kernel.test.ts\n- mcp/kernel.ts\n\nDiff summary:\n```text\n...ation-confirmed-5-mechanics-worth-f7674b1c.json |  9 +-\n .../workflow-change-memory-master-23634276.json    |  3 +-\n ...flow-change-memory-release-v2-0-1-d6e19752.json |  4 +-\n ...t-ts-seam-carries-both-v2-test-su-9ad40729.json |  4 +-\n CHANGELOG.md                                       |  8 ++\n README.md                                          |  4 +\n mcp/kernel.test.ts                                 | 99 ++++++++++++++++++++++\n mcp/kernel.ts                                      | 49 +++++++++++\n 8 files changed, 172 insertions(+), 8 deletions(-)\n.agent_memory/packets/convention-privacy-private-tags-are-redacted-by-stripprivatespans-before-any-memory-write-e7c147f0.json | untracked\n```\n\nHow to verify:\n- Add the exact test, build, or manual verification command when you refine this memory.\n\nImprove this packet when more context is known:\n- The actual feature, fix, or refactor rationale.\n- Why the change was made, including relevant bugs, issues, decisions, and code explanations.\n- The package, API, command, or architectural pattern future agents should understand, verify, or reuse.\n- Any gotchas, follow-up risks, or branch-specific assumptions.\n\nPromote beyond this repo only after explicit org/global review.","type":"workflow","scope":"repo","visibility":"team","sensitivity":"internal","status":"deprecated","confidence":0.62,"tags":["change-memory","diff-proposal","repo-local","branch:gap-private-tags"],"paths":["CHANGELOG.md","README.md","mcp/kernel.test.ts","mcp/kernel.ts"],"stack":[],"source_refs":[{"kind":"git_diff","branch":"gap/private-tags","head":"a19697c3b474c9fc9fd080f7008512b26ecaf09d","merge_base":"a19697c3b474c9fc9fd080f7008512b26ecaf09d","changed_files":[".agent_memory/packets/convention-privacy-private-tags-are-redacted-by-stripprivatespans-before-any-memory-write-e7c147f0.json",".agent_memory/packets/reference-claude-mem-implementation-teardown-zero-verification-confirmed-5-mechanics-worth-f7674b1c.json",".agent_memory/packets/workflow-change-memory-master-23634276.json",".agent_memory/packets/workflow-change-memory-release-v2-0-1-d6e19752.json",".agent_memory/packets/workflow-stale-catch-feature-landed-via-pr-64-kernel-test-ts-seam-carries-both-v2-test-su-9ad40729.json","CHANGELOG.md","README.md","mcp/kernel.test.ts","mcp/kernel.ts"],"summary_path":"/Users/kushaljain/code/Kage/.claude/worktrees/agent-a42c797e11994217c/.agent_memory/review/branch-summary-gap-private-tags.json"}],"context":{"fact":"Current branch gap/private-tags changes 9 repo paths.","why":"Branch change memory gives future agents durable context from the git diff when they continue, review, or verify this work.","trigger":"Recall when asking what changed on this branch, preparing a PR review, or resuming this work.","action":"Use the changed file list and diff summary as orientation, then inspect the actual diff and source files before making further edits.","verification":"Generated from git diff and refreshed by kage pr summarize or kage propose --from-diff.","risk_if_forgotten":"Future agents may repeat orientation work, miss branch-specific assumptions, or ignore files touched by this change.","stale_when":"The branch diff changes substantially, the branch is merged, or a newer change-memory packet supersedes it."},"freshness":{"last_verified_at":"2026-06-15T21:58:07.452Z","ttl_days":180,"path_fingerprints":[{"path":"CHANGELOG.md","sha256":"1d00aff932a74d380dad6e0d60ae0aed37e40aa5a03ae7ec0acb71f824d0ef0c","size":46022},{"path":"README.md","sha256":"9a533eee7962e84cdceef1bd8c9463233a575138fa143acafc8abd42f723944a","size":10477},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"packets","kind":"constant","sha256":"f28a69afbf5d7a988e351fc5446a3b291a2451f97b8220c4e1a7629b3a50ffa3"},{"name":"changed","kind":"constant","sha256":"8acd4ea8821c48290e59ddcd8f60fc34f9c721f4cc2c515fcff04820d8b159cd"},{"name":"claude","kind":"constant","sha256":"30e40d593cb285fac2f86d1766fed1b16495cc38548f9b27af90a180acfac1d6"},{"name":"manual","kind":"constant","sha256":"f8502a2f13344d0dc48912357b32bd77516b46c56e970206fce7993703ff91bf"},{"name":"reference","kind":"constant","sha256":"ea0156b0af7eca0a3b159bd94ec6d6b12f0506c9bc51164bcfdd4e3b3a294177"}]},{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"stripprivatespans","kind":"function","sha256":"ba84a8fc3e6d28cb1b5961254b38ec923e69f24b0a89936bf5606ff7cbde5c30"},{"name":"untracked","kind":"constant","sha256":"8d31cffa2e43e8e8498c30a2e6eeb043120941acd973d64ecda430b13f52d855"},{"name":"readme","kind":"constant","sha256":"aa0f002dd3f57a6ca1e42c5aba625151268ed600bbbd7582f93a0a0bc7714404"},{"name":"explicit","kind":"constant","sha256":"3c7dc76a866b9617850dd05c43ef877cc5208ade5be761331cf32181ace414ff"},{"name":"verification","kind":"constant","sha256":"faeb54eb75a6e60ebcab087f39fdd9f971c8a3a16e25846647ab2dd5802748f3"},{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"},{"name":"before","kind":"constant","sha256":"70c005bc3586ccb93799dfa1989dccca69b847916fd3fde1583578730922c50c"},{"name":"after","kind":"constant","sha256":"220a1c1969c37d53268e215419dcea650ffa901162d0a25e451bd90831fb0a1b"},{"name":"verify","kind":"constant","sha256":"a52f5b45a4f358248075422f84ac83e7d291e8e7acb866eeabdb692896bc9c0d"},{"name":"relevant","kind":"constant","sha256":"ecda229c929f06ede369f9d72be3d3211fef450b1056b73a121c5d925fac2c2b"},{"name":"durable","kind":"constant","sha256":"3fa48acfe2e95fa0fcf831049f2d1aa3ddf26ddc5a1d10724db5da185389e634"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"},{"name":"changelog","kind":"function","sha256":"1b80272f5a58f56742b1e1ffccb8b8bad542436311476eca4a275896297f76af"},{"name":"when","kind":"constant","sha256":"48bfd58b3cdbf2d407e4443b90727d548d96eceaa4372c099dcd22c52f498452"}]}],"path_fingerprint_policy":"source_hash_staleness","verification":"git_diff"},"edges":[{"relation":"changes_path","to":"path:.agent_memory/packets/convention-privacy-private-tags-are-redacted-by-stripprivatespans-before-any-memory-write-e7c147f0.json","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/reference-claude-mem-implementation-teardown-zero-verification-confirmed-5-mechanics-worth-f7674b1c.json","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/workflow-change-memory-master-23634276.json","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/workflow-change-memory-release-v2-0-1-d6e19752.json","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/workflow-stale-catch-feature-landed-via-pr-64-kernel-test-ts-seam-carries-both-v2-test-su-9ad40729.json","evidence":"git_diff"},{"relation":"changes_path","to":"path:CHANGELOG.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:README.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/kernel.test.ts","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/kernel.ts","evidence":"git_diff"}],"quality":{"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":506,"admission":{"admit":true,"class":"candidate","score":70,"reasons":["durable memory type","has provenance","repo scoped or path grounded","has durable trigger, rationale, issue context, or explanation","substantive enough to reuse"],"risks":[]},"candidate_kind":"change_memory","review_boundary":"git_or_pr","promotion_requires_review":true,"reverified_at":"2026-06-15T21:58:07.452Z","stale":true,"stale_reasons":["packet status is deprecated","linked path changed since memory was verified: README.md"],"suggested_action":"mark_stale"},"created_at":"2026-06-12T06:04:21.978Z","updated_at":"2026-06-16T06:29:24.424Z"}
```

