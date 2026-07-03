---
type: "Workflow"
title: "Change memory: master"
description: "Repo-local context for 7 changed repo paths on master."
resource: ".agent_memory/packets/decision-code-index-inbox-and-benchmark-gates-harden-kage-handoff-quality-80fea58c.md"
tags: ["change-memory", "diff-proposal", "repo-local", "branch:master"]
timestamp: "2026-07-03T17:10:38.041Z"
x-kage-id: "repo:https-github-com-kage-core-kage:workflow:change-memory-master"
x-kage-type: "workflow"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "verified"
x-kage-paths: [".agent_memory/packets/decision-code-index-inbox-and-benchmark-gates-harden-kage-handoff-quality-80fea58c.md", ".agent_memory/packets/decision-kage-check-is-a-secondary-feature-the-core-product-is-the-agent-memory-loop-3651bfc8.md", ".agent_memory/packets/decision-mcp-exposes-setup-doctor-audits-44369c0c.md", ".agent_memory/packets/decision-memory-timeline-is-now-a-first-class-handoff-report-f285de3e.md", ".agent_memory/packets/decision-release-1-1-7-launch-readiness-alignment-78721468.md", ".agent_memory/packets/gotcha-npx-skills-add-copies-the-whole-repo-if-skill-md-is-at-root-9edc3476.md", ".agent_memory/packets/workflow-change-memory-master-23634276.md"]
---

# Change memory: master

> Repo-local context for 7 changed repo paths on master.

Repo-local change memory generated from the current git diff.

Goal: preserve the durable context another agent should receive when it works in this repo later.

What changed:
- .agent_memory/packets/decision-code-index-inbox-and-benchmark-gates-harden-kage-handoff-quality-80fea58c.md
- .agent_memory/packets/decision-kage-check-is-a-secondary-feature-the-core-product-is-the-agent-memory-loop-3651bfc8.md
- .agent_memory/packets/decision-mcp-exposes-setup-doctor-audits-44369c0c.md
- .agent_memory/packets/decision-memory-timeline-is-now-a-first-class-handoff-report-f285de3e.md
- .agent_memory/packets/decision-release-1-1-7-launch-readiness-alignment-78721468.md
- .agent_memory/packets/gotcha-npx-skills-add-copies-the-whole-repo-if-skill-md-is-at-root-9edc3476.md
- .agent_memory/packets/workflow-change-memory-master-23634276.md

