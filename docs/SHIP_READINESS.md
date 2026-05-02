# Kage Ship Readiness

This document maps the original Kage memory-harness design to the current repo
state. It separates the local-first product that can ship now from hosted org
and global systems that remain intentionally out of scope for local beta.

## Local-First Beta

| Area | Status | Notes |
|---|---:|---|
| Canonical memory packets | Ready | Approved JSON packets live in `.agent_memory/packets/`. |
| Pending capture | Ready | `kage_learn` and `kage_capture` create pending packets only. |
| Human review gate | Ready | `kage review-artifact` and `kage review` keep approval explicit. |
| Secret and PII scanner | Ready | Capture blocks common secrets, tokens, private URL credentials, private keys, and emails. |
| Legacy Markdown migration | Ready | Existing `.agent_memory/nodes/*.md` is migrated without deleting source files. |
| Repo indexes | Ready | Path, tag, type, catalog, and graph indexes are rebuildable. |
| Recall | Ready | Query ranking returns results and an agent-ready context block. |
| Hybrid recall explanations | Ready | `--explain --json` reports text, graph, path/type/tag, freshness, quality, feedback, vector placeholder, and final score. |
| Memory graph | Ready | Evidence-backed entities, edges, episodes, confidence, and branch/commit context. |
| Code graph | Ready | Source-derived files, symbols, imports, calls, routes, tests, packages, and graph JSON. |
| Multi-language indexing | Ready | JS/TS AST plus generic static extraction for common languages. |
| Tree-sitter/SCIP/LSP/LSIF ingestion | Ready | External artifact adapters enrich graph facts when present. |
| Metrics | Ready | Reports readiness, coverage, quality, evidence, validation, and estimated tokens saved. |
| Quality and benchmark reports | Ready | Reports useful-memory ratio, duplicate burden, evidence/path grounding, recall hit rate, rediscovery avoided, and tokens saved. |
| Codex MCP integration | Ready | Installer writes stdio MCP config and initializes repo memory. |
| All-agent setup matrix | Ready | `kage setup` prints MCP/REST setup for Codex, Claude Code, Cursor, Windsurf, Gemini CLI, OpenCode, Cline, Goose, Roo, Kilo, Claude Desktop, Aider, and generic MCP. |
| Optional local runtime | Ready | `kage daemon` serves REST observe/recall/distill/metrics/quality/benchmark on localhost while CLI/MCP continue without it. |
| Automatic observations | Ready | `kage observe`, `kage_observe`, and REST observe store privacy-scanned deduped session events locally. |
| Observation distillation | Ready | `kage distill` creates pending packets with observation-session source refs and review suggestions. |
| Ambient agent policy | Ready | `AGENTS.md` tells agents to recall, query, learn, and propose without manual prompts. |
| Branch review summaries | Ready | `kage propose --from-diff` writes non-recallable branch summaries. |
| Registry recommendations | Ready | Recommends docs, skills, and optional MCPs without auto-installing. |
| Public candidate export | Ready | Sanitized local bundles can be created, but nothing is published automatically. |
| Terminal graph viewer | Ready | Local viewer loads memory, code, and metrics graphs with search and inspection. |
| CI | Ready | GitHub Actions runs MCP install, build, and tests. |

## Open-Source Launch Checklist

- [x] Local install path for Codex.
- [x] MCP server and CLI binaries.
- [x] Human-gated memory review.
- [x] Local graph and code graph.
- [x] Metrics and token-savings estimate.
- [x] Quality and benchmark proof commands.
- [x] All-agent setup command.
- [x] Optional local daemon and REST observe/recall/distill API.
- [x] Observation capture and distillation into pending memory.
- [x] Safety model documented.
- [x] CI workflow.
- [x] README aligned with actual implementation.
- [ ] Publish `@kage-core/kage-graph-mcp` package version from a clean release
  environment.
- [ ] Add release screenshots or GIFs for recall, learning, metrics, and viewer.
- [ ] Run a clean machine install smoke test from the public installer.
- [ ] Tag a release and attach a short changelog.

## Hosted Platform

These pieces are not required for local beta. They are the path to org/global
Kage and need dedicated hosted infrastructure.

| Area | Status | Why not local-beta |
|---|---:|---|
| Org memory server | Designed | Needed only for cross-repo/private team memory beyond git. |
| Org upload protocol | Designed | Local public candidates and bundles exist; tenant upload needs hosted auth and audit logs. |
| Auth and tenant isolation | Designed | Requires hosted identities and scoped tokens. |
| Hosted review queue | Designed | Local review already works; hosted review needs org permissions. |
| Branch overlays server | Designed | Local branch summaries exist; hosted overlays require lifecycle management. |
| PR bot | Designed | Needs GitHub App permissions and webhook infrastructure. |
| Registry signing | Designed | Needs key management, revocation, and release pipeline. |
| Global CDN publish | Designed | Needs reviewed public packets, signing, immutable artifacts, and rollback. |
| Registry pack install automation | Designed | Local recommendations exist; automatic skill/MCP/doc installation requires trust prompts and sandbox policy. |
| Admin UI | Designed | Only needed after hosted org/global workflows exist. |
| Data export/deletion runbooks | Designed | Required for hosted customer data, not local files. |

See [ORG_GLOBAL_ROADMAP.md](ORG_GLOBAL_ROADMAP.md) and
[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for the hosted launch path.

## Ship Position

Kage is ready to present as:

> A local-first repo memory and code graph harness for coding agents, with MCP
> tools, optional REST runtime, git-shareable memory, human review, metrics,
> quality/benchmark proof, automatic observation capture, and a terminal graph
> viewer.

Kage should not yet be presented as:

> A fully hosted org memory server or public global CDN.
