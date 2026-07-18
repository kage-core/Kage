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

**Program status (2026-07-18):** Phase A COMPLETE, Phase B COMPLETE, provider-neutral gateway COMPLETE, **Phase D COMPLETE** (see the dated section below). Remaining: Phase C (knowledge portal) and Phase E (team/commercial), then release metrics + packaging. Suite is 1120/1120 + dogfood 12/12; build clean; migration v5; frozen wire protocol intact.

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
