import type { BillingPanelDto } from "../api/types";

// The billing surface. It RENDERS the server's answer and computes nothing: the plan, the entitlements,
// the seat count, and the pilot credit are all resolved server-side from the stored subscription, so no
// value on this page can be influenced by the browser.
//
// Three honesty rules are visible here, and each is a test in BillingPage.test.tsx:
//
//   1. LOCAL RUNTIME AND EXPORT ARE NOT FOR SALE. They render as available in every state, including an
//      expired or cancelled plan. The team features that lapsed are shown switched OFF rather than
//      hidden, so a customer can see exactly what they lost and what they kept.
//
//   2. AN UNCALCULATED CREDIT IS NOT $0.00. A pilot credit that has never been computed reads "Not
//      calculated" — showing a confident zero would claim a measurement that was never taken. A CAPPED
//      credit states the measured overhead in full next to the smaller amount actually credited.
//
//   3. THE PRICE LIST IS A LAUNCH HYPOTHESIS, NOT A MEASUREMENT. The enterprise tier is quoted rather
//      than listed, and the page says so instead of printing an invented number.

interface BillingPageProps {
  /** The workspace's billing state, or null when no workspace is connected to this install. */
  billing: BillingPanelDto | null;
}

/** Money, always to cents. Used only for values the server actually computed. */
function usd(value: number): string {
  return `$${value.toFixed(2)}`;
}

const ENTITLEMENT_LABELS: Array<{ key: keyof BillingPanelDto["entitlements"]; label: string }> = [
  { key: "local_runtime", label: "Local context and agent runtime" },
  { key: "workspace_export", label: "Workspace export" },
  { key: "team_sync", label: "Team sync" },
  { key: "team_review", label: "Team review authority" },
  { key: "github_checks", label: "GitHub checks" },
  { key: "advanced_policy", label: "Advanced policy" },
  { key: "sso", label: "SSO (OIDC)" },
  { key: "scim", label: "SCIM provisioning" },
  { key: "self_host_support", label: "Self-host support" },
];

const STATE_LABELS: Record<BillingPanelDto["state"], string> = {
  active: "Active",
  expired: "Expired",
  none: "No subscription",
};

function EntitlementList({ billing }: { billing: BillingPanelDto }): React.ReactElement {
  return (
    <ul className="entitlement-list" aria-label="What this workspace can do">
      {ENTITLEMENT_LABELS.map(({ key, label }) => (
        <li key={key} className={billing.entitlements[key] ? "entitled" : "not-entitled"}>
          <span className="status-icon" aria-hidden="true">
            {billing.entitlements[key] ? "●" : "○"}
          </span>
          <span>{label}</span>
          <span className="entitlement-state">
            {billing.entitlements[key] ? "Available" : "Not on this plan"}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The no-overhead guarantee panel. Every branch of the server's `credit_reason` is stated in words: a
 * credit that exists, a credit that was capped, and — the important one — a credit that was never
 * calculated, which is reported as unknown rather than as zero.
 */
function PilotCreditPanel({ billing }: { billing: BillingPanelDto }): React.ReactElement {
  if (billing.credit_usd === null) {
    return (
      <p className="muted">
        Not calculated. The no-overhead credit is computed from measured pilot receipts; none have been
        evaluated for this workspace yet.
      </p>
    );
  }
  const capped = billing.credit_reason === "capped_at_first_invoice_platform_fee";
  return (
    <>
      <p className="credit-amount">
        <strong>{usd(billing.credit_usd)}</strong> credit
      </p>
      <dl className="credit-meta">
        <div>
          <dt>Reason</dt>
          <dd>
            <code>{billing.credit_reason}</code>
          </dd>
        </div>
        <div>
          <dt>Measured overhead</dt>
          <dd>
            {billing.measured_overhead_usd === null
              ? "Not measured"
              : usd(billing.measured_overhead_usd)}
          </dd>
        </div>
      </dl>
      {capped && (
        <p className="credit-cap-note">
          The measured overhead was larger than the credit: the guarantee is capped at the platform fee
          on your first invoice, so it can waive that fee but never becomes a cash payment.
        </p>
      )}
    </>
  );
}

export function BillingPage({ billing }: BillingPageProps): React.ReactElement {
  if (!billing) {
    return (
      <section aria-labelledby="billing-heading">
        <h1 id="billing-heading">Billing</h1>
        <p className="muted">
          No workspace connected. Kage runs locally with no subscription; billing appears once this
          install is linked to a Kage workspace.
        </p>
      </section>
    );
  }

  return (
    <section className="billing-page" aria-labelledby="billing-heading">
      <h1 id="billing-heading">Billing</h1>

      <dl className="billing-summary">
        <div>
          <dt>Plan</dt>
          <dd className="plan-name">{billing.plan_id}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{STATE_LABELS[billing.state]}</dd>
        </div>
        <div>
          <dt>Active developers this month</dt>
          <dd>{billing.active_developers}</dd>
        </div>
        <div>
          <dt>Listed price</dt>
          <dd>
            {billing.usd_per_active_developer_month === null
              ? "Quoted, not listed"
              : `${usd(billing.usd_per_active_developer_month)} per active developer per month`}
          </dd>
        </div>
        <div>
          <dt>Current period ends</dt>
          <dd>{billing.current_period_end ? billing.current_period_end.slice(0, 10) : "Not applicable"}</dd>
        </div>
      </dl>

      <p className="muted">
        An active developer is someone who started an agent task or made a knowledge review decision
        this month. Read-only viewers never consume a paid seat.
      </p>

      <h2>What this workspace can do</h2>
      <EntitlementList billing={billing} />

      <h2>No-overhead pilot credit</h2>
      <PilotCreditPanel billing={billing} />

      {billing.caveats.length > 0 && (
        <>
          <h2>What these numbers do and do not mean</h2>
          <ul className="billing-caveats">
            {billing.caveats.map((caveat) => (
              <li key={caveat}>{caveat}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
