<div align="center">

# Kage

### Repo memory and code graph for coding agents

Codex learns it today. Claude Code recalls it tomorrow.

Kage gives every coding agent the same repo-local memory, source-derived code
graph, and visual memory terminal. The memory lives with the repo as JSON, so
teams stop rediscovering commands, decisions, gotchas, bugs, and code flows.

<p>
  <img alt="local first" src="https://img.shields.io/badge/local--first-yes-16a34a?style=for-the-badge">
  <img alt="tests" src="https://img.shields.io/badge/tests-100%20passing-16a34a?style=for-the-badge">
  <img alt="agents" src="https://img.shields.io/badge/agents-13-2563eb?style=for-the-badge">
  <img alt="database" src="https://img.shields.io/badge/external%20DB-0-111827?style=for-the-badge">
  <img alt="mcp" src="https://img.shields.io/badge/MCP-ready-7c3aed?style=for-the-badge">
</p>

<p>
  <strong>Website:</strong>
  <a href="https://kage-core.github.io/Kage/">https://kage-core.github.io/Kage/</a>
  ·
  <strong>Live viewer:</strong>
  <a href="https://kage-core.github.io/Kage/viewer/">https://kage-core.github.io/Kage/viewer/</a>
</p>

<p>
  <a href="#install">Install</a> ·
  <a href="#viewer">Viewer</a> ·
  <a href="#performance">Performance</a> ·
  <a href="https://kage-core.github.io/Kage/">Website</a> ·
  <a href="#codex-and-claude-code">Codex + Claude</a> ·
  <a href="#what-kage-stores">Memory Model</a> ·
  <a href="#proof">Proof</a>
</p>

![Kage Memory Terminal demo](docs/assets/kage-demo.gif)

<a href="docs/assets/kage-viewer-demo.mp4">
  <img alt="Kage hosted viewer demo video" src="docs/assets/kage-viewer-demo-poster.png">
</a>

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

The hosted viewer opens with the Kage repo's published memory graph, code graph,
metrics, and inbox. If those artifacts are unavailable, it falls back to a
bundled demo graph. For your private or local repo, the local command is still
preferred because it auto-loads that repo's graph, code graph, metrics, inbox,
review file, and pending queue:

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
| Review context | memory inbox, pending/quarantine packets, and review artifact when present |

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
4. Refresh indexes/graphs after meaningful file/content changes, not after push-only or same-tree commits.
5. Run the PR memory check before handoff.

## Core Commands

```bash
kage init --project .
kage recall "how do I run tests" --project .
kage code-index --project .
kage structural-index --project .
kage code-graph "routes tests auth" --project .
kage learn --project . --learning "Use npm test after changing parser code."
kage refresh --project .
kage refresh --project . --full
kage graph-registry --project .
kage audit --project .
kage inbox --project .
kage pr check --project .
kage viewer --project .
```

`kage code-index` prefers a SCIP index when `scip-typescript` and the `scip`
CLI are installed, then falls back to Kage's built-in LSP-compatible symbol
index. This keeps first-run setup light while letting larger TypeScript/JS repos
use an industry code-intelligence indexer for the code graph.

`kage structural-index` builds a complete, cache-backed structural map under
`.agent_memory/structural/`. It covers every supported source/config/doc file,
uses `.kageignore`, reuses unchanged per-file facts, parallelizes extraction on
large repos, and keeps generated code facts separate from learned memory
packets. Refresh stores structural cache entries in a packed artifact and
migrates older per-file cache layouts automatically, so active repos do not grow
a stale cache file for every historical source hash.

For stale memory:

```bash
kage gc --project . --dry-run
kage feedback --project . --packet <packet-id> --kind stale
```

For proof:

```bash
kage metrics --project . --json
kage audit --project . --json
kage inbox --project . --json
kage benchmark --project . --compare --task "how do I run tests"
```

## Performance

Kage is built so agents do not re-index the whole repo every time they ask a
question. Learned memory, generated indexes, the memory graph, the structural
index, and the code graph are separate layers. Read-only commands reuse current
artifacts, while refresh only rebuilds what changed.

Measured on this repo on May 9, 2026 from fresh CLI processes with hot caches:

| Operation | Time |
|---|---:|
| `kage recall "how do I run tests"` | 0.23s |
| `kage code-graph "routes tests auth"` | 0.20s |
| `kage graph "memory capture decisions"` | 0.21s |
| `kage structural-index --project .` | 0.15s |
| `kage code-index --project .` | 0.25s |
| `kage index --project .` | 0.48s |
| `kage refresh --project .` | 0.67s |

