<div align="center">

# Kage

### Shared repo memory for AI coding agents

Kage gives Codex, Claude Code, Cursor, and other MCP agents the repo context
they keep forgetting: commands, decisions, bugs, conventions, code paths,
symbols, tests, and teammate knowledge.

<p>
  <img alt="local first" src="https://img.shields.io/badge/local--first-yes-16a34a?style=for-the-badge">
  <img alt="mcp ready" src="https://img.shields.io/badge/MCP-ready-7c3aed?style=for-the-badge">
  <img alt="external db" src="https://img.shields.io/badge/external%20DB-0-111827?style=for-the-badge">
  <img alt="tests" src="https://img.shields.io/badge/tests-100%20passing-16a34a?style=for-the-badge">
</p>

<p>
  <a href="https://kage-core.github.io/Kage/">Website</a>
  ·
  <a href="https://kage-core.github.io/Kage/viewer/">Live viewer</a>
  ·
  <a href="docs/OSS_GBRAIN_CASE_STUDY.md">OSS case study</a>
  ·
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp">npm</a>
  ·
  <a href="#quick-start">Quick start</a>
  ·
  <a href="#how-it-works">How it works</a>
</p>

![Kage Memory Terminal demo](docs/assets/kage-demo.gif)

</div>

---

## Why Kage

AI coding agents are useful, but every new session starts with the same
onboarding ritual:

- Where are the important files?
- How do I run tests?
- Why was this workaround added?
- Which convention matters here?
- What broke last time?
- What did another teammate already explain?

Kage turns that repo lore into **small, reviewable memory packets** that live
with the codebase. Agents retrieve only the relevant slice for the current task
instead of rereading the whole repo or asking you to explain it again.

## What You Get

| Feature | What it does |
|---|---|
| Repo memory | Stores bugs, decisions, runbooks, gotchas, conventions, and code explanations as JSON packets |
| Code graph | Indexes files, symbols, imports, calls, routes, tests, and packages |
| Memory-code links | Connects repo knowledge to the files and symbols it affects |
| Agent bootstrap | Installs `AGENTS.md` so agents know to recall context automatically |
| Local viewer | Shows memory, code graph, metrics, review state, and evidence |
| Review workflow | Keeps useful memory shareable while making stale or risky memory visible |

Kage is local-first. No hosted service, external database, or API key is
required.

## Quick Start

Install the CLI:

```bash
npm install -g @kage-core/kage-graph-mcp
```

Set up Codex in a repo:

```bash
cd your-repo
kage setup codex --project . --write
kage init --project .
kage setup verify-agent --agent codex --project .
```

Set up Claude Code instead:

```bash
cd your-repo
kage setup claude-code --project . --write
kage init --project .
kage setup verify-agent --agent claude-code --project .
```

Restart the agent once after setup so the MCP server reloads.

Other supported setup targets:

```bash
kage setup list
```

Kage currently prints setup for Codex, Claude Code, Cursor, Windsurf, Gemini
CLI, OpenCode, Cline, Goose, Roo Code, Kilo Code, Claude Desktop, Aider, and
generic MCP clients.

## Daily Workflow

Use your coding agent normally. Kage is meant to feel ambient, not like a
manual search tool.

| You ask | Kage helps the agent recall |
|---|---|
| `How is this repo structured?` | repo map, important paths, code graph |
| `How do I run tests?` | runbooks, commands, verified examples |
| `Fix the failing auth test.` | related bugs, files, symbols, tests |
| `Continue the work from last time.` | prior decisions, branch memory, changed paths |
| `Why is this code like this?` | rationale, gotchas, historical fixes |

Useful CLI commands:

```bash
kage recall "how do I run tests" --project .
kage code-graph "auth routes tests" --project .
kage learn --project . --learning "Use npm test after changing parser code."
kage refresh --project .
kage pr check --project .
kage viewer --project .
```

## How It Works

Kage separates learned repo knowledge from generated code facts.

```text
repo memory packets  -> recall indexes -> memory graph
source files         -> structural map  -> code graph
task query           -> small, source-backed context result
```

Memory is stored as packets in `.agent_memory/packets/*.json`. A packet is one
durable piece of context: a bug fix, decision, convention, runbook, gotcha,
code explanation, or issue note.

Generated artifacts live beside the packets:

| Layer | Path | Purpose |
|---|---|---|
| Packets | `.agent_memory/packets/` | durable repo memory |
| Indexes | `.agent_memory/indexes/` | rebuildable recall indexes |
| Memory graph | `.agent_memory/graph/` | packet relationships, tags, paths, commands, evidence |
| Structural map | `.agent_memory/structural/` | files, symbols, imports, changed-file reuse |
| Code graph | `.agent_memory/code_graph/` | source-derived files, symbols, calls, routes, tests |
| Metrics | `.agent_memory/metrics.json` | readiness, quality, coverage, token estimates |

The important behavior: agents retrieve a bounded, relevant context result
instead of loading everything.

## Viewer

Open the hosted demo:

```text
https://kage-core.github.io/Kage/viewer/
```

Open the viewer for your local repo:

```bash
kage viewer --project .
```

The local viewer auto-loads your repo memory, code graph, metrics, inbox, and
review context. Combined mode balances memory and code nodes so the graph stays
useful instead of turning into an unreadable file map.

## Performance

Kage is built for repeat work to scale with changed files, not the whole repo.

Current Kage-on-Kage metrics:

| Metric | Current |
|---|---:|
| Approved memory packets | 86 |
| Memory graph | 725 entities / 1,846 edges |
| Indexed code files | 22 |
| Code symbols | 2,945 |
| Tests | 100 |
| Evidence coverage | 100% |
| Readiness | 100/100 |

Why it stays fast:

- Read-only recall uses existing graph artifacts when they are fresh.
- Structural facts are reused for unchanged files.
- Generated graphs are compact and avoid duplicating structural data.
- Large generated/vendor/cache paths are ignored.
- Huge files are represented safely instead of deeply expanded.
- Recall builds lookup maps once per query instead of scanning all graph edges
  for every memory packet.

On this repo, a normal recall returns about 1,800 context tokens from roughly
197,778 indexed source tokens. The point is not just speed; it is giving the
agent the right context without dragging the whole repo into the prompt.

For a real open-source sprint, see the [gbrain case study](docs/OSS_GBRAIN_CASE_STUDY.md):
10 focused PRs opened with Kage recall, code graph, repo memory, and captured
fix knowledge.

## Trust Model

- Repo memory is git-visible and reviewable.
- Generated indexes and graphs are rebuildable.
- Capture scans for secrets and obvious PII before writing.
- Agents can create repo-local memory.
- Org/global/shared memory promotion is explicit and human-gated.
- Public or registry content should be treated as advisory, not trusted truth.

## Development

```bash
cd mcp
npm install
npm test
```

Run the CLI from source:

```bash
npm run build --prefix mcp
node mcp/dist/cli.js viewer --project .
```

Package smoke check:

```bash
npm --prefix mcp pack --dry-run
```

## License

GPL-3.0-only. See [LICENSE](LICENSE).

Kage releases before the GPL switch were published under MIT. Future versions
are GPL-3.0-only unless a separate written commercial license says otherwise.
