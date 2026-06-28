---
type: "Workflow"
title: "Change memory: master"
description: "Repo-local context for 10 changed repo paths on master."
resource: ".agent_memory/packets/decision-pivot-decision-kage-probe-deterministic-blast-radius-pr-gate-38f374f2.json"
tags: ["change-memory", "diff-proposal", "repo-local", "branch:master"]
timestamp: "2026-06-28T18:41:33.347Z"
x-kage-id: "repo:https-github-com-kage-core-kage:workflow:change-memory-master"
x-kage-type: "workflow"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.62
x-kage-verified: "verified"
x-kage-paths: [".agent_memory/packets/decision-pivot-decision-kage-probe-deterministic-blast-radius-pr-gate-38f374f2.json", ".agent_memory/packets/decision-pivot-decision-kage-the-verification-freshness-layer-for-google-okf-3a63db1f.json", ".agent_memory/packets/workflow-change-memory-master-23634276.json", "AGENTS.md", "AGENT_MEMORY_RESEARCH.md", "CLAUDE.md", "NO_STORE_MEMORY.md", "OKF_PIVOT.md", "PIVOT.md", "card.svg"]
---

# Change memory: master

> Repo-local context for 10 changed repo paths on master.

Repo-local change memory generated from the current git diff.

Goal: preserve the durable context another agent should receive when it works in this repo later.

What changed:
- .agent_memory/packets/decision-pivot-decision-kage-probe-deterministic-blast-radius-pr-gate-38f374f2.json
- .agent_memory/packets/decision-pivot-decision-kage-the-verification-freshness-layer-for-google-okf-3a63db1f.json
- .agent_memory/packets/workflow-change-memory-master-23634276.json
- AGENTS.md
- AGENT_MEMORY_RESEARCH.md
- CLAUDE.md
- NO_STORE_MEMORY.md
- OKF_PIVOT.md
- PIVOT.md
- card.svg

