---
type: "Decision"
title: "Generated repo-map and change-memory packets need structured context"
description: "Fact: Kage generated repo map packets and branch change memory packets should include structured engineering context, not just prose. Why: audit structured memory coverage should stay at 100 without requiring manual edit"
resource: "mcp/kernel.ts"
tags: ["session-learning", "audit", "memory-admission", "generated-memory", "structured-context"]
timestamp: "2026-06-15T21:58:19.798Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:generated-repo-map-and-change-memory-packets-need-structured-context-17780149095"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "verified"
x-kage-paths: ["mcp/kernel.ts", "mcp/kernel.test.ts"]
---

# Generated repo-map and change-memory packets need structured context

> Fact: Kage generated repo map packets and branch change memory packets should include structured engineering context,…

Fact: Kage-generated repo_map packets and branch change-memory packets should include structured engineering context, not just prose. Why: audit structured-memory coverage should stay at 100 without requiring manual edits to generated packets after refresh or PR summary. Action: createRepoOverviewPacket, createRepoStructurePacket, and createDiffChangeMemory now set fact, why, trigger, action, verification, risk_if_forgotten, and stale_when context. Risk if forgotten: future refresh/pr-summary runs can reintroduce missing_context audit items even when all hand-authored packets are structured.
Evidence: CLI audit after packet and generator updates reported structured_packets 43/43, missing_context_packet_ids [], trust_score 100.
Verified by: npm test; node mcp/dist/cli.js audit --project . --json; node mcp/dist/cli.js inbox --project . --json

# Citations

[1] explicit_capture (2026-05-05T21:01:49.574Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:generated-repo-map-and-change-memory-packets-need-structured-context-17780149095","title":"Generated repo-map and change-memory packets need structured context","summary":"Fact: Kage generated repo map packets and branch change memory packets should include structured engineering context, not just prose. Why: audit structured memory coverage should stay at 100 without requiring manual edit","body":"Fact: Kage-generated repo_map packets and branch change-memory packets should include structured engineering context, not just prose. Why: audit structured-memory coverage should stay at 100 without requiring manual edits to generated packets after refresh or PR summary. Action: createRepoOverviewPacket, createRepoStructurePacket, and createDiffChangeMemory now set fact, why, trigger, action, verification, risk_if_forgotten, and stale_when context. Risk if forgotten: future refresh/pr-summary runs can reintroduce missing_context audit items even when all hand-authored packets are structured.\nEvidence: CLI audit after packet and generator updates reported structured_packets 43/43, missing_context_packet_ids [], trust_score 100.\nVerified by: npm test; node mcp/dist/cli.js audit --project . --json; node mcp/dist/cli.js inbox --project . --json","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","audit","memory-admission","generated-memory","structured-context"],"paths":["mcp/kernel.ts","mcp/kernel.test.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-05T21:01:49.574Z"}],"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:19.798Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"inbox","kind":"constant","sha256":"9d2097586a2527bfa63d55306c098fda29e1c3530771833e9aca5f986632d367"},{"name":"createrepooverviewpacket","kind":"function","sha256":"f5b8138480f9a600a18b8cdd36f72fcf1c01409128cb46c4ca1506820c466724"},{"name":"createrepostructurepacket","kind":"function","sha256":"2bbcf0952a8022ff4a3aea713326d8e4263a0a99d80e9ed2ee2914b7b68f99f6"},{"name":"fact","kind":"constant","sha256":"adb9d6a773dc4dacf5613a3e7d4225436f1a23ff67de02659a247304284b10c6"},{"name":"verification","kind":"constant","sha256":"faeb54eb75a6e60ebcab087f39fdd9f971c8a3a16e25846647ab2dd5802748f3"},{"name":"risk","kind":"constant","sha256":"d8cefa2e26411c9cf6d7857bd9ff15e58ab6ff3e5ed30b4531801e725978a06d"},{"name":"after","kind":"constant","sha256":"220a1c1969c37d53268e215419dcea650ffa901162d0a25e451bd90831fb0a1b"},{"name":"prose","kind":"constant","sha256":"570d1549dc852a511096fb2055e7e1f1a834049430cf322b73d634413c8ff9b8"},{"name":"creatediffchangememory","kind":"function","sha256":"345c7198a6f5598aafab9cfcbcb523a4f9846be7dca0603fafd7866495efb231"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"},{"name":"when","kind":"constant","sha256":"48bfd58b3cdbf2d407e4443b90727d548d96eceaa4372c099dcd22c52f498452"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"packets","kind":"constant","sha256":"f28a69afbf5d7a988e351fc5446a3b291a2451f97b8220c4e1a7629b3a50ffa3"},{"name":"manual","kind":"constant","sha256":"f8502a2f13344d0dc48912357b32bd77516b46c56e970206fce7993703ff91bf"},{"name":"inbox","kind":"constant","sha256":"464a16980ca2a8d111706a50d8804e272daeb29f848c44faa47c005822a4a501"},{"name":"reported","kind":"constant","sha256":"ec1c76f9f75507520a36a6adfea93b5399da6eb62bda8c7532b81519cf56b1ff"}]}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":213,"reverified_at":"2026-06-15T21:58:19.798Z"},"created_at":"2026-05-05T21:01:49.574Z","updated_at":"2026-06-15T21:58:19.798Z"}
```

