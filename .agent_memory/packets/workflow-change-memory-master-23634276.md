---
type: "Workflow"
title: "Change memory: master"
description: "Repo-local context for 5 changed repo paths on master."
resource: ".agent_memory/packets/bug_fix-recall-ranking-stopword-dilution-ungated-priors-buried-exact-matches-fixed-v3-2--b09b2cdb.md"
tags: ["change-memory", "diff-proposal", "repo-local", "branch:master"]
timestamp: "2026-07-03T12:41:28.370Z"
x-kage-id: "repo:https-github-com-kage-core-kage:workflow:change-memory-master"
x-kage-type: "workflow"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "verified"
x-kage-paths: [".agent_memory/packets/bug_fix-recall-ranking-stopword-dilution-ungated-priors-buried-exact-matches-fixed-v3-2--b09b2cdb.md", ".agent_memory/packets/decision-ranking-trusts-evidence-over-graph-density-verification-is-earned-not-born-7ab818ec.md", ".agent_memory/packets/runbook-runbook-tool-failed-cwd-users-kushaljain-code-kage-duration-ms-1911-effort-level-67b5a2e5.md", ".agent_memory/packets/runbook-truth-report-detectors-lead-with-reliably-firing-signal-f9853daf.md", ".agent_memory/packets/workflow-change-memory-master-23634276.md"]
---

# Change memory: master

> Repo-local context for 5 changed repo paths on master.

Repo-local change memory generated from the current git diff.

Goal: preserve the durable context another agent should receive when it works in this repo later.

What changed:
- .agent_memory/packets/bug_fix-recall-ranking-stopword-dilution-ungated-priors-buried-exact-matches-fixed-v3-2--b09b2cdb.md
- .agent_memory/packets/decision-ranking-trusts-evidence-over-graph-density-verification-is-earned-not-born-7ab818ec.md
- .agent_memory/packets/runbook-runbook-tool-failed-cwd-users-kushaljain-code-kage-duration-ms-1911-effort-level-67b5a2e5.md
- .agent_memory/packets/runbook-truth-report-detectors-lead-with-reliably-firing-signal-f9853daf.md
- .agent_memory/packets/workflow-change-memory-master-23634276.md

