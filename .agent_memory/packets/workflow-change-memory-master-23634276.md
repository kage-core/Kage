---
type: "Workflow"
title: "Change memory: master"
description: "Repo-local context for 2 changed repo paths on master."
resource: "mcp/cloud-server.test.ts"
tags: ["change-memory", "diff-proposal", "repo-local", "branch:master"]
timestamp: "2026-07-09T06:26:07.457Z"
x-kage-id: "repo:https-github-com-kage-core-kage:workflow:change-memory-master"
x-kage-type: "workflow"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "verified"
x-kage-paths: ["mcp/cloud-server.test.ts", "mcp/cloud-server.ts"]
---

# Change memory: master

> Repo-local context for 2 changed repo paths on master.

Repo-local change memory generated from the current git diff.

Goal: preserve the durable context another agent should receive when it works in this repo later.

What changed:
- mcp/cloud-server.test.ts
- mcp/cloud-server.ts

Diff summary:
```text
...-cli-js-npx-package-runner-fallback-2d64f260.md |   2 +-
 ...-kage-pr-check-ci-max-turns-failure-f836cbf0.md |   2 +-
 ...github-pages-viewer-must-be-tracked-8497f2eb.md |   2 +-
 ...rs-buried-exact-matches-fixed-v3-2--b09b2cdb.md |   2 +-
 ...pus-5x-overstated-kage-usd-per-mtok-85a1d77f.md |   2 +-
 ...ication-checks-claude-ambient-hooks-08e91af5.md |   2 +-
 ...utterances-routed-to-pending-withhe-ccf53f40.md |   2 +-
 ...gin-hooks-generated-from-setupagent-f99cc1e4.md |   2 +-
 ...etup-installs-ambient-capture-hooks-025d5af5.md |   2 +-
 ...k-gates-harden-kage-handoff-quality-80fea58c.md |   2 +-
 ...all-code-graph-and-activation-proof-d01ebdf1.md |   2 +-
 ...ary-action-as-the-top-review-signal-42ed1443.md |   2 +-
 ...r-must-default-to-high-signal-graph-24bfa4ff.md |   2 +-
 ...t-native-v0-not-a-fake-org-tier-aud-a554229e.md |   2 +-
 ...-viewer-must-auto-load-a-demo-graph-29fd5e52.md |   2 +-
 ...pinned-context-universal-dump-guard-c6710261.md |   2 +-
 ...r-kage-cloud-built-at-explicit-user-d1d58252.md |   7 +-
 ...hits-inject-full-packet-body-rest-s-bc803cd5.md |   2 +-
 ...-workspace-routing-on-claude-codes--f48b90a8.md |   2 +-
 ...es-answer-to-code-context-engines-9-8c2737fe.md |   2 +-
 ...-free-of-generated-launch-artifacts-acf4ba6f.md |   2 +-
 ...ionale-issues-and-code-explanations-668d52d3.md |   2 +-
 ...uage-framework-routes-in-code-graph-f80a59d6.md |   2 +-
 ...e-removed-hooks-are-the-memory-loop-563f61c9.md |   2 +-
 ...ve-kage-small-always-on-repo-memo
… [+1708 chars truncated]
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
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:workflow:change-memory-master","title":"Change memory: master","summary":"Repo-local context for 2 changed repo paths on master.","body":"Repo-local change memory generated from the current git diff.\n\nGoal: preserve the durable context another agent should receive when it works in this repo later.\n\nWhat changed:\n- mcp/cloud-server.test.ts\n- mcp/cloud-server.ts\n\nDiff summary:\n```text\n...-cli-js-npx-package-runner-fallback-2d64f260.md |   2 +-\n ...-kage-pr-check-ci-max-turns-failure-f836cbf0.md |   2 +-\n ...github-pages-viewer-must-be-tracked-8497f2eb.md |   2 +-\n ...rs-buried-exact-matches-fixed-v3-2--b09b2cdb.md |   2 +-\n ...pus-5x-overstated-kage-usd-per-mtok-85a1d77f.md |   2 +-\n ...ication-checks-claude-ambient-hooks-08e91af5.md |   2 +-\n ...utterances-routed-to-pending-withhe-ccf53f40.md |   2 +-\n ...gin-hooks-generated-from-setupagent-f99cc1e4.md |   2 +-\n ...etup-installs-ambient-capture-hooks-025d5af5.md |   2 +-\n ...k-gates-harden-kage-handoff-quality-80fea58c.md |   2 +-\n ...all-code-graph-and-activation-proof-d01ebdf1.md |   2 +-\n ...ary-action-as-the-top-review-signal-42ed1443.md |   2 +-\n ...r-must-default-to-high-signal-graph-24bfa4ff.md |   2 +-\n ...t-native-v0-not-a-fake-org-tier-aud-a554229e.md |   2 +-\n ...-viewer-must-auto-load-a-demo-graph-29fd5e52.md |   2 +-\n ...pinned-context-universal-dump-guard-c6710261.md |   2 +-\n ...r-kage-cloud-built-at-explicit-user-d1d58252.md |   7 +-\n ...hits-inject-full-packet-body-rest-s-bc803cd5.md |   2 +-\n ...-workspace-routing-on-claude-codes--f48b90a8.md |   2 +-\n ...es-answer-to-code-context-engines-9-8c2737fe.md |   2 +-\n ...-free-of-generated-launch-artifacts-acf4ba6f.md |   2 +-\n ...ionale-issues-and-code-explanations-668d52d3.md |   2 +-\n ...uage-framework-routes-in-code-graph-f80a59d6.md |   2 +-\n ...e-removed-hooks-are-the-memory-loop-563f61c9.md |   2 +-\n ...ve-kage-small-always-on-repo-memo\n… [+1708 chars truncated]\n```\n\nHow to verify:\n- Add the exact test, build, or manual verification command when you refine this memory.\n\nImprove this packet when more context is known:\n- The actual feature, fix, or refactor rationale.\n- Why the change was made, including relevant bugs, issues, decisions, and code explanations.\n- The package, API, command, or architectural pattern future agents should understand, verify, or reuse.\n- Any gotchas, follow-up risks, or branch-specific assumptions.\n\nPromote beyond this repo only after explicit org/global review.","type":"workflow","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.62,"tags":["change-memory","diff-proposal","repo-local","branch:master"],"paths":["mcp/cloud-server.test.ts","mcp/cloud-server.ts"],"stack":[],"source_refs":[{"kind":"git_diff","branch":"master","head":"e858ac3d259f58253fa88fe24e0eaf64a6d6e941","merge_base":"e858ac3d259f58253fa88fe24e0eaf64a6d6e941","changed_files":[".agent_memory/packets/bug_fix-ambient-hooks-never-silently-die-path-baked-cli-js-npx-package-runner-fallback-2d64f260.md",".agent_memory/packets/bug_fix-fix-kage-pr-check-ci-max-turns-failure-f836cbf0.md",".agent_memory/packets/bug_fix-hosted-github-pages-viewer-must-be-tracked-8497f2eb.md",".agent_memory/packets/bug_fix-recall-ranking-stopword-dilution-ungated-priors-buried-exact-matches-fixed-v3-2--b09b2cdb.md",".agent_memory/packets/bug_fix-savings-estimate-3-1m-sonnet-default-was-15-opus-5x-overstated-kage-usd-per-mtok-85a1d77f.md",".agent_memory/packets/decision-agent-setup-verification-checks-claude-ambient-hooks-08e91af5.md",".agent_memory/packets/decision-capture-guard-ungrounded-conversational-user-utterances-routed-to-pending-withhe-ccf53f40.md",".agent_memory/packets/decision-claude-code-hooks-single-source-of-truth-plugin-hooks-generated-from-setupagent-f99cc1e4.md",".agent_memory/packets/decision-claude-code-setup-installs-ambient-capture-hooks-025d5af5.md",".agent_memory/packets/decision-code-index-inbox-and-benchmark-gates-harden-kage-handoff-quality-80fea58c.md",".agent_memory/packets/decision-codex-demo-should-show-recall-code-graph-and-activation-proof-d01ebdf1.md",".agent_memory/packets/decision-dashboard-uses-handoff-primary-action-as-the-top-review-signal-42ed1443.md",".agent_memory/packets/decision-decision-viewer-must-default-to-high-signal-graph-24bfa4ff.md",".agent_memory/packets/decision-design-kages-collaborative-memory-story-is-git-native-v0-not-a-fake-org-tier-aud-a554229e.md",".agent_memory/packets/decision-hosted-viewer-must-auto-load-a-demo-graph-29fd5e52.md",".agent_memory/packets/decision-injection-capture-hardening-sessionstart-pinned-context-universal-dump-guard-c6710261.md",".agent_memory/packets/decision-kage-cloud-dashboard-real-server-rendered-review-gate-ui-at-get-dashboard-with-w-d23475cf.md",".agent_memory/packets/decision-kage-cloud-v1-5-real-self-hostable-team-server-kage-cloud-built-at-explicit-user-d1d58252.md",".agent_memory/packets/decision-kage-proxy-injection-is-now-body-aware-top-2-hits-inject-full-packet-body-rest-s-bc803cd5.md",".agent_memory/packets/decision-kage-proxy-supports-multi-repo-workspaces-via-workspace-routing-on-claude-codes--f48b90a8.md",".agent_memory/packets/decision-kage-savings-reproducible-token-reduction-kages-answer-to-code-context-engines-9-8c2737fe.md",".agent_memory/packets/decision-keep-public-repo-free-of-generated-launch-artifacts-acf4ba6f.md",".agent_memory/packets/decision-memory-admission-includes-rationale-issues-and-code-explanations-668d52d3.md",".agent_memory/packets/decision-mixed-language-framework-routes-in-code-graph-f80a59d6.md",".agent_memory/packets/decision-nudge-surfacing-and-the-kage-watcher-were-removed-hooks-are-the-memory-loop-563f61c9.md",".agent_memory/packets/decision-pinned-context-slots-give-kage-small-always-on-repo-memory-85b0c930.md",".agent_memory/packets/decision-project-profile-gives-agents-compact-repo-orientation-352a278d.md",".agent_memory/packets/decision-recall-access-tracking-stays-local-and-ignored-168c207d.md",".agent_memory/packets/decision-repo-x-ray-gives-agents-and-users-a-first-use-structure-map-dc254fb7.md",".agent_memory/packets/decision-scale-benchmark-is-now-package-callable-ade9d363.md",".agent_memory/packets/decision-setup-doctor-surfaces-claude-ambient-hook-readiness-355c5e14.md",".agent_memory/packets/decision-updated-at-is-a-content-timestamp-change-memory-excludes-bookkeeping-fallback-re-78abd86b.md",".agent_memory/packets/decision-viewer-dashboard-shows-setup-hook-readiness-3d18849c.md",".agent_memory/packets/decision-viewer-opens-structural-code-graph-mode-by-default-242b6e41.md",".agent_memory/packets/decision-website-docs-need-dark-docs-style-reference-and-viewer-backlinks-d51ff0ca.md",".agent_memory/packets/decision-website-revamp-positions-kage-as-serious-oss-cli-and-mcp-tool-ffb1232f.md",".agent_memory/packets/gotcha-contradiction-detector-require-distinctive-subject-paraphrase-not-generic-token--3886be09.md",".agent_memory/packets/gotcha-gotcha-three-real-bugs-found-building-kage-cloud-url-encoded-packet-ids-insert-v-fe2e8a69.md",".agent_memory/packets/gotcha-release-workflow-should-be-non-interactive-and-preflight-remote-state-9e0606f6.md",".agent_memory/packets/gotcha-root-cause-fix-kage-proxy-429-on-subscription-was-the-oauth-system-prompt-guardr-28e22d9b.md",".agent_memory/packets/gotcha-viewer-root-must-redirect-to-parameterized-viewer-index-html-2dcb1d52.md",".agent_memory/packets/negative_result-memoryarena-openai-answer-benchmark-blocked-by-api-quota-493726af.md",".agent_memory/packets/runbook-capture-distill-fixes-need-a-rebuild-restart-to-take-effect-in-live-tooling-4a2f3232.md",".agent_memory/packets/runbook-claude-code-mcp-setup-claude-json-alwaysload-sessionstart-hook-6a62f338.md",".agent_memory/packets/runbook-kage-context-is-the-single-session-start-tool-replacing-4-separate-calls-84feac04.md",".agent_memory/packets/runbook-run-kage-mcp-tests-9b98df67.md",".agent_memory/packets/workflow-change-memory-adopt-sse-live-feed-e7f1116c.md",".agent_memory/packets/workflow-change-memory-master-23634276.md","mcp/cloud-server.test.ts","mcp/cloud-server.ts"],"summary_path":".agent_memory/review/branch-summary-master.json"}],"context":{"fact":"Current branch master changes 2 repo paths.","why":"Branch change memory gives future agents durable context from the git diff when they continue, review, or verify this work.","trigger":"Recall when asking what changed on this branch, preparing a PR review, or resuming this work.","action":"Use the changed file list and diff summary as orientation, then inspect the actual diff and source files before making further edits.","verification":"Generated from git diff and refreshed by kage pr summarize or kage propose --from-diff.","risk_if_forgotten":"Future agents may repeat orientation work, miss branch-specific assumptions, or ignore files touched by this change.","stale_when":"The branch diff changes substantially, the branch is merged, or a newer change-memory packet supersedes it."},"freshness":{"last_verified_at":"2026-07-09T06:26:07.457Z","ttl_days":180,"path_fingerprints":[],"path_fingerprint_policy":"source_hash_staleness","verification":"git_diff"},"edges":[{"relation":"changes_path","to":"path:.agent_memory/packets/bug_fix-ambient-hooks-never-silently-die-path-baked-cli-js-npx-package-runner-fallback-2d64f260.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/bug_fix-fix-kage-pr-check-ci-max-turns-failure-f836cbf0.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/bug_fix-hosted-github-pages-viewer-must-be-tracked-8497f2eb.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/bug_fix-recall-ranking-stopword-dilution-ungated-priors-buried-exact-matches-fixed-v3-2--b09b2cdb.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/bug_fix-savings-estimate-3-1m-sonnet-default-was-15-opus-5x-overstated-kage-usd-per-mtok-85a1d77f.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-agent-setup-verification-checks-claude-ambient-hooks-08e91af5.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-capture-guard-ungrounded-conversational-user-utterances-routed-to-pending-withhe-ccf53f40.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-claude-code-hooks-single-source-of-truth-plugin-hooks-generated-from-setupagent-f99cc1e4.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-claude-code-setup-installs-ambient-capture-hooks-025d5af5.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-code-index-inbox-and-benchmark-gates-harden-kage-handoff-quality-80fea58c.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-codex-demo-should-show-recall-code-graph-and-activation-proof-d01ebdf1.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-dashboard-uses-handoff-primary-action-as-the-top-review-signal-42ed1443.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-decision-viewer-must-default-to-high-signal-graph-24bfa4ff.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-design-kages-collaborative-memory-story-is-git-native-v0-not-a-fake-org-tier-aud-a554229e.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-hosted-viewer-must-auto-load-a-demo-graph-29fd5e52.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-injection-capture-hardening-sessionstart-pinned-context-universal-dump-guard-c6710261.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-kage-cloud-dashboard-real-server-rendered-review-gate-ui-at-get-dashboard-with-w-d23475cf.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-kage-cloud-v1-5-real-self-hostable-team-server-kage-cloud-built-at-explicit-user-d1d58252.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-kage-proxy-injection-is-now-body-aware-top-2-hits-inject-full-packet-body-rest-s-bc803cd5.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-kage-proxy-supports-multi-repo-workspaces-via-workspace-routing-on-claude-codes--f48b90a8.md","evidence":"git_diff"}],"quality":{"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":578,"admission":{"admit":true,"class":"candidate","score":70,"reasons":["durable memory type","has provenance","repo scoped or path grounded","has durable trigger, rationale, issue context, or explanation","substantive enough to reuse"],"risks":[]},"candidate_kind":"change_memory","review_boundary":"git_or_pr","promotion_requires_review":true,"uses_30d":20,"total_uses":46,"last_accessed_at":"2026-07-09T06:07:27.155Z"},"created_at":"2026-07-09T06:26:07.457Z","updated_at":"2026-07-09T06:26:07.457Z"}
```

