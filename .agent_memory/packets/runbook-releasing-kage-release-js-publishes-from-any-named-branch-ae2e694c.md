---
type: "Runbook"
title: "Releasing Kage: release.js publishes from any named branch"
description: "node mcp/dist/release.js publish smoke publishes @kage core/kage graph mcp from the CURRENT named branch: preflights are clean worktree git status porcelain uall empty , origin/<branch is an ancestor of HEAD push first ,"
resource: "mcp/release.ts"
tags: ["session-learning", "release", "runbook", "npm"]
timestamp: "2026-06-15T21:58:11.610Z"
x-kage-id: "repo:https-github-com-kage-core-kage:runbook:releasing-kage-release-js-publishes-from-any-named-branch-1781191414917"
x-kage-type: "runbook"
x-kage-status: "superseded"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "superseded"
x-kage-paths: ["mcp/release.ts", "mcp/package.json", "mcp/index.ts", "plugin/.claude-plugin/plugin.json", "plugin/.codex-plugin/plugin.json"]
---

# Releasing Kage: release.js publishes from any named branch

> node mcp/dist/release.js publish smoke publishes @kage core/kage graph mcp from the CURRENT named branch: preflights …

node mcp/dist/release.js --publish --smoke publishes @kage-core/kage-graph-mcp from the CURRENT named branch: preflights are clean worktree (git status --porcelain -uall empty), origin/<branch> is an ancestor of HEAD (push first), npm test, and pack dry-run; master is NOT required, so a release/vX branch can publish before its PR merges. It then npm-publishes with --access public, polls npm view (10 retries/3s) and smoke-installs the tarball into a temp prefix. Version sources to bump in lockstep: mcp/package.json (+package-lock via npm install --package-lock-only), plugin/.claude-plugin/plugin.json, plugin/.codex-plugin/plugin.json, and the Server version literal in mcp/index.ts (name kage-graph). Verified for v2.0.0 (2026-06-11).
Evidence: v2.0.0 published from release/v2.0.0 with PR #66 unmerged; npm view returned 2.0.0; smoke install added 97 packages
Verified by: 2.0.0 release run

## Verification

v2.0.0 published from release/v2.0.0 with PR #66 unmerged; npm view returned 2.0.0; smoke install added 97 packages

# Citations

