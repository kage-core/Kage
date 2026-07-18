import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { App } from "./App";
import type { KageApiClient } from "./api/client";

// A fake API whose overview request never settles, so the shell stays in its loading state for the
// duration of the assertion — the exact condition the shell render contract must hold under.
const fakeApi = {
  pending(): KageApiClient {
    const never = () => new Promise<never>(() => {});
    return new Proxy({} as KageApiClient, {
      get: () => never,
    });
  },
};

describe("App shell", () => {
  test("renders repository navigation and a loading status", () => {
    render(<App api={fakeApi.pending()} />);
    expect(
      screen.getByRole("navigation", { name: "Repository knowledge" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading repository knowledge",
    );
  });
});
