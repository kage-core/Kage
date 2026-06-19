# Kage — Demo Video & GIF Scripts

Two assets, two jobs:

- **Asset A — README/site hero GIF (8–12s, silent, looping):** the instant "what does it do" hook. This is the single most important visual you own. It plays before anyone reads a word.
- **Asset B — Launch demo video (75–90s, narrated):** the "show me it's real" video for Show HN, the X launch thread, and YouTube. Proves the trust loop on a real repo.

You also already have a third asset scripted — the **doodle "bedtime story" social video** (`docs/SOCIAL_DEMO_SCRIPT.md`). Keep it; it's the *emotional/shareable* top-of-funnel piece. The two below are the *credibility* pieces. You want both kinds.

---

## Asset A — README / site hero GIF

**Goal:** In under 12 seconds, a stranger understands "agents write memory, Kage rejects the false stuff and serves only what's true." No audio, must loop cleanly.

**Format:** screen recording of `kage viewer` (the live dashboard), 16:9 or slightly tall, large readable type, ~10s loop.

**The one thing it must show:** the **trust loop** — the thing no competitor does. Not a feature tour. One loop, one idea.

### Beat sheet (≈10s)

| Time | On screen | The point |
|---|---|---|
| 0.0–2.0s | Agent captures a memory → packet appears, **green ✓ "citations verified · src/auth/session.ts"** | Memory is captured *with proof* |
| 2.0–4.0s | Agent tries to capture a bad one → **red ✗ "rejected on write — no such path in this repo"** | Hallucinations never enter |
| 4.0–6.5s | A diff lands → a previously-good memory flips to **⊘ "withheld — cited file changed"** | Memory can't quietly rot |
| 6.5–9.5s | Next session opens → **"Previously…" digest injects, ↳ saved ~12K tokens** | Sessions start warm, and there's a receipt |
| 9.5–10s | Hold on the Kage mark + `npx -y @kage-core/kage-graph-mcp install` | The one command |

**Caption overlays (since it's silent), one short line per beat:**
1. "Your agent learns something — Kage verifies it against your code."
2. "A made-up citation? Rejected on the spot."
3. "Your diff breaks a memory? Withheld before it misleads anyone."
4. "Next session starts already knowing. With the receipt."

**Production notes:**
- Big fonts. It will be viewed at 600px wide on GitHub and 300px on mobile. If text isn't readable at thumbnail size, it failed.
- Color-code consistently with the site: green = verified, red = rejected, amber/grey = stale/withheld. Visual grammar should match the page.
- Loop must be seamless — end on a clean state that flows back to the start. No jarring cut.
- Keep it under ~3MB so GitHub renders it inline without lag.

---

## Asset B — Launch demo video (75–90s, narrated)

**Goal:** Convince a skeptical Hacker News reader that the trust loop is real, runs on a real repo, and installs in seconds. Tone: calm, technical, zero hype. Let the terminal do the bragging.

**Style:** real terminal + `kage viewer` split or cut between them. Real repo, real commands, real output. No slides, no stock music bed louder than the voice. Founder voiceover (authenticity > polish for this audience).

### Script

**[0:00–0:10] — The pain (cold open, no logo yet)**
> Voiceover: "Your coding agent is brilliant. It's also amnesiac. Every session, it re-reads the same files and re-asks the same questions you answered yesterday."
> On screen: a fresh agent session asking "what testing framework does this repo use?" — a question that was answered last session.

**[0:10–0:25] — The thesis (the line that earns the watch)**
> VO: "Memory tools exist. But they capture everything and never re-check it. So the memory rots — and an agent acting on a stale memory is worse than one with none. Remembering is solved. *Trusting what's remembered* isn't."
> On screen: the words **"Remembering is solved. Trusting isn't."** Then the Kage mark appears for the first time.

**[0:25–0:40] — Install (prove the 60 seconds)**
> VO: "One command. No account, no database, no API key."
> On screen: type `npx -y @kage-core/kage-graph-mcp install` → it scaffolds `.agent_memory/`, builds the code graph, wires the agent. Restart the agent. Real-time or lightly sped up — but show it actually finishing fast.

**[0:40–1:00] — Capture with proof (the core)**
> VO: "Now as the agent works, what it learns becomes a small file in your repo — and every memory cites the code it's about. Kage checks that citation against your actual files *before* it writes it."
> On screen, in the viewer:
> - A real learning captured → green ✓ "citations verified · src/payments/retry.ts".
> - Then an agent asserts a memory about a file that doesn't exist → red ✗ "rejected on write — no such path in this repo."
> VO: "A made-up citation never makes it into memory."

**[1:00–1:15] — Catch at diff time (the killer feature)**
> VO: "Here's what no other memory tool does. I change a file that a memory was about..."
> On screen: edit `src/auth/session.ts`, then run `kage pr check`.
> Output: `⚠ Your changes invalidated 2 team memories` with the one-command fix.
> VO: "Kage catches it in the same review as the code — and tells me exactly how to fix it. Memory can't quietly go stale."

**[1:15–1:25] — Recall + receipt (the payoff)**
> VO: "Next session — mine or a teammate's — starts already knowing. And every recall shows what it saved you."
> On screen: a new session opens with the "Previously…" digest; `↳ saved ~12K tokens vs re-reading source`. Cut to `kage gains` showing the running ledger.

**[1:25–1:30] — Close**
> VO: "Git-native memory for your coding agents. Verified against your code. Free and open source."
> On screen: `npx -y @kage-core/kage-graph-mcp install` · `github.com/kage-core/Kage` · "★ if it resonates."

### Hard rules for this video
- **Every number and behavior on screen must be real and reproducible.** HN will pause-frame it. If `pr check` outputs something slightly different live, match the script to reality, not the reverse.
- **No background music louder than a whisper.** This audience reads it as a tell for "marketing, not substance."
- **Under 90 seconds.** If it runs long, cut the install section (link it instead), never the trust loop.
- **First 10 seconds carry the whole thing** — most viewers decide there. The pain has to be felt, not described.

---

## Where each asset goes

| Asset | README | Site hero | Show HN | X launch thread | YouTube | Reddit |
|---|---|---|---|---|---|---|
| A — hero GIF | ✓ (top) | ✓ (top) | embed in first comment | ✓ thread opener | — | ✓ |
| B — launch video | link | section | link in post body | ✓ pinned | ✓ | ✓ |
| Doodle social video | — | mid-page | — | ✓ (separate, later) | Shorts | ✓ |

**Sequencing tip:** Asset A (the GIF) must exist *before* you launch anything — it's the thing every post hangs on. Asset B can follow within the launch week. The doodle video is a week-2 amplifier once the credibility pieces have done their job.
