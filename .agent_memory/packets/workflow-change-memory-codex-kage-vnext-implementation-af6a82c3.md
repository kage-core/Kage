---
type: "Workflow"
title: "Change memory: codex/kage-vnext-implementation"
description: "Repo-local context for 10 changed repo paths on codex/kage-vnext-implementation."
resource: "docs/integrations/agent-surface-capabilities.md"
tags: ["change-memory", "diff-proposal", "repo-local", "branch:codex-kage-vnext-implementation"]
timestamp: "2026-07-18T10:41:24.621Z"
x-kage-id: "repo:kage-vnext-implementation:workflow:change-memory-codex-kage-vnext-implementation"
x-kage-type: "workflow"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "verified"
x-kage-paths: ["docs/integrations/agent-surface-capabilities.md", "mcp/kernel.test.ts", "mcp/kernel.ts", "mcp/vnext/adapters/capability-matrix.ts", "mcp/vnext/adapters/codex-otel.ts", "mcp/vnext/adapters/cursor-hooks.ts", "mcp/vnext/adapters/surface-certification.test.ts", "plugin/codex/otel-config.toml", "plugin/cursor/hooks.json", "plugin/cursor/kage-hook.sh"]
---

# Change memory: codex/kage-vnext-implementation

> Repo-local context for 10 changed repo paths on codex/kage-vnext-implementation.

Repo-local change memory generated from the current git diff.

Goal: preserve the durable context another agent should receive when it works in this repo later.

What changed:
- docs/integrations/agent-surface-capabilities.md
- mcp/kernel.test.ts
- mcp/kernel.ts
- mcp/vnext/adapters/capability-matrix.ts
- mcp/vnext/adapters/codex-otel.ts
- mcp/vnext/adapters/cursor-hooks.ts
- mcp/vnext/adapters/surface-certification.test.ts
- plugin/codex/otel-config.toml
- plugin/cursor/hooks.json
- plugin/cursor/kage-hook.sh

