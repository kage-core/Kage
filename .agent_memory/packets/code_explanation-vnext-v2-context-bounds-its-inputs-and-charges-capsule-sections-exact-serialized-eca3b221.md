---
type: "Code Explanation"
title: "vNext /v2/context bounds its inputs and charges capsule sections exact serialized bytes"
description: "Legacy memory imported from Markdown."
resource: "mcp/vnext/context/source.ts"
tags: ["session-learning"]
timestamp: "2026-07-14T15:15:54.638Z"
x-kage-id: "repo:kage-vnext-implementation:code_explanation:vnext-v2-context-bounds-its-inputs-and-charges-capsule-sections-exact-serialized"
x-kage-type: "code_explanation"
x-kage-status: "superseded"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "superseded"
x-kage-paths: ["mcp/vnext/context/source.ts", "mcp/vnext/context/legacy-source.ts", "mcp/vnext/context/capsule-builder.ts", "mcp/vnext/context/token-estimate.ts", "mcp/vnext/context/context.test.ts", "mcp/vnext/runtime/server.ts"]
---

# vNext /v2/context bounds its inputs and charges capsule sections exact serialized bytes

> Legacy memory imported from Markdown.

# Citations

[1] explicit_capture (2026-07-14T15:15:54.638Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:kage-vnext-implementation:code_explanation:vnext-v2-context-bounds-its-inputs-and-charges-capsule-sections-exact-serialized","title":"vNext /v2/context bounds its inputs and charges capsule sections exact serialized bytes","summary":"Legacy memory imported from Markdown.","body":"","type":"code_explanation","scope":"repo","visibility":"team","sensitivity":"internal","status":"superseded","confidence":0.7,"tags":["session-learning"],"paths":["mcp/vnext/context/source.ts","mcp/vnext/context/legacy-source.ts","mcp/vnext/context/capsule-builder.ts","mcp/vnext/context/token-estimate.ts","mcp/vnext/context/context.test.ts","mcp/vnext/runtime/server.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-07-14T15:15:54.638Z"}],"context":{},"freshness":{"ttl_days":365,"last_verified_at":"2026-07-14T15:15:54.638Z","path_fingerprints":[{"path":"mcp/vnext/context/source.ts","sha256":"c9392fa8ceb2e10ab3bbc8c45cf97ae9d1059604a16b1e30ed2a78a6855e3885","size":6438},{"path":"mcp/vnext/context/legacy-source.ts","sha256":"ebc8295ed72e71947110e9609e63b519a6ce57506c63f95dc6645791203c623d","size":9491},{"path":"mcp/vnext/context/capsule-builder.ts","sha256":"c5bc27701762e8ee71dc2bf7bd3f0499a4f13c89df8fc421f48833e319a596ed","size":7578},{"path":"mcp/vnext/context/token-estimate.ts","sha256":"123384c1a507d51929b644ccbf28199f2d9c5494124f89c034df06df53c6a8b2","size":223},{"path":"mcp/vnext/context/context.test.ts","sha256":"bce83f0469d39e2e47f0612310a9f70d28f03c9be535437e49c44d8ce798e83e","size":24152},{"path":"mcp/vnext/runtime/server.ts","sha256":"e86e525a1436cb3e73f822f9ec998aaf5e081c5c556860f5588f348adce012d5","size":15418}],"path_fingerprint_policy":"source_hash_staleness","verification":"repo_local_agent_capture","superseded_at":"2026-07-14T15:17:11.672Z","superseded_by":"repo:kage-vnext-implementation:code_explanation:vnext-v2-context-kernel-sourced-trust-byte-capped-inputs-exact-section-accountin","superseded_reason":"Empty-bodied packet written by a kage_learn call that passed the insight under an unsupported parameter name; replaced by the packet carrying the actual content."},"edges":[{"relation":"supersedes","to":"repo:kage-vnext-implementation:code_explanation:kage-vnext-runtime-composes-bounded-trusted-context-through-a-replaceable-source","evidence":"Task 4 hardening (236985b, b8a3f54) changed the linked context files: trust now routes through the kernel's packetVerificationLabel, inputs are byte-capped at validation, and section cost is charged in exact serialized bytes.","created_at":"2026-07-14T15:16:26.055Z"},{"relation":"superseded_by","to":"repo:kage-vnext-implementation:code_explanation:vnext-v2-context-kernel-sourced-trust-byte-capped-inputs-exact-section-accountin","evidence":"Empty-bodied packet written by a kage_learn call that passed the insight under an unsupported parameter name; replaced by the packet carrying the actual content.","created_at":"2026-07-14T15:17:11.672Z"}],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"discovery_tokens":2000,"discovery_tokens_estimated":true,"score":68,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged"],"risks":["too short to be useful"],"duplicate_candidates":[],"stale_reasons":["packet status is superseded","linked path changed since memory was verified: mcp/vnext/context/source.ts, mcp/vnext/context/legacy-source.ts, mcp/vnext/context/context.test.ts, mcp/vnext/runtime/server.ts"],"estimated_tokens_saved":20,"superseded_by":"repo:kage-vnext-implementation:code_explanation:vnext-v2-context-kernel-sourced-trust-byte-capped-inputs-exact-section-accountin","superseded_reason":"Empty-bodied packet written by a kage_learn call that passed the insight under an unsupported parameter name; replaced by the packet carrying the actual content.","stale":true,"suggested_action":"mark_stale"},"created_at":"2026-07-14T15:15:54.638Z","updated_at":"2026-07-14T15:17:11.672Z","author_branch":"codex/kage-vnext-implementation"}
```

