# Kage — Go-To-Market Strategy

**Goal for this phase:** GitHub stars / OSS traction (developer mindshare).
**Approach:** Organic, community-led. No paid spend required to win the first 1,000 stars.
**Starting point:** ~6 stars, npm package live, polished site, strong product, "days old."
**Author's note:** This plan is sequenced. Don't do everything at once — the order matters more than the volume.

---

## 1. The one-sentence positioning

> **Kage is git-native memory for coding agents — every lesson your agent learns becomes a verified file in your repo, shared with your team through git, and fact-checked against your code so it never goes stale.**

The three words that make Kage different from every other memory tool, in priority order:

1. **Verified** — citations are checked against real code at write, recall, and diff time. Nobody else does this. *This is the wedge.*
2. **Git-native** — memory is plain files in your repo, reviewed in the same PR as code. No DB, no cloud, no account.
3. **Collaborative** — one teammate's learning becomes the whole team's, through git.

**Pick ONE wedge for launch messaging: verification.** "Trusting what's remembered" is a category nobody else is competing on. Everyone else races on *remembering more*. Kage's contrarian, defensible angle is: capture-everything memory gets *less* trustworthy over time, and Kage is the only one that re-checks itself. Lead with that everywhere.

---

## 2. Who to target (and the order)

You said "you decide." Here's the priority, easiest traction first:

**Tier 1 — Coding-agent power users (launch here).**
Developers already living in Claude Code, Cursor, Codex, Cline, Aider. They feel the "my agent forgets everything between sessions" pain *daily* and already understand MCP. Lowest education cost, highest "oh I need this" rate. This is where stars come from.

**Tier 2 — The AI-dev-tooling / MCP crowd.**
People who collect, try, and share new agent tooling — MCP directory maintainers, "awesome-mcp" list curators, AI-engineering newsletter writers, indie hackers building on agents. They are *amplifiers*: they don't just star, they tell others. Court them deliberately in weeks 2–6.

**Tier 3 — Eng leads / managers (later, for the Team/Cloud motion).**
They care about shared knowledge, onboarding, bus-factor. This is your revenue audience but a *harder* first sell and a longer cycle. Don't lead here for the stars phase — but every piece of content should plant a seed ("works for your whole team through git") so when you turn on the Team motion later, the ground is tilled.

**Implication:** all launch copy speaks to an individual developer's pain ("your agent re-asks what it learned yesterday"), with team benefits as the second beat, never the first.

---

## 3. The core narrative (use this everywhere)

Every post, thread, and demo should hit these beats in this order. Consistency compounds.

1. **The pain (visceral, universal):** Your coding agent is brilliant and amnesiac. Every session it re-reads the same files, re-asks the same questions, re-derives the same decisions. You've explained "we use jose not jsonwebtoken" five times.
2. **The obvious-but-broken fix:** "Just give it memory." Tools exist (mem0, Zep, claude-mem). But they capture everything and never re-check it — so the memory rots, and an agent acting on a stale memory is *worse* than one with no memory.
3. **The Kage insight:** Remembering is solved. **Trusting what's remembered isn't.** Kage verifies every memory against your actual code — rejects hallucinated citations on write, withholds stale memory on recall, and warns you at PR time when your diff just invalidated something the team knew.
4. **Why git-native matters:** It lives in your repo as plain files, reviewed in PRs, shared through git. Your knowledge stays yours. No account, no DB, no API key. One command.
5. **Proof:** 100/100 trust benchmark, 0 stale-served, runs in 60s, zero dependencies. Run it on your own repo: `npx -y @kage-core/kage-graph-mcp scan --project .`

The "remembering is solved, trusting isn't" line is your **single best asset.** It's a tweetable, debate-starting, category-defining sentence. Repeat it relentlessly.

---

## 4. Channel plan (ranked by ROI for stars)

### A. Show HN (Hacker News) — the single highest-leverage event

This is the one shot that can take you from 6 to 1,000+ stars in a day. Treat it as a *campaign*, not a post.

