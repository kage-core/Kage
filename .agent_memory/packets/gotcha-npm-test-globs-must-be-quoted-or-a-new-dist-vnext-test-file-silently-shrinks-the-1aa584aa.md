---
type: "Gotcha"
title: "npm test globs must be quoted or a new dist/vnext test file silently shrinks the suite"
description: "mcp/package.json's test script used an UNQUOTED glob: node test dist/ / .test.js . sh has no globstar, so it expanded as a single i.e. dist/ / .test.js . Until Phase A there was no test file exactly one directory below d"
resource: "mcp/package.json"
tags: ["session-learning", "testing", "npm", "glob", "vnext", "ci"]
timestamp: "2026-07-14T21:20:28.740Z"
x-kage-id: "repo:kage-vnext-implementation:gotcha:npm-test-globs-must-be-quoted-or-a-new-dist-vnext-test-file-silently-shrinks-the"
x-kage-type: "gotcha"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/package.json", "mcp/vnext/phase-a-gate.test.ts"]
---

# npm test globs must be quoted or a new dist/vnext test file silently shrinks the suite

> mcp/package.json's test script used an UNQUOTED glob: node test dist/ / .test.js . sh has no globstar, so it expanded…

mcp/package.json's test script used an UNQUOTED glob: `node --test dist/**/*.test.js`. sh has no globstar, so it expanded `**` as a single `*` (i.e. `dist/*/*.test.js`). Until Phase A there was no test file exactly one directory below dist/, so the pattern matched nothing, sh passed it through literally, and node did its own (correct, recursive) globbing — 632 tests. Adding mcp/vnext/phase-a-gate.test.ts created dist/vnext/phase-a-gate.test.js, which the sh pattern DOES match, so sh expanded it to that single file and `npm test --prefix mcp` silently ran 5 tests instead of 632 while still reporting success. Fix: quote the pattern in both scripts (`node --test 'dist/**/*.test.js'`, `node --test 'dist/vnext/**/*.test.js'`) so node always does the globbing. Any future test file placed exactly one level under dist/ would have re-triggered this. Verified: quoted script runs 637 tests (632 baseline + 5 Phase A gate tests) plus 12 dogfood.
Evidence: `npm test --prefix mcp` reported 5/5 pass with the unquoted glob after adding dist/vnext/phase-a-gate.test.js, and 637/637 + 12/12 dogfood after quoting it.
Verified by: npm test --prefix mcp

## Verification

`npm test --prefix mcp` reported 5/5 pass with the unquoted glob after adding dist/vnext/phase-a-gate.test.js, and 637/637 + 12/12 dogfood after quoting it.

# Citations

[1] explicit_capture (2026-07-14T21:20:28.740Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:kage-vnext-implementation:gotcha:npm-test-globs-must-be-quoted-or-a-new-dist-vnext-test-file-silently-shrinks-the","title":"npm test globs must be quoted or a new dist/vnext test file silently shrinks the suite","summary":"mcp/package.json's test script used an UNQUOTED glob: node test dist/ / .test.js . sh has no globstar, so it expanded as a single i.e. dist/ / .test.js . Until Phase A there was no test file exactly one directory below d","body":"mcp/package.json's test script used an UNQUOTED glob: `node --test dist/**/*.test.js`. sh has no globstar, so it expanded `**` as a single `*` (i.e. `dist/*/*.test.js`). Until Phase A there was no test file exactly one directory below dist/, so the pattern matched nothing, sh passed it through literally, and node did its own (correct, recursive) globbing — 632 tests. Adding mcp/vnext/phase-a-gate.test.ts created dist/vnext/phase-a-gate.test.js, which the sh pattern DOES match, so sh expanded it to that single file and `npm test --prefix mcp` silently ran 5 tests instead of 632 while still reporting success. Fix: quote the pattern in both scripts (`node --test 'dist/**/*.test.js'`, `node --test 'dist/vnext/**/*.test.js'`) so node always does the globbing. Any future test file placed exactly one level under dist/ would have re-triggered this. Verified: quoted script runs 637 tests (632 baseline + 5 Phase A gate tests) plus 12 dogfood.\nEvidence: `npm test --prefix mcp` reported 5/5 pass with the unquoted glob after adding dist/vnext/phase-a-gate.test.js, and 637/637 + 12/12 dogfood after quoting it.\nVerified by: npm test --prefix mcp","type":"gotcha","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","testing","npm","glob","vnext","ci"],"paths":["mcp/package.json","mcp/vnext/phase-a-gate.test.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-07-14T21:20:28.740Z"}],"context":{"fact":"mcp/package.json's test script used an UNQUOTED glob: `node --test dist/**/*.test.js`. sh has no globstar, so it expanded `**` as a single `*` (i.e. `dist/*/*.test.js`). Until Phase A there was no test file exactly one directory below dist/, so the pattern matched nothing, sh passed it through literally, and node did its own (correct, recursive) globbing — 632 tests. Adding mcp/vnext/phase-a-gate.test.ts created dist/vnext/phase-a-gate.test.js, which the sh pattern DOES match, so sh expanded it to that single file and `npm test --prefix mcp` silently ran 5 tests instead of 632 while still reporting success. Fix: quote the pattern in both scripts (`node --test 'dist/**/*.test.js'`, `node --test 'dist/vnext/**/*.test.js'`) so node always does the globbing. Any future test file placed exactly one level under dist/ would have re-triggered this. Verified: quoted script runs 637 tests (632 baseline + 5 Phase A gate tests) plus 12 dogfood.\nEvidence: `npm test --prefix mcp` reported 5/5 pass with the unquoted glob after adding dist/vnext/phase-a-gate.test.js, and 637/637 + 12/12 dogfood after quoting it.\nVerified by: npm test --prefix mcp","verification":"`npm test --prefix mcp` reported 5/5 pass with the unquoted glob after adding dist/vnext/phase-a-gate.test.js, and 637/637 + 12/12 dogfood after quoting it."},"freshness":{"ttl_days":365,"last_verified_at":"2026-07-14T21:20:28.740Z","path_fingerprints":[{"path":"mcp/package.json","sha256":"d97278bccc4ab89381ff4d502603bc808198827fbbf2dabbf5f80048131b0037","size":1787},{"path":"mcp/vnext/phase-a-gate.test.ts","sha256":"be0a7b72709006081e24374a2bbe1248db0ce3b8385a0fea4dc41af8cac1cc59","size":21675}],"path_fingerprint_policy":"source_hash_staleness","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"discovery_tokens":8000,"discovery_tokens_estimated":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"stale_reasons":[],"estimated_tokens_saved":287},"created_at":"2026-07-14T21:20:28.740Z","updated_at":"2026-07-14T21:20:28.740Z","author_branch":"codex/kage-vnext-implementation"}
```