Diff summary:
```text
.../workflow-change-memory-master-23634276.json    | 79 ++++++++++++++++++----
 AGENTS.md                                          | 27 ++++++--
 CLAUDE.md                                          | 27 ++++++--
 3 files changed, 113 insertions(+), 20 deletions(-)
.agent_memory/packets/decision-pivot-decision-kage-probe-deterministic-blast-radius-pr-gate-38f374f2.json | untracked
.agent_memory/packets/decision-pivot-decision-kage-the-verification-freshness-layer-for-google-okf-3a63db1f.json | untracked
AGENT_MEMORY_RESEARCH.md | untracked
NO_STORE_MEMORY.md | untracked
OKF_PIVOT.md | untracked
PIVOT.md | untracked
card.svg | untracked
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
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:workflow:change-memory-master","title":"Change memory: master","summary":"Repo-local context for 10 changed repo paths on master.","body":"Repo-local change memory generated from the current git diff.\n\nGoal: preserve the durable context another agent should receive when it works in this repo later.\n\nWhat changed:\n- .agent_memory/packets/decision-pivot-decision-kage-probe-deterministic-blast-radius-pr-gate-38f374f2.json\n- .agent_memory/packets/decision-pivot-decision-kage-the-verification-freshness-layer-for-google-okf-3a63db1f.json\n- .agent_memory/packets/workflow-change-memory-master-23634276.json\n- AGENTS.md\n- AGENT_MEMORY_RESEARCH.md\n- CLAUDE.md\n- NO_STORE_MEMORY.md\n- OKF_PIVOT.md\n- PIVOT.md\n- card.svg\n\nDiff summary:\n```text\n.../workflow-change-memory-master-23634276.json    | 79 ++++++++++++++++++----\n AGENTS.md                                          | 27 ++++++--\n CLAUDE.md                                          | 27 ++++++--\n 3 files changed, 113 insertions(+), 20 deletions(-)\n.agent_memory/packets/decision-pivot-decision-kage-probe-deterministic-blast-radius-pr-gate-38f374f2.json | untracked\n.agent_memory/packets/decision-pivot-decision-kage-the-verification-freshness-layer-for-google-okf-3a63db1f.json | untracked\nAGENT_MEMORY_RESEARCH.md | untracked\nNO_STORE_MEMORY.md | untracked\nOKF_PIVOT.md | untracked\nPIVOT.md | untracked\ncard.svg | untracked\n```\n\nHow to verify:\n- Add the exact test, build, or manual verification command when you refine this memory.\n\nImprove this packet when more context is known:\n- The actual feature, fix, or refactor rationale.\n- Why the change was made, including relevant bugs, issues, decisions, and code explanations.\n- The package, API, command, or architectural pattern future agents should understand, verify, or reuse.\n- Any gotchas, follow-up risks, or branch-specific assumptions.\n\nPromote beyond this repo only after explicit org/global review.","type":"workflow","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.62,"tags":["change-memory","diff-proposal","repo-local","branch:master"],"paths":[".agent_memory/packets/decision-pivot-decision-kage-probe-deterministic-blast-radius-pr-gate-38f374f2.json",".agent_memory/packets/decision-pivot-decision-kage-the-verification-freshness-layer-for-google-okf-3a63db1f.json",".agent_memory/packets/workflow-change-memory-master-23634276.json","AGENTS.md","AGENT_MEMORY_RESEARCH.md","CLAUDE.md","NO_STORE_MEMORY.md","OKF_PIVOT.md","PIVOT.md","card.svg"],"stack":[],"source_refs":[{"kind":"git_diff","branch":"master","head":"e96fba2b4051c3d668590334be558eda987d9b40","merge_base":"e96fba2b4051c3d668590334be558eda987d9b40","changed_files":[".agent_memory/packets/decision-pivot-decision-kage-probe-deterministic-blast-radius-pr-gate-38f374f2.json",".agent_memory/packets/decision-pivot-decision-kage-the-verification-freshness-layer-for-google-okf-3a63db1f.json",".agent_memory/packets/workflow-change-memory-master-23634276.json","AGENTS.md","AGENT_MEMORY_RESEARCH.md","CLAUDE.md","NO_STORE_MEMORY.md","OKF_PIVOT.md","PIVOT.md","card.svg"],"summary_path":"/Users/kushaljain/code/Kage/.agent_memory/review/branch-summary-master.json"}],"context":{"fact":"Current branch master changes 10 repo paths.","why":"Branch change memory gives future agents durable context from the git diff when they continue, review, or verify this work.","trigger":"Recall when asking what changed on this branch, preparing a PR review, or resuming this work.","action":"Use the changed file list and diff summary as orientation, then inspect the actual diff and source files before making further edits.","verification":"Generated from git diff and refreshed by kage pr summarize or kage propose --from-diff.","risk_if_forgotten":"Future agents may repeat orientation work, miss branch-specific assumptions, or ignore files touched by this change.","stale_when":"The branch diff changes substantially, the branch is merged, or a newer change-memory packet supersedes it."},"freshness":{"last_verified_at":"2026-06-28T18:41:33.347Z","ttl_days":180,"path_fingerprints":[{"path":"AGENTS.md","sha256":"864f8c3fab570becc84b6988a18df1911da5b92d9f67ee05dae2c149c3347ad0","size":4579},{"path":"AGENT_MEMORY_RESEARCH.md","sha256":"27209c4ed88f6cf72b2d7d096d8d5582106e338baf4eb1b147438fd39594327f","size":28947},{"path":"CLAUDE.md","sha256":"864f8c3fab570becc84b6988a18df1911da5b92d9f67ee05dae2c149c3347ad0","size":4579},{"path":"NO_STORE_MEMORY.md","sha256":"c29a5f839f82c04572e24981a0fea1e5d3eb025be7e601986499303f46d7b3e7","size":28343},{"path":"OKF_PIVOT.md","sha256":"43b6fbdbb8e98c9fc1962cc55bd1047e75f885918f3061821b400dc59360f013","size":40983},{"path":"PIVOT.md","sha256":"42d72687fa4247998021015b5cb29bc1964c75d8e91eddd863b467cd2b5fe1c5","size":27166},{"path":"card.svg","sha256":"529efa20b494ac970b4ff2406abf3cecbb6f7311e75ee9c287942befe30f70ff","size":3885}],"path_fingerprint_policy":"source_hash_staleness","verification":"git_diff"},"edges":[{"relation":"changes_path","to":"path:.agent_memory/packets/decision-pivot-decision-kage-probe-deterministic-blast-radius-pr-gate-38f374f2.json","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-pivot-decision-kage-the-verification-freshness-layer-for-google-okf-3a63db1f.json","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/workflow-change-memory-master-23634276.json","evidence":"git_diff"},{"relation":"changes_path","to":"path:AGENTS.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:AGENT_MEMORY_RESEARCH.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:CLAUDE.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:NO_STORE_MEMORY.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:OKF_PIVOT.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:PIVOT.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:card.svg","evidence":"git_diff"}],"quality":{"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"stale_reasons":[],"estimated_tokens_saved":444,"admission":{"admit":true,"class":"candidate","score":70,"reasons":["durable memory type","has provenance","repo scoped or path grounded","has durable trigger, rationale, issue context, or explanation","substantive enough to reuse"],"risks":[]},"candidate_kind":"change_memory","review_boundary":"git_or_pr","promotion_requires_review":true},"created_at":"2026-06-28T18:41:33.347Z","updated_at":"2026-06-28T18:41:33.347Z"}
```

