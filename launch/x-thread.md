# X / Twitter launch thread

Post with the demo GIF on tweet 1. Reply-chain the rest. Pin tweet 1.

---

**1/**
Your team keeps rediscovering its own codebase.

The bug someone already fixed last month. The reason that module is weird. A new teammate — or a fresh AI agent session — re-derives it from scratch.

I built Kage: shared, code-grounded memory for devs and their coding agents. 🧵
[attach: kage-demo.gif]

**2/**
Most "agent memory" is a personal vector blob that quietly drifts from your code.

Kage is different: each note is tied to the real files it's about, lives in your repo as JSON, and is reviewed in PRs. Capture once → the whole team and every agent recall it.

**3/**
Because it's grounded in the code, it stays honest:

• cite a file that doesn't exist → rejected on write
• code a note depends on gets deleted/refactored → withheld from the agent, flagged for you

No silent drift.
[attach: kage-cover.png or kage-viewer-graph.png]

**4/**
Works with Claude Code, Codex, Cursor, Windsurf — anything that speaks MCP. No vector DB, no API key, no service to run.

Try it in 30s:
npx -y @kage-core/kage-graph-mcp demo

Live viewer (no install): https://kage-core.com/viewer

**5/**
Open source (GPL-3.0). If your team's agents could stop rediscovering the same things, a ⭐ means a lot:
https://github.com/kage-core/Kage

Feedback very welcome — especially from anyone who's been burned by stale agent context.

---
Notes: tag/engage replies in MCP, Claude Code, Cursor, aider threads. Don't auto-blast;
reply where it's genuinely relevant.
