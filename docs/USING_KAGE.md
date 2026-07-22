# Using Kage

The practical manual. For the mechanism behind any of this, see
[HOW_IT_WORKS.md](./HOW_IT_WORKS.md).

Kage has ~136 commands. **You need about six.** This page is organized by what you are trying to do,
not by what exists — `kage help --all` is there when you want the full surface.

---

## Setup (once per repo)

```bash
npx -y @kage-core/kage-graph-mcp install
```

That creates `.agent_memory/`, builds the code graph, writes the `AGENTS.md` / `CLAUDE.md` policy
that tells agents to use Kage, auto-detects and wires your agents, and configures `.gitignore` plus
the packet merge driver. Node 18+. No account, no API key.

**Then restart your agent.** MCP tools load at startup; until you restart, your agent cannot see
Kage's tools.

### Confirm it actually worked

```bash
kage setup verify-agent --agent claude-code --project .
```

Do not skip this. "Installed" and "live in your agent session" are different states, and the whole
point of Kage is not trusting claims you have not checked.

---

## The proxy (optional, but it is the good path)

Hooks work with no extra process. The proxy gives you exact measurement and works with agents that
have no hook system.

```bash
kage up            # background proxy + runtime, audit mode
kage status --project .
kage down          # when you are done
```

`kage up` starts the proxy **in the background** — it survives closing your terminal. Re-running it
verifies the recorded proxy is genuinely alive (pid *and* port, never the state file alone) and
reuses it. A machine reboot stops it; there is no system service, so run `kage up` once afterwards.

### Getting your agent to actually use it

Three options, best first:

```bash
# 1. Auto-attach: agents launched from this directory route through Kage on their own
kage setup claude-code --project . --write   # then restart the agent

# 2. Per-command, no setup
kage run -- claude

# 3. Manual
export ANTHROPIC_BASE_URL=http://localhost:8788
```

Then **verify**, because attachment fails silently in two ways:

```bash
kage status --project .   # read the `attach:` line
```

- **Auto-attach is per-directory.** The agent reads settings from the directory it was launched in.
  Wiring a worktree and running the agent from the parent repo attaches nothing.
- **The Claude desktop app cannot be attached this way.** It sets its own endpoint and never reads
  project settings — no restart will change that. Use a terminal agent or `kage run` for proxy
  coverage. Hooks still deliver memory there; what you lose is byte-level measurement and injection.

### Audit vs assist

`kage up` is **audit mode** by default: it measures and forwards your bytes unchanged. Nothing is
injected. When you want memory actually going into prompts:

```bash
kage up --mode assist
```

Audit first is the honest order — see what Kage *would* do before letting it do it.

---

## Daily use

**Mostly you do nothing.** Capture and recall are ambient. The commands below are for when you want
to look, not to make it work.

```bash
kage context "how do I run tests" --project .  # ask your memory directly
kage viewer --project .                        # local dashboard, live
kage status --project .                        # health + attachment + coverage
```

### When you learn something the agent will not catch

Automatic capture needs mechanical evidence (a fail→pass command pair) before it trusts a draft. A
*decision* — why you chose this approach, what you rejected — has no such signal. Write it down:

```bash
kage learn --project . \
  --type decision \
  --title "Why we do X instead of Y" \
  --learning "..." \
  --evidence "..." \
  --paths src/thing.ts
```

This is the highest-value thing you can personally do with Kage. Decisions and rejected approaches
exist nowhere but in your head; everything else the agent could eventually re-derive from the code.

### Reviewing what got captured

Drafts are **born pending** — they are not injected until reviewed.

```bash
kage inbox --project .    # what is waiting
kage review --project .   # approve or reject
kage quality --project .  # useful-memory ratio, duplicate burden, grounding coverage
```

---

## Working as a team

Memory is plain Markdown in your repo, so **git is the whole sync mechanism.** Commit
`.agent_memory/packets/` like any other source, and your teammate's next session starts with what
you learned.

