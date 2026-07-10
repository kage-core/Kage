---
type: "Runbook"
title: "Run Kage MCP tests"
description: "Fact: Run the Kage MCP package test suite from the mcp directory with npm test, or from the repo root with npm test prefix mcp. Why: The test script builds TypeScript first and then runs node test over dist/ / .test.js,"
resource: "mcp/package.json"
tags: ["session-learning", "tests", "runbook", "mcp", "verification"]
timestamp: "2026-06-15T21:58:08.356Z"
x-kage-id: "repo:https-github-com-kage-core-kage:runbook:run-kage-mcp-tests-1778039925946"
x-kage-type: "runbook"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/package.json", "mcp/kernel.test.ts", "mcp/mcp.test.ts", "mcp/registry.test.ts"]
---

# Run Kage MCP tests

> Fact: Run the Kage MCP package test suite from the mcp directory with npm test, or from the repo root with npm test p…

Fact: Run the Kage MCP package test suite from the mcp directory with npm test, or from the repo root with npm test --prefix mcp. Why: The test script builds TypeScript first and then runs node --test over dist/**/*.test.js, so it verifies both compilation and behavior. Trigger: Recall when asked how to run tests, verify recall/ranking changes, or check MCP package behavior. Action: Use npm test in mcp for the full package suite; use node --check mcp/viewer/app.js for a quick browser viewer syntax check after viewer-only edits. Risk if forgotten: Agents may cite old release proof memories that mention tests without giving the actual command.
Evidence: mcp/package.json defines test as npm run build && node --test dist/**/*.test.js.
Verified by: npm test

## Why

The test script builds TypeScript first and then runs node --test over dist/**/*.test.js, so it verifies both compilation and behavior.

## Trigger

Recall when asked how to run tests, verify recall/ranking changes, or check MCP package behavior.

## Action

Use npm test in mcp for the full package suite; use node --check mcp/viewer/app.js for a quick browser viewer syntax check after viewer-only edits.

## Verification

mcp/package.json defines test as npm run build && node --test dist/**/*.test.js.

## Risk if forgotten

Agents may cite old release proof memories that mention tests without giving the actual command.

# Citations

[1] explicit_capture (2026-05-06T03:58:45.946Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:runbook:run-kage-mcp-tests-1778039925946","title":"Run Kage MCP tests","summary":"Fact: Run the Kage MCP package test suite from the mcp directory with npm test, or from the repo root with npm test prefix mcp. Why: The test script builds TypeScript first and then runs node test over dist/ / .test.js,","body":"Fact: Run the Kage MCP package test suite from the mcp directory with npm test, or from the repo root with npm test --prefix mcp. Why: The test script builds TypeScript first and then runs node --test over dist/**/*.test.js, so it verifies both compilation and behavior. Trigger: Recall when asked how to run tests, verify recall/ranking changes, or check MCP package behavior. Action: Use npm test in mcp for the full package suite; use node --check mcp/viewer/app.js for a quick browser viewer syntax check after viewer-only edits. Risk if forgotten: Agents may cite old release proof memories that mention tests without giving the actual command.\nEvidence: mcp/package.json defines test as npm run build && node --test dist/**/*.test.js.\nVerified by: npm test","type":"runbook","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","tests","runbook","mcp","verification"],"paths":["mcp/package.json","mcp/kernel.test.ts","mcp/mcp.test.ts","mcp/registry.test.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-05-06T03:58:45.946Z"}],"context":{"fact":"Run the Kage MCP package test suite from the mcp directory with npm test, or from the repo root with npm test --prefix mcp.","why":"The test script builds TypeScript first and then runs node --test over dist/**/*.test.js, so it verifies both compilation and behavior.","trigger":"Recall when asked how to run tests, verify recall/ranking changes, or check MCP package behavior.","action":"Use npm test in mcp for the full package suite; use node --check mcp/viewer/app.js for a quick browser viewer syntax check after viewer-only edits.","verification":"mcp/package.json defines test as npm run build && node --test dist/**/*.test.js.","risk_if_forgotten":"Agents may cite old release proof memories that mention tests without giving the actual command."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:08.356Z","verification":"repo_local_agent_capture","path_fingerprints":[{"path":"mcp/package.json","sha256":"e77b80c8e3ef4eb7ccdf9f7dc775b51f18f1a7994092b538f81df874e8c91c5a","size":1193},{"path":"mcp/kernel.test.ts","sha256":"f36a1d0dfbc7d5b07d8eb3b6a8fa27993044f052d48622ccbac330cf35b705ec","size":290526,"symbols":[{"name":"root","kind":"constant","sha256":"54a6ff27b2242246917558965c17ead6799dd35dd11036cd210be20c06eb14e8"},{"name":"full","kind":"constant","sha256":"6270b632fb8c1ec230ad23878da137aab65feab7105ddd15ff76a1d27e5b5b44"}]},{"path":"mcp/mcp.test.ts","sha256":"3f5e52ad72a2a4b4db9e8de8bdad60cfb622ec132c2a278523ca6aad79538ec0","size":37910,"symbols":[{"name":"check","kind":"constant","sha256":"620d8c4c121a80c990afb6b6c9d3145a945f6c38957782dcfc0b0632ffe8c087"},{"name":"verify","kind":"constant","sha256":"f02dccd643285312f814c4b1bb8a3a55842d18807ca5dda55e9788cd21fd99a2"}]},{"path":"mcp/registry.test.ts","sha256":"5a5f9f8f1a493d1bc1e2cf608e5005427348ce4e941be2f97c3dbe45097a3325","size":4615}]},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":1,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":191,"reverified_at":"2026-06-15T21:58:08.356Z","total_uses":0,"last_accessed_at":"2026-07-09T21:55:55.350Z"},"created_at":"2026-05-06T03:58:45.946Z","updated_at":"2026-07-03T16:16:26.741Z"}
```

