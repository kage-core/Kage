# Show HN draft

Post from your account. First hour decides everything — I'll be in comment-support
mode; paste any hard comment to me and post replies in your own words.

**Title (pick one, ≤80 chars):**

1. Show HN: Kage – memory for coding agents, verified against your code
2. Show HN: Kage – my coding agent's memory now has to prove itself
3. Show HN: Verified memory for coding agents (no account, syncs over your own git remote)

Recommended: #1.

**URL:** https://github.com/kage-core/Kage
(Repo over website for Show HN — HN prefers source. The README carries the story.)

**Text (goes in the text field):**

Every memory system I tried for coding agents had the same failure mode: the
longer you use it, the less you can trust it. Memory written weeks ago still
gets recalled after the code it describes was refactored away — and an agent
acting on wrong memory is worse than one with none.

Kage is my attempt at memory that has to prove itself. Every memory cites the
files it's about, and it's checked against the repo three times:

- on write: a memory citing a file that doesn't exist is refused
- on recall: if the cited code was deleted or changed, the memory is withheld
  and flagged instead of served
- on your diff: `kage pr check` warns when a change you're about to merge
  invalidates something the team "knows"

The rest of the loop runs on hooks: sessions that captured nothing get
auto-distilled into drafts you review (a signal gate keeps junk out), the next
session opens with a "previously…" digest, and every recall prints a receipt
of tokens/dollars saved — measured per memory, not estimated.

Memory lives as plain JSON in your repo (reviewed in the same PR as the code)
plus a personal store that syncs over a private git remote you own. No
account, no API key, no database. One command to install:
`npx -y @kage-core/kage-graph-mcp install` — wires Claude Code, Codex, Cursor,
Windsurf, and anything MCP.

Try the 30-second trust demo: `npx -y @kage-core/kage-graph-mcp demo`

GPL-3.0. Would love the hard questions — especially from anyone who's watched
an agent confidently act on stale knowledge.

**Timing:** weekday, 7–9am Pacific. Avoid Fri evening/weekend.
**After posting:** reply to every substantive comment within minutes. Concede
real limitations fast (single-repo focus, young project, heuristic call
resolution at low confidence) — HN rewards honesty over defense.
