---
type: "Bug Fix"
title: "Fix Kage PR Check CI max-turns failure"
description: "The Kage PR Check workflow failed on PR 7 because anthropics/claude code action reached max turns while trying to summarize health, even though code index, refresh, and graph registry steps had already succeeded. The wor"
resource: ".github/workflows/kage-pr.yml"
tags: ["session-learning", "ci", "github-actions", "kage-pr", "workflow", "bug-fix"]
timestamp: "2026-05-12T04:00:47.312Z"
x-kage-id: "repo:https-github-com-kage-core-kage:bug_fix:fix-kage-pr-check-ci-max-turns-failure-1778558447313"
x-kage-type: "bug_fix"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: [".github/workflows/kage-pr.yml"]
---

# Fix Kage PR Check CI max-turns failure

> The Kage PR Check workflow failed on PR 7 because anthropics/claude code action reached max turns while trying to sum…

The Kage PR Check workflow failed on PR #7 because anthropics/claude-code-action reached max turns while trying to summarize health, even though code-index, refresh, and graph-registry steps had already succeeded. The workflow should keep Kage validation deterministic by running kage quality and kage pr check directly, then posting a plain gh PR comment; agent summarization must not be the CI gate.
Evidence: GitHub run 25672037194 failed in Run anthropics/claude-code-action@v1 with error_max_turns after successful code-index/refresh/graph-registry steps.
Verified by: npm test --prefix mcp; git diff --check

## Verification

GitHub run 25672037194 failed in Run anthropics/claude-code-action@v1 with error_max_turns after successful code-index/refresh/graph-registry steps.

# Citations

[1] explicit_capture (2026-05-12T04:00:47.312Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:bug_fix:fix-kage-pr-check-ci-max-turns-failure-1778558447313","title":"Fix Kage PR Check CI max-turns failure","summary":"The Kage PR Check workflow failed on PR 7 because anthropics/claude code action reached max turns while trying to summarize health, even though code index, refresh, and graph registry steps had already succeeded. The wor","body":"The Kage PR Check workflow failed on PR #7 because anthropics/claude-code-action reached max turns while trying to summarize health, even though code-index, refresh, and graph-registry steps had already succeeded. The workflow should keep Kage validation deterministic by running kage quality and kage pr check directly, then posting a plain gh PR comment; agent summarization must not be the CI gate.\nEvidence: GitHub run 25672037194 failed in Run anthropics/claude-code-action@v1 with error_max_turns after successful code-index/refresh/graph-registry steps.\nVerified by: npm test --prefix mcp; git diff --check","type":"bug_fix","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","ci","github-actions","kage-pr","workflow","bug-fix"],"paths":[".github/workflows/kage-pr.yml"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-12T04:00:47.312Z"}],"context":{"fact":"The Kage PR Check workflow failed on PR #7 because anthropics/claude-code-action reached max turns while trying to summarize health, even though code-index, refresh, and graph-registry steps had already succeeded. The workflow should keep Kage validation deterministic by running kage quality and kage pr check directly, then posting a plain gh PR comment; agent summarization must not be the CI gate.\nEvidence: GitHub run 25672037194 failed in Run anthropics/claude-code-action@v1 with error_max_turns after successful code-index/refresh/graph-registry steps.\nVerified by: npm test --prefix mcp; git diff --check","verification":"GitHub run 25672037194 failed in Run anthropics/claude-code-action@v1 with error_max_turns after successful code-index/refresh/graph-registry steps."},"freshness":{"ttl_days":365,"last_verified_at":"2026-05-12T04:00:47.312Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":154,"total_uses":0,"last_accessed_at":"2026-07-09T06:03:14.790Z"},"created_at":"2026-05-12T04:00:47.312Z","updated_at":"2026-07-03T16:16:26.677Z"}
```

