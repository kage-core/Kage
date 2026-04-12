---
name: kage
description: Manage the Kage v2 agent memory system. Subcommands: review (approve/reject pending nodes), prune (deprecate old nodes), digest (regenerate SUMMARY.md), add (install a memory pack), publish (create a shareable pack), search (find community packs).
allowed-tools: Read, Write, Glob, Grep, Bash
---

You are managing the **Kage v2** agent memory system. Parse the user's subcommand from `$ARGUMENTS` and execute it.

---

## `/kage review`

Review pending memory nodes awaiting human approval.

1. Find all pending nodes:
   - Glob `.agent_memory/pending/*.md` (project tier)
   - Bash `ls $HOME/.agent_memory/pending/*.md 2>/dev/null` (personal tier — use Bash, not Glob, because Glob does not expand `~` or `$HOME`)

2. If none found: "No pending nodes to review."

3. For each pending node, display:
   ```
   ─────────────────────────────────────────
   [N/TOTAL] PENDING NODE
   Title:    <title>
   Category: <category>
   Tags:     <tags>
   Paths:    <paths>
   Tier:     project | personal
   File:     <path>

   <full markdown body>
   ─────────────────────────────────────────
   (a) approve  (r) reject  (e) edit  (s) skip  (q) quit
   ```

4. Wait for user input. On each choice:

   **Approve:**
   - Move file from `pending/` to `nodes/`
   - Remove `pending: true` from frontmatter
   - For each path in `paths` frontmatter (comma-separated):
     - Check if `{tier}/.agent_memory/{path}/index.md` exists; create if not
     - Append a link: `- [Title](../../nodes/filename.md)` to the domain index
   - Confirm: "✓ Saved: [title]"

   **Reject:**
   - Delete the pending file
   - Confirm: "✗ Rejected: [title]"

   **Edit:**
   - Show the current content
   - Ask user what to change; apply the edit inline
   - Re-display the node and ask approve/reject/skip

   **Skip:**
   - Leave in pending, move to next node

   **Quit:**
   - Stop processing; report how many approved/rejected/skipped

5. After all nodes: "Review complete. Approved: N, Rejected: N, Skipped: N"
   - Offer: "Would you like to commit these memory updates? (y/n)"
   - If yes: suggest `git add .agent_memory/ && git commit -m "kage: add N memory nodes"`

---

## `/kage prune`

Deprecate old or outdated memory nodes.

1. List all approved nodes:
   - Glob `.agent_memory/nodes/*.md` (project tier)
   - Bash `ls $HOME/.agent_memory/nodes/*.md 2>/dev/null` (personal tier — Bash required, Glob does not expand `~`)
   ```
   [1] Title — category — date (project)
   [2] Title — category — date (personal)
   ...
   ```

2. Ask: "Enter node number to deprecate, or 'q' to quit:"

3. On selection:
   - Move file to `deprecated/` directory (create if needed)
   - Add `deprecated: true` and `deprecated_date: YYYY-MM-DD` to frontmatter
   - Remove all `[Title](...)` links to this file from all `index.md` files in its tier
   - Confirm: "Deprecated: [title]"

4. Ask if they want to deprecate another.

---

## `/kage digest`

Regenerate `SUMMARY.md` compact overview at each tier.

1. Scan all approved nodes in `.agent_memory/nodes/` (project tier)
2. Group by category. For each node: one-line entry with title, tags, date
3. Write `.agent_memory/SUMMARY.md`:
   ```markdown
   # Memory Summary
   *Last updated: YYYY-MM-DD | N nodes*

   ## repo_context
   - **[Title]** `tags` — _date_
   ...

   ## architecture
   ...
   ```

4. Do the same for personal tier: Bash `ls $HOME/.agent_memory/nodes/*.md 2>/dev/null` — if nodes exist, regenerate `$HOME/.agent_memory/SUMMARY.md`. (Use Bash, not Glob, for `$HOME` paths.)

5. Report token estimate: "SUMMARY.md is approximately N lines (~X tokens)"

---

