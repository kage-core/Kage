<div align="center">

# Kage

### Repo memory and code graph for coding agents

Codex learns it today. Claude Code recalls it tomorrow.

Kage gives every coding agent the same repo-local memory, source-derived code
graph, and visual memory terminal. The memory lives with the repo as JSON, so
teams stop rediscovering commands, decisions, gotchas, bugs, and code flows.

<p>
  <img alt="local first" src="https://img.shields.io/badge/local--first-yes-16a34a?style=for-the-badge">
  <img alt="tests" src="https://img.shields.io/badge/tests-64%20passing-16a34a?style=for-the-badge">
  <img alt="agents" src="https://img.shields.io/badge/agents-13-2563eb?style=for-the-badge">
  <img alt="database" src="https://img.shields.io/badge/external%20DB-0-111827?style=for-the-badge">
  <img alt="mcp" src="https://img.shields.io/badge/MCP-ready-7c3aed?style=for-the-badge">
</p>

<p>
  <a href="#install">Install</a> ·
  <a href="#viewer">Viewer</a> ·
  <a href="https://kage-core.github.io/Kage/viewer/">Open Viewer</a> ·
  <a href="#codex-and-claude-code">Codex + Claude</a> ·
  <a href="#what-kage-stores">Memory Model</a> ·
  <a href="#proof">Proof</a>
</p>

![Kage Memory Terminal](docs/assets/kage-viewer.svg)

</div>

---

## Why Kage

Agents are good at solving the same repo problem again and again. That is the
bug.

Kage makes the repo remember:

| Without Kage | With Kage |
|---|---|
| Agents reread files every session | Agents start with repo memory + code graph context |
| Workflows live in chat history | Runbooks, decisions, fixes, and gotchas live in git |
| Codex and Claude have separate memory | All MCP agents read the same repo memory |
| Code search finds text | Kage links memory to files, symbols, tests, routes, and commands |
| Team sharing needs manual docs | Useful learnings become reviewed repo packets |

Kage is local-first. No hosted service is required. No external database is
required. No API key is required.

## Install

Ask your agent:

```text
Install and set up Kage for this repo.
```

Or run it yourself:

```bash
npm install -g @kage-core/kage-graph-mcp
kage setup codex --project . --write
kage init --project .
kage setup verify-agent --agent codex --project .
```

For Claude Code:

```bash
npm install -g @kage-core/kage-graph-mcp
kage setup claude-code --project . --write
kage init --project .
kage setup verify-agent --agent claude-code --project .
```

Restart the agent once after setup so the MCP server reloads.

## Viewer

Kage ships a local terminal-style viewer for memory, code graph, metrics, and
review context.

Open the static viewer shell:

```text
https://kage-core.github.io/Kage/viewer/
```

The hosted viewer is useful for screenshots, demos, and manually loading graph
JSON. For a real repo, the local command is still preferred because it
auto-loads that repo's graph, code graph, metrics, review file, and pending
queue:

```bash
kage viewer --project .
```

The viewer shows:

| Surface | What It Shows |
|---|---|
| Memory graph | repo packets, tags, paths, commands, decisions, evidence |
| Code graph | files, symbols, imports, calls, routes, tests, packages |
| Inspector | selected node/edge details and source evidence |
| Metrics | readiness, parser coverage, quality, estimated tokens saved |
| Review context | pending/quarantine packets and review artifact, when present |

Combined mode balances memory and code so a large code graph does not hide the
repo memory.

## Codex And Claude Code

After setup, use your agent normally. You should not need to say “use Kage.”

| Task | Prompt |
|---|---|
| Understand the repo | `How is this repo structured?` |
| Find commands | `How do I run tests and build this?` |
| Continue work | `Continue the scoring changes from the last session.` |
| Debug | `Fix the failing webhook test.` |
| Inspect memory | `Show me the Kage memory captured for this repo.` |

The ambient policy asks agents to:

1. Recall repo memory at session start.
2. Query the code graph before changing files.
3. Capture durable learnings as repo-local memory.
4. Refresh indexes/graphs after meaningful changes.
5. Run the PR memory check before handoff.

## Core Commands

```bash
kage init --project .
kage recall "how do I run tests" --project .
kage code-graph "routes tests auth" --project .
kage learn --project . --learning "Use npm test after changing parser code."
kage refresh --project .
kage pr check --project .
kage viewer --project .
```

For stale memory:

```bash
kage gc --project . --dry-run
kage feedback --project . --packet <packet-id> --kind stale
```

For proof:

```bash
kage metrics --project . --json
kage benchmark --project . --compare --task "how do I run tests"
```

## What Kage Stores

Kage keeps generated code facts separate from learned repo memory.

| Layer | Stored In | Purpose |
|---|---|---|
| Repo memory packets | `.agent_memory/packets/*.json` | durable runbooks, decisions, bug fixes, conventions, gotchas |
| Generated indexes | `.agent_memory/indexes/` | rebuildable packet catalogs, paths, tags, types |
| Memory graph | `.agent_memory/graph/graph.json` | packet relations: tags, paths, commands, evidence |
| Code graph | `.agent_memory/code_graph/graph.json` | source-derived files, symbols, imports, calls, routes, tests |
| Metrics | `.agent_memory/metrics.json` | readiness, quality, parser coverage, token estimates |

Repo-local memory is written directly as git-visible packets. Org/global sharing
is explicit and review-gated.

## Supported Agents

Kage prints setup for common MCP clients:

```bash
kage setup list
kage setup codex --project . --write
kage setup claude-code --project . --write
kage setup generic-mcp --project .
```

Supported setup targets include Codex, Claude Code, Cursor, Windsurf, Gemini
CLI, OpenCode, Cline, Goose, Roo Code, Kilo Code, Claude Desktop, Aider, and
generic MCP clients.

## Proof

Current package status:

| Proof | Current |
|---|---:|
| Tests | 64 passing |
| Agent setup targets | 13 |
| External DB required | 0 |
| MCP tools | recall, context, learn, graph, code graph, metrics, validate |
| Source graph | files, symbols, imports, calls, routes, tests, packages |
| Safety | secret/PII scan before capture |

Kage on Kage itself:

| Metric | Current |
|---|---:|
| Readiness | 100/100 |
| Memory packets | 20 |
| Memory graph edges | 224 |
| Code files | 12 |
| Symbols | 1,894 |

Same-task benchmark example:

```bash
kage benchmark --project . --compare \
  --task "how should an agent update memory and check PR readiness after changing files"
```

Kage reports deterministic estimates for rediscovery avoided and tokens saved.
These are proof metrics, not production telemetry claims.

## Trust Model

- Repo memory is local-first and git-native.
- Generated indexes and graphs are rebuildable.
- Capture scans for secrets and obvious PII before writing.
- Repo-local memory can be created by agents.
- Org/global promotion requires explicit human review.
- Raw observations are not published automatically.

## Development

```bash
cd mcp
npm install
npm test
```

Run the local CLI from source:

```bash
npm run build --prefix mcp
node mcp/dist/cli.js viewer --project .
```

Package:

```bash
npm --prefix mcp pack --dry-run
```

## License

MIT
