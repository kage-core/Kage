# Changelog

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

- Initial local-first Kage MCP package with repo memory packets, recall, graph indexing, code graph, review gates, metrics, daemon, and setup helpers.
