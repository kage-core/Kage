---
type: "Workflow"
title: "Change memory: release/v2.0.1"
description: "Repo-local context for 26 changed repo paths on release/v2.0.1."
resource: ".claude-plugin/marketplace.json"
tags: ["change-memory", "diff-proposal", "repo-local", "branch:release-v2-0-1"]
timestamp: "2026-06-15T21:58:10.473Z"
x-kage-id: "repo:https-github-com-kage-core-kage:workflow:change-memory-release-v2-0-1"
x-kage-type: "workflow"
x-kage-status: "deprecated"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "deprecated"
x-kage-paths: [".claude-plugin/marketplace.json", "CHANGELOG.md", "README.md", "docs/guide.html", "docs/index.html", "mcp/cli.ts", "mcp/server.json", "plugin/.claude-plugin/plugin.json", "plugin/.codex-plugin/plugin.json", "plugin/commands/gains.md", "plugin/commands/init.md", "plugin/commands/scan.md", "plugin/hooks/hooks.json", "plugin/hooks/session-start.sh", "plugin/hooks/stop.sh"]
---

# Change memory: release/v2.0.1

> Repo-local context for 26 changed repo paths on release/v2.0.1.

Repo-local change memory generated from the current git diff.

Goal: preserve the durable context another agent should receive when it works in this repo later.

What changed:
- .agent_memory/packets/bug_fix-ci-kage-pr-check-must-block-only-on-hard-stale-memory-f9e2c269.json
- .agent_memory/packets/code_explanation-stale-catch-change-time-invalidation-heartbeat-stalecatch-kage-staleguard-b1f7baca.json
- .agent_memory/packets/decision-graph-nodes-at-capture-and-opt-in-recall-token-budget-12d31c53.json
- .agent_memory/packets/decision-value-ledger-records-recall-stale-withheld-and-caller-answered-receipts-e4e651f1.json
- .agent_memory/packets/gotcha-mcp-version-skew-launcher-mcp-config-pins-vendored-claude-kage-mcp-overriding-al-e6178d3c.json
- .agent_memory/packets/reference-claude-mem-cmem-exploded-to-81-8k-stars-category-demand-proven-distribution-is-t-fbe4d6cd.json
- .agent_memory/packets/reference-market-position-june-2026-three-unique-axes-write-gate-stale-catch-receipts-copi-3a112704.json
- .agent_memory/packets/runbook-2-0-user-acquisition-sprint-channels-live-baselines-and-what-each-channel-needs-81c82450.json
- .agent_memory/packets/runbook-releasing-kage-release-js-publishes-from-any-named-branch-ae2e694c.json
- .agent_memory/packets/workflow-change-memory-v2-stale-catch-4b48862c.json
- .agent_memory/packets/workflow-stale-catch-feature-landed-via-pr-64-kernel-test-ts-seam-carries-both-v2-test-su-9ad40729.json
- .claude-plugin/marketplace.json
- CHANGELOG.md
- README.md
- docs/guide.html
- docs/index.html
- mcp/cli.ts
- mcp/server.json
- plugin/.claude-plugin/plugin.json
- plugin/.codex-plugin/plugin.json
- plugin/commands/gains.md
- plugin/commands/init.md
- plugin/commands/scan.md
- plugin/hooks/hooks.json
- plugin/hooks/session-start.sh
- plugin/hooks/stop.sh