## `/kage add <org/repo-or-url>`

Install a community memory pack.

1. Parse the argument — accept:
   - `org/repo` → treated as `https://github.com/org/repo`
   - Full git URL

2. Determine pack slug from repo name (last path segment)

3. Check `~/.agent_memory/packs/<slug>/` — if exists: "Pack already installed. Run `/kage update <slug>` to update."

4. Clone: `git clone <url> ~/.agent_memory/packs/<slug>/`

5. Read `~/.agent_memory/packs/<slug>/kage-pack.json` to validate it's a Kage pack

6. Update `~/.claude/kage.json`:
   - Read existing file (or create `{"version":"2.0.0","packs":[]}`)
   - Append pack entry: `{"name": slug, "source": url, "installed_at": "..."}`
   - Write back

7. Add a link to the pack in `~/.agent_memory/index.md`:
   - Append: `- [<name>](packs/<slug>/index.md) — <description>`

8. Report: "Pack `<name>` installed. N nodes across domains: [list from kage-pack.json]"

---

## `/kage update <pack-name>`

Update an installed pack to the latest version.

1. Find pack at `~/.agent_memory/packs/<pack-name>/`
2. Run `git pull` inside it
3. Report what changed (new nodes, updated nodes)

---

## `/kage publish`

Prepare this project's approved nodes as a shareable memory pack.

1. Check if `kage-pack.json` exists in CWD — if not, guide creation:
   - Ask: name, description, tags (comma-separated)
   - Write `kage-pack.json` with those fields + node_count + date

2. Validate all approved nodes have required frontmatter (title, category, tags, paths, date)
   - Report any missing fields

3. Run link validation: check all links in index files point to existing nodes

4. Generate/update `SUMMARY.md`

5. Add `scope: "global"` to nodes that don't have it (marks them as shareable)

6. Report:
   ```
   Pack ready: <name>
   Nodes: N
   Domains: [list]

   Next steps:
   1. Push this repo to GitHub (if not already)
   2. Others can install with: /kage add <your-github-org>/<repo-name>
   3. To list in the community registry: submit a PR to github.com/kage-memory/registry
   ```

---

## `/kage search <query>`

Search the community registry for memory packs.

1. Fetch `https://raw.githubusercontent.com/kage-memory/registry/main/registry/index.json`
   - If fetch fails: "Registry unavailable. Try again later or install directly with /kage add <github-url>"

2. Filter packs by query (match against name, description, tags — case-insensitive)

3. Display results:
   ```
   Found N packs matching "<query>":

   [1] nextjs-patterns — Next.js App Router patterns and gotchas
       Tags: nextjs, react, frontend | Nodes: 12 | ★ 42
       Install: /kage add kage-registry/nextjs-patterns

   [2] ...
   ```

4. Ask: "Install any? Enter number or 'n':"
   - If number chosen: proceed with `/kage add` flow for that pack

---

## `/kage rebuild-indexes`

Reconstruct all `index.md` files from node frontmatter (resolves merge conflicts).

1. For each tier (project `.agent_memory/`, personal `~/.agent_memory/`):
   - Clear all domain `index.md` files (keep root `index.md` domain list)
   - Read every node in `nodes/`
   - For each node, read its `paths` frontmatter
   - Re-add the link to each domain index
2. Report: "Rebuilt N domain indexes from M nodes"

---

## `/kage` (no subcommand)

Show help:
```
Kage v2 — Agent Memory System

Usage: /kage <subcommand>

  review          Review and approve pending memory nodes
  prune           Deprecate outdated nodes
  digest          Regenerate SUMMARY.md overview
  add <org/repo>  Install a community memory pack
  update <name>   Update an installed pack
  publish         Prepare this project as a shareable pack
  search <query>  Search the community pack registry
  rebuild-indexes Reconstruct indexes from node frontmatter

Memory tiers:
  Project:  .agent_memory/          (committed to git, team-visible)
  Personal: ~/.agent_memory/        (your machine only)
  Packs:    ~/.agent_memory/packs/  (installed community packs)
```
