---
type: "Workflow"
title: "Change memory: master"
description: "Repo-local context for 2 changed repo paths on master."
resource: "mcp/cli.ts"
tags: ["change-memory", "diff-proposal", "repo-local", "branch:master"]
timestamp: "2026-07-06T18:43:19.259Z"
x-kage-id: "repo:https-github-com-kage-core-kage:workflow:change-memory-master"
x-kage-type: "workflow"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "verified"
x-kage-paths: ["mcp/cli.ts", "mcp/proxy.ts"]
---

# Change memory: master

> Repo-local context for 2 changed repo paths on master.

Repo-local change memory generated from the current git diff.

Goal: preserve the durable context another agent should receive when it works in this repo later.

What changed:
- mcp/cli.ts
- mcp/proxy.ts

Diff summary:
```text
...-cli-js-npx-package-runner-fallback-2d64f260.md |  2 +-
 ...ion-stamps-usage-telemetry-is-live--26defd1d.md |  2 +-
 ...rs-buried-exact-matches-fixed-v3-2--b09b2cdb.md |  2 +-
 ...pus-5x-overstated-kage-usd-per-mtok-85a1d77f.md |  2 +-
 ...gin-hooks-generated-from-setupagent-f99cc1e4.md |  4 +-
 ...injects-captures-memory-form-factor-479596fe.md |  4 +-
 ...es-answer-to-code-context-engines-9-8c2737fe.md |  4 +-
 ...rate-non-official-benchmark-harness-8a2a6aa7.md |  2 +-
 ...uage-framework-routes-in-code-graph-f80a59d6.md |  2 +-
 ...ves-agents-compact-repo-orientation-352a278d.md |  2 +-
 ...-generic-after-risk-path-parser-fix-921fd297.md |  2 +-
 ...se-1-1-7-launch-readiness-alignment-78721468.md |  2 +-
 ...age-as-serious-oss-cli-and-mcp-tool-ffb1232f.md |  2 +-
 ...bject-paraphrase-not-generic-token--3886be09.md |  2 +-
 ...eractive-and-preflight-remote-state-9e0606f6.md |  2 +-
 ...swer-benchmark-blocked-by-api-quota-493726af.md |  2 +-
 ...tart-to-take-effect-in-live-tooling-4a2f3232.md |  2 +-
 ...art-tool-replacing-4-separate-calls-84feac04.md |  2 +-
 ...-can-measure-dense-local-embeddings-49db135d.md |  2 +-
 ...elease-js-flow-current-as-of-v2-2-0-e798d129.md |  2 +-
 .../packets/runbook-run-kage-mcp-tests-9b98df67.md |  2 +-
 ...rs-lead-with-reliably-firing-signal-f9853daf.md |  4 +-
 .../workflow-change-memory-master-23634276.md      | 50 +++++++---------------
 mcp/cli.ts                                         |  2 +-
 mcp/proxy.ts                            
… [+77 chars truncated]
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
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:workflow:change-memory-master","title":"Change memory: master","summary":"Repo-local context for 2 changed repo paths on master.","body":"Repo-local change memory generated from the current git diff.\n\nGoal: preserve the durable context another agent should receive when it works in this repo later.\n\nWhat changed:\n- mcp/cli.ts\n- mcp/proxy.ts\n\nDiff summary:\n```text\n...-cli-js-npx-package-runner-fallback-2d64f260.md |  2 +-\n ...ion-stamps-usage-telemetry-is-live--26defd1d.md |  2 +-\n ...rs-buried-exact-matches-fixed-v3-2--b09b2cdb.md |  2 +-\n ...pus-5x-overstated-kage-usd-per-mtok-85a1d77f.md |  2 +-\n ...gin-hooks-generated-from-setupagent-f99cc1e4.md |  4 +-\n ...injects-captures-memory-form-factor-479596fe.md |  4 +-\n ...es-answer-to-code-context-engines-9-8c2737fe.md |  4 +-\n ...rate-non-official-benchmark-harness-8a2a6aa7.md |  2 +-\n ...uage-framework-routes-in-code-graph-f80a59d6.md |  2 +-\n ...ves-agents-compact-repo-orientation-352a278d.md |  2 +-\n ...-generic-after-risk-path-parser-fix-921fd297.md |  2 +-\n ...se-1-1-7-launch-readiness-alignment-78721468.md |  2 +-\n ...age-as-serious-oss-cli-and-mcp-tool-ffb1232f.md |  2 +-\n ...bject-paraphrase-not-generic-token--3886be09.md |  2 +-\n ...eractive-and-preflight-remote-state-9e0606f6.md |  2 +-\n ...swer-benchmark-blocked-by-api-quota-493726af.md |  2 +-\n ...tart-to-take-effect-in-live-tooling-4a2f3232.md |  2 +-\n ...art-tool-replacing-4-separate-calls-84feac04.md |  2 +-\n ...-can-measure-dense-local-embeddings-49db135d.md |  2 +-\n ...elease-js-flow-current-as-of-v2-2-0-e798d129.md |  2 +-\n .../packets/runbook-run-kage-mcp-tests-9b98df67.md |  2 +-\n ...rs-lead-with-reliably-firing-signal-f9853daf.md |  4 +-\n .../workflow-change-memory-master-23634276.md      | 50 +++++++---------------\n mcp/cli.ts                                         |  2 +-\n mcp/proxy.ts                            \n… [+77 chars truncated]\n```\n\nHow to verify:\n- Add the exact test, build, or manual verification command when you refine this memory.\n\nImprove this packet when more context is known:\n- The actual feature, fix, or refactor rationale.\n- Why the change was made, including relevant bugs, issues, decisions, and code explanations.\n- The package, API, command, or architectural pattern future agents should understand, verify, or reuse.\n- Any gotchas, follow-up risks, or branch-specific assumptions.\n\nPromote beyond this repo only after explicit org/global review.","type":"workflow","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.62,"tags":["change-memory","diff-proposal","repo-local","branch:master"],"paths":["mcp/cli.ts","mcp/proxy.ts"],"stack":[],"source_refs":[{"kind":"git_diff","branch":"master","head":"dcec6b7c8380713b87dbdba508ec93f5e337400f","merge_base":"dcec6b7c8380713b87dbdba508ec93f5e337400f","changed_files":[".agent_memory/packets/bug_fix-ambient-hooks-never-silently-die-path-baked-cli-js-npx-package-runner-fallback-2d64f260.md",".agent_memory/packets/bug_fix-anchors-are-code-identifiers-hooks-carry-version-stamps-usage-telemetry-is-live--26defd1d.md",".agent_memory/packets/bug_fix-recall-ranking-stopword-dilution-ungated-priors-buried-exact-matches-fixed-v3-2--b09b2cdb.md",".agent_memory/packets/bug_fix-savings-estimate-3-1m-sonnet-default-was-15-opus-5x-overstated-kage-usd-per-mtok-85a1d77f.md",".agent_memory/packets/decision-claude-code-hooks-single-source-of-truth-plugin-hooks-generated-from-setupagent-f99cc1e4.md",".agent_memory/packets/decision-kage-proxy-spike-headroom-style-drop-in-that-injects-captures-memory-form-factor-479596fe.md",".agent_memory/packets/decision-kage-savings-reproducible-token-reduction-kages-answer-to-code-context-engines-9-8c2737fe.md",".agent_memory/packets/decision-memoryarena-context-recall-is-a-separate-non-official-benchmark-harness-8a2a6aa7.md",".agent_memory/packets/decision-mixed-language-framework-routes-in-code-graph-f80a59d6.md",".agent_memory/packets/decision-project-profile-gives-agents-compact-repo-orientation-352a278d.md",".agent_memory/packets/decision-public-source-skip-lists-remain-generic-after-risk-path-parser-fix-921fd297.md",".agent_memory/packets/decision-release-1-1-7-launch-readiness-alignment-78721468.md",".agent_memory/packets/decision-website-revamp-positions-kage-as-serious-oss-cli-and-mcp-tool-ffb1232f.md",".agent_memory/packets/gotcha-contradiction-detector-require-distinctive-subject-paraphrase-not-generic-token--3886be09.md",".agent_memory/packets/gotcha-release-workflow-should-be-non-interactive-and-preflight-remote-state-9e0606f6.md",".agent_memory/packets/negative_result-memoryarena-openai-answer-benchmark-blocked-by-api-quota-493726af.md",".agent_memory/packets/runbook-capture-distill-fixes-need-a-rebuild-restart-to-take-effect-in-live-tooling-4a2f3232.md",".agent_memory/packets/runbook-kage-context-is-the-single-session-start-tool-replacing-4-separate-calls-84feac04.md",".agent_memory/packets/runbook-longmemeval-harness-can-measure-dense-local-embeddings-49db135d.md",".agent_memory/packets/runbook-releasing-kage-release-js-flow-current-as-of-v2-2-0-e798d129.md",".agent_memory/packets/runbook-run-kage-mcp-tests-9b98df67.md",".agent_memory/packets/runbook-truth-report-detectors-lead-with-reliably-firing-signal-f9853daf.md",".agent_memory/packets/workflow-change-memory-master-23634276.md","mcp/cli.ts","mcp/proxy.ts"],"summary_path":"/Users/kushaljain/code/Kage/.agent_memory/review/branch-summary-master.json"}],"context":{"fact":"Current branch master changes 2 repo paths.","why":"Branch change memory gives future agents durable context from the git diff when they continue, review, or verify this work.","trigger":"Recall when asking what changed on this branch, preparing a PR review, or resuming this work.","action":"Use the changed file list and diff summary as orientation, then inspect the actual diff and source files before making further edits.","verification":"Generated from git diff and refreshed by kage pr summarize or kage propose --from-diff.","risk_if_forgotten":"Future agents may repeat orientation work, miss branch-specific assumptions, or ignore files touched by this change.","stale_when":"The branch diff changes substantially, the branch is merged, or a newer change-memory packet supersedes it."},"freshness":{"last_verified_at":"2026-07-06T18:43:19.259Z","ttl_days":180,"path_fingerprints":[{"path":"mcp/cli.ts","sha256":"f94329bf9ed16945507597dbb627311776ac80865df98511a8df52465d178476","size":124327},{"path":"mcp/proxy.ts","sha256":"1eb415280b365671227428703f6cf1a7a7cbad9ce9facf2488e02df2c785b1d3","size":11066}],"path_fingerprint_policy":"source_hash_staleness","verification":"git_diff"},"edges":[{"relation":"changes_path","to":"path:.agent_memory/packets/bug_fix-ambient-hooks-never-silently-die-path-baked-cli-js-npx-package-runner-fallback-2d64f260.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/bug_fix-anchors-are-code-identifiers-hooks-carry-version-stamps-usage-telemetry-is-live--26defd1d.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/bug_fix-recall-ranking-stopword-dilution-ungated-priors-buried-exact-matches-fixed-v3-2--b09b2cdb.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/bug_fix-savings-estimate-3-1m-sonnet-default-was-15-opus-5x-overstated-kage-usd-per-mtok-85a1d77f.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-claude-code-hooks-single-source-of-truth-plugin-hooks-generated-from-setupagent-f99cc1e4.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-kage-proxy-spike-headroom-style-drop-in-that-injects-captures-memory-form-factor-479596fe.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-kage-savings-reproducible-token-reduction-kages-answer-to-code-context-engines-9-8c2737fe.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-memoryarena-context-recall-is-a-separate-non-official-benchmark-harness-8a2a6aa7.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-mixed-language-framework-routes-in-code-graph-f80a59d6.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-project-profile-gives-agents-compact-repo-orientation-352a278d.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-public-source-skip-lists-remain-generic-after-risk-path-parser-fix-921fd297.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-release-1-1-7-launch-readiness-alignment-78721468.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/decision-website-revamp-positions-kage-as-serious-oss-cli-and-mcp-tool-ffb1232f.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/gotcha-contradiction-detector-require-distinctive-subject-paraphrase-not-generic-token--3886be09.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/gotcha-release-workflow-should-be-non-interactive-and-preflight-remote-state-9e0606f6.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/negative_result-memoryarena-openai-answer-benchmark-blocked-by-api-quota-493726af.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/runbook-capture-distill-fixes-need-a-rebuild-restart-to-take-effect-in-live-tooling-4a2f3232.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/runbook-kage-context-is-the-single-session-start-tool-replacing-4-separate-calls-84feac04.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/runbook-longmemeval-harness-can-measure-dense-local-embeddings-49db135d.md","evidence":"git_diff"},{"relation":"changes_path","to":"path:.agent_memory/packets/runbook-releasing-kage-release-js-flow-current-as-of-v2-2-0-e798d129.md","evidence":"git_diff"}],"quality":{"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"stale_reasons":[],"estimated_tokens_saved":572,"admission":{"admit":true,"class":"candidate","score":70,"reasons":["durable memory type","has provenance","repo scoped or path grounded","has durable trigger, rationale, issue context, or explanation","substantive enough to reuse"],"risks":[]},"candidate_kind":"change_memory","review_boundary":"git_or_pr","promotion_requires_review":true},"created_at":"2026-07-06T18:43:19.259Z","updated_at":"2026-07-06T18:43:19.259Z"}
```

