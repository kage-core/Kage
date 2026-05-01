# Kage

Kage is a local-first memory harness for coding agents. It gives Codex, Claude
Code, and other MCP-compatible agents a repo memory that survives across
sessions and can be shared with a team through git.

Kage stores useful repo knowledge as reviewed JSON packets, builds a memory
graph and source code graph, and exposes recall/query/capture tools through a
TypeScript CLI and MCP server. The goal is simple: an agent should not rediscover
how a repo works every time a new session starts.

No background daemon. No external API key. No hosted service required.

## What Ships Today

- Repo-local memory packets in `.agent_memory/packets/*.json`.
- Pending memory capture in `.agent_memory/pending/*.json`.
- Human review before memory becomes approved and shareable.
- Generated indexes in `.agent_memory/indexes/`.
- Evidence-backed memory graph in `.agent_memory/graph/`.
- Source-derived code graph in `.agent_memory/code_graph/`.
- Multi-language code indexing with built-in static extractors.
- Optional ingestion of Tree-sitter, SCIP, LSIF, and LSP artifacts.
- Codex MCP tools for recall, graph query, metrics, learning, validation, and
  branch review summaries.
- Agent policy installation through `AGENTS.md` so Kage is used automatically.
- Local terminal-style graph viewer for demos and memory inspection.
- Public candidate export and registry recommendation plumbing, without
  automatic publishing or installation.

## Product Model

Kage has three layers:

| Layer | Status | Purpose |
|---|---:|---|
| Local repo memory | Ships now | Private, git-native memory for one repo. |
| Org memory | Designed | Optional hosted memory shared across repos and teams. |
| Global graph/CDN | Designed | Public reviewed framework docs, gotchas, skills, MCPs, and graph packs. |

The local layer is the default. A memory server is only needed when sharing scope
exceeds one git repo.

## Install For Codex

From the repo you want Kage to remember, ask Codex to run:

```text
Set up Kage in this repo. Run the official installer:
curl -fsSL https://raw.githubusercontent.com/kage-core/Kage/master/codex-setup.sh | bash
```

The installer:

1. Clones or updates Kage under `~/.kage/Kage`.
2. Installs and builds the TypeScript MCP package.
3. Adds the local stdio MCP server to `~/.codex/config.toml`.
4. Runs `kage init --project <current-repo>`.
5. Installs or updates `AGENTS.md` so Codex uses Kage automatically.

Restart Codex after setup so the MCP server is loaded.

Local development install:

```bash
git clone https://github.com/kage-core/Kage.git
cd Kage/mcp
npm install
npm run build

../codex-setup.sh --project /path/to/your/repo
```

## Install For Any MCP Client

Build the MCP package:

```bash
cd mcp
npm install
npm run build
```

Configure your client with the stdio server:

```json
{
  "mcpServers": {
    "kage": {
      "command": "node",
      "args": ["/absolute/path/to/Kage/mcp/dist/index.js"]
    }
  }
}
```

Then initialize a repo:

```bash
kage init --project /path/to/repo
```

## Core CLI

```bash
# First-run setup
kage init --project /path/to/repo
kage policy --project /path/to/repo
kage doctor --project /path/to/repo

# Build and inspect repo knowledge
kage index --project /path/to/repo
kage recall "how do I run tests" --project /path/to/repo
kage graph "test command" --project /path/to/repo
kage code-graph "routes and tests" --project /path/to/repo
kage metrics --project /path/to/repo

# Capture and review memory
kage learn --project /path/to/repo --learning "Decision: run tests with npm test from mcp/"
kage capture --project /path/to/repo --type runbook --title "Run tests" --body "Use npm test in mcp/."
kage review-artifact --project /path/to/repo
kage review --project /path/to/repo
kage validate --project /path/to/repo

# Branch and sharing helpers
kage propose --project /path/to/repo --from-diff
kage feedback --project /path/to/repo --packet <packet-id> --kind helpful
kage registry --project /path/to/repo
kage promote --project /path/to/repo --public <approved-packet-id>
kage export-public --project /path/to/repo
```

## MCP Tools

Local repo tools:

- `kage_recall`
- `kage_code_graph`
- `kage_metrics`
- `kage_graph`
- `kage_graph_visual`
- `kage_learn`
- `kage_capture`
- `kage_feedback`
- `kage_install_policy`
- `kage_branch_overlay`
- `kage_validate`
- `kage_registry_recommend`
- `kage_review_artifact`
- `kage_propose_from_diff`
- `kage_promote_public_candidate`
- `kage_export_public_bundle`

