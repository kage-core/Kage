---
type: "Decision"
title: "Kage vNext local persistence has a guarded SQLite boundary"
description: "Kage vNext local persistence is isolated behind openVnextDatabase: node:sqlite is referenced as a type at module evaluation and required only inside the Node 22.5+ gated open function, preserving legacy Node 18 CLI loadi"
resource: "mcp/vnext/runtime/runtime-version.ts"
tags: ["session-learning", "vnext", "sqlite", "node-compat", "append-only", "idempotency"]
timestamp: "2026-07-13T14:36:04.129Z"
x-kage-id: "repo:kage-vnext-implementation:decision:kage-vnext-local-persistence-has-a-guarded-sqlite-boundary-1783953364129"
x-kage-type: "decision"
x-kage-status: "superseded"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "superseded"
x-kage-paths: ["mcp/vnext/runtime/runtime-version.ts", "mcp/vnext/storage/database.ts", "mcp/vnext/storage/migrations.ts", "mcp/vnext/storage/event-store.ts", "mcp/vnext/storage/receipt-store.ts", "mcp/vnext/storage/storage.test.ts"]
x-kage-stack: ["TypeScript", "Node.js", "SQLite"]
---

# Kage vNext local persistence has a guarded SQLite boundary

> Kage vNext local persistence is isolated behind openVnextDatabase: node:sqlite is referenced as a type at module eval…

Kage vNext local persistence is isolated behind openVnextDatabase: node:sqlite is referenced as a type at module evaluation and required only inside the Node 22.5+-gated open function, preserving legacy Node 18 CLI loading. Migration 001 is transactional and versioned. Evidence events are append-only and deduplicate globally by source_fingerprint without replacement; transformation receipts are idempotent by request_id and preserve unavailable measurements as null rather than estimating.
Evidence: npm run build --prefix mcp and the focused storage suite passed 8/8; npm test --prefix mcp passed 442/442 plus 12/12 dogfood; the no-node:sqlite CLI regression passed 1/1.
Verified by: Task 2 focused, full, and compatibility test commands

## Verification

npm run build --prefix mcp and the focused storage suite passed 8/8; npm test --prefix mcp passed 442/442 plus 12/12 dogfood; the no-node:sqlite CLI regression passed 1/1.

# Citations