Diff summary:
```text
...ex-inbox-and-benchmark-gates-harden-kage-handoff-quality-80fea58c.md | 2 +-
 ...ondary-feature-the-core-product-is-the-agent-memory-loop-3651bfc8.md | 2 +-
 .../packets/decision-mcp-exposes-setup-doctor-audits-44369c0c.md        | 2 +-
 ...sion-memory-timeline-is-now-a-first-class-handoff-report-f285de3e.md | 2 +-
 .../decision-release-1-1-7-launch-readiness-alignment-78721468.md       | 2 +-
 ...-skills-add-copies-the-whole-repo-if-skill-md-is-at-root-9edc3476.md | 2 +-
 .agent_memory/packets/workflow-change-memory-master-23634276.md         | 2 +-
 7 files changed, 7 insertions(+), 7 deletions(-)
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
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:workflow:change-memory-master","title":"Change memory: master","summary":"Repo-local context for 7 changed repo paths on master.","body":"Repo-local change memory generated from the current git diff.\n\nGoal: preserve the durable context another agent should receive when it works in this repo later.\n\nWhat changed:\n- .agent_memory/packets/decision-code-index-inbox-and-benchmark-gates-harden-kage-handoff-quality-80fea58c.md\n- .agent_memory/packets/decision-kage-check-is-a-secondary-feature-the-core-product-is-the-agent-memory-loop-3651bfc8.md\n- .agent_memory/packets/decision-mcp-exposes-setup-doctor-audits-44369c0c.md\n- .agent_memory/packets/decision-memory-timeline-is-now-a-first-class-handoff-report-f285de3e.md\n- .agent_memory/packets/decision-release-1-1-7-launch-readiness-alignment-78721468.md\n- .agent_memory/packets/gotcha-npx-skills-add-copies-the-whole-repo-if-skill-md-is-at-root-9edc3476.md\n- .agent_memory/packets/workflow-change-memory-master-23634276.md\n\nDiff summary:\n```text\n...ex-inbox-and-benchmark-gates-harden-kage-handoff-quality-80fea58c.md | 2 +-\n ...ondary-feature-the-core-product-is-the-agent-memory-loop-3651bfc8.md | 2 +-\n .../packets/decision-mcp-exposes-setup-doctor-audits-44369c0c.md        | 2 +-\n ...sion-memory-timeline-is-now-a-first-class-handoff-report-f285de3e.md | 2 +-\n .../decision-release-1-1-7-launch-readiness-alignment-78721468.md       | 2 +-\n ...-skills-add-copies-the-whole-repo-if-skill-md-is-at-root-9edc3476.md | 2 +-\n .agent_memory/packets/workflow-change-memory-master-23634276.md         | 2 +-\n 7 files changed, 7 insertions(+), 7 deletions(-)\n```\n\nHow to verify:\n- Add the exact test, build, or manual verification command when you refine this memory.\n\nImprove this packet when more context is known:\n- The actual feature, fix, or refactor rationale.\n- Why the change was made, including relevant bugs, issues, decisions, and code explanations.\n- The package, API, command, or architectural pattern future agents should understand, verify, or reuse.\n- Any gotchas, follow-up risks, or branch-specific assumptions.\n\nPromote beyond this repo only after explicit org/global review.","type":"workflow","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.62,"tags":["change-memory","diff-proposal","repo-local","branch:master"],"paths":[".agent_memory/packets/decision-code-index-inbox-and-benchmark-gates-harden-kage-handoff-quality-80fea58c.md",".agent_memory/packets/decision-kage-check-is-a-secondary-feature-the-core-product-is-the-agent-memory-loop-3651bfc8.md",".agent_memory/packets/decision-mcp-exposes-setup-doctor-audits-44369c0c.md",".agent_memory/packets/decision-memory-timeline-is-now-a-first-class-handoff-report-f285de3e.md",".agent_memory/packets/decision-release-1-1-7-launch-readiness-alignment-78721468.md",".agent_memory/packets/gotcha-npx-skills-add-copies-the-whole-repo-if-skill-md-is-at-root-9edc3476.md",".agent_memory/packets/workflow-change-memory-master-23634276.md"],"stack":[],"source_refs":[{"kind":"git_diff","branch":"master","head":"368b0494699063b63870fa7f92ae1fd5a276fba6","merge_base":"051192672c39bc61bf6147f6d1b04b62c9d02a90","changed_files":[".agent_memory/packets/decision-code-index-inbox-and-benchmark-gates-harden-kage-handoff-quality-80fea58c.md",".agent_memory/packets/decision-kage-check-is-a-secondary-feature-the-core-product-is-the-agent-memory-loop-3651bfc8.md",".agent_memory/packets/decision-mcp-exposes-setup-doctor-audits-44369c0c.md",".agent_memory/packets/decision-memory-timeline-is-now-a-first-class-handoff-report-f285de3e.md",".agent_memory/packets/decision-release-1-1-7-launch-readiness-alignment-78721468.md",".agent_memory/packets/gotcha-npx-skills-add-copies-the-whole-repo-if-skill-md-is-at-root-9edc3476.md",".agent_memory/packets/workflow-change-memory-master-23634276.md"],"summary_path":"/Users/kushaljain/code/Kage/.agent_memory/review/branch-summary-master.json"}],"context":{"fact":"Current branch master changes 7 repo paths.","why":"Branch change memory gives future agents durable context from the git diff when they continue, review, or verify this work.","trigger":"Recall when asking what changed on this branch, preparing a PR review, or resuming this work.","action":"Use the changed file list and diff summary as orientation, then inspect the actual diff and source files before making further edits.","verification":"Generated from git diff and refreshed by kage pr summarize or kage propose --from-diff.","risk_if_forgotten":"Future agents may repeat orientation work, miss branch-specific assumptions, or ignore files touched by this change.","stale_when":"The branch diff changes substantially, the branch is merged, or a newer change-memory packet supersedes it."},"freshness":{"last_verified_at":"2026-07-03T17:10:38.041Z","ttl_days":180,"path_fingerprints":[],"path_fingerprint_policy":"source_hash_staleness","verification":"git_diff"},"edges":[{"relation":"changes_path","to":"path:.agent_memory/packets/decision-code-index-inbox-and-benchmark-gates-harden-kage-handoff-quality-80fea58c.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-kage-check-is-a-secondary-feature-the-core-product-is-the-agent-memory-loop-3651bfc8.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-mcp-exposes-setup-doctor-audits-44369c0c.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-memory-timeline-is-now-a-first-class-handoff-report-f285de3e.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-release-1-1-7-launch-readiness-alignment-78721468.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/gotcha-npx-skills-add-copies-the-whole-repo-if-skill-md-is-at-root-9edc3476.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/workflow-change-memory-master-23634276.md","evidence":"git_diff"}],"quality":{"score":82,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":["some referenced paths are missing: .agent_memory/packets/workflow-change-memory-master-23634276.md"],"duplicate_candidates":[],"stale_reasons":["some referenced paths are missing: .agent_memory/packets/workflow-change-memory-master-23634276.md"],"estimated_tokens_saved":501,"admission":{"admit":true,"class":"candidate","score":70,"reasons":["durable memory type","has provenance","repo scoped or path grounded","has durable trigger, rationale, issue context, or explanation","substantive enough to reuse"],"risks":[]},"candidate_kind":"change_memory","review_boundary":"git_or_pr","promotion_requires_review":true},"created_at":"2026-07-03T17:10:38.041Z","updated_at":"2026-07-03T17:10:38.041Z"}
```

