import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { FeaturePage } from "./FeaturePage";
import { RunbookPage } from "./RunbookPage";
import { DecisionPage } from "./DecisionPage";
import { EvidenceList } from "../components/EvidenceList";
import { KnowledgeHealth } from "../components/KnowledgeHealth";
import {
  fixtureDecision,
  fixtureEvidence,
  fixtureFeature,
  fixtureHealth,
  fixtureRunbook,
} from "../test/fixtures";

describe("FeaturePage", () => {
  test("feature page leads with purpose flow invariants tests and runbooks", () => {
    render(<FeaturePage feature={fixtureFeature()} />);
    for (const heading of [
      "Purpose",
      "Flow",
      "Invariants",
      "Verification",
      "Runbooks",
      "Recent changes",
      "Knowledge health",
    ]) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }
  });

  test("current truth never contains a stale claim; the stale claim is shown but labelled under history", () => {
    render(<FeaturePage feature={fixtureFeature()} />);
    const staleText = "Bearer tokens are cached in-process for 24 hours.";

    // The current-truth region carries only injectable claims — the stale claim must be absent.
    const currentTruth = screen.getByRole("region", { name: "Current truth" });
    expect(within(currentTruth).queryByText(staleText)).toBeNull();

    // The stale claim is not hidden: it appears in the history/uncertainty region, explicitly
    // labelled Stale so a reader never mistakes it for current behaviour.
    const history = screen.getByRole("region", { name: "History and uncertainty" });
    expect(within(history).getByText(staleText)).toBeInTheDocument();
    expect(within(history).getByText("Stale")).toBeInTheDocument();
  });

  test("current invariant claim renders inside the current-truth region", () => {
    render(<FeaturePage feature={fixtureFeature()} />);
    const currentTruth = screen.getByRole("region", { name: "Current truth" });
    expect(
      within(currentTruth).getByText(
        "A request without a valid bearer token is rejected with 401 before any handler runs.",
      ),
    ).toBeInTheDocument();
  });

  test("evidence links resolve to the source record", () => {
    render(<FeaturePage feature={fixtureFeature()} />);
    const link = screen.getAllByRole("link", { name: /server\.ts/ })[0];
    expect(link).toHaveAttribute("href", "mcp/vnext/runtime/server.ts");
  });
});

describe("RunbookPage", () => {
  test("runbook marks missing successful execution evidence", () => {
    render(<RunbookPage runbook={fixtureRunbook({ last_successful_execution: null })} />);
    expect(
      screen.getByText("No successful execution has been recorded"),
    ).toBeInTheDocument();
  });

  test("runbook shows a recorded successful execution when one exists", () => {
    render(
      <RunbookPage
        runbook={fixtureRunbook({ last_successful_execution: "2026-07-17T09:30:00.000Z" })}
      />,
    );
    expect(
      screen.queryByText("No successful execution has been recorded"),
    ).toBeNull();
    expect(screen.getByText(/2026-07-17/)).toBeInTheDocument();
  });

  test("runbook exposes its safety-critical sections", () => {
    render(<RunbookPage runbook={fixtureRunbook()} />);
    for (const heading of ["Steps", "Rollback", "Escalation", "Knowledge health"]) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }
  });
});

describe("DecisionPage", () => {
  test("decision shows status rationale supersession and approver", () => {
    render(<DecisionPage decision={fixtureDecision()} />);
    for (const heading of ["Rationale", "Affected entities", "Supersedes", "Knowledge health"]) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }
    // The approver of the current claim is shown, not implied.
    expect(screen.getByText("human:kushal")).toBeInTheDocument();
  });

  test("a superseded decision claim is labelled and kept out of current truth", () => {
    render(<DecisionPage decision={fixtureDecision()} />);
    const supersededText = "Add migration 006 with an INTEGER version column on review_items.";
    const currentTruth = screen.getByRole("region", { name: "Current truth" });
    expect(within(currentTruth).queryByText(supersededText)).toBeNull();
    const history = screen.getByRole("region", { name: "History and uncertainty" });
    expect(within(history).getByText(supersededText)).toBeInTheDocument();
    expect(within(history).getByText("Superseded")).toBeInTheDocument();
  });

  test("a decision with no recorded approver says so, never inventing one", () => {
    render(<DecisionPage decision={fixtureDecision({ approved_by: null })} />);
    expect(screen.getByText("No approver recorded")).toBeInTheDocument();
  });
});

describe("EvidenceList", () => {
  test("renders each anchor as a link to its source with verification and stance", () => {
    render(<EvidenceList evidence={[fixtureEvidence()]} />);
    expect(screen.getByRole("link", { name: /server\.ts/ })).toHaveAttribute(
      "href",
      "mcp/vnext/runtime/server.ts",
    );
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByText("Supports")).toBeInTheDocument();
  });

  test("empty evidence is stated honestly, not omitted", () => {
    render(<EvidenceList evidence={[]} />);
    expect(screen.getByText("No evidence anchors recorded")).toBeInTheDocument();
  });
});

describe("KnowledgeHealth", () => {
  test("reports verified stale disputed counts and missing required fields", () => {
    render(<KnowledgeHealth health={fixtureHealth({ verified: 2, stale: 1, disputed: 0 })} />);
    expect(screen.getByText("Missing required: tests")).toBeInTheDocument();
    // The stale count is surfaced as its own labelled figure (not merged into current truth).
    const stale = screen.getByText("Stale").closest("div")!;
    expect(within(stale).getByText("1")).toBeInTheDocument();
  });

  test("a fully covered entity says nothing is missing", () => {
    render(<KnowledgeHealth health={fixtureHealth({ missing_required_fields: [] })} />);
    expect(screen.getByText("No required fields missing")).toBeInTheDocument();
  });
});
