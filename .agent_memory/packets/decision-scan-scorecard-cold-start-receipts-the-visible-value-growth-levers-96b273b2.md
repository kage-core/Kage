---
type: "Decision"
title: "Scan scorecard + cold-start receipts: the visible-value growth levers"
description: "kage scan scorecard mcp/cli.ts scan handler + truthScorecardSvg/truthScorecardMarkdown in mcp/kernel.ts emits a shareable SVG/Markdown Truth Report card so the 60s scan is the top of funnel viral artifact. Cold start vis"
resource: "mcp/kernel.ts"
tags: ["session-learning", "growth", "scorecard", "cold-start", "claude-mem", "gtm"]
timestamp: "2026-06-20T12:09:27.760Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:scan-scorecard-cold-start-receipts-the-visible-value-growth-levers-1781558680465"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "verified"
x-kage-paths: ["mcp/kernel.ts", "mcp/cli.ts", "mcp/index.ts"]
---

# Scan scorecard + cold-start receipts: the visible-value growth levers

> kage scan scorecard mcp/cli.ts scan handler + truthScorecardSvg/truthScorecardMarkdown in mcp/kernel.ts emits a share…

kage scan --scorecard (mcp/cli.ts scan handler + truthScorecardSvg/truthScorecardMarkdown in mcp/kernel.ts) emits a shareable SVG/Markdown Truth Report card so the 60s scan is the top-of-funnel viral artifact. Cold-start visibility: kage_recall now appends a one-line Gains receipt from value_receipt (mcp/index.ts), and the AGENTS_POLICY (mcp/kernel.ts) has a 'Show the Value' section telling agents to relay gains. Rationale: Kage's value (verification, stale-withholding) is invisible at minute 1 and team-gated, while direct competitor claude-mem (65K+ stars vs Kage's 6) won on visible value + distribution. These levers make value felt immediately.
Evidence: kage scan --project . --scorecard renders an 820x388 SVG; 348 tests pass incl. 2 new scorecard tests; daemon viewer test updated for dashboard-default landing.
Verified by: npm test (348 pass), manual scan --scorecard run

## Why

Kage's value (verification, stale-withholding) is invisible at minute 1 and team-gated, while direct competitor claude-mem (65K+ stars vs Kage's 6) won on visible value + distribution. These levers make value felt immediately.

## Verification

kage scan --project . --scorecard renders an 820x388 SVG; 348 tests pass incl. 2 new scorecard tests; daemon viewer test updated for dashboard-default landing.

# Citations

