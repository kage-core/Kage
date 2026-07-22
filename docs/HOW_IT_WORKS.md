# How Kage works

This is the mechanism, end to end. If you want the practical "what do I type" version, read
[USING_KAGE.md](./USING_KAGE.md) first and come back here when something surprises you.

One principle runs through everything below, and it is the reason several parts are more awkward
than they could be: **every number Kage reports is a count of a reproducible check, never an
estimate.** When Kage cannot measure something it prints `unavailable`, not `0`.

---

## 1. The two delivery channels

Kage gets memory to your agent two different ways. They are independent, they have different
strengths, and **most confusion about Kage comes from not knowing which one is active.**

| | Proxy | Hooks |
|---|---|---|
| How it attaches | Your agent's API base URL points at Kage | Agent-native hook scripts (Claude Code today) |
| Coverage | Every request, any agent that speaks a supported API | Only agents with a hook system |
| What it can do | Read *and* rewrite the request bytes | Add context at defined moments |
| Measurement | Exact, byte-level, receipted | Event-level |
| Needs a running process | Yes (`kage up`) | No |

**The proxy** is the primary path. It sits between your agent and the model provider, so it works
without per-agent wiring and can measure exactly what it changed. It is the only channel that can
give you a byte-accurate answer to "what did this cost me."

**Hooks** are the fallback, and they are not a lesser one for capture — they see session events the
proxy cannot (which files you opened, which commands failed). Where they lose is measurement and
universality.

You can run both. They do not conflict: the proxy measures and rewrites requests, the hooks observe
the session.

### Knowing which one you have

```bash
kage status --project .
```

The `attach:` line answers it directly, including the two ways attachment silently fails:

- **It is per-directory.** The agent reads `.claude/settings.local.json` from *the directory it was
  launched in*. Wiring a git worktree while running the agent from the parent repo attaches nothing.
- **Some hosts resolve their own endpoint** and never read project settings — notably the Claude
  **desktop app**, which sets `ANTHROPIC_BASE_URL` itself. No restart will attach it. Use a terminal
  agent or `kage run -- <agent>` for proxy coverage there; hooks still deliver memory.

Kage reports both cases as *not attached* and names the endpoint actually in effect. It will not
report "wired" on the strength of a settings file it cannot confirm took effect.

---

## 2. The proxy in detail

```
your agent → kage proxy (localhost:8788) → api.anthropic.com / openai / gemini
                  ↓                              ↓
            inject memory                  capture the exchange
            record a receipt               update the store
```

### Modes

`kage up` defaults to **audit**. This is deliberate: the first thing Kage does in your repo should
not be changing your prompts.

| Mode | Forwards | Changes your request? | Use it to |
|---|---|---|---|
| `audit` | your exact bytes | **No** — byte-identical | Measure what Kage *would* do, risk-free |
| `assist` | the transformed request | Yes — injects verified memory | Actually get memory into prompts |
| `protect` | your **original** bytes | No | Measure a defensive transform without applying it |

Audit mode is tested for byte-identity, not asserted. `assist` refuses to start if reversible-content
or receipt storage is unhealthy — a mode that rewrites your requests will not run on a store that
cannot undo or account for it.

### Providers

The proxy is not Anthropic-only. A `ProviderGateway` seam adapts each wire format:

| Provider | Endpoint |
|---|---|
| Anthropic | `/v1/messages` |
| OpenAI-compatible | `/v1/chat/completions` |
| Gemini | `:generateContent` |

Each adapter supplies eligibility, parsing, live-zone location, token counting, usage extraction,
and serialization. Adding a provider means writing an adapter, not touching the pipeline.

### Cache safety — the live zone

Rewriting a prompt naively destroys provider prompt caching, which costs you far more than the
memory saves. So Kage never edits arbitrary parts of a request. It computes a **live zone** — the
mutable tail — and leaves the stable prefix **byte-identical**. Your cache breakpoints survive.

### Reversible compression

Long tool payloads are replaced by `kage-content:<sha256>` markers backed by a content-addressed
store, so the original bytes are always recoverable. If anything about that store is unhealthy, the
transform **fails open**: you get your original bytes, not a lossy request. Losing fidelity is never
the safe default.

History digestion applies the same idea to older turns: prefix tool payloads are digested
deterministically, guarded so re-digesting an already-digested history is a fixed point.

---

## 3. The write path — what gets stored, and what does not

Storing everything is what makes memory useless. Kage's capture path is mostly a series of refusals.

```
session events → observation (signal-scored) → distill (gate ≥0.4, dedupe)
    → draft, BORN PENDING → [grounded? + fail→pass evidence?] → approved | pending inbox
```

**Observations.** Hooks turn the session into prose: your prompts, each edit's content (where fixes
and conventions actually live), each command with its output. Every observation is signal-scored;
machine noise scores zero and is rejected.

**Distillation** runs on session end, gates at ≥0.4, dedupes, and writes drafts **born pending** —
never approved by default.

