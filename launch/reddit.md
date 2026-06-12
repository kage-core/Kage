# Reddit posts

Rules: post manually from your account (the extension hard-blocks reddit.com,
and these subs are sharp about automation anyway). One sub at a time, a day
apart. Engage in every comment thread; don't drive-by link.

FORMATTING: Reddit renders full markdown, so the bold, backticks, and code
blocks below are intentional. Paragraphs are single unwrapped lines.

---

## r/mcp — https://www.reddit.com/r/mcp/submit

**Title (paste exactly):**

One teammate fixes a bug once, and now every coding agent on the team remembers it

**Body (paste verbatim, markdown):**

My team kept paying the same tax: every agent session started cold, re-deriving bug causes someone had already found, re-learning conventions someone had already written down in a dead Slack thread. Agents felt like contractors with amnesia, not teammates.

**Kage** is an MCP server (plus CLI) for shared repo memory. Capture a learning once (a bug cause, a decision, a gotcha) and every agent on the team recalls it when it matters. And because shared memory you can't trust is worse than none (ask me about the time recall cited a file we'd deleted three weeks earlier), every memory is verified, not just stored:

- A memory citing a file that doesn't exist is **refused at write time**.
- If the cited code changed or was deleted, the memory is **withheld at recall** and flagged for review, never silently served.
- `kage pr check` warns when **your diff** invalidates something the team knows, in the same review as the code.

The rest runs on hooks. Sessions that captured nothing auto-distill into drafts you review (signal-gated, so tool noise never becomes "memory"), every session opens with a "previously..." digest, and memory citing a file gets injected right when the agent reads that file. Each recall prints a receipt: tokens and dollars saved, measured per memory.

Storage is plain JSON in your repo, reviewed in PRs like code. Personal memory syncs across machines over a private git remote *you* own. No account, no API key, no database.

The fastest way to see if it's useful is a read-only scan of your own repo (~1 min). It finds knowledge voids, dead exports, and doc claims that don't match the code, all cited file:line:

    npx -y @kage-core/kage-graph-mcp scan --project .

One-command setup (auto-detects Claude Code, Codex, Cursor, Windsurf, anything MCP):

    npx -y @kage-core/kage-graph-mcp install

Site: https://kage-core.com · Repo (GPL-3.0): https://github.com/kage-core/Kage

If you'd rather watch before installing: I'm doing live 30-minute runs on people's actual repos this week. The scan, a stale-catch on a real diff, the receipt at the end. Grab a slot: https://kage-core.com/demo.html

Genuinely after feedback: how are you handling memory staleness today, and what would make you trust (or never trust) an agent's recalled context?

---

## r/ClaudeAI — post a day later — https://www.reddit.com/r/ClaudeAI/submit

**Title (paste exactly):**

Claude Code now remembers your repo like a teammate. What one session learns, every session knows

**Body (paste verbatim, markdown):**

Every new Claude Code session starts cold: re-deriving the same bug causes, re-asking why a module is shaped the way it is. The fixes I'd seen all share a flaw. They remember everything and verify nothing, so weeks later Claude acts on memory describing code that no longer exists.

Kage wires into Claude Code with one command (`npx -y @kage-core/kage-graph-mcp install`, or `/plugin marketplace add kage-core/Kage`) and closes the loop:

- **SessionStart**: Claude gets a "previously..." digest plus a timeline of recent repo memory.
- **While working**: when Claude reads a file, verified memory about *that file* is injected right then. New learnings are captured as packets, and every citation is checked against the repo before anything is stored.
- **Stop**: if the session saved nothing, its observations are auto-distilled into drafts you review. If your changes invalidated team memory, you're told before the PR.
- **Receipts**: every recall prints tokens and dollars saved, measured. `kage gains` shows the week.

Memory is plain JSON in the repo (PR-reviewed, git-native). No vector DB, no API key, no account. Wrap anything in `<private>...</private>` and it's never stored.

Before installing anything, you can run the read-only Truth Report on your repo. It's the 60-second version of "is this useful to me":

    npx -y @kage-core/kage-graph-mcp scan --project .

Site: https://kage-core.com · Repo (GPL-3.0): https://github.com/kage-core/Kage

Would love to hear where this breaks for your setup: monorepos, multiple worktrees, whatever you've got. And if you want me to run it live on your repo before you install anything, I'm doing 30-min sessions this week: https://kage-core.com/demo.html