[1] explicit_capture (2026-06-15T21:24:40.465Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:scan-scorecard-cold-start-receipts-the-visible-value-growth-levers-1781558680465","title":"Scan scorecard + cold-start receipts: the visible-value growth levers","summary":"kage scan scorecard mcp/cli.ts scan handler + truthScorecardSvg/truthScorecardMarkdown in mcp/kernel.ts emits a shareable SVG/Markdown Truth Report card so the 60s scan is the top of funnel viral artifact. Cold start vis","body":"kage scan --scorecard (mcp/cli.ts scan handler + truthScorecardSvg/truthScorecardMarkdown in mcp/kernel.ts) emits a shareable SVG/Markdown Truth Report card so the 60s scan is the top-of-funnel viral artifact. Cold-start visibility: kage_recall now appends a one-line Gains receipt from value_receipt (mcp/index.ts), and the AGENTS_POLICY (mcp/kernel.ts) has a 'Show the Value' section telling agents to relay gains. Rationale: Kage's value (verification, stale-withholding) is invisible at minute 1 and team-gated, while direct competitor claude-mem (65K+ stars vs Kage's 6) won on visible value + distribution. These levers make value felt immediately.\nEvidence: kage scan --project . --scorecard renders an 820x388 SVG; 348 tests pass incl. 2 new scorecard tests; daemon viewer test updated for dashboard-default landing.\nVerified by: npm test (348 pass), manual scan --scorecard run","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","growth","scorecard","cold-start","claude-mem","gtm"],"paths":["mcp/kernel.ts","mcp/cli.ts","mcp/index.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-06-15T21:24:40.465Z"}],"context":{"fact":"kage scan --scorecard (mcp/cli.ts scan handler + truthScorecardSvg/truthScorecardMarkdown in mcp/kernel.ts) emits a shareable SVG/Markdown Truth Report card so the 60s scan is the top-of-funnel viral artifact. Cold-start visibility: kage_recall now appends a one-line Gains receipt from value_receipt (mcp/index.ts), and the AGENTS_POLICY (mcp/kernel.ts) has a 'Show the Value' section telling agents to relay gains. Rationale: Kage's value (verification, stale-withholding) is invisible at minute 1 and team-gated, while direct competitor claude-mem (65K+ stars vs Kage's 6) won on visible value + distribution. These levers make value felt immediately.\nEvidence: kage scan --project . --scorecard renders an 820x388 SVG; 348 tests pass incl. 2 new scorecard tests; daemon viewer test updated for dashboard-default landing.\nVerified by: npm test (348 pass), manual scan --scorecard run","why":"Kage's value (verification, stale-withholding) is invisible at minute 1 and team-gated, while direct competitor claude-mem (65K+ stars vs Kage's 6) won on visible value + distribution. These levers make value felt immediately.","verification":"kage scan --project . --scorecard renders an 820x388 SVG; 348 tests pass incl. 2 new scorecard tests; daemon viewer test updated for dashboard-default landing."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-20T12:09:27.760Z","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"d312499b5646e0a66e9ef329b56515626d0262a14bc33c3afd51e6c482a642ec","size":861489,"symbols":[{"name":"agents_policy","kind":"constant","sha256":"a71442e4590eb17d0bbacbf262162e2207d9d731d6f8936acedf06ee1f0c600d"},{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"verification","kind":"constant","sha256":"faeb54eb75a6e60ebcab087f39fdd9f971c8a3a16e25846647ab2dd5802748f3"},{"name":"direct","kind":"constant","sha256":"853c29ac28fd41bb1a34289263ae3eabfaf28b886b3f7c125769cd1b80cf6b94"},{"name":"truthscorecardsvg","kind":"function","sha256":"98053a0d911b94ec3f473f3dab2d240028f247a51b3b529c4880ed6cdbc25e95"},{"name":"truthscorecardmarkdown","kind":"function","sha256":"d77d1cabfa950cc92ce54cd2919f4fc2517443cf8ae7919c2f416f33f17f4d08"},{"name":"section","kind":"constant","sha256":"94139d33e03721319bcd2ffe4b54948b3d0a4bb19839ff90b5383343a1eb4a41"},{"name":"show","kind":"constant","sha256":"a1286db8e7ca4067e360ba4fb6da776faab1a9b50a1ce06dd8efb185376816f6"}]},{"path":"mcp/cli.ts","sha256":"71a8ba94e3be3f845c0ea955393db2402849dd1c96569aefe5c20356d443a777","size":115942,"symbols":[{"name":"index","kind":"constant","sha256":"c201ee64cf24065dd2ba0bbdc7ff8399e5c1dd89783820e501d28f82019f08a8"},{"name":"value","kind":"constant","sha256":"c9560c65b946f6f8269de6cb5d49d3bb0dbabec6fb3119c445ad738f194d37ba"},{"name":"report","kind":"constant","sha256":"8d05d375165d2273c6ec769d9538b412b0d08e00b21207889ab726b110c4ab04"},{"name":"from","kind":"constant","sha256":"b386d829bcacbd9e216c726f6dff71fc7d8a53aade383fa45b850387414b780c"}]},{"path":"mcp/index.ts","sha256":"7347b408c41d2eb2e9b6b8929098b4cbf2d70bf63fd75ad7b9d9f80c4ba1fe58","size":74677,"symbols":[{"name":"index","kind":"constant","sha256":"ad98a75521fc0edce4fed6c6cd0503a41df66728efc44c4c3904db6a6ac89d7f"},{"name":"gains","kind":"constant","sha256":"f1d801ddc8d3cecd2971dc54faf9a98ccc489baeca14cb0b1d9ea6763e239fdb"},{"name":"receipt","kind":"constant","sha256":"14d180864a23d0a4b567585d787f486a8228a091d06ae18ac123027f2b6f6494"}]}],"path_fingerprint_policy":"source_hash_staleness","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"discovery_tokens":4000,"discovery_tokens_estimated":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":222,"reverified_at":"2026-06-20T12:09:27.760Z"},"created_at":"2026-06-15T21:24:40.465Z","updated_at":"2026-06-20T12:09:27.760Z","author_branch":"master"}
```

