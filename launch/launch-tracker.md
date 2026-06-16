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

## YC "first 100 customers" playbook → Kage (from @fin465 thread)

| # | Step | Kage status / action |
|---|---|---|
| 1 | **Launch-max** (PH, HN, devhunt, betalist, peerlist, indie hackers; launch 3×) | Directories: mcp.so ✅, Glama ✅. **Show HN drafted & ready** ([show-hn.md](./show-hn.md)) — fire at a US-morning window (Tue–Thu ~8–10am ET) and man the comments for 2h. PH draft ([product-hunt.md](./product-hunt.md)). devhunt/betalist/peerlist/indiehackers = your accounts. |
| 2 | **Get listed where the category is listed** | Target placements below. Distribution only — no competitor framing in copy. |
| 3 | **Warm outbound** (scrape engagers, filter to ICP, DM) | Needs your LinkedIn/X + tooling. ICP: small eng teams on Claude Code/Cursor; OSS dev-tool maintainers. |
| 4 | **20–30 UGC creators** ($15–30/video + perf) | Needs budget + your call. Niche: dev-tooling / AI-coding creators. |
| 5 | **Build in public — video > text; show use-cases** | Have assets (kage-viewer.gif, kage-demo.gif). Browser upload tool can't attach repo files — record a short Loom/screen-cap of `kage scan` + `kage demo` and post natively. |
| 6 | **Go where customers spend time** (slack/discord/newsletters/podcasts) | Target list below. |
| 7 | **Ride a weekly X trend, fold Kage in** | Ongoing; pick the relevant AI-coding trend each week. |

### Step 2 — placement targets (get Kage listed)
- Official MCP Registry (linchpin), Smithery, Glama ✅, mcp.so ✅, PulseMCP (via registry), mcp.directory, Cursor MCP directory, Cline marketplace, Continue hub
- "Awesome" GitHub lists: awesome-mcp-servers (punkpeye), awesome-claude-code, awesome-ai-coding
- Listicles/SEO: "best AI agent memory", "Claude Code memory", "MCP memory server" round-ups — request inclusion

### Step 6 — where Kage's users are
- **Discords/Slacks:** MCP community, Cursor, Cline, Aider, Claude developers, r/LocalLLaMA-adjacent servers
- **Newsletters:** TLDR AI, Ben's Bites, AlphaSignal, Latent Space (pitch template in [outreach.md](./outreach.md))
- **Podcasts/accounts:** Latent Space, AI-coding YouTubers; engage, offer a `kage scan` of their repo

## Video asset (new)
- **`docs/assets/kage-viewer-walkthrough.gif`** (2.7MB, 1512×793) — clean screen-recording of the live Kage viewer on this repo's real data: memory↔code map → dashboard (190 packets) → Trust (99/100, stale excluded 100%) → Gains (1.4M tokens saved). No watermark/overlays. Use as README hero, on X/LinkedIn, in listings.
- ⚠️ I can't upload this to X via the browser tool (it only attaches files you've shared with the session). Post it manually, or I can wire it into the README hero on request.
- For a narrated launch video, a 60-sec Loom over `kage scan` + this viewer is still the gold standard (your record).

## What needs you (can't be automated)
- **Official MCP Registry publish** (`mcp-publisher login github` + `publish`) — unlocks PulseMCP and other ingesters. Highest remaining leverage.
- **Glama** — create/sign-in account, then claim the auto-indexed listing.
- **Reddit** (r/mcp, r/ClaudeAI) — blocked for the browser tool; post manually from comparison-posts.md.
- **Show HN / Product Hunt** — your accounts; drafts in launch/.

## Already done (earlier this session, GitHub-native)
- GitHub Discussions seeded: #93 (welcome), #94 (gains receipts), #95 (scorecard show-and-tell)
- Good-first-issues: #88–92
- Discussions enabled on the repo
