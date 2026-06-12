# Kage Cloud — design notes (v1: git-remote sync)

Status: design · waitlist open at https://github.com/kage-core/Kage/issues/74

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

## v2 — hosted endpoint (the business)

A private MCP URL per user/team (`https://mcp.kage-core.com/u/<id>`):

- Server-side store mirroring the same packet format; the endpoint serves
  `kage_context`-equivalent recall remotely.
- **Verification stays client-side**: the MCP client (agent session) gets
  packets + fingerprints and the local kage layer withholds anything that no
  longer matches the local code. The server never has to see the user's code —
  only packets. This is the privacy story CMEM can't tell: their cloud holds
  raw observations of everything the agent did; ours holds reviewed,
  secret-scanned packets the user already chose to keep.
- Team tier = shared packet namespaces with review gates (the org/promotion
  machinery that existed pre-2.0 becomes the cloud review flow).
- Pricing sketch: free personal (N packets), team per-seat.

Gate to build v2: waitlist signal on issue #74 (target: 50 reactions/comments)
or a design partner team.

## Decision log

- 2026-06-12: v1 scoped to git-remote sync; hosted endpoint deferred until
  waitlist proves willingness to pay. Rationale: CMEM proves demand for the
  promise, but our wedge (verification) works offline; the hosted layer is a
  distribution/business decision, not a product-truth one.
