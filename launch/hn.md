# Show HN draft

Post from your account, weekday 7-9am Pacific. First hour decides everything.
Ping the session after posting and paste hard comments in; reply in your own
words, fast. Concede real limitations (young project, single-repo focus,
heuristic call-edges at low confidence). HN rewards honesty over defense.

FORMATTING: HN is PLAIN TEXT. No **bold**, no `backticks` (they render as
literal characters). Paragraphs are single unwrapped lines separated by blank
lines. Code/commands are indented with two spaces. The text below is already
in that format. Paste verbatim.

**Title (exactly this, 79 chars):**

Show HN: Kage – turn your coding agent into a teammate that remembers your repo

**URL:**

https://github.com/kage-core/Kage

**Text (paste verbatim):**

Every session, my agents started from zero on our codebase: re-deriving bug causes a teammate had already found, re-asking why a module is shaped the way it is. The knowledge existed, but it was stuck in people's heads and dead chat logs. Kage makes it shared. One person (or one agent) learns something once, and every agent on the team remembers it. A teammate, instead of a contractor with amnesia.

The catch with shared memory is trust. Recall "auth lives in src/auth.ts" three weeks after that file was deleted, and the agent confidently builds on it. So Kage has one rule: memory has to prove itself. Every memory cites the files it's about, and it's checked against the repo three times:

- on write: a memory citing a file that doesn't exist is refused

- on recall: if the cited code changed or was deleted, the memory is withheld and flagged instead of served

- on your diff: "kage pr check" warns when a change you're about to merge invalidates something the team knows

Two things I think are genuinely different from other memory tools:

1. "kage scan" runs a read-only Truth Report on any repo with zero setup: duplicate implementations, exported-but-never-called code, bus-factor-1 hot files, knowledge voids (high-churn files nobody wrote anything about), and doc claims that don't match the code. Every finding cites file:line. On a fresh Express clone it finds 7 knowledge voids in about a minute.

2. Receipts. Every memory records what it cost to learn (in tokens), and every recall prints what it saved you. Measured, not estimated. "kage gains" shows the running ledger.

The loop runs on hooks. Sessions that captured nothing get auto-distilled into drafts you review (a signal gate keeps junk out), each session opens with a "previously..." digest, and memory citing a file is injected the moment the agent reads that file. Storage is plain JSON in the repo, reviewed in the same PR as the code. Personal memory syncs over a private git remote you own. No account, no API key, no database.

Try it (read-only) on your own repo:

  npx -y @kage-core/kage-graph-mcp scan --project .

Wire it in (auto-detects Claude Code, Codex, Cursor, Windsurf, anything MCP):

  npx -y @kage-core/kage-graph-mcp install

GPL-3.0. 241 tests. Young project, so I'd genuinely value the hard questions, especially from anyone who's been burned by an agent trusting stale context.

---

## Prepared HN comment (post as a REPLY when someone asks about teams/trying it. Never in the Show HN body, where it reads as lead-gen). Plain text, paste verbatim:

If anyone wants to see it on their own repo before installing anything, I'm doing live 30-minute runs this week: the scan, a stale-catch on a real diff, and the receipt at the end. https://kage-core.com/demo.html

Or fully self-serve:

  npx -y @kage-core/kage-graph-mcp scan --project .
