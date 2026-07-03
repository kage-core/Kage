---
type: "Bug Fix"
title: "PR check should ignore superseded stale packets"
description: "Kage PR checks should block active approved or pending stale memory, but not retired memory that has already been superseded. Superseded packets remain in lineage for auditability; they should not keep a branch from publ"
resource: "mcp/kernel.ts"
tags: ["session-learning", "pr-check", "memory-lineage", "stale-memory"]
timestamp: "2026-06-15T21:58:21.469Z"
x-kage-id: "repo:https-github-com-kage-core-kage:bug_fix:pr-check-should-ignore-superseded-stale-packets-1780217359224"
x-kage-type: "bug_fix"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/kernel.test.ts"]
---

# PR check should ignore superseded stale packets

> Kage PR checks should block active approved or pending stale memory, but not retired memory that has already been sup…

Kage PR checks should block active approved or pending stale memory, but not retired memory that has already been superseded. Superseded packets remain in lineage for auditability; they should not keep a branch from publishing after a replacement packet records current knowledge.
Evidence: Added regression coverage that supersedes a path-drifted packet, refreshes, and asserts prCheck excludes the superseded packet from stale_packets and stale-memory errors.
Verified by: npm test --prefix mcp -- kernel.test.js

## Verification

Added regression coverage that supersedes a path-drifted packet, refreshes, and asserts prCheck excludes the superseded packet from stale_packets and stale-memory errors.

# Citations

[1] explicit_capture (2026-05-31T08:49:19.224Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:bug_fix:pr-check-should-ignore-superseded-stale-packets-1780217359224","title":"PR check should ignore superseded stale packets","summary":"Kage PR checks should block active approved or pending stale memory, but not retired memory that has already been superseded. Superseded packets remain in lineage for auditability; they should not keep a branch from publ","body":"Kage PR checks should block active approved or pending stale memory, but not retired memory that has already been superseded. Superseded packets remain in lineage for auditability; they should not keep a branch from publishing after a replacement packet records current knowledge.\nEvidence: Added regression coverage that supersedes a path-drifted packet, refreshes, and asserts prCheck excludes the superseded packet from stale_packets and stale-memory errors.\nVerified by: npm test --prefix mcp -- kernel.test.js","type":"bug_fix","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","pr-check","memory-lineage","stale-memory"],"paths":["mcp/kernel.ts","mcp/kernel.test.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-31T08:49:19.224Z"}],"context":{"fact":"Kage PR checks should block active approved or pending stale memory, but not retired memory that has already been superseded. Superseded packets remain in lineage for auditability; they should not keep a branch from publishing after a replacement packet records current knowledge.\nEvidence: Added regression coverage that supersedes a path-drifted packet, refreshes, and asserts prCheck excludes the superseded packet from stale_packets and stale-memory errors.\nVerified by: npm test --prefix mcp -- kernel.test.js","verification":"Added regression coverage that supersedes a path-drifted packet, refreshes, and asserts prCheck excludes the superseded packet from stale_packets and stale-memory errors."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:21.469Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"lineage","kind":"constant","sha256":"d95fb2fcf60b740e0ead538d68698eb4a371f46b66a22e0d241a07ef5c085b6b"},{"name":"ignore","kind":"function","sha256":"3eee15379e111fc3066636e779769471e2ba26f4ccf38736888f5c1eec25dd08"},{"name":"active","kind":"constant","sha256":"9f7bde308adc0c5d9cbba74f1c67a9e7f730e67037fee0682772d6443a410c94"},{"name":"after","kind":"constant","sha256":"220a1c1969c37d53268e215419dcea650ffa901162d0a25e451bd90831fb0a1b"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"},{"name":"prcheck","kind":"function","sha256":"fbea9ed798181ef8f23f872e1e18ef1514461f7cea65039fb31d9d6f6e30acb0"},{"name":"drifted","kind":"constant","sha256":"10f61b2ada721ab69e77b8e321cc378dcac5510d7f12857f5c59f474fb7f58f5"},{"name":"replacement","kind":"constant","sha256":"fba960e633cc69daaa7903dc7c23a5cb040d11f3c36ed090056abbd2fea924ad"},{"name":"keep","kind":"constant","sha256":"3e5df93c6de57dbae093461e4198d2bc24bb055a50d3f6a8bd6449397fd00f3b"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"packets","kind":"constant","sha256":"f28a69afbf5d7a988e351fc5446a3b291a2451f97b8220c4e1a7629b3a50ffa3"},{"name":"added","kind":"constant","sha256":"bc14da9c82da760a8d437c7e912b7909ab47e5de278fb9a951ae4702a8835975"},{"name":"active","kind":"constant","sha256":"d595cf6487619a49cc7c6553d9508539456acea8f2c91d508847e5262d83877e"},{"name":"approved","kind":"constant","sha256":"171aaa19fb00d03fd3ac915407ce29bf1b975dd242d15989e08241caf5c05506"},{"name":"pending","kind":"constant","sha256":"4da2f0224c36410c87348cd089aa57256945530e249ee63da194f3a1406848de"},{"name":"block","kind":"constant","sha256":"0d5a18486daa1bf0551606173de332fbb51d44808bbbaf97560dd6a843388b08"}]}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":6,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":129,"reverified_at":"2026-06-15T21:58:21.469Z","total_uses":6,"last_accessed_at":"2026-07-02T11:21:11.528Z"},"created_at":"2026-05-31T08:49:19.224Z","updated_at":"2026-07-03T16:16:26.678Z"}
```

