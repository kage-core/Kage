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
- a code graph for files, symbols, imports, confidence-scored calls, routes,
  tests, and packages, including generic call/test signals and mixed-language
  framework routes
- conservative cleanup candidates for unreferenced files, unused exports, and
  internal-looking unused symbols
- memory-code links so project knowledge points at the code it affects
- decision intelligence for why-memory coverage, stale/weak packets, and
  important files that still lack linked repo knowledge
- lightweight workspace recall across sibling repos, including package,
  route-contract, topic/event contract, and git co-change links when existing
  local evidence exposes them
- local git intelligence for risk, reviewers, contributor profiles, co-change
  warnings, ownership silos, and module health
- `AGENTS.md` bootstrap instructions so agents recall context automatically
- a local viewer for memory, code graph, decision memory, risk, module health,
  workspace reports, metrics, evidence, and review state
- review and validation commands for stale or risky memory

No hosted service, external database, or API key is required.

## Common Commands

```bash
kage setup list
kage init --project .
kage recall "how do I run tests" --project .
kage recall "how do I run tests" --project . --json --explain
kage code-graph "auth routes tests" --project .
kage cleanup-candidates --project . --json
kage dependency-path --project . --from src/app.ts --to src/auth.ts --json
kage module-health --project . --json
kage graph-insights --project . --json
kage workspace --project .. --json
kage workspace recall "auth header contract" --project .. --json
kage contributors --project . --json
kage decisions --project . --json
kage reviewers --project . --changed-files src/auth.ts,src/session.ts --json
kage risk --project . --targets src/auth.ts --json
kage learn --project . --learning "Use npm test after parser changes."
kage refresh --project .
kage hook install --project .
kage pr check --project .
kage metrics --project . --json
kage audit --project . --json
kage inbox --project . --json
kage viewer --project .
```

MCP agents should start with `kage_context`. When the query or target list
mentions file paths, it includes risk and dependency-path context alongside
memory recall.

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
| Reports | `.agent_memory/reports/` | risk, contributors, decisions, module health, graph insights, workspace, quality, benchmark |

Repo-local packets are git-visible and reviewable. Generated indexes and graphs
are rebuildable.

## Performance Notes

Kage is optimized so repeat work scales with changed files, not the whole repo:

- read-only recall reuses fresh graph artifacts
- unchanged structural file facts are reused
- generated graphs are compact and avoid duplicated structural JSON
- optional git `post-commit` hooks keep repo memory and branch summaries current
- generated/vendor/cache paths are ignored
- huge files are represented safely instead of deeply expanded
- recall builds lookup maps once per query instead of repeatedly scanning graph
  edges for every memory packet
- local risk reports include hidden co-change warnings and ownership-silo
  signals from git history
- contributor reports show commits, recent activity, touched files/modules,
  primary ownership, ownership silos, hotspot ownership, and commit category mix
- decision reports show why-memory coverage, weak/stale decision packets, and
  high-signal source paths with no linked decision memory
- graph insights include language parser coverage and edge mix so large-repo
  index gaps are visible instead of hidden
- the generic non-TypeScript indexer extracts bounded call edges and test
  function coverage, while SCIP/LSP/LSIF/tree-sitter artifacts override it when
  available

## Viewer

Open a local viewer for the current repo:

```bash
kage viewer --project .
```

The local viewer loads graph artifacts plus `.agent_memory/reports/*.json` and
shows a repo-intelligence cockpit for memory-code links, decision memory, risk,
contributors, module health, graph insights, workspace coverage, workspace
link maps, quality, and benchmark proof. Workspace Map rows expose package
dependencies, route contracts, topic/event links, and cross-repo co-change
pairs from local workspace reports.

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
