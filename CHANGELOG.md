# Changelog

## Unreleased

- **Automatic capture fallback (`kage distill --auto`).** The Claude Code Stop
  hook now quietly distills the session's observations when the agent never
  called `kage_learn`: drafts are written to the pending inbox (never approved
  memory), tagged `auto-distill`, and excluded from recall until reviewed with
  `kage review`. Auto mode is silent on empty sessions and skips sessions that
  already produced memory packets; it never blocks the hook.
- **Session continuity (`kage resume`).** New CLI command prints a compact
  (≤15-line) "previously…" digest — last session's observations, distilled
  learnings, latest change-memory packet, pending auto-distilled draft count,
  and unresolved reconciliation items. Prints nothing when there is no prior
  session data. The SessionStart hook appends it to the injected memory policy
  so new sessions start warm.

## v2.0.2 - one-shot install + plugin hooks

- **`kage install` — one-shot setup.** `npx -y @kage-core/kage-graph-mcp install`
  now runs init + index, auto-detects installed agents (Claude Code, Codex,
  Cursor, Windsurf, Gemini CLI, OpenCode, Goose, Aider) by config-dir presence,
  wires the writable ones, and prints a receipt. `--agents a,b`, `--no-agents`,
  `--json` supported.
- **Claude Code plugin upgraded.** `/plugin marketplace add kage-core/Kage` now
  ships hooks (SessionStart policy injection + Stop-time refresh/reconcile
  gate) and slash commands (`/kage:scan`, `/kage:gains`, `/kage:init`) alongside
  the MCP server. Plugin manifest validates with `claude plugin validate`.
- **README/site:** quick start leads with the one-command install; new honest
  comparison table (Kage vs claude-mem vs mem0/Zep) centered on verification.

## v2.0.0 - verified repo knowledge, receipts, and the Truth Report

