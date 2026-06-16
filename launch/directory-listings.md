# Kage directory listings — paste-ready copy

Single source of truth for **copy-paste-ready listing copy** to submit Kage to every
relevant MCP directory and coding-agent plugin marketplace.

> **Why this exists (lever 1 of the growth plan).** Win distribution by being *present*,
> with consistent on-message copy, in every place developers discover coding-agent tools.
> Kage is a more capable memory layer than what's listed today but is nearly invisible
> there (6 stars, ~3,400 npm downloads/month). Showing up — with our own story — fixes that.
>
> **Strategy / status / channels live in [`distribution-plan.md`](./distribution-plan.md).**
> This file is the complement: the actual words to paste. Do not duplicate strategy here.

---

## Canonical facts (do not invent others)

| Field | Value |
|---|---|
| Name | **Kage** (always capitalized, never "kage memory" / "KAGE" / "Kage MCP") |
| npm package | `@kage-core/kage-graph-mcp` |
| Install | `npx -y @kage-core/kage-graph-mcp install` |
| Repo | https://github.com/kage-core/Kage |
| Website | https://kage-core.com |
| Docs | https://kage-core.com/guide.html |
| Viewer | https://kage-core.com/viewer/ |
| License | GPL-3.0-only |
| Runtime | Node 18+ · Zero dependencies · No account / API key / cloud |
| Category | `developer-tools` (primary) · `productivity` (secondary) |

**One-liner (the message — keep verbatim across channels):**
> Git-native, verified memory for coding agents — shared across your team through git,
> checked against the actual code so it never goes stale.

**Differentiators (pick from these; never overclaim):**
- Write-time hallucinated-citation rejection
- Recall-time stale-memory withholding
- Diff-time stale-catch (warns before the PR when your change breaks a memory)
- Memory reviewed in the same PR as code (plain JSON, no database)
- Cross-machine via your own git remote

**Works with:** Claude Code, Codex, Cursor, Windsurf, Gemini CLI, Cline, Goose,
Roo Code, Kilo Code, OpenCode, Aider, Claude Desktop, any MCP client.

**Keywords / tags:** `memory`, `mcp`, `trust`, `code-graph`, `agent`, `coding-agent`,
`team-memory`, `git-native`, `verified-memory`

---

## Reusable description variants

**TAGLINE (≤60 chars):**
> Git-native, verified memory for coding agents.

**SHORT (~160 chars):**
> Kage is git-native, verified memory for coding agents. Shared across your team through
> git, checked against the actual code so it never goes stale. No account, no cloud.

**LONG (~400 chars):**
> Kage gives your coding agents memory that survives the session and stays true. It is
> git-native: memory lives as plain JSON in your repo, reviewed in the same PR as the
> code and shared across your team through your own git remote — no database, no cloud,
> no API key. It rejects hallucinated citations at write time, withholds stale memory on
> recall, and warns you before the PR when a diff invalidates team knowledge. Node 18+,
> zero dependencies, works with any MCP client.

---

## Submission checklist

| Directory | URL | Submission method | Status |
|---|---|---|---|
| Claude Code plugin marketplace | https://github.com/kage-core/Kage (ships `.claude-plugin/marketplace.json`) | Already shippable via `/plugin marketplace add kage-core/Kage`; submit to anthropics/claude-code-marketplace catalog — **verify URL** | ☐ |
| Official MCP registry | https://github.com/modelcontextprotocol/registry | `mcp-publisher` CLI publish to registry.modelcontextprotocol.io | ☐ |
| Smithery | https://smithery.ai/new | Web submit (connect GitHub repo) | ☐ |
| Glama MCP directory | https://glama.ai/mcp/servers | Auto-indexes GitHub MCP repos; claim + verify ownership | ☐ |
| PulseMCP | https://www.pulsemcp.com/submit | Web submission form | ☐ |
| mcp.so | https://mcp.so/submit | Web submission form | ☐ |
| awesome-mcp-servers (punkpeye) | https://github.com/punkpeye/awesome-mcp-servers | GitHub PR — **already open (#7480)** | ☐ |
| mcpservers.org | https://mcpservers.org | GitHub PR / web submit — **verify method** | ☐ |
| Cursor MCP directory | https://docs.cursor.com/tools (directory.cursor.com) | Web/PR submit — **verify URL** | ☐ |
| Cline marketplace | https://github.com/cline/mcp-marketplace | GitHub issue/PR submission | ☐ |
| MCP.directory | https://mcp.directory | Web submission — **verify URL** | ☐ |
| Continue.dev hub | https://hub.continue.dev | Publish block (MCP) via Continue hub — **verify applicability** | ☐ |

