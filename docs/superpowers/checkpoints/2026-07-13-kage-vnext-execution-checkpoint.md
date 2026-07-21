# Kage vNext Execution Checkpoint

**Updated:** 2026-07-15
**Execution mode:** Subagent-driven development with per-task specification and code-quality reviews
**Branch:** `codex/kage-vnext-implementation`
**Worktree:** `/Users/kushaljain/code/Kage/.worktrees/kage-vnext-implementation`
**Last reviewed implementation commit:** `850e7be`

## Resume contract

Continue from this checkpoint; do not restart discovery or redesign the product. Read:

1. `AGENTS.md`
2. `docs/superpowers/specs/2026-07-13-kage-collaborative-repository-intelligence-design.md`
3. `docs/superpowers/plans/2026-07-13-kage-vnext-program.md`
4. `docs/superpowers/plans/2026-07-13-kage-vnext-phase-a-runtime-measurement.md`
5. This checkpoint

Before changing code, call `kage_context` with the current task. Continue strict TDD and the subagent workflow: fresh implementer, specification review, then code-quality review. Do not advance while a reviewer has an unresolved Critical or Important issue.

## Current position

**Program status (2026-07-21):** ALL FIVE PHASES CODE-COMPLETE — Phase A, Phase B, provider-neutral gateway, Phase D, Phase C, **Phase E** (see dated sections). Technical GA gate passes against real PostgreSQL; commercial gate honestly NO-GO (design-partner pilots + live credentials are external-world steps, enumerated by scripts/vnext-phase-e-report.mjs which exits 1). Backend 1423/1423 aggregate (main 1375 + deploy 36 + dogfood 12); workspace 176/176 vs real embedded PG; frontend Vitest 105/105; builds clean; local sqlite migration v5 (workspace Postgres has its own 12-migration ledger); frozen wire protocol intact. Next: goal-expansion workstreams (provider-neutral pipeline W1, history compression W2, memory-algorithm overhaul W3, collaborative-memory doc W4, release packaging W5).

The Phase A table below is retained as historical detail.

| Task | State | Evidence |
|---|---|---|
| 1. Freeze protocol v1 | Complete and reviewed | Final fix `5918e35`; protocol 11/11, package 434/434, dogfood 12/12 |
| 2. SQLite boundary and migrations | Complete and reviewed | Final fix `21ed16e`; storage 36/36, package 470/470, dogfood 12/12 |
| 3. Authenticated local runtime | Complete and reviewed | Final hardening `35b596d`; runtime 34/34, runtime + daemon 47/47, package 506/506, dogfood 12/12 |
| 4. Budgeted capsules and ContextSource | Complete and reviewed | Final fix `6b25d23`; context + runtime 71/71, package 546/546, dogfood 12/12 |
| 5. Claude fail-open adapter | Complete and reviewed | Final hardening `860a272`; adapters 39/39, package 586/586, dogfood 12/12 |
| 6. Exact-measurement proxy gateway | Complete and reviewed | Final fix `4fb4390`; measurement + proxy 45/45, package 620/620, dogfood 12/12 |
| 7. Connection/status/receipt CLI | Complete | `c17682e`; commands + MCP 51/51, package 632/632, dogfood 12/12 |
| 8. CI, fixtures, and Phase A gate | Complete | `ba3475f`, delivery measurement `850e7be`; vNext 224/224, package 665/665, dogfood 12/12 |

## Next action

All eight Phase A tasks are implemented, reviewed, and green: package suite 665/665, vNext suite 224/224, dogfood 12/12.

Do NOT start Phase B yet. The plan's own completion gate is not fully met, and the honest verdict is:

