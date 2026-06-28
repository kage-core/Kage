---
type: "Decision"
title: "Structural index is the only active code graph file selector"
description: "Kage no longer keeps the old quick code graph file selection/cache path active. codeIndexSelection, KAGE MAX CODE GRAPH FILES, KAGE MAX CODE GRAPH SYMBOLS, codeGraphStatFingerprint, and the old code graph/file cache impl"
resource: "mcp/kernel.ts"
tags: ["session-learning", "code-graph", "structural-index", "cleanup", "large-repo"]
timestamp: "2026-06-15T21:58:24.753Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:structural-index-is-the-only-active-code-graph-file-selector-1778299220493"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "verified"
x-kage-paths: ["mcp/kernel.ts", "mcp/kernel.test.ts", "mcp/README.md"]
---

# Structural index is the only active code graph file selector

> Kage no longer keeps the old quick code graph file selection/cache path active. codeIndexSelection, KAGE MAX CODE GRA…

Kage no longer keeps the old quick code graph file-selection/cache path active. codeIndexSelection, KAGE_MAX_CODE_GRAPH_FILES, KAGE_MAX_CODE_GRAPH_SYMBOLS, codeGraphStatFingerprint, and the old code_graph/file-cache implementation were removed. The stable .agent_memory/code_graph artifacts remain for compatibility, but they are generated from .agent_memory/structural facts.
Evidence: Removed old quick selection and file-cache code from mcp/kernel.ts, renamed code graph manifest mode to structural, updated tests and docs, and removed stale local .agent_memory/code_graph/file-cache generated files.
Verified by: npm --prefix mcp test

## Verification

Removed old quick selection and file-cache code from mcp/kernel.ts, renamed code graph manifest mode to structural, updated tests and docs, and removed stale local .agent_memory/code_graph/file-cache generated files.

# Citations

[1] explicit_capture (2026-05-09T04:00:20.493Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:structural-index-is-the-only-active-code-graph-file-selector-1778299220493","title":"Structural index is the only active code graph file selector","summary":"Kage no longer keeps the old quick code graph file selection/cache path active. codeIndexSelection, KAGE MAX CODE GRAPH FILES, KAGE MAX CODE GRAPH SYMBOLS, codeGraphStatFingerprint, and the old code graph/file cache impl","body":"Kage no longer keeps the old quick code graph file-selection/cache path active. codeIndexSelection, KAGE_MAX_CODE_GRAPH_FILES, KAGE_MAX_CODE_GRAPH_SYMBOLS, codeGraphStatFingerprint, and the old code_graph/file-cache implementation were removed. The stable .agent_memory/code_graph artifacts remain for compatibility, but they are generated from .agent_memory/structural facts.\nEvidence: Removed old quick selection and file-cache code from mcp/kernel.ts, renamed code graph manifest mode to structural, updated tests and docs, and removed stale local .agent_memory/code_graph/file-cache generated files.\nVerified by: npm --prefix mcp test","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","code-graph","structural-index","cleanup","large-repo"],"paths":["mcp/kernel.ts","mcp/kernel.test.ts","mcp/README.md"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-09T04:00:20.493Z"}],"context":{"fact":"Kage no longer keeps the old quick code graph file-selection/cache path active. codeIndexSelection, KAGE_MAX_CODE_GRAPH_FILES, KAGE_MAX_CODE_GRAPH_SYMBOLS, codeGraphStatFingerprint, and the old code_graph/file-cache implementation were removed. The stable .agent_memory/code_graph artifacts remain for compatibility, but they are generated from .agent_memory/structural facts.\nEvidence: Removed old quick selection and file-cache code from mcp/kernel.ts, renamed code graph manifest mode to structural, updated tests and docs, and removed stale local .agent_memory/code_graph/file-cache generated files.\nVerified by: npm --prefix mcp test","verification":"Removed old quick selection and file-cache code from mcp/kernel.ts, renamed code graph manifest mode to structural, updated tests and docs, and removed stale local .agent_memory/code_graph/file-cache generated files."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:24.753Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"},{"name":"active","kind":"constant","sha256":"9f7bde308adc0c5d9cbba74f1c67a9e7f730e67037fee0682772d6443a410c94"},{"name":"mode","kind":"constant","sha256":"8bd576eb1331064328ee58c6045807752b97bb5b2e94fc37cf9f79d5a6fa6f91"},{"name":"removed","kind":"constant","sha256":"a0797a6325a4353640d2ec426c8c94ea9d093091c3e97fdacfd8387aec73d583"},{"name":"renamed","kind":"constant","sha256":"de39c9225962e4d7c46aad7b79eabd8c2d71c6bf815e82aefc9824c99d27b49c"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"active","kind":"constant","sha256":"d595cf6487619a49cc7c6553d9508539456acea8f2c91d508847e5262d83877e"},{"name":"removed","kind":"constant","sha256":"ad775619535b9eeee705f5ccfd66825096013225f81291b98a7d7e2b24b20779"}]},{"path":"mcp/README.md","sha256":"5c852f608754e299c2cff74495862f1ce4775d0bda5776d7ce4f070f4e4a6494","size":10129}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":160,"reverified_at":"2026-06-15T21:58:24.753Z"},"created_at":"2026-05-09T04:00:20.493Z","updated_at":"2026-06-15T21:58:24.753Z"}
```

