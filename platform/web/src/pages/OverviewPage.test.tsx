import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { OverviewPage } from "./OverviewPage";
import { MetricCard } from "../components/MetricCard";
import { AttentionQueue } from "../components/AttentionQueue";
import { IntegrationStrip } from "../components/IntegrationStrip";
import {
  fixtureAttention,
  fixtureIntegration,
  fixtureMetric,
  fixtureOverview,
  fixtureTeamPanel,
} from "../test/fixtures";

describe("MetricCard honesty", () => {
  test("a privacy-withheld metric says it is withheld and why", () => {
    render(
      <MetricCard
        metric={fixtureMetric({
          id: "team_time_to_verified_change",
          value: null,
          unit: "milliseconds",
          exactness: "unavailable",
          suppression_reason: "minimum_cohort_5",
        })}
      />,
    );
    expect(screen.getByText("Withheld")).toBeInTheDocument();
    expect(screen.getByText(/minimum_cohort_5/)).toBeInTheDocument();
    expect(screen.queryByText("Unavailable")).not.toBeInTheDocument();
  });

  test("unavailable cost is displayed as unavailable instead of zero", () => {
    render(
      <MetricCard
        metric={fixtureMetric({ id: "net_context_cost", value: null, exactness: "unavailable" })}
      />,
    );
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
    expect(screen.queryByText("$0.00")).not.toBeInTheDocument();
  });

  test("metric explanation exposes formula and source", () => {
    render(<MetricCard metric={fixtureMetric()} />);
    fireEvent.click(screen.getByRole("button", { name: /how this is measured/i }));
    expect(screen.getByText(/formula/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /view source records/i }),
    ).toBeInTheDocument();
  });

  test("the measured value carries a visible exactness label", () => {
    render(
      <MetricCard
        metric={fixtureMetric({ value: 62.5, unit: "percent", exactness: "cohort" })}
      />,
    );
    expect(screen.getByText("Cohort trend")).toBeInTheDocument();
  });

  test("explanation is collapsed until requested", () => {
    render(<MetricCard metric={fixtureMetric()} />);
    expect(screen.queryByRole("link", { name: /view source records/i })).toBeNull();
    const toggle = screen.getByRole("button", { name: /how this is measured/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});

describe("AttentionQueue", () => {
  test("lists attention items with a link to act on them", () => {
    render(
      <AttentionQueue
        items={[fixtureAttention({ title: "1 high-impact claim awaiting review", href: "/review" })]}
      />,
    );
    expect(
      screen.getByText("1 high-impact claim awaiting review"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /awaiting review/i })).toHaveAttribute(
      "href",
      "/review",
    );
  });

  test("an empty queue says so honestly rather than rendering nothing", () => {
    render(<AttentionQueue items={[]} />);
    expect(screen.getByText(/nothing needs attention/i)).toBeInTheDocument();
  });
});

describe("IntegrationStrip", () => {
  test("renders each integration state as text, not color alone", () => {
    render(
      <IntegrationStrip
        integrations={[
          fixtureIntegration({ name: "Anthropic proxy", state: "passthrough" }),
        ]}
      />,
    );
    expect(screen.getByText("Anthropic proxy")).toBeInTheDocument();
    expect(screen.getByText("Passing through, not attaching")).toBeInTheDocument();
  });

  test("no integrations reports the disconnected reality", () => {
    render(<IntegrationStrip integrations={[]} />);
    expect(screen.getByText(/no integrations/i)).toBeInTheDocument();
  });
});

describe("OverviewPage", () => {
  test("shows repository identity at the top", () => {
    render(
      <OverviewPage
        overview={fixtureOverview({
          repository: {
            id: "repo-1",
            name: "kage",
            branch: "main",
            commit: "abc1234",
          },
        })}
      />,
    );
    const banner = screen.getByRole("region", { name: /repository/i });
    expect(within(banner).getByText("kage")).toBeInTheDocument();
    expect(within(banner).getByText("main")).toBeInTheDocument();
    expect(within(banner).getByText(/abc1234/)).toBeInTheDocument();
  });

  test("renders every overview metric as its own card", () => {
    render(<OverviewPage overview={fixtureOverview()} />);
    expect(screen.getByText("Net context cost")).toBeInTheDocument();
    expect(screen.getByText("Verified reuse")).toBeInTheDocument();
    expect(screen.getByText("Time to verified change")).toBeInTheDocument();
    expect(screen.getByText("Runbook health")).toBeInTheDocument();
  });

  test("an unavailable metric never renders a fabricated zero implying success", () => {
    render(<OverviewPage overview={fixtureOverview()} />);
    // net_context_cost is measured; time_to_verified_change + attach_reliability are unavailable.
    expect(screen.queryByText("$0.00")).not.toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
    // At least one metric shows the honest "Unavailable" state.
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
  });

  test("says no workspace is connected instead of showing an empty team", () => {
    render(<OverviewPage overview={fixtureOverview({ team: null })} />);
    const team = screen.getByRole("region", { name: /team/i });
    expect(within(team).getByText(/no workspace connected/i)).toBeInTheDocument();
    // An absent team is never rendered as a team that did nothing.
    expect(within(team).queryByText("0")).not.toBeInTheDocument();
  });

  test("renders team scope and caveats alongside the team metrics", () => {
    render(<OverviewPage overview={fixtureOverview({ team: fixtureTeamPanel() })} />);
    const team = screen.getByRole("region", { name: /team/i });
    expect(within(team).getByText(/12 tasks/i)).toBeInTheDocument();
    expect(within(team).getByText(/3 repositories/i)).toBeInTheDocument();
    expect(within(team).getByText(/2 agents/i)).toBeInTheDocument();
    expect(within(team).getByText("Team net context cost")).toBeInTheDocument();
    expect(within(team).getByText(/never multiplied into a single savings number/i)).toBeInTheDocument();
  });

  test("a suppressed team cohort is labeled withheld, not measured as zero", () => {
    render(
      <OverviewPage
        overview={fixtureOverview({
          team: fixtureTeamPanel({
            tasks: 3,
            suppression_reason: "minimum_cohort_5",
            metrics: [
              fixtureMetric({
                id: "team_time_to_verified_change",
                label: "Time to verified change",
                value: null,
                unit: "milliseconds",
                exactness: "unavailable",
                trend: null,
                suppression_reason: "minimum_cohort_5",
              }),
            ],
          }),
        })}
      />,
    );
    const team = screen.getByRole("region", { name: /team/i });
    // Both the panel-level notice and the card itself say so.
    expect(within(team).getAllByText(/withheld/i).length).toBeGreaterThan(0);
    expect(within(team).getAllByText(/minimum_cohort_5/i).length).toBeGreaterThan(0);
    expect(within(team).queryByText("0ms")).not.toBeInTheDocument();
  });

  test("a workspace with no data reads as unmeasured, never as withheld for privacy", () => {
    // Regression guard for the backend fix: an empty window carries NO suppression reason, so neither
    // the panel notice nor any card may claim the numbers are being hidden. A brand-new team being told
    // its metrics are "withheld for privacy" is the exact confusion the withheld label exists to avoid.
    render(
      <OverviewPage
        overview={fixtureOverview({
          team: fixtureTeamPanel({
            tasks: 0,
            repositories: 0,
            agents: 0,
            suppression_reason: null,
            metrics: [
              fixtureMetric({
                id: "team_time_to_verified_change",
                label: "Time to verified change",
                value: null,
                unit: "milliseconds",
                exactness: "unavailable",
                trend: null,
                suppression_reason: null,
              }),
            ],
          }),
        })}
      />,
    );
    const team = screen.getByRole("region", { name: /team/i });
    expect(within(team).queryByText(/withheld/i)).not.toBeInTheDocument();
    expect(within(team).queryByText(/minimum_cohort/i)).not.toBeInTheDocument();
    expect(within(team).getAllByText(/unavailable/i).length).toBeGreaterThan(0);
  });

  test("surfaces the attention queue and integration health", () => {
    render(<OverviewPage overview={fixtureOverview()} />);
    expect(
      screen.getByRole("region", { name: /needs attention/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: /integrations/i }),
    ).toBeInTheDocument();
  });
});
