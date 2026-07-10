# Kage Cloud — design notes + a real, self-hostable server

Status: `kage sync` (personal, git-remote) has shipped since v1. A real, tested,
self-hostable team server (`kage cloud`) now exists too — see "v1.5" below. Neither
is deployed anywhere public; the original waitlist gate for a MANAGED, multi-tenant
SaaS is unchanged (https://github.com/kage-core/Kage/issues/74) — see the decision
log for why v1.5 exists despite that.

## The gap

claude-mem/CMEM's hero promise is "every session, every machine": a private
hosted MCP endpoint that makes memory follow the user. Kage memory today is
repo-local — it follows the *repo* (via git), not the *person*. Personal and
workspace memory is stranded on one machine.

## Principles

1. **No account required, ever, for the core.** Sync must work without our
   servers existing.
2. **Verified sync.** Nothing is recalled on a new machine unless its
   citations still verify against the code that machine has. Sync moves
   packets; trust is re-established locally. This is the differentiator —
   capture-everything tools sync rot; we can't, structurally.
3. **Git is the v1 transport.** Users already trust it, it's E2E-private to
   their remote, and it gives us history/conflict semantics for free.

## v1 — `kage sync` (git-remote based, no hosted service)

```
kage sync setup --remote git@github.com:me/kage-memory.git   # once, any machine
kage sync                                                     # push + pull personal/workspace memory
```

- Personal store lives at `~/.kage/memory/` (packets + minimal index), a git
  repo with the user's own private remote.
- `kage sync` = commit local packet changes → pull --rebase → push. Conflicts
  resolve packet-wise by `updated_at` (newest wins), with losers preserved
  under `~/.kage/memory/conflicts/`.
- Repo memory keeps syncing the way it already does: through the repo itself.
- On recall, synced personal packets are labeled `[personal]` and re-verified
  against the local checkout before use (stale → withheld, same as repo
  memory).

What this buys: cross-machine continuity with zero infrastructure, zero new
trust surface, shipping in days not months.

What it doesn't buy: a private MCP URL usable from ephemeral environments
(Codespaces, CI), team real-time sharing, or a business.

## v1.5 — `kage cloud` (real, self-hosted team server)

Not the managed SaaS from the original v2 sketch below — a genuine, tested,
run-it-yourself implementation of the SAME architecture, built to prove the
design holds up under real HTTP traffic before any managed offering exists.
Zero new dependencies: `node:http` + `node:sqlite` (`mcp/cloud-server.ts`,
`mcp/cloud-client.ts`).

```
kage cloud serve --port 8790 --db ./kage-cloud.db          # run the server (self-host it — see below)
kage cloud create-team --server <url> --name "Payments"    # -> team_id + owner token, shown once
kage cloud invite --server <url> --team <id> --token <t> --label alice   # a teammate's own token
kage cloud push  --project . --server <url> --team <id> --token <t>     # submit local approved packets (lands pending)
kage cloud list  --server <url> --team <id> --token <t> --status pending
kage cloud approve --server <url> --team <id> --token <t> --packet <id> # blocked if you're the submitter
kage cloud pull  --project . --server <url> --team <id> --token <t>     # -> .agent_memory/team/packets/, surfaces in recall as "## Team Memory"
```

**Verification stays client-side, exactly as designed**: the server only ever
stores a packet's JSON + who submitted/approved it. It never sees a line of
source code, never re-derives trust, and never decides what's stale. Every
pulled packet is re-verified against the machine that pulled it — by the same
`recallStaleReason` fingerprint check repo and personal memory already use —
before an agent ever sees it (`teamRecallEntries` in `mcp/kernel.ts`). A
packet approved for the whole team can still be silently withheld on one
teammate's machine if their checkout has diverged; that's the point, not a
bug (verified in `mcp/cloud-server.test.ts`).

**The review gate is enforced, not cosmetic**: a submitting token can never
approve its own packet (403 `self_approval_blocked`) — a second real token
must. Resubmitting a packet (same deterministic id) after a rejection, or
pushing updated content for something already approved, resets it to pending
rather than either erroring or silently re-trusting unreviewed changes.

**Deploy runbook** (the one thing not done here — no cloud account/domain was
available to actually publish it): the server is a single Node process reading
`PORT`/`--port` and `KAGE_CLOUD_DB_PATH`/`--db`. It runs unmodified on Railway,
Render, Fly.io, or any VPS: `node dist/cloud-server.js` (or wire a `kage cloud
serve` systemd unit), with the SQLite file on a persistent volume. It has no
TLS, no rate limiting, and no plan for horizontal scaling — put it behind your
own reverse proxy/VPN before exposing it beyond your own network, the same as
any other self-hosted internal tool.

## SDLC work items — agents drive, humans approve gates

`kage cloud approve` is also the non-forgeable approval gate for Kage's
work-item state machine (`mcp/kernel.ts`): a `type: proposal` packet advances
`proposed → claimed → in_review → done`, and the `in_review → done` edge —
the only terminal one — can only be reached two ways:

1. `kage gate review` — a local, TTY-interactive reviewer prompt. Its
   self-block (an actor can't approve their own claim) compares plain
   `git config user.name` strings, which is **spoofable**. Treat it as a
   convenience gate for solo/trusted-local work, not a real control.
2. `kage cloud approve` — the same server-side, bearer-token-hash
   self-approval block described above, extended so that after a *different*
   teammate's token approves, the submitter's own checkout applies the local
   `done` transition (`kage cloud approve` glue in `mcp/cli.ts`). This is the
   only actually non-forgeable gate in the whole design.

No MCP tool and no CLI flag can perform the `in_review → done` transition
directly — `kage_transition_work_item` rejects `to_stage: "done"` outright,
and `kage stage --to done` refuses non-interactively — precisely so an agent
with MCP/CLI access can't approve its own gate through a longer code path.

**Boundary, stated explicitly so it doesn't erode under future feature
pressure: Kage never holds an API key or spawns an agent process.** The
work-item state machine is something external agent runners poll, claim, and
advance themselves (via CLI or MCP tools) — Kage orchestrates *state*, never
*compute*. `kage cloud serve` stores packet JSON and enforces the approval
gate; it does not call an LLM, does not run an agent loop, and does not need
credentials for one. If a future change makes the daemon or cloud server spawn
or drive an agent process directly, that is a different, much bigger product
(billing, API-key custody, a new security surface) and needs its own explicit
decision, not a quiet extension of this one.

```
kage learn --learning "..." --title "..."         # type: proposal (auto-classified), stage: proposed
kage claim --packet <id> --actor <name>            # stage: claimed
kage learn --title "..." --type decision ...       # the actual work, as a normal packet — no new type needed
kage implements --packet <output-id> --proposal <id> --evidence "..."   # links them, auto-advances proposal to in_review
kage gate list                                      # see what's in_review
kage gate review                                    # LOCAL gate (weaker, TTY-only)
kage cloud approve --packet <id> --token <teammate-token>   # CLOUD gate (non-forgeable) -> stage: done
```

## v2 — managed hosted endpoint (the business)

A private MCP URL per user/team (`https://mcp.kage-core.com/u/<id>`), run BY
Kage rather than self-hosted — the actual commercial product, if it happens:

- Everything v1.5 already proves (packet store, review gates, client-side
  verification), operated as a managed multi-tenant service instead of
  something you run yourself: TLS, auth hardening beyond bearer tokens (real
  SSO), backups, uptime.
- Pricing sketch: free personal (N packets), team per-seat.

Gate to build v2: waitlist signal on issue #74 (target: 50 reactions/comments)
or a design partner team. v1.5 does not change this gate — self-hosting your
own server costs Kage nothing and proves nothing about willingness to pay for
someone else to run it.

## Decision log

- 2026-06-12: v1 scoped to git-remote sync; hosted endpoint deferred until
  waitlist proves willingness to pay. Rationale: CMEM proves demand for the
  promise, but our wedge (verification) works offline; the hosted layer is a
  distribution/business decision, not a product-truth one.
- 2026-07-09: built v1.5 (`kage cloud`), a real self-hostable server, at
  explicit user request, ahead of the v2 waitlist gate. This does not reverse
  the 2026-06-12 decision: v1.5 has no deployment, no billing, and does not
  demonstrate willingness to pay — it demonstrates that the architecture in
  this doc actually works end-to-end (proven live: create team, push, block
  self-approval, real second-reviewer approval, pull into a different repo,
  surfaces correctly in recall, and a server-approved-but-locally-unverifiable
  packet is correctly withheld). The managed-SaaS gate is unchanged.
- 2026-07-10: pivoted Kage from a passive memory layer toward an agent-driven
  SDLC platform ("agents drive, humans approve gates"), at explicit user
  request after discovery/growth efforts on repo memory alone didn't produce
  usage. Phase 1 shipped a `WorkStage` state machine (`proposed → claimed →
  in_review → done`) on `type: proposal` packets, reusing `kage cloud
  approve`'s existing non-forgeable self-approval block as the terminal gate —
  see "SDLC work items" above. Deliberately scoped as Kage-as-substrate (state
  orchestration only): no code here holds an API key or spawns an agent
  process. That boundary is the load-bearing decision for this pivot and is
  meant to hold under future feature pressure, not just describe today's
  state.
