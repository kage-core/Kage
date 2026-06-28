---
type: "Decision"
title: "Code index prefers SCIP with LSP fallback"
description: "Kage code index should prefer the external SCIP path for JS/TS repos when scip typescript and the scip CLI are installed, convert the generated index into .agent memory/code index/scip.json, and fall back to the built in"
resource: "mcp/kernel.ts"
tags: ["session-learning"]
timestamp: "2026-06-15T21:58:41.444Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:code-index-prefers-scip-with-lsp-fallback-1778265510094"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "verified"
x-kage-paths: ["mcp/kernel.ts", "mcp/cli.ts", "mcp/index.ts", "mcp/kernel.test.ts", "mcp/mcp.test.ts"]
---

# Code index prefers SCIP with LSP fallback

> Kage code index should prefer the external SCIP path for JS/TS repos when scip typescript and the scip CLI are instal…

Kage code-index should prefer the external SCIP path for JS/TS repos when scip-typescript and the scip CLI are installed, convert the generated index into .agent_memory/code_index/scip.json, and fall back to the built-in LSP-compatible symbol index when external tools are unavailable. This keeps first-run setup light while giving large repos a real code-intelligence path. Verified by: npm test --prefix mcp

## Verification

npm test --prefix mcp

# Citations

[1] explicit_capture (2026-05-08T18:38:30.094Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:code-index-prefers-scip-with-lsp-fallback-1778265510094","title":"Code index prefers SCIP with LSP fallback","summary":"Kage code index should prefer the external SCIP path for JS/TS repos when scip typescript and the scip CLI are installed, convert the generated index into .agent memory/code index/scip.json, and fall back to the built in","body":"Kage code-index should prefer the external SCIP path for JS/TS repos when scip-typescript and the scip CLI are installed, convert the generated index into .agent_memory/code_index/scip.json, and fall back to the built-in LSP-compatible symbol index when external tools are unavailable. This keeps first-run setup light while giving large repos a real code-intelligence path. Verified by: npm test --prefix mcp","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning"],"paths":["mcp/kernel.ts","mcp/cli.ts","mcp/index.ts","mcp/kernel.test.ts","mcp/mcp.test.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-08T18:38:30.094Z"}],"context":{"fact":"Kage code-index should prefer the external SCIP path for JS/TS repos when scip-typescript and the scip CLI are installed, convert the generated index into .agent_memory/code_index/scip.json, and fall back to the built-in LSP-compatible symbol index when external tools are unavailable. This keeps first-run setup light while giving large repos a real code-intelligence path. Verified by: npm test --prefix mcp","verification":"npm test --prefix mcp"},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:41.444Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"scip","kind":"constant","sha256":"ae7542feff5b34d72da28817afe1f63146c7902c4426314075a371adb34e3dd4"},{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"},{"name":"when","kind":"constant","sha256":"48bfd58b3cdbf2d407e4443b90727d548d96eceaa4372c099dcd22c52f498452"}]},{"path":"mcp/cli.ts","sha256":"a670bc601e227372c9ab3e862f4e25fa87ae4bfa90b63c3bbc61032d332da0d7","size":114201,"symbols":[{"name":"index","kind":"constant","sha256":"c201ee64cf24065dd2ba0bbdc7ff8399e5c1dd89783820e501d28f82019f08a8"},{"name":"json","kind":"constant","sha256":"9115381310c6d4c5ecb25a7e67e4fd0bb4b20a9b328adb25b606065454f79370"},{"name":"agent","kind":"constant","sha256":"5b9caa614311fe691d6af171b9a8985b0d49464b9df178ad28ff5b9883eb4cf2"}]},{"path":"mcp/index.ts","sha256":"d5abac0cb8d92d9074ae37a32ee515da8b03c43fe2d1a03d44447ee7b3493861","size":69453,"symbols":[{"name":"index","kind":"constant","sha256":"ad98a75521fc0edce4fed6c6cd0503a41df66728efc44c4c3904db6a6ac89d7f"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"built","kind":"constant","sha256":"4625942b51635ac134d36301bea21059b44eaa49a4d49628383360b0715959be"},{"name":"installed","kind":"constant","sha256":"aebb7f2fe4a7b021b2f834ab138465c20042027b0c4af69e8ae6d2859d85f34d"},{"name":"real","kind":"constant","sha256":"856bf47487b3742dc24d08df1d5fbdb66e78329577cae25b2d31af5ccc9aade1"}]},{"path":"mcp/mcp.test.ts","sha256":"3f5e52ad72a2a4b4db9e8de8bdad60cfb622ec132c2a278523ca6aad79538ec0","size":37910,"symbols":[{"name":"setup","kind":"constant","sha256":"ada7211745ab22b88e9fa86b08bb0caf1253f5c0d3e52c0e126f14aa9e66fb5d"}]}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":94,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":103,"reverified_at":"2026-06-15T21:58:41.444Z"},"created_at":"2026-05-08T18:38:30.094Z","updated_at":"2026-06-15T21:58:41.444Z"}
```

