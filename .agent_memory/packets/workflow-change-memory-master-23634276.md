---
type: "Workflow"
title: "Change memory: master"
description: "Repo-local context for 29 changed repo paths on master."
resource: "CLAUDE.md"
tags: ["change-memory", "diff-proposal", "repo-local", "branch:master"]
timestamp: "2026-07-03T12:09:25.165Z"
x-kage-id: "repo:https-github-com-kage-core-kage:workflow:change-memory-master"
x-kage-type: "workflow"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.62
x-kage-verified: "verified"
x-kage-paths: ["CLAUDE.md", "README.md", "docs/CHECK_VALIDATION.md", "mcp/check.test.ts", "mcp/check.ts", "mcp/cli.ts", "mcp/index.ts", "mcp/kernel.test.ts", "mcp/kernel.ts", "mcp/mcp.test.ts", "plugin/hooks/kage-edit-context.sh", "plugin/hooks/kage-read-context.sh", "plugin/hooks/observe.sh", "plugin/hooks/session-start.sh", "plugin/hooks/stop.sh"]
---

# Change memory: master

> Repo-local context for 29 changed repo paths on master.

Repo-local change memory generated from the current git diff.

Goal: preserve the durable context another agent should receive when it works in this repo later.

What changed:
- .agent_memory/packets/bug_fix-ambient-hooks-never-silently-die-path-baked-cli-js-npx-package-runner-fallback-2d64f260.md
- .agent_memory/packets/convention-core-tool-param-descriptions-annotations-are-tuned-for-glama-tdqs-d39e751d.md
- .agent_memory/packets/decision-agent-mcp-surface-is-eval-driven-core-11-kage-code-graph-deleted-337d02ef.md
- .agent_memory/packets/decision-agent-mcp-surface-is-eval-driven-core-12-kage-check-promoted-as-hero-verb-f0aa1ec6.md
- .agent_memory/packets/decision-claude-code-hooks-single-source-of-truth-plugin-hooks-generated-from-setupagent-f99cc1e4.md
- .agent_memory/packets/decision-kage-check-is-the-hero-verb-drift-verification-counted-not-estimated-cbf45757.md
- .agent_memory/packets/decision-pivot-decision-kage-the-verification-freshness-layer-for-google-okf-3a63db1f.md
- .agent_memory/packets/gotcha-gitpathtoprojectrelative-spawns-git-per-call-never-use-it-in-per-line-git-log-lo-d90b491b.md
- .agent_memory/packets/issue_context-resume-check-the-kage-cruft-audit-workflow-waz60b5tm-results-and-clean-up-any-co-e05f6e5b.md
- .agent_memory/packets/reference-resume-check-the-kage-cruft-audit-workflow-waz60b5tm-results-and-clean-up-any-co-94be1866.md
- .agent_memory/packets/runbook-runbook-tool-failed-agent-id-aabb588487110367c-agent-type-explore-cwd-users-kush-352e5335.md
- .agent_memory/packets/runbook-runbook-tool-failed-cwd-users-kushaljain-code-kage-duration-ms-1911-effort-level-67b5a2e5.md
- .agent_memory/packets/runbook-truth-report-detectors-lead-with-reliably-firing-signal-f9853daf.md
- .agent_memory/packets/workflow-change-memory-master-23634276.md
- CLAUDE.md
- README.md
- docs/CHECK_VALIDATION.md
- mcp/check.test.ts
- mcp/check.ts
- mcp/cli.ts
- mcp/index.ts
- mcp/kernel.test.ts
- mcp/kernel.ts
- mcp/mcp.test.ts
- plugin/hooks/kage-edit-context.sh
- plugin/hooks/kage-read-context.sh
- plugin/hooks/observe.sh
- plugin/hooks/session-start.sh
- plugin/hooks/stop.sh