[1] explicit_capture (2026-06-11T15:23:34.916Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:runbook:releasing-kage-release-js-publishes-from-any-named-branch-1781191414917","title":"Releasing Kage: release.js publishes from any named branch","summary":"node mcp/dist/release.js publish smoke publishes @kage core/kage graph mcp from the CURRENT named branch: preflights are clean worktree git status porcelain uall empty , origin/<branch is an ancestor of HEAD push first ,","body":"node mcp/dist/release.js --publish --smoke publishes @kage-core/kage-graph-mcp from the CURRENT named branch: preflights are clean worktree (git status --porcelain -uall empty), origin/<branch> is an ancestor of HEAD (push first), npm test, and pack dry-run; master is NOT required, so a release/vX branch can publish before its PR merges. It then npm-publishes with --access public, polls npm view (10 retries/3s) and smoke-installs the tarball into a temp prefix. Version sources to bump in lockstep: mcp/package.json (+package-lock via npm install --package-lock-only), plugin/.claude-plugin/plugin.json, plugin/.codex-plugin/plugin.json, and the Server version literal in mcp/index.ts (name kage-graph). Verified for v2.0.0 (2026-06-11).\nEvidence: v2.0.0 published from release/v2.0.0 with PR #66 unmerged; npm view returned 2.0.0; smoke install added 97 packages\nVerified by: 2.0.0 release run","type":"runbook","scope":"repo","visibility":"team","sensitivity":"internal","status":"superseded","confidence":0.7,"tags":["session-learning","release","runbook","npm"],"paths":["mcp/release.ts","mcp/package.json","mcp/index.ts","plugin/.claude-plugin/plugin.json","plugin/.codex-plugin/plugin.json"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-06-11T15:23:34.916Z"}],"context":{"fact":"node mcp/dist/release.js --publish --smoke publishes @kage-core/kage-graph-mcp from the CURRENT named branch: preflights are clean worktree (git status --porcelain -uall empty), origin/<branch> is an ancestor of HEAD (push first), npm test, and pack dry-run; master is NOT required, so a release/vX branch can publish before its PR merges. It then npm-publishes with --access public, polls npm view (10 retries/3s) and smoke-installs the tarball into a temp prefix. Version sources to bump in lockstep: mcp/package.json (+package-lock via npm install --package-lock-only), plugin/.claude-plugin/plugin.json, plugin/.codex-plugin/plugin.json, and the Server version literal in mcp/index.ts (name kage-graph). Verified for v2.0.0 (2026-06-11).\nEvidence: v2.0.0 published from release/v2.0.0 with PR #66 unmerged; npm view returned 2.0.0; smoke install added 97 packages\nVerified by: 2.0.0 release run","verification":"v2.0.0 published from release/v2.0.0 with PR #66 unmerged; npm view returned 2.0.0; smoke install added 97 packages"},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:11.610Z","path_fingerprints":[{"path":"mcp/release.ts","sha256":"526ba31170e96dabcc315dced845f1955a4adf92ae338c75954de7d0d088fb3d","size":5908,"symbols":[{"name":"branch","kind":"constant","sha256":"ea669aa964d877b0f98c3acecc471a6a2f0f953ab3bfab33192a7e937508fbf5"}]},{"path":"mcp/package.json","sha256":"e77b80c8e3ef4eb7ccdf9f7dc775b51f18f1a7994092b538f81df874e8c91c5a","size":1193},{"path":"mcp/index.ts","sha256":"d5abac0cb8d92d9074ae37a32ee515da8b03c43fe2d1a03d44447ee7b3493861","size":69453,"symbols":[{"name":"server","kind":"constant","sha256":"4c51eb77c75ec82db0638b55b2c9c6e55a03a1594fa82c31b7304f8b924f091e"},{"name":"index","kind":"constant","sha256":"ad98a75521fc0edce4fed6c6cd0503a41df66728efc44c4c3904db6a6ac89d7f"}]},{"path":"plugin/.claude-plugin/plugin.json","sha256":"ad058fe3d0b7d571254c359dfd1d4ab2eb502b0157a8cabe32b33dc4d60a268d","size":735},{"path":"plugin/.codex-plugin/plugin.json","sha256":"29fa27abe5a059c855012fee1efdc8d9cdb6d1f30eec18b6db3d9eb46817db41","size":394}],"path_fingerprint_policy":"source_hash_staleness","verification":"repo_local_agent_capture","superseded_at":"2026-06-12T11:53:33.632Z","superseded_by":"repo:https-github-com-kage-core-kage:runbook:releasing-kage-release-js-flow-current-as-of-v2-2-0-1781265198248","superseded_reason":"Newer repo memory supersedes this packet."},"edges":[{"relation":"superseded_by","to":"repo:https-github-com-kage-core-kage:runbook:releasing-kage-release-js-flow-current-as-of-v2-2-0-1781265198248","evidence":"Newer repo memory supersedes this packet.","created_at":"2026-06-12T11:53:33.632Z"}],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":225,"superseded_by":"repo:https-github-com-kage-core-kage:runbook:releasing-kage-release-js-flow-current-as-of-v2-2-0-1781265198248","superseded_reason":"Newer repo memory supersedes this packet.","reverified_at":"2026-06-15T21:58:11.610Z","stale":true,"stale_reasons":["packet status is superseded","linked path changed since memory was verified: mcp/package.json, plugin/.claude-plugin/plugin.json"],"suggested_action":"mark_stale"},"created_at":"2026-06-11T15:23:34.916Z","updated_at":"2026-06-21T17:14:22.799Z","author_branch":"release/v2.0.0"}
```

