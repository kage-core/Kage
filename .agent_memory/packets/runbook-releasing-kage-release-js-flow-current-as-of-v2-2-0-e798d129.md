---
type: "Runbook"
title: "Releasing Kage: release.js flow current as of v2.2.0"
description: "node dist/release.js publish push smoke from mcp/ publishes from any named branch incl. master : preflights clean worktree, fetches+pushes the branch rebase first if the kage sync bot raced you — it pushes skip ci commit"
resource: "mcp/release.ts"
tags: ["session-learning", "release"]
timestamp: "2026-06-12T11:53:18.248Z"
x-kage-id: "repo:https-github-com-kage-core-kage:runbook:releasing-kage-release-js-flow-current-as-of-v2-2-0-1781265198248"
x-kage-type: "runbook"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/release.ts"]
---

# Releasing Kage: release.js flow current as of v2.2.0

> node dist/release.js publish push smoke from mcp/ publishes from any named branch incl. master : preflights clean wor…

node dist/release.js --publish --push --smoke from mcp/ publishes from any named branch (incl. master): preflights clean worktree, fetches+pushes the branch (rebase first if the kage-sync bot raced you — it pushes [skip ci] commits to master frequently), npm publish with public access, verifies version, smoke-installs the published package. Then: mcp-publisher login http -domain kage-core.com -private-key $(tr -d '[:space:]' < /tmp/mcp-pub/priv.hex) and mcp-publisher publish (server.json must have BOTH version fields bumped; JWTs expire in hours). Finally upgrade the vendored copy: cp -R mcp/dist/* ~/.claude/kage-mcp/dist/ + package.json (launcher pins it via --mcp-config).

# Citations

[1] explicit_capture (2026-06-12T11:53:18.248Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:runbook:releasing-kage-release-js-flow-current-as-of-v2-2-0-1781265198248","title":"Releasing Kage: release.js flow current as of v2.2.0","summary":"node dist/release.js publish push smoke from mcp/ publishes from any named branch incl. master : preflights clean worktree, fetches+pushes the branch rebase first if the kage sync bot raced you — it pushes skip ci commit","body":"node dist/release.js --publish --push --smoke from mcp/ publishes from any named branch (incl. master): preflights clean worktree, fetches+pushes the branch (rebase first if the kage-sync bot raced you — it pushes [skip ci] commits to master frequently), npm publish with public access, verifies version, smoke-installs the published package. Then: mcp-publisher login http -domain kage-core.com -private-key $(tr -d '[:space:]' < /tmp/mcp-pub/priv.hex) and mcp-publisher publish (server.json must have BOTH version fields bumped; JWTs expire in hours). Finally upgrade the vendored copy: cp -R mcp/dist/* ~/.claude/kage-mcp/dist/ + package.json (launcher pins it via --mcp-config).","type":"runbook","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","release"],"paths":["mcp/release.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-06-12T11:53:18.248Z"}],"context":{"fact":"node dist/release.js --publish --push --smoke from mcp/ publishes from any named branch (incl. master): preflights clean worktree, fetches+pushes the branch (rebase first if the kage-sync bot raced you — it pushes [skip ci] commits to master frequently), npm publish with public access, verifies version, smoke-installs the published package. Then: mcp-publisher login http -domain kage-core.com -private-key $(tr -d '[:space:]' < /tmp/mcp-pub/priv.hex) and mcp-publisher publish (server.json must have BOTH version fields bumped; JWTs expire in hours). Finally upgrade the vendored copy: cp -R mcp/dist/* ~/.claude/kage-mcp/dist/ + package.json (launcher pins it via --mcp-config)."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-12T11:53:18.248Z","path_fingerprints":[{"path":"mcp/release.ts","sha256":"526ba31170e96dabcc315dced845f1955a4adf92ae338c75954de7d0d088fb3d","size":5908}],"path_fingerprint_policy":"source_hash_staleness","verification":"repo_local_agent_capture"},"edges":[{"relation":"supersedes","to":"repo:https-github-com-kage-core-kage:runbook:releasing-kage-release-js-publishes-from-any-named-branch-1781191414917","evidence":"Newer repo memory supersedes this packet.","created_at":"2026-06-12T11:53:33.632Z"}],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"discovery_tokens":2000,"discovery_tokens_estimated":true,"score":96,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":171,"total_uses":0,"last_accessed_at":"2026-07-09T06:54:39.972Z"},"created_at":"2026-06-12T11:53:18.248Z","updated_at":"2026-07-03T16:16:26.741Z","author_branch":"master"}
```

