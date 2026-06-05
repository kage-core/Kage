# Show HN post

**Title:**
Show HN: Kage – Agent memory that rejects hallucinated and stale citations

**URL:** https://github.com/kage-core/Kage

**Body:**

Every coding-agent memory tool optimizes for recall — capture everything, find it
fast. But recall is the wrong metric: an agent that acts on a memory citing a
file that was deleted last week, or one that never existed, is worse than an agent
with no memory at all.

Kage is built around trust instead of volume:

- **Validated on write** — a memory citing files that don't exist is rejected.
- **Withheld on recall** — when cited code is deleted or refactored, that memory
  is hidden from the agent (and shown to you).
- **Grounded to the code graph** — recall can return the 2-hop blast radius of a
  change, not just matching text.
- **Git-native** — memory is plain JSON in your repo, reviewed in the same PR as
  the code. Zero dependencies, no API key, no vector DB.

There's a benchmark for it: `kage benchmark --trust` measures hallucinated-
citation rejection, stale-memory exclusion, and live grounding. On standard
retrieval (LongMemEval-S) it's competitive too — 96% R@5, dependency-free — but
I'm deliberately not leading with that; the field is saturated there.

Try it in 30 seconds, no setup:

    npx -y @kage-core/kage-graph-mcp demo

It seeds a tiny repo, then shows Kage reject a hallucinated memory, withhold a
stale one, and recall only grounded memory.

Works with Claude Code, Codex, Cursor, Windsurf, and any MCP agent
(`npx skills add kage-core/Kage` installs it across 70+).

Honest about prior art: tools like agentmemory/Mem0/Zep are great at capture and
recall. The gap I care about is whether you can *trust* what's recalled when the
code underneath it changes — that's what Kage is for. Feedback welcome,
especially on the trust benchmark methodology (it's reproducible in the repo).

---

## First-comment notes (post right after)
- Link `docs/BENCHMARKS.md` (reproducible numbers) and `docs/TRUST.md` (method).
- Be upfront: LongMemEval is conversational, not the core use case; the
  category-correct benchmark is the SWE-bench memory ablation in `benchmark/`.
- Invite people to run `kage benchmark --trust` on their own repo and share.