Diff summary:
```text
...nnotations-are-tuned-for-glama-tdqs-d39e751d.md |  4 +-
 ...ven-core-11-kage-code-graph-deleted-337d02ef.md |  6 +-
 ...gin-hooks-generated-from-setupagent-f99cc1e4.md |  4 +-
 ...tion-freshness-layer-for-google-okf-3a63db1f.md |  2 +-
 ...never-use-it-in-per-line-git-log-lo-d90b491b.md |  4 +-
 ...z60b5tm-results-and-clean-up-any-co-94be1866.md |  4 +-
 ...c-agent-type-explore-cwd-users-kush-352e5335.md |  4 +-
 ...rs-lead-with-reliably-firing-signal-f9853daf.md |  4 +-
 .../workflow-change-memory-master-23634276.md      | 73 +++++++++++++++++++---
 CLAUDE.md                                          |  7 ---
 README.md                                          |  9 +--
 mcp/cli.ts                                         | 39 +++++++++++-
 mcp/index.ts                                       | 42 ++++++++++---
 mcp/kernel.test.ts                                 |  7 +++
 mcp/kernel.ts                                      | 31 ++++++---
 mcp/mcp.test.ts                                    |  2 +-
 plugin/hooks/kage-edit-context.sh                  |  9 ++-
 plugin/hooks/kage-read-context.sh                  |  9 ++-
 plugin/hooks/observe.sh                            |  9 ++-
 plugin/hooks/session-start.sh                      |  9 +++
 plugin/hooks/stop.sh                               |  9 ++-
 21 files changed, 225 insertions(+), 62 deletions(-)
.agent_memory/packets/bug_fix-ambient-hooks-never-silently-die-path-baked-cli-js-npx-package-runner-fallback-2d64f260.md | untracked
.agent_memory/packets/decision-agent-mcp-surface-is-eval-driven-core-12-kage-check-promoted-as-hero-verb-f0aa1ec6.md | untracked
.agent_memory/packets/decision-kage-check-is-the-hero-verb-drift-verification-counted-not-estimated-cbf45757.md | untracked
.agent_memory/packets/issue_context-resume-check-the-kage-cruft-audit-workflow-waz60b5tm-results-and-clean-up-any-co-e05f6e5b.md | untracked
.agent_memory/packets/runbook-runbook-tool-failed-cwd-users-kushaljain-code-kage-duration-ms-1911-effort-level-67b5a2e5.md | untracked
docs/CHECK_VALIDATION.md | untracked
mcp/check.test.ts | untracked
mcp/check.ts | untracked
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
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:workflow:change-memory-master","title":"Change memory: master","summary":"Repo-local context for 29 changed repo paths on master.","body":"Repo-local change memory generated from the current git diff.\n\nGoal: preserve the durable context another agent should receive when it works in this repo later.\n\nWhat changed:\n- .agent_memory/packets/bug_fix-ambient-hooks-never-silently-die-path-baked-cli-js-npx-package-runner-fallback-2d64f260.md\n- .agent_memory/packets/convention-core-tool-param-descriptions-annotations-are-tuned-for-glama-tdqs-d39e751d.md\n- .agent_memory/packets/decision-agent-mcp-surface-is-eval-driven-core-11-kage-code-graph-deleted-337d02ef.md\n- .agent_memory/packets/decision-agent-mcp-surface-is-eval-driven-core-12-kage-check-promoted-as-hero-verb-f0aa1ec6.md\n- .agent_memory/packets/decision-claude-code-hooks-single-source-of-truth-plugin-hooks-generated-from-setupagent-f99cc1e4.md\n- .agent_memory/packets/decision-kage-check-is-the-hero-verb-drift-verification-counted-not-estimated-cbf45757.md\n- .agent_memory/packets/decision-pivot-decision-kage-the-verification-freshness-layer-for-google-okf-3a63db1f.md\n- .agent_memory/packets/gotcha-gitpathtoprojectrelative-spawns-git-per-call-never-use-it-in-per-line-git-log-lo-d90b491b.md\n- .agent_memory/packets/issue_context-resume-check-the-kage-cruft-audit-workflow-waz60b5tm-results-and-clean-up-any-co-e05f6e5b.md\n- .agent_memory/packets/reference-resume-check-the-kage-cruft-audit-workflow-waz60b5tm-results-and-clean-up-any-co-94be1866.md\n- .agent_memory/packets/runbook-runbook-tool-failed-agent-id-aabb588487110367c-agent-type-explore-cwd-users-kush-352e5335.md\n- .agent_memory/packets/runbook-runbook-tool-failed-cwd-users-kushaljain-code-kage-duration-ms-1911-effort-level-67b5a2e5.md\n- .agent_memory/packets/runbook-truth-report-detectors-lead-with-reliably-firing-signal-f9853daf.md\n- .agent_memory/packets/workflow-change-memory-master-23634276.md\n- CLAUDE.md\n- README.md\n- docs/CHECK_VALIDATION.md\n- mcp/check.test.ts\n- mcp/check.ts\n- mcp/cli.ts\n- mcp/index.ts\n- mcp/kernel.test.ts\n- mcp/kernel.ts\n- mcp/mcp.test.ts\n- plugin/hooks/kage-edit-context.sh\n- plugin/hooks/kage-read-context.sh\n- plugin/hooks/observe.sh\n- plugin/hooks/session-start.sh\n- plugin/hooks/stop.sh\n\nDiff summary:\n```text\n...nnotations-are-tuned-for-glama-tdqs-d39e751d.md |  4 +-\n ...ven-core-11-kage-code-graph-deleted-337d02ef.md |  6 +-\n ...gin-hooks-generated-from-setupagent-f99cc1e4.md |  4 +-\n ...tion-freshness-layer-for-google-okf-3a63db1f.md |  2 +-\n ...never-use-it-in-per-line-git-log-lo-d90b491b.md |  4 +-\n ...z60b5tm-results-and-clean-up-any-co-94be1866.md |  4 +-\n ...c-agent-type-explore-cwd-users-kush-352e5335.md |  4 +-\n ...rs-lead-with-reliably-firing-signal-f9853daf.md |  4 +-\n .../workflow-change-memory-master-23634276.md      | 73 +++++++++++++++++++---\n CLAUDE.md                                          |  7 ---\n README.md                                          |  9 +--\n mcp/cli.ts                                         | 39 +++++++++++-\n mcp/index.ts                                       | 42 ++++++++++---\n mcp/kernel.test.ts                                 |  7 +++\n mcp/kernel.ts                                      | 31 ++++++---\n mcp/mcp.test.ts                                    |  2 +-\n plugin/hooks/kage-edit-context.sh                  |  9 ++-\n plugin/hooks/kage-read-context.sh                  |  9 ++-\n plugin/hooks/observe.sh                            |  9 ++-\n plugin/hooks/session-start.sh                      |  9 +++\n plugin/hooks/stop.sh                               |  9 ++-\n 21 files changed, 225 insertions(+), 62 deletions(-)\n.agent_memory/packets/bug_fix-ambient-hooks-never-silently-die-path-baked-cli-js-npx-package-runner-fallback-2d64f260.md | untracked\n.agent_memory/packets/decision-agent-mcp-surface-is-eval-driven-core-12-kage-check-promoted-as-hero-verb-f0aa1ec6.md | untracked\n.agent_memory/packets/decision-kage-check-is-the-hero-verb-drift-verification-counted-not-estimated-cbf45757.md | untracked\n.agent_memory/packets/issue_context-resume-check-the-kage-cruft-audit-workflow-waz60b5tm-results-and-clean-up-any-co-e05f6e5b.md | untracked\n.agent_memory/packets/runbook-runbook-tool-failed-cwd-users-kushaljain-code-kage-duration-ms-1911-effort-level-67b5a2e5.md | untracked\ndocs/CHECK_VALIDATION.md | untracked\nmcp/check.test.ts | untracked\nmcp/check.ts | untracked\n```\n\nHow to verify:\n- Add the exact test, build, or manual verification command when you refine this memory.\n\nImprove this packet when more context is known:\n- The actual feature, fix, or refactor rationale.\n- Why the change was made, including relevant bugs, issues, decisions, and code explanations.\n- The package, API, command, or architectural pattern future agents should understand, verify, or reuse.\n- Any gotchas, follow-up risks, or branch-specific assumptions.\n\nPromote beyond this repo only after explicit org/global review.","type":"workflow","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.62,"tags":["change-memory","diff-proposal","repo-local","branch:master"],"paths":["CLAUDE.md","README.md","docs/CHECK_VALIDATION.md","mcp/check.test.ts","mcp/check.ts","mcp/cli.ts","mcp/index.ts","mcp/kernel.test.ts","mcp/kernel.ts","mcp/mcp.test.ts","plugin/hooks/kage-edit-context.sh","plugin/hooks/kage-read-context.sh","plugin/hooks/observe.sh","plugin/hooks/session-start.sh","plugin/hooks/stop.sh"],"stack":[],"source_refs":[{"kind":"git_diff","branch":"master","head":"775de95a025fc7869d5f08a100e44456ae960655","merge_base":"775de95a025fc7869d5f08a100e44456ae960655","changed_files":[".agent_memory/packets/bug_fix-ambient-hooks-never-silently-die-path-baked-cli-js-npx-package-runner-fallback-2d64f260.md",".agent_memory/packets/convention-core-tool-param-descriptions-annotations-are-tuned-for-glama-tdqs-d39e751d.md",".agent_memory/packets/decision-agent-mcp-surface-is-eval-driven-core-11-kage-code-graph-deleted-337d02ef.md",".agent_memory/packets/decision-agent-mcp-surface-is-eval-driven-core-12-kage-check-promoted-as-hero-verb-f0aa1ec6.md",".agent_memory/packets/decision-claude-code-hooks-single-source-of-truth-plugin-hooks-generated-from-setupagent-f99cc1e4.md",".agent_memory/packets/decision-kage-check-is-the-hero-verb-drift-verification-counted-not-estimated-cbf45757.md",".agent_memory/packets/decision-pivot-decision-kage-the-verification-freshness-layer-for-google-okf-3a63db1f.md",".agent_memory/packets/gotcha-gitpathtoprojectrelative-spawns-git-per-call-never-use-it-in-per-line-git-log-lo-d90b491b.md",".agent_memory/packets/issue_context-resume-check-the-kage-cruft-audit-workflow-waz60b5tm-results-and-clean-up-any-co-e05f6e5b.md",".agent_memory/packets/reference-resume-check-the-kage-cruft-audit-workflow-waz60b5tm-results-and-clean-up-any-co-94be1866.md",".agent_memory/packets/runbook-runbook-tool-failed-agent-id-aabb588487110367c-agent-type-explore-cwd-users-kush-352e5335.md",".agent_memory/packets/runbook-runbook-tool-failed-cwd-users-kushaljain-code-kage-duration-ms-1911-effort-level-67b5a2e5.md",".agent_memory/packets/runbook-truth-report-detectors-lead-with-reliably-firing-signal-f9853daf.md",".agent_memory/packets/workflow-change-memory-master-23634276.md","CLAUDE.md","README.md","docs/CHECK_VALIDATION.md","mcp/check.test.ts","mcp/check.ts","mcp/cli.ts","mcp/index.ts","mcp/kernel.test.ts","mcp/kernel.ts","mcp/mcp.test.ts","plugin/hooks/kage-edit-context.sh","plugin/hooks/kage-read-context.sh","plugin/hooks/observe.sh","plugin/hooks/session-start.sh","plugin/hooks/stop.sh"],"summary_path":"/Users/kushaljain/code/Kage/.agent_memory/review/branch-summary-master.json"}],"context":{"fact":"Current branch master changes 29 repo paths.","why":"Branch change memory gives future agents durable context from the git diff when they continue, review, or verify this work.","trigger":"Recall when asking what changed on this branch, preparing a PR review, or resuming this work.","action":"Use the changed file list and diff summary as orientation, then inspect the actual diff and source files before making further edits.","verification":"Generated from git diff and refreshed by kage pr summarize or kage propose --from-diff.","risk_if_forgotten":"Future agents may repeat orientation work, miss branch-specific assumptions, or ignore files touched by this change.","stale_when":"The branch diff changes substantially, the branch is merged, or a newer change-memory packet supersedes it."},"freshness":{"last_verified_at":"2026-07-03T12:09:25.165Z","ttl_days":180,"path_fingerprints":[{"path":"CLAUDE.md","sha256":"4112819a957f7eda2988361dd2bcc38f189e42382afb961f0308ddb074eb8116","size":4804},{"path":"README.md","sha256":"a2b61399ac9c3f2b009960410a1bb5836bd103ea8ecb471bb00b58a498a15dbe","size":12227},{"path":"docs/CHECK_VALIDATION.md","sha256":"63eebda9e2f79d52c349db0f44dffb602dee0972678cfe80d1e52eb840081f9a","size":4326},{"path":"mcp/check.test.ts","sha256":"32e22b828f55901dab697c19a95c4767dad4fd4108699888f880f8df0e34ee44","size":9265,"symbols":[{"name":"text","kind":"constant","sha256":"7623c3521eeba78434b5d6fd186f2e01c04e2479f239c334e3ffb1baf444f507"}]},{"path":"mcp/check.ts","sha256":"b624cefdb8f2a0b018d07d34b6da9a969fbc57660405c6145f164442ad2d9d47","size":29864,"symbols":[{"name":"files","kind":"constant","sha256":"9097d05bc008bb898f0241936453315fdfe25a312832915a8f070cc75ed68083"},{"name":"docs","kind":"constant","sha256":"6f9c666ea72b505e9fe204108ac3166f878a977c4b36b5536f30bcf4eb273f9e"},{"name":"truth","kind":"constant","sha256":"4916c2534543fd9ec60236662c437a509a4cf614030336382c01f456168ac368"},{"name":"deleted","kind":"constant","sha256":"517ac0397e3ac0978fe836d1b2aa9de36bf59b96f7b48aac0f82da24e6c58092"},{"name":"changed","kind":"constant","sha256":"ee6f1e19ca7f30fff6f04131d88e0ea2392c678dad6f1d0f7b7c0b2d83ab65c8"}]},{"path":"mcp/cli.ts","sha256":"03338669e35154cff7548860afe8c95bcfa78b1eee5dc6d690b0c9ff69449d70","size":122397,"symbols":[{"name":"index","kind":"constant","sha256":"c201ee64cf24065dd2ba0bbdc7ff8399e5c1dd89783820e501d28f82019f08a8"},{"name":"review","kind":"function","sha256":"cd5b65cd476d7eaecccc181de3bcad5b3d7c99237dcbfce313709f8eb35f9a13"},{"name":"command","kind":"constant","sha256":"9e594169e1f8559f50d7e73b407f1aa3a9a0f14bf43a676fedefa72734badb98"},{"name":"packets","kind":"constant","sha256":"08565eddc844fbb13d207b1a5875e07b52807950760d7784cce666504b0eda13"},{"name":"current","kind":"constant","sha256":"471f3cfbffa04d6ecddb2f3d4013027b71237de766afb69ec418f1f1b8308937"},{"name":"agent","kind":"constant","sha256":"5b9caa614311fe691d6af171b9a8985b0d49464b9df178ad28ff5b9883eb4cf2"},{"name":"from","kind":"constant","sha256":"b386d829bcacbd9e216c726f6dff71fc7d8a53aade383fa45b850387414b780c"},{"name":"summary","kind":"constant","sha256":"0938b0afc17695033381e2248401bba9b7c6abb6f9f0eaae0d2a8ff2c660d662"},{"name":"verb","kind":"constant","sha256":"02e34fb12bac72815d5b79554f150aa476408a9ef341b6a519b1fa3621b2414e"},{"name":"durable","kind":"constant","sha256":"59e1af86ee722f58562da0478f6f3fe6621ae96f9473de8c0037e63fe779215e"},{"name":"type","kind":"constant","sha256":"32ed8eb4ecde4706e2590380969ccb808068c46a3c687040703198e8c72d14e1"}]},{"path":"mcp/index.ts","sha256":"468fd426b18d5add82329e76be15a7f048ace72d377728605c0aa376b8842af2","size":75862,"symbols":[{"name":"summary","kind":"constant","sha256":"16f7c65f25e8bfb3d6fca589dbf7ddcc3930490fe5a6dcdb90e6a7e5dd344398"},{"name":"index","kind":"constant","sha256":"ad98a75521fc0edce4fed6c6cd0503a41df66728efc44c4c3904db6a6ac89d7f"},{"name":"report","kind":"constant","sha256":"236f01b96186faaad54d6400f548d36535f9980ecd101245c766e62b23139264"}]},{"path":"mcp/kernel.test.ts","sha256":"1053e30e4c85aca1048946b0ed123f0e48a1af09f85fbd7117cab3b674d6501d","size":306192,"symbols":[{"name":"packets","kind":"constant","sha256":"f28a69afbf5d7a988e351fc5446a3b291a2451f97b8220c4e1a7629b3a50ffa3"},{"name":"changed","kind":"constant","sha256":"8acd4ea8821c48290e59ddcd8f60fc34f9c721f4cc2c515fcff04820d8b159cd"},{"name":"claude","kind":"constant","sha256":"30e40d593cb285fac2f86d1766fed1b16495cc38548f9b27af90a180acfac1d6"},{"name":"manual","kind":"constant","sha256":"f8502a2f13344d0dc48912357b32bd77516b46c56e970206fce7993703ff91bf"},{"name":"generated","kind":"constant","sha256":"e2b33e3e2afde3ce1606839eb1dd68ff6150d2939598d7aeeb9eee9c9e9f8a00"},{"name":"single","kind":"constant","sha256":"5b9823fb4f0b06d426326ae80e61f38797c791b973663f805a99e65de9d84412"},{"name":"signal","kind":"constant","sha256":"f084f4945e43a881cf04b4d6eff63df1f052d4d6e933b089af3696e2bc699289"},{"name":"reference","kind":"constant","sha256":"ea0156b0af7eca0a3b159bd94ec6d6b12f0506c9bc51164bcfdd4e3b3a294177"},{"name":"clean","kind":"constant","sha256":"605fd32dc244203f8b75cc8d139a154c77931988e5c575d85a3f17d5d7206d1b"}]},{"path":"mcp/kernel.ts","sha256":"25f8960ba8cb19d2065441418f417d6c38baddea872b3f64030d58a44879eb31","size":880877,"symbols":[{"name":"gitpathtoprojectrelative","kind":"function","sha256":"7a9b745a50000049ab50d9939e3d36ba235fccebc9be3d8735ad2565333fd5bd"},{"name":"untracked","kind":"constant","sha256":"8d31cffa2e43e8e8498c30a2e6eeb043120941acd973d64ecda430b13f52d855"},{"name":"readme","kind":"constant","sha256":"aa0f002dd3f57a6ca1e42c5aba625151268ed600bbbd7582f93a0a0bc7714404"},{"name":"clean","kind":"function","sha256":"17cd330796a719d520826491a73ab88f886668a6f03c7ab8c85530d9cb3a996d"},{"name":"explicit","kind":"constant","sha256":"3c7dc76a866b9617850dd05c43ef877cc5208ade5be761331cf32181ace414ff"},{"name":"call","kind":"constant","sha256":"0e1296678bffa8037b9dc66bffb9dbec82218bdd1cd66c11e341879266eb9454"},{"name":"level","kind":"constant","sha256":"832bbcc09db2b0a822fe5b0f77875aea29528b0343bffcb1c71cf2fe73b9aa5e"},{"name":"verb","kind":"constant","sha256":"6fe8c3f7bddcb763ef300f0955153421205d73f5e73e5a86694222a0a8455128"},{"name":"verification","kind":"constant","sha256":"faeb54eb75a6e60ebcab087f39fdd9f971c8a3a16e25846647ab2dd5802748f3"},{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"},{"name":"read","kind":"constant","sha256":"ffe49534fbcdb7c556f32fa5120c3dd4c00fce60f148c94f79d0d94d71145efd"},{"name":"after","kind":"constant","sha256":"220a1c1969c37d53268e215419dcea650ffa901162d0a25e451bd90831fb0a1b"},{"name":"verify","kind":"constant","sha256":"a52f5b45a4f358248075422f84ac83e7d291e8e7acb866eeabdb692896bc9c0d"},{"name":"relevant","kind":"constant","sha256":"ecda229c929f06ede369f9d72be3d3211fef450b1056b73a121c5d925fac2c2b"},{"name":"setupagent","kind":"function","sha256":"b63b5303cc295880575bf96df4103e49befb0f1e5739980286a45a05f41b886b"},{"name":"hooks","kind":"constant","sha256":"7291847ee5dfe9b56b32a270d8bb6309f5740dde9443103ede1b01a377155e78"},{"name":"observe","kind":"function","sha256":"5fd2270521dc42ec0d3a4ec8f7dd5abb74589e5f021c53cd5af730165d60abcc"},{"name":"durable","kind":"constant","sha256":"3fa48acfe2e95fa0fcf831049f2d1aa3ddf26ddc5a1d10724db5da185389e634"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"}]},{"path":"mcp/mcp.test.ts","sha256":"e1e33da2ead7342b13f4dc95f8194cf1ec9cbe3b951360b651e907d1d2c6c634","size":38105,"symbols":[{"name":"core","kind":"constant","sha256":"57cd814974b6f0449f12266cd73c5483d34372211de55cf8791e1bdb7253b0b2"},{"name":"tool","kind":"constant","sha256":"c730b2f983ea9b4965a3ae0d8eec26c8af27380cfb28c180ae2d9f2493727d7b"},{"name":"context","kind":"constant","sha256":"94e5c3947ba282a9ec60de88384111292e685f5f46509d61ddf1eadfab8915da"},{"name":"packets","kind":"constant","sha256":"e4119b10f9f3dc1059904bb3be8e7ef284bf7787f8ed72a38b66712094addc06"},{"name":"deleted","kind":"constant","sha256":"93aeed4ae0813e805f1e3cc24fc4041ca5ac236d67feb9ea59f8e296beeee0c4"},{"name":"summary","kind":"constant","sha256":"ce5a0ae27c7e31896d8b1045100cf88f02038a09fb4ac7e4991f3d466fe095a3"},{"name":"check","kind":"constant","sha256":"620d8c4c121a80c990afb6b6c9d3145a945f6c38957782dcfc0b0632ffe8c087"},{"name":"verify","kind":"constant","sha256":"f02dccd643285312f814c4b1bb8a3a55842d18807ca5dda55e9788cd21fd99a2"}]},{"path":"plugin/hooks/kage-edit-context.sh","sha256":"734115ef84d7b4ef5a0c75dbfbc85a31ca5a6a53a54f3b79a9fb908346134063","size":2754},{"path":"plugin/hooks/kage-read-context.sh","sha256":"5b3205c21808c23df6635117b6ac8b58ca95b37149e467d865d2ee97b5dfa43c","size":2715},{"path":"plugin/hooks/observe.sh","sha256":"1bca6d7410e450c3d93c7fe6fd171ede7ad41362003d61d3269b77a4ecb983b3","size":7357},{"path":"plugin/hooks/session-start.sh","sha256":"85d79671c97013d1b6d6e80b154e75e0430105ed3ba52b0d41e8f81d1ff9d1e1","size":2222},{"path":"plugin/hooks/stop.sh","sha256":"dfb6ef42be139a87bd65794ecbe21afce34fa005731a7b96a7d98c56f1b44a90","size":2408}],"path_fingerprint_policy":"source_hash_staleness","verification":"git_diff"},"edges":[{"relation":"changes_path","to":"path:.agent_memory/packets/bug_fix-ambient-hooks-never-silently-die-path-baked-cli-js-npx-package-runner-fallback-2d64f260.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/convention-core-tool-param-descriptions-annotations-are-tuned-for-glama-tdqs-d39e751d.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-agent-mcp-surface-is-eval-driven-core-11-kage-code-graph-deleted-337d02ef.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-agent-mcp-surface-is-eval-driven-core-12-kage-check-promoted-as-hero-verb-f0aa1ec6.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-claude-code-hooks-single-source-of-truth-plugin-hooks-generated-from-setupagent-f99cc1e4.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-kage-check-is-the-hero-verb-drift-verification-counted-not-estimated-cbf45757.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-pivot-decision-kage-the-verification-freshness-layer-for-google-okf-3a63db1f.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/gotcha-gitpathtoprojectrelative-spawns-git-per-call-never-use-it-in-per-line-git-log-lo-d90b491b.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/issue_context-resume-check-the-kage-cruft-audit-workflow-waz60b5tm-results-and-clean-up-any-co-e05f6e5b.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/reference-resume-check-the-kage-cruft-audit-workflow-waz60b5tm-results-and-clean-up-any-co-94be1866.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/runbook-runbook-tool-failed-agent-id-aabb588487110367c-agent-type-explore-cwd-users-kush-352e5335.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/runbook-runbook-tool-failed-cwd-users-kushaljain-code-kage-duration-ms-1911-effort-level-67b5a2e5.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/runbook-truth-report-detectors-lead-with-reliably-firing-signal-f9853daf.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/workflow-change-memory-master-23634276.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:CLAUDE.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:README.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:docs/CHECK_VALIDATION.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/check.test.ts","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/check.ts","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/cli.ts","evidence":"git_diff"}],"quality":{"score":82,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":["some referenced paths are missing: .agent_memory/packets/workflow-change-memory-master-23634276.md"],"duplicate_candidates":[],"estimated_tokens_saved":1199,"admission":{"admit":true,"class":"candidate","score":70,"reasons":["durable memory type","has provenance","repo scoped or path grounded","has durable trigger, rationale, issue context, or explanation","substantive enough to reuse"],"risks":[]},"candidate_kind":"change_memory","review_boundary":"git_or_pr","promotion_requires_review":true,"reverified_at":"2026-07-03T12:09:25.165Z"},"created_at":"2026-07-03T07:13:34.840Z","updated_at":"2026-07-03T12:09:25.165Z"}
```

