# Who Kage Is For, and the Metrics That Prove It's Working

This document answers, with measured evidence: who uses Kage, what question each user needs
answered, which metric answers it, and where each metric comes from. It is grounded in this
repository's own production store (367 packets, audited 2026-07-21) and the committed benchmarks —
no aspirational numbers.

## 1. What the data says we should store (the empirical foundation)

The live reuse A/B (real agent runs through the real proxy) established the core truth:

> **Memory adds ~zero value when the fact is derivable from the code** (agent scores 5/5 either
> way), **and is transformative when it is not** (0/3 → 3/3 correct, −41% cost, 8.3 → 3.3 turns).

So the right memory is exactly what the repository cannot say for itself. Auditing the real
367-packet store against that lens:

| Class | Share | uses/packet (30d) | Verdict |
|---|---:|---:|---|
| Decisions with rationale (why, rejected alternatives) | 39.0% | 0.45 | High value — code shows *what*, never *why* |
| Gotchas / dead ends / negative results | 25.3% | 0.28 | High value, spiky — one recall can save hours; fires only when the trap is approached |
| Ops / verify recipes (how to run, prove, deploy) | 7.1% | **0.96** | **Highest sustained demand** — with plain runbooks at 1.43, operational how-to is what agents recall most |
| Bug fixes | 10.6% | 0.18 | Valuable when they carry cause + verification, not just the diff |
| Code explanations | 2.2% | 0.12 | **Derivable-risk: measured near-dead** — the agent can read the code |
| Reference dumps | 1.6% | **0.00** | **Measured dead weight** |
| Superseded (withheld) | 5.4% | 0.10 | Correctly out of recall |

Implications (each is now enforced or tracked, not aspirational):
- **Store**: rationale, rejected alternatives, tribal/ops knowledge, external-system quirks, dead
  ends, verification recipes, incident causes.
- **Don't store**: restatements of what cited code already says; raw dumps. Capture scores these
  down (see the derivability signal in capture quality scoring; eval: `bench:capture`).
- "Are we storing enough?" is measured by proxy: recall-miss + rediscovery signals in
  `kage report team` (below) — a question a lead can watch, not guess at.

## 2. Personas, their questions, and the metric that answers each

### IC developer (daily coding-agent user)
| Their question | Metric | Source |
|---|---|---|
| "Did memory actually help me just now?" | Per-session injection transparency: what attached, why, at what confidence | `RecallResult.injection` (confidence + why), recall receipts, portal session view |
| "Is it injecting junk into my prompts?" | False-injection rate **0**, absent-topic **0**, precision 0.636 | `bench:injection --assert-baseline` (drift-checked vs production) |
| "Is it bloating my context/cost?" | Measured byte/token deltas per request; history digestion ~93% on sessions (opt-in) | transformation receipts; `bench:compression` |
| "Will it corrupt my request if it breaks?" | Fail-open byte-preserving, audit byte-identical | phase gates A/D/E (enforced tests) |

### Team lead / EM
| Their question | Metric | Source |
|---|---|---|
| "Is shared memory actually helping the team?" | Rediscoveries avoided (recall-served with answer present), stale withheld, per-memory usage | value events + access ledger → `kage report team` |
| "Can I trust what's in it?" | Verified/approved share, contradiction count, review backlog age, self-approval impossible | trust states; review authority (403/409 enforced); workspace audit |
| "What did it cost / save, exactly?" | Exact measured cost deltas only; `empty_cohort` when unmeasured — never a fabricated $0 | receipts + cohort reports (Phase D/E) |
| "Where are we flying blind?" | Memory coverage by path area (subsystems with zero memory) | coverage section of `kage report team` |
| "Does onboarding get faster?" | Time-to-first-useful-recall in a fresh clone | onboarding sandbox measurement (`kage install` flow) |

### Platform / AI-tooling lead
| Their question | Metric | Source |
|---|---|---|
| "Does it cover our whole agent zoo?" | One proxy: Anthropic + OpenAI + Gemini wires, injection + compression on all three | provider adapter tests (21), surface certification (honest labels, no fake "automatic") |
| "Is team sync safe?" | cross_tenant_reads=0, raw_payloads_synced=0, duplicate_sync=0, invalid webhooks=0 | technical GA gate vs real PostgreSQL |
| "What happens when Kage is down?" | Local context + export fully working during workspace outage | GA gate fail-open assertions |
| "Lock-in?" | Store is OKF markdown in git; export always available (even after entitlement expiry) | OKF export; entitlement tests |

## 3. Why teams would use it (the honest pitch)

1. **It pays exactly where teams bleed**: tribal knowledge. The A/B shows agents fail (0/3) on
   facts that live in heads/Slack, and succeed (3/3, −41% cost) when Kage carries them. Code-derivable
   knowledge is deliberately NOT the pitch — agents read code fine.
2. **It refuses to lie**: only verified/approved claims inject; stale claims are withheld with a
   reason; "inject nothing" is a first-class outcome (false-injection measured to 0). Competing
   approaches (prompt files, RAG) have no verification or freshness story at all.
3. **Every number is a receipt**: costs are measured or absent; savings never estimated into
   existence. A lead gets `kage report team`, not a vibes dashboard.
4. **No lock-in, no ceremony**: memory is OKF markdown in git — a teammate who clones the repo
   already has it; the proxy is one command for every agent.

### vs. alternatives, honestly
| | CLAUDE.md / prompt files | RAG over docs | Vendor memory features | **Kage** |
|---|---|---|---|---|
| Verified against real code | ✗ | ✗ | ✗ | ✓ (deterministic, at write + recall) |
| Staleness detection/withholding | ✗ | ✗ | opaque | ✓ (measured, explained) |
| Works across all agents | ✓ (per-agent copies) | per-integration | single-vendor | ✓ (one proxy, three wires) |
| Team review authority | git review only | ✗ | ✗ | ✓ (self-approval blocked, versioned, audited) |
| Measured value receipts | ✗ | ✗ | ✗ | ✓ |
| Where it's weaker | zero setup | great for prose corpora | zero setup | needs the proxy in the loop; day-one store starts thin |

## 4. Metric gaps this document commits to closing
- **Live injection precision** (not just bench): log the production decision (confidence, inject/
  skip) into value events so `kage report team` shows the real-session rate. (T3)
- **Rediscovery/coverage**: recall-miss areas + zero-memory subsystems as a lead-facing list. (T3)
- **Time-to-first-useful-recall**: measured in a sandbox as part of the onboarding flow. (T4)
- **Per-session transparency UI**: "what attached to my session and why" in the portal. (T5)
