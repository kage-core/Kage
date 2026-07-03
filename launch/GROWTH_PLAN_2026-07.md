# Kage Growth Plan — 2026-07 (evidence-based, 90 days)

Generated 2026-07-03 from a 3-researcher evidence sweep (growth case studies, channel map,
buyer discovery); reworked 2026-07-04 per founder decision: **the memory loop leads; kage
check is a quiet secondary feature and leads nothing.**

## Positioning

**Kage is memory for coding agents that stays true.** Your agent learns as you work —
decisions, fixes, conventions — and the next session (yours or a teammate's) starts already
knowing it. Unlike every other memory tool, Kage verifies each memory against your code
before injecting it: stale knowledge is withheld, never served. claude-mem remembers;
natives remember; **Kage remembers and stays true.**

Why this framing survives the market (from the research): the loudest live debate is "does
agent context/memory even help, and how would you know?" (ETH Zurich AGENTS.md study hit
the HN front page showing auto-generated context files *hurt*). Every memory tool is on the
defensive side of that debate. Kage's loop is the only one that answers it structurally —
memory that carries evidence and withholds itself when the code moves. Single-player first:
every category winner (claude-mem, Mem0, PostHog) monetized team features only after solo
OSS adoption. Anthropic shipped native team-memory sync in April, so "sharing" is not the
headline — git-reviewable, verified, cross-agent memory is the retained differentiator.

## Ranked plays

### 1. The living-memory demo post (r/ClaudeAI)

**What:** A 60-second demo (gif/asciinema) of the loop itself: session 1 debugs a failing
test and establishes a convention → session 2 opens cold and *already knows it* → then the
kicker: the cited file is changed, and Kage **withholds** the now-stale memory instead of
injecting it. One-line install. The demo script is committed in the repo so anyone can
reproduce it. Post to r/ClaudeAI (the channel where claude-mem went vertical on exactly
this format: quantified claim + one-line install), founder posts personally and lives in
the comments all day. A week later, second angle on r/ClaudeCode.

**Why:** The traced zero-to-one mechanism for this exact category and channel. And the
withholding kicker pre-answers the reflexive objection that killed memory-tool posts
("context bloat / stale garbage in my context") — Kage is the memory tool that *subtracts*.

**Metric (non-vanity):** by Aug 15, ≥10 strangers post their own session-2 recall moment or
withholding receipt (screenshot/output). Kill/iterate: <20 non-vendor comments and zero
reproductions → rewrite the hook once, try r/ClaudeCode, then stop and reassess.

### 2. Memory-health PR comment — free GitHub Action for OSS

**What:** Package `kage pr check` (already runs on this repo) as a marketplace Action: on
every PR it reports which of the repo's *memories* the diff invalidates ("this change
breaks 2 things your agents believe — reverify or supersede") and posts a short comment.
Free forever for public repos. This is the loop at the merge boundary — memory
reconciliation, not doc linting.

**Why:** CodeRabbit's traced engine: free-for-OSS + output visible in every PR + two-click
install → 100k repos before any marketing spend. And it plants the future paid surface at
the boundary where proven budgets live ($15–24/seat band).

**Metric:** by Sep 30, ≥5 external repos running it on real PRs.

### 3. The build-in-public teardown: "my memory product's loop was silently dead"

**What:** An honest engineering war story: the forensic trace that found the ambient loop
delivering zero (JSON-noise capture, ungated distill, dead promote path), the eleven fixes,
and the two-session proof — written as a teardown with real numbers and commits. Docs-site
post; founder shares personally.

**Why:** War stories and forensic teardowns are the highest-engagement format in this
niche's channels (the research traced teardown-style posts outperforming advice content
consistently). It also converts Kage's most awkward fact — the loop was broken — into its
most credible asset: this team measures itself and publishes the truth.

**Metric:** one third-party citation (newsletter, blog, or a named amplifier linking it).

### 4. One-line install + listings sweep (fulfillment only)

**What:** Self-hosted plugin marketplace repo (`/plugin marketplace add …` works in one
line); 10× fresh-machine install test (<10 min to first verified recall); then batch the
listings (awesome-claude-code, community plugins, MCP registry, directories) in half a day
and forget them.

