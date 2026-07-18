import { useEffect, useState } from "react";
import type { KageApiClient } from "./api/client";
import type { OverviewDto } from "./api/types";
import { AppShell } from "./components/AppShell";
import { OnboardingPage } from "./pages/OnboardingPage";
import { OverviewPage } from "./pages/OverviewPage";
import { routeToPath, useRoute, type Route } from "./router";

// The portal root. It resolves the current route from history, loads the repository overview once,
// and hosts every page inside the accessible AppShell. The shell (skip link, banner, primary
// navigation landmark, main region) is present in every state — including loading — so keyboard and
// assistive-tech users always have the same structure. Per-section pages arrive in Task 4+; for now
// unimplemented sections render an honest placeholder rather than pretending to have data.

type LoadState =
  | { status: "loading" }
  | { status: "ready"; overview: OverviewDto }
  | { status: "error"; message: string };

export interface AppProps {
  api: KageApiClient;
}

// A fresh install has nothing measured yet: no metrics, no integrations. In that case we guide the
// operator through local onboarding rather than showing an empty overview that implies success.
function needsOnboarding(overview: OverviewDto): boolean {
  return overview.metrics.length === 0 && overview.integrations.length === 0;
}

function PagePlaceholder({ title }: { title: string }): React.ReactElement {
  return (
    <section aria-label={title}>
      <h1>{title}</h1>
      <p className="muted">
        This section is part of the knowledge portal and arrives in a later Phase C task.
      </p>
    </section>
  );
}

function NotFoundPage({ path }: { path: string }): React.ReactElement {
  return (
    <section aria-label="Page not found">
      <h1>Page not found</h1>
      <p className="muted">
        No portal section matches <code>{path}</code>.
      </p>
      <p>
        <a href="/overview">Return to Overview</a>
      </p>
    </section>
  );
}

function RoutedPage({
  route,
  overview,
}: {
  route: Route;
  overview: OverviewDto;
}): React.ReactElement {
  switch (route.page) {
    case "overview":
      if (needsOnboarding(overview)) {
        return <OnboardingPage detectedRepository={overview.repository} />;
      }
      return <OverviewPage overview={overview} />;
    case "system-map":
      return <PagePlaceholder title="System Map" />;
    case "features":
    case "feature":
      return <PagePlaceholder title="Features" />;
    case "components":
    case "component":
      return <PagePlaceholder title="Components" />;
    case "flows":
    case "flow":
      return <PagePlaceholder title="Flows" />;
    case "runbooks":
    case "runbook":
      return <PagePlaceholder title="Runbooks" />;
    case "decisions":
    case "decision":
      return <PagePlaceholder title="Decisions" />;
    case "review":
      return <PagePlaceholder title="Review Queue" />;
    case "tasks":
    case "task":
      return <PagePlaceholder title="Agent Tasks" />;
    case "costs":
      return <PagePlaceholder title="Costs and Outcomes" />;
    case "integrations":
      return <PagePlaceholder title="Integrations" />;
    case "settings":
      return <PagePlaceholder title="Settings" />;
    case "not-found":
      return <NotFoundPage path={route.path} />;
  }
}

export function App({ api }: AppProps): React.ReactElement {
  const route = useRoute();
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

  const repository = state.status === "ready" ? state.overview.repository : null;

  return (
    <AppShell repository={repository} route={routeToPath(route)}>
      {state.status === "loading" && (
        <p role="status" aria-live="polite">
          Loading repository knowledge…
        </p>
      )}
      {state.status === "error" && (
        <p role="alert">Repository knowledge is unavailable: {state.message}</p>
      )}
      {state.status === "ready" && (
        <RoutedPage route={route} overview={state.overview} />
      )}
    </AppShell>
  );
}
