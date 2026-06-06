# Outreach: newsletters + registries

## Newsletter pitch (short, paste into email/DM)

Subject: Kage — shared, code-grounded memory for coding agents (open source)

Hi [name],

Quick one for [newsletter]: I built **Kage**, an open-source MCP memory layer for
coding agents. Unlike a personal vector store, the memory is shared across a team
and grounded in the actual code — stored as JSON in the repo, reviewed in PRs — so
a team and its agents stop rediscovering the same things. Hallucinated/stale memory
never reaches the agent.

30-sec demo (no install): npx -y @kage-core/kage-graph-mcp demo
Live viewer: https://kage-core.com/viewer
Repo: https://github.com/kage-core/Kage

Happy to give your readers a deeper write-up if useful. Thanks!
— Kushal

Targets: Ben's Bites, AlphaSignal, TLDR AI, Latent Space, the MCP/agents roundups.

## Registry / directory checklist
- [x] punkpeye/awesome-mcp-servers — PR #7480 (live; accepts community PRs)
- [~] wong2/awesome-mcp-servers — N/A: generated/synced list, issues off, no community PRs accepted
- [~] appcypher/awesome-mcp-servers — N/A: same (issues off, zero merged PRs)
- [ ] awesome-claude-code (45.8k★) — submit via WEB ISSUE FORM ONLY (CLI/PR = ban risk; must be human-submitted). Category: Tooling. Draft below.
- [x] mcp.so — submitted (signed in via Google; "update project success", pending their moderation)
- [x] glama.ai — submitted via "Add MCP Server" (signed in w/ Google; "submitted for review")
- [~] smithery.ai — N/A: publish flow requires an HTTP-accessible MCP server URL; Kage is a
      local stdio server (npx) that needs repo filesystem/git access to be useful, so it doesn't
      fit Smithery's hosted-gateway model. Signed in (Google) but did not submit a fake endpoint.
- [ ] Product Hunt — schedule (assets ready)

### awesome-claude-code submission (paste into the issue form at
### github.com/hesreallyhim/awesome-claude-code/issues/new?template=recommend-resource.yml)
- Display Name: Kage
- Category: Tooling
- Primary Link: https://github.com/kage-core/Kage
- Author: kage-core
- License: GPL-3.0
- Description: Shared, code-grounded memory for Claude Code and your team. Capture a
  learning once (bug cause, decision, gotcha) and every future session recalls it.
  Memory is grounded in your actual code and stored as git-tracked JSON reviewed in
  PRs; citations are validated on write and stale notes are withheld from recall, so
  the agent never gets fed drift. Validate: `npx -y @kage-core/kage-graph-mcp demo`.

Keep it tasteful: one quality submission per surface, correct category, accurate
description. Don't bulk-spam identical PRs in minutes — maintainers (and you) lose.
