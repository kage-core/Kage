---
name: kage
description: Manage the Kage agent memory system. Subcommands: review (approve/reject pending nodes), prune (deprecate old nodes), digest (regenerate SUMMARY.md), submit (contribute a node to the global graph), search (search the global graph), fetch (fetch a specific global node), rebuild-indexes.
allowed-tools: Read, Write, Glob, Grep, Bash, WebFetch
---

You are managing the **Kage** agent memory system. Parse the user's subcommand from `$ARGUMENTS` and execute it.

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
   ```

4. Do the same for personal tier: Bash `ls $HOME/.agent_memory/nodes/*.md 2>/dev/null` — if nodes exist, regenerate `$HOME/.agent_memory/SUMMARY.md`. (Use Bash, not Glob, for `$HOME` paths.)

5. Report token estimate: "SUMMARY.md is approximately N lines (~X tokens)"

---

## `/kage submit <node-file>`

Contribute an approved local node to the global Kage Knowledge Graph at `kage-core/kage-graph`.

1. Read the node file at the given path.

2. Validate required fields for global submission:
   - `title`, `tags`, `date` — required
   - `domain` — must match one of the domains in the catalog. Fetch `catalog.json` to get the current list. Known domains: `auth`, `database`, `deployment`, `frontend`, `testing`, `api-design`, `ai-agents`, `payments`, `storage`, `email`, `security`, `performance`, `observability`, `mobile`, `infrastructure`, `tooling`, `data`
   - If `domain` is missing or doesn't match: show the domain list and ask the user to choose one
   - `stack` — recommended (specific versions this applies to); warn if missing

3. Check the graph catalog to see if a similar node already exists:
   ```
   WebFetch: https://raw.githubusercontent.com/kage-core/kage-graph/main/catalog.json
   WebFetch: https://raw.githubusercontent.com/kage-core/kage-graph/main/domains/{domain}/index.json
   ```
   If a very similar node exists: show it and ask "Update existing or submit as new?"

4. Add global fields to a copy of the node (do not modify the local file):
   - `type` — ask user: gotcha / pattern / config / decision / reference
   - `id: "{domain}/{slug}"` — slug from title, kebab-case
   - `score: 50`
   - `uses: 0`
   - `votes: {up: 0, down: 0}`
   - `fresh: true`
   - `supersedes: null`
   - `superseded_by: null`
   - `ttl_days` — default per type (gotcha: 730, pattern: 365, config: 180, decision: 180, reference: 365)

5. Write the prepared node to a temp file, then attempt to open a PR:

   **Path A — user has fork or write access:**
   ```bash
   gh pr create \
     --repo kage-core/kage-graph \
     --title "[{type}] {domain}: {title}" \
     --body "..."
   ```
   Report the PR URL.

   **Path B — no fork/access (gh returns 403/422):**
   - Write the prepared node content to `.agent_memory/pending/kage-graph-submission-{slug}.md`
   - Print instructions:
     ```
     Could not open PR automatically (no fork access).

     To submit manually:
     1. Fork https://github.com/kage-core/kage-graph
     2. Create file: domains/{domain}/nodes/{slug}.md
     3. Paste the content saved to: .agent_memory/pending/kage-graph-submission-{slug}.md
     4. Open a PR with title: [{type}] {domain}: {title}
     ```

---

## `/kage search <query>`

Search the live global knowledge graph.

1. Fetch the catalog:
   ```
   WebFetch: https://raw.githubusercontent.com/kage-core/kage-graph/main/catalog.json
   ```

2. Match query against domain `top_tags` to identify relevant domains.

3. For each matched domain (max 2), fetch its index:
   ```
   WebFetch: https://raw.githubusercontent.com/kage-core/kage-graph/main/domains/{domain}/index.json
   ```

4. Filter nodes by tag overlap with query terms. Show top 5:
   ```
   Found N nodes matching "{query}":

   [1] Claude Code hooks hang without bypassPermissions
       Domain: ai-agents | Type: gotcha | Score: 90 | Updated: 2026-04-12
       Tags: claude-code, hooks, permissions
       Fetch: /kage fetch ai-agents/claude-code-hooks-bypass-permissions

   [2] ...
   ```

5. Ask: "Fetch any node? Enter number or 'n':"
   - If number: fetch and display full node content

---

## `/kage fetch <domain/node-id>`

Fetch and display a specific node from the global graph.

```
WebFetch: https://raw.githubusercontent.com/kage-core/kage-graph/main/domains/{domain}/nodes/{id}.md
```

Display the full node content.

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
Kage — Agent Memory System

Usage: /kage <subcommand>

  review               Review and approve pending memory nodes
  prune                Deprecate outdated nodes
  digest               Regenerate SUMMARY.md overview
  submit <node-file>   Contribute a node to the global knowledge graph
  search <query>       Search the global knowledge graph
  fetch <domain/id>    Fetch a specific node from the global graph
  rebuild-indexes      Reconstruct indexes from node frontmatter

Memory tiers:
  Project:  .agent_memory/          (committed to git, team-visible)
  Personal: ~/.agent_memory/        (your machine only)
  Global:   kage-core/kage-graph    (live, community-validated, zero-install)
```
