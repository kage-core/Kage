import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { BillingPage } from "./BillingPage";
import type { BillingPanelDto } from "../api/types";

// The billing page is the surface where an over-promise costs a customer real money, so its tests are
// about what it must NOT say: it must not show an uncalculated credit as $0.00, must not imply that a
// lapsed plan takes local operation or export away, and must not present the launch price list as a
// measurement or a permanent commitment.

function panel(overrides: Partial<BillingPanelDto> = {}): BillingPanelDto {
  return {
    plan_id: "team",
    state: "active",
    entitlements: {
      local_runtime: true,
      workspace_export: true,
      team_sync: true,
      team_review: true,
      github_checks: true,
      advanced_policy: false,
      sso: false,
      scim: false,
      self_host_support: false,
    },
    current_period_end: "2026-08-20T00:00:00.000Z",
    active_developers: 4,
    usd_per_active_developer_month: 29,
    credit_usd: null,
    credit_reason: null,
    measured_overhead_usd: null,
    caveats: ["Local context and workspace export stay available on every plan."],
    ...overrides,
  };
}

describe("BillingPage", () => {
  test("states the plan in force, the seats actually used, and the listed price", () => {
    render(<BillingPage billing={panel()} />);
    expect(screen.getByRole("heading", { name: /billing/i })).toBeInTheDocument();
    // Exact match: "team" is the plan in force, not the "Team sync" entitlement row.
    expect(screen.getByText("team", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText(/\$29/)).toBeInTheDocument();
  });

  test("an expired plan still shows local runtime and export as available", () => {
    render(
      <BillingPage
        billing={panel({
          plan_id: "local",
          state: "expired",
          entitlements: {
            local_runtime: true,
            workspace_export: true,
            team_sync: false,
            team_review: false,
            github_checks: false,
            advanced_policy: false,
            sso: false,
            scim: false,
            self_host_support: false,
          },
        })}
      />,
    );
    const entitlements = screen.getByRole("list", { name: /what this workspace can do/i });
    expect(within(entitlements).getByText(/local context/i)).toBeInTheDocument();
    expect(within(entitlements).getByText(/workspace export/i)).toBeInTheDocument();
    // The team features are shown as switched OFF, not hidden — the customer sees exactly what lapsed.
    expect(within(entitlements).getByText(/team sync/i)).toBeInTheDocument();
    expect(screen.getByText(/expired/i)).toBeInTheDocument();
  });

  test("an uncalculated pilot credit reads as not calculated, never as $0.00", () => {
    render(<BillingPage billing={panel({ credit_usd: null })} />);
    expect(screen.getByText(/not calculated/i)).toBeInTheDocument();
    expect(screen.queryByText("$0.00")).not.toBeInTheDocument();
  });

  test("a calculated credit shows the money, the reason, and the measurement behind it", () => {
    render(
      <BillingPage
        billing={panel({
          credit_usd: 12.5,
          credit_reason: "measured_positive_context_overhead",
          measured_overhead_usd: 12.5,
        })}
      />,
    );
    // The credited amount AND the measurement behind it are both shown.
    expect(screen.getAllByText("$12.50")).toHaveLength(2);
    expect(screen.getByText(/measured_positive_context_overhead/)).toBeInTheDocument();
  });

  test("a capped credit says the measurement was larger than what was credited", () => {
    render(
      <BillingPage
        billing={panel({
          credit_usd: 87,
          credit_reason: "capped_at_first_invoice_platform_fee",
          measured_overhead_usd: 500,
        })}
      />,
    );
    expect(screen.getByText("$87.00")).toBeInTheDocument();
    expect(screen.getByText(/\$500\.00/)).toBeInTheDocument();
    // Both the machine-readable reason and the plain-language explanation say it was capped.
    expect(screen.getAllByText(/capped/i).length).toBeGreaterThanOrEqual(2);
  });

  test("an enterprise tier shows no invented per-developer price", () => {
    render(
      <BillingPage billing={panel({ plan_id: "enterprise", usd_per_active_developer_month: null })} />,
    );
    expect(screen.getByText(/quoted/i)).toBeInTheDocument();
    expect(screen.queryByText(/\$0/)).not.toBeInTheDocument();
  });

  test("the backend caveats are rendered verbatim rather than summarised away", () => {
    const caveats = ["Local context and workspace export stay available on every plan.", "Second caveat."];
    render(<BillingPage billing={panel({ caveats })} />);
    for (const caveat of caveats) expect(screen.getByText(caveat)).toBeInTheDocument();
  });

  test("with no workspace connected the page says so instead of showing an empty plan", () => {
    render(<BillingPage billing={null} />);
    expect(screen.getByText(/no workspace connected/i)).toBeInTheDocument();
  });
});