```bash
kage pr check --project .   # gate: does this diff break what a memory claims?
kage team --project .       # contributors, pending review, stale-withheld, contradictions
```

Put `kage pr check` in CI. It is the piece that keeps memory from rotting silently: when your change
invalidates a stored claim, you hear about it *before* the PR lands.

Packet merge conflicts are auto-resolved by the merge driver `install` configured (newest content
wins), so shared memory does not create a conflict in every PR.

### If you want a shared server instead of git alone

```bash
kage cloud create-team --server <url> --name <name>
kage cloud link --project . --server <url> --team <id> --token <token>
kage cloud push --project .    # lands PENDING, not approved
kage cloud pull --project .    # re-verified locally on recall
```

A submitter **cannot approve their own packet**. Self-host it; there is no hosted service.

---

## Proving it is helping

Kage is built so you never have to take its word for anything.

```bash
kage report team --project .   # the lead-facing "is this helping?" report
kage gains --project .         # tokens + $ not re-spent, traceable to logged events
kage savings --project .       # deterministic token-reduction receipt, no LLM on the measurement path
kage receipts --project .      # per-task measured fields
kage metrics --project .       # raw counts: graph size, memory size, harness readiness
```

`kage report team` is the one to show a lead. Anything it cannot measure it reports as unavailable,
and any figure that *is* an estimate keeps an `_estimated` suffix so it can never be read as measured.

Read the numbers knowing this: **an unmeasured cost prints as `unavailable`, never as `0`.** If you
see `unavailable`, Kage genuinely does not know — that is the honest answer, not a bug.

---

## Troubleshooting

### "The agent does not seem to know anything"

```bash
kage setup verify-agent --agent claude-code --project .   # is the harness live at all?
kage status --project .                                   # attachment + coverage
kage context "<the thing it should know>" --project .     # is it in the store?
```

If `context` finds it but the agent did not use it, the delivery channel is the problem. If
`context` does not find it, it was never captured or is withheld as stale.

> `kage recall` still works but is **deprecated in v4** and prints a notice; `kage context` is the
> supported verb and returns memory, code graph, and knowledge graph in one call.

### "Memory I know exists is not being served"

It is almost certainly **stale-withheld** — the cited code changed, so Kage is refusing to serve a
claim it can no longer confirm. That is the feature working.

```bash
kage verify --project .                                    # what is stale and why
kage reverify --project . --packet <id> --evidence "..."   # re-ground it
```

A bare re-stamp on changed code is refused **by design**. Supply evidence.

### "The proxy is not being used"

```bash
kage status --project .   # the `attach:` line names what is actually in effect
```

Ground truth, when you want to see it with your own eyes:

```bash
printenv ANTHROPIC_BASE_URL              # what the running session actually resolved
tail .agent_memory/daemon/proxy.log      # real request lines, not just the startup banner
```

The settings file is not evidence. The environment and the log are.

### "Something is broken and I want it fixed"

```bash
kage doctor --project .    # health check
kage repair --project .    # fix broken packets and indexes
kage refresh --project .   # rebuild indexes, graphs, staleness
```

---

## Command map by intent

| I want to… | Command |
|---|---|
| set up a repo | `kage install` |
| prove the harness is live | `kage setup verify-agent` |
| turn the proxy on / off | `kage up` / `kage down` |
| run one agent through the proxy | `kage run -- <cmd>` |
| ask my memory something | `kage context "<query>"` |
| record a decision | `kage learn` |
| see everything visually | `kage viewer` |
| check health + attachment | `kage status` |
| review pending memory | `kage inbox`, `kage review` |
| gate a PR | `kage pr check` |
| see what it saved me | `kage gains`, `kage savings` |
| understand a new repo | `kage scan`, `kage xray`, `kage profile` |
| fix things | `kage doctor`, `kage repair`, `kage refresh` |

Everything else: `kage help --all`.

---

## What Kage never stores

Secrets, credentials, tokens, and PII are scanned out before writing. Anything wrapped in
`<private>…</private>` is never stored. Raw transcripts are never stored — only distilled,
source-backed learnings.
