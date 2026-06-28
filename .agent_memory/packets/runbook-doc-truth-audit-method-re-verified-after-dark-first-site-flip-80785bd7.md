---
type: "Runbook"
title: "Doc-truth audit method (re-verified after dark-first site flip)"
description: "Cross check every documented kage command/tool against reality: extract 'kage <sub ' and 'kage <tool ' mentions from docs/ .html + README, diff against command === dispatch strings in mcp/cli.ts and name: \"kage \" registr"
resource: "docs/guide.html"
tags: ["session-learning", "docs"]
timestamp: "2026-06-15T17:57:42.721Z"
x-kage-id: "repo:https-github-com-kage-core-kage:runbook:doc-truth-audit-method-re-verified-after-dark-first-site-flip-1781280362676"
x-kage-type: "runbook"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-confidence: 0.7
x-kage-verified: "verified"
x-kage-paths: ["docs/guide.html"]
---

# Doc-truth audit method (re-verified after dark-first site flip)

> Cross check every documented kage command/tool against reality: extract 'kage <sub ' and 'kage <tool ' mentions from …

Cross-check every documented kage command/tool against reality: extract 'kage <sub>' and 'kage_<tool>' mentions from docs/*.html + README, diff against command === dispatch strings in mcp/cli.ts and name: "kage_*" registry in mcp/index.ts. Found+fixed 3 doc lies on 2026-06-12 (phantom kage_org_*/kage_layered_recall/kage_global_build, and 'kage propose-from-diff' → 'kage propose --from-diff'). Reverse diff (real-but-undocumented) is informational — the guide's MCP section is intentionally curated and says so. Still valid after the dark-first theme flip; theme changes don't affect command truth. Rerun after any CLI/MCP surface change.

# Citations

[1] explicit_capture (2026-06-12T16:06:02.676Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:runbook:doc-truth-audit-method-re-verified-after-dark-first-site-flip-1781280362676","title":"Doc-truth audit method (re-verified after dark-first site flip)","summary":"Cross check every documented kage command/tool against reality: extract 'kage <sub ' and 'kage <tool ' mentions from docs/ .html + README, diff against command === dispatch strings in mcp/cli.ts and name: \"kage \" registr","body":"Cross-check every documented kage command/tool against reality: extract 'kage <sub>' and 'kage_<tool>' mentions from docs/*.html + README, diff against command === dispatch strings in mcp/cli.ts and name: \"kage_*\" registry in mcp/index.ts. Found+fixed 3 doc lies on 2026-06-12 (phantom kage_org_*/kage_layered_recall/kage_global_build, and 'kage propose-from-diff' → 'kage propose --from-diff'). Reverse diff (real-but-undocumented) is informational — the guide's MCP section is intentionally curated and says so. Still valid after the dark-first theme flip; theme changes don't affect command truth. Rerun after any CLI/MCP surface change.","type":"runbook","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","docs"],"paths":["docs/guide.html"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-06-12T16:06:02.676Z"}],"context":{"fact":"Cross-check every documented kage command/tool against reality: extract 'kage <sub>' and 'kage_<tool>' mentions from docs/*.html + README, diff against command === dispatch strings in mcp/cli.ts and name: \"kage_*\" registry in mcp/index.ts. Found+fixed 3 doc lies on 2026-06-12 (phantom kage_org_*/kage_layered_recall/kage_global_build, and 'kage propose-from-diff' → 'kage propose --from-diff'). Reverse diff (real-but-undocumented) is informational — the guide's MCP section is intentionally curated and says so. Still valid after the dark-first theme flip; theme changes don't affect command truth. Rerun after any CLI/MCP surface change."},"freshness":{"ttl_days":365,"last_verified_at":"2026-06-15T17:57:42.721Z","path_fingerprints":[{"path":"docs/guide.html","sha256":"33b57e522b1a49e48631042940e2ca7d281084371c3feb3210604e213e0e7f28","size":51769}],"path_fingerprint_policy":"source_hash_staleness","verification":"repo_local_agent_capture"},"edges":[{"relation":"supersedes","to":"repo:https-github-com-kage-core-kage:runbook:doc-truth-audit-method-cross-check-every-documented-kage-command-tool-against-cl","evidence":"Newer repo memory supersedes this packet.","created_at":"2026-06-12T16:06:14.330Z"}],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"discovery_tokens":2000,"discovery_tokens_estimated":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":160,"reverified_at":"2026-06-15T17:57:42.721Z","stale":true,"stale_reasons":["linked path changed since memory was verified: docs/guide.html"],"suggested_action":"update"},"created_at":"2026-06-12T16:06:02.676Z","updated_at":"2026-06-28T20:48:09.460Z","author_branch":"master"}
```

