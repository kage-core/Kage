---
type: "Decision"
title: "PR checks now block undistilled session learnings"
description: "After comparing automatic session-capture workflows, Kage now makes observed but undistilled live session learnings part of merge readiness. prCheck calls kageSessionCaptureReport and fails when any session has durab"
resource: "mcp/kernel.ts"
tags: ["session-learning", "session-distillation", "pr-check"]
timestamp: "2026-06-15T21:58:40.256Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:pr-checks-now-block-undistilled-session-learnings-1779058360638"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/kernel.test.ts"]
---

# PR checks now block undistilled session learnings

> After comparing automatic session-capture workflows, Kage now makes observed but undistilled live session learnings p…

After comparing automatic session-capture workflows, Kage now makes observed but undistilled live-session learnings part of merge readiness. prCheck calls kageSessionCaptureReport and fails when any session has durable observations, adding the existing kage distill command as a required action. This preserves Kage's repo-local collaborative memory model: raw observations remain telemetry, but durable learnings must be distilled into reviewable memory packets before handoff or merge.
Verified by: npm test --prefix mcp -- --test-name-pattern 'pr check blocks when observed session learnings still need distillation'; node --check mcp/viewer/app.js; node --check docs/viewer/app.js; git diff --check

## Verification

npm test --prefix mcp -- --test-name-pattern 'pr check blocks when observed session learnings still need distillation'; node --check mcp/viewer/app.js; node --check docs/viewer/app.js; git diff --check

# Citations

[1] explicit_capture (2026-05-17T22:52:40.638Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:pr-checks-now-block-undistilled-session-learnings-1779058360638","title":"PR checks now block undistilled session learnings","summary":"After comparing automatic session-capture workflows, Kage now makes observed but undistilled live session learnings part of merge readiness. prCheck calls kageSessionCaptureReport and fails when any session has durab","body":"After comparing automatic session-capture workflows, Kage now makes observed but undistilled live-session learnings part of merge readiness. prCheck calls kageSessionCaptureReport and fails when any session has durable observations, adding the existing kage distill command as a required action. This preserves Kage's repo-local collaborative memory model: raw observations remain telemetry, but durable learnings must be distilled into reviewable memory packets before handoff or merge.\nVerified by: npm test --prefix mcp -- --test-name-pattern 'pr check blocks when observed session learnings still need distillation'; node --check mcp/viewer/app.js; node --check docs/viewer/app.js; git diff --check","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","session-distillation","pr-check"],"paths":["mcp/kernel.ts","mcp/kernel.test.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-17T22:52:40.638Z"}],"context":{"fact":"After comparing automatic session-capture workflows, Kage now makes observed but undistilled live-session learnings part of merge readiness. prCheck calls kageSessionCaptureReport and fails when any session has durable observations, adding the existing kage distill command as a required action. This preserves Kage's repo-local collaborative memory model: raw observations remain telemetry, but durable learnings must be distilled into reviewable memory packets before handoff or merge.\nVerified by: npm test --prefix mcp -- --test-name-pattern 'pr check blocks when observed session learnings still need distillation'; node --check mcp/viewer/app.js; node --check docs/viewer/app.js; git diff --check","verification":"npm test --prefix mcp -- --test-name-pattern 'pr check blocks when observed session learnings still need distillation'; node --check mcp/viewer/app.js; node --check docs/viewer/app.js; git diff --check"},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:40.256Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"reviewable","kind":"constant","sha256":"7390bf680c26d9c8a7223c5694a99b61f4bbcf0e0ef69f28464df147fddebd84"},{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"workflows","kind":"constant","sha256":"2ea5d179e38ba32bc55cd3ed4129070588de07856ed1a212774c8a9c0515bfc6"},{"name":"handoff","kind":"constant","sha256":"7ca82bf8dfe8bd9cc41cf7de6d3a0421c3753588836a81fddf5ba5e62ae2781f"},{"name":"before","kind":"constant","sha256":"70c005bc3586ccb93799dfa1989dccca69b847916fd3fde1583578730922c50c"},{"name":"after","kind":"constant","sha256":"220a1c1969c37d53268e215419dcea650ffa901162d0a25e451bd90831fb0a1b"},{"name":"capture","kind":"function","sha256":"d6ab6995f6712c0c94fc325e5aaaf3f495bdd81ba660e115f3d467f89f93ef29"},{"name":"kagesessioncapturereport","kind":"function","sha256":"d4500c8ace694771cc7914d5a21ca649d103fecb4eef9fdea19448e901b4c455"},{"name":"durable","kind":"constant","sha256":"3fa48acfe2e95fa0fcf831049f2d1aa3ddf26ddc5a1d10724db5da185389e634"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"},{"name":"prcheck","kind":"function","sha256":"fbea9ed798181ef8f23f872e1e18ef1514461f7cea65039fb31d9d6f6e30acb0"},{"name":"when","kind":"constant","sha256":"48bfd58b3cdbf2d407e4443b90727d548d96eceaa4372c099dcd22c52f498452"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"packets","kind":"constant","sha256":"f28a69afbf5d7a988e351fc5446a3b291a2451f97b8220c4e1a7629b3a50ffa3"},{"name":"calls","kind":"constant","sha256":"4b435c2c9448e76bfa4e3a1f26d4c8c42059b4125bd76c0254a3af23bacd66a4"},{"name":"block","kind":"constant","sha256":"0d5a18486daa1bf0551606173de332fbb51d44808bbbaf97560dd6a843388b08"},{"name":"name","kind":"constant","sha256":"081c81b8ff45c590015f81a59547f9e3c7167d240fc7840015e0afccc683b329"}]}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":177,"reverified_at":"2026-06-15T21:58:40.256Z","total_uses":0,"last_accessed_at":"2026-07-02T12:34:33.817Z"},"created_at":"2026-05-17T22:52:40.638Z","updated_at":"2026-07-03T16:16:26.710Z"}
```

