# Kage Repo-Recall MCP

This package exposes two surfaces:

- `kage-graph-mcp`: MCP server for the public Kage graph plus repo-local recall.
- `kage`: CLI for local repo memory packets, indexing, recall, capture, review,
  setup, optional daemon runtime, org/global artifact mode, marketplace packs,
  and validation.

## Latest Release

`1.1.13` switches future Kage releases to GPL-3.0-only:

- package metadata now advertises `GPL-3.0-only`.
- the repo includes the official GPLv3 `LICENSE` text.
- README clarifies that pre-switch releases were MIT, while future releases are
  GPL-3.0-only unless a separate written commercial license says otherwise.

`1.1.12` published the launch-ready docs pass:

- npm README now includes this explicit release note.
- Root README leads with the animated Kage demo GIF.
- README links clearly to the website and live viewer.
- Hosted viewer publishes Kage repo graph, code graph, metrics, and inbox from
  GitHub Pages while local repos still use `kage viewer --project .`.

## Build

```bash
npm install
npm run build
```

## CLI

```bash
kage setup list
kage setup codex --project /path/to/repo --write
kage setup claude-code --project /path/to/repo
kage setup generic-mcp --project /path/to/repo
kage setup doctor --project /path/to/repo
kage setup verify-agent --agent codex --project /path/to/repo
kage init --project /path/to/repo
kage policy --project /path/to/repo
kage doctor --project /path/to/repo
kage index --project /path/to/repo
kage refresh --project /path/to/repo
kage branch --project /path/to/repo
kage code-index --project /path/to/repo
kage code-graph --project /path/to/repo
kage code-graph "createApp routes tests" --project /path/to/repo
kage graph --project /path/to/repo
kage graph --project /path/to/repo --mermaid
kage graph "test command" --project /path/to/repo
kage graph-registry --project /path/to/repo
kage recall "how do I run tests" --project /path/to/repo
kage recall "how do I run tests" --project /path/to/repo --explain --json
kage quality --project /path/to/repo
kage audit --project /path/to/repo
kage inbox --project /path/to/repo
kage benchmark --project /path/to/repo
kage benchmark --project /path/to/repo --compare --task "how do I run tests"
kage viewer --project /path/to/repo
kage daemon start --project /path/to/repo
kage observe --project /path/to/repo --event '{"type":"command_result","session_id":"s1","command":"npm test","exit_code":0}'
kage distill --project /path/to/repo --session s1
kage learn --project /path/to/repo --learning "Decision: use kage_learn for actual session discoveries." --paths mcp/index.ts
kage feedback --project /path/to/repo --packet <approved-packet-id> --kind stale
kage capture --project /path/to/repo --type runbook --title "Webhook tests" --body "Run pnpm test:api -- webhooks."
kage propose --project /path/to/repo --from-diff
kage pr summarize --project /path/to/repo
kage pr check --project /path/to/repo
kage review-artifact --project /path/to/repo
kage registry --project /path/to/repo
kage marketplace --project /path/to/repo
kage promote --project /path/to/repo --public <approved-packet-id>
kage export-public --project /path/to/repo
kage org upload --project /path/to/repo --org acme --packet <approved-packet-id>
kage org review --project /path/to/repo --org acme --packet <org-packet-id> --approve
kage org recall "how do I run tests" --project /path/to/repo --org acme
kage layered-recall "how do I run tests" --project /path/to/repo --org acme --global
kage global build --project /path/to/repo --org acme
kage review --project /path/to/repo
kage validate --project /path/to/repo
kage upgrade --dry-run
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

`kage code-index --project <repo>` writes `.agent_memory/code_index/lsp-symbols.json`
in an LSP document-symbol-compatible shape using Kage's local parser. The CI,
PR, and sync workflows run it before refresh so the code graph has a committed
precise-index slot while teams can still replace or augment it with SCIP/LSIF
artifacts from their preferred toolchain.

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

Use `kage audit --project <repo>` or the `kage_audit` MCP tool before relying
on repo memory for agent work. Audit reports validation, pending memory inbox
size, structured context coverage, stale/duplicate risk, memory-to-code graph
links, precise code index coverage, and concrete recommendations such as
extending SCIP/LSIF/LSP coverage or adding structured
`why`/`verification`/`risk_if_forgotten` fields to high-value packets.

Use `kage inbox --project <repo>` or the `kage_inbox` MCP tool for the
actionable review queue. It consolidates pending packets, stale packets,
duplicates, missing structured context, validation warnings/errors, and concrete
actions into one report that the viewer also loads.

Use `kage benchmark --compare --task "<task>" --project <repo>` or
`kage_benchmark_compare` to compare the same task on the same repo with and
without Kage. It estimates manual full-file rediscovery tokens/steps, compares
them to compact Kage recall plus code graph context, and returns evidence plus
caveats for honest marketing proof.

Plain `kage benchmark --project <repo>` now includes explicit gates and an
overall score for recall hit rate, evidence coverage, useful memory ratio, and
code-flow coverage, so benchmark output has pass/fail criteria instead of loose
claims.

Use `kage graph-registry --project <repo>` or `kage_graph_registry` to write
`.agent_memory/graph_registry/manifest.json`. The manifest is signed with the
same canonical JSON scheme as registry bundles and records memory/code graph
artifact hashes, generated index/report paths, source packet IDs and packet
hashes, git state, audit trust, inbox counts, and metrics readiness. CI, PR, and
sync workflows build it after refresh.

Use `kage refresh --project <repo>` or the `kage_refresh` MCP tool after
meaningful file changes. Refresh rebuilds indexes, code graph, memory graph,
metrics, and stale-memory metadata. Memory is marked stale when status or
feedback says it is stale, its TTL expires, or grounded paths disappear.

Use `kage gc --project <repo> --dry-run` to preview stale packet cleanup.
`kage gc --project <repo>` marks stale repo packets deprecated, rebuilds
indexes/graphs/metrics, and keeps helpful-voted memories unless `--force` is
used.

Use `kage pr summarize --project <repo>` / `kage_pr_summarize` before handoff to
write branch review metadata and repo-local change memory from the git diff.
Use `kage pr check --project <repo>` / `kage_pr_check` before merge to verify
validation, graph freshness, stale packets, and memory packet changes.

Review artifacts include memory quality reasons, risks, duplicate candidates,
and estimated token savings for legacy pending/quarantine packets and promotion
review.

`kage observe` is the automatic-capture primitive for agent hooks and daemon
clients. It accepts session, prompt, tool, file-change, command, test, and
session-end events; deduplicates them; scans for secrets and PII; and stores raw
observations locally only. `kage distill` turns useful observations into
repo-local packets with observation session source refs. Distillation is not
limited to action-changing instructions: durable rationale, bug causes, issue
state, decisions, and code explanations are valid memory when source-backed. It
never publishes memory.

`kage recall --explain --json` exposes the hybrid scoring explanation used for
ranking: BM25 lexical score, graph, path/type/tag, intent, freshness, quality,
feedback, and a vector placeholder for future local or external embedding providers.
Current fallback is vectorless BM25 plus graph retrieval.

`kage_context` is the primary MCP entrypoint for agents. It validates repo
memory, recalls relevant packets, and returns code/knowledge graph context in
one call. Agents should use it at task start instead of loading separate
`kage_validate`, `kage_recall`, `kage_code_graph`, and `kage_graph` schemas.

`kage daemon start` exposes the optional local REST runtime on
`127.0.0.1:3111`:

- `GET /health`
- `GET /kage/status`
- `GET /kage/metrics`
- `GET /kage/quality`
- `GET /kage/inbox`
- `GET /kage/benchmark`
- `POST /kage/recall`
- `POST /kage/observe`
- `POST /kage/distill`

The daemon is not required for stdio MCP or CLI use; it exists for agents and
workflows that need REST, live observation ingestion, Aider-style scripting, or
automatic index refresh. On start it indexes once, then watches repo file changes
and refreshes generated graph/index artifacts after a short debounce.

## Local Graph Viewer

Run `kage viewer --project <repo>` to start the local terminal console. It
serves the viewer and the selected repo's `.agent_memory/` files from the same
localhost server, then prints a URL that auto-loads memory graph, code graph,
metrics, memory inbox, review artifact, and pending packets when present.
Manual JSON selection remains as a fallback, not the main workflow.

The viewer renders nodes and relations in SVG, supports memory/code/combined
modes, filters by type and relation, displays metrics, shows packets and pending
quarantine items when present, surfaces the memory inbox, and marks risks such
as low-confidence or missing-evidence edges.

For demos or local docs, the viewer also accepts URL params:

```text
mcp/viewer/index.html?graph=/repo/.agent_memory/graph/graph.json&code=/repo/.agent_memory/code_graph/graph.json&metrics=/repo/.agent_memory/metrics.json
```

The graph canvas supports drag-to-pan, wheel zoom, explicit zoom buttons,
fit-to-view, click selection, and background deselect. This keeps review
interactive enough to explain how repo facts, learned memory, evidence,
confidence, and token-savings metrics connect.

## MCP Tools

Local repo tools:

- `kage_context`
- `kage_recall`
- `kage_graph_registry`
- `kage_code_graph`
- `kage_code_index`
- `kage_metrics`
- `kage_audit`
- `kage_inbox`
- `kage_refresh`
- `kage_pr_summarize`
- `kage_pr_check`
- `kage_quality`
- `kage_benchmark`
- `kage_benchmark_compare`
- `kage_setup_agent`
- `kage_graph`
- `kage_graph_visual`
- `kage_learn`
- `kage_capture`
- `kage_observe`
- `kage_distill`
- `kage_feedback`
- `kage_install_policy`
- `kage_branch_overlay`
- `kage_validate`
- `kage_registry_recommend`
- `kage_marketplace`
- `kage_org_status`
- `kage_org_upload_candidate`
- `kage_org_recall`
- `kage_layered_recall`
- `kage_global_build`
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

For other agents, generate the exact config with:

```bash
kage setup list
kage setup cursor --project /path/to/repo
kage setup windsurf --project /path/to/repo
kage setup gemini-cli --project /path/to/repo
kage setup opencode --project /path/to/repo
kage setup generic-mcp --project /path/to/repo
```

Minimum policy:

```md
Before code changes or repo-specific answers:
1. Call `kage_context` with `project_dir` and the user task as `query`.
2. Capture reusable learnings with `kage_learn` or `kage_capture`.
3. After meaningful file changes, call `kage_refresh`.
4. Before finishing changed-file tasks, call `kage_propose_from_diff` or `kage_pr_summarize`.
5. Before merge, call `kage_pr_check`.
6. Never publish or promote org/global memory automatically.
```

Run `kage setup verify-agent --agent codex --project <repo>` after setup. The
CLI verifies config, policy, indexes, recall, and code graph. It intentionally
reports `restart_required` until the active agent can call the MCP
`kage_verify_agent` tool, which proves Kage is live inside that agent session.

The official Codex MCP docs also support adding HTTP MCP servers with:

```bash
codex mcp add <name> --url <server-url>
codex mcp list
```

Kage currently runs as a local stdio MCP server, so the TOML form is the direct
fit for the current package.

## Safety Model

- `kage_learn` is the preferred surface for actual session learning. It creates
  repo-local packets with explicit learning/evidence/verification text.
- `kage_capture` creates repo-local packets.
- `kage_propose_from_diff` writes a branch review summary under
  `.agent_memory/review/` and a repo-local change-memory packet under
  `.agent_memory/packets/`. Promotion beyond the repo still requires explicit
  review.
- `kage_promote_public_candidate` writes a local sanitized review candidate
  under `.agent_memory/public-candidates/`; it does not publish.
- Registry recommendations never auto-install skills, docs, or MCP servers.
- Org/global shared memory still requires explicit review.
- Capture blocks obvious secrets, tokens, private URL credentials, bearer
  tokens, private keys, and email addresses before writing a packet.
- Generated indexes are disposable and can be rebuilt from packets.
