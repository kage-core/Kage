---
type: "Gotcha"
title: "Release workflow should be non-interactive and preflight remote state"
description: "During the 1.1.14 npm release, git push was fast but the workflow slowed down because origin/master moved after publish, git rebase continue opened vi for .git/COMMIT EDITMSG, and helpful feedback recording after the rel"
resource: "AGENTS.md"
tags: ["session-learning", "release", "npm", "git", "kage", "workflow"]
timestamp: "2026-05-06T06:33:22.715Z"
x-kage-id: "repo:https-github-com-kage-core-kage:gotcha:release-workflow-should-be-non-interactive-and-preflight-remote-state-1778049202"
x-kage-type: "gotcha"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["AGENTS.md", "mcp/package.json"]
---

# Release workflow should be non-interactive and preflight remote state

> During the 1.1.14 npm release, git push was fast but the workflow slowed down because origin/master moved after publi…

During the 1.1.14 npm release, git push was fast but the workflow slowed down because origin/master moved after publish, git rebase --continue opened vi for .git/COMMIT_EDITMSG, and helpful-feedback recording after the release created a second memory commit. Future npm release work should run git fetch before publishing or pushing, use GIT_EDITOR=true or git -c core.editor=true for rebase/commit continuation in non-interactive agent sessions, and batch Kage feedback or memory writes before the final refresh/commit/push instead of adding them after the release push.
Evidence: Observed during @kage-core/kage-graph-mcp@1.1.14 release: first push rejected due remote update; rebase continuation left stale git rebase/vi processes; Kage feedback touched a packet after the release commit had already been pushed.
Verified by: git status -sb; git ls-remote origin refs/heads/master; pgrep -fl COMMIT_EDITMSG|git rebase; kage pr check --project . --json

## Verification

Observed during @kage-core/kage-graph-mcp@1.1.14 release: first push rejected due remote update; rebase continuation left stale git rebase/vi processes; Kage feedback touched a packet after the release commit had already been pushed.

# Citations

[1] explicit_capture (2026-05-06T06:33:22.715Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:gotcha:release-workflow-should-be-non-interactive-and-preflight-remote-state-1778049202","title":"Release workflow should be non-interactive and preflight remote state","summary":"During the 1.1.14 npm release, git push was fast but the workflow slowed down because origin/master moved after publish, git rebase continue opened vi for .git/COMMIT EDITMSG, and helpful feedback recording after the rel","body":"During the 1.1.14 npm release, git push was fast but the workflow slowed down because origin/master moved after publish, git rebase --continue opened vi for .git/COMMIT_EDITMSG, and helpful-feedback recording after the release created a second memory commit. Future npm release work should run git fetch before publishing or pushing, use GIT_EDITOR=true or git -c core.editor=true for rebase/commit continuation in non-interactive agent sessions, and batch Kage feedback or memory writes before the final refresh/commit/push instead of adding them after the release push.\nEvidence: Observed during @kage-core/kage-graph-mcp@1.1.14 release: first push rejected due remote update; rebase continuation left stale git rebase/vi processes; Kage feedback touched a packet after the release commit had already been pushed.\nVerified by: git status -sb; git ls-remote origin refs/heads/master; pgrep -fl COMMIT_EDITMSG|git rebase; kage pr check --project . --json","type":"gotcha","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","release","npm","git","kage","workflow"],"paths":["AGENTS.md","mcp/package.json"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-06T06:33:22.715Z"}],"context":{"fact":"During the 1.1.14 npm release, git push was fast but the workflow slowed down because origin/master moved after publish, git rebase --continue opened vi for .git/COMMIT_EDITMSG, and helpful-feedback recording after the release created a second memory commit. Future npm release work should run git fetch before publishing or pushing, use GIT_EDITOR=true or git -c core.editor=true for rebase/commit continuation in non-interactive agent sessions, and batch Kage feedback or memory writes before the final refresh/commit/push instead of adding them after the release push.\nEvidence: Observed during @kage-core/kage-graph-mcp@1.1.14 release: first push rejected due remote update; rebase continuation left stale git rebase/vi processes; Kage feedback touched a packet after the release commit had already been pushed.\nVerified by: git status -sb; git ls-remote origin refs/heads/master; pgrep -fl COMMIT_EDITMSG|git rebase; kage pr check --project . --json","verification":"Observed during @kage-core/kage-graph-mcp@1.1.14 release: first push rejected due remote update; rebase continuation left stale git rebase/vi processes; Kage feedback touched a packet after the release commit had already been pushed."},"freshness":{"ttl_days":365,"last_verified_at":"2026-05-06T06:33:22.715Z","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":20,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":239,"total_uses":54,"last_accessed_at":"2026-07-05T08:09:44.200Z"},"created_at":"2026-05-06T06:33:22.715Z","updated_at":"2026-07-03T16:16:26.723Z"}
```

