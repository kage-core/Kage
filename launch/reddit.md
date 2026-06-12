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

    npx -y @kage-core/kage-graph-mcp scan --project .

Repo: https://github.com/kage-core/Kage · Want a live 30-min run on your repo instead? https://kage-core.com/demo.html

How are you handling stale memory today? That's the part I want to compare notes on.

---

## r/ClaudeAI — post a day later — https://www.reddit.com/r/ClaudeAI/submit

**Title (paste exactly):**

Claude Code now remembers your repo like a teammate. What one session learns, every session knows

**Body (paste verbatim):**

Every new Claude Code session starts cold. The memory tools I tried all had the same flaw: they remember everything and verify nothing, so weeks later Claude acts on memory about code that no longer exists.

Kage closes the loop with hooks: a "previously..." digest at session start, verified memory injected when Claude reads a file it knows about, and a warning before your PR if your diff invalidated team knowledge. Sessions that saved nothing get auto-distilled into drafts you review.

Setup is one command: `npx -y @kage-core/kage-graph-mcp install` (or `/plugin marketplace add kage-core/Kage`). Plain JSON in your repo, no account, no API key.

Check what it sees in your repo first (read-only, ~1 min):

    npx -y @kage-core/kage-graph-mcp scan --project .

Repo: https://github.com/kage-core/Kage · Live 30-min run on your repo: https://kage-core.com/demo.html

Where would this break for you? Monorepos and worktrees especially.
