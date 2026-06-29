---
type: "Runbook"
title: "Doc-truth audit method: cross-check every documented kage command/tool against cli.ts and index.ts"
description: "Audit found and fixed 3 doc lies on the live site 2026 06 12 : guide documented deleted MCP tools kage org , kage layered recall, kage global build and a nonexistent 'kage propose from diff' real: kage propose from diff"
resource: "docs/guide.html"
tags: ["session-learning", "docs"]
timestamp: "2026-06-12T12:46:29.143Z"
x-kage-id: "repo:https-github-com-kage-core-kage:runbook:doc-truth-audit-method-cross-check-every-documented-kage-command-tool-against-cl"
x-kage-type: "runbook"
x-kage-status: "deprecated"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "deprecated"
x-kage-paths: ["docs/guide.html"]
---

# Doc-truth audit method: cross-check every documented kage command/tool against cli.ts and index.ts

> Audit found and fixed 3 doc lies on the live site 2026 06 12 : guide documented deleted MCP tools kage org , kage lay…

Audit found and fixed 3 doc lies on the live site (2026-06-12): guide documented deleted MCP tools (kage_org_*, kage_layered_recall, kage_global_build) and a nonexistent 'kage propose-from-diff' (real: kage propose --from-diff). Method: extract 'kage <sub>' and 'kage_<tool>' mentions from docs/*.html + README, diff against command === dispatch strings in mcp/cli.ts and name: "kage_*" registry in mcp/index.ts. Reverse diff (real-but-undocumented) is informational only — the guide's MCP section is intentionally curated. Rerun this after any surface change; it's the same class of check kage scan's doc-lie detector does for users.

# Citations

[1] explicit_capture (2026-06-12T12:46:29.143Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:runbook:doc-truth-audit-method-cross-check-every-documented-kage-command-tool-against-cl","title":"Doc-truth audit method: cross-check every documented kage command/tool against cli.ts and index.ts","summary":"Audit found and fixed 3 doc lies on the live site 2026 06 12 : guide documented deleted MCP tools kage org , kage layered recall, kage global build and a nonexistent 'kage propose from diff' real: kage propose from diff","body":"Audit found and fixed 3 doc lies on the live site (2026-06-12): guide documented deleted MCP tools (kage_org_*, kage_layered_recall, kage_global_build) and a nonexistent 'kage propose-from-diff' (real: kage propose --from-diff). Method: extract 'kage <sub>' and 'kage_<tool>' mentions from docs/*.html + README, diff against command === dispatch strings in mcp/cli.ts and name: \"kage_*\" registry in mcp/index.ts. Reverse diff (real-but-undocumented) is informational only — the guide's MCP section is intentionally curated. Rerun this after any surface change; it's the same class of check kage scan's doc-lie detector does for users.","type":"runbook","scope":"repo","visibility":"team","sensitivity":"internal","status":"deprecated","confidence":0.7,"tags":["session-learning","docs"],"paths":["docs/guide.html"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-06-12T12:46:29.143Z"}],"context":{"fact":"Audit found and fixed 3 doc lies on the live site (2026-06-12): guide documented deleted MCP tools (kage_org_*, kage_layered_recall, kage_global_build) and a nonexistent 'kage propose-from-diff' (real: kage propose --from-diff). Method: extract 'kage <sub>' and 'kage_<tool>' mentions from docs/*.html + README, diff against command === dispatch strings in mcp/cli.ts and name: \"kage_*\" registry in mcp/index.ts. Reverse diff (real-but-undocumented) is informational only — the guide's MCP section is intentionally curated. Rerun this after any surface change; it's the same class of check kage scan's doc-lie detector does for users."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-12T12:46:29.143Z","path_fingerprints":[{"path":"docs/guide.html","sha256":"babd26769997071a1e7c823c603ba99fc7111c8d0b8a286a7d266f1e5a6c2972","size":48354}],"path_fingerprint_policy":"source_hash_staleness","verification":"repo_local_agent_capture","superseded_at":"2026-06-12T16:06:14.330Z","superseded_by":"repo:https-github-com-kage-core-kage:runbook:doc-truth-audit-method-re-verified-after-dark-first-site-flip-1781280362676","superseded_reason":"Newer repo memory supersedes this packet."},"edges":[{"relation":"superseded_by","to":"repo:https-github-com-kage-core-kage:runbook:doc-truth-audit-method-re-verified-after-dark-first-site-flip-1781280362676","evidence":"Newer repo memory supersedes this packet.","created_at":"2026-06-12T16:06:14.330Z"}],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"discovery_tokens":2000,"discovery_tokens_estimated":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":159,"stale":true,"stale_reasons":["packet status is superseded","linked path changed since memory was verified: docs/guide.html"],"suggested_action":"mark_stale","superseded_by":"repo:https-github-com-kage-core-kage:runbook:doc-truth-audit-method-re-verified-after-dark-first-site-flip-1781280362676","superseded_reason":"Newer repo memory supersedes this packet."},"created_at":"2026-06-12T12:46:29.143Z","updated_at":"2026-06-29T08:26:42.599Z","author_branch":"master"}
```

