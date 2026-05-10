# Kage Repo-Recall MCP

Local-first repo memory, code graph, and recall tools for AI coding agents.

Kage helps agents stop rediscovering the same project context. It stores
reviewable repo memory, builds generated recall/code indexes, and exposes the
result through an MCP server plus a CLI.

## Install

```bash
npm install -g @kage-core/kage-graph-mcp
```

Set up Codex:

```bash
cd your-repo
kage setup codex --project . --write
kage init --project .
kage setup verify-agent --agent codex --project .
```

Set up Claude Code:

```bash
cd your-repo
kage setup claude-code --project . --write
kage init --project .
kage setup verify-agent --agent claude-code --project .
```

Restart your agent once after setup so MCP tools reload.

## What Kage Gives Agents

- repo-local memory for decisions, runbooks, bug fixes, gotchas, conventions,
  and code explanations
- a code graph for files, symbols, imports, calls, routes, tests, and packages
- memory-code links so project knowledge points at the code it affects
- `AGENTS.md` bootstrap instructions so agents recall context automatically
- a local viewer for memory, code graph, metrics, evidence, and review state
- review and validation commands for stale or risky memory

No hosted service, external database, or API key is required.

## Common Commands

```bash
kage setup list
kage init --project .
kage recall "how do I run tests" --project .
kage recall "how do I run tests" --project . --json --explain
kage code-graph "auth routes tests" --project .
kage learn --project . --learning "Use npm test after parser changes."
kage refresh --project .
kage pr check --project .
kage metrics --project . --json
kage audit --project . --json
kage inbox --project . --json
kage viewer --project .
```

For stale or wrong memory:

```bash
kage feedback --project . --packet <packet-id> --kind stale
kage gc --project . --dry-run
```

## MCP Server

The package exposes:

- `kage-graph-mcp`: stdio MCP server
- `kage`: CLI

Typical MCP clients should use the setup command instead of hand-writing config:

```bash
kage setup codex --project . --write
kage setup claude-code --project . --write
kage setup generic-mcp --project .
```

Supported setup targets include Codex, Claude Code, Cursor, Windsurf, Gemini
CLI, OpenCode, Cline, Goose, Roo Code, Kilo Code, Claude Desktop, Aider, and
generic MCP clients.

## Storage Model

Kage keeps learned memory separate from generated code facts.

| Layer | Path | Purpose |
|---|---|---|
| Packets | `.agent_memory/packets/` | durable repo memory |
| Indexes | `.agent_memory/indexes/` | rebuildable recall indexes |
| Memory graph | `.agent_memory/graph/` | packet relationships and evidence |
| Structural map | `.agent_memory/structural/` | files, symbols, imports |
| Code graph | `.agent_memory/code_graph/` | source-derived code facts |
| Metrics | `.agent_memory/metrics.json` | readiness, quality, coverage |

Repo-local packets are git-visible and reviewable. Generated indexes and graphs
are rebuildable.

## Performance Notes

Kage is optimized so repeat work scales with changed files, not the whole repo:

- read-only recall reuses fresh graph artifacts
- unchanged structural file facts are reused
- generated graphs are compact and avoid duplicated structural JSON
- generated/vendor/cache paths are ignored
- huge files are represented safely instead of deeply expanded
- recall builds lookup maps once per query instead of repeatedly scanning graph
  edges for every memory packet

## Viewer

Open a local viewer for the current repo:

```bash
kage viewer --project .
```

Hosted demo:

```text
https://kage-core.github.io/Kage/viewer/
```

## Development

```bash
npm install
npm test
```

Build:

```bash
npm run build
```

Package smoke check:

```bash
npm pack --dry-run
```

## License

GPL-3.0-only.
