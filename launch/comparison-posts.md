# Ready-to-paste: "how is this different from claude-mem?"

Venue-tuned answers to *the* question Kage will keep getting. Honesty rules from
[`compare-claude-mem.md`](./compare-claude-mem.md) apply: **credit claude-mem,
never fabricate its behavior, lead with the demo not the dunk.** These are
*replies* to that question in places it already gets asked — not unsolicited
broadcasts.

Full doc to link: <https://github.com/kage-core/Kage/blob/master/docs/kage-vs-claude-mem.md>

---

## HN comment (terse, technical, no marketing voice)

> claude-mem is great at what it does — capture everything locally, fast recall.
> The bet Kage makes is different: memory has to prove it's still true. Every
> memory cites the code it's about, and that citation is checked against the real
> files — at write time (a memory citing a file that doesn't exist is rejected),
> at recall time (if the cited code was deleted/changed it's withheld), and at
> diff time (`kage pr check` warns before the PR when your change invalidated a
> memory). Plus it's plain JSON in the repo, shared/reviewed through git instead
> of a per-machine store, so it's the team's memory, not one laptop's.
>
> Capture-everything optimizes for remembering; this optimizes for not being
> wrong as the code moves. You can point it at a claude-mem store read-only to see
> what a truth-check flags: `npx -y @kage-core/kage-graph-mcp audit-claude-mem`.

## r/ClaudeAI (friendly, Claude Code-first)

> Both give Claude Code memory across sessions, and claude-mem is genuinely good —
> if you're solo and want max local recall, it's a great pick.
>
> Kage makes two different bets:
> 1. **It's verified.** Every memory is checked against your actual code. If the
>    code a memory describes gets deleted or changed, Kage *withholds* that memory
>    instead of letting Claude act on something that's no longer true. It even
>    warns you at PR time when your diff just invalidated a memory.
> 2. **It's your team's.** Memory is plain JSON committed to your repo and reviewed
>    in the same PR as the code — so when you push, your teammate's next Claude
>    session already knows what you learned. No cloud, no account.
>
> Free 60-sec thing you can run right now without installing anything:
> `npx -y @kage-core/kage-graph-mcp scan --project .` — it reads your repo and
> shows where undocumented knowledge concentrates, cited to file:line.

## r/mcp (MCP-technical)

> It's an MCP server (works with Claude Code, Cursor, Codex, Cline, Goose, any MCP
> client). The differentiator vs capture-everything memory servers like claude-mem
> is grounding: memory packets cite code, and citations are validated against the
> repo at write/recall/diff time, so hallucinated or stale memory never reaches
> the model. Storage is plain JSON in `.agent_memory/` (git-tracked, PR-reviewed)
> rather than a per-machine SQLite/vector DB — sync is just your git remote, no
> hosted service, zero runtime deps, no account.
>
> Repo: https://github.com/kage-core/Kage · `npx -y @kage-core/kage-graph-mcp install`

---

## Where these go (reply, don't broadcast)

- **Search first.** On r/ClaudeAI, r/mcp, r/ChatGPTCoding, and HN, search
  "claude-mem" / "agent memory" and reply where the question is already live.
- **Lead with the free scan**, not the install — it's the zero-commitment hook.
- **If a claude-mem user pushes back**, agree on its strengths and offer the
  read-only `audit-claude-mem` so they can check their own store. No fighting.
- **One genuine reply > ten copy-pastes.** Adapt each to the actual thread; these
  are scaffolds, not scripts.
