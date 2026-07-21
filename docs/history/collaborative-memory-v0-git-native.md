> **Historical (2026-07-13, v0).** This documented the git-native team tier and the honest audit
> that led to it — including the then-correct decision NOT to build an org tier. Phase E has since
> shipped a REAL tenant workspace (Postgres, review authority, idempotent approved-only sync,
> GA-gated) — see [`docs/COLLABORATIVE_MEMORY.md`](../COLLABORATIVE_MEMORY.md) for the current
> framework and its measured proofs. The git-native tier described here still works and remains the
> zero-infrastructure default.

# Kage as collaborative memory — design notes (v0: git-native team tier)

Status: shipped. This documents what changed and why, grounded in an audit of
the actual code (not the aspirational skill/doc text some of it had drifted
from) — see `git log` around this file's introduction for the exact commits.

## The question this answers

"Is Kage the best framework for collaborative memory on OKF?" — before adding
anything, we audited how memory is actually saved, extracted, ingested, and
maintained today, across four independent passes over the real code
(`mcp/kernel.ts`, `mcp/proxy.ts`, `mcp/cli.ts`, the hooks, the CI bot, the git
merge driver). The honest finding: **the "collaborative" and "org/global"
story in Kage's own skill descriptions and packet metadata was partly
aspirational.**

- `promotion_requires_review: true` is written onto every packet's
  `quality` block, but nothing in `mcp/kernel.ts` ever reads it. It is
  descriptive metadata, not an enforced gate. The real gate is a comment
  ("never auto-promote org/global") and this repo's own standing agent
  instructions — convention, not code.
- `scope: "org"` exists in the `MemoryScope` type union and is never assigned
  anywhere. There is no `kage_submit` / "contribute to the global graph"
  command despite a shipped skill description claiming one. `docs/CLOUD.md`
  confirms this directly: the hosted team tier is v2, gated on a waitlist
  signal, "the business" — not built.
- What **is** real: repo memory (`.agent_memory/packets/*.md`) is git-tracked,
  so every teammate who clones the repo already shares it — for free, with no
  new infrastructure. A real git merge driver
  (`git config merge.kage-packet.driver`) already runs on conflicts. A real
  interactive review queue (`kage review`) already exists for pending
  packets. A CI bot (`kage-sync`) already keeps the shared graphs fresh on
  every push to `master`.

So the design decision was: **don't build a fake org tier. Make the team tier
that already exists — git — actually trustworthy**, and make its state
legible to a team lead in one command. That's a scoped, honest, shippable
answer, and it's what a team would actually pay for: not a promise of a
hosted backend, but proof that the memory they already share via git isn't
quietly lying to them or losing their teammates' work.

## What was actually broken

1. **The merge driver silently discarded a teammate's concurrent edit.**
   `mergePacketFiles()` is last-write-wins by each side's self-reported
   `updated_at` — not a field-level three-way merge (the `base` argument was
   explicitly unused: `// Reserved for a future field-level three-way
   merge.`). When two teammates both touched the *same* packet file around
   the same time (both reverified it, or one approved while another
   superseded it), the losing side vanished with no trace. Personal
   cross-machine sync (`kage sync`, see `docs/CLOUD.md`) already preserved
   losers under `~/.kage/memory/conflicts/` — the repo-team path was the one
   place this safety net was missing.
2. **No attribution.** `author_branch` was captured but never `author_name`
   — a reviewer looking at a pending packet, or an agent reading a recalled
   claim, had no way to know *who* on the team said it.
3. **No visible team-health signal.** `kage gains` and `kage savings` answer
   "how much did Kage save me," not "is our shared memory trustworthy right
   now" — contributor spread, review backlog age, how much is silently
   withheld as stale, how many contradictions are unresolved.
4. **The proxy's ingestion tagged every observation `session_id: "default"`**
   — literally the string, not a real identifier. Every `kage proxy` run,
   across every restart, on any repo, shared one dedup bucket, and diverged
   from whatever real session id a `UserPromptSubmit` hook might be recording
   under for the same conversation — a structural risk of double-capturing
   the same exchange once both entry points are active.

## What shipped

- **`mergePacketFiles()` now preserves the losing side.** When both sides of
  a conflict parse and genuinely diverge (not a no-op race), the loser is
  written to `.agent_memory/conflicts/<id>-lost-<timestamp>.md` instead of
  being discarded, and the merge driver's stderr (what git shows during a
  real merge) says so. Best-effort: a failure to preserve never blocks the
  merge itself. Verified by a test that reverse-engineers the exact race (two
  concurrent edits to one packet) and asserts the loser's real content is
  recoverable from disk afterward.
