---
type: "Decision"
title: "Kage handoff now treats observed sessions with durable distillation candidates as warning-"
description: "Kage handoff now treats observed sessions with durable distillation candidates as warning level handoff work. This closes an session-memory gap: live agent sessions can contain reusable commands, workflows, decisions,"
resource: "mcp/kernel.ts"
tags: ["session-learning", "handoff", "session-capture", "distillation", "collaboration"]
timestamp: "2026-06-15T21:57:59.226Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:kage-handoff-now-treats-observed-sessions-with-durable-distillation-candidates-a"
x-kage-type: "decision"
x-kage-status: "deprecated"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "deprecated"
x-kage-paths: ["mcp/kernel.ts", "mcp/kernel.test.ts", "mcp/cli.ts", "README.md", "mcp/README.md", "docs/guide.html"]
---

# Kage handoff now treats observed sessions with durable distillation candidates as warning-

> Kage handoff now treats observed sessions with durable distillation candidates as warning level handoff work. This cl…

Kage handoff now treats observed sessions with durable distillation candidates as warning-level handoff work. This closes an session-memory gap: live agent sessions can contain reusable commands, workflows, decisions, or issue context, and a teammate should not see handoff as clean until those observations are distilled into reviewable repo memory packets. The viewer Review card and handoff panel now show distillable session counts alongside open memory items, mutations, and lineage.
Verified by: npm test --prefix mcp; node --check mcp/viewer/app.js; node --check docs/viewer/app.js

## Verification

npm test --prefix mcp; node --check mcp/viewer/app.js; node --check docs/viewer/app.js

# Citations

[1] explicit_capture (2026-05-17T22:46:40.207Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:kage-handoff-now-treats-observed-sessions-with-durable-distillation-candidates-a","title":"Kage handoff now treats observed sessions with durable distillation candidates as warning-","summary":"Kage handoff now treats observed sessions with durable distillation candidates as warning level handoff work. This closes an session-memory gap: live agent sessions can contain reusable commands, workflows, decisions,","body":"Kage handoff now treats observed sessions with durable distillation candidates as warning-level handoff work. This closes an session-memory gap: live agent sessions can contain reusable commands, workflows, decisions, or issue context, and a teammate should not see handoff as clean until those observations are distilled into reviewable repo memory packets. The viewer Review card and handoff panel now show distillable session counts alongside open memory items, mutations, and lineage.\nVerified by: npm test --prefix mcp; node --check mcp/viewer/app.js; node --check docs/viewer/app.js","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"deprecated","confidence":0.7,"tags":["session-learning","handoff","session-capture","distillation","collaboration"],"paths":["mcp/kernel.ts","mcp/kernel.test.ts","mcp/cli.ts","README.md","mcp/README.md","docs/guide.html"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-17T22:46:40.207Z"}],"context":{"fact":"Kage handoff now treats observed sessions with durable distillation candidates as warning-level handoff work. This closes an session-memory gap: live agent sessions can contain reusable commands, workflows, decisions, or issue context, and a teammate should not see handoff as clean until those observations are distilled into reviewable repo memory packets. The viewer Review card and handoff panel now show distillable session counts alongside open memory items, mutations, and lineage.\nVerified by: npm test --prefix mcp; node --check mcp/viewer/app.js; node --check docs/viewer/app.js","verification":"npm test --prefix mcp; node --check mcp/viewer/app.js; node --check docs/viewer/app.js"},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:57:59.226Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"reviewable","kind":"constant","sha256":"7390bf680c26d9c8a7223c5694a99b61f4bbcf0e0ef69f28464df147fddebd84"},{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"lineage","kind":"constant","sha256":"d95fb2fcf60b740e0ead538d68698eb4a371f46b66a22e0d241a07ef5c085b6b"},{"name":"workflows","kind":"constant","sha256":"2ea5d179e38ba32bc55cd3ed4129070588de07856ed1a212774c8a9c0515bfc6"},{"name":"clean","kind":"function","sha256":"17cd330796a719d520826491a73ab88f886668a6f03c7ab8c85530d9cb3a996d"},{"name":"open","kind":"constant","sha256":"0e141db1bd4063f43eabda806012eb428696a10790060a85cc7d630a833958dd"},{"name":"level","kind":"constant","sha256":"832bbcc09db2b0a822fe5b0f77875aea29528b0343bffcb1c71cf2fe73b9aa5e"},{"name":"handoff","kind":"constant","sha256":"7ca82bf8dfe8bd9cc41cf7de6d3a0421c3753588836a81fddf5ba5e62ae2781f"},{"name":"durable","kind":"constant","sha256":"3fa48acfe2e95fa0fcf831049f2d1aa3ddf26ddc5a1d10724db5da185389e634"},{"name":"reusable","kind":"constant","sha256":"25d55e6960cd9587fcbd06fd5b7dea1bda1682bfebb66655dee486b114cfcb66"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"},{"name":"show","kind":"constant","sha256":"a1286db8e7ca4067e360ba4fb6da776faab1a9b50a1ce06dd8efb185376816f6"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"packets","kind":"constant","sha256":"f28a69afbf5d7a988e351fc5446a3b291a2451f97b8220c4e1a7629b3a50ffa3"},{"name":"issue","kind":"constant","sha256":"e588c193b4787ae8a3a2e9a91e0e30be327a5f1530fc90e3f937037feccda451"},{"name":"clean","kind":"constant","sha256":"605fd32dc244203f8b75cc8d139a154c77931988e5c575d85a3f17d5d7206d1b"}]},{"path":"mcp/cli.ts","sha256":"a670bc601e227372c9ab3e862f4e25fa87ae4bfa90b63c3bbc61032d332da0d7","size":114201,"symbols":[{"name":"review","kind":"function","sha256":"cd5b65cd476d7eaecccc181de3bcad5b3d7c99237dcbfce313709f8eb35f9a13"},{"name":"items","kind":"constant","sha256":"58773111fa0213a42f9e6c5e0a61d88bbbe2437579da81d45b817ed70e2ff039"},{"name":"agent","kind":"constant","sha256":"5b9caa614311fe691d6af171b9a8985b0d49464b9df178ad28ff5b9883eb4cf2"},{"name":"durable","kind":"constant","sha256":"59e1af86ee722f58562da0478f6f3fe6621ae96f9473de8c0037e63fe779215e"}]},{"path":"README.md","sha256":"9a533eee7962e84cdceef1bd8c9463233a575138fa143acafc8abd42f723944a","size":10477},{"path":"mcp/README.md","sha256":"5c852f608754e299c2cff74495862f1ce4775d0bda5776d7ce4f070f4e4a6494","size":10129},{"path":"docs/guide.html","sha256":"33b57e522b1a49e48631042940e2ca7d281084371c3feb3210604e213e0e7f28","size":51769}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":148,"reverified_at":"2026-06-15T21:57:59.226Z","stale":true,"stale_reasons":["packet status is deprecated"],"suggested_action":"mark_stale"},"created_at":"2026-05-17T22:46:40.207Z","updated_at":"2026-06-15T21:58:43.086Z"}
```

