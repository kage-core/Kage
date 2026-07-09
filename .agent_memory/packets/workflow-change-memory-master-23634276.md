---
type: "Workflow"
title: "Change memory: master"
description: "Repo-local context for 11 changed repo paths on master."
resource: ".agent_memory/packets/decision-full-memoryarena-context-recall-benchmark-results-5cb8cc2b.md"
tags: ["change-memory", "diff-proposal", "repo-local", "branch:master"]
timestamp: "2026-07-09T22:12:46.025Z"
x-kage-id: "repo:https-github-com-kage-core-kage:workflow:change-memory-master"
x-kage-type: "workflow"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "verified"
x-kage-paths: [".agent_memory/packets/decision-full-memoryarena-context-recall-benchmark-results-5cb8cc2b.md", ".agent_memory/packets/decision-recall-diversifies-observed-session-sources-1a7c92a8.md", ".agent_memory/packets/decision-repo-professionalism-cleanup-removed-internal-strategy-docs-fixed-stale-metadata-e89f3a73.md", ".agent_memory/packets/decision-website-docs-need-dark-docs-style-reference-and-viewer-backlinks-d51ff0ca.md", ".agent_memory/packets/decision-workspace-co-change-links-stay-local-git-intelligence-83cfaee4.md", ".agent_memory/packets/decision-workspace-contracts-stay-source-evidence-based-ea6a0e82.md", ".agent_memory/packets/decision-workspace-recall-stays-kage-native-08ffbd42.md", ".agent_memory/packets/decision-workspace-topic-contracts-stay-deterministic-8ca85087.md", ".agent_memory/packets/runbook-kage-context-is-the-single-session-start-tool-replacing-4-separate-calls-84feac04.md", ".agent_memory/packets/workflow-change-memory-326e513-64cb16d4.md", ".agent_memory/packets/workflow-change-memory-master-23634276.md"]
---

# Change memory: master

> Repo-local context for 11 changed repo paths on master.

Repo-local change memory generated from the current git diff.

Goal: preserve the durable context another agent should receive when it works in this repo later.

What changed:
- .agent_memory/packets/decision-full-memoryarena-context-recall-benchmark-results-5cb8cc2b.md
- .agent_memory/packets/decision-recall-diversifies-observed-session-sources-1a7c92a8.md
- .agent_memory/packets/decision-repo-professionalism-cleanup-removed-internal-strategy-docs-fixed-stale-metadata-e89f3a73.md
- .agent_memory/packets/decision-website-docs-need-dark-docs-style-reference-and-viewer-backlinks-d51ff0ca.md
- .agent_memory/packets/decision-workspace-co-change-links-stay-local-git-intelligence-83cfaee4.md
- .agent_memory/packets/decision-workspace-contracts-stay-source-evidence-based-ea6a0e82.md
- .agent_memory/packets/decision-workspace-recall-stays-kage-native-08ffbd42.md
- .agent_memory/packets/decision-workspace-topic-contracts-stay-deterministic-8ca85087.md
- .agent_memory/packets/runbook-kage-context-is-the-single-session-start-tool-replacing-4-separate-calls-84feac04.md
- .agent_memory/packets/workflow-change-memory-326e513-64cb16d4.md
- .agent_memory/packets/workflow-change-memory-master-23634276.md

