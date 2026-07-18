# Kage vNext — context-budget preview (Phase D)

Phase A measured what Kage costs. Phase B compiled the repository model that context is drawn from.
**Phase D** inserts a deterministic, reversible transform between context composition and the wire —
it can compress bulky tool payloads and add repository context — and it proves, from measured
receipts, that the transform is **net-negative overhead**. This page is the operator's guide to that
transform, and to reading the cohort report without fooling yourself.

Enabling compression is a deliberate act. The default stays audit-mode, byte-identical, and
lossless. Nothing here mutates a prompt until you turn it on **and** the reversible/receipt storage
is healthy.

## The three modes

| mode | wire behaviour | what it may do |
| --- | --- | --- |
| `audit` | forwards your **exact bytes** | measures a candidate only; never mutates |
| `assist` | forwards the **transformed** body | adds repository context; may compress payloads (reversibly) |
| `protect` | forwards your **exact bytes** (like audit) | measured back-off; records a distinct reason |

`protect` is a separate axis from the wire `ProxyMode`: it behaves like audit at the wire (your
original bytes go to the provider) while persisting a distinct reason, so a back-off is attributable
and never conflated with a plain audit baseline.

## The honesty gates (enforced in code, not just documented)

1. **Reversible.** Every lossy transform stores the exact pre-compression bytes in the
   content-addressed store (`kage-content:<sha256>`) and embeds a retrieval reference beside the
   compressed output. `kage_retrieve` returns the fingerprint-verified original; a tampered object is
   a `502`, never silently-wrong bytes. No lossy output exists without a retrievable original.
2. **Measured savings, never estimated.** A token count is provider-measured or **null** — there is
   no estimator. The cohort's cost delta is taken only over receipts priced on **both** sides; a
   one-sided cost is unusable, never zero (`before − 0` would book the whole request as a saving).
3. **Fail-open, byte-preserving.** If the reversible store is unavailable or any transform throws, the
   pipeline forwards your **original bytes** and books no saving. `assist` refuses to start when
   reversible or receipt storage is unhealthy; `audit`/`protect` never gate on storage.
4. **Input economics stay separate from outcome trends.** The exact request cost/token deltas (what
   the transform did to the *prompt*) are reported apart from output-token and Kage-processing-cost
   trends. A change in model output is never read as a prompt saving.
5. **Protect backs off on measurement, not opinion.** A **measured** positive net cost delta or a p95
   latency over budget escalates to `protect` and records its reason. An **unmeasured** cohort holds
   the configured mode — absence is not health, and it is not harm.

## The cost cohort

`node scripts/vnext-phase-d-report.mjs --project <dir> [--json]` rolls the transformation receipts
into a cohort and evaluates the Phase D gate. It reads receipts through the same shipped reader the
CLI uses, so it cannot drift into its own more flattering arithmetic.

A net delta is `after − before`: **positive means Kage made the request larger or more expensive
(harm); negative is a saving.** The cohort reports, from measured receipts only:

- measurement coverage (exact / partial / unavailable);
- p50/p95 net **input** cost and token deltas, over two-sided-priced receipts only;
- p50/p95 local transformation latency;
- reversible-retrieval rate (share of receipts carrying a retrievable original);
- **separately:** Kage's own measured processing cost and the output-token trend.

An empty period reports `empty: true` with every value null — **not** a zero. "Nothing ran" and "it
ran and cost nothing" are different facts.

## The Phase D completion gate

Do **not** enable `assist` by default until every bullet holds on your target cohort:

- Every lossy transform retrieves an exact fingerprint-verified original.
- The system/tools/cache-stable prefix is preserved byte-for-byte.
- The cohort reaches **≥ 20 %** p50 provider-input cost reduction.
- Kage processing cost is **< 10 %** of the measured provider-input savings.
- Local transformation latency is **< 150 ms** p95.
- Protect mode automatically backs off and records its reason.
- The Minimal Change Guard is advisory by default; model-only findings cannot block.
- Exact request economics remain separate from outcome trends in every report.

The gate is enforced in `mcp/vnext/phase-d-gate.test.ts`, which replays ≥ 30 tool-heavy synthetic
tasks (free of secrets and customer code) against a fake provider and asserts byte preservation,
exact-original retrieval, invariant retention, verification, and the cost/latency thresholds above.
The report's `gate` block evaluates the same thresholds against your live receipts, showing
measured/target and whether each is met — or `unmeasured` when the cohort could not measure the
input, never a passing check on absent data.

## Turning it on

1. Run in `audit` first and collect a cohort. Read the report.
2. Confirm the gate bullets are met on your traffic.
3. Enable `assist` explicitly (`kage proxy --mode assist`); it refuses to start if reversible or
   receipt storage is unhealthy.
4. Keep watching the report. A measured-unhealthy cohort backs off to `protect` on its own and tells
   you why.
