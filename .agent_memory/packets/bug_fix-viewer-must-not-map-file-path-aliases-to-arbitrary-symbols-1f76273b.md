---
type: "Bug Fix"
title: "Viewer must not map file path aliases to arbitrary symbols"
description: "Viewer merge aliases must not let a bare file path such as mcp/kernel.ts canonicalize to an arbitrary symbol in that file. Symbol and route code nodes should not advertise their file path as an alias; file paths belong t"
resource: "mcp/kernel.test.ts"
tags: ["session-learning", "viewer", "memory-code", "aliasing", "bug-fix"]
timestamp: "2026-06-15T21:58:08.847Z"
x-kage-id: "repo:https-github-com-kage-core-kage:bug_fix:viewer-must-not-map-file-path-aliases-to-arbitrary-symbols-1778312533868"
x-kage-type: "bug_fix"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.test.ts"]
---

# Viewer must not map file path aliases to arbitrary symbols

> Viewer merge aliases must not let a bare file path such as mcp/kernel.ts canonicalize to an arbitrary symbol in that …

Viewer merge aliases must not let a bare file path such as mcp/kernel.ts canonicalize to an arbitrary symbol in that file. Symbol and route code nodes should not advertise their file path as an alias; file paths belong to file nodes. Otherwise many memory packets that mention a path can collapse onto the last symbol indexed for that path, creating bogus hubs such as byDate with thousands of memory-code edges. Exact file path memory can still become a memory-code link when the endpoint canonicalizes to a file node; broad paths use virtual affects_code_path bridge edges. Verified by npm --prefix mcp test and a viewer hook check showing byDate has only one defines_symbol edge.
Verified by: npm --prefix mcp test; viewer hook check

## Verification

npm --prefix mcp test; viewer hook check

# Citations

[1] explicit_capture (2026-05-09T07:42:13.868Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:bug_fix:viewer-must-not-map-file-path-aliases-to-arbitrary-symbols-1778312533868","title":"Viewer must not map file path aliases to arbitrary symbols","summary":"Viewer merge aliases must not let a bare file path such as mcp/kernel.ts canonicalize to an arbitrary symbol in that file. Symbol and route code nodes should not advertise their file path as an alias; file paths belong t","body":"Viewer merge aliases must not let a bare file path such as mcp/kernel.ts canonicalize to an arbitrary symbol in that file. Symbol and route code nodes should not advertise their file path as an alias; file paths belong to file nodes. Otherwise many memory packets that mention a path can collapse onto the last symbol indexed for that path, creating bogus hubs such as byDate with thousands of memory-code edges. Exact file path memory can still become a memory-code link when the endpoint canonicalizes to a file node; broad paths use virtual affects_code_path bridge edges. Verified by npm --prefix mcp test and a viewer hook check showing byDate has only one defines_symbol edge.\nVerified by: npm --prefix mcp test; viewer hook check","type":"bug_fix","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","viewer","memory-code","aliasing","bug-fix"],"paths":["mcp/kernel.test.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-09T07:42:13.868Z"}],"context":{"fact":"Viewer merge aliases must not let a bare file path such as mcp/kernel.ts canonicalize to an arbitrary symbol in that file. Symbol and route code nodes should not advertise their file path as an alias; file paths belong to file nodes. Otherwise many memory packets that mention a path can collapse onto the last symbol indexed for that path, creating bogus hubs such as byDate with thousands of memory-code edges. Exact file path memory can still become a memory-code link when the endpoint canonicalizes to a file node; broad paths use virtual affects_code_path bridge edges. Verified by npm --prefix mcp test and a viewer hook check showing byDate has only one defines_symbol edge.\nVerified by: npm --prefix mcp test; viewer hook check","verification":"npm --prefix mcp test; viewer hook check"},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:08.847Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"packets","kind":"constant","sha256":"f28a69afbf5d7a988e351fc5446a3b291a2451f97b8220c4e1a7629b3a50ffa3"},{"name":"edges","kind":"constant","sha256":"8c37bcd95245ff6d66b6f8b413ce98901f9c5e8bad1c2b4dc47e75e3b2815f73"}]}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":12,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":184,"reverified_at":"2026-06-15T21:58:08.847Z","total_uses":12,"last_accessed_at":"2026-07-03T06:34:17.526Z"},"created_at":"2026-05-09T07:42:13.868Z","updated_at":"2026-07-03T16:16:26.690Z"}
```

