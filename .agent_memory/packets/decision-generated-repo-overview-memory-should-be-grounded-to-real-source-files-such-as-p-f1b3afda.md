---
type: "Decision"
title: "Generated repo overview memory should be grounded to real source files such as package.jso"
description: "Generated repo overview memory should be grounded to real source files such as package.json and README.md, not a broad synthetic root path. The lifecycle and handoff reports treat broad or missing paths as ungrounded, wh"
resource: "mcp/kernel.ts"
tags: ["session-learning", "generated-memory", "grounding", "handoff", "dashboard"]
timestamp: "2026-06-15T21:58:18.291Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:generated-repo-overview-memory-should-be-grounded-to-real-source-files-such-as-p"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/kernel.test.ts"]
---

# Generated repo overview memory should be grounded to real source files such as package.jso

> Generated repo overview memory should be grounded to real source files such as package.json and README.md, not a broa…

Generated repo overview memory should be grounded to real source files such as package.json and README.md, not a broad synthetic root path. The lifecycle and handoff reports treat broad or missing paths as ungrounded, which keeps the dashboard in a warning state even when the memory body is useful. The generator now adds package.json and README.md when present, and the regression is covered in mcp/kernel.test.ts.
Verified by: npm test --prefix mcp

## Verification

npm test --prefix mcp

# Citations

[1] explicit_capture (2026-05-17T22:35:06.617Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:generated-repo-overview-memory-should-be-grounded-to-real-source-files-such-as-p","title":"Generated repo overview memory should be grounded to real source files such as package.jso","summary":"Generated repo overview memory should be grounded to real source files such as package.json and README.md, not a broad synthetic root path. The lifecycle and handoff reports treat broad or missing paths as ungrounded, wh","body":"Generated repo overview memory should be grounded to real source files such as package.json and README.md, not a broad synthetic root path. The lifecycle and handoff reports treat broad or missing paths as ungrounded, which keeps the dashboard in a warning state even when the memory body is useful. The generator now adds package.json and README.md when present, and the regression is covered in mcp/kernel.test.ts.\nVerified by: npm test --prefix mcp","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","generated-memory","grounding","handoff","dashboard"],"paths":["mcp/kernel.ts","mcp/kernel.test.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-17T22:35:06.617Z"}],"context":{"fact":"Generated repo overview memory should be grounded to real source files such as package.json and README.md, not a broad synthetic root path. The lifecycle and handoff reports treat broad or missing paths as ungrounded, which keeps the dashboard in a warning state even when the memory body is useful. The generator now adds package.json and README.md when present, and the regression is covered in mcp/kernel.test.ts.\nVerified by: npm test --prefix mcp","verification":"npm test --prefix mcp"},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:18.291Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"lifecycle","kind":"constant","sha256":"4c9035caf232fe3c21c75eb26521182ed429c6816d1c52ca6290dee9b611a22c"},{"name":"readme","kind":"constant","sha256":"aa0f002dd3f57a6ca1e42c5aba625151268ed600bbbd7582f93a0a0bc7714404"},{"name":"overview","kind":"constant","sha256":"6691e20a2b423993edd98fa4b755318f396be4b57b9b459ead1a30e135be8b79"},{"name":"handoff","kind":"constant","sha256":"7ca82bf8dfe8bd9cc41cf7de6d3a0421c3753588836a81fddf5ba5e62ae2781f"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"},{"name":"present","kind":"constant","sha256":"b0fc5057457202bcbc10dd345333192f2bfeefdd0cd200d8c52d37c6444a3435"},{"name":"when","kind":"constant","sha256":"48bfd58b3cdbf2d407e4443b90727d548d96eceaa4372c099dcd22c52f498452"},{"name":"state","kind":"constant","sha256":"065fd1c87ce12edcfec7baca76dc9d91e35f5ea16490d33c8f85f3bdc3fee185"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"overview","kind":"constant","sha256":"6700635ee7ea9cfa9e51d15137278a037598090f185f0aafbe71e09328dbaf42"},{"name":"ungrounded","kind":"constant","sha256":"2e58022ec125182b43c2eafab83aa5e017316164a4c3b1517494b024f79401dd"},{"name":"lifecycle","kind":"constant","sha256":"9f072568c810ab64d315680c1dc78ce6e9d4499e2deea72f9e23f31436029fec"},{"name":"real","kind":"constant","sha256":"856bf47487b3742dc24d08df1d5fbdb66e78329577cae25b2d31af5ccc9aade1"},{"name":"body","kind":"constant","sha256":"86c3abc23bd7873dfd4cd604a3b20a7bc2ead9b796fa0130c0231824e123d7f4"},{"name":"root","kind":"constant","sha256":"54a6ff27b2242246917558965c17ead6799dd35dd11036cd210be20c06eb14e8"},{"name":"grounded","kind":"constant","sha256":"390d7b1397bf40e02d5629ee431eab89184212ea30adce1e4561137413208e0e"},{"name":"missing","kind":"constant","sha256":"8c9fa6e4673545533b5cdc9a6ac45e775f0fb7ec7d969a7602c2d97d1411b01e"}]}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":113,"reverified_at":"2026-06-15T21:58:18.291Z","total_uses":0,"last_accessed_at":"2026-07-01T17:49:58.651Z"},"created_at":"2026-05-17T22:35:06.617Z","updated_at":"2026-07-03T16:16:26.704Z"}
```