| Gate condition | Verdict |
|---|---|
| Two automatic paths (Claude hooks + Anthropic proxy) produce events without MCP calls | **Partially met.** Both are automatic and the gate test measures `mcp_calls_required === 0`. But strictly, the hooks emit protocol-v1 evidence events while the proxy emits receipts and deliveries — it never posts to `/v2/events`. If the condition means protocol-v1 evidence events, only one path satisfies it. |
| Daemon and receipt tests demonstrate fail-open | **Met.** The gate closes a real runtime, then the shipped adapter reports `failed_open` and the shipped shell hook exits 0 with empty stdout. |
| A seven-day internal audit produces measurement-quality counts and latency percentiles | **Not met — and it cannot be met by code.** The mechanism now exists (`850e7be` records context deliveries with real composition latency, so attachment rate, failed-open count, and p50/p95 come out as numbers instead of nulls), but no audit has been run. This is the one gate item that requires wall-clock time and real usage. It is the next action. |
| No request body mutated in audit mode | **Met by code and tests.** The fake provider receives byte-identical bytes and the gate fails if that flips. Audit composes a capsule but never injects; the hook was fixed so audit does not inject either, because a contaminated baseline would corrupt the measurement. |
| Node 18 legacy load smoke passes | **Met (2026-07-16).** Ran the real container smoke via docker/Colima: `node:18` (v18.20.8), confirmed `node:sqlite` is absent (`ERR_UNKNOWN_BUILTIN_MODULE`), then `cli.js help` and `cli.js code-index` both loaded and ran without it. The CI job encodes the same steps. |
| Existing MCP package suite passes unchanged | **Met.** 665/665, no existing test weakened. |

So the immediate next action is to **run the audit**: `kage connect --project <repo>` (audit is the only mode `connect` can write), use the repo normally for a week, then `node scripts/vnext-phase-a-report.mjs --project <repo> --json`. Then get the Node 18 CI job to actually run on a runner.

## Known limits to carry into Phase B

- **Exact TOKEN deltas are available far more often than exact COST deltas.** Every audit-mode exact receipt has `provider_input_cost_after_usd: null`, because the `count_tokens` side has a measured token count but no measured cache breakdown. A one-sided cost is UNUSABLE, not zero. Never conflate the two, and never let an aggregate treat a missing cost as no cost.
- `usage.input_tokens` is the UNCACHED REMAINDER, not the prompt size. Receipts measure `input + cache_creation + cache_read` so the two sides are commensurable. Comparing raw `usage.input_tokens` against `count_tokens` produces a fake ~98% saving on any cached session — see the `provider-usage-input-tokens` gotcha packet.
- Receipts are written only for requests that were actually transformed, so measurement coverage means "of transformed requests".
- `added_tokens` on a delivery is still null: nothing counts the injected block's tokens, and bytes/4 would be a fabrication.
- Context composition is non-blocking and killable, but not fast. A cold code-graph build takes tens of seconds and will exceed the adapter's 500 ms budget; the adapter fails open while the build warms the cache on the worker.

## Provider-neutral gateway workstream (2026-07-15) — COMPLETE

Separate from Phase A–E. Direction: the proxy is Kage's PRIMARY path across every provider (zero per-agent wiring); the Claude hook adapter stays as a richer secondary. Plan: docs/superpowers/plans/2026-07-15-kage-provider-neutral-gateway.md.

| Task | State | Commits |
|---|---|---|
| 1. Gateway seam + capture unification | Done & reviewed | `90fd714`, `a5d1761` |
| 2. OpenAI-compatible adapter | Done & reviewed | `71b689d`, `63d07f5` |
| 3. Gemini adapter | Done & reviewed | `14446bd`, `11212c1` |
| 4. Per-provider gate + report | Done & reviewed | `c1b3898`, `7e8c69b` |

