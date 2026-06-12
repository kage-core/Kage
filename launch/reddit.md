# Reddit posts

Rules: post manually from your account (the extension hard-blocks reddit.com,
and these subs are sharp about automation anyway). One sub at a time, a day
apart. Engage in every comment thread — don't drive-by link. Lead with the
problem, not the pitch. Good fits in order: r/mcp, r/ClaudeAI, r/ChatGPTCoding.

---

## r/mcp

**Title:** I gave my coding agents memory that has to prove itself — every recall is re-checked against the repo

**Body:**

The thing that finally made me build this: a memory MCP server confidently
told my agent "auth lives in src/auth.ts" three weeks after we'd deleted that
file. The agent built on it anyway. Memory stores only grow — nothing ever
re-checks what's in them against the code.

**Kage** is an MCP server (plus CLI) where memory is verified, not just stored:

- A memory citing a file that doesn't exist is **refused at write time**.
- If the cited code changed or was deleted, the memory is **withheld at
  recall** and flagged for review — never silently served.
- `kage pr check` warns when **your diff** invalidates something the team
  knows, in the same review as the code.

The rest runs on hooks: sessions that captured nothing auto-distill into
drafts you review (signal-gated, so tool noise never becomes "memory"), every
session opens with a "previously…" digest, and memory citing a file gets
injected right when the agent reads that file. Each recall prints a receipt —
tokens/dollars saved, measured per memory.

Storage is plain JSON in your repo, reviewed in PRs like code. Personal
memory syncs across machines over a private git remote *you* own. No account,
no API key, no database.

The fastest way to see if it's useful — a read-only scan of your own repo
(~1 min, finds knowledge voids, dead exports, doc claims that don't match
the code, all cited file:line):

    npx -y @kage-core/kage-graph-mcp scan --project .

One-command setup (auto-detects Claude Code, Codex, Cursor, Windsurf,
anything MCP):

    npx -y @kage-core/kage-graph-mcp install

Site: https://kage-core.com · Repo (GPL-3.0): https://github.com/kage-core/Kage

Genuinely after feedback: how are you handling memory staleness today, and
what would make you trust (or never trust) an agent's recalled context?

---

## r/ClaudeAI (post a day later, different angle)

**Title:** Claude Code forgets your repo every session — I built verified memory for it (hooks + MCP, no account)

**Body:**

Every new Claude Code session starts cold: re-deriving the same bug causes,
re-asking why a module is shaped the way it is. The fixes I'd seen all share
a flaw — they remember everything and verify nothing, so weeks later Claude
acts on memory describing code that no longer exists.

Kage wires into Claude Code with one command (`npx -y
@kage-core/kage-graph-mcp install`, or `/plugin marketplace add
kage-core/Kage`) and closes the loop:

- **SessionStart**: Claude gets a "previously…" digest + a timeline of recent
  repo memory.
- **While working**: when Claude reads a file, verified memory about *that
  file* is injected right then. New learnings are captured as packets; every
  citation is checked against the repo before anything is stored.
- **Stop**: if the session saved nothing, its observations are auto-distilled
  into drafts you review. If your changes invalidated team memory, you're
  told before the PR.
- **Receipts**: every recall prints tokens/dollars saved, measured. `kage
  gains` shows the week.

Memory is plain JSON in the repo (PR-reviewed, git-native) — no vector DB,
no API key, no account. Wrap anything in `<private>…</private>` and it's
never stored.

Before installing anything, you can run the read-only Truth Report on your
repo — it's the 60-second version of "is this useful to me":

    npx -y @kage-core/kage-graph-mcp scan --project .

Site: https://kage-core.com · Repo (GPL-3.0): https://github.com/kage-core/Kage

Would love to hear where this breaks for your setup — monorepos, multiple
worktrees, whatever you've got.
