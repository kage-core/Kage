import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { IntegrationsPage } from "./IntegrationsPage";
import { SettingsPage } from "./SettingsPage";
import { AdminDiagnosticsPage } from "./AdminDiagnosticsPage";
import { fixtureIntegration } from "../test/fixtures";

describe("IntegrationsPage", () => {
  test("shows adapter health by text, never color alone", () => {
    render(
      <IntegrationsPage
        integrations={[
          fixtureIntegration({ id: "anthropic-proxy", name: "Anthropic proxy", state: "degraded" }),
        ]}
      />,
    );
    expect(screen.getByRole("heading", { name: "Integrations" })).toBeInTheDocument();
    expect(screen.getByText("Anthropic proxy")).toBeInTheDocument();
    // StatusBadge carries the meaning in text.
    expect(screen.getByText("Degraded but attaching")).toBeInTheDocument();
  });

  test("an empty integration list states the reality rather than implying healthy silence", () => {
    render(<IntegrationsPage integrations={[]} />);
    expect(screen.getByText(/no integrations are attached/i)).toBeInTheDocument();
  });

  test("never renders raw diagnostics (packets, graph edges, database) on the main portal", () => {
    render(<IntegrationsPage integrations={[fixtureIntegration()]} />);
    expect(screen.queryByText(/raw graph edges/i)).toBeNull();
    expect(screen.queryByText(/packet files/i)).toBeNull();
    expect(screen.queryByText(/database diagnostics/i)).toBeNull();
  });
});

describe("SettingsPage", () => {
  test("shows the local privacy posture, retention, and budget as configured facts", () => {
    render(<SettingsPage />);
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByText(/audit mode/i)).toBeInTheDocument();
    expect(screen.getByText("Retention")).toBeInTheDocument();
    expect(screen.getByText("Privacy mode")).toBeInTheDocument();
    expect(screen.getByText("Budget")).toBeInTheDocument();
  });

  test("links to the segregated admin diagnostics surface rather than inlining raw data", () => {
    render(<SettingsPage />);
    const link = screen.getByRole("link", { name: /admin diagnostics/i });
    expect(link).toHaveAttribute("href", "/admin/diagnostics");
    // Settings itself never inlines raw packet/graph/database dumps.
    expect(screen.queryByText(/raw graph edges/i)).toBeNull();
    expect(screen.queryByText(/packet files/i)).toBeNull();
  });
});

describe("AdminDiagnosticsPage", () => {
  test("is the ONLY place raw packets, graph edges, checkpoints, and database diagnostics appear", () => {
    render(<AdminDiagnosticsPage />);
    const region = screen.getByRole("region", { name: /raw diagnostics/i });
    expect(within(region).getByText(/packet files/i)).toBeInTheDocument();
    expect(within(region).getByText(/raw graph edges/i)).toBeInTheDocument();
    expect(within(region).getByText(/compiler checkpoints/i)).toBeInTheDocument();
    expect(within(region).getByText(/database diagnostics/i)).toBeInTheDocument();
  });

  test("warns that this surface exposes low-level internals for operators only", () => {
    render(<AdminDiagnosticsPage />);
    expect(screen.getByText(/operators/i)).toBeInTheDocument();
  });
});
