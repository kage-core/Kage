---
type: "Bug Fix"
title: "kage sync CI fix: rebase identity fallback + self-healing non-fast-forward push retry"
description: "The two kage sync tests failed only on CI passed on macOS even with bare HOME . Annotated asserts revealed the real error: machine B's git push u origin HEAD rejected non fast forward — CI's git left the branch BEHIND th"
resource: "mcp/kernel.ts"
tags: ["session-learning", "ci"]
timestamp: "2026-06-15T21:58:35.471Z"
x-kage-id: "repo:https-github-com-kage-core-kage:bug_fix:kage-sync-ci-fix-rebase-identity-fallback-self-healing-non-fast-forward-push-ret"
x-kage-type: "bug_fix"
x-kage-status: "deprecated"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "deprecated"
x-kage-paths: ["mcp/kernel.ts"]
---

# kage sync CI fix: rebase identity fallback + self-healing non-fast-forward push retry

> The two kage sync tests failed only on CI passed on macOS even with bare HOME . Annotated asserts revealed the real e…

The two kage sync tests failed only on CI (passed on macOS even with bare HOME). Annotated asserts revealed the real error: machine B's git push -u origin HEAD rejected non-fast-forward — CI's git left the branch BEHIND the remote after the convergence rebase. Fix (two parts, both shipped): (1) rebaseOntoUpstream prepends syncIdentityArgs to rebase/--continue/--skip (runners have no git identity; commits already had the fallback); (2) syncSetup's push self-heals: on non-fast-forward/behind/fetch-first stderr, re-fetch + branch -M + rebaseOntoUpstream + one retry push — a rebase fast-forwards a behind branch. If push still fails, errors embed a git log --oneline --all snapshot. Debugging convention: test asserts on sync results include JSON.stringify(result.errors) so CI names the git error instead of false!==true. CI green at 9b2f5a3.

# Citations

[1] explicit_capture (2026-06-12T12:09:13.941Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:bug_fix:kage-sync-ci-fix-rebase-identity-fallback-self-healing-non-fast-forward-push-ret","title":"kage sync CI fix: rebase identity fallback + self-healing non-fast-forward push retry","summary":"The two kage sync tests failed only on CI passed on macOS even with bare HOME . Annotated asserts revealed the real error: machine B's git push u origin HEAD rejected non fast forward — CI's git left the branch BEHIND th","body":"The two kage sync tests failed only on CI (passed on macOS even with bare HOME). Annotated asserts revealed the real error: machine B's git push -u origin HEAD rejected non-fast-forward — CI's git left the branch BEHIND the remote after the convergence rebase. Fix (two parts, both shipped): (1) rebaseOntoUpstream prepends syncIdentityArgs to rebase/--continue/--skip (runners have no git identity; commits already had the fallback); (2) syncSetup's push self-heals: on non-fast-forward/behind/fetch-first stderr, re-fetch + branch -M + rebaseOntoUpstream + one retry push — a rebase fast-forwards a behind branch. If push still fails, errors embed a git log --oneline --all snapshot. Debugging convention: test asserts on sync results include JSON.stringify(result.errors) so CI names the git error instead of false!==true. CI green at 9b2f5a3.","type":"bug_fix","scope":"repo","visibility":"team","sensitivity":"internal","status":"deprecated","confidence":0.7,"tags":["session-learning","ci"],"paths":["mcp/kernel.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-06-12T12:09:13.941Z"}],"context":{"fact":"The two kage sync tests failed only on CI (passed on macOS even with bare HOME). Annotated asserts revealed the real error: machine B's git push -u origin HEAD rejected non-fast-forward — CI's git left the branch BEHIND the remote after the convergence rebase. Fix (two parts, both shipped): (1) rebaseOntoUpstream prepends syncIdentityArgs to rebase/--continue/--skip (runners have no git identity; commits already had the fallback); (2) syncSetup's push self-heals: on non-fast-forward/behind/fetch-first stderr, re-fetch + branch -M + rebaseOntoUpstream + one retry push — a rebase fast-forwards a behind branch. If push still fails, errors embed a git log --oneline --all snapshot. Debugging convention: test asserts on sync results include JSON.stringify(result.errors) so CI names the git error instead of false!==true. CI green at 9b2f5a3."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:35.471Z","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"after","kind":"constant","sha256":"220a1c1969c37d53268e215419dcea650ffa901162d0a25e451bd90831fb0a1b"},{"name":"home","kind":"constant","sha256":"a5062cd2ffe3cebe96af8b30ad8f48bf4a66bb6cb2740f99381a3f96f8732962"},{"name":"syncidentityargs","kind":"function","sha256":"8e08cefc54e889ccb9238f995b3fc162e050aa03c21232b269a06577f324a1fc"},{"name":"rebaseontoupstream","kind":"function","sha256":"07b3dc33a9084b9b8995cfcb099b69b154968716a04f74b5995d98c94d0ba10c"},{"name":"skip","kind":"constant","sha256":"84ce913f797ae6f1160ffe3c80d4f9852f31f1ce9c118d5e1a8be145e564b569"},{"name":"syncsetup","kind":"function","sha256":"565f51c736cb3a3895473f9f3e2b6cf2176fbc033c15a517974177cadf2f9a02"}]}],"path_fingerprint_policy":"source_hash_staleness","verification":"repo_local_agent_capture"},"edges":[{"relation":"supersedes","to":"repo:https-github-com-kage-core-kage:bug_fix:kage-sync-rebase-needs-the-kage-sync-identity-fallback-ci-had-no-git-identity-17","evidence":"Newer repo memory supersedes this packet.","created_at":"2026-06-12T12:09:29.296Z"}],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"discovery_tokens":8000,"discovery_tokens_estimated":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":212,"reverified_at":"2026-06-15T21:58:35.471Z","stale":true,"stale_reasons":["packet status is deprecated","linked path changed since memory was verified: mcp/kernel.ts"],"suggested_action":"mark_stale"},"created_at":"2026-06-12T12:09:13.941Z","updated_at":"2026-06-28T20:39:04.864Z","author_branch":"master"}
```

