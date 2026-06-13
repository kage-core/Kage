# Reddit posts

Rules: post manually from your account. One sub at a time, a day apart.
Engage in every comment thread. Markdown renders; paragraphs are single lines.
Keep details for the comments: short post, long answers.

---

## r/mcp — https://www.reddit.com/r/mcp/submit

**Title (paste exactly):**

One teammate fixes a bug once, and now every coding agent on the team remembers it

**Body (paste verbatim):**

Every agent session on my team started cold: re-deriving bug causes someone already found, re-asking why a module is shaped the way it is. So I built Kage, an MCP server for shared repo memory. Learn something once, every agent recalls it when it matters.

The twist: memory is verified, not just stored. Citing a file that doesn't exist gets it refused. If the cited code changes or gets deleted, it's withheld from recall instead of served. And `kage pr check` warns when your own diff invalidates something the team knows.

Plain JSON in your repo, PR-reviewed. No account, no API key, no vector DB.

Try the read-only scan on your repo (~1 min, finds knowledge voids and doc claims that don't match the code):

    npx -y kage-graph-mcp scan --project .

I'm onboarding the first teams this week and running it live on your repo — 30 minutes, your code, the scan + a stale-catch on a real diff. **Grab a slot here: https://kage-core.com/demo.html**

Repo (GPL-3.0): https://github.com/kage-core/Kage

How are you handling stale memory today? That's the part I want to compare notes on.

---

## r/ClaudeAI — post a day later — https://www.reddit.com/r/ClaudeAI/submit

**Title (paste exactly):**

Claude Code now remembers your repo like a teammate. What one session learns, every session knows

**Body (paste verbatim):**

Every new Claude Code session starts cold. The memory tools I tried all had the same flaw: they remember everything and verify nothing, so weeks later Claude acts on memory about code that no longer exists.

Kage closes the loop with hooks: a "previously..." digest at session start, verified memory injected when Claude reads a file it knows about, and a warning before your PR if your diff invalidated team knowledge. Sessions that saved nothing get auto-distilled into drafts you review.

Setup is one command: `npx -y kage-graph-mcp install` (or `/plugin marketplace add kage-core/Kage`). Plain JSON in your repo, no account, no API key.

Check what it sees in your repo first (read-only, ~1 min):

    npx -y kage-graph-mcp scan --project .

I'm onboarding the first teams this week. Want it set up and demoed live on your repo? **Book a 30-min slot: https://kage-core.com/demo.html**

Repo (GPL-3.0): https://github.com/kage-core/Kage

Where would this break for you? Monorepos and worktrees especially.

---

## If a post gets "removed by Reddit's filters" (happened on r/mcp, 6/13)

This is the automated spam filter (new account + multiple links), not a human.
In order:

1. DO NOT delete the post. Message the mods (sidebar > "Message the mods"):

   Hi — my post "One teammate fixes a bug once..." was caught by Reddit's
   filters a few minutes after posting. It's an open-source MCP server
   (GPL-3.0, on the official MCP registry), which I figured was on-topic
   here. Happy to adjust anything that violates sub rules — or if it's just
   the new-account filter, would appreciate a manual approval. Thanks!

2. Spend 10 minutes leaving 2-3 genuine comments on other threads in the sub.
   Filters score the account; a little participation usually clears the next
   post automatically.

3. If no approval in ~24h, repost the ONE-LINK variant: same body but keep
   only the GitHub link, drop the demo URL (offer the demo in a comment after
   the post survives). One link total is the biggest filter signal.
