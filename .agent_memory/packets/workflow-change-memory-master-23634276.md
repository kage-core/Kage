---
type: "Workflow"
title: "Change memory: master"
description: "Repo-local context for 13 changed repo paths on master."
resource: ".agent_memory/packets/bug_fix-anchors-are-code-identifiers-hooks-carry-version-stamps-usage-telemetry-is-live--26defd1d.md"
tags: ["change-memory", "diff-proposal", "repo-local", "branch:master"]
timestamp: "2026-07-03T17:00:31.031Z"
x-kage-id: "repo:https-github-com-kage-core-kage:workflow:change-memory-master"
x-kage-type: "workflow"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "verified"
x-kage-paths: [".agent_memory/packets/bug_fix-anchors-are-code-identifiers-hooks-carry-version-stamps-usage-telemetry-is-live--26defd1d.md", ".agent_memory/packets/bug_fix-merge-packet-sniffs-content-raw-json-md-packets-auto-merge-gc-retention-ends-pac-9dafa20a.md", ".agent_memory/packets/decision-before-you-edit-risk-page-must-explain-why-and-what-to-do-first-41b900df.md", ".agent_memory/packets/decision-daemon-rest-exposes-complete-agent-memory-operations-9b6072ac.md", ".agent_memory/packets/decision-memory-admission-includes-rationale-issues-and-code-explanations-668d52d3.md", ".agent_memory/packets/decision-memory-timeline-is-now-a-first-class-handoff-report-f285de3e.md", ".agent_memory/packets/decision-quick-code-indexing-defers-source-files-instead-of-silently-skipping-them-52888287.md", ".agent_memory/packets/decision-tree-sitter-tier-sits-between-ts-ast-and-regex-extraction-c31c8f33.md", ".agent_memory/packets/decision-updated-at-is-a-content-timestamp-change-memory-excludes-bookkeeping-fallback-re-78abd86b.md", ".agent_memory/packets/decision-v2-3-0-closed-the-trust-axis-vs-the-73-system-comparison-fbe27c37.md", ".agent_memory/packets/decision-website-docs-need-dark-docs-style-reference-and-viewer-backlinks-d51ff0ca.md", ".agent_memory/packets/runbook-runbook-tool-failed-cwd-users-kushaljain-code-kage-duration-ms-1911-effort-level-67b5a2e5.md", ".agent_memory/packets/workflow-change-memory-master-23634276.md"]
---

# Change memory: master

> Repo-local context for 13 changed repo paths on master.

Repo-local change memory generated from the current git diff.

Goal: preserve the durable context another agent should receive when it works in this repo later.

What changed:
- .agent_memory/packets/bug_fix-anchors-are-code-identifiers-hooks-carry-version-stamps-usage-telemetry-is-live--26defd1d.md
- .agent_memory/packets/bug_fix-merge-packet-sniffs-content-raw-json-md-packets-auto-merge-gc-retention-ends-pac-9dafa20a.md
- .agent_memory/packets/decision-before-you-edit-risk-page-must-explain-why-and-what-to-do-first-41b900df.md
- .agent_memory/packets/decision-daemon-rest-exposes-complete-agent-memory-operations-9b6072ac.md
- .agent_memory/packets/decision-memory-admission-includes-rationale-issues-and-code-explanations-668d52d3.md
- .agent_memory/packets/decision-memory-timeline-is-now-a-first-class-handoff-report-f285de3e.md
- .agent_memory/packets/decision-quick-code-indexing-defers-source-files-instead-of-silently-skipping-them-52888287.md
- .agent_memory/packets/decision-tree-sitter-tier-sits-between-ts-ast-and-regex-extraction-c31c8f33.md
- .agent_memory/packets/decision-updated-at-is-a-content-timestamp-change-memory-excludes-bookkeeping-fallback-re-78abd86b.md
- .agent_memory/packets/decision-v2-3-0-closed-the-trust-axis-vs-the-73-system-comparison-fbe27c37.md
- .agent_memory/packets/decision-website-docs-need-dark-docs-style-reference-and-viewer-backlinks-d51ff0ca.md
- .agent_memory/packets/runbook-runbook-tool-failed-cwd-users-kushaljain-code-kage-duration-ms-1911-effort-level-67b5a2e5.md
- .agent_memory/packets/workflow-change-memory-master-23634276.md

