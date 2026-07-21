# The no-overhead pilot guarantee

**Status: implemented in code, never exercised commercially.** No design-partner pilot has been run,
no credit has been issued to anyone, no live Stripe account is connected, and there is no cohort data
behind any number in this document. Everything below describes the mechanism and its limits. Nothing
below is a result.

## The promise, stated precisely

> If, during your pilot, Kage measurably **added** to your cost per request, we credit that measured
> overhead against the platform fee on your first invoice.

That sentence is deliberately narrow. Four words in it are load-bearing.

**"Measurably"** — the credit is computed only from receipts where Kage measured *both* sides of the
request: the input-cost delta (what your request cost with Kage's context attached, minus what it cost
without) *and* Kage's own processing cost. A receipt classed `partial` or `unavailable`, or an `exact`
receipt missing either number, is excluded from the calculation entirely. It cannot create a credit and
it cannot reduce one. Half a measurement is not a measurement, and a missing half is never silently read
as zero.

**"Added"** — the credit exists only when the measured net overhead is **positive**. If the measurement
shows Kage cost you less than not using it, the credit is `$0.00` with the reason
`no_measured_overhead`. There is no reverse case: the guarantee never charges you for a saving, and it
never produces a negative number.

**"Your cost per request"** — this is the exact, receipt-level request economics measured by
`mcp/vnext/measurement/`. It is **not** an engineering-time estimate, not a cohort trend, and not a
productivity model. Time-based figures are reported in milliseconds in a separate section of the pilot
report and are never converted into dollars unless *you* explicitly configure your own cost model — and
even then they are labelled `cohort_estimate` and kept apart from the exact request economics.

**"Against the platform fee on your first invoice"** — the credit is **capped** at the platform fee on
your first paid invoice. The guarantee can waive that fee entirely; it can never become a cash payment,
a refund of your model-provider spend, or a liability larger than what you paid us. If the measured
overhead exceeds the cap, the report states the measured figure **in full** next to the smaller amount
actually credited (`capped_at_first_invoice_platform_fee`) — the cap limits what we pay, never what we
admit we measured.

## What the calculation does, exactly

Implemented in `mcp/vnext/workspace/billing/entitlements.ts` (`calculatePilotCredit`), a pure function:

```
overhead = Σ over receipts where measurement_quality == "exact"
             AND net_input_cost_delta_usd is measured
             AND kage_processing_cost_usd is measured
           of (net_input_cost_delta_usd + kage_processing_cost_usd)

credit   = 0                                   if no such receipt exists   (no_exact_measurements)
         = 0                                   if overhead <= 0            (no_measured_overhead)
         = 0                                   if there is no first invoice (no_invoice_to_credit)
         = min(overhead, first_invoice_platform_fee)  otherwise
```

Every branch is machine-readable in the result's `reason`, and every result carries
`measured_overhead_usd` separately from `credit_usd`:

| Field                   | Meaning when null                                      |
| ----------------------- | ------------------------------------------------------ |
| `credit_usd`            | never null — this is a money decision, and "no credit" is `0` |
| `measured_overhead_usd` | **null means nothing measured it**, which is a different fact from a measured `0.00` |

The credit is persisted once per `(workspace_id, pilot_id)` by a unique key, so re-running the
calculation — a retried job, a re-imported receipt set, an operator repeating the command — can never
double-credit an account.

## What the customer keeps regardless

A pilot that ends without a purchase, a lapsed subscription, a failed payment, and a cancellation all
leave two things untouched:

- **Local runtime.** Your agents keep getting local context. The workspace is never on the low-latency
  local path, so a workspace outage — or no workspace at all — does not degrade it.
- **Workspace export.** Your knowledge remains exportable. Both are typed as literal `true` in
  `WorkspaceEntitlements`; the type system refuses any code that would make them conditional on payment.

Only the team-scoped features (team sync, team review authority, GitHub checks, advanced policy,
SSO/SCIM) switch off when a subscription lapses, and the billing page shows them switched off rather
than hiding them, so you can see exactly what changed.

## Pricing this is credited against

The launch catalog (`LAUNCH_PLANS`) is a **hypothesis**, not a measurement:

| Plan       | USD per active developer per month |
| ---------- | ---------------------------------- |
| local      | 0                                  |
| team       | 29                                 |
| business   | 59                                 |
| enterprise | quoted, not listed                 |

An **active developer** is a member who started an agent task or made a knowledge review decision during
the billing month. Read-only viewers are included on every tier and never consume a paid seat; the count
is computed server-side by `countActiveDevelopers`, not supplied by any client. The catalog may change
for new subscriptions without rewriting historical invoices, and the Stripe price ids that back it come
from deployment secrets rather than this repository.

## What has and has not been verified

**Verified in this repository, against a real ephemeral PostgreSQL and fixture Stripe payloads**
(`mcp/vnext/workspace/billing/billing.test.ts`):

- webhook signature verification over the raw bytes, in constant time, with a replay window, before any
  parse — a forged delivery is a 401 and leaves no record behind;
- exactly-once application by Stripe event id, claimed in the same transaction as the state change;
- entitlements resolved from stored server state; a client-supplied plan name grants nothing;
- an unrecognised Stripe price grants nothing;
- an expired/cancelled subscription keeps `local_runtime` and `workspace_export` true;
- the credit arithmetic above, including the cap, the exclusion of partial/unavailable receipts, and
  `measured_overhead_usd = null` for an unmeasured pilot;
- tenant scoping: another workspace's subscription, credits, and active-developer count are not
  readable, and the billing route answers 404 across a tenant boundary and 403 below owner authority.

**Not verified, and not claimed:**

- no live Stripe account, API key, product, price, invoice, or webhook endpoint has been exercised;
- no design-partner pilot has been run, so there is no cohort, no measured overhead from a real
  customer, and no credit that has ever been issued;
- no paid conversion exists.

Those gaps require real external parties over real weeks. They are reported as unmet by the Phase E GA
report, which exits non-zero rather than presenting an unrun pilot as a passing gate.
