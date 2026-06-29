---
type: "Workflow"
title: "Change memory: master"
description: "Repo-local context for 3 changed repo paths on master."
resource: ".agent_memory/packets/reference-resume-check-the-kage-cruft-audit-workflow-waz60b5tm-results-and-clean-up-any-co-94be1866.md"
tags: ["change-memory", "diff-proposal", "repo-local", "branch:master"]
timestamp: "2026-06-29T11:58:59.809Z"
x-kage-id: "repo:https-github-com-kage-core-kage:workflow:change-memory-master"
x-kage-type: "workflow"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.62
x-kage-verified: "verified"
x-kage-paths: [".agent_memory/packets/reference-resume-check-the-kage-cruft-audit-workflow-waz60b5tm-results-and-clean-up-any-co-94be1866.md", ".agent_memory/packets/runbook-runbook-tool-failed-agent-id-aabb588487110367c-agent-type-explore-cwd-users-kush-352e5335.md", ".agent_memory/packets/workflow-change-memory-master-23634276.md"]
---

# Change memory: master

> Repo-local context for 3 changed repo paths on master.

Repo-local change memory generated from the current git diff.

Goal: preserve the durable context another agent should receive when it works in this repo later.

What changed:
- .agent_memory/packets/reference-resume-check-the-kage-cruft-audit-workflow-waz60b5tm-results-and-clean-up-any-co-94be1866.md
- .agent_memory/packets/runbook-runbook-tool-failed-agent-id-aabb588487110367c-agent-type-explore-cwd-users-kush-352e5335.md
- .agent_memory/packets/workflow-change-memory-master-23634276.md

Diff summary:
```text
...id-aabb588487110367c-agent-type-explore-cwd-users-kush-352e5335.md | 4 ++--
 .agent_memory/packets/workflow-change-memory-master-23634276.md       | 2 +-
 2 files changed, 3 insertions(+), 3 deletions(-)
.agent_memory/packets/reference-resume-check-the-kage-cruft-audit-workflow-waz60b5tm-results-and-clean-up-any-co-94be1866.md | untracked
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
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:workflow:change-memory-master","title":"Change memory: master","summary":"Repo-local context for 3 changed repo paths on master.","body":"Repo-local change memory generated from the current git diff.\n\nGoal: preserve the durable context another agent should receive when it works in this repo later.\n\nWhat changed:\n- .agent_memory/packets/reference-resume-check-the-kage-cruft-audit-workflow-waz60b5tm-results-and-clean-up-any-co-94be1866.md\n- .agent_memory/packets/runbook-runbook-tool-failed-agent-id-aabb588487110367c-agent-type-explore-cwd-users-kush-352e5335.md\n- .agent_memory/packets/workflow-change-memory-master-23634276.md\n\nDiff summary:\n```text\n...id-aabb588487110367c-agent-type-explore-cwd-users-kush-352e5335.md | 4 ++--\n .agent_memory/packets/workflow-change-memory-master-23634276.md       | 2 +-\n 2 files changed, 3 insertions(+), 3 deletions(-)\n.agent_memory/packets/reference-resume-check-the-kage-cruft-audit-workflow-waz60b5tm-results-and-clean-up-any-co-94be1866.md | untracked\n```\n\nHow to verify:\n- Add the exact test, build, or manual verification command when you refine this memory.\n\nImprove this packet when more context is known:\n- The actual feature, fix, or refactor rationale.\n- Why the change was made, including relevant bugs, issues, decisions, and code explanations.\n- The package, API, command, or architectural pattern future agents should understand, verify, or reuse.\n- Any gotchas, follow-up risks, or branch-specific assumptions.\n\nPromote beyond this repo only after explicit org/global review.","type":"workflow","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.62,"tags":["change-memory","diff-proposal","repo-local","branch:master"],"paths":[".agent_memory/packets/reference-resume-check-the-kage-cruft-audit-workflow-waz60b5tm-results-and-clean-up-any-co-94be1866.md",".agent_memory/packets/runbook-runbook-tool-failed-agent-id-aabb588487110367c-agent-type-explore-cwd-users-kush-352e5335.md",".agent_memory/packets/workflow-change-memory-master-23634276.md"],"stack":[],"source_refs":[{"kind":"git_diff","branch":"master","head":"3af7d9cc24b534ff910cffb5c797d7f9905aeee1","merge_base":"3af7d9cc24b534ff910cffb5c797d7f9905aeee1","changed_files":[".agent_memory/packets/reference-resume-check-the-kage-cruft-audit-workflow-waz60b5tm-results-and-clean-up-any-co-94be1866.md",".agent_memory/packets/runbook-runbook-tool-failed-agent-id-aabb588487110367c-agent-type-explore-cwd-users-kush-352e5335.md",".agent_memory/packets/workflow-change-memory-master-23634276.md"],"summary_path":"/Users/kushaljain/code/Kage/.agent_memory/review/branch-summary-master.json"}],"context":{"fact":"Current branch master changes 3 repo paths.","why":"Branch change memory gives future agents durable context from the git diff when they continue, review, or verify this work.","trigger":"Recall when asking what changed on this branch, preparing a PR review, or resuming this work.","action":"Use the changed file list and diff summary as orientation, then inspect the actual diff and source files before making further edits.","verification":"Generated from git diff and refreshed by kage pr summarize or kage propose --from-diff.","risk_if_forgotten":"Future agents may repeat orientation work, miss branch-specific assumptions, or ignore files touched by this change.","stale_when":"The branch diff changes substantially, the branch is merged, or a newer change-memory packet supersedes it."},"freshness":{"last_verified_at":"2026-06-29T11:58:59.809Z","ttl_days":180,"path_fingerprints":[],"path_fingerprint_policy":"source_hash_staleness","verification":"git_diff"},"edges":[{"relation":"changes_path","to":"path:.agent_memory/packets/reference-resume-check-the-kage-cruft-audit-workflow-waz60b5tm-results-and-clean-up-any-co-94be1866.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/runbook-runbook-tool-failed-agent-id-aabb588487110367c-agent-type-explore-cwd-users-kush-352e5335.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/workflow-change-memory-master-23634276.md","evidence":"git_diff"}],"quality":{"score":82,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":["some referenced paths are missing: .agent_memory/packets/workflow-change-memory-master-23634276.md"],"duplicate_candidates":[],"stale_reasons":["some referenced paths are missing: .agent_memory/packets/workflow-change-memory-master-23634276.md"],"estimated_tokens_saved":349,"admission":{"admit":true,"class":"candidate","score":70,"reasons":["durable memory type","has provenance","repo scoped or path grounded","has durable trigger, rationale, issue context, or explanation","substantive enough to reuse"],"risks":[]},"candidate_kind":"change_memory","review_boundary":"git_or_pr","promotion_requires_review":true},"created_at":"2026-06-29T11:58:59.809Z","updated_at":"2026-06-29T11:58:59.809Z"}
```