Track status inline (☐ → ⏳ submitted → ✅ live). Keep this table the source of truth;
mirror high-level status into `distribution-plan.md` under "MCP registries / awesome-lists".

---
---

# Per-directory paste blocks

---

## 1. Claude Code plugin marketplace

**Note:** Kage already ships `.claude-plugin/marketplace.json`, so users can add it today.
Lead with the one-line install; submit the marketplace to Anthropic's public catalog
(**verify URL** — anthropics/claude-code-marketplace or the in-app discovery list).

**Install (user-facing — the headline command):**
```
/plugin marketplace add kage-core/Kage
/plugin install kage@kage
```
(Or via MCP directly: `npx -y @kage-core/kage-graph-mcp install`)

**1-line description (≤60 chars):**
> Git-native, verified memory for Claude Code.

**1-paragraph description:**
> Kage gives Claude Code memory that survives the session and stays true. Memory lives as
> plain JSON in your repo, reviewed in the same PR as the code and shared with your team
> through git — no database, no cloud, no API key. It rejects hallucinated citations at
> write time, withholds stale memory on recall, and warns you before the PR when a diff
> invalidates team knowledge. Includes the `/kage:scan` Truth Report and `/kage:gains`
> receipts. Add it with `/plugin marketplace add kage-core/Kage`.

**Keywords/tags:** `memory`, `mcp`, `trust`, `code-graph`, `agent`, `coding-agent`, `team-memory`, `git-native`
**Category:** developer-tools (productivity)

---

## 2. Official MCP registry (modelcontextprotocol/registry)

**Submission method:** Publish with the `mcp-publisher` CLI against
`registry.modelcontextprotocol.io`. Server name follows reverse-DNS:
`io.github.kage-core/kage-graph-mcp` (**verify exact namespace rules**).

**`server.json` (paste, adjust to current schema):**
```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-07-09/server.schema.json",
  "name": "io.github.kage-core/kage-graph-mcp",
  "description": "Git-native, verified memory for coding agents — shared across your team through git, checked against the actual code so it never goes stale.",
  "repository": {
    "url": "https://github.com/kage-core/Kage",
    "source": "github"
  },
  "version": "2.0.1",
  "packages": [
    {
      "registryType": "npm",
      "identifier": "@kage-core/kage-graph-mcp",
      "version": "2.0.1",
      "transport": { "type": "stdio" }
    }
  ]
}
```

**1-line description:**
> Git-native, verified memory for coding agents.

**Install:** `npx -y @kage-core/kage-graph-mcp install`
**Keywords/tags:** `memory`, `mcp`, `code-graph`, `agent`, `git-native`, `verified-memory`
**Category:** developer-tools

---

## 3. Smithery (smithery.ai)

**Submission method:** https://smithery.ai/new — connect the GitHub repo; Smithery builds
from the repo. Ensure a `smithery.yaml` exists if required (**verify**).

**1-line description (≤60 chars):**
> Git-native, verified memory for coding agents.

**1-paragraph description:**
> Kage is git-native, verified memory for coding agents. Memory lives as plain JSON in
> your repo, reviewed in the same PR as the code and shared with your team through git —
> no database, no cloud, no API key. Kage rejects hallucinated citations at write time,
> withholds stale memory on recall, and warns you before the PR when a diff invalidates
> team knowledge. Node 18+, zero dependencies, works with any MCP client.

**Install:** `npx -y @kage-core/kage-graph-mcp install`
**Keywords/tags:** `memory`, `mcp`, `trust`, `code-graph`, `agent`, `coding-agent`, `team-memory`, `git-native`, `verified-memory`
**Category:** developer-tools

---

## 4. Glama MCP directory (glama.ai/mcp)

**Submission method:** Glama auto-indexes public GitHub MCP repos. Find the Kage entry,
**claim it**, and verify ownership to control the listing copy + badges.

**1-line description (≤60 chars):**
> Git-native, verified memory for coding agents.

**1-paragraph description:**
> Kage gives coding agents memory that survives the session and stays true. It is
> git-native — memory lives as plain JSON in your repo, reviewed in the same PR as the
> code and shared across your team through your own git remote. Kage rejects hallucinated
> citations at write time, withholds stale memory on recall, and warns you before the PR
> when a diff invalidates team knowledge. No account, no cloud, no API key. Node 18+,
> zero dependencies, works with any MCP client.