[1] explicit_capture (2026-07-13T14:36:04.129Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:kage-vnext-implementation:decision:kage-vnext-local-persistence-has-a-guarded-sqlite-boundary-1783953364129","title":"Kage vNext local persistence has a guarded SQLite boundary","summary":"Kage vNext local persistence is isolated behind openVnextDatabase: node:sqlite is referenced as a type at module evaluation and required only inside the Node 22.5+ gated open function, preserving legacy Node 18 CLI loadi","body":"Kage vNext local persistence is isolated behind openVnextDatabase: node:sqlite is referenced as a type at module evaluation and required only inside the Node 22.5+-gated open function, preserving legacy Node 18 CLI loading. Migration 001 is transactional and versioned. Evidence events are append-only and deduplicate globally by source_fingerprint without replacement; transformation receipts are idempotent by request_id and preserve unavailable measurements as null rather than estimating.\nEvidence: npm run build --prefix mcp and the focused storage suite passed 8/8; npm test --prefix mcp passed 442/442 plus 12/12 dogfood; the no-node:sqlite CLI regression passed 1/1.\nVerified by: Task 2 focused, full, and compatibility test commands","type":"decision","scope":"repo","visibility":"team","sensitivity":"internal","status":"superseded","confidence":0.7,"tags":["session-learning","vnext","sqlite","node-compat","append-only","idempotency"],"paths":["mcp/vnext/runtime/runtime-version.ts","mcp/vnext/storage/database.ts","mcp/vnext/storage/migrations.ts","mcp/vnext/storage/event-store.ts","mcp/vnext/storage/receipt-store.ts","mcp/vnext/storage/storage.test.ts"],"stack":["TypeScript","Node.js","SQLite"],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-07-13T14:36:04.129Z"}],"context":{"fact":"Kage vNext local persistence is isolated behind openVnextDatabase: node:sqlite is referenced as a type at module evaluation and required only inside the Node 22.5+-gated open function, preserving legacy Node 18 CLI loading. Migration 001 is transactional and versioned. Evidence events are append-only and deduplicate globally by source_fingerprint without replacement; transformation receipts are idempotent by request_id and preserve unavailable measurements as null rather than estimating.\nEvidence: npm run build --prefix mcp and the focused storage suite passed 8/8; npm test --prefix mcp passed 442/442 plus 12/12 dogfood; the no-node:sqlite CLI regression passed 1/1.\nVerified by: Task 2 focused, full, and compatibility test commands","verification":"npm run build --prefix mcp and the focused storage suite passed 8/8; npm test --prefix mcp passed 442/442 plus 12/12 dogfood; the no-node:sqlite CLI regression passed 1/1."},"freshness":{"ttl_days":365,"last_verified_at":"2026-07-13T14:36:04.129Z","path_fingerprints":[{"path":"mcp/vnext/runtime/runtime-version.ts","sha256":"067e8d861f93c23dfbb2f5076008677e8ce622447e8e0f26b845c355004ef524","size":555},{"path":"mcp/vnext/storage/database.ts","sha256":"0ee98a9d5c7b3817601d29f639ed9d735e3ec4005411f51f9539929cfe7f3fee","size":447,"symbols":[{"name":"openvnextdatabase","kind":"function","sha256":"3ed20cb5eda8f98cb2f172aa1f652661f97d8c26213252059f3fe00f6570f39b"}]},{"path":"mcp/vnext/storage/migrations.ts","sha256":"74703bad2fc5645c09338c6de1b2b595fd40cafbf638cf16b049973525532d51","size":2236},{"path":"mcp/vnext/storage/event-store.ts","sha256":"4b2e5be0281234723f8e894ada3e05b2abdedbd6aad5d88068171bb6eb691c69","size":2139},{"path":"mcp/vnext/storage/receipt-store.ts","sha256":"e51df4493fd8c85aa25c3bca98f4629aea5703598a0f1177fdab3d61d629bb70","size":3973},{"path":"mcp/vnext/storage/storage.test.ts","sha256":"25c0d6099c68523bdaade6d323bb1d310a84d2d29d3c9ddb737d23a90e3072ed","size":7687}],"path_fingerprint_policy":"source_hash_staleness","verification":"repo_local_agent_capture","superseded_at":"2026-07-13T14:44:06.787Z","superseded_by":"repo:kage-vnext-implementation:decision:kage-vnext-runtime-gate-requires-canonical-three-part-node-versions-178395383755","superseded_reason":"The replacement preserves the guarded SQLite/storage invariants and adds the specification-review correction that the Node version must be canonical major.minor.patch with no leading zeros."},"edges":[{"relation":"superseded_by","to":"repo:kage-vnext-implementation:decision:kage-vnext-runtime-gate-requires-canonical-three-part-node-versions-178395383755","evidence":"The replacement preserves the guarded SQLite/storage invariants and adds the specification-review correction that the Node version must be canonical major.minor.patch with no leading zeros.","created_at":"2026-07-13T14:44:06.787Z"}],"quality":{"reviewer":"repo-local-agent","votes_up":1,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"discovery_tokens":4000,"discovery_tokens_estimated":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"stale_reasons":["packet status is superseded","linked path changed since memory was verified: mcp/vnext/runtime/runtime-version.ts, mcp/vnext/storage/database.ts, mcp/vnext/storage/migrations.ts, mcp/vnext/storage/event-store.ts"],"estimated_tokens_saved":186,"superseded_by":"repo:kage-vnext-implementation:decision:kage-vnext-runtime-gate-requires-canonical-three-part-node-versions-178395383755","superseded_reason":"The replacement preserves the guarded SQLite/storage invariants and adds the specification-review correction that the Node version must be canonical major.minor.patch with no leading zeros.","stale":true,"suggested_action":"mark_stale"},"created_at":"2026-07-13T14:36:04.129Z","updated_at":"2026-07-13T14:44:06.787Z","author_branch":"codex/kage-vnext-implementation"}
```

