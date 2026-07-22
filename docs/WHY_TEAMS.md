# Why Teams Run Kage — Every Gain, With Its Proof

This is the team pitch with receipts. Each claimed gain links the measured, re-runnable evidence in
this repository. Anything we cannot prove is in the last section, labeled as such.

## The problem, measured

Coding agents re-derive your team's knowledge every session — and the expensive part is not what's
in the code. A live A/B (real agent, real proxy, real repo) measured it:

| Scenario | Without memory | With Kage memory |
|---|---|---|
| Fact IS in the code | 5/5 correct | 5/5 correct (−1.2% cost — noise) |
| Fact is NOT in the code (tribal) | **0/3 correct** | **3/3 correct, −41% cost, 8.3→3.3 turns** |

That second row is your onboarding doc that's stale, the deploy quirk only one engineer knows, the
alternative you rejected in March. Agents fail on it silently; Kage carries it.

## What a team gains (each with its proof)

1. **Agents stop failing on tribal knowledge.** The A/B above (`benchmarks/reuse-ab-live.mjs`).
   Capture is tuned to exactly that class: admission boosts what code cannot express and routes
   restatements-of-code to review (`mcp/derivability.test.ts`; store audit: reference dumps measure
   0.00 uses/packet — dead weight is filtered at the door).

2. **Injection you can trust in every prompt.** The gate injects nothing unless the top memory both
   carries multi-term evidence and spikes above the store's own noise band: false injection
   **0.667→0**, absent-topic **0.875→0**, precision 4×, recall held at 1.0
   (`npm run bench:injection -- --assert-baseline`). Every live decision is recorded, so your rate is
   in `kage report team`, not just our bench.

3. **A lead can see whether it's helping — in one command.** `kage report team`: recalls served,
   stale withheld (measured counts, separated from estimates), live injection rate + confidence,
   store composition by derivability, most-used memories, **dark areas** (subsystems with zero
   memory), review health. Run on this repo it surfaced 4 real dark areas and a top memory used 20×
   in 30 days (`mcp/team-report.test.ts`).

4. **It never lies to your agents.** Only verified/approved claims inject; a memory whose cited code
   changed is withheld with a stated reason (260 stale withholds recorded on this repo alone).
   Deterministic — no LLM on the verdict path.

5. **~93% smaller session requests, reversibly (opt-in).** History digestion reduces re-sent tool
   outputs to deterministic digests with exact originals retrievable: 92.93% final-turn / 93.33%
   whole-session measured on real bodies (`npm run bench:compression`), cache-stable by
   construction. Single-body compression honestly measures ~0% — we ship the number, not the wish.

6. **Every agent, one attach point.** `kage up` fronts Anthropic, OpenAI, and Gemini wires with the
   same injection + compression + honesty gates (21 provider tests; unknown providers pass through
   byte-preserving). No per-agent plugins to maintain.

7. **Team sync that can't leak or lie.** The workspace is tenant-keyed everywhere; sync is
   idempotent and approved-only; **raw prompts never leave the machine**; a proposer cannot approve
   their own high-impact claim; everything audited. Proven against a real PostgreSQL:
   cross-tenant reads 0, raw payloads synced 0, self-approvals 0, duplicate syncs 0, invalid
   webhooks 0, local context fully working during a workspace outage (`phase-e-gate.test.ts`).

8. **No lock-in.** Memory is OKF markdown in git — clone the repo, you have the team's memory.
   Export works even after a subscription expires (entitlement-tested).

## The honest boundary — what we do NOT claim

- No design-partner pilots have run; no paid conversion exists; the GA report says so and exits
  non-zero (`scripts/vnext-phase-e-report.mjs`).
- Live GitHub App / Stripe / OIDC-IdP interop is fixture-proven, not exercised against production
  accounts.
- The end-to-end token delta of injection (with-memory vs without, netting injection's own cost)
  is measured only in the A/B scenarios above — not yet across a whole team over weeks. That is
  exactly what `kage report team` + receipts exist to accumulate on your traffic.
- Memory's value is **conditional**: if your team's knowledge is fully in the code and docs, Kage's
  reuse gain will be small. It pays where knowledge is tribal — which is where teams bleed.
