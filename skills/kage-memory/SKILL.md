---
name: kage-memory
description: Trustworthy, code-grounded repo memory for coding agents. Before any task, recall grounded repo knowledge (decisions, bugs, conventions, code paths); after learning something durable, capture it; never act on stale or hallucinated memory. Use at the start of every task, when debugging, and after solving something reusable.
---

# Kage — trustworthy repo memory

Kage gives this repo a memory that can be **trusted**: it rejects hallucinated
citations on write, withholds stale memory on recall, and grounds knowledge to
the code graph. Memory lives as plain files in `.agent_memory/`, reviewed in the
same PR as the code.

## One-time setup (if Kage isn't installed yet)

```bash
npm install -g @kage-core/kage-graph-mcp
kage init --project .
kage setup <your-agent> --project . --write   # claude-code, codex, cursor, windsurf, …
```

Try it instantly, no setup: `npx -y @kage-core/kage-graph-mcp demo`

## How to use Kage during work

1. **Recall before acting.** At the start of a task, debugging, or any
   repo-specific decision, call `kage_context` with the repo path and the task as
   the query. Use the returned memory only when it's relevant and source-backed.
   Prefer repo memory over your assumptions.
2. **Trust the gate.** Kage withholds stale/ungrounded memory automatically — if
   something was withheld, don't go hunting for it; it's withheld because its
   evidence is gone.
3. **Capture durable learnings.** When you fix a bug, make a decision, discover a
   convention or gotcha, or learn how to run/test/build the repo, call
   `kage_learn` with a concise learning and the file paths it concerns. Citations
   to files that don't exist are rejected — cite real paths.
4. **Keep memory honest on handoff.** If you changed code that existing memory
   describes, update or supersede that memory (`kage_verify_citations`,
   `kage_compact`) before finishing.

## What makes it trustworthy

- **Validated on write** — memory citing nonexistent files is rejected.
- **Withheld on recall** — memory whose cited code was deleted/expired is hidden.
- **Grounded to code** — recall can return the bounded blast radius of a change.
- **Governed like code** — packets are reviewable JSON in the repo.

Prove it: `kage benchmark --trust --project .`
