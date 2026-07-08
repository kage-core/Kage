---
type: "Decision"
title: "Release 1.1.15 adds guarded npm release flow"
description: "Release 1.1.15 adds a guarded npm release helper and fixes memory only diff proposals. The release helper defaults to dry run unless publish is explicit, uses GIT EDITOR=true for git steps, fetches the current remote bra"
resource: "mcp/release.ts"
tags: ["session-learning", "release", "npm", "workflow", "propose", "git"]
timestamp: "2026-06-15T21:58:17.986Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:release-1-1-15-adds-guarded-npm-release-flow-1778050457712"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/release.ts", "mcp/release.test.ts", "mcp/kernel.ts", "mcp/kernel.test.ts", "mcp/package.json"]
---

# Release 1.1.15 adds guarded npm release flow

> Release 1.1.15 adds a guarded npm release helper and fixes memory only diff proposals. The release helper defaults to…

Release 1.1.15 adds a guarded npm release helper and fixes memory-only diff proposals. The release helper defaults to dry-run unless --publish is explicit, uses GIT_EDITOR=true for git steps, fetches the current remote branch, blocks when origin/<branch> is not an ancestor of HEAD, runs package tests and npm pack dry-run, can push before publish, verifies npm metadata, and can smoke install the published package. kage propose --from-diff now includes reviewable repo memory packet changes under .agent_memory/packets/*.json and .agent_memory/pending/*.json instead of filtering them as generated noise.
Evidence: Implemented in mcp/release.ts and mcp/kernel.ts with regression coverage in mcp/release.test.ts and mcp/kernel.test.ts.
Verified by: npm test --prefix mcp; npm --cache /private/tmp/kage-npm-cache pack --dry-run; npm view @kage-core/kage-graph-mcp version; npm view @kage-core/kage-graph-mcp@1.1.15 version returned 404 before publish

## Verification

Implemented in mcp/release.ts and mcp/kernel.ts with regression coverage in mcp/release.test.ts and mcp/kernel.test.ts.

# Citations

[1] explicit_capture (2026-05-06T06:54:17.712Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:release-1-1-15-adds-guarded-npm-release-flow-1778050457712","title":"Release 1.1.15 adds guarded npm release flow","summary":"Release 1.1.15 adds a guarded npm release helper and fixes memory only diff proposals. The release helper defaults to dry run unless publish is explicit, uses GIT EDITOR=true for git steps, fetches the current remote bra","body":"Release 1.1.15 adds a guarded npm release helper and fixes memory-only diff proposals. The release helper defaults to dry-run unless --publish is explicit, uses GIT_EDITOR=true for git steps, fetches the current remote branch, blocks when origin/<branch> is not an ancestor of HEAD, runs package tests and npm pack dry-run, can push before publish, verifies npm metadata, and can smoke install the published package. kage propose --from-diff now includes reviewable repo memory packet changes under .agent_memory/packets/*.json and .agent_memory/pending/*.json instead of filtering them as generated noise.\nEvidence: Implemented in mcp/release.ts and mcp/kernel.ts with regression coverage in mcp/release.test.ts and mcp/kernel.test.ts.\nVerified by: npm test --prefix mcp; npm --cache /private/tmp/kage-npm-cache pack --dry-run; npm view @kage-core/kage-graph-mcp version; npm view @kage-core/kage-graph-mcp@1.1.15 version returned 404 before publish","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","release","npm","workflow","propose","git"],"paths":["mcp/release.ts","mcp/release.test.ts","mcp/kernel.ts","mcp/kernel.test.ts","mcp/package.json"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-06T06:54:17.712Z"}],"context":{"fact":"Release 1.1.15 adds a guarded npm release helper and fixes memory-only diff proposals. The release helper defaults to dry-run unless --publish is explicit, uses GIT_EDITOR=true for git steps, fetches the current remote branch, blocks when origin/<branch> is not an ancestor of HEAD, runs package tests and npm pack dry-run, can push before publish, verifies npm metadata, and can smoke install the published package. kage propose --from-diff now includes reviewable repo memory packet changes under .agent_memory/packets/*.json and .agent_memory/pending/*.json instead of filtering them as generated noise.\nEvidence: Implemented in mcp/release.ts and mcp/kernel.ts with regression coverage in mcp/release.test.ts and mcp/kernel.test.ts.\nVerified by: npm test --prefix mcp; npm --cache /private/tmp/kage-npm-cache pack --dry-run; npm view @kage-core/kage-graph-mcp version; npm view @kage-core/kage-graph-mcp@1.1.15 version returned 404 before publish","verification":"Implemented in mcp/release.ts and mcp/kernel.ts with regression coverage in mcp/release.test.ts and mcp/kernel.test.ts."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:17.986Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/release.ts","sha256":"526ba31170e96dabcc315dced845f1955a4adf92ae338c75954de7d0d088fb3d","size":5908,"symbols":[{"name":"steps","kind":"constant","sha256":"b7bc2f27b14ea2d579e349481f07342c849d48511c698026c7b9fb093adc8f1b"},{"name":"branch","kind":"constant","sha256":"ea669aa964d877b0f98c3acecc471a6a2f0f953ab3bfab33192a7e937508fbf5"},{"name":"metadata","kind":"constant","sha256":"91c7c2d6576b6dd2141a895d43dff90fe80ace038ad2d6fe00d182b7d22d155a"}]},{"path":"mcp/release.test.ts","sha256":"01f83fe99a69fab52715ff2f55a03f7a44b7302b272031c4deecbd71d2d3022c","size":2434},{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"reviewable","kind":"constant","sha256":"7390bf680c26d9c8a7223c5694a99b61f4bbcf0e0ef69f28464df147fddebd84"},{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"explicit","kind":"constant","sha256":"3c7dc76a866b9617850dd05c43ef877cc5208ade5be761331cf32181ace414ff"},{"name":"before","kind":"constant","sha256":"70c005bc3586ccb93799dfa1989dccca69b847916fd3fde1583578730922c50c"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"},{"name":"when","kind":"constant","sha256":"48bfd58b3cdbf2d407e4443b90727d548d96eceaa4372c099dcd22c52f498452"}]},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"packets","kind":"constant","sha256":"f28a69afbf5d7a988e351fc5446a3b291a2451f97b8220c4e1a7629b3a50ffa3"},{"name":"install","kind":"constant","sha256":"dc096ab43157a463e0a489257385338aceddff942f6640b118f6191dfee9fc7f"},{"name":"pending","kind":"constant","sha256":"4da2f0224c36410c87348cd089aa57256945530e249ee63da194f3a1406848de"}]},{"path":"mcp/package.json","sha256":"e77b80c8e3ef4eb7ccdf9f7dc775b51f18f1a7994092b538f81df874e8c91c5a","size":1193}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":6,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":238,"reverified_at":"2026-06-15T21:58:17.986Z","total_uses":6,"last_accessed_at":"2026-07-08T20:55:10.721Z"},"created_at":"2026-05-06T06:54:17.712Z","updated_at":"2026-07-03T16:16:26.715Z"}
```

