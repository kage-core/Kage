# Kage — repo memory for AI coding agents

Local-first repo memory, code graph, and recall tools for MCP-capable coding
agents (Codex, Claude Code, Cursor, etc.).

Kage helps agents stop rediscovering the same project context. It stores
reviewable repo memory, builds generated recall/code indexes, and exposes the
result through an MCP server plus a CLI.

- Website: https://kage-core.github.io/Kage/
- Docs: https://kage-core.github.io/Kage/guide.html
- Hosted viewer: https://kage-core.github.io/Kage/viewer/

## Install

Requires Node.js 18 or newer. The package installs two binaries: `kage` and
`kage-graph-mcp`.

```bash
npm install -g @kage-core/kage-graph-mcp
cd your-repo
kage init --project .
kage setup codex --project . --write
# or: kage setup claude-code --project . --write
# restart the agent once
kage setup verify-agent --agent codex --project .
kage recall "how do I run tests" --project .
```

Other supported targets: Cursor, Windsurf, Gemini CLI, OpenCode, Cline, Goose,
Roo Code, Kilo Code, Claude Desktop, Aider, generic MCP (`kage setup list`).

## What you get

- Repo-local memory for decisions, runbooks, bug fixes, gotchas, conventions,
  and code explanations.
- A code graph for files, symbols, imports, confidence-scored calls, routes
  (FastAPI / Flask / Django / Rails / Laravel / Spring / Go / Rust / ASP.NET),
  tests, and packages.
- Memory-code links so repo knowledge points at the code it affects.
- Local git intelligence: risk, reviewers, contributors, co-change warnings,
  ownership silos, module health.
- Conservative cleanup review input (unreferenced files, unused exports,
  internal-looking unused symbols). Never deletes code.
- A local viewer for memory, code graph, risks, review, and metrics.

No hosted service, external database, or API key is required.

## Common commands

```bash
kage recall "how do I run tests" --project .
kage code-graph "auth routes tests" --project .
kage risk --project . --targets src/auth.ts --json
kage learn --project . --learning "Use npm test after parser changes."
kage refresh --project .
kage hook install --project .
kage pr check --project .
kage viewer --project .
```

MCP agents should start with `kage_context`. When the query or target list
mentions file paths, it also includes risk and dependency-path context.

For stale or wrong memory:

```bash
kage feedback --project . --packet <packet-id> --kind stale
kage gc --project . --dry-run
```

For the full CLI and MCP reference, see the [docs](https://kage-core.github.io/Kage/guide.html).

## MCP server

```bash
kage setup codex --project . --write
kage setup claude-code --project . --write
kage setup generic-mcp --project .
```

## Storage

Kage writes to `.agent_memory/`. Packets are durable repo memory; everything
else is rebuildable with `kage refresh`.

| Path | Purpose |
|---|---|
| `.agent_memory/packets/` | durable repo memory |
| `.agent_memory/graph/` | memory graph (rebuildable) |
| `.agent_memory/code_graph/` | source-derived code facts (rebuildable) |
| `.agent_memory/structural/` | files, symbols, imports |
| `.agent_memory/reports/` | risk, contributors, decisions, module health, workspace, quality, benchmark |

Repo-local packets are git-visible and reviewable. Generated indexes and
graphs are rebuildable.

## Viewer

```bash
kage viewer --project .
```

The local viewer loads graph artifacts plus `.agent_memory/reports/*.json`.
It opens with a dashboard for repo readiness, memory coverage, graph health,
risks, review, and workspace links, then jumps to focused Graph, Memory,
Risks, and Review pages. Use it when you need to:

- Inspect what agents recall and why.
- Check risk before editing shared files.
- Find repo lore by file, feature, bug, command, or decision.
- Clear the review queue before handoff.

Hosted demo: https://kage-core.github.io/Kage/viewer/

## Development

```bash
npm install
npm test
npm run build
npm pack --dry-run
```

## License

GPL-3.0-only.
