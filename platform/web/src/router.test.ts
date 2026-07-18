import { describe, expect, test } from "vitest";
import { parseRoute, routeToPath, navLinks } from "./router";

describe("parseRoute", () => {
  test("maps the overview root", () => {
    expect(parseRoute("/")).toEqual({ page: "overview" });
    expect(parseRoute("/overview")).toEqual({ page: "overview" });
  });

  test("carries the system-map view, defaulting to feature", () => {
    expect(parseRoute("/system-map")).toEqual({ page: "system-map", view: "feature" });
    expect(parseRoute("/system-map?view=runtime")).toEqual({
      page: "system-map",
      view: "runtime",
    });
  });

  test("parses per-entity detail slugs", () => {
    expect(parseRoute("/features/checkout")).toEqual({
      page: "feature",
      slug: "checkout",
    });
    expect(parseRoute("/runbooks/rotate-keys")).toEqual({
      page: "runbook",
      slug: "rotate-keys",
    });
    expect(parseRoute("/decisions/adopt-okf")).toEqual({
      page: "decision",
      slug: "adopt-okf",
    });
    expect(parseRoute("/tasks/task-42")).toEqual({ page: "task", id: "task-42" });
  });

  test("parses the list and singleton pages", () => {
    expect(parseRoute("/features")).toEqual({ page: "features" });
    expect(parseRoute("/review")).toEqual({ page: "review" });
    expect(parseRoute("/settings")).toEqual({ page: "settings" });
  });

  test("unknown routes resolve to a not-found route carrying the path", () => {
    expect(parseRoute("/nope/here")).toEqual({ page: "not-found", path: "/nope/here" });
  });

  test("round-trips route to path", () => {
    expect(routeToPath({ page: "overview" })).toBe("/overview");
    expect(routeToPath({ page: "feature", slug: "checkout" })).toBe("/features/checkout");
    expect(routeToPath({ page: "system-map", view: "runtime" })).toBe(
      "/system-map?view=runtime",
    );
    expect(routeToPath({ page: "task", id: "task-42" })).toBe("/tasks/task-42");
  });
});

describe("navLinks", () => {
  test("declares the full information architecture in order", () => {
    expect(navLinks.map((l) => l.label)).toEqual([
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
    ]);
  });

  test("every nav href parses back to a real (non not-found) route", () => {
    for (const link of navLinks) {
      expect(parseRoute(link.href).page).not.toBe("not-found");
    }
  });
});
