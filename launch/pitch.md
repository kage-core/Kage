# Kage pitch — two audiences

Reusable everywhere: Show HN / Reddit replies, demos, emails, the landing page, a forwardable
one-pager. Plain, no em-dashes. The team pitch is the differentiated, higher-value one.

---

## Pitch A — Individual dev ("you")

**Hook:** Your coding agent forgets your repo every session. You re-explain the same
architecture, the same decisions, the same gotchas, and the CLAUDE.md you maintain by hand
drifts out of sync with the code and starts leading the agent wrong.

**What it is:** Kage gives your agent memory that lives in your repo and is checked against
the actual code. It captures what the agent learns as plain files, and a new session starts
already knowing your project instead of re-reading it.

**Why it's different:** every memory cites the code it's about and is re-verified at write,
at recall, and when a diff changes that code. If the code moved, the memory is withheld, not
fed to the agent. So it can't quietly rot. No account, no cloud, no API key.

**Try it:** `npx -y @kage-core/kage-graph-mcp install` (or `kage scan` to see it on your repo
without installing anything). kage-core.com

---

## Pitch B — Team / eng lead (the differentiated one)

**Hook:** The knowledge about your codebase — why a decision was made, the runbook for a
tricky deploy, the root cause of that gnarly bug — lives in people's heads and scrolls past
in Slack. It walks out the door when someone leaves, and every teammate's agent re-learns it
from scratch, every session.

**What it is:** Kage turns what each person's agent learns into shared memory committed in
the repo and reviewed in the same PR as the code. One person's hard-won context becomes the
whole team's. A new hire's first session starts already knowing the codebase's decisions.

**Why a team cares:**
- **Onboarding:** new devs (and their agents) ramp on the codebase's real decisions on day one.
- **Knowledge survives turnover:** it's in git, not in the head of whoever just quit.
- **Stays true:** verified against the code, so shared knowledge doesn't silently go stale and mislead the whole team.
- **You own it:** plain files in your repo, no per-seat cloud, no vendor lock-in, secrets scanned out. Reviewed like code, so it fits your governance.
- **Tool-agnostic:** each dev keeps their own agent (Claude Code, Cursor, Codex). Kage is the shared layer underneath.

**How a team adopts it (land-and-expand):** one dev runs `npx -y @kage-core/kage-graph-mcp
install`, commits `.agent_memory/`, and the team sees it in the next PR. No procurement, no
seats to buy. Roll it out by merging a PR.

**Proof:** open source (GPL-3.0), zero runtime deps, 0% stale-served on the correctness
benchmark, 100/100 trust benchmark. kage-core.com · github.com/kage-core/Kage

---

## Channel reality (so we don't repeat the cold-DM result)
- **Users:** bottom-up. The launch (Show HN + Reddit) and the landing-page fix do the
  acquisition. "Direct" mostly means: be ready with Pitch A the moment someone replies.
- **Teams:** do NOT cold-email eng managers (slowest channel, and cold DMs already proved ~0
  conversion). Instead: (1) put Pitch B as a "For teams" section on the site, (2) make it a
  forwardable one-pager so a dev who likes Kage can champion it internally, (3) use warm
  intros / your own network / teams whose devs already engaged — never cold-to-manager.
- The real unlock is still: one dev loves it (from the launch) -> they bring it to their team.
  So nail the individual experience first; the team adoption follows it.
