# Kage Customer Readiness

This is the customer-facing launch guide for Kage's local-first beta. It keeps
the marketing sharp while staying honest about what ships today.

## Positioning

Kage makes coding agents remember a repo.

It gives Codex, Claude Code, Cursor, Windsurf, and other MCP-compatible agents a
shared repo memory, source-derived code graph, and human-reviewed knowledge base
that survives across sessions and teammates.

The short pitch:

> Stop paying the rediscovery tax. Install Kage once, and every future coding
> agent starts with repo context, code flow, runbooks, decisions, gotchas, and
> reviewable team memory.

## Target Customers

Best early customers:

- Teams already using Codex, Claude Code, Cursor, or multiple coding agents.
- Repos with recurring setup, debug, or test rediscovery.
- Teams where agents repeat old mistakes across sessions.
- Platform, infra, devtools, AI tooling, fintech, SaaS, and internal developer
  productivity teams.
- Companies that need local-first or git-native memory before hosted memory.

Less ideal right now:

- Teams expecting a fully hosted admin console on day one.
- Teams that want automatic public sharing or automatic MCP/skill installs.
- Non-technical users who do not want CLI/MCP setup.

## Pain Kage Solves

Without Kage:

- Each agent session has to rediscover repo structure.
- Useful learnings disappear into chat transcripts.
- Team conventions and decisions are scattered across docs, PRs, Slack, and
  memory.
- Agents waste tokens rereading broad file context.
- Agent memory is siloed by vendor and not portable.

With Kage:

- Repo setup, runbooks, gotchas, and decisions become reviewed memory packets.
- Code graph answers source-flow questions from files, symbols, imports, calls,
  tests, routes, and package scripts.
- Future agents can recall concise, source-backed context instead of scanning
  everything again.
- Approved memory is git-shareable across a team.
- Org/global/marketplace flows exist as local, review-gated artifacts.

## What Ships Today

- CLI and MCP server.
- Codex one-command setup.
- Setup snippets for common MCP clients and agents.
- Repo-local reviewed memory packets.
- Pending memory review queue.
- Memory admission gate to block junk session telemetry.
- Code graph and memory graph.
- Multi-language static indexing plus Tree-sitter/SCIP/LSP/LSIF artifact
  ingestion.
- Recall, graph query, code graph query, quality metrics, benchmark metrics.
- Optional local daemon with REST observe/recall/distill endpoints.
- Local terminal-style viewer.
- Local org-memory artifact mode.
- Static global/CDN bundle generation.
- Marketplace manifest for docs, skills, and MCP pack recommendations.

## What Not To Claim Yet

Do not claim:

- Fully hosted org memory server.
- Production SaaS tenant isolation.
- Real public CDN publishing.
- Automatic install of marketplace skills or MCPs.
- Guaranteed autonomous agent behavior in every agent product.
- Measured production token savings across customer workloads.

Safe wording:

- "Local-first beta."
- "Estimated token savings."
- "Human-reviewed memory."
- "Local org/global artifact mode."
- "Hosted sync and public CDN are roadmap extensions."

## Customer Demo Script

Use a real repo or a clean demo repo.

1. Install:

```bash
curl -fsSL https://raw.githubusercontent.com/kage-core/Kage/master/codex-setup.sh | bash
```

2. Initialize:

```bash
kage init --project /path/to/repo
```

3. Show recall:

```bash
kage recall "how do I run tests" --project /path/to/repo
```

4. Show source flow:

```bash
kage code-graph "routes tests auth" --project /path/to/repo
```

5. Show proof metrics:

```bash
kage metrics --project /path/to/repo
kage quality --project /path/to/repo
kage benchmark --project /path/to/repo
```

6. Capture a durable learning:

```bash
kage learn --project /path/to/repo \
  --learning "Gotcha: when changing billing webhooks, run npm run test:webhooks because the normal test suite does not replay webhook fixtures." \
  --paths src/billing/webhooks.ts,test/webhooks.test.ts
```

7. Show review:

```bash
kage review-artifact --project /path/to/repo
kage review --project /path/to/repo
```

8. Show viewer:

```bash
kage viewer --project /path/to/repo
```

9. Show team/org/global path:

```bash
kage org upload --project /path/to/repo --org acme --packet <approved-packet-id>
kage org status --project /path/to/repo --org acme
kage marketplace --project /path/to/repo
kage global build --project /path/to/repo --org acme
```

## Proof Metrics To Show

Use these from `kage metrics`, `kage quality`, and `kage benchmark`:

- indexed files
- symbols
- imports
- calls
- tests
- evidence coverage
- useful memory ratio
- duplicate burden
- recall hit rate
- estimated rediscovery avoided
- estimated tokens saved per recall
- readiness score

Explain token savings honestly:

> Kage estimates savings by comparing indexed source and memory size against the
> compact recall context it returns. Production telemetry benchmarks are the
> next step for measured savings.

## Customer Onboarding Flow

1. Pick one repo with real rediscovery pain.
2. Install Kage for Codex or the customer's agent.
3. Run `kage init`.
4. Run three recall questions the team commonly asks.
5. Run one real coding task and capture one learning.
6. Review and approve one packet.
7. Commit `.agent_memory/packets/` and `AGENTS.md`.
8. Have a second teammate or second agent session recall the approved learning.
9. Collect before/after metrics and qualitative feedback.

Success criteria for a beta customer:

- Agent finds test/run/setup workflow without manual repo scanning.
- Agent finds relevant source flow from code graph.
- At least one real gotcha/runbook/decision is captured and approved.
- Second session recalls the approved memory.
- Team agrees the memory should live with the repo.

## Pricing And Packaging Hypothesis

Open-source:

- local CLI/MCP
- repo memory packets
- code graph
- local viewer
- local org/global artifacts

Paid hosted platform later:

- hosted org memory sync
- hosted review queues
- team analytics
- audit logs
- PR bot
- signed registry/CDN
- admin controls
- managed marketplace packs

## Known Beta Gaps

- Viewer can inspect review queue but approval is still CLI-first.
- Ambient behavior depends on each agent respecting repo policy or MCP hooks.
- Daemon exists, but live session replay/console is still basic.
- Token savings are estimated, not production-measured telemetry.
- Org/global are local artifact modes, not hosted services.
- No automatic public publishing or marketplace installation.

## Support Runbook

Ask customers for:

- repo language/framework
- agent/client used
- install method
- `kage doctor --project <repo>` output
- `kage validate --project <repo>` output
- one recall query that failed
- whether `.agent_memory/packets/` has approved packets
- whether `AGENTS.md` is installed

First fixes:

- rerun `kage index --project <repo>`
- run `kage setup doctor --project <repo>`
- run `kage recall "<query>" --project <repo> --explain --json`
- check pending packets with `kage review-artifact --project <repo>`
- start viewer with `kage viewer --project <repo>`

## Launch Claim

Use this as the public claim:

> Kage is a local-first memory and code graph harness for coding agents. It
> turns repo knowledge, agent learnings, code flow, runbooks, decisions, and
> gotchas into reviewed memory that future agents can recall across sessions
> and teammates.
