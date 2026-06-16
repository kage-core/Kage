# Kage vs. claude-mem

Both give your coding agent memory across sessions. They make different bets
about *what memory is for*. This page lays out the difference honestly — including
where claude-mem is genuinely strong — so you can pick the right one.

> TL;DR: **claude-mem** is the best-in-class **capture-everything, per-machine**
> memory: install it and your agent remembers what happened, instantly, with great
> recall. **Kage** is **verify-and-share** memory: it keeps a smaller set of
> durable learnings in your repo, shared with your team through git, and checks
> every one against the actual code so the agent never acts on something that's no
> longer true.

## At a glance

| | Kage | claude-mem |
|---|---|---|
| Core idea | Verified, shared team memory | Capture everything, recall it later |
| Where memory lives | Plain JSON in your repo (`.agent_memory/`) | Local SQLite + vector store (per machine) |
| Shared across a team | ✓ through git, reviewed in the same PR | Per-machine by default |
| Checked against the code | ✓ at write, at recall, and at diff time | Not re-checked against code |
| Hallucinated citations | Rejected at write time | Stored as captured |
| Stale memory (cited code deleted/changed) | Withheld from recall, flagged before the PR | Served as-is |
| Account / cloud / API key | None | Local; no account |
| Setup | `npx -y @kage-core/kage-graph-mcp install` | `npx claude-mem install` |
| Dependencies | Zero runtime deps | Bundles a local store + worker |

## Where claude-mem shines

Credit where it's due — claude-mem is excellent at what it sets out to do:

- **Effortless, high-volume capture.** It records what your agent does and
  compresses it, so very little is lost. If you want "my agent just remembers
  everything," it's hard to beat.
- **Fast local recall** over a real vector store, with its own search UI.
- **Massive adoption and momentum** — tens of thousands of GitHub stars and an
  active contributor community. It's a proven, popular tool.

If you're a solo developer who wants maximum recall on one machine with zero
ceremony, claude-mem is a great choice.

## Where Kage is different

Kage makes two bets claude-mem doesn't:

### 1. Memory should be your team's, not one machine's

claude-mem's store lives on the machine that captured it. Kage's memory is plain
JSON committed to your repo, so the moment you push, a teammate's next agent
session starts with what you just learned — and the memory is reviewed in the
**same pull request** as the code it describes. No cloud, no sync service: it
rides your existing git remote.

### 2. Memory should prove it's still true

This is the core of Kage. Every memory cites the code it's about, and Kage checks
those citations against your real files:

- **At write time** — a memory that cites a file or symbol that doesn't exist is
  *rejected*, so a hallucinated claim never enters the store.
- **At recall time** — if the cited code was deleted or changed, the memory is
  *withheld*, so the agent never acts on a stale claim.
- **At diff time** — `kage pr check` warns you *before the PR* when your change
  invalidates a memory, so knowledge can't quietly rot.

A capture-everything store optimizes for *remembering*. Kage optimizes for
*not being wrong*. As a codebase moves underneath the memory, those are different
goals — and the gap shows up exactly when it's most expensive: an agent
confidently acting on something that used to be true.

## You don't have to choose blindly

Already running claude-mem? Kage can read its store and show you what a
truth-check would flag, without changing anything:

```bash
npx -y @kage-core/kage-graph-mcp audit-claude-mem --project .
```

This is read-only. It points Kage's citation check at claude-mem's captured
observations and reports which ones no longer match your code.

## When to pick which

- **Pick claude-mem** if you're solo, want maximum local recall, and "remember
  everything on this machine" is exactly the goal.
- **Pick Kage** if you work on a team, want memory shared and reviewed through
  git, and you care that the agent never acts on knowledge that's gone stale.

Try Kage in your repo:

```bash
npx -y @kage-core/kage-graph-mcp install
```

No account, no API key. Memory stays in your repo. See the
[docs](https://kage-core.com/guide.html).