Full suite 735/735, test:vnext 288/288, dogfood 12/12. The proxy now fronts Anthropic (/v1/messages), OpenAI (/v1/chat/completions, /v1/responses) and Gemini (:generateContent, :streamGenerateContent) behind one ProviderGateway seam; it emits protocol-v1 evidence to /v2/events (fail-open, connection cached so it never spawns ps per request); measurement is honest per provider (each provider's usage semantics encoded and source-verified: Anthropic input_tokens is the uncached remainder, OpenAI prompt_tokens and Gemini promptTokenCount are full totals); a Gemini prompt above the 200k tier prices to null not the wrong base rate; the audit report and kage status break down {exact,partial,unavailable}/token/cost PER PROVIDER, a zero-traffic provider is absent (not a $0 bucket).

Honest boundaries: the proxy is provider-API-scoped (an agent on a provider without an adapter gets no coverage); OpenAI/Gemini exact-COST coverage is lower (no cheap count-tokens probe; tier ceilings null); per-provider delivery/attachment attribution is now DONE (migration 003 adds a nullable `provider` column; proxy deliveries carry gateway.provider, hook deliveries are null and never guessed, the report splits attachment per provider with an `unattributed` bucket — commits 227e3d0, and blank-guard hardening). Azure OpenAI remains out of scope.

## Phase B — Repository Model and Knowledge Compiler (2026-07-18) — COMPLETE

All 10 tasks implemented, each through an implement -> adversarial-review -> harden loop via a background Workflow. Full suite 938/938 + dogfood 12/12; build clean; Phase B gate (mcp/vnext/phase-b-gate.test.ts) passes 2/2; frozen wire protocol untouched (only an additive non-wire TrustState type added, documented); Node 18 safe; storage migration at v5.

| Task | Commit(s) |
|---|---|
| 1 schema + domain types | 307653a |
| 2 versioned repo-model API | b7e36be, harden ac5ec96 |
| 3 adapt indexes into evidence | 68575e2 |
| 4 group evidence into episodes | 0c7344c, harden efd7e06 |
| 5 deterministic claim extractors + admission | fae1f0d, harden ee14225 (declared-script auto-verify must be exact) |
| 6 provider-neutral model extraction (shadow) | 74e9b21, harden c973fda (NaN clamp, URL/snippet redaction) |
| 7 entity resolution + claim consolidation | 5091068, harden d668543 |
| 8 verification, staleness, compiler pipeline | df8a828 |
| 9 packet import + OKF model export | e068b79, harden 1215240 (OKF export never mints "verified" from a human approval alone) |
| 10 model-backed context + Phase B gate | 0405107 |

Honesty wins from the review loop: a successful command auto-verifies ONLY when grounded on the repo's exact declared bare invocation (not `npm test && rm -rf /`, not a mismatched package manager, not npx); shadow model extraction PROPOSES only, never injects/verifies; OKF export never upgrades a human-approved claim to verified; only verified/approved claims are injectable. New modules: mcp/vnext/repo-model/ (schema, types, repository API, queries) + mcp/vnext/compiler/ (episode-builder, extractors, admission, model-extractor, entity-resolver, consolidator, verifier, staleness, pipeline) + mcp/vnext/context/model-source.ts + mcp/vnext/okf/ + mcp/vnext/migration/.

Green-light: Phase C (needs B schema + repo-model API + review-item API) and Phase D (needs B context-source interface) can begin.

## Phase D — Context Efficiency, Reversible Compression, Minimal Change Guard (2026-07-18) — COMPLETE

All 11 tasks implemented, each through an implement -> adversarial-review -> harden loop via a background Workflow (resumed once after a Task-9-review agent hang; Task-11 impl self-recovered after 5 stall-retries). Independently re-verified: `npm run build --prefix mcp` clean; `npm test --prefix mcp` **1120/1120 pass, 0 fail**; dogfood 12/12; Phase D gate (mcp/vnext/phase-d-gate.test.ts) **3/3**; frozen wire protocol untouched (git history on protocol/types.ts shows only the two pre-Phase-D commits; TransformPipelineReceipt added as an explicitly internal, non-wire type); no top-level node:sqlite (all guarded require / type-only); storage migration still at v5 (the content store is filesystem-based — node:fs + node:crypto — so Phase D needed no schema migration).

| Task | Commit(s) |
|---|---|
| 1 reversible content-addressed store | 97c2097, harden add2aa5 (never claims an original safe when its bytes are gone; gc deletes metadata before bytes) |
| 2 deterministic type-specific compressors | 2bb4ac0, harden b8e401c (repeated error-run preservation) |
| 3 budget engine (cost + latency, measured) | 27b4364 |
| 4 cache-aware transform pipeline | 0343c6e, harden 8c318d9 (store exact multi-block tool_result originals) |
| 5 assist + protect proxy modes (measured) | 8a05601 |
| 6 honest capability certification | e931693, harden c1b8b68 (fails closed on non-integer capture counts) |
| 7 reversible exact-retrieval + vNext MCP surface | 26281a1 |
| 8 Minimal Change preflight (repo-native guidance) | 7415fa5 |
| 9 deterministic post-diff policy checks | 12de2cb, harden 0682891 (parse hunk bodies by line count, not prefix) |
| 10 Guard -> PR check + receipts | 527b07a, b59c0ef |
| 11 cost cohorts + protect automation + gate | 0a89724 |

Honesty gates verified as real, enforced-in-code mechanisms (not decorative): **reversible** — transform.ts stores exact pre-compression bytes + embeds a `kage-content:<sha256>` marker; the gate retrieves each original through the shipped retrieval surface, fingerprint-verifies it, and confirms a different task gets 403. **Byte-preserving-on-failure** — audit forwards the original; any compressor throw or output-growth passes through the original bytes with a failed-open receipt (before==after, no fabricated saving); the gate drives store=null and confirms exact bytes forwarded. **Measured-not-estimated** — a receipt never claims a saving it did not achieve; tokens are provider-measured or null, never byte-derived.

**Honest gap (carried forward, not hidden):** the 20% savings / latency figures in the gate test are measured on a SYNTHETIC engineered-to-compress corpus (400 identical log lines). The shipped real-repo report (`scripts/vnext-phase-d-report.mjs --project . --json`) returns `empty_cohort` — there are ZERO real transformation receipts, and it reports that honestly rather than a fabricated zero. A committed real-body benchmark (`benchmarks/compression-realbody-kage.mjs`, `npm run bench:compression`) measures the shipped compressors over real bodies: **real-body median NET saving ~0%** (git diff ~0.1%, source/JSON passthrough); compression only pays off on genuinely repetitive payloads (~99% on a repeated-log contrast). So Phase D's efficiency thesis is proven as a safe, reversible MECHANISM and validated on real bodies as ~0% net — its value is payload-dependent and honestly measured. `kage up` keeps **audit** as the default; `lossy_compression` defaults false.

Known deliberate design note (not a defect): bare `kage proxy` keeps its historical `assist` default while `kage up` defaults to `audit`. This is intentional back-compat, documented in the CLI help and a code comment (decision G7); assist refuses to start on unhealthy reversible/receipt storage and does injection + lossless-only transforms unless lossy is explicitly enabled.

New modules: mcp/vnext/gateway/ (content-store, compressors/{logs,json,diff,test-output,stack-trace,provider}, budget-engine, budget-policy, transform, live-zone, cohort-metrics, providers/anthropic) + mcp/vnext/policy/ (preflight, post-diff, diff-parser, rules/{duplicate-symbol,missing-verification,new-dependency,public-contract,scope-expansion}) + mcp/vnext/phase-d-gate.test.ts + benchmarks/compression-realbody-kage.mjs + scripts/vnext-phase-d-report.mjs.

Green-light: Phase C (knowledge portal) and Phase E (team/commercial) remain.

## Phase C — Knowledge Portal and Review (2026-07-19) — COMPLETE (e2e CI-gated)

All 9 tasks implemented through implement -> adversarial-review -> harden via a background Workflow (resumed twice: once after a process restart, once after transient API connection drops — no work lost; the cached prefix replays and only the tail re-runs). Independently re-verified: `npm run build --prefix mcp` clean; `npm test --prefix mcp` **1170/1170 pass, 0 fail** + dogfood 12/12 (grew from 1120); Phase C gate (mcp/vnext/phase-c-gate.test.ts) **6/6**; frontend `npm test --prefix platform/web` (Vitest) **91/91** with the DTO type-sync guard passing; `npm run build --prefix platform/web` clean; frozen wire protocol untouched (git-confirmed); no top-level node:sqlite; migration stays v5 (the portal is a read-model over Phase B — no schema change).

| Task | Commit(s) |
|---|---|
| 1 portal read-model APIs (/v2/overview, features, system-map, runbooks, decisions, review-items, tasks, integrations) | 92e0a22 |
| 2 scaffold typed React/Vite portal (real npm install; committed lockfile) | 908728b, 000414c (DTO drift guard in test+build+CI) |
| 3 design tokens, shell, accessible navigation | 3095f05 |
| 4 overview + metric explanations (exactness/formula/source; unavailable never fabricated as 0) | 6169000 |
| 5 system maps + accessible table equivalents | 7eff248, harden f46698e (truncation carried into the a11y table) |
| 6 feature/runbook/decision pages (current truth vs history) | 6740885, harden 7450058 (stop fabricating dead evidence links) |
| 7 review queue + authorized mutations (actor+version 409, self-approval 403) | 3ea437b, harden 1ed695f (supersede targets the current claim) |
| 8 agent task + cost receipts (exact economics vs cohort; no fused ROI) | a85e4fe |
| 9 SSE + admin diagnostics + Playwright specs + Phase C gate | aa9e129 |
| (post-gate) e2e navigation fix | 8dcde5e (goto the /app SPA mount, not the origin) |

Honesty gates proven in code + tests (backend gate 6/6, backend suite 1170, frontend Vitest 91): overview metrics expose exactness (exact|cohort|structural|unavailable) + formula + source_path, and unavailable renders explicitly (never a 0 implying success); system maps carry an accessible table at exact node parity; feature/runbook/decision pages separate current truth from history/uncertainty (stale excluded from current, reported in health); review mutations enforce actor + expected-version (409 on drift) + local auth + decision note, and a proposer cannot self-approve a high-impact claim (403 self_approval_blocked); accepting a contradiction supersedes the opposing current claim; task receipts separate EXACT request economics from COHORT outcomes with no fabricated fused total; SSE /v2/events emits identifiers/enums only, never raw prompt/claim text; backend/frontend DTOs are kept in sync by a generated type-sync check (fails on drift) in test + build + CI, not hand-copy; the portal stays off the context-delivery critical path; raw packets/graph/DB diagnostics live only under /admin/diagnostics.

Two honest catches worth noting: Task 2's agent recognized the scaffold was already committed and REFUSED to fabricate a duplicate commit (re-verified instead); the Task-6 harden removed evidence links the UI was fabricating for claims with no real evidence.

**E2E status (honest):** the six Playwright browser journeys (onboarding/a11y shell, keyboard, degraded-daemon, receipt, review, runbook — 12 tests) EXIST and are CI-ready but were NOT run to green in this environment. Browsers install and launch here (`npx playwright install chromium` succeeds); the residual blocker is the absence of a live daemon serving the built portal under /app/ backed by a seeded repository model (features, a runbook slug `rotate-signing-keys`, a review item, a task `task-1`). The CI job supplies that via `KAGE_PORTAL_URL` and honestly SKIPS (never green-washes) when it is absent. A real navigation defect the gate flagged was FIXED post-gate (commit 8dcde5e): the specs navigated to origin paths (`/review`) that leave the SPA's /app mount; they now target `/app/…` and resolve correctly. The core honesty invariants the journeys assert are ALSO proven by the fast Phase C gate + component tests, so e2e is an additional browser-render check, not the sole proof. Remaining CI piece: a seeded-daemon harness to run the journeys to green.

New surface: mcp/vnext/api/ (types, read-models, router, review, task-receipts, events, system-map + tests) + mcp/vnext/phase-c-gate.test.ts + platform/web/ (React/Vite portal: src/{pages,components,api,router,styles} + e2e/ Playwright specs + scripts/sync-types.mjs) + mcp/daemon.ts serving the SPA under /app/.

Green-light: Phase E (team/commercial) remains, then release metrics + packaging.

## Phase E — Team Workspace and Commercialization (2026-07-21) — CODE-COMPLETE (commercial gate honestly NO-GO)

All 11 tasks implemented and committed. Delivery was hybrid after persistent API instability kept stalling the longest agents: Tasks 1 (tenant-scoped PG workspace foundation, f37fc9f) and 5 (least-privilege GitHub App, 21e15df) were hand-built in the main thread; Tasks 2–4 and 6–11 ran through the implement -> adversarial-review -> harden workflow. The review loop found REAL defects every round: a CSRF bypass via non-Bearer Authorization (e9908b5), a non-monotonic sync cursor + missing review-authority ingest gate (0b82abb), fake pooled-connection transactions where ROLLBACK could land on another backend (073db57 — db.ts now has a real single-client transaction() that destroys a poisoned connection), unordered Stripe events + an unapplied credit (0ba6123), six enterprise identity/data-control holes (78935fa), five deployment holes (aacc03d), and a gate test whose success path never actually asserted (06429a8).

Independently re-verified end-to-end: build clean; `npm test --prefix mcp` **1423/1423 aggregate** (main 1375 + deploy 36 + dogfood 12); workspace suite 176/176 against a REAL ephemeral embedded PostgreSQL 18 (genuine server logs observed, not mocks); frontend Vitest 105/105; frozen wire protocol untouched across the entire phase (git-empty diff); no top-level node:sqlite (type-only import + guarded require, locked by a regression test); local sqlite migration still v5 — the workspace's 12 ordered Postgres migrations are a separate ledger.

**Technical GA gate (mcp/vnext/phase-e-gate.test.ts) PASSES against real PG**, asserting with real backing: cross_tenant_reads=0 (tenant B sees zero of A's claims; cross-tenant review is 404 without disclosing existence), raw_payloads_synced=0 (a batch carrying local_raw evidence is refused 400 before any row lands), self_approvals=0 (403 self_approval_blocked while an independent reviewer's accept returns a real 202), duplicate_sync_records=0 (replayed push is a no-op), invalid_webhooks_accepted=0 (bad signature 401, processor never called; redelivery processed once), local_context_available_during_workspace_outage=true, export_available_after_entitlement_expiry=true.

**Commercial gate: honest NO-GO.** `scripts/vnext-phase-e-report.mjs` exits 1 with decision NO-GO: technical_gates_all_enforced=true, but partners_completed 0/3, paid_conversions 0/1, pilot cohort status not_run with every figure null (never a fabricated zero). honest_gaps enumerates exactly: design_partner_pilots_not_run, live_github_app_registration_needed, live_stripe_keys_needed, live_oidc_scim_idp_needed, docker_build_not_run_here. These require real external partners/credentials/daemons and were NOT faked.

| Task | Commit(s) |
|---|---|
| 1 PG workspace schema + boundary + embedded-PG harness | f37fc9f (hand-built) |
| 2 identity, sessions, roles, tenant enforcement | cafdc59, harden e9908b5 |
| 3 idempotent permission-aware sync outbox | 4131b46, harden 0b82abb |
| 4 team review authority + ownership + audit | f5562f5 |
| 5 least-privilege GitHub App | 21e15df (hand-built) |
| 6 privacy-safe team metrics + pilot reports | 13ff24a, harden 073db57 |
| 7 billing, entitlements, no-overhead credit | 3024644, harden 0ba6123 |
| 8 enterprise OIDC/SCIM/retention/security | f185c02, harden 78935fa |
| 9 managed + self-hosted packaging | dbff6b8, harden aacc03d |
| 10 default-surface cutover + legacy quarantine | 76e4819 (default MCP surface = kage_context/kage_retrieve/kage_feedback; 12-tool core -> KAGE_TOOLS=legacy) |
| 11 commercial readiness gate + GA report | ac0a495, harden 06429a8 |

New surface: mcp/vnext/workspace/ (db with real transactions, migrate + 12 SQL migrations, server, auth/, sync-routes, review, ownership, audit, metrics, pilot-report, billing/, github/, test-support/pg.ts) + mcp/vnext/sync/ (outbox with assertNoRawPayload, client, conflicts) + deploy/workspace/ (Dockerfile, compose, backup/restore, deploy.test.mjs wired into npm test) + mcp/vnext/phase-e-gate.test.ts + scripts/vnext-phase-e-report.mjs + mcp/vnext/migration/legacy-command-map.ts + docs/{integrations/github-app.md, commercial/, migration/}.

All five program phases (A, B, C, D, E) are now code-complete with passing gates. Remaining to GA: the external-world steps the report honestly names, and the goal-expansion workstreams (provider-neutral pipeline, history compression, memory-algorithm overhaul, collaborative-memory doc, release packaging).

## Commit ledger

### Program and isolation

- `869d4c7` — complete Kage vNext implementation program
- `22278be` — ignore local worktrees and create the implementation branch/worktree baseline

### Task 1

- `29554dd` — protocol v1 types and validators
- `817d814` — project validated values from owned fields
- `5918e35` — reject inherited capability array values

### Task 2

- `d4c53d7` — initial SQLite event/receipt store
- `5627634` — canonical Node runtime versions
- `1bcee4b` — storage privacy, schema, numeric, and JSON integrity
- `9cd6085` — preserve host ownership and validate current schema
- `21ed16e` — validate SQLite DB/WAL/SHM filesystem ownership

### Task 3

- `579b7a4` — initial authenticated loopback runtime and daemon integration
- `35b596d` — hardened runtime directory lease, SQLite singleton lock, task identity conflict handling, fatal UTF-8, and failure-independent cleanup

### Task 4

- `5aef382` — initial budgeted capsules, `ContextSource` seam, and `/v2/context`
- `236985b` — routed trust through `packetVerificationLabel`, capped query/identifier/path inputs, counted `priority` in the payload, fixed dedup-before-budget, reused recall/risk in the brief, and logged swallowed source failures
- `b8a3f54` — charged sections their exact serialized bytes so a token-boundary array cannot exceed `token_budget`
- `8daa017` — moved context composition onto a persistent worker thread so the kernel's synchronous work no longer blocks the runtime and the deadline can actually preempt it
- `6b25d23` — guarded the off-thread default against silent reversion and broke the cold-build livelock with a post-timeout cooldown

### Task 5

- `7f5ca5c` — initial fail-open Claude adapter (`plugin/hooks/kage-vnext-adapter.sh`, adapter client + mapping)
- `860a272` — hardened: a stale/killed runtime no longer silently disables Kage (pid liveness + status/token ownership checks), stand-down is per-event so `Stop`/`PreCompact`/`SubagentStop` keep running, audit no longer injects, file events are repo-scoped again, and the shipped shell path is the tested path

### Task 6

- `73c7a97` — initial transformation receipts, price snapshots, audit/assist forwarding
- `4fb4390` — receipts now measure TOTAL prompt tokens (input + cache_creation + cache_read) so a cached session cannot fake a saving; cache-aware pricing; legal `count_tokens` probe body; no receipt for an untransformed request

### Task 7

- `c17682e` — `kage connect|status|open|receipts`; audit-only connect; coverage reported as separate exact/partial/unavailable counts; one-sided costs reported unavailable, never zero

### Task 8

- `ba3475f` — protocol-v1 fixtures, real end-to-end phase gate, dual-runtime CI, `test:vnext`, the Phase A report, and the audit-preview migration doc (also fixed an unquoted test glob that `sh` was expanding)
- `850e7be` — record context deliveries (spool + `DeliveryStore` + migration 002) so attachment rate, failed-open count, and context latency percentiles are measurable instead of structurally null

### Cross-cutting (not Task 4)

- `fbb3531` — MCP `callTool` rejects unknown tool parameters instead of dropping them (a misnamed `kage_learn` argument used to write an empty-bodied packet); `learn()` refuses contentless packets; declared the `json`/`explain` parameters that `kage_context` and `kage_workspace_recall` honored but never advertised

## Resume commands

```bash
cd /Users/kushaljain/code/Kage/.worktrees/kage-vnext-implementation
git status --short
git log --oneline --decorate -12
npm run build --prefix mcp
node --test mcp/dist/vnext/runtime/server.test.js
npm test --prefix mcp
```

If the literal repo-root command includes `mcp/dist/daemon.test.js`, a pre-existing test assumes `process.cwd()` is `mcp/` and looks for `viewer/index.html` in the wrong directory. The package command `npm test --prefix mcp` runs from the correct working directory and is the authoritative full suite.

## Environment notes

- Local Node is new enough for `node:sqlite`; the package must still remain evaluation-time loadable on Node 18.
- Docker/Colima was unavailable during Task 2, so the real Node 18 container smoke could not run. The existing no-`node:sqlite` subprocess regression passed.
- Three pre-existing Kage packets have grounding warnings; they are unrelated and non-blocking.
- Avoid broad `kage reverify` on advisory historical packets. Resolve only actual `memory_reconciliation` items; broad reverify caused unnecessary metadata churn once and was reverted.

## Checkpoint maintenance

After each reviewed task:

1. Update the task table, active issue section, test counts, commit ledger, and next action.
2. Run `kage_refresh`, `kage_propose_from_diff` or the CLI diff proposal, and `kage_pr_check` as required by `AGENTS.md`.
3. Commit the checkpoint update on `codex/kage-vnext-implementation` so a new session can resume from repository state alone.
