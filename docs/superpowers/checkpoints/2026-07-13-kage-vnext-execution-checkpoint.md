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

Phase A is in progress.

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
| Node 18 legacy load smoke passes | **Partially met.** The no-`node:sqlite` subprocess regression passes locally and a Node 18 CI job is written, but it has never executed on a runner (no Node 18 or Docker available here). |
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

Honest boundaries: the proxy is provider-API-scoped (an agent on a provider without an adapter gets no coverage); OpenAI/Gemini exact-COST coverage is lower (no cheap count-tokens probe; tier ceilings null); per-provider delivery/attachment attribution needs a provider column on context_deliveries (a storage migration, not done); Azure OpenAI out of scope.

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
