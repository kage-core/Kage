# X / Twitter launch thread — SHOWCASE version

This version SHOWS Kage with real screenshots + real numbers (all verified from
Kage running on its own repo, 2026-06-06). Post from a logged-in browser and
attach the marked screenshot to each post. The live viewer is the source:
https://kage-core.com/viewer  (screenshot each section directly).

Note: an automated agent cannot attach images to X — that's why you attach them.

---

**1/**  📎 ATTACH: screenshot of viewer → Overview (the "Memory Trust 99/100" hero)
Most "AI memory" is a vector blob you can't inspect or trust.

Kage is different. This is its live memory dashboard — running on Kage's OWN repo. Every number is real and checkable 👇

Trust 99/100 · hallucinated citations rejected 100% · stale memory withheld 100%. 🧵

**2/**  📎 ATTACH: screenshot of viewer → Overview ("Needs your attention" stale list)
Why "99"? Every memory packet is anchored to the actual code it's about.

Refactor or delete that file → Kage flags the note stale and withholds it from the agent. Here are 4 it caught on its own repo, e.g.:
"linked path changed since memory was verified: mcp/kernel.ts"

No silent drift.

**3/**  📎 ATTACH: screenshot of viewer → Memory map (the memory↔code graph)
This is the memory ↔ code map. Each diamond is a packet; each line ties it to the file(s) it's grounded in.

That grounding is the whole trick: memory that can't point at real, current code doesn't get served to your agent.

**4/**  📎 ATTACH: screenshot of viewer → Insights (donut + "Codebase mapped" tiles)
It maps your codebase too — 30 files, 1.8K symbols, 187 tests, 100% index coverage — so recall is grounded in real structure.

160 packets so far: 116 decisions, 23 bug-fixes, 9 gotchas… 97% grounded & current.

**5/**  (no image — links)
Best part: it's shared. Capture a learning once — a bug cause, a decision, a gotcha — and the whole team + every future agent session recalls it. Git-tracked JSON, reviewed in PRs.

Try it in 30s:
npx -y @kage-core/kage-graph-mcp demo

**6/**  (no image — links)
Works with Claude Code, Codex, Cursor, Windsurf — any MCP client. No vector DB, no API key.

Live dashboard: https://kage-core.com/viewer
Open source (GPL-3.0): https://github.com/kage-core/Kage

⭐ if your agents could stop re-learning your repo.

---
Verified numbers (kage-core/Kage, 2026-06-06): trust 99/100; rejected 100%;
stale-excluded 100%; grounded-to-code 98%; 160 packets (23 hot / 27 healthy);
4 needs-review; 165 recalls/7d; code graph 96 files / 13,326 symbols / 10,223
calls / 496 tests (viewer shows the deduped public subset: 30 files / 1.8K / 187).
