# Launch posts — Show HN + Reddit (you post from your accounts)

Goal: one concentrated launch with built-in audience > 1000 cold DMs. Post the Show HN
in the morning US time (weekday) for best ranking. Then the Reddit posts. Reply to every
comment fast in the first 2 hours; that's what drives ranking on both.

Plain, builder-to-builder, no marketing voice, no em-dashes. Disclose you built it.

---

## Show HN

**Title:**
Show HN: Kage – Verified, git-native memory for coding agents

**First comment (post immediately after submitting):**

Hi HN. I built Kage because my coding agents (Claude Code, Cursor) forgot everything between sessions. I kept re-explaining the same architecture and decisions, and the markdown notes I kept for them went stale and started actively misleading the agent.

Kage captures what the agent learns as plain JSON committed in your repo (.agent_memory/), so the next session, mine or a teammate's via git, starts already knowing it.

The part I care most about is verification. Every memory cites the code it is about, and Kage re-checks those citations against the actual files at three points: when it is written, when it is recalled, and when a diff changes the cited code. If the code moved, the memory is withheld instead of fed to the agent. So it cannot quietly rot, which was the thing that kept burning me with plain markdown.

No account, no database, no API key. One command: npx -y @kage-core/kage-graph-mcp install. Works with any MCP client.

If you want to kick the tires without installing anything, there is a 60-second `kage scan` that reads any repo and reports its riskiest knowledge gaps (undocumented hot files, untested hot paths, bus-factor-1 files), each cited to file:line.

It is early and I would genuinely like feedback, especially on the verification model and whether the git-native approach holds up for bigger teams.

Repo: https://github.com/kage-core/Kage

---

## r/ClaudeAI

**Title:**
I got tired of re-explaining my repo to Claude Code every session, so I built a memory layer that stays checked against the code

**Body:**

Every new Claude Code session started cold. I'd re-explain the architecture, the decisions, the gotchas, every time. I tried keeping a CLAUDE.md and some markdown notes, but they drifted out of sync with the code and started leading Claude wrong, which was worse than nothing.

So I built Kage. It captures what the agent learns as plain files committed in your repo, so the next session starts already knowing it. The bit that matters most to me: every memory points at the code it describes, and it gets re-checked against your actual files at write, at recall, and whenever a diff changes that code. If the code moved, that memory is withheld instead of handed to Claude. So it can't quietly go stale.

Free and open source, no account or API key. One command in your repo:

`npx -y @kage-core/kage-graph-mcp install`

There's also a `kage scan` that reads any repo in ~60s and shows its riskiest knowledge gaps without installing anything, if you just want to see what it does first.

It's early, built it because I needed it. Would love feedback from people running Claude Code on real projects. Repo: https://github.com/kage-core/Kage

---

## r/LocalLLaMA

**Title:**
Kage: local-first, git-native memory for coding agents (MCP, no cloud, no account, verified against your code)

**Body:**

Sharing a thing I built for the no-cloud crowd. Kage is a memory layer for coding agents (Claude Code, Cursor, Codex, any MCP client) that keeps everything local and in your own git, not a vendor's database.

How it works: as the agent works, durable learnings get written as plain JSON in your repo under .agent_memory/. Next session reads them back. It's shared with a team through git, not a hosted service. Zero runtime dependencies, no account, no API key, nothing phones home. There's a local dashboard (`kage viewer`) to watch packets and the memory-to-code graph update live.

The differentiator vs capture-everything stores: every memory cites the code it's about and is re-verified against your actual files at write, recall, and diff time. Memory whose code changed or was deleted is withheld instead of served, so the agent never acts on a stale claim. On a stale-served benchmark it's 0% vs 100% for stores that never re-check.

One command: `npx -y @kage-core/kage-graph-mcp install`

Open source (GPL-3.0), feedback welcome, especially on the retrieval and verification side. Repo: https://github.com/kage-core/Kage

---

## r/ChatGPTCoding

**Title:**
Built an open-source memory layer for coding agents that won't feed them stale info (works with Cursor, Claude Code, Codex)

**Body:**

Whatever agent you use, they all ship with amnesia: every session starts from scratch and you re-explain your codebase again. The usual fix is a rules/context file you maintain by hand, but that drifts from the code and eventually misleads the agent.

Kage is my take on fixing that. It captures what the agent learns as plain files in your repo, so the next session (yours or a teammate's, via git) starts already knowing it. And every memory is checked against the actual code at write, recall, and diff time, so when the code changes the matching memory gets withheld instead of fed back wrong.

Works with Cursor, Claude Code, Codex, Windsurf, Cline, and any MCP client. Free, open source, no account.

`npx -y @kage-core/kage-graph-mcp install`

It's early and I'm looking for honest feedback from people who code with these tools daily. Repo: https://github.com/kage-core/Kage

---

## Posting notes
- Check each subreddit's self-promotion rule first; r/LocalLLaMA and r/ChatGPTCoding are tolerant of "I built this, open source" if you engage; r/ClaudeAI is fine with Claude-tooling shares.
- Don't cross-post the identical text the same hour; space them out and tailor (done above).
- First 2 hours = reply to every comment. Engagement drives ranking more than the post itself.
- Have the README hero GIF / a 20s screen recording ready to drop in a comment when someone asks "what does it look like".
- If Show HN gets traction, that's the moment a star burst happens; pin the repo, make sure the landing CTA is "install now" not "get early access" before you post.
