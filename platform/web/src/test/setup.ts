// Vitest global setup: extend `expect` with jest-dom matchers (toBeInTheDocument, toHaveTextContent,
// ...) and clean up the DOM between tests so component renders never leak across cases.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