**Automatic approval requires mechanical evidence.** A draft is lifted to trusted recall only when it
cites real files, duplicates nothing, contradicts nothing, *and* the session contains a **fail→pass
command pair** — proof a real fix happened. Everything else waits in `kage review`.

**Explicit writes are checked too.** `kage learn` refuses citations to files that do not exist.
Secrets and PII are scanned out before anything is written. Wrap anything in `<private>…</private>`
and it is never stored.

### Derivability — the idea that decides what is worth storing

Memory value is conditional on where else the fact lives:

- **In the code already?** Value ≈ 0. The agent can read it. Storing it is noise.
- **Derivable with effort?** Some value — you saved a search.
- **Tribal — a decision, a rejected approach, a gotcha, a *why*?** This is the whole point. It exists
  nowhere but in someone's head, and it is what agents cannot rediscover.

Capture scoring is weighted toward the third category. `kage decisions` shows which decisions are
captured and which are missing.

---

## 4. The trust path — why memory does not rot

Every packet fingerprints what it cites: a whole-file hash **plus** anchors on the code symbols the
memory actually names (real identifiers only, never prose words).

| Event | Result |
|---|---|
| Cited code edited | **soft-stale** — withheld from recall until re-verified *with evidence* |
| Cited file deleted | **hard-stale** — withheld, garbage-collected after 30 days |
| Re-stamp attempt on changed code | **refused** — `kage reverify` demands evidence |

"Verified" is earned by an actual check, never granted at birth. No LLM sits on the verdict path —
the decision is deterministic and reproducible.

This is the layer OKF deliberately leaves out. OKF standardizes the *store*; Kage keeps it honest.

---

## 5. The read path — how recall decides

Three injection moments: **session start** (policy + a "previously…" digest), **every prompt** (top
verified packets and graph facts for what you asked), and **every file** the agent opens or edits
(packets citing that file).

Ranking trusts evidence over popularity:

- lexical match first
- a **damped** graph prior that cannot outvote a title match
- recency decay, so aged change-logs sink
- code-graph identifier grounding, so a query for `someFunction` finds the packet citing the file
  that *defines* it

Injection is corpus-normalized, which matters more than it sounds: a fixed score threshold either
floods a small store or starves a large one. Kage decides on a dual scale — absolute scores anchor
tiny corpora, term-evidence relevances form a z-band for large ones — with a query-coverage override.

**Stale memory never appears.** Every serve increments a real usage counter, which is what makes the
value reports countable rather than estimated.

---

## 6. The team path — git is the transport

The store is plain OKF Markdown committed in your repo, so **a teammate's clone is the memory
transfer.** No sync service, no account.

- A **merge driver** auto-resolves packet collisions (newest content wins), so memory does not
  produce conflicts in every PR.
- **`kage pr check`** gates merges: if your diff breaks what a memory claims, you hear about it
  before the PR lands, not after someone acts on a stale claim.
- Memory is reviewed in the same PR as the code, by the same reviewers.

For teams that want a shared server rather than git alone, `kage cloud` adds a review gate where **a
submitter cannot approve their own packet**.

---

## 7. Storage layout

Everything is under `.agent_memory/`:

| Path | What | Durable? |
|---|---|---|
| `packets/` | the memory itself — OKF Markdown | **yes, git-tracked** |
| `graph/`, `code_graph/`, `structural/`, `indexes/` | derived indexes | no — `kage refresh` rebuilds |
| `reports/` | value ledger, health reports | derived |
| `daemon/` | proxy + runtime state, logs | local only |

A packet is a self-describing OKF concept file: Markdown with YAML frontmatter, Kage's verification
metadata in OKF-legal `x-kage-*` fields. Any OKF consumer can read it, including Google's visualizer.
`kage export --format okf` renders the store as a bundle; `kage okf import` reads foreign ones. The
round-trip is lossless.

**You can always read your memory without Kage.** They are Markdown files in your repo.

---

## 8. What Kage refuses to do

Worth stating plainly, because these are design decisions and not gaps:

- **No estimated numbers.** Unmeasured cost prints as `unavailable`.
- **No self-approval.** Not for auto-capture (needs fail→pass evidence), not in team review.
- **No silent lossiness.** Every transform is reversible or it fails open.
- **No LLM on the verdict path.** Verification is deterministic and reproducible.
- **No silent attachment claims.** If Kage cannot confirm the proxy is in your request path, it says
  so — and names what is actually in effect.

---

## See also

- [USING_KAGE.md](./USING_KAGE.md) — the practical manual
- [TRUST.md](./TRUST.md) — the trust model in depth
- [MEMORY_ADMISSION.md](./MEMORY_ADMISSION.md) — exactly what is admitted and why
- [BENCHMARKS.md](./BENCHMARKS.md) — methodology behind every published number
- [COLLABORATIVE_MEMORY.md](./COLLABORATIVE_MEMORY.md) — the framework and its evidence
