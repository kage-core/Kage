# Kage design-partner pilot protocol

This is the exact protocol a Kage design partner runs before we will quote paid Team terms. It exists so
the commercial gate in the [GA checklist](./ga-checklist.md) is met by **measured reality**, never by a
sales story. Every number this protocol produces is recorded in `docs/commercial/pilot-cohort.json`,
which `scripts/vnext-phase-e-report.mjs` reads. Absent that file, the report honestly says pilots have
**not run** and the GA decision stays **NO-GO**.

> Nothing in this repository can complete this protocol. It requires real external partners, their real
> repositories, and real weeks. The code proves the *mechanism* is safe and honest; only a partner can
> prove the *value*.

## Who runs it

For **each of at least three** design partners, identify up front and record:

- **The buyer** — the person who can approve paid Team terms.
- **The success owner** — the engineer or lead accountable for the pilot inside the partner.
- **Written repository/data permission** — explicit, in writing, scoping which repositories and which
  measurement data leave the partner's local boxes. No pilot starts without it.

## The three-week measured protocol

1. **Written permission + roles (day 0).** Obtain the data-permission grant; name the buyer and success
   owner. Confirm the partner runs Kage locally (proxy-primary), so raw prompts and tool payloads never
   leave their machines — only approved model records and permitted measurements sync.
2. **Seven audit days.** Kage runs in **audit** mode: it measures, it does not transform. This establishes
   the partner's own baseline request economics on their own agent traffic.
3. **Review measurement coverage.** Identify which agent surfaces Kage could actually measure two-sided
   (input + processing). **Exclude unsupported surfaces from exact savings** — an unmeasured surface
   contributes `null`, never an assumed zero. This exclusion list is recorded.
4. **Fourteen assist days with protect mode on.** Kage runs in **assist** mode with **protect** enabled,
   so a measured-unhealthy cohort (positive net cost delta or p95 latency over budget) backs off
   automatically and records why.
5. **Measure, exactly:**
   - **Exact request economics** — input-cost and token deltas, on two-sided-priced receipts only.
   - **Verified reuse** — the rate at which recalled knowledge was reused and verified.
   - **Time-to-verified-change trend** — cohort-level, and only published at/above the minimum cohort.
   - **Review burden per task** — decisions per task.
   - **Attach reliability** — PR-check attach success/failure, and failed-open rate.
   - **Security incidents** — any tenant/raw-payload/authority incident (target: zero).
6. **Interviews.** Conduct developer, reviewer, and lead interviews. Capture the qualitative story the
   numbers cannot.
7. **Offer Team pricing** in the validated **USD 24–30 per active-developer-month** range (the
   `LAUNCH_PLANS` team price is 29). A viewer never consumes a seat.
8. **Record the outcome, honestly:** a paid conversion, a rejection with its reason, or the specific
   product change required to convert. A "no" with a reason is a valid, valuable pilot result.

## The no-overhead guarantee during the pilot

The pilot is offered under the [no-overhead pilot credit](./no-overhead-pilot.md). The credit is computed
**only** from exact measured positive input+processing overhead, is `null` (never `0`) when unmeasured,
and is **capped at the first invoice's platform fee** so it can waive our fee but can never become a cash
liability. If Kage measurably increases exact request cost over the enabled cohort, the guarantee pays it
back within that cap — that is the promise the pilot tests.

## Evidence file shape (`docs/commercial/pilot-cohort.json`)

The GA report reads this file if present. It is written by the operator running real pilots — never by
any script in this repo. Shape:

```json
{
  "partners": [
    {
      "partner": "acme",
      "buyer": "…",
      "success_owner": "…",
      "data_permission": "written-2026-08-01",
      "pilot_completed": true,
      "paid_conversion": true,
      "rejection_reason": null,
      "required_product_change": null,
      "exact_cost_delta_usd": -0.0021,
      "excluded_surfaces": ["…"]
    }
  ],
  "exact_cost_nonincrease_or_credit_proven": true,
  "distributions": { "…": "…" },
  "note": "…"
}
```

The commercial gate is **met** only when at least **three** partners have `pilot_completed: true`, at
least **one** has `paid_conversion: true`, and `exact_cost_nonincrease_or_credit_proven` is `true`
(measured, with data behind it). Anything less is **NO-GO**.
