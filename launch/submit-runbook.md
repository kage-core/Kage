# Directory submission runbook — top 3

Prioritized by leverage. Paste-ready copy lives in
[`directory-listings.md`](./directory-listings.md); this file is the *how to
actually submit*, in order. Each step is marked:

- ✅ **prepared** — artifact is in the repo, ready to go
- 🔑 **needs you** — requires a login / web form / org credential I can't do for you

> Cadence: do one per session, top to bottom. Don't batch — track status in the
> table in `directory-listings.md`.

---

## 1. Official MCP Registry (highest leverage — feeds many downstream directories)

The registry reads a `server.json` manifest and publishes via the `mcp-publisher`
CLI authenticated with your GitHub account.

- ✅ **prepared:** [`server.json`](../server.json) exists at the repo root
  (name `io.github.kage-core/kage`, npm package `@kage-core/kage-graph-mcp@2.3.0`,
  stdio transport).
- 🔑 **needs you:**
  ```bash
  # install the publisher (see github.com/modelcontextprotocol/registry for the latest)
  brew install mcp-publisher   # or: go install ...   (check the repo for current install)
  mcp-publisher login github   # opens GitHub OAuth — must be a kage-core admin
  mcp-publisher publish        # reads ./server.json
  ```
- ⚠️ **verify before publishing:** confirm the `$schema` URL and field names
  against the current schema at
  <https://github.com/modelcontextprotocol/registry> (the schema has versioned
  releases; `registryType`/`registryBaseUrl` casing changed historically). Run
  `mcp-publisher validate` if available.

Why first: many third-party directories (Glama, PulseMCP, others) ingest the
official registry, so one good listing here propagates.

## 2. Claude Code plugin marketplace (your direct-competitor's winning channel)

You already ship the marketplace manifest, so this is mostly *promotion*, not
submission.

- ✅ **prepared:** [`.claude-plugin/marketplace.json`](../.claude-plugin/marketplace.json)
  is in the repo. Anyone can already add it:
  ```
  /plugin marketplace add kage-core/Kage
  /plugin install kage@kage
  ```
- 🔑 **needs you:**
  - Put that two-line install in the README's first screenful and in every launch
    post (it's the single highest-intent CTA for Claude Code users).
  - If Anthropic maintains a curated/discoverable plugin directory or "awesome
    Claude Code plugins" list, open the listing/PR using the SHORT description
    from `directory-listings.md`. (Verify the current submission path — this
    ecosystem moves fast.)

## 3. Glama + PulseMCP (auto-indexers — claim & polish the listing)

These crawl GitHub/npm/the official registry, so a listing often *already exists
or will appear* once step 1 lands. The work is **claiming and polishing** it.

- ✅ **prepared:** SHORT/LONG descriptions, keyword tags, and category in
  [`directory-listings.md`](./directory-listings.md).
- 🔑 **needs you:**
  - **Glama** (<https://glama.ai/mcp/servers>): find the Kage entry (or submit the
    repo), claim it, paste the LONG description + tags, set category
    `developer-tools`.
  - **PulseMCP** (<https://www.pulsemcp.com>): same — locate/submit, then ensure
    the description and install command match the canonical copy.
  - Both rank partly on README quality and recent activity, so the README
    community section + fresh commits help here.

---

## What's done vs. what's on you

| Step | Artifact prepared | Action needed |
|---|---|---|
| MCP Registry | ✅ `server.json` | 🔑 `mcp-publisher login` + `publish` (kage-core admin) |
| Claude Code marketplace | ✅ `marketplace.json` | 🔑 promote the install line; PR to curated list if one exists |
| Glama / PulseMCP | ✅ listing copy | 🔑 claim + paste copy on each site |

I can't complete the 🔑 steps — they need your GitHub/site logins. But every
artifact they ask for is now in the repo, so each is a 5-minute copy-paste once
you're logged in.
