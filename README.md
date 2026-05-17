<div align="center">

# Kage

### Shared repo memory for AI coding agents

Kage gives Codex, Claude Code, Cursor, and other MCP agents the repo context
they keep forgetting: commands, decisions, bugs, conventions, code paths,
symbols, tests, and teammate knowledge.

<p>
  <a href="https://kage-core.github.io/Kage/">Website</a>
  ·
  <a href="https://kage-core.github.io/Kage/guide.html">Docs</a>
  ·
  <a href="https://kage-core.github.io/Kage/viewer/">Viewer</a>
  ·
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp">npm</a>
</p>

![Kage Memory Terminal demo](docs/assets/kage-demo.gif)

</div>

---

## Quick start

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

Other supported agents: Cursor, Windsurf, Gemini CLI, OpenCode, Cline, Goose,
Roo Code, Kilo Code, Claude Desktop, Aider, and generic MCP clients
(`kage setup list`).

## Why Kage

Every new agent session asks the same setup questions, scans the same files,
and risks repeating the same mistakes. Kage turns that repo lore into small,
reviewable memory packets that live with the codebase. Agents retrieve only
the relevant slice for the current task instead of rereading the whole repo.

Kage is local-first. No hosted service, external database, or API key is
required for normal use.

## What you get

- Repo memory packets (decisions, bug fixes, runbooks, gotchas, conventions,
  code explanations) stored as reviewable JSON.
- A code graph for files, symbols, imports, confidence-scored calls, routes
  (FastAPI / Flask / Django / Rails / Laravel / Spring / Go / Rust / ASP.NET),
  tests, and packages.
- Memory-code links so repo knowledge points at the code it affects.
- Local git intelligence: risk, reviewers, contributor profiles, co-change
  warnings, ownership silos, and module health.
- A local viewer for memory, code graph, risks, review, and metrics.
- Review and validation commands for stale or risky memory.

## Daily commands

```bash
kage recall "how do I run tests" --project .
kage code-graph "auth routes tests" --project .
kage risk --project . --targets src/auth.ts --json
kage learn --project . --learning "Use npm test --prefix mcp after parser changes."
kage refresh --project .
kage pr check --project .
kage viewer --project .
```

For the full CLI and MCP reference, see the [docs](https://kage-core.github.io/Kage/guide.html).

## Storage

Kage writes to `.agent_memory/`. Packets are durable repo memory; everything
else is rebuildable with `kage refresh`.

| Path | Purpose |
|---|---|
| `.agent_memory/packets/` | durable repo memory (JSON, git-tracked) |
| `.agent_memory/graph/` | memory graph (rebuildable) |
| `.agent_memory/code_graph/` | source-derived code facts (rebuildable) |
| `.agent_memory/structural/` | files, symbols, imports (rebuildable) |
| `.agent_memory/reports/` | risk, contributors, decisions, module health, workspace, quality, benchmark |
| `AGENTS.md` | agent harness policy |

## Trust model

- Repo memory is git-visible and reviewable.
- Capture scans for obvious secrets and PII before writing packets.
- Org / global / public promotion is explicit and human-gated.
- Public or registry content should be treated as advisory.

## Development

```bash
cd mcp
npm install
npm test
npm run build
node dist/cli.js viewer --project ..
```

## License

GPL-3.0-only. See [LICENSE](LICENSE).

Kage releases before the GPL switch were published under MIT. Future versions
are GPL-3.0-only unless a separate written commercial license says otherwise.
