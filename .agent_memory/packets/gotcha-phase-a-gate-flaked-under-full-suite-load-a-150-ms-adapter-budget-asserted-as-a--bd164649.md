---
type: "Gotcha"
title: "Phase A gate flaked under full-suite load: a 150 ms adapter budget asserted as a hard pass"
description: "The Phase A gate's handshake and event calls used the adapter client's DEFAULT session budget ADAPTER EVENT TIMEOUT MS = 150 in vnext/adapters/client.ts . Failing open past that budget is correct product behavior — a slo"
resource: "mcp/vnext/phase-a-gate.test.ts"
tags: ["session-learning", "testing", "flake", "timeouts", "phase-a-gate"]
timestamp: "2026-07-22T19:49:46.059Z"
x-kage-id: "repo:memory:gotcha:phase-a-gate-flaked-under-full-suite-load-a-150-ms-adapter-budget-asserted-as-a-"
x-kage-type: "gotcha"
x-kage-status: "approved"
x-kage-scope: "repo"
x-kage-visibility: "team"
x-kage-verified: "unverified"
x-kage-paths: ["mcp/vnext/phase-a-gate.test.ts", "mcp/vnext/adapters/client.ts", "mcp/vnext/adapters/adapter.test.ts"]
---

# Phase A gate flaked under full-suite load: a 150 ms adapter budget asserted as a hard pass

> The Phase A gate's handshake and event calls used the adapter client's DEFAULT session budget ADAPTER EVENT TIMEOUT M…

The Phase A gate's handshake and event calls used the adapter client's DEFAULT session budget (ADAPTER_EVENT_TIMEOUT_MS = 150 in vnext/adapters/client.ts). Failing open past that budget is correct product behavior — a slow runtime must never stall an agent — so under full-suite load the handshake exceeded 150 ms, returned failed_open, and failed a run in which nothing was broken. The test passed 6/6 in isolation, which is the signature of this class of flake. Fix: pass an explicit generous timeout_ms to the gate's handshake and event calls, matching the convention the same file ALREADY used for its capsule call (a cold code-graph build legitimately exceeds the 500 ms context budget). This loses no coverage: the timing contract is asserted separately and explicitly in vnext/adapters/adapter.test.ts, which drives fail-open at 50/60/80 ms budgets and asserts reason == 'timeout'. General rule for this repo: a gate proving an integration PATH must not also implicitly assert the machine's wall-clock speed.
Evidence: Full suite run failed 1 of 1370 with actual 'failed_open' vs expected 'accepted' at dist/vnext/phase-a-gate.test.js:213; the same file then passed 6/6 run alone.
Verified by: node --test dist/vnext/phase-a-gate.test.js — 6/6 in isolation; full suite re-run after the fix

## Verification

Full suite run failed 1 of 1370 with actual 'failed_open' vs expected 'accepted' at dist/vnext/phase-a-gate.test.js:213; the same file then passed 6/6 run alone.

# Citations

[1] explicit_capture (2026-07-22T19:49:46.059Z)

## Kage state

Machine state for lossless round-trip; OKF consumers can ignore it.

