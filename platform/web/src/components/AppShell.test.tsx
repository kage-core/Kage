import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { AppShell } from "./AppShell";
import { StatusBadge } from "./StatusBadge";
import { fixtureRepository } from "../test/fixtures";

describe("AppShell", () => {
  test("primary navigation exposes the product information architecture", () => {
    render(
      <AppShell repository={fixtureRepository()} route="/overview">
        <div />
      </AppShell>,
    );
    for (const label of [
      "Overview",
      "System Map",
      "Features",
      "Components",
      "Flows",
      "Runbooks",
      "Decisions",
      "Review Queue",
      "Agent Tasks",
      "Costs and Outcomes",
      "Integrations",
      "Settings",
    ]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  test("exposes banner, navigation, and main landmarks plus a skip link", () => {
    render(
      <AppShell repository={fixtureRepository()} route="/overview">
        <p>page body</p>
      </AppShell>,
    );
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Repository knowledge" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();

    const skip = screen.getByRole("link", { name: "Skip to main content" });
    expect(skip).toHaveAttribute("href", "#main-content");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
  });

  test("marks the active section with aria-current so it is not conveyed by style alone", () => {
    render(
      <AppShell repository={fixtureRepository()} route="/review">
        <div />
      </AppShell>,
    );
    expect(screen.getByRole("link", { name: "Review Queue" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  test("the skip link is the first focusable element and is natively focusable", () => {
    render(
      <AppShell repository={fixtureRepository()} route="/overview">
        <div />
      </AppShell>,
    );
    const focusable = screen.getByRole("link", { name: "Skip to main content" });
    // The skip link must be the first interactive element in the DOM so a keyboard
    // user reaches it before anything else.
    const interactive = document.querySelectorAll("a[href], button");
    expect(interactive[0]).toBe(focusable);
    // Anchors with href are natively keyboard-focusable; prove focus lands on it.
    focusable.focus();
    expect(focusable).toHaveFocus();
  });

  test("shows the current repository identity", () => {
    render(
      <AppShell repository={fixtureRepository({ name: "acme" })} route="/overview">
        <div />
      </AppShell>,
    );
    expect(screen.getByRole("button", { name: /acme/i })).toBeInTheDocument();
  });
});

describe("StatusBadge", () => {
  test("integration state is not conveyed by color alone", () => {
    render(<StatusBadge state="degraded" />);
    expect(screen.getByText("Degraded but attaching")).toBeInTheDocument();
  });

  test("every integration state carries a distinct human label", () => {
    const cases: Array<[Parameters<typeof StatusBadge>[0]["state"], string]> = [
      ["healthy", "Healthy and attaching"],
      ["degraded", "Degraded but attaching"],
      ["passthrough", "Passing through, not attaching"],
      ["disconnected", "Disconnected"],
    ];
    for (const [state, label] of cases) {
      const { unmount } = render(<StatusBadge state={state} />);
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    }
  });

  test("the status icon is decorative and hidden from assistive tech", () => {
    const { container } = render(<StatusBadge state="healthy" />);
    const icon = container.querySelector("[aria-hidden='true']");
    expect(icon).not.toBeNull();
  });
});