Diff summary:
```text
...t-block-only-on-hard-stale-memory-f9e2c269.json |  9 ++-
 ...rtbeat-stalecatch-kage-staleguard-b1f7baca.json |  9 ++-
 ...re-and-opt-in-recall-token-budget-12d31c53.json |  9 ++-
 ...held-and-caller-answered-receipts-e4e651f1.json |  9 ++-
 ...red-claude-kage-mcp-overriding-al-e6178d3c.json |  9 ++-
 ...te-gate-stale-catch-receipts-copi-3a112704.json | 10 +++-
 ...lines-and-what-each-channel-needs-81c82450.json | 10 +++-
 ...s-publishes-from-any-named-branch-ae2e694c.json |  9 ++-
 ...flow-change-memory-v2-stale-catch-4b48862c.json |  7 ++-
 ...t-ts-seam-carries-both-v2-test-su-9ad40729.json | 10 +++-
 .claude-plugin/marketplace.json                    |  4 +-
 CHANGELOG.md                                       | 14 +++++
 README.md                                          | 35 ++++++++++-
 docs/guide.html                                    | 10 ++--
 docs/index.html                                    |  8 +--
 mcp/cli.ts                                         | 67 +++++++++++++++++++++-
 mcp/server.json                                    |  4 +-
 plugin/.claude-plugin/plugin.json                  |  8 +--
 plugin/.codex-plugin/plugin.json                   |  4 +-
 19 files changed, 195 insertions(+), 50 deletions(-)
.agent_memory/packets/reference-claude-mem-cmem-exploded-to-81-8k-stars-category-demand-proven-distribution-is-t-fbe4d6cd.json | untracked
plugin/commands/gains.md | untracked
plugin/commands/init.md | untracked
plugin/commands/scan.md | untracked
plugin/hooks/hooks.json | untracked
plugin/hooks/session-start.sh | untracked
plugin/hooks/stop.sh | untracked
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
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:workflow:change-memory-release-v2-0-1","title":"Change memory: release/v2.0.1","summary":"Repo-local context for 26 changed repo paths on release/v2.0.1.","body":"Repo-local change memory generated from the current git diff.\n\nGoal: preserve the durable context another agent should receive when it works in this repo later.\n\nWhat changed:\n- .agent_memory/packets/bug_fix-ci-kage-pr-check-must-block-only-on-hard-stale-memory-f9e2c269.json\n- .agent_memory/packets/code_explanation-stale-catch-change-time-invalidation-heartbeat-stalecatch-kage-staleguard-b1f7baca.json\n- .agent_memory/packets/decision-graph-nodes-at-capture-and-opt-in-recall-token-budget-12d31c53.json\n- .agent_memory/packets/decision-value-ledger-records-recall-stale-withheld-and-caller-answered-receipts-e4e651f1.json\n- .agent_memory/packets/gotcha-mcp-version-skew-launcher-mcp-config-pins-vendored-claude-kage-mcp-overriding-al-e6178d3c.json\n- .agent_memory/packets/reference-claude-mem-cmem-exploded-to-81-8k-stars-category-demand-proven-distribution-is-t-fbe4d6cd.json\n- .agent_memory/packets/reference-market-position-june-2026-three-unique-axes-write-gate-stale-catch-receipts-copi-3a112704.json\n- .agent_memory/packets/runbook-2-0-user-acquisition-sprint-channels-live-baselines-and-what-each-channel-needs-81c82450.json\n- .agent_memory/packets/runbook-releasing-kage-release-js-publishes-from-any-named-branch-ae2e694c.json\n- .agent_memory/packets/workflow-change-memory-v2-stale-catch-4b48862c.json\n- .agent_memory/packets/workflow-stale-catch-feature-landed-via-pr-64-kernel-test-ts-seam-carries-both-v2-test-su-9ad40729.json\n- .claude-plugin/marketplace.json\n- CHANGELOG.md\n- README.md\n- docs/guide.html\n- docs/index.html\n- mcp/cli.ts\n- mcp/server.json\n- plugin/.claude-plugin/plugin.json\n- plugin/.codex-plugin/plugin.json\n- plugin/commands/gains.md\n- plugin/commands/init.md\n- plugin/commands/scan.md\n- plugin/hooks/hooks.json\n- plugin/hooks/session-start.sh\n- plugin/hooks/stop.sh\n\nDiff summary:\n```text\n...t-block-only-on-hard-stale-memory-f9e2c269.json |  9 ++-\n ...rtbeat-stalecatch-kage-staleguard-b1f7baca.json |  9 ++-\n ...re-and-opt-in-recall-token-budget-12d31c53.json |  9 ++-\n ...held-and-caller-answered-receipts-e4e651f1.json |  9 ++-\n ...red-claude-kage-mcp-overriding-al-e6178d3c.json |  9 ++-\n ...te-gate-stale-catch-receipts-copi-3a112704.json | 10 +++-\n ...lines-and-what-each-channel-needs-81c82450.json | 10 +++-\n ...s-publishes-from-any-named-branch-ae2e694c.json |  9 ++-\n ...flow-change-memory-v2-stale-catch-4b48862c.json |  7 ++-\n ...t-ts-seam-carries-both-v2-test-su-9ad40729.json | 10 +++-\n .claude-plugin/marketplace.json                    |  4 +-\n CHANGELOG.md                                       | 14 +++++\n README.md                                          | 35 ++++++++++-\n docs/guide.html                                    | 10 ++--\n docs/index.html                                    |  8 +--\n mcp/cli.ts                                         | 67 +++++++++++++++++++++-\n mcp/server.json                                    |  4 +-\n plugin/.claude-plugin/plugin.json                  |  8 +--\n plugin/.codex-plugin/plugin.json                   |  4 +-\n 19 files changed, 195 insertions(+), 50 deletions(-)\n.agent_memory/packets/reference-claude-mem-cmem-exploded-to-81-8k-stars-category-demand-proven-distribution-is-t-fbe4d6cd.json | untracked\nplugin/commands/gains.md | untracked\nplugin/commands/init.md | untracked\nplugin/commands/scan.md | untracked\nplugin/hooks/hooks.json | untracked\nplugin/hooks/session-start.sh | untracked\nplugin/hooks/stop.sh | untracked\n```\n\nHow to verify:\n- Add the exact test, build, or manual verification command when you refine this memory.\n\nImprove this packet when more context is known:\n- The actual feature, fix, or refactor rationale.\n- Why the change was made, including relevant bugs, issues, decisions, and code explanations.\n- The package, API, command, or architectural pattern future agents should understand, verify, or reuse.\n- Any gotchas, follow-up risks, or branch-specific assumptions.\n\nPromote beyond this repo only after explicit org/global review.","type":"workflow","scope":"repo","visibility":"team","sensitivity":"internal","status":"deprecated","confidence":0.62,"tags":["change-memory","diff-proposal","repo-local","branch:release-v2-0-1"],"paths":[".claude-plugin/marketplace.json","CHANGELOG.md","README.md","docs/guide.html","docs/index.html","mcp/cli.ts","mcp/server.json","plugin/.claude-plugin/plugin.json","plugin/.codex-plugin/plugin.json","plugin/commands/gains.md","plugin/commands/init.md","plugin/commands/scan.md","plugin/hooks/hooks.json","plugin/hooks/session-start.sh","plugin/hooks/stop.sh"],"stack":[],"source_refs":[{"kind":"git_diff","branch":"release/v2.0.1","head":"0d9eb4c83732620e86c3adb440acdbad6a645d3c","merge_base":"22406a76e391880e05e81cd5a48535d77e824d00","changed_files":[".agent_memory/packets/bug_fix-ci-kage-pr-check-must-block-only-on-hard-stale-memory-f9e2c269.json",".agent_memory/packets/code_explanation-stale-catch-change-time-invalidation-heartbeat-stalecatch-kage-staleguard-b1f7baca.json",".agent_memory/packets/decision-graph-nodes-at-capture-and-opt-in-recall-token-budget-12d31c53.json",".agent_memory/packets/decision-value-ledger-records-recall-stale-withheld-and-caller-answered-receipts-e4e651f1.json",".agent_memory/packets/gotcha-mcp-version-skew-launcher-mcp-config-pins-vendored-claude-kage-mcp-overriding-al-e6178d3c.json",".agent_memory/packets/reference-claude-mem-cmem-exploded-to-81-8k-stars-category-demand-proven-distribution-is-t-fbe4d6cd.json",".agent_memory/packets/reference-market-position-june-2026-three-unique-axes-write-gate-stale-catch-receipts-copi-3a112704.json",".agent_memory/packets/runbook-2-0-user-acquisition-sprint-channels-live-baselines-and-what-each-channel-needs-81c82450.json",".agent_memory/packets/runbook-releasing-kage-release-js-publishes-from-any-named-branch-ae2e694c.json",".agent_memory/packets/workflow-change-memory-v2-stale-catch-4b48862c.json",".agent_memory/packets/workflow-stale-catch-feature-landed-via-pr-64-kernel-test-ts-seam-carries-both-v2-test-su-9ad40729.json",".claude-plugin/marketplace.json","CHANGELOG.md","README.md","docs/guide.html","docs/index.html","mcp/cli.ts","mcp/server.json","plugin/.claude-plugin/plugin.json","plugin/.codex-plugin/plugin.json","plugin/commands/gains.md","plugin/commands/init.md","plugin/commands/scan.md","plugin/hooks/hooks.json","plugin/hooks/session-start.sh","plugin/hooks/stop.sh"],"summary_path":".agent_memory/review/branch-summary-release-v2-0-1.json"}],"context":{"fact":"Current branch release/v2.0.1 changes 26 repo paths.","why":"Branch change memory gives future agents durable context from the git diff when they continue, review, or verify this work.","trigger":"Recall when asking what changed on this branch, preparing a PR review, or resuming this work.","action":"Use the changed file list and diff summary as orientation, then inspect the actual diff and source files before making further edits.","verification":"Generated from git diff and refreshed by kage pr summarize or kage propose --from-diff.","risk_if_forgotten":"Future agents may repeat orientation work, miss branch-specific assumptions, or ignore files touched by this change.","stale_when":"The branch diff changes substantially, the branch is merged, or a newer change-memory packet supersedes it."},"freshness":{"last_verified_at":"2026-06-15T21:58:10.473Z","ttl_days":180,"path_fingerprints":[{"path":".claude-plugin/marketplace.json","sha256":"f4ab5ca529c517c5a0fee033dee5d18b937d0bf8bfe14584364806e99766488b","size":750},{"path":"CHANGELOG.md","sha256":"1d00aff932a74d380dad6e0d60ae0aed37e40aa5a03ae7ec0acb71f824d0ef0c","size":46022},{"path":"README.md","sha256":"9a533eee7962e84cdceef1bd8c9463233a575138fa143acafc8abd42f723944a","size":10477},{"path":"docs/guide.html","sha256":"33b57e522b1a49e48631042940e2ca7d281084371c3feb3210604e213e0e7f28","size":51769},{"path":"docs/index.html","sha256":"97fa35c70c0a4682eb5e927543bea68306f073a0d683c92751aa021cc23f0d2c","size":33562},{"path":"mcp/cli.ts","sha256":"a670bc601e227372c9ab3e862f4e25fa87ae4bfa90b63c3bbc61032d332da0d7","size":114201,"symbols":[{"name":"index","kind":"constant","sha256":"c201ee64cf24065dd2ba0bbdc7ff8399e5c1dd89783820e501d28f82019f08a8"},{"name":"value","kind":"constant","sha256":"c9560c65b946f6f8269de6cb5d49d3bb0dbabec6fb3119c445ad738f194d37ba"},{"name":"review","kind":"function","sha256":"cd5b65cd476d7eaecccc181de3bcad5b3d7c99237dcbfce313709f8eb35f9a13"},{"name":"command","kind":"constant","sha256":"9e594169e1f8559f50d7e73b407f1aa3a9a0f14bf43a676fedefa72734badb98"},{"name":"json","kind":"constant","sha256":"9115381310c6d4c5ecb25a7e67e4fd0bb4b20a9b328adb25b606065454f79370"},{"name":"init","kind":"constant","sha256":"26deffe9920c2d94de7d47e5f251282d9ed1957290b0de2f41e8b86e4d99dd7b"},{"name":"current","kind":"constant","sha256":"471f3cfbffa04d6ecddb2f3d4013027b71237de766afb69ec418f1f1b8308937"},{"name":"agent","kind":"constant","sha256":"5b9caa614311fe691d6af171b9a8985b0d49464b9df178ad28ff5b9883eb4cf2"},{"name":"from","kind":"constant","sha256":"b386d829bcacbd9e216c726f6dff71fc7d8a53aade383fa45b850387414b780c"},{"name":"summary","kind":"constant","sha256":"0938b0afc17695033381e2248401bba9b7c6abb6f9f0eaae0d2a8ff2c660d662"},{"name":"durable","kind":"constant","sha256":"59e1af86ee722f58562da0478f6f3fe6621ae96f9473de8c0037e63fe779215e"}]},{"path":"mcp/server.json","sha256":"9e91de082d4ee89c20d52390c95918d2fd7ac9a90942a22d184eeb631528b31a","size":667},{"path":"plugin/.claude-plugin/plugin.json","sha256":"ad058fe3d0b7d571254c359dfd1d4ab2eb502b0157a8cabe32b33dc4d60a268d","size":735},{"path":"plugin/.codex-plugin/plugin.json","sha256":"29fa27abe5a059c855012fee1efdc8d9cdb6d1f30eec18b6db3d9eb46817db41","size":394},{"path":"plugin/commands/gains.md","sha256":"7aa70f178feb1bc303b08d4413027176dea8f3dec79e9c422d6329f458ffc911","size":598},{"path":"plugin/commands/init.md","sha256":"40800490928f216eba2f5fa3c962ac20bd888d8f5ec53a7e14be15ffdc810218","size":612},{"path":"plugin/commands/scan.md","sha256":"80ff2885289a1b79b4e3c93d6e1c3fc2f28ee238ccf437f199ebc697fc7335a6","size":602},{"path":"plugin/hooks/hooks.json","sha256":"ed90980e5bc6df31b65f7bfa9d435f0f35502fad706b4540e987c3d1595ed137","size":1034},{"path":"plugin/hooks/session-start.sh","sha256":"c56aef5f98ae30cb2b3fb6601695b7a9255d60aeb9fa7b58290242c2796a6c5b","size":1919},{"path":"plugin/hooks/stop.sh","sha256":"cc7414511674dcf61bb40c7c37be23c5b7327f2caa979d8b8b1aebe25d4fbaef","size":2229}],"path_fingerprint_policy":"source_hash_staleness","verification":"git_diff"},"edges":[{"relation":"changes_path","to":"path:.agent_memory/packets/bug_fix-ci-kage-pr-check-must-block-only-on-hard-stale-memory-f9e2c269.json","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/code_explanation-stale-catch-change-time-invalidation-heartbeat-stalecatch-kage-staleguard-b1f7baca.json","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-graph-nodes-at-capture-and-opt-in-recall-token-budget-12d31c53.json","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-value-ledger-records-recall-stale-withheld-and-caller-answered-receipts-e4e651f1.json","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/gotcha-mcp-version-skew-launcher-mcp-config-pins-vendored-claude-kage-mcp-overriding-al-e6178d3c.json","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/reference-claude-mem-cmem-exploded-to-81-8k-stars-category-demand-proven-distribution-is-t-fbe4d6cd.json","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/reference-market-position-june-2026-three-unique-axes-write-gate-stale-catch-receipts-copi-3a112704.json","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/runbook-2-0-user-acquisition-sprint-channels-live-baselines-and-what-each-channel-needs-81c82450.json","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/runbook-releasing-kage-release-js-publishes-from-any-named-branch-ae2e694c.json","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/workflow-change-memory-v2-stale-catch-4b48862c.json","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/workflow-stale-catch-feature-landed-via-pr-64-kernel-test-ts-seam-carries-both-v2-test-su-9ad40729.json","evidence":"git_diff"},{"relation":"changes_path","to":"path:.claude-plugin/marketplace.json","evidence":"git_diff"},{"relation":"changes_path","to":"path:CHANGELOG.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:README.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:docs/guide.html","evidence":"git_diff"},{"relation":"changes_path","to":"path:docs/index.html","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/cli.ts","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/server.json","evidence":"git_diff"},{"relation":"changes_path","to":"path:plugin/.claude-plugin/plugin.json","evidence":"git_diff"},{"relation":"changes_path","to":"path:plugin/.codex-plugin/plugin.json","evidence":"git_diff"}],"quality":{"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":991,"admission":{"admit":true,"class":"candidate","score":70,"reasons":["durable memory type","has provenance","repo scoped or path grounded","has durable trigger, rationale, issue context, or explanation","substantive enough to reuse"],"risks":[]},"candidate_kind":"change_memory","review_boundary":"git_or_pr","promotion_requires_review":true,"reverified_at":"2026-06-15T21:58:10.473Z","stale":true,"stale_reasons":["packet status is deprecated","linked path changed since memory was verified: README.md, docs/guide.html, docs/index.html, mcp/cli.ts"],"suggested_action":"mark_stale"},"created_at":"2026-06-12T03:47:27.664Z","updated_at":"2026-06-28T20:48:09.466Z"}
```