Diff summary:
```text
...hooks-carry-version-stamps-usage-telemetry-is-live--26defd1d.md | 2 +-
 ...aw-json-md-packets-auto-merge-gc-retention-ends-pac-9dafa20a.md | 2 +-
 ...dit-risk-page-must-explain-why-and-what-to-do-first-41b900df.md | 2 +-
 ...aemon-rest-exposes-complete-agent-memory-operations-9b6072ac.md | 2 +-
 ...ion-includes-rationale-issues-and-code-explanations-668d52d3.md | 2 +-
 ...memory-timeline-is-now-a-first-class-handoff-report-f285de3e.md | 2 +-
 ...fers-source-files-instead-of-silently-skipping-them-52888287.md | 2 +-
 ...itter-tier-sits-between-ts-ast-and-regex-extraction-c31c8f33.md | 2 +-
 ...tamp-change-memory-excludes-bookkeeping-fallback-re-78abd86b.md | 2 +-
 ...0-closed-the-trust-axis-vs-the-73-system-comparison-fbe27c37.md | 2 +-
 ...need-dark-docs-style-reference-and-viewer-backlinks-d51ff0ca.md | 2 +-
 ...-kushaljain-code-kage-duration-ms-1911-effort-level-67b5a2e5.md | 7 +++----
 .agent_memory/packets/workflow-change-memory-master-23634276.md    | 2 +-
 13 files changed, 15 insertions(+), 16 deletions(-)
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
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:workflow:change-memory-master","title":"Change memory: master","summary":"Repo-local context for 13 changed repo paths on master.","body":"Repo-local change memory generated from the current git diff.\n\nGoal: preserve the durable context another agent should receive when it works in this repo later.\n\nWhat changed:\n- .agent_memory/packets/bug_fix-anchors-are-code-identifiers-hooks-carry-version-stamps-usage-telemetry-is-live--26defd1d.md\n- .agent_memory/packets/bug_fix-merge-packet-sniffs-content-raw-json-md-packets-auto-merge-gc-retention-ends-pac-9dafa20a.md\n- .agent_memory/packets/decision-before-you-edit-risk-page-must-explain-why-and-what-to-do-first-41b900df.md\n- .agent_memory/packets/decision-daemon-rest-exposes-complete-agent-memory-operations-9b6072ac.md\n- .agent_memory/packets/decision-memory-admission-includes-rationale-issues-and-code-explanations-668d52d3.md\n- .agent_memory/packets/decision-memory-timeline-is-now-a-first-class-handoff-report-f285de3e.md\n- .agent_memory/packets/decision-quick-code-indexing-defers-source-files-instead-of-silently-skipping-them-52888287.md\n- .agent_memory/packets/decision-tree-sitter-tier-sits-between-ts-ast-and-regex-extraction-c31c8f33.md\n- .agent_memory/packets/decision-updated-at-is-a-content-timestamp-change-memory-excludes-bookkeeping-fallback-re-78abd86b.md\n- .agent_memory/packets/decision-v2-3-0-closed-the-trust-axis-vs-the-73-system-comparison-fbe27c37.md\n- .agent_memory/packets/decision-website-docs-need-dark-docs-style-reference-and-viewer-backlinks-d51ff0ca.md\n- .agent_memory/packets/runbook-runbook-tool-failed-cwd-users-kushaljain-code-kage-duration-ms-1911-effort-level-67b5a2e5.md\n- .agent_memory/packets/workflow-change-memory-master-23634276.md\n\nDiff summary:\n```text\n...hooks-carry-version-stamps-usage-telemetry-is-live--26defd1d.md | 2 +-\n ...aw-json-md-packets-auto-merge-gc-retention-ends-pac-9dafa20a.md | 2 +-\n ...dit-risk-page-must-explain-why-and-what-to-do-first-41b900df.md | 2 +-\n ...aemon-rest-exposes-complete-agent-memory-operations-9b6072ac.md | 2 +-\n ...ion-includes-rationale-issues-and-code-explanations-668d52d3.md | 2 +-\n ...memory-timeline-is-now-a-first-class-handoff-report-f285de3e.md | 2 +-\n ...fers-source-files-instead-of-silently-skipping-them-52888287.md | 2 +-\n ...itter-tier-sits-between-ts-ast-and-regex-extraction-c31c8f33.md | 2 +-\n ...tamp-change-memory-excludes-bookkeeping-fallback-re-78abd86b.md | 2 +-\n ...0-closed-the-trust-axis-vs-the-73-system-comparison-fbe27c37.md | 2 +-\n ...need-dark-docs-style-reference-and-viewer-backlinks-d51ff0ca.md | 2 +-\n ...-kushaljain-code-kage-duration-ms-1911-effort-level-67b5a2e5.md | 7 +++----\n .agent_memory/packets/workflow-change-memory-master-23634276.md    | 2 +-\n 13 files changed, 15 insertions(+), 16 deletions(-)\n```\n\nHow to verify:\n- Add the exact test, build, or manual verification command when you refine this memory.\n\nImprove this packet when more context is known:\n- The actual feature, fix, or refactor rationale.\n- Why the change was made, including relevant bugs, issues, decisions, and code explanations.\n- The package, API, command, or architectural pattern future agents should understand, verify, or reuse.\n- Any gotchas, follow-up risks, or branch-specific assumptions.\n\nPromote beyond this repo only after explicit org/global review.","type":"workflow","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.62,"tags":["change-memory","diff-proposal","repo-local","branch:master"],"paths":[".agent_memory/packets/bug_fix-anchors-are-code-identifiers-hooks-carry-version-stamps-usage-telemetry-is-live--26defd1d.md",".agent_memory/packets/bug_fix-merge-packet-sniffs-content-raw-json-md-packets-auto-merge-gc-retention-ends-pac-9dafa20a.md",".agent_memory/packets/decision-before-you-edit-risk-page-must-explain-why-and-what-to-do-first-41b900df.md",".agent_memory/packets/decision-daemon-rest-exposes-complete-agent-memory-operations-9b6072ac.md",".agent_memory/packets/decision-memory-admission-includes-rationale-issues-and-code-explanations-668d52d3.md",".agent_memory/packets/decision-memory-timeline-is-now-a-first-class-handoff-report-f285de3e.md",".agent_memory/packets/decision-quick-code-indexing-defers-source-files-instead-of-silently-skipping-them-52888287.md",".agent_memory/packets/decision-tree-sitter-tier-sits-between-ts-ast-and-regex-extraction-c31c8f33.md",".agent_memory/packets/decision-updated-at-is-a-content-timestamp-change-memory-excludes-bookkeeping-fallback-re-78abd86b.md",".agent_memory/packets/decision-v2-3-0-closed-the-trust-axis-vs-the-73-system-comparison-fbe27c37.md",".agent_memory/packets/decision-website-docs-need-dark-docs-style-reference-and-viewer-backlinks-d51ff0ca.md",".agent_memory/packets/runbook-runbook-tool-failed-cwd-users-kushaljain-code-kage-duration-ms-1911-effort-level-67b5a2e5.md",".agent_memory/packets/workflow-change-memory-master-23634276.md"],"stack":[],"source_refs":[{"kind":"git_diff","branch":"master","head":"f8a4f2917de7343383d404fa16e6d0dad6ed98cc","merge_base":"f8a4f2917de7343383d404fa16e6d0dad6ed98cc","changed_files":[".agent_memory/packets/bug_fix-anchors-are-code-identifiers-hooks-carry-version-stamps-usage-telemetry-is-live--26defd1d.md",".agent_memory/packets/bug_fix-merge-packet-sniffs-content-raw-json-md-packets-auto-merge-gc-retention-ends-pac-9dafa20a.md",".agent_memory/packets/decision-before-you-edit-risk-page-must-explain-why-and-what-to-do-first-41b900df.md",".agent_memory/packets/decision-daemon-rest-exposes-complete-agent-memory-operations-9b6072ac.md",".agent_memory/packets/decision-memory-admission-includes-rationale-issues-and-code-explanations-668d52d3.md",".agent_memory/packets/decision-memory-timeline-is-now-a-first-class-handoff-report-f285de3e.md",".agent_memory/packets/decision-quick-code-indexing-defers-source-files-instead-of-silently-skipping-them-52888287.md",".agent_memory/packets/decision-tree-sitter-tier-sits-between-ts-ast-and-regex-extraction-c31c8f33.md",".agent_memory/packets/decision-updated-at-is-a-content-timestamp-change-memory-excludes-bookkeeping-fallback-re-78abd86b.md",".agent_memory/packets/decision-v2-3-0-closed-the-trust-axis-vs-the-73-system-comparison-fbe27c37.md",".agent_memory/packets/decision-website-docs-need-dark-docs-style-reference-and-viewer-backlinks-d51ff0ca.md",".agent_memory/packets/runbook-runbook-tool-failed-cwd-users-kushaljain-code-kage-duration-ms-1911-effort-level-67b5a2e5.md",".agent_memory/packets/workflow-change-memory-master-23634276.md"],"summary_path":"/Users/kushaljain/code/Kage/.agent_memory/review/branch-summary-master.json"}],"context":{"fact":"Current branch master changes 13 repo paths.","why":"Branch change memory gives future agents durable context from the git diff when they continue, review, or verify this work.","trigger":"Recall when asking what changed on this branch, preparing a PR review, or resuming this work.","action":"Use the changed file list and diff summary as orientation, then inspect the actual diff and source files before making further edits.","verification":"Generated from git diff and refreshed by kage pr summarize or kage propose --from-diff.","risk_if_forgotten":"Future agents may repeat orientation work, miss branch-specific assumptions, or ignore files touched by this change.","stale_when":"The branch diff changes substantially, the branch is merged, or a newer change-memory packet supersedes it."},"freshness":{"last_verified_at":"2026-07-03T17:00:31.031Z","ttl_days":180,"path_fingerprints":[],"path_fingerprint_policy":"source_hash_staleness","verification":"git_diff"},"edges":[{"relation":"changes_path","to":"path:.agent_memory/packets/bug_fix-anchors-are-code-identifiers-hooks-carry-version-stamps-usage-telemetry-is-live--26defd1d.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/bug_fix-merge-packet-sniffs-content-raw-json-md-packets-auto-merge-gc-retention-ends-pac-9dafa20a.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-before-you-edit-risk-page-must-explain-why-and-what-to-do-first-41b900df.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-daemon-rest-exposes-complete-agent-memory-operations-9b6072ac.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-memory-admission-includes-rationale-issues-and-code-explanations-668d52d3.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-memory-timeline-is-now-a-first-class-handoff-report-f285de3e.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-quick-code-indexing-defers-source-files-instead-of-silently-skipping-them-52888287.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-tree-sitter-tier-sits-between-ts-ast-and-regex-extraction-c31c8f33.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-updated-at-is-a-content-timestamp-change-memory-excludes-bookkeeping-fallback-re-78abd86b.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-v2-3-0-closed-the-trust-axis-vs-the-73-system-comparison-fbe27c37.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-website-docs-need-dark-docs-style-reference-and-viewer-backlinks-d51ff0ca.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/runbook-runbook-tool-failed-cwd-users-kushaljain-code-kage-duration-ms-1911-effort-level-67b5a2e5.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/workflow-change-memory-master-23634276.md","evidence":"git_diff"}],"quality":{"score":82,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":["some referenced paths are missing: .agent_memory/packets/workflow-change-memory-master-23634276.md"],"duplicate_candidates":[],"stale_reasons":["some referenced paths are missing: .agent_memory/packets/workflow-change-memory-master-23634276.md"],"estimated_tokens_saved":796,"admission":{"admit":true,"class":"candidate","score":70,"reasons":["durable memory type","has provenance","repo scoped or path grounded","has durable trigger, rationale, issue context, or explanation","substantive enough to reuse"],"risks":[]},"candidate_kind":"change_memory","review_boundary":"git_or_pr","promotion_requires_review":true},"created_at":"2026-07-03T17:00:31.031Z","updated_at":"2026-07-03T17:00:31.031Z"}
```