**Why:** Registries are fulfillment, not discovery (claude-mem's own download curve proves
it) — but a broken install during the post window kills the only asset that matters.

**Metric:** 10/10 clean-machine installs pass before play 1 posts.

### 5. Honest eval post + three staged amplifier pitches

**What:** Re-run the retrieval benchmarks (LongMemEval, the staleness bench) against
current code and publish one honest eval post — including where Kage doesn't help — framed
as "how would you even know your agent's memory is true?" Then three personal pitches
(drafts staged, founder sends): ClaudeLog (mechanics page on memory verification),
Willison/Raschka (the eval artifact), one tested-roundup writer.

**Why:** Benchmark content is the proven high-engagement format; the pitches ride an
artifact, not a request for attention.

**Metric:** one third-party artifact by Sep 30; zero after three pitches → the artifact
isn't strong enough, stop pitching.

### Quiet channel (unranked): evidence PRs

The 21 corpus repos with confirmed stale context can still receive hand-written fix PRs
(value-first, evidence-cited, one-line footer) at ~2-3/week when time allows. This is a
goodwill/warm-contact channel, not a launch surface — and it never leads.

## Revenue motion

Individuals never pay for memory (claude-mem: 85k stars, still free; ByteRover retreated
from its team tier). The buyer with proven budget is the EM / DX-lead at the PR/CI
boundary, spending existing AI-tooling budget at CodeRabbit-anchored prices ($15–24/seat).
What they'd pay for: the **memory gate on private repos** — play 2's PR comment sold as CI
enforcement, with the provenance/staleness receipts natives don't have (git-reviewable vs
opaque server sync; covers Bedrock/Vertex users excluded from native sync; readable by
Codex/Cursor via OKF). When to ask: days 60–90, via 10–15 discovery interviews sourced from
Action adopters and demo-post commenters. Hard gate: **no billing, no pricing page, no
hosted anything until ≥3 teams pull.**

## Do NOT do

- **Do not lead with `kage check` anywhere.** Founder decision (2026-07-04). It remains a
  quiet secondary feature; the drift study stays published as methodology but is not a
  launch artifact.
- No third Show HN (two 3-point attempts match the category base rate). HN is earned later
  via a "what we learned" post, not pitched.
- No cold DMs of any kind (0/20 documented). Value-first or artifact-attached pitches only.
- Do not lead with "team-shared memory" — natives ship team sync now; sharing is a retained
  differentiator, not the headline.
- No stars/downloads/clones as success metrics or in public claims (documented bot noise).
- Never plug Kage on competitor or partner trackers (incl. anthropics/claude-code issues) —
  quote the pain threads in Kage's own content instead.
- No influencer spend, press, or sponsorships at current scale; the only paid exception is
  a small PostHog-style boost (~$500–1k) if a post already shows organic legs.
- No Discord, no community-building before there is a community.
- No team-tier billing before the ≥3-teams pull gate.
- Growth work caps at ~60% of the week — a broken release during the post window destroys
  the one differentiating asset: a product that verifiably works.

## First 30 days

**Week 1 (Jul 6–12):** record the two-session demo + withholding kicker; commit the
reproduction script; 10× fresh-machine install test, fix what breaks; ship the marketplace
repo; batch all listings in half a day. Draft the demo post.
**Week 2 (Jul 13–19):** publish demo post on the docs site; Tuesday US-morning post to
r/ClaudeAI; founder in the comments all day; log every objection verbatim. Start extracting
`kage pr check` into the standalone Action.
**Week 3 (Jul 20–26):** second-angle post to r/ClaudeCode; finish + publish the Action
(free for OSS); draft the teardown war story from the deep-dive/fix history.
**Week 4 (Jul 27–Aug 2):** publish teardown; retro on both posts (which hook, which
objections); begin eval re-runs for play 5; first quiet evidence PRs if time allows.

_Prereq already done (2026-07-03): every number Kage prints is a count, not an estimate —
the inflated receipt was removed in v3.3.0, so all content claims are defensible._