Diff summary:
```text
...na-context-recall-benchmark-results-5cb8cc2b.md |  2 +-
 ...iversifies-observed-session-sources-1a7c92a8.md |  2 +-
 ...-strategy-docs-fixed-stale-metadata-e89f3a73.md |  2 +-
 ...tyle-reference-and-viewer-backlinks-d51ff0ca.md |  2 +-
 ...e-links-stay-local-git-intelligence-83cfaee4.md |  2 +-
 ...ontracts-stay-source-evidence-based-ea6a0e82.md |  2 +-
 ...-workspace-recall-stays-kage-native-08ffbd42.md |  2 +-
 ...-topic-contracts-stay-deterministic-8ca85087.md |  2 +-
 ...art-tool-replacing-4-separate-calls-84feac04.md |  2 +-
 .../workflow-change-memory-master-23634276.md      | 49 ++++------------------
 10 files changed, 17 insertions(+), 50 deletions(-)
.agent_memory/packets/workflow-change-memory-326e513-64cb16d4.md | untracked
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
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:workflow:change-memory-master","title":"Change memory: master","summary":"Repo-local context for 11 changed repo paths on master.","body":"Repo-local change memory generated from the current git diff.\n\nGoal: preserve the durable context another agent should receive when it works in this repo later.\n\nWhat changed:\n- .agent_memory/packets/decision-full-memoryarena-context-recall-benchmark-results-5cb8cc2b.md\n- .agent_memory/packets/decision-recall-diversifies-observed-session-sources-1a7c92a8.md\n- .agent_memory/packets/decision-repo-professionalism-cleanup-removed-internal-strategy-docs-fixed-stale-metadata-e89f3a73.md\n- .agent_memory/packets/decision-website-docs-need-dark-docs-style-reference-and-viewer-backlinks-d51ff0ca.md\n- .agent_memory/packets/decision-workspace-co-change-links-stay-local-git-intelligence-83cfaee4.md\n- .agent_memory/packets/decision-workspace-contracts-stay-source-evidence-based-ea6a0e82.md\n- .agent_memory/packets/decision-workspace-recall-stays-kage-native-08ffbd42.md\n- .agent_memory/packets/decision-workspace-topic-contracts-stay-deterministic-8ca85087.md\n- .agent_memory/packets/runbook-kage-context-is-the-single-session-start-tool-replacing-4-separate-calls-84feac04.md\n- .agent_memory/packets/workflow-change-memory-326e513-64cb16d4.md\n- .agent_memory/packets/workflow-change-memory-master-23634276.md\n\nDiff summary:\n```text\n...na-context-recall-benchmark-results-5cb8cc2b.md |  2 +-\n ...iversifies-observed-session-sources-1a7c92a8.md |  2 +-\n ...-strategy-docs-fixed-stale-metadata-e89f3a73.md |  2 +-\n ...tyle-reference-and-viewer-backlinks-d51ff0ca.md |  2 +-\n ...e-links-stay-local-git-intelligence-83cfaee4.md |  2 +-\n ...ontracts-stay-source-evidence-based-ea6a0e82.md |  2 +-\n ...-workspace-recall-stays-kage-native-08ffbd42.md |  2 +-\n ...-topic-contracts-stay-deterministic-8ca85087.md |  2 +-\n ...art-tool-replacing-4-separate-calls-84feac04.md |  2 +-\n .../workflow-change-memory-master-23634276.md      | 49 ++++------------------\n 10 files changed, 17 insertions(+), 50 deletions(-)\n.agent_memory/packets/workflow-change-memory-326e513-64cb16d4.md | untracked\n```\n\nHow to verify:\n- Add the exact test, build, or manual verification command when you refine this memory.\n\nImprove this packet when more context is known:\n- The actual feature, fix, or refactor rationale.\n- Why the change was made, including relevant bugs, issues, decisions, and code explanations.\n- The package, API, command, or architectural pattern future agents should understand, verify, or reuse.\n- Any gotchas, follow-up risks, or branch-specific assumptions.\n\nPromote beyond this repo only after explicit org/global review.","type":"workflow","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.62,"tags":["change-memory","diff-proposal","repo-local","branch:master"],"paths":[".agent_memory/packets/decision-full-memoryarena-context-recall-benchmark-results-5cb8cc2b.md",".agent_memory/packets/decision-recall-diversifies-observed-session-sources-1a7c92a8.md",".agent_memory/packets/decision-repo-professionalism-cleanup-removed-internal-strategy-docs-fixed-stale-metadata-e89f3a73.md",".agent_memory/packets/decision-website-docs-need-dark-docs-style-reference-and-viewer-backlinks-d51ff0ca.md",".agent_memory/packets/decision-workspace-co-change-links-stay-local-git-intelligence-83cfaee4.md",".agent_memory/packets/decision-workspace-contracts-stay-source-evidence-based-ea6a0e82.md",".agent_memory/packets/decision-workspace-recall-stays-kage-native-08ffbd42.md",".agent_memory/packets/decision-workspace-topic-contracts-stay-deterministic-8ca85087.md",".agent_memory/packets/runbook-kage-context-is-the-single-session-start-tool-replacing-4-separate-calls-84feac04.md",".agent_memory/packets/workflow-change-memory-326e513-64cb16d4.md",".agent_memory/packets/workflow-change-memory-master-23634276.md"],"stack":[],"source_refs":[{"kind":"git_diff","branch":"master","head":"235bc56bf28f1cf0093577b31cd164d663433f49","merge_base":"235bc56bf28f1cf0093577b31cd164d663433f49","changed_files":[".agent_memory/packets/decision-full-memoryarena-context-recall-benchmark-results-5cb8cc2b.md",".agent_memory/packets/decision-recall-diversifies-observed-session-sources-1a7c92a8.md",".agent_memory/packets/decision-repo-professionalism-cleanup-removed-internal-strategy-docs-fixed-stale-metadata-e89f3a73.md",".agent_memory/packets/decision-website-docs-need-dark-docs-style-reference-and-viewer-backlinks-d51ff0ca.md",".agent_memory/packets/decision-workspace-co-change-links-stay-local-git-intelligence-83cfaee4.md",".agent_memory/packets/decision-workspace-contracts-stay-source-evidence-based-ea6a0e82.md",".agent_memory/packets/decision-workspace-recall-stays-kage-native-08ffbd42.md",".agent_memory/packets/decision-workspace-topic-contracts-stay-deterministic-8ca85087.md",".agent_memory/packets/runbook-kage-context-is-the-single-session-start-tool-replacing-4-separate-calls-84feac04.md",".agent_memory/packets/workflow-change-memory-326e513-64cb16d4.md",".agent_memory/packets/workflow-change-memory-master-23634276.md"],"summary_path":"/Users/kushaljain/code/Kage/.agent_memory/review/branch-summary-master.json"}],"context":{"fact":"Current branch master changes 11 repo paths.","why":"Branch change memory gives future agents durable context from the git diff when they continue, review, or verify this work.","trigger":"Recall when asking what changed on this branch, preparing a PR review, or resuming this work.","action":"Use the changed file list and diff summary as orientation, then inspect the actual diff and source files before making further edits.","verification":"Generated from git diff and refreshed by kage pr summarize or kage propose --from-diff.","risk_if_forgotten":"Future agents may repeat orientation work, miss branch-specific assumptions, or ignore files touched by this change.","stale_when":"The branch diff changes substantially, the branch is merged, or a newer change-memory packet supersedes it."},"freshness":{"last_verified_at":"2026-07-09T22:12:46.025Z","ttl_days":180,"path_fingerprints":[],"path_fingerprint_policy":"source_hash_staleness","verification":"git_diff"},"edges":[{"relation":"changes_path","to":"path:.agent_memory/packets/decision-full-memoryarena-context-recall-benchmark-results-5cb8cc2b.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-recall-diversifies-observed-session-sources-1a7c92a8.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-repo-professionalism-cleanup-removed-internal-strategy-docs-fixed-stale-metadata-e89f3a73.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-website-docs-need-dark-docs-style-reference-and-viewer-backlinks-d51ff0ca.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-workspace-co-change-links-stay-local-git-intelligence-83cfaee4.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-workspace-contracts-stay-source-evidence-based-ea6a0e82.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-workspace-recall-stays-kage-native-08ffbd42.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-workspace-topic-contracts-stay-deterministic-8ca85087.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/runbook-kage-context-is-the-single-session-start-tool-replacing-4-separate-calls-84feac04.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/workflow-change-memory-326e513-64cb16d4.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/workflow-change-memory-master-23634276.md","evidence":"git_diff"}],"quality":{"score":82,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":["some referenced paths are missing: .agent_memory/packets/workflow-change-memory-master-23634276.md"],"duplicate_candidates":[],"estimated_tokens_saved":629,"admission":{"admit":true,"class":"candidate","score":70,"reasons":["durable memory type","has provenance","repo scoped or path grounded","has durable trigger, rationale, issue context, or explanation","substantive enough to reuse"],"risks":[]},"candidate_kind":"change_memory","review_boundary":"git_or_pr","promotion_requires_review":true,"uses_30d":20,"total_uses":51,"last_accessed_at":"2026-07-09T22:27:33.173Z"},"created_at":"2026-07-09T22:12:46.025Z","updated_at":"2026-07-09T22:12:46.025Z"}
```

