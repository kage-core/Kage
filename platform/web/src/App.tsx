import { useEffect, useState } from "react";
import type { KageApiClient } from "./api/client";
import type { OverviewDto } from "./api/types";

// Loading state for the repository overview. Fuller routing, the design-token shell, and the
// per-section pages arrive in Task 3+. This minimal shell proves the contract the whole portal is
// built on: an accessible top-level navigation landmark and an honest, announced loading state that
// never implies data is present before the read-model has answered.
type LoadState =
  | { status: "loading" }
  | { status: "ready"; overview: OverviewDto }
  | { status: "error"; message: string };

export interface AppProps {
  api: KageApiClient;
}

const NAV_SECTIONS = [
  "Overview",
  "System map",
  "Features",
  "Review queue",
  "Task receipts",
  "Integrations",
] as const;

export function App({ api }: AppProps): React.ReactElement {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    api
      .overview()
      .then((overview) => {
        if (!cancelled) setState({ status: "ready", overview });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  return (
    <div className="kage-app">
      <nav aria-label="Repository knowledge">
        <ul>
          {NAV_SECTIONS.map((section) => (
            <li key={section}>{section}</li>
          ))}
        </ul>
      </nav>
      <main>
        {state.status === "loading" && (
          <p role="status" aria-live="polite">
            Loading repository knowledge…
          </p>
        )}
        {state.status === "error" && (
          <p role="alert">
            Repository knowledge is unavailable: {state.message}
          </p>
        )}
        {state.status === "ready" && (
          <section aria-label="Repository overview">
            <h1>{state.overview.repository.name}</h1>
          </section>
        )}
      </main>
    </div>
  );
}
