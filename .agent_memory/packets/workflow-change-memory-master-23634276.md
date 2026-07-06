---
type: "Workflow"
title: "Change memory: master"
description: "Repo-local context for 16 changed repo paths on master."
resource: ".agent_memory/packets/bug_fix-core-memory-loop-fixed-prose-observations-gated-distill-everywhere-fail-pass-evi-4533d14d.md"
tags: ["change-memory", "diff-proposal", "repo-local", "branch:master"]
timestamp: "2026-07-06T14:01:25.571Z"
x-kage-id: "repo:https-github-com-kage-core-kage:workflow:change-memory-master"
x-kage-type: "workflow"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "verified"
x-kage-paths: [".agent_memory/packets/bug_fix-core-memory-loop-fixed-prose-observations-gated-distill-everywhere-fail-pass-evi-4533d14d.md", ".agent_memory/packets/bug_fix-kage-context-bloat-dump-packet-capture-cause-and-fix-e5060da1.md", ".agent_memory/packets/decision-capture-guard-ungrounded-conversational-user-utterances-routed-to-pending-withhe-ccf53f40.md", ".agent_memory/packets/decision-claude-code-hooks-single-source-of-truth-plugin-hooks-generated-from-setupagent-f99cc1e4.md", ".agent_memory/packets/decision-injection-capture-hardening-sessionstart-pinned-context-universal-dump-guard-c6710261.md", ".agent_memory/packets/decision-kage-savings-reproducible-token-reduction-kages-answer-to-code-context-engines-9-8c2737fe.md", ".agent_memory/packets/decision-kage-viewer-benchmark-reports-now-include-a-proof-ledger-with-the-measured-metri-84cc8a4f.md", ".agent_memory/packets/decision-workspace-contracts-stay-source-evidence-based-ea6a0e82.md", ".agent_memory/packets/decision-workspace-recall-stays-kage-native-08ffbd42.md", ".agent_memory/packets/gotcha-web-tree-sitter-must-pair-0-24-x-with-tree-sitter-wasms-and-init-once-b77339a8.md", ".agent_memory/packets/issue_context-resume-check-the-kage-cruft-audit-workflow-waz60b5tm-results-and-clean-up-any-co-e05f6e5b.md", ".agent_memory/packets/runbook-claude-code-mcp-setup-claude-json-alwaysload-sessionstart-hook-6a62f338.md", ".agent_memory/packets/runbook-longmemeval-harness-can-measure-dense-local-embeddings-49db135d.md", ".agent_memory/packets/runbook-run-kage-mcp-tests-9b98df67.md", ".agent_memory/packets/runbook-truth-report-detectors-lead-with-reliably-firing-signal-f9853daf.md", ".agent_memory/packets/workflow-change-memory-master-23634276.md"]
---

# Change memory: master

> Repo-local context for 16 changed repo paths on master.

Repo-local change memory generated from the current git diff.

Goal: preserve the durable context another agent should receive when it works in this repo later.

What changed:
- .agent_memory/packets/bug_fix-core-memory-loop-fixed-prose-observations-gated-distill-everywhere-fail-pass-evi-4533d14d.md
- .agent_memory/packets/bug_fix-kage-context-bloat-dump-packet-capture-cause-and-fix-e5060da1.md
- .agent_memory/packets/decision-capture-guard-ungrounded-conversational-user-utterances-routed-to-pending-withhe-ccf53f40.md
- .agent_memory/packets/decision-claude-code-hooks-single-source-of-truth-plugin-hooks-generated-from-setupagent-f99cc1e4.md
- .agent_memory/packets/decision-injection-capture-hardening-sessionstart-pinned-context-universal-dump-guard-c6710261.md
- .agent_memory/packets/decision-kage-savings-reproducible-token-reduction-kages-answer-to-code-context-engines-9-8c2737fe.md
- .agent_memory/packets/decision-kage-viewer-benchmark-reports-now-include-a-proof-ledger-with-the-measured-metri-84cc8a4f.md
- .agent_memory/packets/decision-workspace-contracts-stay-source-evidence-based-ea6a0e82.md
- .agent_memory/packets/decision-workspace-recall-stays-kage-native-08ffbd42.md
- .agent_memory/packets/gotcha-web-tree-sitter-must-pair-0-24-x-with-tree-sitter-wasms-and-init-once-b77339a8.md
- .agent_memory/packets/issue_context-resume-check-the-kage-cruft-audit-workflow-waz60b5tm-results-and-clean-up-any-co-e05f6e5b.md
- .agent_memory/packets/runbook-claude-code-mcp-setup-claude-json-alwaysload-sessionstart-hook-6a62f338.md
- .agent_memory/packets/runbook-longmemeval-harness-can-measure-dense-local-embeddings-49db135d.md
- .agent_memory/packets/runbook-run-kage-mcp-tests-9b98df67.md
- .agent_memory/packets/runbook-truth-report-detectors-lead-with-reliably-firing-signal-f9853daf.md
- .agent_memory/packets/workflow-change-memory-master-23634276.md