Diff summary:
```text
mcp/kernel.test.ts | 81 ++++++++++++++++++++++++++++++++++++++++++++++++++++++
 mcp/kernel.ts      | 75 ++++++++++++++++++++++++++++++++++++++++++++++++++
 2 files changed, 156 insertions(+)
docs/integrations/agent-surface-capabilities.md | untracked
mcp/vnext/adapters/capability-matrix.ts | untracked
mcp/vnext/adapters/codex-otel.ts | untracked
mcp/vnext/adapters/cursor-hooks.ts | untracked
mcp/vnext/adapters/surface-certification.test.ts | untracked
plugin/codex/otel-config.toml | untracked
plugin/cursor/hooks.json | untracked
plugin/cursor/kage-hook.sh | untracked
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
{"schema_version":2,"id":"repo:kage-vnext-implementation:workflow:change-memory-codex-kage-vnext-implementation","title":"Change memory: codex/kage-vnext-implementation","summary":"Repo-local context for 10 changed repo paths on codex/kage-vnext-implementation.","body":"Repo-local change memory generated from the current git diff.\n\nGoal: preserve the durable context another agent should receive when it works in this repo later.\n\nWhat changed:\n- docs/integrations/agent-surface-capabilities.md\n- mcp/kernel.test.ts\n- mcp/kernel.ts\n- mcp/vnext/adapters/capability-matrix.ts\n- mcp/vnext/adapters/codex-otel.ts\n- mcp/vnext/adapters/cursor-hooks.ts\n- mcp/vnext/adapters/surface-certification.test.ts\n- plugin/codex/otel-config.toml\n- plugin/cursor/hooks.json\n- plugin/cursor/kage-hook.sh\n\nDiff summary:\n```text\nmcp/kernel.test.ts | 81 ++++++++++++++++++++++++++++++++++++++++++++++++++++++\n mcp/kernel.ts      | 75 ++++++++++++++++++++++++++++++++++++++++++++++++++\n 2 files changed, 156 insertions(+)\ndocs/integrations/agent-surface-capabilities.md | untracked\nmcp/vnext/adapters/capability-matrix.ts | untracked\nmcp/vnext/adapters/codex-otel.ts | untracked\nmcp/vnext/adapters/cursor-hooks.ts | untracked\nmcp/vnext/adapters/surface-certification.test.ts | untracked\nplugin/codex/otel-config.toml | untracked\nplugin/cursor/hooks.json | untracked\nplugin/cursor/kage-hook.sh | untracked\n```\n\nHow to verify:\n- Add the exact test, build, or manual verification command when you refine this memory.\n\nImprove this packet when more context is known:\n- The actual feature, fix, or refactor rationale.\n- Why the change was made, including relevant bugs, issues, decisions, and code explanations.\n- The package, API, command, or architectural pattern future agents should understand, verify, or reuse.\n- Any gotchas, follow-up risks, or branch-specific assumptions.\n\nPromote beyond this repo only after explicit org/global review.","type":"workflow","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.62,"tags":["change-memory","diff-proposal","repo-local","branch:codex-kage-vnext-implementation"],"paths":["docs/integrations/agent-surface-capabilities.md","mcp/kernel.test.ts","mcp/kernel.ts","mcp/vnext/adapters/capability-matrix.ts","mcp/vnext/adapters/codex-otel.ts","mcp/vnext/adapters/cursor-hooks.ts","mcp/vnext/adapters/surface-certification.test.ts","plugin/codex/otel-config.toml","plugin/cursor/hooks.json","plugin/cursor/kage-hook.sh"],"stack":[],"source_refs":[{"kind":"git_diff","branch":"codex/kage-vnext-implementation","head":"ba70dba98d5f140f984c247b3be8cd798051547b","merge_base":"d3841066df412d29fbb5ba0a58c55566eb85974b","changed_files":["docs/integrations/agent-surface-capabilities.md","mcp/kernel.test.ts","mcp/kernel.ts","mcp/vnext/adapters/capability-matrix.ts","mcp/vnext/adapters/codex-otel.ts","mcp/vnext/adapters/cursor-hooks.ts","mcp/vnext/adapters/surface-certification.test.ts","plugin/codex/otel-config.toml","plugin/cursor/hooks.json","plugin/cursor/kage-hook.sh"],"summary_path":"/Users/kushaljain/code/Kage/.worktrees/kage-vnext-implementation/.agent_memory/review/branch-summary-codex-kage-vnext-implementation.json"}],"context":{"fact":"Current branch codex/kage-vnext-implementation changes 10 repo paths.","why":"Branch change memory gives future agents durable context from the git diff when they continue, review, or verify this work.","trigger":"Recall when asking what changed on this branch, preparing a PR review, or resuming this work.","action":"Use the changed file list and diff summary as orientation, then inspect the actual diff and source files before making further edits.","verification":"Generated from git diff and refreshed by kage pr summarize or kage propose --from-diff.","risk_if_forgotten":"Future agents may repeat orientation work, miss branch-specific assumptions, or ignore files touched by this change.","stale_when":"The branch diff changes substantially, the branch is merged, or a newer change-memory packet supersedes it."},"freshness":{"last_verified_at":"2026-07-18T10:41:24.621Z","ttl_days":180,"path_fingerprints":[{"path":"docs/integrations/agent-surface-capabilities.md","sha256":"d657c0a433d8128e7ab74490bdc2b6ddbf0ffd7ab145875c7c925858b7eb3ef9","size":5050},{"path":"mcp/kernel.test.ts","sha256":"b9297bf3f91940b9732e54ba3b44927b30708946d598b87f84df6ba31db6dc44","size":346994},{"path":"mcp/kernel.ts","sha256":"2173646553a0136714e9b837ef1071e754db4cefbaf35383578359cd90624f26","size":972797},{"path":"mcp/vnext/adapters/capability-matrix.ts","sha256":"4afd67a4299c69dbec37e0c5f742a81c308f16d512ba58f96faca13162b98839","size":7090},{"path":"mcp/vnext/adapters/codex-otel.ts","sha256":"9c9fbf9336b92b3375fc3b0cd48dc5a229559f0bd561efe4256ade898df163a8","size":2455},{"path":"mcp/vnext/adapters/cursor-hooks.ts","sha256":"e2f21287615a83a9d2c839d87046f09d383affaa39dad171ff4d114fbce524dd","size":2571},{"path":"mcp/vnext/adapters/surface-certification.test.ts","sha256":"3cac4d1dbde293bdaf60020af86b660f8edffe857959a27f602227d6799d9352","size":6850},{"path":"plugin/codex/otel-config.toml","sha256":"a1a4ba92769691ef75be28e94bc767ce317f4b37ee2fc36cc6acba8b67cc537c","size":502},{"path":"plugin/cursor/hooks.json","sha256":"0b3c12d4cfd8c180eec04db3d5886dc36ba663d1023171170c122dc3ca1a0505","size":442},{"path":"plugin/cursor/kage-hook.sh","sha256":"3ca4597f65691a9800d903a773d7a21dd7d3b65d589411148ef1091fbdb22746","size":2172}],"path_fingerprint_policy":"source_hash_staleness","verification":"git_diff"},"edges":[{"relation":"changes_path","to":"path:docs/integrations/agent-surface-capabilities.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/kernel.test.ts","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/kernel.ts","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/vnext/adapters/capability-matrix.ts","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/vnext/adapters/codex-otel.ts","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/vnext/adapters/cursor-hooks.ts","evidence":"git_diff"},{"relation":"changes_path","to":"path:mcp/vnext/adapters/surface-certification.test.ts","evidence":"git_diff"},{"relation":"changes_path","to":"path:plugin/codex/otel-config.toml","evidence":"git_diff"},{"relation":"changes_path","to":"path:plugin/cursor/hooks.json","evidence":"git_diff"},{"relation":"changes_path","to":"path:plugin/cursor/kage-hook.sh","evidence":"git_diff"}],"quality":{"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"stale_reasons":[],"estimated_tokens_saved":412,"admission":{"admit":true,"class":"candidate","score":70,"reasons":["durable memory type","has provenance","repo scoped or path grounded","has durable trigger, rationale, issue context, or explanation","substantive enough to reuse"],"risks":[]},"candidate_kind":"change_memory","review_boundary":"git_or_pr","promotion_requires_review":true},"created_at":"2026-07-18T10:41:24.621Z","updated_at":"2026-07-18T10:41:24.621Z"}
```