Current Kage-on-Kage cache and graph state:

| Metric | Current |
|---|---:|
| Approved memory packets | 82 |
| Memory graph | 714 entities / 1,807 edges |
| Indexed code files | 22 |
| Code symbols | 2,945 |
| Calls | 1,560 |
| Ignored generated/unsupported files | 296 |
| Recall hit rate | 100% |
| Evidence coverage | 100% |

The important product behavior is context compression. Kage estimates this repo
has 197,777 indexed source tokens, while a normal recall returns about 1,800
context tokens. That is roughly 110x less context than asking an agent to reread
the indexed source on every task.

How the speedups work:

- `kage init` is packet-only, so first use is not blocked by full graph builds.
- `kage refresh` uses source/input fingerprints and reuses unchanged code graph
  artifacts.
- Per-file structural facts are cached by content hash; changed files miss the
  cache, unchanged files do not.
- Structural cache is packed into `.agent_memory/structural/file-cache.json`
  instead of growing one stale JSON file per historical source hash.
- Generated/vendor/cache paths are ignored, and huge files are represented
  safely instead of deeply parsed into massive graphs.
- Structural indexing can parallelize with worker threads on large repos.
- `kage code-index` can consume SCIP when available, with a built-in
  LSP-compatible fallback when external tools are not installed.
- Recall builds graph lookup maps once per query instead of scanning every
  graph entity and edge for every memory packet.

Cold indexing on a large repo still depends on repo size, file types, and cache
state. The design goal is that repeat work scales with changed files, not with
the entire repository.

## What Kage Stores

Kage keeps generated code facts separate from learned repo memory.

| Layer | Stored In | Purpose |
|---|---|---|
| Repo memory packets | `.agent_memory/packets/*.json` | durable runbooks, decisions, rationale, issue context, code explanations, bug fixes, conventions, gotchas |
| Generated indexes | `.agent_memory/indexes/` | rebuildable packet catalogs, paths, tags, types |
| Memory graph | `.agent_memory/graph/graph.json` | compact reference artifact for packet relations: tags, paths, commands, evidence |
| Structural index | `.agent_memory/structural/` | complete cache-backed file, symbol, and import map for large repos |
| Code graph | `.agent_memory/code_graph/graph.json` | compact reference artifact for source-derived files, symbols, imports, calls, routes, tests |
| Metrics | `.agent_memory/metrics.json` | readiness, quality, parser coverage, token estimates |
| Graph registry | `.agent_memory/graph_registry/manifest.json` | signed manifest for graph artifacts, packet hashes, git state, audit/inbox evidence |

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
| Tests | 100 passing |
| Agent setup targets | 13 |
| External DB required | 0 |
| MCP tools | recall, context, learn, graph, graph registry, code graph, code index, metrics, audit, inbox, benchmark, validate |
| Source graph | files, symbols, imports, calls, routes, tests, packages |
| Safety | secret/PII scan before capture |

Maintainer release guardrails:

```bash
npm run build --prefix mcp
cd mcp
node dist/release.js --dry-run
node dist/release.js --publish --push --smoke
```

The release helper is source-repo maintainer tooling, not part of the public npm
package. It fetches the remote branch, requires a clean worktree, blocks if
`origin/<branch>` is not already contained in local `HEAD`, runs the package
tests and pack dry-run, pushes before publishing, verifies npm with retry/backoff,
and uses `GIT_EDITOR=true` for git steps.

Graph freshness is content-based: push-only operations and empty/same-tree
commits do not require a second `kage refresh`. Real changes to source files,
approved memory packets, or code-index inputs still make `kage pr check` require
refresh before merge. Use `kage refresh --full` only when you intentionally want
to bypass unchanged-graph reuse and rebuild the code graph from scratch.

Kage on Kage itself:

| Metric | Current |
|---|---:|
| Readiness | 100/100 |
| Memory packets | 82 |
| Memory graph edges | 1,807 |
| Code files | 22 |
| Symbols | 2,945 |

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

GPL-3.0-only. See [LICENSE](LICENSE).

Note: Kage releases before the GPL switch were published under MIT. Future
versions are GPL-3.0-only unless a separate written commercial license says
otherwise.
