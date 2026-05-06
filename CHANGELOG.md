# Changelog

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
