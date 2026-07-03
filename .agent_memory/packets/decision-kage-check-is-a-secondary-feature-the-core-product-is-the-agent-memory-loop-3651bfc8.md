---
type: "Decision"
title: "kage check is a secondary feature; the core product is the .agent_memory loop"
description: "Positioning corrected 2026 07 03 Kushal's call, superseding the same day \"hero verb\" decision : Kage's product is the .agent memory pipeline — ambient capture, gated distill, verified recall — and the v3.3.0 release ship"
resource: "mcp/check.ts"
tags: ["session-learning", "positioning", "kage-check", "product-decision"]
timestamp: "2026-07-03T17:00:52.559Z"
x-kage-id: "repo:https-github-com-kage-core-kage:decision:kage-check-is-a-secondary-feature-the-core-product-is-the-agent-memory-loop-1783"
x-kage-type: "decision"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/check.ts", "mcp/cli.ts", "CLAUDE.md"]
---

# kage check is a secondary feature; the core product is the .agent_memory loop

> Positioning corrected 2026 07 03 Kushal's call, superseding the same day "hero verb" decision : Kage's product is the…

Positioning corrected 2026-07-03 (Kushal's call, superseding the same-day "hero verb" decision): Kage's product is the .agent_memory pipeline — ambient capture, gated distill, verified recall — and the v3.3.0 release ships that loop working end-to-end. `kage check` (mcp/check.ts: drift verification of CLAUDE.md/AGENTS.md/.cursor-rules/docs claims against the code, three honest buckets, --base PR mode, --init-ci) remains in the product as a secondary feature and shares the verification engine, but it is not the lead positioning and should not be marketed as the product. Its corpus validation (70 repos, 30% with confirmed drift, ~85% sampled precision, docs/CHECK_VALIDATION.md) stands. The CLI help lists check after install; kage_check stays on the MCP core surface (12 tools).
Evidence: Session 2026-07-03: founder rejected check-as-product ("we are building .agent_memory"); v3.3.0 changelog leads with the memory loop, check listed as a feature
Verified by: CHANGELOG.md v3.3.0 ordering; published release

## Verification

Session 2026-07-03: founder rejected check-as-product ("we are building .agent_memory"); v3.3.0 changelog leads with the memory loop, check listed as a feature

# Citations

[1] explicit_capture (2026-07-03T17:00:52.559Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:https-github-com-kage-core-kage:decision:kage-check-is-a-secondary-feature-the-core-product-is-the-agent-memory-loop-1783","title":"kage check is a secondary feature; the core product is the .agent_memory loop","summary":"Positioning corrected 2026 07 03 Kushal's call, superseding the same day \"hero verb\" decision : Kage's product is the .agent memory pipeline — ambient capture, gated distill, verified recall — and the v3.3.0 release ship","body":"Positioning corrected 2026-07-03 (Kushal's call, superseding the same-day \"hero verb\" decision): Kage's product is the .agent_memory pipeline — ambient capture, gated distill, verified recall — and the v3.3.0 release ships that loop working end-to-end. `kage check` (mcp/check.ts: drift verification of CLAUDE.md/AGENTS.md/.cursor-rules/docs claims against the code, three honest buckets, --base PR mode, --init-ci) remains in the product as a secondary feature and shares the verification engine, but it is not the lead positioning and should not be marketed as the product. Its corpus validation (70 repos, 30% with confirmed drift, ~85% sampled precision, docs/CHECK_VALIDATION.md) stands. The CLI help lists check after install; kage_check stays on the MCP core surface (12 tools).\nEvidence: Session 2026-07-03: founder rejected check-as-product (\"we are building .agent_memory\"); v3.3.0 changelog leads with the memory loop, check listed as a feature\nVerified by: CHANGELOG.md v3.3.0 ordering; published release","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","positioning","kage-check","product-decision"],"paths":["mcp/check.ts","mcp/cli.ts","CLAUDE.md"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-07-03T17:00:52.559Z"}],"context":{"fact":"Positioning corrected 2026-07-03 (Kushal's call, superseding the same-day \"hero verb\" decision): Kage's product is the .agent_memory pipeline — ambient capture, gated distill, verified recall — and the v3.3.0 release ships that loop working end-to-end. `kage check` (mcp/check.ts: drift verification of CLAUDE.md/AGENTS.md/.cursor-rules/docs claims against the code, three honest buckets, --base PR mode, --init-ci) remains in the product as a secondary feature and shares the verification engine, but it is not the lead positioning and should not be marketed as the product. Its corpus validation (70 repos, 30% with confirmed drift, ~85% sampled precision, docs/CHECK_VALIDATION.md) stands. The CLI help lists check after install; kage_check stays on the MCP core surface (12 tools).\nEvidence: Session 2026-07-03: founder rejected check-as-product (\"we are building .agent_memory\"); v3.3.0 changelog leads with the memory loop, check listed as a feature\nVerified by: CHANGELOG.md v3.3.0 ordering; published release","verification":"Session 2026-07-03: founder rejected check-as-product (\"we are building .agent_memory\"); v3.3.0 changelog leads with the memory loop, check listed as a feature"},"freshness":{"ttl_days":365,"last_verified_at":"2026-07-03T17:00:52.559Z","path_fingerprints":[{"path":"mcp/check.ts","sha256":"b624cefdb8f2a0b018d07d34b6da9a969fbc57660405c6145f164442ad2d9d47","size":29864,"symbols":[{"name":"docs","kind":"constant","sha256":"6f9c666ea72b505e9fe204108ac3166f878a977c4b36b5536f30bcf4eb273f9e"},{"name":"confirmed","kind":"constant","sha256":"c175ab8d2b5801a51cbc7bc08ab3690aaf399c96ab79b61facc8cf15e42caad3"},{"name":"verified","kind":"constant","sha256":"6b951ec6612b0fe292b3c678ba8789041061382ca15c22cfc8658b3ad43cd12c"},{"name":"evidence","kind":"constant","sha256":"1ee27540857821a59d13ec3959246e81dede3afcace29315221729223b18026e"},{"name":"against","kind":"constant","sha256":"8d6e5e397105a02164ea1dc0ddf527e1fccfb3f9c3cf5e41801044c99e743731"}]},{"path":"mcp/cli.ts","sha256":"374cc73d7c34e922394afe3c2b6bce5693e1db77dc057c68a23b1345986b4b2e","size":122632,"symbols":[{"name":"init","kind":"constant","sha256":"26deffe9920c2d94de7d47e5f251282d9ed1957290b0de2f41e8b86e4d99dd7b"},{"name":"agent","kind":"constant","sha256":"5b9caa614311fe691d6af171b9a8985b0d49464b9df178ad28ff5b9883eb4cf2"},{"name":"verb","kind":"constant","sha256":"02e34fb12bac72815d5b79554f150aa476408a9ef341b6a519b1fa3621b2414e"}]},{"path":"CLAUDE.md","sha256":"be3362f512e577a4016f1e066dd2d85ba744f7cd1072d65a39aceaaa245241f5","size":4797}],"path_fingerprint_policy":"source_hash_staleness","verification":"repo_local_agent_capture"},"edges":[{"relation":"supersedes","to":"repo:https-github-com-kage-core-kage:decision:kage-check-is-the-hero-verb-drift-verification-counted-not-estimated-17830598837","evidence":"Newer repo memory supersedes this packet.","created_at":"2026-07-03T17:01:08.233Z"}],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"discovery_tokens":4000,"discovery_tokens_estimated":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":254,"total_uses":0},"created_at":"2026-07-03T17:00:52.559Z","updated_at":"2026-07-03T17:01:08.233Z","author_branch":"master"}
```