The 2.0 release reframes Kage around one story: every claim cited against your
current code, and you see exactly what it saves you. (PRs #56–#65.)

### New

- **`kage scan` — the Truth Report** (#63). Zero-setup, ~60-second shock report
  on any repo: duplicate implementations (AI-era flagged), grep-proof ghost
  exports, bus-factor-1 hot files, knowledge voids (churn × centrality × zero
  memory), and doc lies (README claims vs reality). Every finding cites
  `file:line` evidence. Express acid test: `lib/response.js — 390 commits,
  149 edges, zero memory packets.` Includes a 66s→0.29s perf fix.
- **Value ledger + visible receipts (`kage gains`)** (#62). Persistent per-repo
  ledger at `.agent_memory/reports/value.json`; receipt line after each recall;
  gains line in `kage_context` that agents relay ("~289K tokens saved" live).
- **Stale-catch moment** (#64). `kage pr check` now leads with
  "⚠ Your changes invalidated N team memories" (file + reason + fix); new
  `kage staleguard` for pre-commit hooks; `stale_caught` ledger events feed
  `kage gains`; the `kage_pr_check` MCP tool relays the summary. Dogfooding
  caught 15 real invalidations on this repo.
- **Tree-sitter extraction tier** (#61). Real AST extraction for Python, Go,
  Rust, Java, and Ruby via web-tree-sitter (pure WASM, zero native deps),
  replacing regex. Click acid test: 466 methods correctly classified (was 0),
  real block spans, docstring false-positives gone. Grammar load failures fall
  back to regex.
- **Gains-first theme** (#65). Light-first "receipts/proof" viewer with a GAINS
  landing tab fed by the value ledger (dark variant included); site hero updated;
  daemon serves `value.json`.

### Engine

- **Import-aware call resolution** (#59). Callees resolve through local scope →
  imports → same package before any name-only match; external-package imports
  produce no repo edge; <0.5-confidence edges are gated from display. On
  Express: 524 ghost edges shown → 0; verified-local edges 473 → 2,277.
  `CODE_GRAPH_BUILDER_VERSION` busts stale graph caches.
- **Engine fixes that lost the grep benchmark** (#57): method-assignment symbol
  extraction (+101 symbols on Express), core-over-tests ranking, and
  call-edge-powered caller queries (definition + all call sites, `file:line`),
  plus extractor-version cache busting.
- **Context-block compaction + fingerprint cache** (#58): 38% smaller recall
  context blocks (same answers); staleness checks stop re-hashing unchanged
  files in long-lived server processes.

### First-run and surface

- **First-run trust fixes** (#56): TTY + no args now runs the demo with next
  steps; `init`/`index` no longer write `AGENTS.md`/`CLAUDE.md`/`.claude`
  unprompted (explicit `--with-policy` / `kage policy` / `setup --write`);
  setup emits `npx -y` when the server path is ephemeral; `.claude`/`.codex`
  excluded from indexing.
- **Surface shrink** (#60): tiered CLI help (14-line core vs the old 93-line
  wall); org/marketplace/global/layered stubs removed across CLI, MCP, kernel,
  and tests. Kage is repo-local memory — promotion surfaces that never shipped
  are gone.

### Breaking

- Removed untested stub surfaces (#60): org status/upload/review/recall/export,
  marketplace, global CDN bundle, and layered recall — 4 CLI commands and
  8 MCP tools (`kage_marketplace`, `kage_org_*`, `kage_layered_recall`,
  `kage_global_build`, `kage_promote_public_candidate`,
  `kage_export_public_bundle`). MCP tool surface 71 → 63. Repo-local memory,
  the code graph, and the MCP harness are unaffected.

## v1.4.0 - live memory: grounding-aware, instrumented, and a real dashboard

- **`.kageignore` now governs memory grounding, not just indexing.** A repo can
  declare non-knowledge paths (e.g. a presentation/visualization layer); those
  paths are dropped at capture, never mark memory stale on recall/refresh, and
  are pruned from existing packets on `kage refresh`. Fixes spurious stale
  cascades when a widely-cited non-knowledge file is deleted.
- **Recall instrumentation + Activity.** Recalls are recorded as access
  telemetry; new `kage activity` / activity report gives a chronological feed of
  what agents recalled and captured, with per-day counts.
- **Viewer rebuilt into a focused dashboard.** Overview (Memory Trust + live
  stats), Memory map (interactive memory↔code graph: zoom/pan/drag/filter/focus),
  Memory (grouped, searchable, click-through detail drawer to read a packet),
  Activity (recall/capture feed), Insights (health donut, type bars, most-grounded
  files). Single CSP-safe page; matches the site theme.
- **Lifecycle items now carry `summary` + `body`** so the viewer can show a
  packet's full content.
- **Health donut reframed** to grounded-&-current vs needs-review (recall
  frequency is shown separately, not as "unhealthy").
- **Docs:** the packet journey and every score explained in the README and on the
  site, with visual flow diagrams and a fresh animated `kage demo`.

## v1.3.0 - trust, governance & first-run

- `kage demo` (and `npx -y @kage-core/kage-graph-mcp demo`): a 60-second,
  zero-setup proof of the trust wedge — rejects a hallucinated citation,
  withholds a stale memory, recalls only grounded memory, prints a trust score.
- The `kage-graph-mcp` binary now dispatches CLI subcommands (so a single
  `npx @kage-core/kage-graph-mcp <command>` works); no-arg launch still starts
  the MCP server.
- Suppression Shelf in the viewer + `kage suppressed` / `kage_suppressed`:
  surfaces memory recall is actively withholding.
- Viewer redesign: trust-led overview (Memory Trust hero + metric bars).
- Trust Benchmark (`kage benchmark --trust`), capture parity (9 lifecycle
  hooks incl. PreToolUse/SubagentStop), traversal-driven structural blast radius.
- docs/BENCHMARKS.md (own numbers, reproducible) and a trust-first README +
  landing page.

## Earlier in this line - memory-quality mechanisms

- Write-time citation validation: `kage_capture`/`kage_learn` (and the CLI)
  reject a write when every referenced path is missing from the repo, with an
  `allow_missing_paths` / `--allow-missing-paths` escape hatch. The core
  `capture()` library stays permissive for programmatic callers.
- Recall now excludes hard-stale memory (cited files deleted since capture,
  expired TTL, or reported stale) from the payload and records what was
  suppressed; `includeStale` bypasses for audits.
- New `kage verify` / `kage_verify_citations` for on-demand grounding and
  staleness checks of repo memory.
- New `kage compact` / `kage_compact`: prune dead citations, deprecate
  hard-stale packets, and surface near-duplicate clusters for agent-driven
  merge (no hosted LLM).
- Packets record `author_branch`; agents can declare `graph_nodes` at capture
  (stored as code-reference edges).
- Opt-in recall token budget (`--max-context-tokens` / `max_context_tokens`)
  and opt-in traversal-driven structural blast radius (`--structural-hops` /
  `structural_hops`).
- `kage hook install` now also installs `post-merge` / `post-checkout` hooks so
  pulled teammate packets re-index automatically.
- Packet loaders skip unparseable / merge-conflicted packets instead of
  crashing all of recall/verify/compact.
- gitignore: stop tracking auto-generated `repo_map` packets (the patterns
  missed the repo-key infix), which were causing spurious merge conflicts.

## v1.1.36 - 2026-05-17

- Added a viewer overview dashboard with sections for readiness, memory
  coverage, graph health, repo intelligence, review, and workspace links.
- Added viewer navigation so users can scan the dashboard first and then move
  into focused graph, memory, intelligence, and review workspaces, with raw
  Artifacts kept as an advanced diagnostics link.
- Replaced duplicate drawer/quick-control surfaces with separate page layouts
  for Graph, Memory, Owners, Intel, and Review so each route has one
  clear job.
- Simplified the viewer around fewer decisions: the overview now shows four
  primary cards, Intel only shows six priority signals, and Artifacts caps raw rows
  so the UI does not turn into an information dump.
- Reworked the Memory page into a packet review workflow with search, filters,
  code-link coverage, and a side-by-side Inspector so users can see which repo
  lore is reusable, which memory is grounded to code, and which packets need
  better paths.
- Added action-oriented viewer charts for memory grounding, source-map coverage,
  handoff blockers, change risk, owner concentration, memory quality, benchmark
  gates, and raw-artifact diagnostics.
- Reworked the Graph page with a compact "Before You Change" action panel for
  untrusted relations, code without memory, memory-code links, and contextual
  impact tracing so the graph answers edit-readiness questions instead of only
  rendering nodes.
- Reframed the old Debug route as Artifacts for diagnosing generated graph
  shape, evidence coverage, memory-code links, and raw relation quality.
- Added a viewer Path Finder for source graph navigation.
- Reworked the viewer into a graph-first workspace with controls and Inspector
  beside the graph instead of overlaying the canvas.
- Kept zoom and fit controls on the graph canvas while moving advanced filters
  behind a collapsed control and moving Path Finder into the Inspector.
- The local and hosted viewers can now resolve two code nodes, files, symbols,
  routes, or tests and highlight the shortest forward, reverse, or undirected
  dependency path between them.
- Path highlights are preserved through node/edge capping and render in both 2D
  Canvas and 3D Space modes.

## v1.1.34 - 2026-05-15

- Added a viewer Workspace Map section for multi-repo intelligence.
- The Repo Intelligence cockpit now lists package dependencies, route
  contracts, topic/event links, and cross-repo co-change links as inspectable
  rows instead of only showing workspace counts.
- Mirrored the update into the hosted GitHub Pages viewer assets.

## v1.1.33 - 2026-05-15

- Added local workspace cross-repo co-change links from recent git history.
- `kage workspace` now reports sibling-repo file pairs that changed near each
  other by the same author, with frequency, strength, author, and evidence
  fields.
- Surfaced co-change counts in CLI text output and the viewer workspace card.
- Kept the signal lightweight and repo-local: recent `git log`, existing code
  graph files, bounded commit/file counts, no database, and no network calls.

## v1.1.32 - 2026-05-15

- Added deterministic workspace topic/event contract links alongside package
  dependencies and route contracts.
- `kage workspace` now reports producer/consumer pairs when sibling repos use
  the same topic string through common publish/subscribe style calls.
- Kept the workspace contract layer local and source-evidence based: no server
  database, no generated API docs, and route-like strings are excluded from the
  topic detector.

## v1.1.31 - 2026-05-15

- Added confidence and resolution metadata to code graph call edges so
  TypeScript AST, generic static, and external-index calls no longer all look
  equally certain.
- Updated `kage code-graph` call context and the viewer to surface
  low-confidence call edges instead of treating every call link as certainty.
- Kept older graph artifacts compatible by hydrating missing call confidence
  with conservative defaults.

## v1.1.30 - 2026-05-15

- Expanded `kage cleanup-candidates` beyond unreferenced source files to also
  report conservative unused exported symbols and internal-looking symbols.
- Kept cleanup output as review input only: candidates include confidence,
  reasons, symbol name/id/line when available, git recency, test coverage
  signals, and runtime-reference safeguards.
- Added regression coverage so imported symbols are not flagged while unused
  sibling exports and private helpers can be surfaced.

## v1.1.29 - 2026-05-15

- Expanded mixed-language framework route extraction in the code graph for
  Rails, Laravel, Spring, Go routers, Rust routers, and ASP.NET.
- Added route handler linking where lightweight static patterns can identify
  the nearby handler symbol.
- Added regression coverage for mixed-language web entrypoint detection.

## v1.1.28 - 2026-05-15

- Added Python framework route extraction to the source-derived code graph for
  FastAPI/APIRouter decorators, Flask `@app.route(..., methods=[...])`, and
  Django `path` / `re_path` declarations.
- Normalized Python route parameters such as `{task_id}` and
  `<int:order_id>` into Kage's `:param` graph format so viewer, recall, and
  route queries can compare routes consistently across frameworks.
- Added regression coverage for FastAPI, Flask, and Django route detection.

## v1.1.27 - 2026-05-15

- Added `kage hook install/status/uninstall` for repo-local git
  `post-commit` automation. The hook preserves existing hook content, supports
  `KAGE_SKIP_HOOK=1`, and runs `kage refresh` plus `kage pr summarize` after
  commits.
- Upgraded the viewer's Repo Intelligence panel from summary cards to
  navigable operational maps for ownership silos, module health, onboarding
  targets, architecture communities, execution flows, and blast radius.
- Updated README, package docs, website docs, and hosted viewer assets for the
  new hook and viewer intelligence surfaces.

## v1.1.25 - 2026-05-12

- Rebuilt the website into a darker product/docs surface with clearer install,
  CLI, MCP, memory, graph, review, and troubleshooting documentation.
- Added release and viewer navigation so the GitHub Pages site, docs, releases,
  and graph viewer link back to each other cleanly.
- Fixed generated branch change-memory validation so separate branch summaries
  no longer warn as duplicates of each other while normal duplicate checks stay
  active.

## v1.1.23 - 2026-05-10

- Rewrote the root README as a shorter user-first guide focused on value,
  quick start, daily workflow, storage model, viewer, performance, trust, and
  development.
- Rewrote the npm package README to remove release-note clutter and make the
  installed package page useful for setup and day-to-day commands.
- Kept the README performance proof current with the refreshed Kage-on-Kage
  memory and code graph metrics.

## v1.1.22 - 2026-05-09

- Fixed the viewer inspector so selecting high-degree nodes cannot expand the
  page and push the canvas out of view.
- Added bounded internal scrolling for selected-node details, connected
  relations, and memory-code evidence groups.
- Capped long detail rows and relation summaries so the graph console remains
  stable while users inspect dense nodes.

## v1.1.21 - 2026-05-09

- Fixed memory-code graph quality by requiring explicit, non-generic symbol and
  test mentions before creating precise memory-code edges.
- Capped per-packet symbol/test links so broad repo memories cannot explode into
  unreadable file hubs in the viewer.
- Fixed viewer graph canonicalization so stale memory symbol/test path aliases
  do not silently collapse onto code file nodes.
- Kept path-level memory visible through capped `affects_code_path` bridge
  edges while making the `Memory <-> Code only` view show actual cross-graph
  links.

## v1.1.20 - 2026-05-08

- Added a persisted code graph stat fingerprint so repeated `kage refresh`
  calls on unchanged large repos can reuse the existing code graph without
  rereading and rehashing all selected source files.
- Added `kage refresh --full` and MCP `kage_refresh` `full: true` for explicit
  clean rebuilds when maintainers want to bypass unchanged-graph reuse.
- Changed `kage code-index` and MCP `kage_code_index` to prefer SCIP via
  `scip-typescript` plus the `scip` CLI when available, falling back to the
  built-in LSP-compatible symbol index when external tools are not installed.
- Kept the content-hash rebuild path for changed files and missing/stale graph
  artifacts.

## v1.1.18 - 2026-05-08

- Made user-facing indexing and recall paths faster by reusing current graph
  artifacts for read-only commands instead of rebuilding and rewriting them.
- Added in-process graph reuse for MCP sessions, lightweight refresh metrics,
  per-file code fact caching, bounded quick indexing, and packet-only init so
  Kage does not block first use on larger repos.
- Changed recall graph scoring to build lookup maps once per query instead of
  scanning all graph entities and edges for every memory packet.
- Updated the viewer to hide unreadable raw full-graph scopes and show capped
  memory-code evidence in the inspector.

## v1.1.17 - 2026-05-06

- Changed PR graph freshness from commit-HEAD matching to content/input
  fingerprints so push-only operations and empty/same-tree commits do not force
  another refresh.
- Added regression coverage for same-tree commits passing and real source
  edits staling generated graph artifacts.
- Updated agent policy, README, package docs, and website copy to describe
  refresh as content-change driven.

## v1.1.16 - 2026-05-06

- Added retry/backoff to the guarded npm release helper's exact-version
  registry verification so successful publishes are not reported as failed
  during npm registry propagation.
- Kept the release helper as source-repo maintainer tooling by removing public
  npm release scripts from package metadata and excluding `dist/release.js` from
  the published tarball.

## v1.1.15 - 2026-05-06

- Added a guarded npm release helper with remote preflight, non-interactive git
  environment, package tests, pack dry-run, optional branch push, npm publish,
  registry verification, and smoke install.
- Fixed `kage propose --from-diff` so repo memory packet-only changes under
  `.agent_memory/packets/*.json` and `.agent_memory/pending/*.json` are included
  in branch review summaries instead of being filtered as generated noise.
- Added regression coverage for the release workflow and memory-only/mixed
  tracked-untracked diff proposals, bringing the package suite to 83 passing
  tests.

## v1.1.14 - 2026-05-06

- Added BM25 lexical recall ranking with intent-aware runbook/gotcha/decision
  boosts while keeping graph, path/type/tag, freshness, quality, and feedback
  signals in the final score.
- Added graph registry, audit, inbox, and code-index documentation and release
  proof for the Kage MCP package.
- Updated the viewer to coalesce memory graph code entities with source-derived
  code graph nodes and highlight memory-code links.
- Updated the root README and website to show the current 79-test proof state,
  current Kage-on-Kage graph metrics, and BM25 retrieval wording.

## v1.1.13 - 2026-05-03

- Switched future Kage releases from MIT to GPL-3.0-only.
- Added the official GPLv3 license text as `LICENSE`.
- Updated README and npm package metadata to clarify the GPL license.
- Note: older versions already published under MIT remain available under the
  terms they were originally published with.

## v1.1.12 - 2026-05-03

- Added explicit npm release notes to the package README.
- Updated the root README hero to use the animated demo GIF.
- Added clear website and live viewer links near the top of the README.
- Verified hosted GitHub Pages viewer publishes Kage repo memory graph, code
  graph, and metrics as static data.

## v1.1.11 - 2026-05-03

- Published hosted viewer repo graph data on GitHub Pages.
- Pages now builds Kage in CI, refreshes repo memory/code graph artifacts, and
  writes metrics before publishing the static viewer.
- Published `@kage-core/kage-graph-mcp@1.1.11`.

## v1.1.0 - 2026-05-02

- Added cross-agent launch flow: Codex can create reviewed repo memory that Claude Code and other MCP agents can recall.
- Added Claude Code `kage setup claude-code --write` support with safe MCP config merge.
- Changed `kage propose --from-diff` to create both branch review summaries and pending change-memory packets.
- Refreshed README, demo GIF, and ship-readiness docs around the repo hive memory wedge.
- Verified package smoke path with build, tests, npm pack dry run, Codex setup, Claude Code setup, generic MCP setup, and recall.

## v1.0.0

- Initial local-first Kage MCP package with repo memory packets, recall, graph indexing, code graph, review gates, metrics, daemon, and setup helpers.## 2.0.1

- `kage scan` doc-lie checks are fence-aware: paths quoted inside code fences are sample output, not claims; `npm run`/CLI claims still verified inside shell-typed fences.
- npm package declares `mcpName: com.kage-core/kage` for the official MCP registry.