Diff summary:
```text
...ed-distill-everywhere-fail-pass-evi-4533d14d.md |  2 +-
 ...t-dump-packet-capture-cause-and-fix-e5060da1.md |  2 +-
 ...utterances-routed-to-pending-withhe-ccf53f40.md |  2 +-
 ...gin-hooks-generated-from-setupagent-f99cc1e4.md |  4 +-
 ...pinned-context-universal-dump-guard-c6710261.md |  2 +-
 ...es-answer-to-code-context-engines-9-8c2737fe.md |  4 +-
 ...roof-ledger-with-the-measured-metri-84cc8a4f.md |  2 +-
 ...ontracts-stay-source-evidence-based-ea6a0e82.md |  2 +-
 ...-workspace-recall-stays-kage-native-08ffbd42.md |  2 +-
 ...ith-tree-sitter-wasms-and-init-once-b77339a8.md |  2 +-
 ...z60b5tm-results-and-clean-up-any-co-e05f6e5b.md |  2 +-
 ...e-json-alwaysload-sessionstart-hook-6a62f338.md |  2 +-
 ...-can-measure-dense-local-embeddings-49db135d.md |  2 +-
 .../packets/runbook-run-kage-mcp-tests-9b98df67.md |  2 +-
 ...rs-lead-with-reliably-firing-signal-f9853daf.md |  4 +-
 .../workflow-change-memory-master-23634276.md      | 46 +++++++++++++++++-----
 16 files changed, 55 insertions(+), 27 deletions(-)
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
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:workflow:change-memory-master","title":"Change memory: master","summary":"Repo-local context for 16 changed repo paths on master.","body":"Repo-local change memory generated from the current git diff.\n\nGoal: preserve the durable context another agent should receive when it works in this repo later.\n\nWhat changed:\n- .agent_memory/packets/bug_fix-core-memory-loop-fixed-prose-observations-gated-distill-everywhere-fail-pass-evi-4533d14d.md\n- .agent_memory/packets/bug_fix-kage-context-bloat-dump-packet-capture-cause-and-fix-e5060da1.md\n- .agent_memory/packets/decision-capture-guard-ungrounded-conversational-user-utterances-routed-to-pending-withhe-ccf53f40.md\n- .agent_memory/packets/decision-claude-code-hooks-single-source-of-truth-plugin-hooks-generated-from-setupagent-f99cc1e4.md\n- .agent_memory/packets/decision-injection-capture-hardening-sessionstart-pinned-context-universal-dump-guard-c6710261.md\n- .agent_memory/packets/decision-kage-savings-reproducible-token-reduction-kages-answer-to-code-context-engines-9-8c2737fe.md\n- .agent_memory/packets/decision-kage-viewer-benchmark-reports-now-include-a-proof-ledger-with-the-measured-metri-84cc8a4f.md\n- .agent_memory/packets/decision-workspace-contracts-stay-source-evidence-based-ea6a0e82.md\n- .agent_memory/packets/decision-workspace-recall-stays-kage-native-08ffbd42.md\n- .agent_memory/packets/gotcha-web-tree-sitter-must-pair-0-24-x-with-tree-sitter-wasms-and-init-once-b77339a8.md\n- .agent_memory/packets/issue_context-resume-check-the-kage-cruft-audit-workflow-waz60b5tm-results-and-clean-up-any-co-e05f6e5b.md\n- .agent_memory/packets/runbook-claude-code-mcp-setup-claude-json-alwaysload-sessionstart-hook-6a62f338.md\n- .agent_memory/packets/runbook-longmemeval-harness-can-measure-dense-local-embeddings-49db135d.md\n- .agent_memory/packets/runbook-run-kage-mcp-tests-9b98df67.md\n- .agent_memory/packets/runbook-truth-report-detectors-lead-with-reliably-firing-signal-f9853daf.md\n- .agent_memory/packets/workflow-change-memory-master-23634276.md\n\nDiff summary:\n```text\n...ed-distill-everywhere-fail-pass-evi-4533d14d.md |  2 +-\n ...t-dump-packet-capture-cause-and-fix-e5060da1.md |  2 +-\n ...utterances-routed-to-pending-withhe-ccf53f40.md |  2 +-\n ...gin-hooks-generated-from-setupagent-f99cc1e4.md |  4 +-\n ...pinned-context-universal-dump-guard-c6710261.md |  2 +-\n ...es-answer-to-code-context-engines-9-8c2737fe.md |  4 +-\n ...roof-ledger-with-the-measured-metri-84cc8a4f.md |  2 +-\n ...ontracts-stay-source-evidence-based-ea6a0e82.md |  2 +-\n ...-workspace-recall-stays-kage-native-08ffbd42.md |  2 +-\n ...ith-tree-sitter-wasms-and-init-once-b77339a8.md |  2 +-\n ...z60b5tm-results-and-clean-up-any-co-e05f6e5b.md |  2 +-\n ...e-json-alwaysload-sessionstart-hook-6a62f338.md |  2 +-\n ...-can-measure-dense-local-embeddings-49db135d.md |  2 +-\n .../packets/runbook-run-kage-mcp-tests-9b98df67.md |  2 +-\n ...rs-lead-with-reliably-firing-signal-f9853daf.md |  4 +-\n .../workflow-change-memory-master-23634276.md      | 46 +++++++++++++++++-----\n 16 files changed, 55 insertions(+), 27 deletions(-)\n```\n\nHow to verify:\n- Add the exact test, build, or manual verification command when you refine this memory.\n\nImprove this packet when more context is known:\n- The actual feature, fix, or refactor rationale.\n- Why the change was made, including relevant bugs, issues, decisions, and code explanations.\n- The package, API, command, or architectural pattern future agents should understand, verify, or reuse.\n- Any gotchas, follow-up risks, or branch-specific assumptions.\n\nPromote beyond this repo only after explicit org/global review.","type":"workflow","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.62,"tags":["change-memory","diff-proposal","repo-local","branch:master"],"paths":[".agent_memory/packets/bug_fix-core-memory-loop-fixed-prose-observations-gated-distill-everywhere-fail-pass-evi-4533d14d.md",".agent_memory/packets/bug_fix-kage-context-bloat-dump-packet-capture-cause-and-fix-e5060da1.md",".agent_memory/packets/decision-capture-guard-ungrounded-conversational-user-utterances-routed-to-pending-withhe-ccf53f40.md",".agent_memory/packets/decision-claude-code-hooks-single-source-of-truth-plugin-hooks-generated-from-setupagent-f99cc1e4.md",".agent_memory/packets/decision-injection-capture-hardening-sessionstart-pinned-context-universal-dump-guard-c6710261.md",".agent_memory/packets/decision-kage-savings-reproducible-token-reduction-kages-answer-to-code-context-engines-9-8c2737fe.md",".agent_memory/packets/decision-kage-viewer-benchmark-reports-now-include-a-proof-ledger-with-the-measured-metri-84cc8a4f.md",".agent_memory/packets/decision-workspace-contracts-stay-source-evidence-based-ea6a0e82.md",".agent_memory/packets/decision-workspace-recall-stays-kage-native-08ffbd42.md",".agent_memory/packets/gotcha-web-tree-sitter-must-pair-0-24-x-with-tree-sitter-wasms-and-init-once-b77339a8.md",".agent_memory/packets/issue_context-resume-check-the-kage-cruft-audit-workflow-waz60b5tm-results-and-clean-up-any-co-e05f6e5b.md",".agent_memory/packets/runbook-claude-code-mcp-setup-claude-json-alwaysload-sessionstart-hook-6a62f338.md",".agent_memory/packets/runbook-longmemeval-harness-can-measure-dense-local-embeddings-49db135d.md",".agent_memory/packets/runbook-run-kage-mcp-tests-9b98df67.md",".agent_memory/packets/runbook-truth-report-detectors-lead-with-reliably-firing-signal-f9853daf.md",".agent_memory/packets/workflow-change-memory-master-23634276.md"],"stack":[],"source_refs":[{"kind":"git_diff","branch":"master","head":"9519932812a4be0fcc1e6f6531fd91dbf8e1c23e","merge_base":"9519932812a4be0fcc1e6f6531fd91dbf8e1c23e","changed_files":[".agent_memory/packets/bug_fix-core-memory-loop-fixed-prose-observations-gated-distill-everywhere-fail-pass-evi-4533d14d.md",".agent_memory/packets/bug_fix-kage-context-bloat-dump-packet-capture-cause-and-fix-e5060da1.md",".agent_memory/packets/decision-capture-guard-ungrounded-conversational-user-utterances-routed-to-pending-withhe-ccf53f40.md",".agent_memory/packets/decision-claude-code-hooks-single-source-of-truth-plugin-hooks-generated-from-setupagent-f99cc1e4.md",".agent_memory/packets/decision-injection-capture-hardening-sessionstart-pinned-context-universal-dump-guard-c6710261.md",".agent_memory/packets/decision-kage-savings-reproducible-token-reduction-kages-answer-to-code-context-engines-9-8c2737fe.md",".agent_memory/packets/decision-kage-viewer-benchmark-reports-now-include-a-proof-ledger-with-the-measured-metri-84cc8a4f.md",".agent_memory/packets/decision-workspace-contracts-stay-source-evidence-based-ea6a0e82.md",".agent_memory/packets/decision-workspace-recall-stays-kage-native-08ffbd42.md",".agent_memory/packets/gotcha-web-tree-sitter-must-pair-0-24-x-with-tree-sitter-wasms-and-init-once-b77339a8.md",".agent_memory/packets/issue_context-resume-check-the-kage-cruft-audit-workflow-waz60b5tm-results-and-clean-up-any-co-e05f6e5b.md",".agent_memory/packets/runbook-claude-code-mcp-setup-claude-json-alwaysload-sessionstart-hook-6a62f338.md",".agent_memory/packets/runbook-longmemeval-harness-can-measure-dense-local-embeddings-49db135d.md",".agent_memory/packets/runbook-run-kage-mcp-tests-9b98df67.md",".agent_memory/packets/runbook-truth-report-detectors-lead-with-reliably-firing-signal-f9853daf.md",".agent_memory/packets/workflow-change-memory-master-23634276.md"],"summary_path":"/Users/kushaljain/code/Kage/.agent_memory/review/branch-summary-master.json"}],"context":{"fact":"Current branch master changes 16 repo paths.","why":"Branch change memory gives future agents durable context from the git diff when they continue, review, or verify this work.","trigger":"Recall when asking what changed on this branch, preparing a PR review, or resuming this work.","action":"Use the changed file list and diff summary as orientation, then inspect the actual diff and source files before making further edits.","verification":"Generated from git diff and refreshed by kage pr summarize or kage propose --from-diff.","risk_if_forgotten":"Future agents may repeat orientation work, miss branch-specific assumptions, or ignore files touched by this change.","stale_when":"The branch diff changes substantially, the branch is merged, or a newer change-memory packet supersedes it."},"freshness":{"last_verified_at":"2026-07-06T14:01:25.571Z","ttl_days":180,"path_fingerprints":[],"path_fingerprint_policy":"source_hash_staleness","verification":"git_diff"},"edges":[{"relation":"changes_path","to":"path:.agent_memory/packets/bug_fix-core-memory-loop-fixed-prose-observations-gated-distill-everywhere-fail-pass-evi-4533d14d.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/bug_fix-kage-context-bloat-dump-packet-capture-cause-and-fix-e5060da1.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-capture-guard-ungrounded-conversational-user-utterances-routed-to-pending-withhe-ccf53f40.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-claude-code-hooks-single-source-of-truth-plugin-hooks-generated-from-setupagent-f99cc1e4.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-injection-capture-hardening-sessionstart-pinned-context-universal-dump-guard-c6710261.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-kage-savings-reproducible-token-reduction-kages-answer-to-code-context-engines-9-8c2737fe.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-kage-viewer-benchmark-reports-now-include-a-proof-ledger-with-the-measured-metri-84cc8a4f.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-workspace-contracts-stay-source-evidence-based-ea6a0e82.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-workspace-recall-stays-kage-native-08ffbd42.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/gotcha-web-tree-sitter-must-pair-0-24-x-with-tree-sitter-wasms-and-init-once-b77339a8.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/issue_context-resume-check-the-kage-cruft-audit-workflow-waz60b5tm-results-and-clean-up-any-co-e05f6e5b.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/runbook-claude-code-mcp-setup-claude-json-alwaysload-sessionstart-hook-6a62f338.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/runbook-longmemeval-harness-can-measure-dense-local-embeddings-49db135d.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/runbook-run-kage-mcp-tests-9b98df67.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/runbook-truth-report-detectors-lead-with-reliably-firing-signal-f9853daf.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/workflow-change-memory-master-23634276.md","evidence":"git_diff"}],"quality":{"score":82,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":["some referenced paths are missing: .agent_memory/packets/workflow-change-memory-master-23634276.md"],"duplicate_candidates":[],"stale_reasons":["some referenced paths are missing: .agent_memory/packets/workflow-change-memory-master-23634276.md"],"estimated_tokens_saved":866,"admission":{"admit":true,"class":"candidate","score":70,"reasons":["durable memory type","has provenance","repo scoped or path grounded","has durable trigger, rationale, issue context, or explanation","substantive enough to reuse"],"risks":[]},"candidate_kind":"change_memory","review_boundary":"git_or_pr","promotion_requires_review":true},"created_at":"2026-07-06T14:01:25.571Z","updated_at":"2026-07-06T14:01:25.571Z"}
```

