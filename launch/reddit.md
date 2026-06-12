# Reddit posts

Rule: each sub has self-promo norms. Post as a genuine "I built this, feedback
welcome" — engage in comments, don't drive-by link. Lead with the problem, not the pitch.
Good fits: r/ClaudeAI, r/mcp, r/ChatGPTCoding, r/LocalLLaMA. One sub at a time.

---

## r/mcp / r/ClaudeAI

**Title:** I built shared, code-grounded memory so my team's coding agents stop rediscovering the repo

**Body:**

Every session my agents started from zero on our codebase — re-deriving the same bug causes, re-asking why a module is shaped the way it is, re-learning conventions a teammate already figured out. The knowledge existed; it was just stuck in people's heads and one-off chat sessions.

So I built **Kage** — a memory layer (MCP server) shared across a team and their agents, with one rule: memory has to prove itself.

- Capture a learning once (a bug cause, a decision, a gotcha); the whole team + every agent recalls it when it's relevant. If a session captured nothing, its observations are auto-distilled into drafts you review — a signal gate keeps junk out.
- Memory is **verified against your actual code**: a note citing a file that doesn't exist is refused on write; when the cited code is deleted or refactored, the note is withheld from the agent and flagged for you; and `kage pr check` warns when *your diff* invalidates something the team knows.
- Every session starts with a "previously…" digest, and every recall prints a receipt — tokens and dollars saved, measured per memory.
- Stored as plain JSON in your repo, reviewed in PRs. Personal memory syncs across machines over a private git remote you own. No vector DB, no API key, no account.
- One command wires everything: `npx -y @kage-core/kage-graph-mcp install` (Claude Code, Codex, Cursor, Windsurf — anything MCP).

30-sec trust demo: `npx -y @kage-core/kage-graph-mcp demo`
Site: https://kage-core.com
Repo (GPL-3.0): https://github.com/kage-core/Kage

Would genuinely love feedback — especially how you're handling shared context across a team of agents today, and where it breaks.

---
Variant for r/ChatGPTCoding / r/LocalLLaMA: same body, drop the Claude-specific emphasis,
keep "any MCP client."