**Install:** `npx -y @kage-core/kage-graph-mcp install`
**Keywords/tags:** `memory`, `mcp`, `trust`, `code-graph`, `agent`, `coding-agent`, `team-memory`, `git-native`, `verified-memory`
**Category:** developer-tools

---

## 5. PulseMCP (pulsemcp.com)

**Submission method:** https://www.pulsemcp.com/submit (web form). **Verify URL.**

**1-line description (≤60 chars):**
> Git-native, verified memory for coding agents.

**1-paragraph description:**
> Kage is git-native, verified memory for coding agents — shared across your team through
> git and checked against the actual code so it never goes stale. Memory is plain JSON in
> your repo, reviewed in the same PR as the code: no database, no cloud, no API key. It
> rejects hallucinated citations at write time, withholds stale memory on recall, and
> warns you before the PR when a diff invalidates team knowledge. Works with Claude Code,
> Cursor, Windsurf, Codex, Cline, Aider and any MCP client.

**Install:** `npx -y @kage-core/kage-graph-mcp install`
**Keywords/tags:** `memory`, `mcp`, `trust`, `code-graph`, `agent`, `coding-agent`, `team-memory`, `git-native`, `verified-memory`
**Category:** developer-tools

---

## 6. mcp.so

**Submission method:** https://mcp.so/submit (web form). **Verify URL.**

**1-line description (≤60 chars):**
> Git-native, verified memory for coding agents.

**1-paragraph description:**
> Kage gives your coding agents memory that survives the session and stays true. Memory
> lives as plain JSON in your repo, reviewed in the same PR as the code and shared with
> your team through git — no database, no cloud, no API key. Kage rejects hallucinated
> citations at write time, withholds stale memory on recall, and warns you before the PR
> when a diff invalidates team knowledge. Node 18+, zero dependencies, any MCP client.

**Install:** `npx -y @kage-core/kage-graph-mcp install`
**Keywords/tags:** `memory`, `mcp`, `trust`, `code-graph`, `agent`, `coding-agent`, `team-memory`, `git-native`, `verified-memory`
**Category:** developer-tools

---

## 7. mcpservers.org / awesome-mcp-servers (punkpeye) — GitHub PR

