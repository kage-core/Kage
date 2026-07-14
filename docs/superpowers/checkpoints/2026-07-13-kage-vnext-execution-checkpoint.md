# Kage vNext Execution Checkpoint

**Updated:** 2026-07-14
**Execution mode:** Subagent-driven development with per-task specification and code-quality reviews
**Branch:** `codex/kage-vnext-implementation`
**Worktree:** `/Users/kushaljain/code/Kage/.worktrees/kage-vnext-implementation`
**Last reviewed implementation commit:** `fbb3531`

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
| 5. Claude fail-open adapter | Next | Start with `kage_context`, extract the full Task 5 text, then dispatch a fresh implementer |
| 6. Exact-measurement proxy gateway | Pending | — |
| 7. Connection/status/receipt CLI | Pending | — |
| 8. CI, fixtures, and Phase A gate | Pending | — |

## Next action

Begin Phase A Task 5, “Convert Claude hooks into a fail-open adapter.” Do not revisit Tasks 1–4 unless a new regression points to them.

Task 4’s reviews confirmed:

- the `ContextSource` seam matches the plan and `LegacyContextSource` is the only vNext module importing `mcp/kernel.ts`;
- trust routes through the kernel’s exported `packetVerificationLabel`, so the `verified` tier is reachable, stale packets are excluded, and a packet with no `quality` key no longer throws a bogus `503`;
- `/v2/context` rejects oversized query, identifier, path-count, and path-length inputs before any kernel work;
- section cost is charged in exact serialized bytes, so `estimated_tokens` never under-reports the delivered sections, and the whole capsule is bounded by `token_budget + MAX_CAPSULE_ENVELOPE_TOKENS`;
- source failures reach stderr while the HTTP body still leaks nothing.

Context composition no longer runs on the request thread (`8daa017`, `6b25d23`). The original Task 4 implementation ran the kernel's synchronous work directly on the runtime's event loop; that was fixed rather than carried forward as a limitation. It now runs on a persistent worker thread (`WorkerContextSource`), so the synchronous kernel work no longer occupies the runtime’s event loop and `/v2/health`, `/v2/events`, and `/v2/receipts` stay answerable while an analysis is in flight. Because the work is on a worker, the deadline is real: `terminate()` preempts synchronous CPU that no timer on the request thread could. `LegacyContextSource` is unchanged and now runs inside the worker, still the only vNext module importing the kernel.

What Task 5 can rely on: the runtime stays responsive, so an adapter that aborts at 500 ms and fails open will not lose evidence events. What it must not assume: that context composition is *fast*. A cold code-graph build still takes tens of seconds and will exceed a 500 ms budget — the adapter is expected to abort and fail open, while the build completes on the worker and warms the cache for the next request. The worker deadline (60 s) is a runaway killer, not a latency budget. After a deadline kill the source drops queued jobs and fails fast for a cooldown, because `buildCodeGraph` persists `graph.json` only on completion: without that, a repo whose cold build exceeds the deadline would re-enter the same doomed build on every request forever. An out-of-band `kage refresh` warms the graph and is the intended recovery.

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
