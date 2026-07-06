---
type: "Gotcha"
title: "kage proxy on Claude Code SUBSCRIPTION: base-url IS honored, but the OAuth path returns 429 (diagnosis open)"
description: "First live test of kage proxy against real Claude Code on a subscription OAuth, not an API key . Finding 1 good : Claude Code DOES honor ANTHROPIC BASE URL on subscription — the proxied request reached Anthropic an Anthr"
resource: "mcp/proxy.ts"
tags: ["session-learning", "proxy", "subscription", "oauth", "anthropic", "rate-limit", "diagnosis", "limitation"]
timestamp: "2026-07-06T18:44:45.927Z"
x-kage-id: "repo:https-github-com-kage-core-kage:gotcha:kage-proxy-on-claude-code-subscription-base-url-is-honored-but-the-oauth-path-re"
x-kage-type: "gotcha"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/proxy.ts"]
---

# kage proxy on Claude Code SUBSCRIPTION: base-url IS honored, but the OAuth path returns 429 (diagnosis open)

> First live test of kage proxy against real Claude Code on a subscription OAuth, not an API key . Finding 1 good : Cla…

First live test of kage proxy against real Claude Code on a subscription (OAuth, not an API key). Finding 1 (good): Claude Code DOES honor ANTHROPIC_BASE_URL on subscription — the proxied request reached Anthropic (an Anthropic-shaped error came back, not a connection failure), which rules out the worst-case scenario (base-url silently ignored on the subscription path). Finding 2 (problem): the request returned 'Server is temporarily limiting requests (not your usage limit)', which is an HTTP 429/529 overload. Cause not yet isolated: either a genuine transient Anthropic overload, or the proxy trips Anthropic's edge on the OAuth path. Prime proxy-side suspects: the accept-encoding identity override, and subscription requests carrying an anthropic-beta oauth header the edge may reject behind a non-standard connection. Open diagnostics: read the --verbose upstream status line, retry 2-3x (intermittent vs consistent), and A/B by unsetting ANTHROPIC_BASE_URL. Added --verbose logging to proxy.ts to surface upstream status + error body for exactly this.
Evidence: Live run: user asked a question through the proxy on subscription; Claude Code showed 'API Error: Server is temporarily limiting requests (not your usage limit)'. Confirms upstream was reached (Anthropic error surface, not ECONNREFUSED / no request).
Verified by: live run against Claude Code subscription 2026-07-07; --verbose diagnostic added to isolate next

## Verification

Live run: user asked a question through the proxy on subscription; Claude Code showed 'API Error: Server is temporarily limiting requests (not your usage limit)'. Confirms upstream was reached (Anthropic error surface, not ECONNREFUSED / no request).

# Citations

[1] explicit_capture (2026-07-06T18:44:45.927Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:gotcha:kage-proxy-on-claude-code-subscription-base-url-is-honored-but-the-oauth-path-re","title":"kage proxy on Claude Code SUBSCRIPTION: base-url IS honored, but the OAuth path returns 429 (diagnosis open)","summary":"First live test of kage proxy against real Claude Code on a subscription OAuth, not an API key . Finding 1 good : Claude Code DOES honor ANTHROPIC BASE URL on subscription — the proxied request reached Anthropic an Anthr","body":"First live test of kage proxy against real Claude Code on a subscription (OAuth, not an API key). Finding 1 (good): Claude Code DOES honor ANTHROPIC_BASE_URL on subscription — the proxied request reached Anthropic (an Anthropic-shaped error came back, not a connection failure), which rules out the worst-case scenario (base-url silently ignored on the subscription path). Finding 2 (problem): the request returned 'Server is temporarily limiting requests (not your usage limit)', which is an HTTP 429/529 overload. Cause not yet isolated: either a genuine transient Anthropic overload, or the proxy trips Anthropic's edge on the OAuth path. Prime proxy-side suspects: the accept-encoding identity override, and subscription requests carrying an anthropic-beta oauth header the edge may reject behind a non-standard connection. Open diagnostics: read the --verbose upstream status line, retry 2-3x (intermittent vs consistent), and A/B by unsetting ANTHROPIC_BASE_URL. Added --verbose logging to proxy.ts to surface upstream status + error body for exactly this.\nEvidence: Live run: user asked a question through the proxy on subscription; Claude Code showed 'API Error: Server is temporarily limiting requests (not your usage limit)'. Confirms upstream was reached (Anthropic error surface, not ECONNREFUSED / no request).\nVerified by: live run against Claude Code subscription 2026-07-07; --verbose diagnostic added to isolate next","type":"gotcha","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","proxy","subscription","oauth","anthropic","rate-limit","diagnosis","limitation"],"paths":["mcp/proxy.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-07-06T18:44:45.927Z"}],"context":{"fact":"First live test of kage proxy against real Claude Code on a subscription (OAuth, not an API key). Finding 1 (good): Claude Code DOES honor ANTHROPIC_BASE_URL on subscription — the proxied request reached Anthropic (an Anthropic-shaped error came back, not a connection failure), which rules out the worst-case scenario (base-url silently ignored on the subscription path). Finding 2 (problem): the request returned 'Server is temporarily limiting requests (not your usage limit)', which is an HTTP 429/529 overload. Cause not yet isolated: either a genuine transient Anthropic overload, or the proxy trips Anthropic's edge on the OAuth path. Prime proxy-side suspects: the accept-encoding identity override, and subscription requests carrying an anthropic-beta oauth header the edge may reject behind a non-standard connection. Open diagnostics: read the --verbose upstream status line, retry 2-3x (intermittent vs consistent), and A/B by unsetting ANTHROPIC_BASE_URL. Added --verbose logging to proxy.ts to surface upstream status + error body for exactly this.\nEvidence: Live run: user asked a question through the proxy on subscription; Claude Code showed 'API Error: Server is temporarily limiting requests (not your usage limit)'. Confirms upstream was reached (Anthropic error surface, not ECONNREFUSED / no request).\nVerified by: live run against Claude Code subscription 2026-07-07; --verbose diagnostic added to isolate next","verification":"Live run: user asked a question through the proxy on subscription; Claude Code showed 'API Error: Server is temporarily limiting requests (not your usage limit)'. Confirms upstream was reached (Anthropic error surface, not ECONNREFUSED / no request)."},"freshness":{"ttl_days":365,"last_verified_at":"2026-07-06T18:44:45.927Z","path_fingerprints":[{"path":"mcp/proxy.ts","sha256":"1eb415280b365671227428703f6cf1a7a7cbad9ce9facf2488e02df2c785b1d3","size":11066}],"path_fingerprint_policy":"source_hash_staleness","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"discovery_tokens":8000,"discovery_tokens_estimated":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":359},"created_at":"2026-07-06T18:44:45.927Z","updated_at":"2026-07-06T18:44:45.927Z","author_branch":"master"}
```

