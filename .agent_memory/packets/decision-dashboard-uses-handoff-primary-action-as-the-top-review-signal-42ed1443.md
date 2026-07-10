---
type: "Decision"
title: "Dashboard uses handoff primary action as the top review signal"
description: "Kage handoff reports now include primary action so the CLI, MCP, and viewer dashboard can show one next action instead of recomputing scattered inbox/lifecycle state. The overview Review card and dashboard chart should p"
resource: "mcp/kernel.ts"
tags: ["session-learning"]
timestamp: "2026-06-15T21:57:55.517Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:dashboard-uses-handoff-primary-action-as-the-top-review-signal-1779056819471"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/kernel.test.ts", "mcp/cli.ts", "mcp/mcp.test.ts"]
---

# Dashboard uses handoff primary action as the top review signal

> Kage handoff reports now include primary action so the CLI, MCP, and viewer dashboard can show one next action instea…

Kage handoff reports now include primary_action so the CLI, MCP, and viewer dashboard can show one next action instead of recomputing scattered inbox/lifecycle state. The overview Review card and dashboard chart should prefer reports/handoff.json when present, then fall back to legacy inbox counts if the report is missing.

# Citations

[1] explicit_capture (2026-05-17T22:26:59.471Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:dashboard-uses-handoff-primary-action-as-the-top-review-signal-1779056819471","title":"Dashboard uses handoff primary action as the top review signal","summary":"Kage handoff reports now include primary action so the CLI, MCP, and viewer dashboard can show one next action instead of recomputing scattered inbox/lifecycle state. The overview Review card and dashboard chart should p","body":"Kage handoff reports now include primary_action so the CLI, MCP, and viewer dashboard can show one next action instead of recomputing scattered inbox/lifecycle state. The overview Review card and dashboard chart should prefer reports/handoff.json when present, then fall back to legacy inbox counts if the report is missing.","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning"],"paths":["mcp/kernel.ts","mcp/kernel.test.ts","mcp/cli.ts","mcp/mcp.test.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-17T22:26:59.471Z"}],"context":{"fact":"Kage handoff reports now include primary_action so the CLI, MCP, and viewer dashboard can show one next action instead of recomputing scattered inbox/lifecycle state. The overview Review card and dashboard chart should prefer reports/handoff.json when present, then fall back to legacy inbox counts if the report is missing."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:57:55.517Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"inbox","kind":"constant","sha256":"9d2097586a2527bfa63d55306c098fda29e1c3530771833e9aca5f986632d367"},{"name":"lifecycle","kind":"constant","sha256":"4c9035caf232fe3c21c75eb26521182ed429c6816d1c52ca6290dee9b611a22c"},{"name":"overview","kind":"constant","sha256":"6691e20a2b423993edd98fa4b755318f396be4b57b9b459ead1a30e135be8b79"},{"name":"handoff","kind":"constant","sha256":"7ca82bf8dfe8bd9cc41cf7de6d3a0421c3753588836a81fddf5ba5e62ae2781f"},{"name":"then","kind":"constant","sha256":"69e63ba481d1d2641d270176aed93aa51e363bcfe7c9903c448b032adf4c4129"},{"name":"present","kind":"constant","sha256":"b0fc5057457202bcbc10dd345333192f2bfeefdd0cd200d8c52d37c6444a3435"},{"name":"when","kind":"constant","sha256":"48bfd58b3cdbf2d407e4443b90727d548d96eceaa4372c099dcd22c52f498452"},{"name":"show","kind":"constant","sha256":"a1286db8e7ca4067e360ba4fb6da776faab1a9b50a1ce06dd8efb185376816f6"},{"name":"state","kind":"constant","sha256":"065fd1c87ce12edcfec7baca76dc9d91e35f5ea16490d33c8f85f3bdc3fee185"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"overview","kind":"constant","sha256":"6700635ee7ea9cfa9e51d15137278a037598090f185f0aafbe71e09328dbaf42"},{"name":"lifecycle","kind":"constant","sha256":"9f072568c810ab64d315680c1dc78ce6e9d4499e2deea72f9e23f31436029fec"},{"name":"inbox","kind":"constant","sha256":"464a16980ca2a8d111706a50d8804e272daeb29f848c44faa47c005822a4a501"},{"name":"missing","kind":"constant","sha256":"8c9fa6e4673545533b5cdc9a6ac45e775f0fb7ec7d969a7602c2d97d1411b01e"},{"name":"signal","kind":"constant","sha256":"f084f4945e43a881cf04b4d6eff63df1f052d4d6e933b089af3696e2bc699289"}]},{"path":"mcp/cli.ts","sha256":"a670bc601e227372c9ab3e862f4e25fa87ae4bfa90b63c3bbc61032d332da0d7","size":114201,"symbols":[{"name":"review","kind":"function","sha256":"cd5b65cd476d7eaecccc181de3bcad5b3d7c99237dcbfce313709f8eb35f9a13"},{"name":"report","kind":"constant","sha256":"8d05d375165d2273c6ec769d9538b412b0d08e00b21207889ab726b110c4ab04"},{"name":"json","kind":"constant","sha256":"9115381310c6d4c5ecb25a7e67e4fd0bb4b20a9b328adb25b606065454f79370"},{"name":"missing","kind":"constant","sha256":"1f67f0b431b553dcc4e02753e1a22a41a1e80566f743e181f9c8c7fe1d240f02"}]},{"path":"mcp/mcp.test.ts","sha256":"3f5e52ad72a2a4b4db9e8de8bdad60cfb622ec132c2a278523ca6aad79538ec0","size":37910,"symbols":[{"name":"inbox","kind":"constant","sha256":"43a6178922ce20d835ab94dca4da7b06f4952745f44daa60c9ef75c3fd47f595"},{"name":"lifecycle","kind":"constant","sha256":"37df63179d0072ad21b8d8c67da947cec27f4c81f666798c095e516cc4693bf1"},{"name":"handoff","kind":"constant","sha256":"6e642ea18b921bf9e4422b55c079a9ebbff15c8bb2283a47aefa4f35e21948b7"}]}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":81,"reverified_at":"2026-06-15T21:57:55.517Z","total_uses":0,"last_accessed_at":"2026-07-09T06:11:50.133Z"},"created_at":"2026-05-17T22:26:59.471Z","updated_at":"2026-07-03T16:16:26.702Z"}
```

