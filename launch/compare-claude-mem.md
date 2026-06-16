# Content + demo: "claude-mem remembers everything. Kage refuses to act on what's no longer true."

> **Positioning note.** The existing launch kit deliberately runs an *own-story,
> no-teardown* outbound tone (see [`CHECKLIST.md`](./CHECKLIST.md)). This asset is
> the opposite lever: a **factual, fair comparison** against our one true direct
> competitor, claude-mem (a Claude Code memory plugin with tens of thousands of
> stars). Use it where comparison is expected and welcome — a docs page, a
> "honest comparison" blog post, an HN comment answering "how is this different
> from claude-mem?" — not as a hit piece. The companion docs page is
> [`docs/kage-vs-claude-mem.md`](../docs/kage-vs-claude-mem.md). Always credit
> claude-mem's real strengths; lead with the demo, not the dunk.

---

## Why this fight, and why now

Our closest competitor is **not** mem0 or Zep — those are SDKs for people
*building* AI apps. Our competitor is **claude-mem**: same user (people *using*
Claude Code), same promise (memory across sessions), single-command install. It
has tens of thousands of GitHub stars and a large contributor community. It does
*less* than Kage on the axes we care about (it captures everything locally and
never re-checks it against the code), yet it won distribution decisively.

So the goal of this asset is not to claim Kage "beats" it on everything. It's to
make one difference legible and *felt*: **claude-mem optimizes for remembering;
Kage optimizes for not being wrong.** That difference is invisible on day one and
expensive on day thirty — when an agent confidently acts on something that used
to be true.

## The one-line frame

> Every coding-agent memory tool remembers. The unsolved part is what happens
> when the code changes underneath the memory. claude-mem serves it anyway. Kage
> withholds it.

## The content piece (blog / dev.to / HN comment)

**Title options:**
- "claude-mem remembers everything. Mine refuses to act on what's no longer true."
- "I gave my agent perfect memory. Then the code changed."
- "Honest comparison: claude-mem vs Kage (capture-everything vs verify-and-share)"

**Body (draft):**

I love that claude-mem exists. Install it and your agent just *remembers* — high
volume, fast local recall, a real search UI. For a solo developer that's often
exactly right.

But I kept hitting the same failure with capture-everything memory: the memory
was captured perfectly, and then the code moved. The function got renamed. The
file got deleted. The decision got reversed. The store didn't know — so my agent
confidently acted on a fact that *used to be true*. The more memory it had, the
more confidently it was wrong.

So I built Kage around a different rule: **memory has to prove it's still true.**
Every memory cites the code it's about. Kage checks those citations against your
real files — at write time (a memory citing a file that doesn't exist is
rejected), at recall time (if the cited code was deleted or changed, the memory
is withheld), and at diff time (`kage pr check` warns you before the PR when your
change just invalidated a memory).

The second difference: Kage memory is plain JSON in your repo, shared through git
and reviewed in the same PR as the code. So it's your *team's* memory, not one
machine's.

Capture-everything and verify-and-share are genuinely different bets. If you want
maximum local recall, solo, claude-mem is great. If you want memory that's shared
and that never goes stale on you, that's the gap Kage fills.

Don't take my word for it — you can point Kage at a claude-mem store and see what
a truth-check flags, read-only:

```bash
npx -y @kage-core/kage-graph-mcp audit-claude-mem --project .
```

---

## The demo: "stale memory breaks your agent" (90 seconds, all real)

This is the showpiece. Nothing is canned — every step runs live in a sandbox.

### Run it

```bash
# 1. Watch Kage's reject/withhold loop run in a throwaway sandbox repo
npx -y @kage-core/kage-graph-mcp demo
```

`kage demo` builds a tiny repo, captures memories that cite real files, then:

1. tries to save a memory citing a file that **does not exist** → **refused at
   write time**;
2. **deletes** a cited file and asks for recall again → that memory is
   **withheld**, with the reason;
3. shows what recall actually returns now → only memory that still checks out.

The closing line of the demo says it all: *write-time rejection ✓ · stale
withholding ✓ · grounded recall ✓.*

### The contrast to narrate (or screen-record side by side)

| Step | Capture-everything store | Kage |
|---|---|---|
| Save a memory citing a missing file | stored | **rejected at write time** |
| Delete the file a memory depends on | still served on recall | **withheld** |
| Your PR changes code a memory cited | no signal | **flagged by `kage pr check`** |

### Screen-recording script (for X / Product Hunt / README GIF)

1. Split screen, two terminals. Left: a capture-everything memory. Right: Kage.
2. On both: save a memory about `src/legacy-retry.ts`.
3. `rm src/legacy-retry.ts` on both.
4. Ask each for recall. Left still returns the now-false memory. Right: **withheld**.
5. End card: "Same memory. One of them just lied to your agent." → install line.

> Honesty guardrail: don't fake the left-hand tool's output. If you record a real
> competitor, use its real behavior, or label the left pane "a generic
> capture-everything store" and show a plausible generic store. Never
> misrepresent claude-mem specifically.

---

## Where to use this

- **Docs page** — ship [`docs/kage-vs-claude-mem.md`](../docs/kage-vs-claude-mem.md)
  and link it from the README "Why Kage" table.
- **HN / Reddit answer** — when someone asks "how is this different from
  claude-mem?", paste the one-line frame + the demo command.
- **Short video** — the side-by-side recording above, 30–45s, for X and Product
  Hunt.
- **SEO** — "kage vs claude-mem" / "claude-mem alternative" / "claude-mem stale
  memory" are low-competition, high-intent queries from people already sold on
  the category.
