# Changelog

## v1.1.0 - 2026-05-02

- Added cross-agent launch flow: Codex can create reviewed repo memory that Claude Code and other MCP agents can recall.
- Added Claude Code `kage setup claude-code --write` support with safe MCP config merge.
- Changed `kage propose --from-diff` to create both branch review summaries and pending change-memory packets.
- Refreshed README, demo GIF, and ship-readiness docs around the repo hive memory wedge.
- Verified package smoke path with build, tests, npm pack dry run, Codex setup, Claude Code setup, generic MCP setup, and recall.

## v1.0.0

- Initial local-first Kage MCP package with repo memory packets, recall, graph indexing, code graph, review gates, metrics, daemon, and setup helpers.
