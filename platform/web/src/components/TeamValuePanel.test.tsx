import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { TeamValuePanel } from "./TeamValuePanel";
import type { TeamReportDto } from "../api/types";

// T5 — the lead/IC panel keeps the same honesty contract as the CLI report: measured counts and
// estimated tokens never blur; an unexercised gate says so; "injected nothing" decisions render.

function fixtureReport(overrides: Partial<TeamReportDto> = {}): TeamReportDto {
  return {
    generated_for: "/repo",
    value: { recalls_served: 12, stale_withheld: 4, tokens_saved_estimated: 90000, replay_tokens_estimated: 8000 },
    injection_gate: {
      available: true,
      gates: 10,
      injected: 6,
      injection_rate: 0.6,
      average_confidence: 0.71,
      note: "live corpus-normalized gate decisions recorded by the proxy",
      recent: [
        { at: "2026-07-21T10:00:00.000Z", injected: true, confidence: 0.8 },
        { at: "2026-07-21T10:05:00.000Z", injected: false, confidence: 0.3 },
      ],
    },
    composition: {
      total_packets: 40,
      non_derivable_share: 0.7,
      derivable_risk_share: 0.05,
      classes: [{ class: "non-derivable: decision+rationale", count: 20, uses_30d: 15 }],
    },
    top_memories: [{ title: "Run the tests", type: "runbook", uses_30d: 9 }],
    coverage: { areas: 5, dark_areas: ["deploy", "evals"], note: "top-level areas with no approved memory citing them" },
    review_health: { pending: 2, oldest_pending_days: 3, contradictions: 0 },
    ...overrides,
  };
}

describe("TeamValuePanel", () => {
  test("renders measured counts apart from labelled estimates, dark areas, and review health", () => {
    render(<TeamValuePanel report={fixtureReport()} />);
    expect(screen.getByText("Recalls served").nextElementSibling).toHaveTextContent("12");
    expect(screen.getByText(/Estimated \(labelled, never mixed with measured\)/)).toBeInTheDocument();
    expect(screen.getByText(/deploy, evals/)).toBeInTheDocument();
    expect(screen.getByText(/2 pending \(oldest 3d\), 0 contradiction/)).toBeInTheDocument();
  });

  test("IC transparency: recent decisions include the injected-nothing ones", () => {
    render(<TeamValuePanel report={fixtureReport()} />);
    expect(screen.getByText(/6\/10 requests injected \(rate 0.6\)/)).toBeInTheDocument();
    expect(screen.getByText(/injected nothing · confidence 0.3/)).toBeInTheDocument();
  });

  test("an unexercised gate says so instead of fabricating a healthy state", () => {
    const report = fixtureReport();
    report.injection_gate = {
      available: false,
      gates: 0,
      injected: 0,
      injection_rate: null,
      average_confidence: null,
      note: "unavailable — no proxy traffic has exercised the injection gate yet",
      recent: [],
    };
    render(<TeamValuePanel report={report} />);
    expect(screen.getByText(/unavailable — no proxy traffic/)).toBeInTheDocument();
    expect(screen.queryByText(/requests injected/)).not.toBeInTheDocument();
  });

  test("a null report renders an honest unavailable state", () => {
    render(<TeamValuePanel report={null} />);
    expect(screen.getByRole("status")).toHaveTextContent(/Report unavailable/);
  });
});