- **`author_name`** (git `user.name` at capture time) is now stored on every
  repo-scoped packet, surfaced in `kage review`'s listing (`By: <name> on
  <branch>`) and in the recall context block's `Team memory:` line (`decided
  <date> by <name> · <path>`). Personal-store packets stay unattributed by
  design — attribution is a team-collaboration concept, not a personal one.
- **`kage team`** — the health receipt: approved-packet count, contributors
  and their packet counts, pending-review count and the oldest item's age,
  how many packets are currently withheld from recall as stale
  (`recallStaleReason` — the live gate, not a lagging metric), open
  contradictions (`kageConflicts`), and how many merge conflicts were caught
  and preserved rather than silently dropped. Every field maps to a real,
  audited mechanism; the caveats printed with `--json` say exactly what each
  number does and doesn't mean.
- **The proxy now tags its observations with a stable per-process session id**
  (`proxy-<uuid>`), not the literal string `"default"` — fixes correct
  within-run dedup and makes proxy-captured observations distinguishable from
  hook-captured ones in `.agent_memory/observations`.
- **Two pre-existing CLI documentation gaps fixed in passing**: `kage savings`
  and `kage proxy` (both shipped earlier and never added to `kage help
  --all`) are now documented alongside `kage team`.

Full suite passing, including a simulated two-contributor,
one-pending-review, one-stale-drift, one-preserved-conflict scenario that
exercises the whole loop end to end and asserts on the receipt's exact
numbers before and after a reverify.

## The selling point

Every other "AI memory" product either (a) is single-user and unverified —
embeddings that don't know when the code under them changed, or (b) promises
a team backend that doesn't exist yet. Kage's answer:

> **Your team's memory already lives in your repo. Kage makes sure it's
> never wrong and never silently lost — verified against your code on every
> read, attributed to whoever wrote it, and legible in one command.**

The artifact a team lead can screenshot is `kage team`: not "AI remembered
things" (unfalsifiable), but a number for how much of what's remembered is
currently verified-fresh, who wrote it, how big the review backlog is, and
proof that concurrent edits don't vanish. That is what turns memory from a
vibe into something a team can be accountable to — and it costs zero new
infrastructure, because git already is the sync layer.

## Update: the proxy now spans a whole workspace, and a real hosted tier exists

Two things below were true when this doc was first written and no longer are.

**The proxy is no longer pinned to one repo.** `kage proxy --workspace <dir>`
reads the "Primary working directory" Claude Code actually sends in its
system prompt (confirmed against a live captured request, not guessed) and
routes each request to that repo's own memory — one proxy process, an entire
workspace of repos, each getting its own recall/injection/capture. A
candidate directory outside `--workspace` is never honored; without
`--workspace` at all, behavior is byte-for-byte what it always was. Proven
end-to-end: one proxy instance served two different repos in the same test
run, each getting only its own memory injected (`mcp/proxy.test.ts`).

**A real, tested, self-hostable team server now exists** — `kage cloud`, see
`docs/CLOUD.md`'s "v1.5" section. It does not replace the honest limitation
below about the *managed* hosted tier (nobody has deployed this publicly; the
v2 SaaS waitlist gate is unchanged), but "there is no hosted team tier" is no
longer accurate — there is one, self-run. `kage cloud push`/`pull` moves
packets through a review gate (a submitter cannot approve their own packet)
into a new "Team Memory" recall section, and every pulled packet is
re-verified against the pulling machine's own checkout before an agent sees
it — the same client-side trust boundary as everything else in this doc, now
proven to hold across a real network hop, not just within one repo's git
history.

## What this still does not solve

Said plainly, so it isn't oversold:

- **The merge driver is still last-write-wins, not a field-level three-way
  merge.** Preservation means nothing is silently lost, not that conflicts
  resolve themselves — a human still reconciles `.agent_memory/conflicts/*`
  by hand today. `mergePacketFiles()`'s unused `base` argument is exactly
  where a real three-way merge would hook in; that's future work, not done.
- **The proxy and hooks can still double-capture the same exchange** if both
  are active for one session — the proxy has no visibility into Claude
  Code's own session id at the HTTP layer, so a stable per-process id closes
  the "default" bucket-collision risk but doesn't unify the two capture
  paths. Confirmed live, not just theorized: a real proxied request produced
  two independent observations, one from the proxy's own tap and one from
  Claude Code's own ambient hooks firing under their real session id. A
  shared session-id header would need cooperation from the client side
  (Claude Code itself), which is out of Kage's control.
- **The hosted server is unhardened and undeployed.** No TLS, no rate
  limiting, bearer tokens instead of real SSO, no horizontal scaling story —
  fine for a self-hosted internal tool behind your own proxy/VPN, not fine as
  a public multi-tenant service. That gap, and the managed-SaaS business
  decision itself, is exactly what the v2 waitlist gate in `docs/CLOUD.md`
  still exists to test before anyone builds it.
