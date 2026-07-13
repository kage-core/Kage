---
type: "Workflow"
title: "Change memory: codex/kage-vnext-design"
description: "Repo-local context for 1 changed repo path on codex/kage-vnext-design."
resource: "docs/superpowers/specs/2026-07-13-kage-collaborative-repository-intelligence-design.md"
tags: ["change-memory", "diff-proposal", "repo-local", "branch:codex-kage-vnext-design"]
timestamp: "2026-07-13T12:04:43.723Z"
x-kage-id: "repo:https-github-com-kage-core-kage:workflow:change-memory-codex-kage-vnext-design"
x-kage-type: "workflow"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "verified"
x-kage-paths: ["docs/superpowers/specs/2026-07-13-kage-collaborative-repository-intelligence-design.md"]
---

# Change memory: codex/kage-vnext-design

> Repo-local context for 1 changed repo path on codex/kage-vnext-design.

Repo-local change memory generated from the current git diff.

Goal: preserve the durable context another agent should receive when it works in this repo later.

What changed:
- docs/superpowers/specs/2026-07-13-kage-collaborative-repository-intelligence-design.md

Diff summary:
```text
...pository-intelligence-with-automatic-cost-controll-f468cc04.md | 5 +++--
 .../workflow-change-memory-codex-kage-vnext-design-ec2b3483.md    | 1 -
 ...026-07-13-kage-collaborative-repository-intelligence-design.md | 8 +++++---
 3 files changed, 8 insertions(+), 6 deletions(-)
...igence-with-automatic-cost-controll-f468cc04.md |   40 +
 ...ange-memory-codex-kage-vnext-design-ec2b3483.md |   81 ++
 ...collaborative-repository-intelligence-design.md | 1188 ++++++++++++++++++++
 3 files changed, 1309 insertions(+)
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
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:workflow:change-memory-codex-kage-vnext-design","title":"Change memory: codex/kage-vnext-design","summary":"Repo-local context for 1 changed repo path on codex/kage-vnext-design.","body":"Repo-local change memory generated from the current git diff.\n\nGoal: preserve the durable context another agent should receive when it works in this repo later.\n\nWhat changed:\n- docs/superpowers/specs/2026-07-13-kage-collaborative-repository-intelligence-design.md\n\nDiff summary:\n```text\n...pository-intelligence-with-automatic-cost-controll-f468cc04.md | 5 +++--\n .../workflow-change-memory-codex-kage-vnext-design-ec2b3483.md    | 1 -\n ...026-07-13-kage-collaborative-repository-intelligence-design.md | 8 +++++---\n 3 files changed, 8 insertions(+), 6 deletions(-)\n...igence-with-automatic-cost-controll-f468cc04.md |   40 +\n ...ange-memory-codex-kage-vnext-design-ec2b3483.md |   81 ++\n ...collaborative-repository-intelligence-design.md | 1188 ++++++++++++++++++++\n 3 files changed, 1309 insertions(+)\n```\n\nHow to verify:\n- Add the exact test, build, or manual verification command when you refine this memory.\n\nImprove this packet when more context is known:\n- The actual feature, fix, or refactor rationale.\n- Why the change was made, including relevant bugs, issues, decisions, and code explanations.\n- The package, API, command, or architectural pattern future agents should understand, verify, or reuse.\n- Any gotchas, follow-up risks, or branch-specific assumptions.\n\nPromote beyond this repo only after explicit org/global review.","type":"workflow","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.62,"tags":["change-memory","diff-proposal","repo-local","branch:codex-kage-vnext-design"],"paths":["docs/superpowers/specs/2026-07-13-kage-collaborative-repository-intelligence-design.md"],"stack":[],"source_refs":[{"kind":"git_diff","branch":"codex/kage-vnext-design","head":"d3841066df412d29fbb5ba0a58c55566eb85974b","merge_base":"d3841066df412d29fbb5ba0a58c55566eb85974b","changed_files":[".agent_memory/packets/decision-kage-vnext-is-collaborative-repository-intelligence-with-automatic-cost-controll-f468cc04.md",".agent_memory/packets/workflow-change-memory-codex-kage-vnext-design-ec2b3483.md","docs/superpowers/specs/2026-07-13-kage-collaborative-repository-intelligence-design.md"],"summary_path":"/Users/kushaljain/code/Kage/.agent_memory/review/branch-summary-codex-kage-vnext-design.json"}],"context":{"fact":"Current branch codex/kage-vnext-design changes 1 repo path.","why":"Branch change memory gives future agents durable context from the git diff when they continue, review, or verify this work.","trigger":"Recall when asking what changed on this branch, preparing a PR review, or resuming this work.","action":"Use the changed file list and diff summary as orientation, then inspect the actual diff and source files before making further edits.","verification":"Generated from git diff and refreshed by kage pr summarize or kage propose --from-diff.","risk_if_forgotten":"Future agents may repeat orientation work, miss branch-specific assumptions, or ignore files touched by this change.","stale_when":"The branch diff changes substantially, the branch is merged, or a newer change-memory packet supersedes it."},"freshness":{"last_verified_at":"2026-07-13T12:04:43.723Z","ttl_days":180,"path_fingerprints":[{"path":"docs/superpowers/specs/2026-07-13-kage-collaborative-repository-intelligence-design.md","sha256":"48b5f21d6566ac58f255e9a32ab5b23c7389a749a54b22d93c240c7c81182cfb","size":52045}],"path_fingerprint_policy":"source_hash_staleness","verification":"git_diff"},"edges":[{"relation":"changes_path","to":"path:.agent_memory/packets/decision-kage-vnext-is-collaborative-repository-intelligence-with-automatic-cost-controll-f468cc04.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/workflow-change-memory-codex-kage-vnext-design-ec2b3483.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:docs/superpowers/specs/2026-07-13-kage-collaborative-repository-intelligence-design.md","evidence":"git_diff"}],"quality":{"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"stale_reasons":[],"estimated_tokens_saved":336,"admission":{"admit":true,"class":"candidate","score":70,"reasons":["durable memory type","has provenance","repo scoped or path grounded","has durable trigger, rationale, issue context, or explanation","substantive enough to reuse"],"risks":[]},"candidate_kind":"change_memory","review_boundary":"git_or_pr","promotion_requires_review":true},"created_at":"2026-07-13T12:04:43.723Z","updated_at":"2026-07-13T12:04:43.723Z"}
```
