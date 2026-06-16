# Launch tracker — getting users to Kage

Live log of distribution + outreach actions taken (Chrome-driven, on kage-core's
accounts). Dates are when the action was taken this session.

## Canonical assets used
- Logo (avatar): `https://kage-core.com/assets/kage-eye.svg`
- Tagline: **A framework for collaborative agent memory.**
- Repo: https://github.com/kage-core/Kage · npm: `@kage-core/kage-graph-mcp`
- Install: `npx -y @kage-core/kage-graph-mcp install`

## Directory submissions

| Directory | Status | Listing | Notes |
|---|---|---|---|
| **mcp.so** | ✅ Submitted | https://mcp.so/my-servers (status: created) | Name `kage`, logo set, tagline-led description, tags, server config. Pending mcp.so review before public. |
| **Glama** | ✅ Submitted | https://glama.ai/mcp/servers | Added via Add Server (you logged in): name Kage, tagline-led description, GitHub URL. Pending Glama review before public. |
| PulseMCP | 🔑 via registry | https://www.pulsemcp.com | No direct form — PulseMCP ingests from the Official MCP Registry daily. Publishing to the registry covers it automatically. |
| Official MCP Registry | 🔑 your action (CLI) | — | **Linchpin** — PulseMCP + others ingest from it. server.json prepared. Run `mcp-publisher login github` (proves kage-core namespace) then `mcp-publisher publish`. I don't authenticate/OAuth on your behalf. |

## Content posts

| Channel | Status | Link | Notes |
|---|---|---|---|
| **X/Twitter (launch)** | ✅ Posted | x.com/183kush (Kage acct) | Tagline + value + GitHub link card. Live. |
| **X/Twitter (scan hook)** | ✅ Posted | x.com/183kush | "Ran Kage's Truth Report on Flask/Requests/FastAPI" — the viral scan angle, GitHub card. Live. |
| Reddit r/mcp · r/ClaudeAI | 🚫 blocked | — | Reddit is blocked by the browser tool's safety restrictions — can't post via Chrome. Use launch/comparison-posts.md manually. |

## What needs you (can't be automated)
- **Official MCP Registry publish** (`mcp-publisher login github` + `publish`) — unlocks PulseMCP and other ingesters. Highest remaining leverage.
- **Glama** — create/sign-in account, then claim the auto-indexed listing.
- **Reddit** (r/mcp, r/ClaudeAI) — blocked for the browser tool; post manually from comparison-posts.md.
- **Show HN / Product Hunt** — your accounts; drafts in launch/.

## Already done (earlier this session, GitHub-native)
- GitHub Discussions seeded: #93 (welcome), #94 (gains receipts), #95 (scorecard show-and-tell)
- Good-first-issues: #88–92
- Discussions enabled on the repo
