import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { TaskReceiptPage } from "./TaskReceiptPage";
import { AgentTasksPage } from "./AgentTasksPage";
import { CostBreakdown } from "../components/CostBreakdown";
import { fixtureTaskReceipt, fixtureTaskSummary } from "../test/fixtures";

describe("TaskReceiptPage honesty", () => {
  test("receipt separates exact request savings from outcome trends", () => {
    render(<TaskReceiptPage receipt={fixtureTaskReceipt()} />);
    expect(
      screen.getByRole("heading", { name: "Exact request measurements" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Task outcomes" })).toBeInTheDocument();
    // The one dishonesty this page must never commit: a single fused ROI / value number.
    expect(screen.queryByText(/total value created/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/total roi/i)).not.toBeInTheDocument();
  });

  test("receipt links every injected section to evidence", () => {
    render(<TaskReceiptPage receipt={fixtureTaskReceipt()} />);
    expect(
      screen.getAllByRole("link", { name: /view evidence/i }).length,
    ).toBeGreaterThan(0);
  });

  test("an unmeasured outcome renders Unavailable, never a fabricated zero", () => {
    render(<TaskReceiptPage receipt={fixtureTaskReceipt()} />);
    const outcomes = screen.getByRole("region", { name: /task outcomes/i });
    expect(within(outcomes).getByText("Unavailable")).toBeInTheDocument();
    expect(within(outcomes).queryByText("$0.00")).not.toBeInTheDocument();
  });

  test("a one-sided request row shows an unavailable cost, not a fabricated saving", () => {
    render(<TaskReceiptPage receipt={fixtureTaskReceipt()} />);
    const table = screen.getByRole("table", { name: /per-request measurements/i });
    const oneSided = within(table).getByText("req-one").closest("tr");
    expect(oneSided).not.toBeNull();
    // The one-sided request reports Unavailable for both cost and tokens, never a fabricated saving.
    expect(within(oneSided as HTMLElement).getAllByText("Unavailable").length).toBeGreaterThan(0);
  });

  test("the receipt timeline lists task start through task end", () => {
    render(<TaskReceiptPage receipt={fixtureTaskReceipt()} />);
    const timeline = screen.getByRole("region", { name: /timeline/i });
    expect(within(timeline).getAllByText(/task started/i).length).toBeGreaterThan(0);
    expect(within(timeline).getAllByText(/task ended/i).length).toBeGreaterThan(0);
  });
});

describe("CostBreakdown", () => {
  test("renders exact and cohort metrics under distinct exactness labels", () => {
    render(<CostBreakdown receipt={fixtureTaskReceipt()} />);
    expect(screen.getByText("Net input cost")).toBeInTheDocument();
    expect(screen.getAllByText("Exact request measurement").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cohort trend").length).toBeGreaterThan(0);
  });
});

describe("AgentTasksPage", () => {
  test("lists tasks with a link to each task receipt", () => {
    render(
      <AgentTasksPage
        tasks={[fixtureTaskSummary({ task_id: "task-42", agent_surface: "proxy" })]}
      />,
    );
    expect(screen.getByRole("link", { name: /task-42/i })).toHaveAttribute(
      "href",
      "/tasks/task-42",
    );
  });

  test("an empty task list says so honestly rather than rendering nothing", () => {
    render(<AgentTasksPage tasks={[]} />);
    expect(screen.getByText(/no agent tasks/i)).toBeInTheDocument();
  });
});
