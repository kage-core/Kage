import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { SystemMapPage } from "./SystemMapPage";
import { SystemMapTable } from "../components/SystemMapTable";
import { SystemMapSvg } from "../components/SystemMapSvg";
import { InspectorPanel } from "../components/InspectorPanel";
import { fixtureSystemMap } from "../test/fixtures";

describe("SystemMapPage accessibility parity", () => {
  test("has a table with the same nodes as the diagram", () => {
    render(<SystemMapPage model={fixtureSystemMap()} />);
    const table = screen.getByRole("table", { name: "System map list" });
    expect(table).toBeInTheDocument();
    // Every node in the diagram also appears as a table ROW HEADER — the a11y equivalent. (Node
    // names also recur as neighbor cells, so we anchor on the unique row-header cell.)
    for (const name of ["Authentication", "Token store", "Session record"]) {
      expect(within(table).getByRole("rowheader", { name })).toBeInTheDocument();
    }
  });

  test("the same node label appears in both the diagram and the table", () => {
    render(<SystemMapPage model={fixtureSystemMap()} />);
    // Present in the SVG label AND the table row — proof the two views are equivalent, not exclusive.
    expect(screen.getAllByText("Authentication").length).toBeGreaterThan(1);
  });
});

describe("SystemMapTable", () => {
  test("lists upstream and downstream relations per node, not just an edge dump", () => {
    render(<SystemMapTable rows={fixtureSystemMap().table} />);
    const tokenRow = screen.getByRole("rowheader", { name: "Token store" }).closest("tr")!;
    expect(within(tokenRow).getByText("Authentication")).toBeInTheDocument();
    expect(within(tokenRow).getByText("Session record")).toBeInTheDocument();
  });

  test("carries health as text, never color alone", () => {
    render(<SystemMapTable rows={fixtureSystemMap().table} />);
    expect(screen.getByText("Disputed")).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
  });

  test("links a node that has a page and shows plain text for one that does not", () => {
    render(<SystemMapTable rows={fixtureSystemMap().table} />);
    expect(screen.getByRole("link", { name: "Authentication" })).toHaveAttribute(
      "href",
      "/features/authentication",
    );
    // Session record has no detail page yet — it is rendered as text, not a broken link.
    expect(screen.queryByRole("link", { name: "Session record" })).toBeNull();
  });
});

describe("SystemMapSvg", () => {
  test("renders each node as a keyboard-focusable control with an accessible name", () => {
    render(<SystemMapSvg model={fixtureSystemMap()} selectedId={null} onSelect={() => {}} />);
    const node = screen.getByRole("button", { name: /Authentication/ });
    expect(node).toHaveAttribute("tabindex", "0");
  });

  test("selecting a node invokes the selection handler", () => {
    const onSelect = vi.fn();
    render(<SystemMapSvg model={fixtureSystemMap()} selectedId={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: /Token store/ }));
    expect(onSelect).toHaveBeenCalledWith("component-token");
  });
});

describe("InspectorPanel", () => {
  test("shows the selected node's kind, health, and relations", () => {
    const model = fixtureSystemMap();
    const node = model.lanes.flatMap((l) => l.nodes).find((n) => n.entity_id === "component-token")!;
    const row = model.table.find((r) => r.entity_id === "component-token")!;
    render(<InspectorPanel node={node} row={row} onExpand={() => {}} />);
    expect(screen.getByRole("heading", { name: "Token store" })).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByText("Authentication")).toBeInTheDocument();
    expect(screen.getByText("Session record")).toBeInTheDocument();
  });

  test("with nothing selected it prompts the reader honestly", () => {
    render(<InspectorPanel node={null} row={null} onExpand={() => {}} />);
    expect(screen.getByText(/select a node/i)).toBeInTheDocument();
  });
});

describe("SystemMapPage interaction", () => {
  test("switching the view invokes the view handler", () => {
    const onSelectView = vi.fn();
    render(<SystemMapPage model={fixtureSystemMap()} onSelectView={onSelectView} />);
    fireEvent.click(screen.getByRole("button", { name: "Ownership" }));
    expect(onSelectView).toHaveBeenCalledWith("ownership");
  });

  test("selecting a node in the diagram populates the inspector", () => {
    render(<SystemMapPage model={fixtureSystemMap()} />);
    fireEvent.click(screen.getByRole("button", { name: /Token store/ }));
    const inspector = screen.getByRole("complementary", { name: /inspector/i });
    expect(within(inspector).getByRole("heading", { name: "Token store" })).toBeInTheDocument();
  });

  test("announces that the view is windowed and offers to expand", () => {
    const onFocus = vi.fn();
    render(<SystemMapPage model={fixtureSystemMap()} onFocus={onFocus} />);
    expect(screen.getByText(/showing two hops/i)).toBeInTheDocument();
    // The truncated node offers an expand affordance that re-roots the window on it.
    fireEvent.click(screen.getByRole("button", { name: /Session record/ }));
    fireEvent.click(screen.getByRole("button", { name: /expand from this node/i }));
    expect(onFocus).toHaveBeenCalledWith("data-session");
  });
});
