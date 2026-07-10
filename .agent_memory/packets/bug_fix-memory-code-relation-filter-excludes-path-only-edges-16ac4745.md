---
type: "Bug Fix"
title: "Memory-code relation filter excludes path-only edges"
description: "The viewer relation filter previously treated affects path as a memory code relation, but raw affects path usually connects a memory packet to a memory graph path node rather than to a code node. This made the Memory Cod"
resource: "mcp/kernel.test.ts"
tags: ["session-learning", "viewer", "memory-code", "relation-filter", "ux"]
timestamp: "2026-06-15T21:58:22.563Z"
x-kage-id: "repo:https-github-com-kage-core-kage:bug_fix:memory-code-relation-filter-excludes-path-only-edges-1778311813676"
x-kage-type: "bug_fix"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.test.ts"]
---

# Memory-code relation filter excludes path-only edges

> The viewer relation filter previously treated affects path as a memory code relation, but raw affects path usually co…

The viewer relation filter previously treated affects_path as a memory-code relation, but raw affects_path usually connects a memory packet to a memory-graph path node rather than to a code node. This made the Memory-Code links relation view show memory-to-memory/path relations. The special relation option should mean actual memory-to-code links only: precise symbol/route/test relations plus virtual affects_code_path bridge edges. Keep raw affects_path available as its own relation, but do not mark it memory_code_link. Verified by npm --prefix mcp test, git diff --check, and a viewer hook check showing Memory <-> Code only renders 360/360 memory-code edges and 0 code-code edges on the Kage repo.
Verified by: npm --prefix mcp test; git diff --check; viewer hook check

## Verification

npm --prefix mcp test; git diff --check; viewer hook check

# Citations

[1] explicit_capture (2026-05-09T07:30:13.676Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:bug_fix:memory-code-relation-filter-excludes-path-only-edges-1778311813676","title":"Memory-code relation filter excludes path-only edges","summary":"The viewer relation filter previously treated affects path as a memory code relation, but raw affects path usually connects a memory packet to a memory graph path node rather than to a code node. This made the Memory Cod","body":"The viewer relation filter previously treated affects_path as a memory-code relation, but raw affects_path usually connects a memory packet to a memory-graph path node rather than to a code node. This made the Memory-Code links relation view show memory-to-memory/path relations. The special relation option should mean actual memory-to-code links only: precise symbol/route/test relations plus virtual affects_code_path bridge edges. Keep raw affects_path available as its own relation, but do not mark it memory_code_link. Verified by npm --prefix mcp test, git diff --check, and a viewer hook check showing Memory <-> Code only renders 360/360 memory-code edges and 0 code-code edges on the Kage repo.\nVerified by: npm --prefix mcp test; git diff --check; viewer hook check","type":"bug_fix","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","viewer","memory-code","relation-filter","ux"],"paths":["mcp/kernel.test.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-09T07:30:13.676Z"}],"context":{"fact":"The viewer relation filter previously treated affects_path as a memory-code relation, but raw affects_path usually connects a memory packet to a memory-graph path node rather than to a code node. This made the Memory-Code links relation view show memory-to-memory/path relations. The special relation option should mean actual memory-to-code links only: precise symbol/route/test relations plus virtual affects_code_path bridge edges. Keep raw affects_path available as its own relation, but do not mark it memory_code_link. Verified by npm --prefix mcp test, git diff --check, and a viewer hook check showing Memory <-> Code only renders 360/360 memory-code edges and 0 code-code edges on the Kage repo.\nVerified by: npm --prefix mcp test; git diff --check; viewer hook check","verification":"npm --prefix mcp test; git diff --check; viewer hook check"},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:22.563Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"edges","kind":"constant","sha256":"8c37bcd95245ff6d66b6f8b413ce98901f9c5e8bad1c2b4dc47e75e3b2815f73"},{"name":"filter","kind":"constant","sha256":"f9235dbf87bd46a2346156a8d2fb71b581cb2a4e68085cbe25e3db0e2f04ed4a"}]}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":194,"reverified_at":"2026-06-15T21:58:22.563Z","total_uses":0,"last_accessed_at":"2026-07-01T17:52:15.013Z"},"created_at":"2026-05-09T07:30:13.676Z","updated_at":"2026-07-03T16:16:26.678Z"}
```

