---
name: kage-memory
description: Trustworthy, code-grounded repo memory for coding agents. Before any task, recall grounded repo knowledge (decisions, bugs, conventions, code paths); after learning something durable, capture it; never act on stale or hallucinated memory. Use at the start of every task, when debugging, and after solving something reusable.
---

# Kage — trustworthy repo memory

The Kage MCP server (`kage`) is installed by this plugin. Use it to give this
repo a memory you can trust.

## How to use Kage during work

1. **Recall before acting.** At the start of a task, debugging, or any
   repo-specific decision, call `kage_context` with the repo path and the task as
   the query. Use returned memory only when it's relevant and source-backed;
   prefer repo memory over assumptions.
2. **Trust the gate.** Kage withholds stale/ungrounded memory automatically — if
   something was withheld, its evidence is gone; don't go hunting for it.
3. **Capture durable learnings.** When you fix a bug, make a decision, discover a
   convention or gotcha, or learn how to run/test/build the repo, call
   `kage_learn` with a concise learning and the real file paths it concerns.
   Citations to files that don't exist are rejected.
4. **Keep memory honest on handoff.** If you changed code that existing memory
   describes, update or supersede it (`kage_verify_citations`, `kage_compact`)
   before finishing.

## Why it's trustworthy
- Validated on write (hallucinated citations rejected)
- Withheld on recall (deleted/expired code → memory hidden)
- Grounded to the code graph (recall returns the blast radius of a change)
- Governed like code (reviewable JSON in the repo)

For ambient auto-capture hooks, run `kage setup claude-code --project . --write`.
Prove trust: `kage benchmark --trust --project .`
