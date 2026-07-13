---
type: "Workflow"
title: "Change memory: codex/kage-vnext-implementation"
description: "Repo-local context for 4 changed repo paths on codex/kage-vnext-implementation."
resource: "mcp/vnext/protocol/index.ts"
tags: ["change-memory", "diff-proposal", "repo-local", "branch:codex-kage-vnext-implementation"]
timestamp: "2026-07-13T14:04:25.243Z"
x-kage-id: "repo:memory:workflow:change-memory-codex-kage-vnext-implementation"
x-kage-type: "workflow"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "verified"
x-kage-paths: ["mcp/vnext/protocol/index.ts", "mcp/vnext/protocol/protocol.test.ts", "mcp/vnext/protocol/types.ts", "mcp/vnext/protocol/validate.ts"]
---

# Change memory: codex/kage-vnext-implementation

> Repo-local context for 4 changed repo paths on codex/kage-vnext-implementation.

Repo-local change memory generated from the current git diff.

Goal: preserve the durable context another agent should receive when it works in this repo later.

What changed:
- mcp/vnext/protocol/index.ts
- mcp/vnext/protocol/protocol.test.ts
- mcp/vnext/protocol/types.ts
- mcp/vnext/protocol/validate.ts

Diff summary:
```text
.agent_memory/packets/gotcha-validate-iso-calendar-fields-before-date-parse-c675b1be.md | untracked
mcp/vnext/protocol/index.ts | untracked
mcp/vnext/protocol/protocol.test.ts | untracked
mcp/vnext/protocol/types.ts | untracked
mcp/vnext/protocol/validate.ts | untracked
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
{"schema_version":2,"id":"repo:memory:workflow:change-memory-codex-kage-vnext-implementation","title":"Change memory: codex/kage-vnext-implementation","summary":"Repo-local context for 4 changed repo paths on codex/kage-vnext-implementation.","body":"Repo-local change memory generated from the current git diff.\n\nGoal: preserve the durable context another agent should receive when it works in this repo later.\n\nWhat changed:\n- mcp/vnext/protocol/index.ts\n- mcp/vnext/protocol/protocol.test.ts\n- mcp/vnext/protocol/types.ts\n- mcp/vnext/protocol/validate.ts\n\nDiff summary:\n```text\n.agent_memory/packets/gotcha-validate-iso-calendar-fields-before-date-parse-c675b1be.md | untracked\nmcp/vnext/protocol/index.ts | untracked\nmcp/vnext/protocol/protocol.test.ts | untracked\nmcp/vnext/protocol/types.ts | untracked\nmcp/vnext/protocol/validate.ts | untracked\n```\n\nHow to verify:\n- Add the exact test, build, or manual verification command when you refine this memory.\n\nImprove this packet when more context is known:\n- The actual feature, fix, or refactor rationale.\n- Why the change was made, including relevant bugs, issues, decisions, and code explanations.\n- The package, API, command, or architectural pattern future agents should understand, verify, or reuse.\n- Any gotchas, follow-up risks, or branch-specific assumptions.\n\nPromote beyond this repo only after explicit org/global review.","type":"workflow","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.62,"tags":["change-memory","diff-proposal","repo-local","branch:codex-kage-vnext-implementation"],"paths":["mcp/vnext/protocol/index.ts","mcp/vnext/protocol/protocol.test.ts","mcp/vnext/protocol/types.ts","mcp/vnext/protocol/validate.ts"],"stack":[],"source_refs":[{"kind":"git_diff","branch":"codex/kage-vnext-implementation","head":"22278bea5c0c729c46edee75b7791c023d52289e","merge_base":"d3841066df412d29fbb5ba0a58c55566eb85974b","changed_files":[".agent_memory/packets/gotcha-validate-iso-calendar-fields-before-date-parse-c675b1be.md","mcp/vnext/protocol/index.ts","mcp/vnext/protocol/protocol.test.ts","mcp/vnext/protocol/types.ts","mcp/vnext/protocol/validate.ts"],"summary_path":".agent_memory/review/branch-summary-codex-kage-vnext-implementation.json"}],"context":{"fact":"Current branch codex/kage-vnext-implementation changes 4 repo paths.","why":"Branch change memory gives future agents durable context from the git diff when they continue, review, or verify this work.","trigger":"Recall when asking what changed on this branch, preparing a PR review, or resuming this work.","action":"Use the changed file list and diff summary as orientation, then inspect the actual diff and source files before making further edits.","verification":"Generated from git diff and refreshed by kage pr summarize or kage propose --from-diff.","risk_if_forgotten":"Future agents may repeat orientation work, miss branch-specific assumptions, or ignore files touched by this change.","stale_when":"The branch diff changes substantially, the branch is merged, or a newer change-memory packet supersedes it."},"freshness":{"last_verified_at":"2026-07-13T14:04:25.243Z","ttl_days":180,"path_fingerprints":[{"path":"mcp/vnext/protocol/index.ts","sha256":"d0961dbadd6b279d491d04bea20e8fe777c9278a641fe88b8f83eeb11942f9fa","size":59},{"path":"mcp/vnext/protocol/protocol.test.ts","sha256":"d9d6683e636a66b6bf2bd98727a779ab6974d545615cfc0bf573146d9c0a3762","size":5400},{"path":"mcp/vnext/protocol/types.ts","sha256":"510eff78df1cadd6564e8aad49dba60724a52b9af829a1948b3f62b606c40357","size":2882},{"path":"mcp/vnext/protocol/validate.ts","sha256":"b8436431b40064fb81aab8ad28d6064027f2f9fff97d38c5d2714e77068ade63","size":5188}],"path_fingerprint_policy":"source_hash_staleness","verification":"git_diff"},"edges":[{"relation":"changes_path","to":"path:.agent_memory/packets/gotcha-validate-iso-calendar-fields-before-date-parse-c675b1be.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/vnext/protocol/index.ts","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/vnext/protocol/protocol.test.ts","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/vnext/protocol/types.ts","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/vnext/protocol/validate.ts","evidence":"git_diff"}],"quality":{"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"stale_reasons":[],"estimated_tokens_saved":284,"admission":{"admit":true,"class":"candidate","score":70,"reasons":["durable memory type","has provenance","repo scoped or path grounded","has durable trigger, rationale, issue context, or explanation","substantive enough to reuse"],"risks":[]},"candidate_kind":"change_memory","review_boundary":"git_or_pr","promotion_requires_review":true},"created_at":"2026-07-13T14:04:25.243Z","updated_at":"2026-07-13T14:04:25.243Z"}
```
