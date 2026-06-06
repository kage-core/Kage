# Reddit posts

Rule: each sub has self-promo norms. Post as a genuine "I built this, feedback
welcome" — engage in comments, don't drive-by link. Lead with the problem, not the pitch.
Good fits: r/ClaudeAI, r/mcp, r/ChatGPTCoding, r/LocalLLaMA. One sub at a time.

---

## r/mcp / r/ClaudeAI

**Title:** I built shared, code-grounded memory so my team's coding agents stop rediscovering the repo

**Body:**

Every session my agents started from zero on our codebase — re-deriving the same bug causes, re-asking why a module is shaped the way it is, re-learning conventions a teammate already figured out. The knowledge existed; it was just stuck in people's heads and one-off chat sessions.

So I built **Kage** — a memory layer (MCP server) shared across a team and their agents:

- Capture a learning once (a bug cause, a decision, a gotcha); the whole team + every agent recalls it next time it's relevant.
- Memory is **grounded in your actual code** and stored as JSON in your repo, reviewed in PRs — not a personal vector blob that drifts.
- Because it's grounded: a note citing a file that doesn't exist is rejected on write, and when the code a note depends on is deleted/refactored, that note is withheld from the agent and flagged for you. No silent drift.
- Works with Claude Code, Codex, Cursor, Windsurf — anything MCP. No vector DB, API key, or service.

30-sec demo: `npx -y @kage-core/kage-graph-mcp demo`
Live viewer: https://kage-core.com/viewer
Repo (GPL-3.0): https://github.com/kage-core/Kage

Would genuinely love feedback — especially how you're handling shared context across a team of agents today, and where it breaks.

---
Variant for r/ChatGPTCoding / r/LocalLLaMA: same body, drop the Claude-specific emphasis,
keep "any MCP client."
