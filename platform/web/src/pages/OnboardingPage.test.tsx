import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { OnboardingPage } from "./OnboardingPage";
import { fixtureRepository } from "../test/fixtures";

describe("OnboardingPage", () => {
  test("onboarding starts in audit mode and explains when requests will change", () => {
    render(<OnboardingPage detectedRepository={fixtureRepository()} />);
    expect(screen.getByText("Audit mode")).toBeInTheDocument();
    expect(screen.getByText(/does not modify agent requests/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Connect repository" }),
    ).toBeInTheDocument();
  });

  test("shows the detected repository so the operator confirms the target", () => {
    render(<OnboardingPage detectedRepository={fixtureRepository({ name: "acme" })} />);
    expect(screen.getByText(/acme/)).toBeInTheDocument();
  });

  test("presents the four explicit local setup steps", () => {
    render(<OnboardingPage detectedRepository={fixtureRepository()} />);
    const steps = screen.getByRole("list", { name: "Local setup steps" });
    const items = steps.querySelectorAll("li");
    expect(items).toHaveLength(4);
    expect(screen.getByText(/confirm the detected repository/i)).toBeInTheDocument();
    expect(screen.getByText(/choose supported agent adapters/i)).toBeInTheDocument();
    expect(screen.getByText(/start the daemon in audit mode/i)).toBeInTheDocument();
    expect(
      screen.getByText(/wait for the first health.*measurement receipt/i),
    ).toBeInTheDocument();
  });

  test("does not ask for a team account or GitHub write permission in the local flow", () => {
    render(<OnboardingPage detectedRepository={fixtureRepository()} />);
    expect(screen.queryByText(/team account/i)).toBeNull();
    expect(screen.queryByText(/github.*write/i)).toBeNull();
  });
});
