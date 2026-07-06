---
type: "Gotcha"
title: "GOTCHA: kage proxy must EXACT-match /v1/messages — count_tokens shares the prefix and was getting memory injected"
description: "The proxy gated injection on url.startsWith '/v1/messages' . But Claude Code fires POST /v1/messages/count tokens constantly to size its context, and that path ALSO starts with /v1/messages — so the proxy injected verifi"
resource: "mcp/proxy.ts"
tags: ["session-learning", "proxy", "count_tokens", "injection", "gotcha", "claude-code", "routing"]
timestamp: "2026-07-06T19:32:29.244Z"
x-kage-id: "repo:https-github-com-kage-core-kage:gotcha:gotcha-kage-proxy-must-exact-match-v1-messages-count-tokens-shares-the-prefix-an"
x-kage-type: "gotcha"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/proxy.ts"]
---

# GOTCHA: kage proxy must EXACT-match /v1/messages — count_tokens shares the prefix and was getting memory injected

> The proxy gated injection on url.startsWith '/v1/messages' . But Claude Code fires POST /v1/messages/count tokens con…

The proxy gated injection on url.startsWith('/v1/messages'). But Claude Code fires POST /v1/messages/count_tokens constantly to size its context, and that path ALSO starts with /v1/messages — so the proxy injected verified memory into token-counting requests. Symptoms in the live log: the 'memories injected' counter ran up fast (e.g. 45 across 12 requests) even though only ONE real completion occurred; most injections went into count_tokens. Harm: it pollutes Claude Code's own token accounting (it thinks its context is bigger than it is, can trigger early compaction) and makes the receipt misleading. Fix: added pure exported isCompletionsRequest(method,url) that strips the query string and matches path === '/v1/messages' exactly, so count_tokens and other subpaths pass through untouched. Unit-tested (count_tokens -> false, /v1/messages?beta=true -> true, GET -> false).
Evidence: Live proxy log showed 'POST /v1/messages/count_tokens?beta=true -> 200' each incrementing injected by 4; only req 2 (POST /v1/messages -> 200, 162 out tokens) was a real completion. Fix verified: node --test dist/proxy.test.js 4 pass incl. the count_tokens exclusion case.
Verified by: node --test dist/proxy.test.js (4 pass)

## Verification

Live proxy log showed 'POST /v1/messages/count_tokens?beta=true -> 200' each incrementing injected by 4; only req 2 (POST /v1/messages -> 200, 162 out tokens) was a real completion. Fix verified: node --test dist/proxy.test.js 4 pass incl. the count_tokens exclusion case.

# Citations

[1] explicit_capture (2026-07-06T19:32:29.244Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:gotcha:gotcha-kage-proxy-must-exact-match-v1-messages-count-tokens-shares-the-prefix-an","title":"GOTCHA: kage proxy must EXACT-match /v1/messages — count_tokens shares the prefix and was getting memory injected","summary":"The proxy gated injection on url.startsWith '/v1/messages' . But Claude Code fires POST /v1/messages/count tokens constantly to size its context, and that path ALSO starts with /v1/messages — so the proxy injected verifi","body":"The proxy gated injection on url.startsWith('/v1/messages'). But Claude Code fires POST /v1/messages/count_tokens constantly to size its context, and that path ALSO starts with /v1/messages — so the proxy injected verified memory into token-counting requests. Symptoms in the live log: the 'memories injected' counter ran up fast (e.g. 45 across 12 requests) even though only ONE real completion occurred; most injections went into count_tokens. Harm: it pollutes Claude Code's own token accounting (it thinks its context is bigger than it is, can trigger early compaction) and makes the receipt misleading. Fix: added pure exported isCompletionsRequest(method,url) that strips the query string and matches path === '/v1/messages' exactly, so count_tokens and other subpaths pass through untouched. Unit-tested (count_tokens -> false, /v1/messages?beta=true -> true, GET -> false).\nEvidence: Live proxy log showed 'POST /v1/messages/count_tokens?beta=true -> 200' each incrementing injected by 4; only req 2 (POST /v1/messages -> 200, 162 out tokens) was a real completion. Fix verified: node --test dist/proxy.test.js 4 pass incl. the count_tokens exclusion case.\nVerified by: node --test dist/proxy.test.js (4 pass)","type":"gotcha","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","proxy","count_tokens","injection","gotcha","claude-code","routing"],"paths":["mcp/proxy.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-07-06T19:32:29.244Z"}],"context":{"fact":"The proxy gated injection on url.startsWith('/v1/messages'). But Claude Code fires POST /v1/messages/count_tokens constantly to size its context, and that path ALSO starts with /v1/messages — so the proxy injected verified memory into token-counting requests. Symptoms in the live log: the 'memories injected' counter ran up fast (e.g. 45 across 12 requests) even though only ONE real completion occurred; most injections went into count_tokens. Harm: it pollutes Claude Code's own token accounting (it thinks its context is bigger than it is, can trigger early compaction) and makes the receipt misleading. Fix: added pure exported isCompletionsRequest(method,url) that strips the query string and matches path === '/v1/messages' exactly, so count_tokens and other subpaths pass through untouched. Unit-tested (count_tokens -> false, /v1/messages?beta=true -> true, GET -> false).\nEvidence: Live proxy log showed 'POST /v1/messages/count_tokens?beta=true -> 200' each incrementing injected by 4; only req 2 (POST /v1/messages -> 200, 162 out tokens) was a real completion. Fix verified: node --test dist/proxy.test.js 4 pass incl. the count_tokens exclusion case.\nVerified by: node --test dist/proxy.test.js (4 pass)","verification":"Live proxy log showed 'POST /v1/messages/count_tokens?beta=true -> 200' each incrementing injected by 4; only req 2 (POST /v1/messages -> 200, 162 out tokens) was a real completion. Fix verified: node --test dist/proxy.test.js 4 pass incl. the count_tokens exclusion case."},"freshness":{"ttl_days":365,"last_verified_at":"2026-07-06T19:32:29.244Z","path_fingerprints":[{"path":"mcp/proxy.ts","sha256":"7d05c23448b067d19bb0f8bfd34e094b6a1a19aac1297a320248955f34369171","size":12761,"symbols":[{"name":"iscompletionsrequest","kind":"function","sha256":"b8bc6ddb69a4d79fae904faaa9d2c0e4f8e79ca4fd82571e11d02c7f97e15d3d"}]}],"path_fingerprint_policy":"source_hash_staleness","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"discovery_tokens":8000,"discovery_tokens_estimated":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":305},"created_at":"2026-07-06T19:32:29.244Z","updated_at":"2026-07-06T19:32:29.244Z","author_branch":"master"}
```

