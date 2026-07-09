---
type: "Workflow"
title: "Change memory: master"
description: "Repo-local context for 7 changed repo paths on master."
resource: "mcp/cli.ts"
tags: ["change-memory", "diff-proposal", "repo-local", "branch:master"]
timestamp: "2026-07-09T22:05:33.482Z"
x-kage-id: "repo:https-github-com-kage-core-kage:workflow:change-memory-master"
x-kage-type: "workflow"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "verified"
x-kage-paths: ["mcp/cli.ts", "mcp/daemon.test.ts", "mcp/daemon.ts", "mcp/kernel.test.ts", "mcp/kernel.ts"]
---

# Change memory: master

> Repo-local context for 7 changed repo paths on master.

Repo-local change memory generated from the current git diff.

Goal: preserve the durable context another agent should receive when it works in this repo later.

What changed:
- mcp/cli.ts
- mcp/daemon.test.ts
- mcp/daemon.ts
- mcp/kernel.test.ts
- mcp/kernel.ts
- mcp/viewer/console.js
- mcp/viewer/index.html

Diff summary:
```text
...-cli-js-npx-package-runner-fallback-2d64f260.md |  5 +-
 ...ion-stamps-usage-telemetry-is-live--26defd1d.md |  5 +-
 ...ed-distill-everywhere-fail-pass-evi-4533d14d.md |  5 +-
 ...github-pages-viewer-must-be-tracked-8497f2eb.md |  2 +-
 ...ts-auto-merge-gc-retention-ends-pac-9dafa20a.md |  5 +-
 ...utterances-routed-to-pending-withhe-ccf53f40.md |  5 +-
 ...gin-hooks-generated-from-setupagent-f99cc1e4.md |  5 +-
 ...t-native-v0-not-a-fake-org-tier-aud-a554229e.md |  5 +-
 ...recall-token-budget-verified-v2-2-1-6c65628a.md |  5 +-
 ...ads-published-kage-repo-graph-first-a1a5bd82.md |  2 +-
 ...-viewer-must-auto-load-a-demo-graph-29fd5e52.md |  2 +-
 ...dy-cited-paths-tags-not-a-truncated-0f25a2bc.md |  2 +-
 ...injects-captures-memory-form-factor-479596fe.md |  5 +-
 ...es-answer-to-code-context-engines-9-8c2737fe.md |  5 +-
 ...e-removed-hooks-are-the-memory-loop-563f61c9.md |  5 +-
 ...and-users-a-first-use-structure-map-dc254fb7.md |  2 +-
 ...ry-excludes-bookkeeping-fallback-re-78abd86b.md |  5 +-
 ...ashboard-shows-setup-hook-readiness-3d18849c.md |  2 +-
 ...-blockers-from-handoff-review-items-ea1b70e3.md |  2 +-
 ...ructural-code-graph-mode-by-default-242b6e41.md |  2 +-
 ...tyle-reference-and-viewer-backlinks-d51ff0ca.md |  2 +-
 ...-to-parameterized-viewer-index-html-2dcb1d52.md |  2 +-
 ...tart-to-take-effect-in-live-tooling-4a2f3232.md |  5 +-
 ...-can-measure-dense-local-embeddings-49db135d.md |  2 +-
 ...elease-js-flow-current-as-of-v2-2-0-e798d129.md |  2 +-
 
… [+882 chars truncated]
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

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:workflow:change-memory-master","title":"Change memory: master","summary":"Repo-local context for 7 changed repo paths on master.","body":"Repo-local change memory generated from the current git diff.\n\nGoal: preserve the durable context another agent should receive when it works in this repo later.\n\nWhat changed:\n- mcp/cli.ts\n- mcp/daemon.test.ts\n- mcp/daemon.ts\n- mcp/kernel.test.ts\n- mcp/kernel.ts\n- mcp/viewer/console.js\n- mcp/viewer/index.html\n\nDiff summary:\n```text\n...-cli-js-npx-package-runner-fallback-2d64f260.md |  5 +-\n ...ion-stamps-usage-telemetry-is-live--26defd1d.md |  5 +-\n ...ed-distill-everywhere-fail-pass-evi-4533d14d.md |  5 +-\n ...github-pages-viewer-must-be-tracked-8497f2eb.md |  2 +-\n ...ts-auto-merge-gc-retention-ends-pac-9dafa20a.md |  5 +-\n ...utterances-routed-to-pending-withhe-ccf53f40.md |  5 +-\n ...gin-hooks-generated-from-setupagent-f99cc1e4.md |  5 +-\n ...t-native-v0-not-a-fake-org-tier-aud-a554229e.md |  5 +-\n ...recall-token-budget-verified-v2-2-1-6c65628a.md |  5 +-\n ...ads-published-kage-repo-graph-first-a1a5bd82.md |  2 +-\n ...-viewer-must-auto-load-a-demo-graph-29fd5e52.md |  2 +-\n ...dy-cited-paths-tags-not-a-truncated-0f25a2bc.md |  2 +-\n ...injects-captures-memory-form-factor-479596fe.md |  5 +-\n ...es-answer-to-code-context-engines-9-8c2737fe.md |  5 +-\n ...e-removed-hooks-are-the-memory-loop-563f61c9.md |  5 +-\n ...and-users-a-first-use-structure-map-dc254fb7.md |  2 +-\n ...ry-excludes-bookkeeping-fallback-re-78abd86b.md |  5 +-\n ...ashboard-shows-setup-hook-readiness-3d18849c.md |  2 +-\n ...-blockers-from-handoff-review-items-ea1b70e3.md |  2 +-\n ...ructural-code-graph-mode-by-default-242b6e41.md |  2 +-\n ...tyle-reference-and-viewer-backlinks-d51ff0ca.md |  2 +-\n ...-to-parameterized-viewer-index-html-2dcb1d52.md |  2 +-\n ...tart-to-take-effect-in-live-tooling-4a2f3232.md |  5 +-\n ...-can-measure-dense-local-embeddings-49db135d.md |  2 +-\n ...elease-js-flow-current-as-of-v2-2-0-e798d129.md |  2 +-\n \n… [+882 chars truncated]\n```\n\nHow to verify:\n- Add the exact test, build, or manual verification command when you refine this memory.\n\nImprove this packet when more context is known:\n- The actual feature, fix, or refactor rationale.\n- Why the change was made, including relevant bugs, issues, decisions, and code explanations.\n- The package, API, command, or architectural pattern future agents should understand, verify, or reuse.\n- Any gotchas, follow-up risks, or branch-specific assumptions.\n\nPromote beyond this repo only after explicit org/global review.","type":"workflow","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.62,"tags":["change-memory","diff-proposal","repo-local","branch:master"],"paths":["mcp/cli.ts","mcp/daemon.test.ts","mcp/daemon.ts","mcp/kernel.test.ts","mcp/kernel.ts"],"stack":[],"source_refs":[{"kind":"git_diff","branch":"master","head":"27edbdbfa5b6567d114a16df7dfe9489bb1890d4","merge_base":"27edbdbfa5b6567d114a16df7dfe9489bb1890d4","changed_files":[".agent_memory/packets/bug_fix-ambient-hooks-never-silently-die-path-baked-cli-js-npx-package-runner-fallback-2d64f260.md",".agent_memory/packets/bug_fix-anchors-are-code-identifiers-hooks-carry-version-stamps-usage-telemetry-is-live--26defd1d.md",".agent_memory/packets/bug_fix-core-memory-loop-fixed-prose-observations-gated-distill-everywhere-fail-pass-evi-4533d14d.md",".agent_memory/packets/bug_fix-hosted-github-pages-viewer-must-be-tracked-8497f2eb.md",".agent_memory/packets/bug_fix-merge-packet-sniffs-content-raw-json-md-packets-auto-merge-gc-retention-ends-pac-9dafa20a.md",".agent_memory/packets/decision-capture-guard-ungrounded-conversational-user-utterances-routed-to-pending-withhe-ccf53f40.md",".agent_memory/packets/decision-claude-code-hooks-single-source-of-truth-plugin-hooks-generated-from-setupagent-f99cc1e4.md",".agent_memory/packets/decision-design-kages-collaborative-memory-story-is-git-native-v0-not-a-fake-org-tier-aud-a554229e.md",".agent_memory/packets/decision-graph-nodes-at-capture-opt-in-recall-token-budget-verified-v2-2-1-6c65628a.md",".agent_memory/packets/decision-hosted-viewer-loads-published-kage-repo-graph-first-a1a5bd82.md",".agent_memory/packets/decision-hosted-viewer-must-auto-load-a-demo-graph-29fd5e52.md",".agent_memory/packets/decision-kage-cloud-dashboard-shows-the-full-packet-body-cited-paths-tags-not-a-truncated-0f25a2bc.md",".agent_memory/packets/decision-kage-cloud-link-kage-viewer-team-sidebar-link-local-viewer-surfaces-the-hosted-d-a4fa0fb3.md",".agent_memory/packets/decision-kage-proxy-spike-headroom-style-drop-in-that-injects-captures-memory-form-factor-479596fe.md",".agent_memory/packets/decision-kage-savings-reproducible-token-reduction-kages-answer-to-code-context-engines-9-8c2737fe.md",".agent_memory/packets/decision-nudge-surfacing-and-the-kage-watcher-were-removed-hooks-are-the-memory-loop-563f61c9.md",".agent_memory/packets/decision-repo-x-ray-gives-agents-and-users-a-first-use-structure-map-dc254fb7.md",".agent_memory/packets/decision-updated-at-is-a-content-timestamp-change-memory-excludes-bookkeeping-fallback-re-78abd86b.md",".agent_memory/packets/decision-viewer-dashboard-shows-setup-hook-readiness-3d18849c.md",".agent_memory/packets/decision-viewer-must-separate-inbox-blockers-from-handoff-review-items-ea1b70e3.md",".agent_memory/packets/decision-viewer-opens-structural-code-graph-mode-by-default-242b6e41.md",".agent_memory/packets/decision-website-docs-need-dark-docs-style-reference-and-viewer-backlinks-d51ff0ca.md",".agent_memory/packets/gotcha-viewer-root-must-redirect-to-parameterized-viewer-index-html-2dcb1d52.md",".agent_memory/packets/runbook-capture-distill-fixes-need-a-rebuild-restart-to-take-effect-in-live-tooling-4a2f3232.md",".agent_memory/packets/runbook-longmemeval-harness-can-measure-dense-local-embeddings-49db135d.md",".agent_memory/packets/runbook-releasing-kage-release-js-flow-current-as-of-v2-2-0-e798d129.md",".agent_memory/packets/runbook-run-kage-mcp-tests-9b98df67.md",".agent_memory/packets/runbook-truth-report-detectors-lead-with-reliably-firing-signal-f9853daf.md",".agent_memory/packets/workflow-change-memory-adopt-sse-live-feed-e7f1116c.md",".agent_memory/packets/workflow-change-memory-master-23634276.md","mcp/cli.ts","mcp/daemon.test.ts","mcp/daemon.ts","mcp/kernel.test.ts","mcp/kernel.ts"],"summary_path":"/Users/kushaljain/code/Kage/.agent_memory/review/branch-summary-master.json"},{"kind":"reverification","at":"2026-07-09T22:05:33.482Z","verified_by":"npm test: 402/402 pass; npm pack --dry-run clean","evidence":"cli.ts changed as part of a repo-cleanup pass: added missing one-line usage descriptions to 9 previously-undocumented report commands (metrics/profile/xray/capabilities/decisions/module-health/graph-insights/audit/quality), removed the OKF_PIVOT.md/GROWTH_PLAN.md internal strategy docs, and synced package.json/server.json metadata. None of this touches command dispatch logic or the behavior this packet describes, which is unchanged.","changed_paths":[{"path":"mcp/cli.ts","prior_sha256":"bd2e71cf463912745090cd1499cb1ab72ce5f3269a2bc1fa2e1d1ecaa7454311","sha256":"e1ff59e256f8d02633e3123646b0ff3908e090e49a89e4082c00e1ec9c1ffa98"}]}],"context":{"fact":"Current branch master changes 7 repo paths.","why":"Branch change memory gives future agents durable context from the git diff when they continue, review, or verify this work.","trigger":"Recall when asking what changed on this branch, preparing a PR review, or resuming this work.","action":"Use the changed file list and diff summary as orientation, then inspect the actual diff and source files before making further edits.","verification":"Generated from git diff and refreshed by kage pr summarize or kage propose --from-diff.","risk_if_forgotten":"Future agents may repeat orientation work, miss branch-specific assumptions, or ignore files touched by this change.","stale_when":"The branch diff changes substantially, the branch is merged, or a newer change-memory packet supersedes it."},"freshness":{"last_verified_at":"2026-07-09T22:05:33.482Z","ttl_days":180,"path_fingerprints":[{"path":"mcp/cli.ts","sha256":"e1ff59e256f8d02633e3123646b0ff3908e090e49a89e4082c00e1ec9c1ffa98","size":132716},{"path":"mcp/daemon.test.ts","sha256":"53518efe3e99740fef3aa12525ae2328f0a4981a898c4b6099fbc988934b321a","size":12591},{"path":"mcp/daemon.ts","sha256":"73af908352a4cfef49e14271cea1d9cf43edae4e51c860b60b16135b6762c1bf","size":38833},{"path":"mcp/kernel.test.ts","sha256":"6c5a36e77e7fcd879a1272e2b2ff40b1f1584144e3706517db26eb20ff713d92","size":322375},{"path":"mcp/kernel.ts","sha256":"037ce8e440db339f76a53153b8a770a996053f5552ddd747229a69c95ee0cae2","size":907711}],"path_fingerprint_policy":"source_hash_staleness","verification":"evidence_reverification"},"edges":[{"relation":"changes_path","to":"path:.agent_memory/packets/bug_fix-ambient-hooks-never-silently-die-path-baked-cli-js-npx-package-runner-fallback-2d64f260.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/bug_fix-anchors-are-code-identifiers-hooks-carry-version-stamps-usage-telemetry-is-live--26defd1d.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/bug_fix-core-memory-loop-fixed-prose-observations-gated-distill-everywhere-fail-pass-evi-4533d14d.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/bug_fix-hosted-github-pages-viewer-must-be-tracked-8497f2eb.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/bug_fix-merge-packet-sniffs-content-raw-json-md-packets-auto-merge-gc-retention-ends-pac-9dafa20a.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-capture-guard-ungrounded-conversational-user-utterances-routed-to-pending-withhe-ccf53f40.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-claude-code-hooks-single-source-of-truth-plugin-hooks-generated-from-setupagent-f99cc1e4.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-design-kages-collaborative-memory-story-is-git-native-v0-not-a-fake-org-tier-aud-a554229e.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-graph-nodes-at-capture-opt-in-recall-token-budget-verified-v2-2-1-6c65628a.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-hosted-viewer-loads-published-kage-repo-graph-first-a1a5bd82.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-hosted-viewer-must-auto-load-a-demo-graph-29fd5e52.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-kage-cloud-dashboard-shows-the-full-packet-body-cited-paths-tags-not-a-truncated-0f25a2bc.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-kage-cloud-link-kage-viewer-team-sidebar-link-local-viewer-surfaces-the-hosted-d-a4fa0fb3.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-kage-proxy-spike-headroom-style-drop-in-that-injects-captures-memory-form-factor-479596fe.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-kage-savings-reproducible-token-reduction-kages-answer-to-code-context-engines-9-8c2737fe.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-nudge-surfacing-and-the-kage-watcher-were-removed-hooks-are-the-memory-loop-563f61c9.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-repo-x-ray-gives-agents-and-users-a-first-use-structure-map-dc254fb7.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-updated-at-is-a-content-timestamp-change-memory-excludes-bookkeeping-fallback-re-78abd86b.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-viewer-dashboard-shows-setup-hook-readiness-3d18849c.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-viewer-must-separate-inbox-blockers-from-handoff-review-items-ea1b70e3.md","evidence":"git_diff"}],"quality":{"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":599,"admission":{"admit":true,"class":"candidate","score":70,"reasons":["durable memory type","has provenance","repo scoped or path grounded","has durable trigger, rationale, issue context, or explanation","substantive enough to reuse"],"risks":[]},"candidate_kind":"change_memory","review_boundary":"git_or_pr","promotion_requires_review":true,"uses_30d":20,"total_uses":50,"last_accessed_at":"2026-07-09T21:57:26.724Z","reverified_at":"2026-07-09T22:05:33.482Z"},"created_at":"2026-07-09T06:55:15.069Z","updated_at":"2026-07-09T22:05:33.482Z"}
```