**Submission method:** PR to https://github.com/punkpeye/awesome-mcp-servers
(**already open: #7480**). Same entry works for mcpservers.org. Add under a memory /
knowledge category. One tasteful entry — no bulk listing.

**README list line (paste — match the file's existing format):**
```markdown
- [kage-core/Kage](https://github.com/kage-core/Kage) 🏎️ 🏠 - Git-native, verified memory for coding agents — shared across your team through git, checked against the actual code so it never goes stale.
```
> Legend per that repo: 🏎️ = TypeScript/Node, 🏠 = local service. **Verify the legend
> icons against the current README before submitting.**

**1-line description (≤60 chars):**
> Git-native, verified memory for coding agents.

**Keywords/tags:** `memory`, `mcp`, `code-graph`, `agent`, `git-native`, `verified-memory`
**Category:** developer-tools

---

## 8. Cursor MCP directory / docs.cursor.com

**Submission method:** Cursor MCP directory (directory.cursor.com) + docs.cursor.com
tools listing. **Verify URL / submission method** (PR vs. form).

**1-line description (≤60 chars):**
> Git-native, verified memory for Cursor.

**1-paragraph description:**
> Kage gives Cursor memory that survives the session and stays true. Memory lives as
> plain JSON in your repo, reviewed in the same PR as the code and shared with your team
> through git — no database, no cloud, no API key. Kage rejects hallucinated citations at
> write time, withholds stale memory on recall, and warns you before the PR when a diff
> invalidates team knowledge. Add it as an MCP server with one command.

**Install / config:** `npx -y @kage-core/kage-graph-mcp install`
(Cursor `mcp.json` entry — command `npx`, args `-y @kage-core/kage-graph-mcp`, **verify schema**)
**Keywords/tags:** `memory`, `mcp`, `trust`, `code-graph`, `agent`, `coding-agent`, `team-memory`, `git-native`, `verified-memory`
**Category:** developer-tools

---

## 9. Cline marketplace

**Submission method:** GitHub issue/PR to https://github.com/cline/mcp-marketplace
(submit repo URL + logo + description per their template). **Verify template fields.**

**1-line description (≤60 chars):**
> Git-native, verified memory for Cline.

**1-paragraph description:**
> Kage is git-native, verified memory for coding agents like Cline. Memory lives as plain
> JSON in your repo, reviewed in the same PR as the code and shared with your team through
> git — no database, no cloud, no API key. It rejects hallucinated citations at write
> time, withholds stale memory on recall, and warns you before the PR when a diff
> invalidates team knowledge. Node 18+, zero dependencies, any MCP client.

**Install:** `npx -y @kage-core/kage-graph-mcp install`
**Keywords/tags:** `memory`, `mcp`, `trust`, `code-graph`, `agent`, `coding-agent`, `team-memory`, `git-native`, `verified-memory`
**Category:** developer-tools

---

## 10. MCP.directory

**Submission method:** https://mcp.directory (web submission). **Verify URL.**

**1-line description (≤60 chars):**
> Git-native, verified memory for coding agents.

**1-paragraph description:**
> Kage gives coding agents memory that survives the session and stays true — git-native,
> shared across your team through git, and checked against the actual code so it never
> goes stale. Memory is plain JSON in your repo, reviewed in the same PR as the code: no
> database, no cloud, no API key. Rejects hallucinated citations at write time, withholds
> stale memory on recall, and catches diffs that invalidate team knowledge before the PR.

**Install:** `npx -y @kage-core/kage-graph-mcp install`
**Keywords/tags:** `memory`, `mcp`, `trust`, `code-graph`, `agent`, `coding-agent`, `team-memory`, `git-native`, `verified-memory`
**Category:** developer-tools

---

## 11. Continue.dev hub

**Submission method:** Publish an MCP block on https://hub.continue.dev (sign in,
create block, type = MCP server). **Verify applicability** — only list if Kage runs
cleanly inside Continue's MCP block model.

**1-line description (≤60 chars):**
> Git-native, verified memory for coding agents.

**1-paragraph description:**
> Kage is git-native, verified memory for coding agents. Memory lives as plain JSON in
> your repo, reviewed in the same PR as the code and shared with your team through git —
> no database, no cloud, no API key. It rejects hallucinated citations at write time,
> withholds stale memory on recall, and warns you before the PR when a diff invalidates
> team knowledge. Works with any MCP client, including Continue.

**Install:** `npx -y @kage-core/kage-graph-mcp install`
**Keywords/tags:** `memory`, `mcp`, `code-graph`, `agent`, `git-native`, `verified-memory`
**Category:** developer-tools

---

> **Product Hunt:** intentionally **skipped here** — covered separately in
> [`product-hunt.md`](./product-hunt.md).

---
---

## Naming & consistency rules

1. **Always "Kage"** — capital K, lowercase rest. Never "kage", "KAGE", "Kage MCP",
   "Kage Memory", or "kage-graph-mcp" as the product name. The npm package is
   `@kage-core/kage-graph-mcp`; the *product* is Kage.
2. **Always the same install command:** `npx -y @kage-core/kage-graph-mcp install`
   (for Claude Code marketplace, also offer `/plugin marketplace add kage-core/Kage`).
3. **Always link the repo:** https://github.com/kage-core/Kage. Add website
   (https://kage-core.com), docs (https://kage-core.com/guide.html), and viewer
   (https://kage-core.com/viewer/) where a directory allows extra links.
4. **Lead with the one-liner** verbatim where a single sentence is needed.
5. **Pick differentiators from the canonical list only** — never invent new claims or
   metrics. License is **GPL-3.0-only**; runtime is **Node 18+**, **zero dependencies**,
   **no account / API key / cloud**.
6. **Keep keyword tags consistent:** `memory`, `mcp`, `trust`, `code-graph`, `agent`,
   `coding-agent`, `team-memory`, `git-native`, `verified-memory` (trim to the
   directory's max if needed, keeping `memory` + `mcp` first).
7. **Category:** `developer-tools` primary, `productivity` secondary.

---

## Cadence

- **Submit 2–3 directories per week**, not all at once — steady, genuine presence beats a
  burst (and avoids spam-flag patterns).
- **Update the checklist table** on every submission: ☐ → ⏳ submitted → ✅ live.
- After each batch, mirror progress into `distribution-plan.md` ("MCP registries /
  awesome-lists" section) so strategy and execution stay in sync.
- Re-verify any line marked **"verify URL" / "verify method"** before submitting — these
  directories change their intake flow often.
- When a listing goes live, capture the public URL next to its row for future edits.
