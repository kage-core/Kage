# Kage Repo-Recall MCP

This package exposes two surfaces:

- `kage-graph-mcp`: MCP server for the public Kage graph plus repo-local recall.
- `kage`: CLI for local repo memory packets, indexing, recall, capture, review, and validation.

## Build

```bash
npm install
npm run build
```

## CLI

```bash
kage init --project /path/to/repo
kage policy --project /path/to/repo
kage doctor --project /path/to/repo
kage index --project /path/to/repo
kage branch --project /path/to/repo
kage code-graph --project /path/to/repo
kage code-graph "createApp routes tests" --project /path/to/repo
kage graph --project /path/to/repo
kage graph --project /path/to/repo --mermaid
kage graph "test command" --project /path/to/repo
kage recall "how do I run tests" --project /path/to/repo
kage learn --project /path/to/repo --learning "Decision: use kage_learn for actual session discoveries." --paths mcp/index.ts
kage feedback --project /path/to/repo --packet <approved-packet-id> --kind stale
kage capture --project /path/to/repo --type runbook --title "Webhook tests" --body "Run pnpm test:api -- webhooks."
kage propose --project /path/to/repo --from-diff
kage review-artifact --project /path/to/repo
kage registry --project /path/to/repo
kage promote --project /path/to/repo --public <approved-packet-id>
kage export-public --project /path/to/repo
kage review --project /path/to/repo
kage validate --project /path/to/repo
```

`kage init` is the first-run command. It creates `.agent_memory/`, migrates
legacy Markdown nodes into `.agent_memory/packets/*.json`, builds generated
indexes, installs/updates `AGENTS.md`, validates the result, and prints a first
recall preview.

The graph builder writes evidence-backed graph artifacts under
`.agent_memory/graph/`:

- `episodes.json`: where graph facts came from, such as memory packets or
  repo manifests.
- `entities.json`: typed nodes for repo, memory, path, tag, package, command,
  and memory type entities.
- `edges.json`: typed facts such as `contains_memory`, `affects_path`,
  `mentions_tag`, `uses_package`, `documents_command`, and `defines_command`.
- `graph.json`: the assembled graph with branch, head, and merge-base metadata.

The code graph builder writes source-derived artifacts under
`.agent_memory/code_graph/`:

- `files.json`: source, test, config, manifest, and doc files, including
  language and parser metadata.
- `symbols.json`: functions, classes, constants, and test cases.
- `imports.json`: local and external import edges.
- `calls.json`: best-effort call edges between discovered symbols.
- `routes.json`: best-effort Node/Express/Next route facts.
- `tests.json`: test-to-symbol/file coverage hints.
- `packages.json`: package scripts and dependencies.
- `graph.json`: the assembled code graph.

The code graph is multi-language by design. JS/TS/JSX/TSX files use the
TypeScript compiler API for AST-backed symbols, imports, and call hints. Python,
Go, Rust, Java, Kotlin, Ruby, PHP, C#, C/C++, and Swift use deterministic generic
static extractors so every repo gets a useful graph immediately.

Kage also consumes external industry indexer artifacts when present:

- `.agent_memory/code_index/tree-sitter.json`
- `.agent_memory/code_index/scip.json`
- `.agent_memory/code_index/lsp-symbols.json`
- `.agent_memory/code_index/lsif.jsonl`
- `tree-sitter-index.json`
- `index.scip.json`
- `dump.lsif`

Those adapters are merge inputs, not required runtime dependencies. Facts from
Tree-sitter, SCIP, LSIF, and LSP are tagged with parser provenance and outrank
generic extraction in metrics and file parser coverage. This keeps installation
light while allowing teams to plug in the strongest indexer available for their
language stack.

The memory graph follows the same product direction as temporal context graph
systems such as Graphiti: immutable ingestion episodes, derived entities and
facts, evidence/provenance on every edge, confidence, branch/commit context, and
temporal validity fields (`valid_from`, `invalidated_at`). Kage keeps code facts
and learned memory separate, then recalls across both when assembling context.

Use `kage metrics --project <repo>` or the `kage_metrics` MCP tool to inspect
whether the harness is actually carrying its weight. Metrics include language
and parser coverage, code graph counts, evidence coverage, approved vs pending
memory, validation status, estimated tokens saved per recall, duplicate
candidates, average memory quality, and a readiness score.

Review artifacts include memory quality reasons, risks, duplicate candidates,
and estimated token savings so reviewers can approve, reject, or merge pending
memory with less manual inspection.

## Local Graph Viewer

Open `mcp/viewer/index.html` in a browser, choose one or more JSON files such as
`.agent_memory/graph/graph.json`, `.agent_memory/code_graph/graph.json`, or a
`kage metrics --json` export, and inspect the local graph without running a
server or installing dependencies. The viewer renders nodes and relations in
SVG, supports memory/code/combined modes, filters by type and relation, displays
metrics, and marks review risks such as low-confidence or missing-evidence
edges.

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

## Codex MCP Configuration

Fast path from the repo you want Kage to remember:

```bash
curl -fsSL https://raw.githubusercontent.com/kage-core/Kage/master/codex-setup.sh | bash
```

This clones/updates Kage under `~/.kage/Kage`, builds this MCP package, writes
the `mcp_servers.kage` block to `~/.codex/config.toml`, and runs `kage init` for
the current repo. Restart Codex after it completes.

Local development path:

```bash
/path/to/Kage/codex-setup.sh --project /path/to/repo
```

After building the package, add the local stdio server to Codex.

`~/.codex/config.toml`:

```toml
[mcp_servers.kage]
command = "node"
args = ["/absolute/path/to/Kage/mcp/dist/index.js"]
```

Then restart Codex. To make Kage ambient instead of manual, run `kage init` or
`kage policy`; both install an `AGENTS.md` policy that tells Codex to call Kage
automatically before and after coding tasks.

Minimum policy:

```md
Before code changes or repo-specific answers:
1. Call `kage_validate`.
2. Call `kage_recall` with the user task as the query.
3. Call `kage_graph` with the user task as the query.
4. Capture reusable learnings with `kage_capture`.
5. Before finishing changed-file tasks, call `kage_propose_from_diff`.
6. Never approve or publish memory automatically.
```

The official Codex MCP docs also support adding HTTP MCP servers with:

```bash
codex mcp add <name> --url <server-url>
codex mcp list
```

Kage currently runs as a local stdio MCP server, so the TOML form is the direct
fit for this MVP.

## Safety Model

- `kage_learn` is the preferred surface for actual session learning. It creates
  pending packets with explicit learning/evidence/verification text.
- `kage_capture` only creates pending packets.
- `kage_propose_from_diff` writes a branch review summary under
  `.agent_memory/review/`. It does not create recallable memory.
- `kage_promote_public_candidate` writes a local sanitized review candidate
  under `.agent_memory/public-candidates/`; it does not publish.
- Registry recommendations never auto-install skills, docs, or MCP servers.
- Shared approved memory still requires `kage review`.
- Capture blocks obvious secrets, tokens, private URL credentials, bearer
  tokens, private keys, and email addresses before writing a packet.
- Generated indexes are disposable and can be rebuilt from packets.