```json kage-state
{"schema_version":2,"id":"repo:memory:gotcha:phase-a-gate-flaked-under-full-suite-load-a-150-ms-adapter-budget-asserted-as-a-","title":"Phase A gate flaked under full-suite load: a 150 ms adapter budget asserted as a hard pass","summary":"The Phase A gate's handshake and event calls used the adapter client's DEFAULT session budget ADAPTER EVENT TIMEOUT MS = 150 in vnext/adapters/client.ts . Failing open past that budget is correct product behavior — a slo","body":"The Phase A gate's handshake and event calls used the adapter client's DEFAULT session budget (ADAPTER_EVENT_TIMEOUT_MS = 150 in vnext/adapters/client.ts). Failing open past that budget is correct product behavior — a slow runtime must never stall an agent — so under full-suite load the handshake exceeded 150 ms, returned failed_open, and failed a run in which nothing was broken. The test passed 6/6 in isolation, which is the signature of this class of flake. Fix: pass an explicit generous timeout_ms to the gate's handshake and event calls, matching the convention the same file ALREADY used for its capsule call (a cold code-graph build legitimately exceeds the 500 ms context budget). This loses no coverage: the timing contract is asserted separately and explicitly in vnext/adapters/adapter.test.ts, which drives fail-open at 50/60/80 ms budgets and asserts reason == 'timeout'. General rule for this repo: a gate proving an integration PATH must not also implicitly assert the machine's wall-clock speed.\nEvidence: Full suite run failed 1 of 1370 with actual 'failed_open' vs expected 'accepted' at dist/vnext/phase-a-gate.test.js:213; the same file then passed 6/6 run alone.\nVerified by: node --test dist/vnext/phase-a-gate.test.js — 6/6 in isolation; full suite re-run after the fix","type":"gotcha","scope":"repo","visibility":"team","sensitivity":"internal","status":"approved","confidence":0.7,"tags":["session-learning","testing","flake","timeouts","phase-a-gate"],"paths":["mcp/vnext/phase-a-gate.test.ts","mcp/vnext/adapters/client.ts","mcp/vnext/adapters/adapter.test.ts"],"stack":[],"source_refs":[{"kind":"explicit_capture","captured_at":"2026-07-22T19:49:46.059Z"}],"context":{"fact":"The Phase A gate's handshake and event calls used the adapter client's DEFAULT session budget (ADAPTER_EVENT_TIMEOUT_MS = 150 in vnext/adapters/client.ts). Failing open past that budget is correct product behavior — a slow runtime must never stall an agent — so under full-suite load the handshake exceeded 150 ms, returned failed_open, and failed a run in which nothing was broken. The test passed 6/6 in isolation, which is the signature of this class of flake. Fix: pass an explicit generous timeout_ms to the gate's handshake and event calls, matching the convention the same file ALREADY used for its capsule call (a cold code-graph build legitimately exceeds the 500 ms context budget). This loses no coverage: the timing contract is asserted separately and explicitly in vnext/adapters/adapter.test.ts, which drives fail-open at 50/60/80 ms budgets and asserts reason == 'timeout'. General rule for this repo: a gate proving an integration PATH must not also implicitly assert the machine's wall-clock speed.\nEvidence: Full suite run failed 1 of 1370 with actual 'failed_open' vs expected 'accepted' at dist/vnext/phase-a-gate.test.js:213; the same file then passed 6/6 run alone.\nVerified by: node --test dist/vnext/phase-a-gate.test.js — 6/6 in isolation; full suite re-run after the fix","verification":"Full suite run failed 1 of 1370 with actual 'failed_open' vs expected 'accepted' at dist/vnext/phase-a-gate.test.js:213; the same file then passed 6/6 run alone."},"freshness":{"ttl_days":365,"last_verified_at":"2026-07-22T19:49:46.059Z","path_fingerprints":[{"path":"mcp/vnext/phase-a-gate.test.ts","sha256":"7fdbbdfa8d7805319e309a050f69a4faec00538d74a543ecbadeb11ac878a13f","size":35479},{"path":"mcp/vnext/adapters/client.ts","sha256":"0b376852fcca4e5359d02b313a334f1f21197af5ac97159b39557c47597ca58a","size":14737,"symbols":[{"name":"adapter_event_timeout_ms","kind":"constant","sha256":"1dccb8a5790fd166ca88f9c062919d5336d8c7ff897bd1e5bc49bf1373f32b9b"}]},{"path":"mcp/vnext/adapters/adapter.test.ts","sha256":"f84c1055a299134ac78ccd7e81529a408e09fe3263e92809935ee604b98865c5","size":61285}],"path_fingerprint_policy":"source_hash_staleness","verification":"repo_local_agent_capture"},"edges":[],"quality":{"reviewer":"repo-local-agent","votes_up":0,"votes_down":0,"uses_30d":0,"reports_stale":0,"review_boundary":"git_or_pr","promotion_requires_review":true,"discovery_tokens":8000,"discovery_tokens_estimated":true,"score":100,"reasons":["high-value memory type","has source evidence","grounded to repo paths","tagged","concise but substantive","actionable rationale or verification"],"risks":[],"duplicate_candidates":[],"estimated_tokens_saved":324},"created_at":"2026-07-22T19:49:46.059Z","updated_at":"2026-07-22T19:49:46.059Z","author_branch":"codex/kage-vnext-implementation","author_name":"Kushal Jain"}
```