Public graph tools:

- `kage_search`
- `kage_fetch`
- `kage_list_domains`

## Automatic Agent Behavior

Kage becomes ambient through the `AGENTS.md` policy installed by `kage init` or
`kage policy`.

For normal coding tasks, the agent should:

1. Call `kage_validate`.
2. Call `kage_recall` with the user task.
3. Call `kage_graph` or `kage_code_graph` when source flow matters.
4. Use returned memory only when relevant and source-backed.
5. Capture reusable learnings with `kage_learn`.
6. Call `kage_propose_from_diff` before final response when files changed.
7. Never approve, publish, or install shared assets automatically.

The user should not have to manually ask for recall or memory capture during
normal work. The harness tells the agent when to use the tools.

## Memory Review

Memory is intentionally human-gated.

```text
agent learns something
  -> kage_learn or kage_capture
  -> .agent_memory/pending/*.json
  -> kage review-artifact
  -> kage review
  -> .agent_memory/packets/*.json
  -> kage index
  -> recallable by future agents
```

`kage review-artifact` writes `.agent_memory/review/memory-review.md` with
quality notes, duplicate candidates, risks, and estimated token savings. `kage
review` is the CLI approval gate. Approved packets are committed like normal
repo files and shared with teammates through git.

## What Gets Stored

Kage stores future-useful knowledge, not transcripts:

- repo maps
- runbooks
- bug fixes
- decisions
- conventions
- workflows
- gotchas
- references
- policies

Each packet includes schema version, title, summary, body, type, scope,
visibility, sensitivity, status, confidence, tags, paths, stack, source refs,
freshness, graph edges, quality fields, and timestamps.

Generated indexes and graphs are disposable. The canonical memory is the packet
set.

## Code Graph

Kage keeps learned memory and codebase structure separate, then recalls across
both.

The code graph writes:

- `files.json`
- `symbols.json`
- `imports.json`
- `calls.json`
- `routes.json`
- `tests.json`
- `packages.json`
- `graph.json`

Built-in indexers cover JS/TS plus deterministic static extraction for Python,
Go, Rust, Java, Kotlin, Ruby, PHP, C#, C/C++, Swift, and common manifests.

For stronger code intelligence, Kage also ingests external artifacts:

- `.agent_memory/code_index/tree-sitter.json`
- `.agent_memory/code_index/scip.json`
- `.agent_memory/code_index/lsp-symbols.json`
- `.agent_memory/code_index/lsif.jsonl`
- `tree-sitter-index.json`
- `index.scip.json`
- `dump.lsif`

Those artifacts enrich the graph without making heavyweight parsers mandatory
for every install.

## Visualizer

The terminal graph viewer is zero-dependency and local:

```text
mcp/viewer/index.html?graph=/repo/.agent_memory/graph/graph.json&code=/repo/.agent_memory/code_graph/graph.json&metrics=/repo/.agent_memory/metrics.json
```

It supports memory/code/combined views, search, type and relation filters,
click-to-inspect nodes and edges, review risk markers, readiness metrics,
estimated tokens saved, drag-to-pan, wheel zoom, and fit controls.

## Safety Model

- Local repo memory is private by default.
- Generated public candidates are local files only.
- Nothing is published to org or global memory automatically.
- Registry recommendations do not auto-install skills, docs, or MCP servers.
- Capture blocks obvious secrets, tokens, private URL credentials, bearer
  tokens, private keys, and email addresses before writing packets.
- Public/global content is advisory and lower priority than repo-local memory.

## Hosted Roadmap

The hosted roadmap lives in [docs/ORG_GLOBAL_ROADMAP.md](docs/ORG_GLOBAL_ROADMAP.md).
It covers org memory, permissions, branch overlays, PR bot, registry signing,
global CDN publish, and operational launch gates.

These hosted pieces are optional extensions. They are not required for the
local-first repo memory product.

## Development

```bash
cd mcp
npm install
npm test
```

The current package test suite covers packet validation, migration, indexing,
recall ranking, code graph building, external code-index artifact ingestion,
metrics, MCP behavior, graph export, review artifacts, branch proposals,
registry recommendations, and public bundle sanitization.