- **Pre-reqs before you post (non-negotiable):**
  - README hero GIF that shows the trust loop in <10 seconds (you have `kage-demo.gif` — make sure it's the very first thing).
  - The 60-second install actually works flawlessly on a fresh machine. Test on a clean repo. The #1 Show HN killer is "I tried it and it errored."
  - A genuinely useful zero-install hook: `npx ... scan` (the Truth Report). HN loves "run this on your repo and see something true immediately, before installing anything." Make that the call to action.
  - At least 2–3 "good first issues" open so curious people can contribute.
- **Title:** `Show HN: Kage – Git-native memory for coding agents, verified against your code`. Avoid hype words. "Verified against your code" is the hook.
- **First comment (post it yourself immediately):** the founder story — why you built it, the honest limitations, what's NOT done yet, and the contrarian thesis ("every memory tool I tried got less trustworthy the more I used it"). HN rewards candor and punishes marketing.
- **Timing:** Tuesday–Thursday, ~8–10am ET. Avoid weekends and Mondays.
- **Engagement:** clear your calendar for 6 hours. Reply to *every* comment, especially skeptical ones, technically and humbly. This is where the work is.
- **Do NOT** ask friends to upvote in a burst — HN's ring detection will flag and bury you. Authentic engagement only.

### B. Reddit — r/ClaudeAI, r/cursor, r/LocalLLaMA, r/ChatGPTCoding

Native, value-first posts. Not "check out my project" but "I got tired of my agent forgetting everything, so I built X — here's how it works and the benchmark." Each subreddit needs its own framing (r/LocalLLaMA cares about zero-deps/local/no-cloud; r/cursor cares about the Cursor integration specifically). Space them out over weeks, never crosspost identically the same day.

### C. The MCP / agent-tooling ecosystem (highest amplifier ROI)

- Get listed in every MCP directory and "awesome-mcp-servers" list (PRs to those repos).
- Submit to the official MCP server registry / Anthropic's directory.
- Get into AI-engineering newsletters (TLDR AI, Latent Space, Ben's Bites, Rundown AI). Pitch the *thesis*, not the product.
- Reach out to the agent platforms you integrate with (Cline, Aider, Goose, Roo, Kilo communities) — a "Kage works with X" post in their Discord/community is welcome because it adds value to their users.

### D. X / Twitter

The "build in public" channel. Daily-ish small posts: a benchmark result, a screenshot of the viewer catching a stale memory, the "remembering is solved, trusting isn't" thesis as a standalone tweet, a clip of the demo GIF. Tag and reply to AI-dev accounts. One well-crafted thread timed with the HN launch. Pin the thesis tweet.

### E. dev.to / Hashnode / personal blog

One strong long-form piece: **"Why your coding agent's memory rots — and what verified memory looks like."** This is the SEO + evergreen asset that the threads and HN comments link back to. Write it once, link it forever.

### F. Short-form video (YouTube Shorts / X video / TikTok dev niche)

The doodle "bedtime story" social demo you already scripted is perfect here — it's funny, emotional, and shareable in a way a terminal demo isn't. Ship it.

---

## 5. The 30 / 60 / 90-day sequence

### Days 0–14: Load the spring (DON'T launch yet)

The biggest mistake is launching to an empty room. Spend two weeks making the launch unmissable.

- **Polish the front door.** README hero GIF first, 60-second install bulletproof on a clean machine, "good first issues" labeled, CONTRIBUTING clear. (See the messaging review doc for specific fixes.)
- **Build a tiny audience first.** Start posting "build in public" on X *now*. Share the thesis, the benchmark, the viewer. Get 5–10 real people who've tried it and will authentically engage on launch day.
- **Seed the ecosystem quietly.** Open PRs to awesome-mcp lists, submit to MCP registry. These take days to merge — start now so they're live for launch.
- **Write the long-form post** ("why agent memory rots") and the HN first-comment draft.
- **Recruit 1–3 design partners** for the quote wall (your site honestly says those spots are empty — fill them with real users before the big push). A real quote from a real team is worth more than any copy.

### Days 15–45: The launch wave

- **Week 3, Tue–Thu:** Show HN. All hands on the thread for 6 hours.
- **Same day:** the X launch thread + the long-form post goes live (so HN commenters have somewhere to go deeper).
- **Week 4:** Reddit — one subreddit, native framing. Watch what resonates.
- **Week 4–5:** newsletter pitches go out (reference the HN traction as proof).
- **Week 5:** ship the doodle demo video; post to X, Shorts, relevant Discords.
- **Week 6:** second Reddit community, different angle. First "what we learned / what's new since launch" update post (HN/Reddit reward follow-through).

### Days 46–90: Compound

- **Convert star-gazers to users.** A star is a bookmark; usage is the goal. Add a "first run" experience that delivers a wow in 60s (the Truth Report does this — make sure it's the recommended first step everywhere).
- **Turn users into contributors.** Respond to every issue within a day. Merge good PRs fast. Thank contributors publicly. Early contributors become evangelists.
- **Content cadence:** one substantive post per week (a benchmark deep-dive, a "memory caught a stale claim in our own repo" story, an integration spotlight). Consistency > intensity.
- **Start the design-partner / Team motion conversations** with the eng leads who showed up. Now you have receipts.
- **Apply the proof.** Once you have real usage numbers and quotes, update the site's empty quote wall and the savings receipts with real data.

---

## 6. What "winning" looks like (metrics)

Track weekly. Stars are the headline goal, but the leading indicators matter more:

- **North-star:** GitHub stars (vanity but it's your stated goal — and it's real social proof for a dev tool).
- **Leading indicators (these predict stars):**
  - npm weekly downloads (actual trial)
  - `scan` / `audit-claude-mem` runs (zero-install trial — your top-of-funnel)
  - Unique repos with `.agent_memory/` committed (real adoption — if you can measure via opt-in telemetry or just GitHub code search)
  - GitHub traffic referrers (tells you which channel is working)
- **Engagement quality:** issues opened, PRs from outside contributors, Discussions activity.
- **Amplifier wins:** newsletter mentions, inclusion in awesome-lists, integration-community shoutouts.

Rule of thumb: if a channel isn't producing stars *and* downloads, stop pouring time into it.

---

## 7. Honest risks & how to handle them

- **"Days old" cuts both ways.** Authenticity is your friend on HN/Reddit ("I built this last month, here's the honest state"). But don't oversell maturity — your site already does the right thing by refusing fake quotes. Keep that integrity; it's a differentiator.
- **The benchmark numbers are your credibility — and your liability.** Every claim (100/100 trust, 18% faster than grep, 96% R@5) *will* be scrutinized on HN. Make sure each is reproducible with the exact command you cite, and link the methodology prominently. One unreproducible number and the thread turns on you.
- **Crowded category perception.** People will say "isn't this just mem0/claude-mem?" Have the one-line answer ready and repeat it: *"Those solve remembering. Kage solves trusting what's remembered — it re-checks every memory against your code."* The `audit-claude-mem` command is a brilliant judo move: it lets claude-mem users see their own store's rot for free. Lean on it.
- **GPL-3.0 may scare some companies.** Fine for stars and individual devs; be ready to discuss licensing for the Team/commercial motion later. Not a launch-phase blocker.
- **Don't game it.** Vote rings, fake stars, and astroturfing are the fastest way to get permanently discredited in dev communities. Everything organic.

---

## 8. The 5 things to do first (if you do nothing else)

1. Make the **60-second install bulletproof on a clean machine** and the **README hero GIF** the first thing people see.
2. Recruit **1–3 real design partners** and get real quotes — replace the empty quote wall.
3. Write the **Show HN first comment** (founder story + honest limits + the thesis) and the **long-form "memory rots" post.**
4. Get listed in **awesome-mcp lists + the MCP registry** (start now, they take days to merge).
5. Start **building in public on X today** so launch day isn't an empty room.

Then launch the Show HN on a Tuesday, and be there all day.