Diff summary:
```text
...lution-ungated-priors-buried-exact-matches-fixed-v3-2--b09b2cdb.md | 2 +-
 ...nce-over-graph-density-verification-is-earned-not-born-7ab818ec.md | 2 +-
 ...ers-kushaljain-code-kage-duration-ms-1911-effort-level-67b5a2e5.md | 4 ++--
 ...ruth-report-detectors-lead-with-reliably-firing-signal-f9853daf.md | 2 +-
 .agent_memory/packets/workflow-change-memory-master-23634276.md       | 2 +-
 5 files changed, 6 insertions(+), 6 deletions(-)
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
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:workflow:change-memory-master","title":"Change memory: master","summary":"Repo-local context for 5 changed repo paths on master.","body":"Repo-local change memory generated from the current git diff.\n\nGoal: preserve the durable context another agent should receive when it works in this repo later.\n\nWhat changed:\n- .agent_memory/packets/bug_fix-recall-ranking-stopword-dilution-ungated-priors-buried-exact-matches-fixed-v3-2--b09b2cdb.md\n- .agent_memory/packets/decision-ranking-trusts-evidence-over-graph-density-verification-is-earned-not-born-7ab818ec.md\n- .agent_memory/packets/runbook-runbook-tool-failed-cwd-users-kushaljain-code-kage-duration-ms-1911-effort-level-67b5a2e5.md\n- .agent_memory/packets/runbook-truth-report-detectors-lead-with-reliably-firing-signal-f9853daf.md\n- .agent_memory/packets/workflow-change-memory-master-23634276.md\n\nDiff summary:\n```text\n...lution-ungated-priors-buried-exact-matches-fixed-v3-2--b09b2cdb.md | 2 +-\n ...nce-over-graph-density-verification-is-earned-not-born-7ab818ec.md | 2 +-\n ...ers-kushaljain-code-kage-duration-ms-1911-effort-level-67b5a2e5.md | 4 ++--\n ...ruth-report-detectors-lead-with-reliably-firing-signal-f9853daf.md | 2 +-\n .agent_memory/packets/workflow-change-memory-master-23634276.md       | 2 +-\n 5 files changed, 6 insertions(+), 6 deletions(-)\n```\n\nHow to verify:\n- Add the exact test, build, or manual verification command when you refine this memory.\n\nImprove this packet when more context is known:\n- The actual feature, fix, or refactor rationale.\n- Why the change was made, including relevant bugs, issues, decisions, and code explanations.\n- The package, API, command, or architectural pattern future agents should understand, verify, or reuse.\n- Any gotchas, follow-up risks, or branch-specific assumptions.\n\nPromote beyond this repo only after explicit org/global review.","type":"workflow","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.62,"tags":["change-memory","diff-proposal","repo-local","branch:master"],"paths":[".agent_memory/packets/bug_fix-recall-ranking-stopword-dilution-ungated-priors-buried-exact-matches-fixed-v3-2--b09b2cdb.md",".agent_memory/packets/decision-ranking-trusts-evidence-over-graph-density-verification-is-earned-not-born-7ab818ec.md",".agent_memory/packets/runbook-runbook-tool-failed-cwd-users-kushaljain-code-kage-duration-ms-1911-effort-level-67b5a2e5.md",".agent_memory/packets/runbook-truth-report-detectors-lead-with-reliably-firing-signal-f9853daf.md",".agent_memory/packets/workflow-change-memory-master-23634276.md"],"stack":[],"source_refs":[{"kind":"git_diff","branch":"master","head":"c44bc008053e3ed769c9e463f985d17129afd61f","merge_base":"c44bc008053e3ed769c9e463f985d17129afd61f","changed_files":[".agent_memory/packets/bug_fix-recall-ranking-stopword-dilution-ungated-priors-buried-exact-matches-fixed-v3-2--b09b2cdb.md",".agent_memory/packets/decision-ranking-trusts-evidence-over-graph-density-verification-is-earned-not-born-7ab818ec.md",".agent_memory/packets/runbook-runbook-tool-failed-cwd-users-kushaljain-code-kage-duration-ms-1911-effort-level-67b5a2e5.md",".agent_memory/packets/runbook-truth-report-detectors-lead-with-reliably-firing-signal-f9853daf.md",".agent_memory/packets/workflow-change-memory-master-23634276.md"],"summary_path":"/Users/kushaljain/code/Kage/.agent_memory/review/branch-summary-master.json"}],"context":{"fact":"Current branch master changes 5 repo paths.","why":"Branch change memory gives future agents durable context from the git diff when they continue, review, or verify this work.","trigger":"Recall when asking what changed on this branch, preparing a PR review, or resuming this work.","action":"Use the changed file list and diff summary as orientation, then inspect the actual diff and source files before making further edits.","verification":"Generated from git diff and refreshed by kage pr summarize or kage propose --from-diff.","risk_if_forgotten":"Future agents may repeat orientation work, miss branch-specific assumptions, or ignore files touched by this change.","stale_when":"The branch diff changes substantially, the branch is merged, or a newer change-memory packet supersedes it."},"freshness":{"last_verified_at":"2026-07-03T12:41:28.370Z","ttl_days":180,"path_fingerprints":[],"path_fingerprint_policy":"source_hash_staleness","verification":"git_diff"},"edges":[{"relation":"changes_path","to":"path:.agent_memory/packets/bug_fix-recall-ranking-stopword-dilution-ungated-priors-buried-exact-matches-fixed-v3-2--b09b2cdb.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-ranking-trusts-evidence-over-graph-density-verification-is-earned-not-born-7ab818ec.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/runbook-runbook-tool-failed-cwd-users-kushaljain-code-kage-duration-ms-1911-effort-level-67b5a2e5.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/runbook-truth-report-detectors-lead-with-reliably-firing-signal-f9853daf.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/workflow-change-memory-master-23634276.md","evidence":"git_diff"}],"quality":{"score":82,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":["some referenced paths are missing: .agent_memory/packets/workflow-change-memory-master-23634276.md"],"duplicate_candidates":[],"estimated_tokens_saved":428,"admission":{"admit":true,"class":"candidate","score":70,"reasons":["durable memory type","has provenance","repo scoped or path grounded","has durable trigger, rationale, issue context, or explanation","substantive enough to reuse"],"risks":[]},"candidate_kind":"change_memory","review_boundary":"git_or_pr","promotion_requires_review":true,"uses_30d":18,"total_uses":18,"last_accessed_at":"2026-07-03T07:11:47.542Z"},"created_at":"2026-07-03T12:41:28.370Z","updated_at":"2026-07-03T16:16:26.746Z"}
```

