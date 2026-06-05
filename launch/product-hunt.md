# Product Hunt launch

**Name:** Kage

**Tagline (60 char max):**
The agent memory you can actually trust

**Alt taglines:**
- Agent memory that rejects stale & hallucinated knowledge
- Trustworthy, code-grounded memory for coding agents

**Topics:** Developer Tools · Artificial Intelligence · Open Source · GitHub

**Description:**

Every coding agent remembers now — and that's the risk. They act on memory
that's stale (cites a deleted file), hallucinated (cites a file that never
existed), or ungrounded. An agent acting on wrong memory is worse than one with
none.

Kage is the memory you can trust:
• Validated on write — hallucinated citations are rejected
• Withheld on recall — stale memory (deleted/refactored code) is hidden from the agent
• Grounded to your code graph — recall returns the blast radius of a change
• Governed like code — plain files in your repo, reviewed in the same PR

Zero dependencies, no API key. Works with Claude Code, Codex, Cursor, Windsurf,
and any MCP agent. And it's measurable: run `kage benchmark --trust` on your repo
(the demo repo scores 100/100).

It ships with a viewer, too — a dashboard with your Memory Trust score, a
memory↔code map, a browsable memory list, and a live feed of what agents
recalled.

See it live (no install): https://kage-core.com/viewer
Try it on a real repo in 30 seconds: `npx -y @kage-core/kage-graph-mcp demo`

**First comment (maker):**

Hey PH 👋 I built Kage because I kept watching coding agents confidently act on
memory that was no longer true — citing files that had been deleted or refactored
out from under them. Recall benchmarks are saturated (everyone's at 95%+); the
unsolved problem is *trust*. So Kage validates citations on write, withholds
stale memory on recall, grounds everything to the code graph, and stores it as
reviewable files in your repo. There's even a Trust Benchmark you can run on your
own code. It's open source, zero-dependency, no API key. Would love feedback —
especially: run `kage benchmark --trust` on your repo and tell me what you see.

**Gallery assets:**
- `docs/assets/kage-viewer-demo-poster.png` (viewer Overview: Memory Trust score + live stats)
- `docs/assets/kage-viewer-graph.png` (viewer Memory map: memory↔code graph)
- `docs/assets/kage-demo.gif` (terminal demo)
- Live demo to screen-record: https://kage-core.com/viewer
