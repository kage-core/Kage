---
type: "Decision"
title: "Refresh full mode bypasses unchanged graph reuse"
description: "Kage refresh defaults to reusing a persisted code graph when the selected source stat fingerprint is unchanged, but maintainers can run kage refresh full or MCP kage refresh with full: true to intentionally bypass unchan"
resource: "mcp/kernel.ts"
tags: ["session-learning"]
timestamp: "2026-06-15T21:58:12.370Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:refresh-full-mode-bypasses-unchanged-graph-reuse-1778264669081"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/cli.ts", "mcp/index.ts", "mcp/kernel.test.ts", "mcp/mcp.test.ts"]
---

# Refresh full mode bypasses unchanged graph reuse

> Kage refresh defaults to reusing a persisted code graph when the selected source stat fingerprint is unchanged, but m…

Kage refresh defaults to reusing a persisted code graph when the selected source stat fingerprint is unchanged, but maintainers can run kage refresh --full or MCP kage_refresh with full: true to intentionally bypass unchanged-graph reuse and rebuild the code graph from scratch. Verified by: npm test --prefix mcp

## Verification

npm test --prefix mcp

# Citations

[1] explicit_capture (2026-05-08T18:24:29.081Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:refresh-full-mode-bypasses-unchanged-graph-reuse-1778264669081","title":"Refresh full mode bypasses unchanged graph reuse","summary":"Kage refresh defaults to reusing a persisted code graph when the selected source stat fingerprint is unchanged, but maintainers can run kage refresh full or MCP kage refresh with full: true to intentionally bypass unchan","body":"Kage refresh defaults to reusing a persisted code graph when the selected source stat fingerprint is unchanged, but maintainers can run kage refresh --full or MCP kage_refresh with full: true to intentionally bypass unchanged-graph reuse and rebuild the code graph from scratch. Verified by: npm test --prefix mcp","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning"],"paths":["mcp/kernel.ts","mcp/cli.ts","mcp/index.ts","mcp/kernel.test.ts","mcp/mcp.test.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-08T18:24:29.081Z"}],"context":{"fact":"Kage refresh defaults to reusing a persisted code graph when the selected source stat fingerprint is unchanged, but maintainers can run kage refresh --full or MCP kage_refresh with full: true to intentionally bypass unchanged-graph reuse and rebuild the code graph from scratch. Verified by: npm test --prefix mcp","verification":"npm test --prefix mcp"},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:12.370Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"selected","kind":"constant","sha256":"58196000de777be320b239d181cc9912a63881ea70a626d2ae9e2f75645983dc"},{"name":"code","kind":"constant","sha256":"64b81d42a4c6de11c6ff891787a63a33c198717dba5a924932817e97a8d1f7cf"},{"name":"mode","kind":"constant","sha256":"8bd576eb1331064328ee58c6045807752b97bb5b2e94fc37cf9f79d5a6fa6f91"},{"name":"when","kind":"constant","sha256":"48bfd58b3cdbf2d407e4443b90727d548d96eceaa4372c099dcd22c52f498452"},{"name":"full","kind":"constant","sha256":"9213768c4e556655970d7db34f178f135ab91810c1a0a99bba63452c01924f4f"}]},{"path":"mcp/cli.ts","sha256":"a670bc601e227372c9ab3e862f4e25fa87ae4bfa90b63c3bbc61032d332da0d7","size":114201,"symbols":[{"name":"from","kind":"constant","sha256":"b386d829bcacbd9e216c726f6dff71fc7d8a53aade383fa45b850387414b780c"}]},{"path":"mcp/index.ts","sha256":"d5abac0cb8d92d9074ae37a32ee515da8b03c43fe2d1a03d44447ee7b3493861","size":69453,"symbols":[{"name":"mode","kind":"constant","sha256":"18b82a4b81ca7c830c569f40cf5c828b5455eeeb0a3bec4059c2890192dbdd94"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"full","kind":"constant","sha256":"6270b632fb8c1ec230ad23878da137aab65feab7105ddd15ff76a1d27e5b5b44"}]},{"path":"mcp/mcp.test.ts","sha256":"3f5e52ad72a2a4b4db9e8de8bdad60cfb622ec132c2a278523ca6aad79538ec0","size":37910,"symbols":[{"name":"refresh","kind":"constant","sha256":"03f9e79d780815c464ed20feba1b1699ca3e5dbfcb2fc7f4948a66e541f32a9f"}]}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":94,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":79,"reverified_at":"2026-06-15T21:58:12.370Z","total_uses":0},"created_at":"2026-05-08T18:24:29.081Z","updated_at":"2026-07-03T16:16:26.714Z"}
```

