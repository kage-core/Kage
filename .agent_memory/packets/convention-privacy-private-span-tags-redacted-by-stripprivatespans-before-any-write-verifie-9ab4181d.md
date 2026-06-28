---
type: "Convention"
title: "Privacy: private-span tags redacted by stripPrivateSpans before any write (verified v2.2.1)"
description: "stripPrivateSpans replaces angle bracket private...private spans case insensitive, multiline, unclosed to EOF with a redaction marker before ANY write: capture, learn repo and personal , observe, distill incl. auto draft"
resource: "mcp/kernel.ts"
tags: ["session-learning"]
timestamp: "2026-06-15T21:58:25.889Z"
x-kage-id: "repo:https-github-com-kage-core-kage:convention:privacy-private-span-tags-redacted-by-stripprivatespans-before-any-write-verifie"
x-kage-type: "convention"
x-kage-status: "deprecated"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "deprecated"
x-kage-paths: ["mcp/kernel.ts"]
---

# Privacy: private-span tags redacted by stripPrivateSpans before any write (verified v2.2.1)

> stripPrivateSpans replaces angle bracket private...private spans case insensitive, multiline, unclosed to EOF with a …

stripPrivateSpans replaces angle-bracket private...private spans (case-insensitive, multiline, unclosed-to-EOF) with a redaction marker before ANY write: capture, learn (repo and --personal), observe, distill incl. auto-drafts. GOTCHA discovered dogfooding: the sanitizer applies to packet titles/bodies themselves — writing the literal tag into a kage learn title gets redacted (a prior version of this packet became 'Privacy: [private]'). Describe the tag without literal angle brackets in memory text.

# Citations

[1] explicit_capture (2026-06-12T12:48:51.714Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:convention:privacy-private-span-tags-redacted-by-stripprivatespans-before-any-write-verifie","title":"Privacy: private-span tags redacted by stripPrivateSpans before any write (verified v2.2.1)","summary":"stripPrivateSpans replaces angle bracket private...private spans case insensitive, multiline, unclosed to EOF with a redaction marker before ANY write: capture, learn repo and personal , observe, distill incl. auto draft","body":"stripPrivateSpans replaces angle-bracket private...private spans (case-insensitive, multiline, unclosed-to-EOF) with a redaction marker before ANY write: capture, learn (repo and --personal), observe, distill incl. auto-drafts. GOTCHA discovered dogfooding: the sanitizer applies to packet titles/bodies themselves — writing the literal tag into a kage learn title gets redacted (a prior version of this packet became 'Privacy: [private]'). Describe the tag without literal angle brackets in memory text.","type":"convention","scope":"repo","visibility":"team","sensitivity":"internal","status":"deprecated","confidence":0.7,"tags":["session-learning"],"paths":["mcp/kernel.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-06-12T12:48:51.714Z"}],"context":{"fact":"stripPrivateSpans replaces angle-bracket private...private spans (case-insensitive, multiline, unclosed-to-EOF) with a redaction marker before ANY write: capture, learn (repo and --personal), observe, distill incl. auto-drafts. GOTCHA discovered dogfooding: the sanitizer applies to packet titles/bodies themselves — writing the literal tag into a kage learn title gets redacted (a prior version of this packet became 'Privacy: [private]'). Describe the tag without literal angle brackets in memory text."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T21:58:25.889Z","path_fingerprints":[{"path":"mcp/kernel.ts","sha256":"c3ee0e093ee2c8e8ebd3af30b04569ef542f43061e9b180bd17d141a3d6d5e0f","size":844113,"symbols":[{"name":"verified","kind":"constant","sha256":"9e1998eeb03a854663c4ce2fa27bc0dde75922738f56430c157d33ea3ab8d3b8"},{"name":"span","kind":"constant","sha256":"18fc7a11fea1ae488db45670cd590cee322a0965edb28d3f56de30c7c4c031b9"},{"name":"stripprivatespans","kind":"function","sha256":"ba84a8fc3e6d28cb1b5961254b38ec923e69f24b0a89936bf5606ff7cbde5c30"},{"name":"before","kind":"constant","sha256":"70c005bc3586ccb93799dfa1989dccca69b847916fd3fde1583578730922c50c"},{"name":"learn","kind":"function","sha256":"93c4e74f4a7d140c065b4eaa12b6ef14ffa68bfaee0cfc0a3e3773881af468d3"},{"name":"capture","kind":"function","sha256":"d6ab6995f6712c0c94fc325e5aaaf3f495bdd81ba660e115f3d467f89f93ef29"},{"name":"observe","kind":"function","sha256":"ed8233b4571379b1176099bf36cd241bc60cb0e62a835060c6661bddf5d3c76b"},{"name":"auto","kind":"constant","sha256":"00dfd4334aa51ffac12b575a6a2c33040556f4641b8e8806bee9af6d653df46c"},{"name":"memory","kind":"constant","sha256":"952449fe9c2c8827ca2a6a85c0d0a86b82826696ff4f88ee167500678734db36"}]}],"path_fingerprint_policy":"source_hash_staleness","verification":"repo_local_agent_capture"},"edges":[{"relation":"supersedes","to":"repo:https-github-com-kage-core-kage:convention:privacy-private-1781265149442","evidence":"Newer repo memory supersedes this packet.","created_at":"2026-06-12T12:48:51.897Z"}],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"discovery_tokens":2000,"discovery_tokens_estimated":true,"score":96,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":126,"reverified_at":"2026-06-15T21:58:25.889Z","stale":true,"stale_reasons":["packet status is deprecated","linked path changed since memory was verified: mcp/kernel.ts"],"suggested_action":"mark_stale"},"created_at":"2026-06-12T12:48:51.714Z","updated_at":"2026-06-19T13:57:42.712Z","author_branch":"master"}
```

