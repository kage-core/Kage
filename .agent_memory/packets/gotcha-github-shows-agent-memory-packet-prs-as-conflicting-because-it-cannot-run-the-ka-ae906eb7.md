---
type: "Gotcha"
title: "GitHub shows .agent_memory packet PRs as CONFLICTING because it cannot run the kage merge-packet driver"
description: "The repo configures a custom git merge driver kage merge packet, wired in .gitattributes that auto resolves .agent memory/packets/ .md collisions newest wins and preserves the losing side under .agent memory/conflicts/."
resource: ".gitattributes"
tags: ["session-learning", "git", "merge-driver", "github", "agent-memory", "release"]
timestamp: "2026-07-22T22:02:56.707Z"
x-kage-id: "repo:memory:gotcha:github-shows-agent-memory-packet-prs-as-conflicting-because-it-cannot-run-the-ka"
x-kage-type: "gotcha"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: [".gitattributes", ".agent_memory/packets"]
---

# GitHub shows .agent_memory packet PRs as CONFLICTING because it cannot run the kage merge-packet driver

> The repo configures a custom git merge driver kage merge packet, wired in .gitattributes that auto resolves .agent me…

The repo configures a custom git merge driver (kage merge-packet, wired in .gitattributes) that auto-resolves .agent_memory/packets/*.md collisions newest-wins and preserves the losing side under .agent_memory/conflicts/. That driver runs on LOCAL merges only. GitHub's server-side merge does NOT execute custom merge drivers, so a PR that overlaps a memory packet with the base branch reports mergeable=CONFLICTING / mergeStateStatus=DIRTY even though 'git merge-tree --write-tree base HEAD' exits 0 locally. This bit us on PR #99 (v4.0.0): the only overlap was one auto-generated workflow-change packet the sync bot had rewritten on master. Resolution: locally 'git merge origin/master' on the feature branch (the driver resolves the packet), confirm 'git diff --stat <published-sha> HEAD -- :!.agent_memory' shows ZERO non-memory changes, push the branch; GitHub then recomputes the PR as MERGEABLE. Do not hand-resolve packet conflict markers and do not force-merge.
Evidence: PR #99: gh reported CONFLICTING/DIRTY; 'git merge-tree --write-tree origin/master HEAD' exited 0 with a 'kage merge-packet: kept theirs side (newest updated_at)' line; after 'git merge origin/master' (73 files, all .agent_memory, 0 code) and push, gh reported MERGEABLE/UNSTABLE.
Verified by: gh pr view 99 --json mergeable transition CONFLICTING to MERGEABLE after the local merge+push

## Verification

PR #99: gh reported CONFLICTING/DIRTY; 'git merge-tree --write-tree origin/master HEAD' exited 0 with a 'kage merge-packet: kept theirs side (newest updated_at)' line; after 'git merge origin/master' (73 files, all .agent_memory, 0 code) and push, gh reported MERGEABLE/UNSTABLE.

# Citations

[1] explicit_capture (2026-07-22T22:02:56.707Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:memory:gotcha:github-shows-agent-memory-packet-prs-as-conflicting-because-it-cannot-run-the-ka","title":"GitHub shows .agent_memory packet PRs as CONFLICTING because it cannot run the kage merge-packet driver","summary":"The repo configures a custom git merge driver kage merge packet, wired in .gitattributes that auto resolves .agent memory/packets/ .md collisions newest wins and preserves the losing side under .agent memory/conflicts/.","body":"The repo configures a custom git merge driver (kage merge-packet, wired in .gitattributes) that auto-resolves .agent_memory/packets/*.md collisions newest-wins and preserves the losing side under .agent_memory/conflicts/. That driver runs on LOCAL merges only. GitHub's server-side merge does NOT execute custom merge drivers, so a PR that overlaps a memory packet with the base branch reports mergeable=CONFLICTING / mergeStateStatus=DIRTY even though 'git merge-tree --write-tree base HEAD' exits 0 locally. This bit us on PR #99 (v4.0.0): the only overlap was one auto-generated workflow-change packet the sync bot had rewritten on master. Resolution: locally 'git merge origin/master' on the feature branch (the driver resolves the packet), confirm 'git diff --stat <published-sha> HEAD -- :!.agent_memory' shows ZERO non-memory changes, push the branch; GitHub then recomputes the PR as MERGEABLE. Do not hand-resolve packet conflict markers and do not force-merge.\nEvidence: PR #99: gh reported CONFLICTING/DIRTY; 'git merge-tree --write-tree origin/master HEAD' exited 0 with a 'kage merge-packet: kept theirs side (newest updated_at)' line; after 'git merge origin/master' (73 files, all .agent_memory, 0 code) and push, gh reported MERGEABLE/UNSTABLE.\nVerified by: gh pr view 99 --json mergeable transition CONFLICTING to MERGEABLE after the local merge+push","type":"gotcha","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","git","merge-driver","github","agent-memory","release"],"paths":[".gitattributes",".agent_memory/packets"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-07-22T22:02:56.707Z"}],"context":{"fact":"The repo configures a custom git merge driver (kage merge-packet, wired in .gitattributes) that auto-resolves .agent_memory/packets/*.md collisions newest-wins and preserves the losing side under .agent_memory/conflicts/. That driver runs on LOCAL merges only. GitHub's server-side merge does NOT execute custom merge drivers, so a PR that overlaps a memory packet with the base branch reports mergeable=CONFLICTING / mergeStateStatus=DIRTY even though 'git merge-tree --write-tree base HEAD' exits 0 locally. This bit us on PR #99 (v4.0.0): the only overlap was one auto-generated workflow-change packet the sync bot had rewritten on master. Resolution: locally 'git merge origin/master' on the feature branch (the driver resolves the packet), confirm 'git diff --stat <published-sha> HEAD -- :!.agent_memory' shows ZERO non-memory changes, push the branch; GitHub then recomputes the PR as MERGEABLE. Do not hand-resolve packet conflict markers and do not force-merge.\nEvidence: PR #99: gh reported CONFLICTING/DIRTY; 'git merge-tree --write-tree origin/master HEAD' exited 0 with a 'kage merge-packet: kept theirs side (newest updated_at)' line; after 'git merge origin/master' (73 files, all .agent_memory, 0 code) and push, gh reported MERGEABLE/UNSTABLE.\nVerified by: gh pr view 99 --json mergeable transition CONFLICTING to MERGEABLE after the local merge+push","verification":"PR #99: gh reported CONFLICTING/DIRTY; 'git merge-tree --write-tree origin/master HEAD' exited 0 with a 'kage merge-packet: kept theirs side (newest updated_at)' line; after 'git merge origin/master' (73 files, all .agent_memory, 0 code) and push, gh reported MERGEABLE/UNSTABLE."},"freshness":{"ttl_days":365,"last_verified_at":"2026-07-22T22:02:56.707Z","path_fingerprints":[{"path":".gitattributes","sha256":"d3c24cd530fbce1a57c679e011ab18f651a7e43e2d7088013bfbc7f4707d15c7","size":92}],"path_fingerprint_policy":"source_hash_staleness","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"discovery_tokens":8000,"discovery_tokens_estimated":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":342},"created_at":"2026-07-22T22:02:56.707Z","updated_at":"2026-07-22T22:02:56.707Z","author_branch":"codex/kage-vnext-implementation","author_name":"Kushal Jain"}
```

