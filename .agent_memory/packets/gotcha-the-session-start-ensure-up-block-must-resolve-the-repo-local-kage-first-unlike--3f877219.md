---
type: "Gotcha"
title: "The session-start ensure-up block must resolve the repo-local kage FIRST, unlike hookKageResolve"
description: "The auto attach \"Proxy ensure up\" block added to the session start hook deliberately uses a DIFFERENT resolver order from hookKageResolve. hookKageResolve tries PATH first fast , then the baked cli.js, then npx — right f"
resource: "mcp/kernel.ts"
tags: ["session-learning", "hooks", "auto-attach", "shell", "session-start"]
timestamp: "2026-07-22T19:50:24.601Z"
x-kage-id: "repo:memory:gotcha:the-session-start-ensure-up-block-must-resolve-the-repo-local-kage-first-unlike-"
x-kage-type: "gotcha"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/kernel.ts", "mcp/auto-attach.test.ts"]
---

# The session-start ensure-up block must resolve the repo-local kage FIRST, unlike hookKageResolve

> The auto attach "Proxy ensure up" block added to the session start hook deliberately uses a DIFFERENT resolver order …

The auto-attach "Proxy ensure-up" block added to the session-start hook deliberately uses a DIFFERENT resolver order from hookKageResolve. hookKageResolve tries PATH first (fast), then the baked cli.js, then npx — right for hooks, since any kage can write an index. Ensure-up is not like that: it must start the proxy built from THIS checkout, and a stale global kage on PATH silently no-oped it, so the ensure-up block resolves the repo-local dist FIRST and only then falls back. Two further traps hit while writing it: an octal escape inside the generating TypeScript template literal is a compile error, and because the hook runs under "set -euo pipefail" a sed substitution that matches nothing is FATAL — the "|| true" must sit INSIDE the substitution, not after the pipeline. The symptom of getting any of these wrong is identical and silent: the session starts, the hook exits 0, and no proxy is listening.
Evidence: Observed during auto-attach work: ensure-up no-oped because a stale global kage resolved first from PATH; separately the pipefail sed assignment aborted the hook before the ensure-up line ran.
Verified by: mcp/auto-attach.test.ts — 4/4, including an assertion on the generated ensure-up block content

## Verification

Observed during auto-attach work: ensure-up no-oped because a stale global kage resolved first from PATH; separately the pipefail sed assignment aborted the hook before the ensure-up line ran.

# Citations

[1] explicit_capture (2026-07-22T19:50:24.601Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:memory:gotcha:the-session-start-ensure-up-block-must-resolve-the-repo-local-kage-first-unlike-","title":"The session-start ensure-up block must resolve the repo-local kage FIRST, unlike hookKageResolve","summary":"The auto attach \"Proxy ensure up\" block added to the session start hook deliberately uses a DIFFERENT resolver order from hookKageResolve. hookKageResolve tries PATH first fast , then the baked cli.js, then npx — right f","body":"The auto-attach \"Proxy ensure-up\" block added to the session-start hook deliberately uses a DIFFERENT resolver order from hookKageResolve. hookKageResolve tries PATH first (fast), then the baked cli.js, then npx — right for hooks, since any kage can write an index. Ensure-up is not like that: it must start the proxy built from THIS checkout, and a stale global kage on PATH silently no-oped it, so the ensure-up block resolves the repo-local dist FIRST and only then falls back. Two further traps hit while writing it: an octal escape inside the generating TypeScript template literal is a compile error, and because the hook runs under \"set -euo pipefail\" a sed substitution that matches nothing is FATAL — the \"|| true\" must sit INSIDE the substitution, not after the pipeline. The symptom of getting any of these wrong is identical and silent: the session starts, the hook exits 0, and no proxy is listening.\nEvidence: Observed during auto-attach work: ensure-up no-oped because a stale global kage resolved first from PATH; separately the pipefail sed assignment aborted the hook before the ensure-up line ran.\nVerified by: mcp/auto-attach.test.ts — 4/4, including an assertion on the generated ensure-up block content","type":"gotcha","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","hooks","auto-attach","shell","session-start"],"paths":["mcp/kernel.ts","mcp/auto-attach.test.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-07-22T19:50:24.601Z"}],"context":{"fact":"The auto-attach \"Proxy ensure-up\" block added to the session-start hook deliberately uses a DIFFERENT resolver order from hookKageResolve. hookKageResolve tries PATH first (fast), then the baked cli.js, then npx — right for hooks, since any kage can write an index. Ensure-up is not like that: it must start the proxy built from THIS checkout, and a stale global kage on PATH silently no-oped it, so the ensure-up block resolves the repo-local dist FIRST and only then falls back. Two further traps hit while writing it: an octal escape inside the generating TypeScript template literal is a compile error, and because the hook runs under \"set -euo pipefail\" a sed substitution that matches nothing is FATAL — the \"|| true\" must sit INSIDE the substitution, not after the pipeline. The symptom of getting any of these wrong is identical and silent: the session starts, the hook exits 0, and no proxy is listening.\nEvidence: Observed during auto-attach work: ensure-up no-oped because a stale global kage resolved first from PATH; separately the pipefail sed assignment aborted the hook before the ensure-up line ran.\nVerified by: mcp/auto-attach.test.ts — 4/4, including an assertion on the generated ensure-up block content","verification":"Observed during auto-attach work: ensure-up no-oped because a stale global kage resolved first from PATH; separately the pipefail sed assignment aborted the hook before the ensure-up line ran."},"freshness":{"ttl_days":365,"last_verified_at":"2026-07-22T19:50:24.601Z","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"7aa42ecc2a0cca6cff930e25bac2c12e5b26bf211e245ff5cece6f57b1851e43","size":1007251},{"path":"mcp/auto-attach.test.ts","sha256":"1de33cb9751299016913f7f51d79ccb78003fd78ae2d06e32ca5adcefd6ccc96","size":3741}],"path_fingerprint_policy":"source_hash_staleness","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"discovery_tokens":8000,"discovery_tokens_estimated":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"stale_reasons":[],"estimated_tokens_saved":306},"created_at":"2026-07-22T19:50:24.601Z","updated_at":"2026-07-22T19:50:24.601Z","author_branch":"codex/kage-vnext-implementation","author_name":"Kushal Jain"}
```

