import { useCallback, useEffect, useState } from "react";
import type { KageApiClient } from "./api/client";
import type {
  DecisionDetailDto,
  EntityDetailDto,
  IntegrationDto,
  OverviewDto,
  ReviewItemDto,
  RunbookDetailDto,
  SystemMapDto,
  SystemMapView,
  TaskReceiptDto,
  TasksDto,
} from "./api/types";
import { AppShell } from "./components/AppShell";
import { AdminDiagnosticsPage } from "./pages/AdminDiagnosticsPage";
import { AgentTasksPage } from "./pages/AgentTasksPage";
import { BillingPage } from "./pages/BillingPage";
import { DecisionPage } from "./pages/DecisionPage";
import { FeaturePage } from "./pages/FeaturePage";
import { IntegrationsPage } from "./pages/IntegrationsPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { OverviewPage } from "./pages/OverviewPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ReviewQueuePage, type ReviewDecisionInput, type ReviewMutationFeedback } from "./pages/ReviewQueuePage";
import { RunbookPage } from "./pages/RunbookPage";
import { SystemMapPage } from "./pages/SystemMapPage";
import { TaskReceiptPage } from "./pages/TaskReceiptPage";
import { navigateTo, routeToPath, useRoute, withBase, type Route } from "./router";

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
        <a href={withBase("/overview")}>Return to Overview</a>
      </p>
    </section>
  );
}

// Loads the system map for the current view and hosts the interactive page. The map is fetched
// lazily (only when the System Map section is open) and re-fetched when the view or focus changes,
// so it NEVER sits on the context-delivery critical path. Switching views navigates the URL (which
// resets focus); expanding a node sets a focus that re-roots the two-hop window in place.
function SystemMapContainer({
  api,
  view,
}: {
  api: KageApiClient;
  view: SystemMapView;
}): React.ReactElement {
  const [focus, setFocus] = useState<string | null>(null);
  const [state, setState] = useState<
    { status: "loading" } | { status: "ready"; map: SystemMapDto } | { status: "error"; message: string }
  >({ status: "loading" });

  // A new view arrives via the URL; clear any focus so the reader starts from the whole view.
  useEffect(() => {
    setFocus(null);
  }, [view]);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    api
      .systemMap(view, focus)
      .then((map) => {
        if (!cancelled) setState({ status: "ready", map });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ status: "error", message: error instanceof Error ? error.message : "Unknown error" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api, view, focus]);

  if (state.status === "loading") {
    return (
      <p role="status" aria-live="polite">
        Loading system map…
      </p>
    );
  }
  if (state.status === "error") {
    return <p role="alert">The system map is unavailable: {state.message}</p>;
  }
  return (
    <SystemMapPage
      model={state.map}
      onSelectView={(next) => navigateTo({ page: "system-map", view: next })}
      onFocus={(entityId) => setFocus(entityId)}
      onClearFocus={() => setFocus(null)}
    />
  );
}

// A generic loader for a single knowledge entity fetched by slug. It fetches lazily (only when the
// detail route is open) and re-fetches when the slug changes, so detail pages never sit on the
// context-delivery critical path. Loading and error states are explicit and accessible.
function DetailContainer<T>({
  slug,
  label,
  load,
  render,
}: {
  slug: string;
  label: string;
  load: (slug: string) => Promise<T>;
  render: (data: T) => React.ReactElement;
}): React.ReactElement {
  const [state, setState] = useState<
    { status: "loading" } | { status: "ready"; data: T } | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    load(slug)
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
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
    // `load` is derived from the stable `api` + `label`; keying on (slug, label) re-fetches when the
    // entity or its type changes without looping on the inline loader's per-render identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, label]);

  if (state.status === "loading") {
    return (
      <p role="status" aria-live="polite">
        Loading {label}…
      </p>
    );
  }
  if (state.status === "error") {
    return (
      <p role="alert">
        This {label} is unavailable: {state.message}
      </p>
    );
  }
  return render(state.data);
}

// Loads the open review queue and hosts the review UX. Decisions POST through the mutating client
// method; a 403/409 is surfaced against the offending item (never swallowed), and a successful
// decision re-fetches so the queue reflects the new state. The acting identity is trust-on-assertion
// in the local single-user model: an "Acting as" input lets the operator assert who they are, and
// every mutation is attributed to that actor. This surface is entirely off the context-delivery path.
function ReviewQueueContainer({ api }: { api: KageApiClient }): React.ReactElement {
  const [actor, setActor] = useState("local-operator");
  const [items, setItems] = useState<ReviewItemDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ReviewMutationFeedback | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setError(null);
    api
      .reviewItems("open")
      .then((response) => {
        if (!cancelled) setItems(response.review_items);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Unknown error");
      });
    return () => {
      cancelled = true;
    };
  }, [api, reloadKey]);

  const onDecide = useCallback(
    (item: ReviewItemDto, decision: ReviewDecisionInput) => {
      setFeedback(null);
      const { action, ...request } = decision;
      api
        .decideReview(item.review_item_id, action, request)
        .then((outcome) => {
          if (outcome.ok) {
            // The decision landed; re-fetch so the queue reflects the mutated state.
            setReloadKey((key) => key + 1);
          } else {
            setFeedback({ review_item_id: item.review_item_id, status: outcome.status, error: outcome.error });
          }
        })
        .catch((caught: unknown) => {
          setFeedback({
            review_item_id: item.review_item_id,
            status: 0,
            error: caught instanceof Error ? caught.message : "request_failed",
          });
        });
    },
    [api],
  );

  return (
    <div className="review-container">
      <div className="review-actor">
        <label htmlFor="review-acting-as">Acting as</label>
        <input
          id="review-acting-as"
          type="text"
          value={actor}
          onChange={(event) => setActor(event.target.value)}
        />
      </div>
      {items === null && error === null && (
        <p role="status" aria-live="polite">
          Loading the review queue…
        </p>
      )}
      {error !== null && <p role="alert">The review queue is unavailable: {error}</p>}
      {items !== null && (
        <ReviewQueuePage items={items} actor={actor} onDecide={onDecide} lastResult={feedback} />
      )}
    </div>
  );
}

// Loads the list of agent tasks Kage holds receipts for. Fetched lazily (only when the Agent Tasks
// or Costs section is open) so it never sits on the context-delivery critical path.
function AgentTasksContainer({ api }: { api: KageApiClient }): React.ReactElement {
  const [state, setState] = useState<
    { status: "loading" } | { status: "ready"; tasks: TasksDto } | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    api
      .tasks()
      .then((tasks) => {
        if (!cancelled) setState({ status: "ready", tasks });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ status: "error", message: error instanceof Error ? error.message : "Unknown error" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  if (state.status === "loading") {
    return (
      <p role="status" aria-live="polite">
        Loading agent tasks…
      </p>
    );
  }
  if (state.status === "error") {
    return <p role="alert">Agent tasks are unavailable: {state.message}</p>;
  }
  return <AgentTasksPage tasks={state.tasks.tasks} />;
}

// Loads live integration health. Fetched lazily (only when the Integrations section is open) so it
// never sits on the context-delivery critical path.
function IntegrationsContainer({ api }: { api: KageApiClient }): React.ReactElement {
  const [state, setState] = useState<
    { status: "loading" } | { status: "ready"; integrations: IntegrationDto[] } | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    api
      .integrations()
      .then((response) => {
        if (!cancelled) setState({ status: "ready", integrations: response.integrations });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ status: "error", message: error instanceof Error ? error.message : "Unknown error" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  if (state.status === "loading") {
    return (
      <p role="status" aria-live="polite">
        Loading integrations…
      </p>
    );
  }
  if (state.status === "error") {
    return <p role="alert">Integrations are unavailable: {state.message}</p>;
  }
  return <IntegrationsPage integrations={state.integrations} />;
}

function RoutedPage({
  route,
  overview,
  api,
}: {
  route: Route;
  overview: OverviewDto;
  api: KageApiClient;
}): React.ReactElement {
  switch (route.page) {
    case "overview":
      if (needsOnboarding(overview)) {
        return <OnboardingPage detectedRepository={overview.repository} />;
      }
      return <OverviewPage overview={overview} />;
    case "system-map":
      return <SystemMapContainer api={api} view={(route.view as SystemMapView) ?? "feature"} />;
    case "features":
      return <PagePlaceholder title="Features" />;
    case "feature":
      return (
        <DetailContainer<EntityDetailDto>
          slug={route.slug}
          label="feature"
          load={(slug) => api.feature(slug)}
          render={(feature) => <FeaturePage feature={feature} />}
        />
      );
    case "components":
      return <PagePlaceholder title="Components" />;
    case "component":
      return (
        <DetailContainer<EntityDetailDto>
          slug={route.slug}
          label="component"
          load={(slug) => api.component(slug)}
          render={(component) => <FeaturePage feature={component} />}
        />
      );
    case "flows":
      return <PagePlaceholder title="Flows" />;
    case "flow":
      return (
        <DetailContainer<EntityDetailDto>
          slug={route.slug}
          label="flow"
          load={(slug) => api.flow(slug)}
          render={(flow) => <FeaturePage feature={flow} />}
        />
      );
    case "runbooks":
      return <PagePlaceholder title="Runbooks" />;
    case "runbook":
      return (
        <DetailContainer<RunbookDetailDto>
          slug={route.slug}
          label="runbook"
          load={(slug) => api.runbook(slug)}
          render={(runbook) => <RunbookPage runbook={runbook} />}
        />
      );
    case "decisions":
      return <PagePlaceholder title="Decisions" />;
    case "decision":
      return (
        <DetailContainer<DecisionDetailDto>
          slug={route.slug}
          label="decision"
          load={(slug) => api.decision(slug)}
          render={(decision) => <DecisionPage decision={decision} />}
        />
      );
    case "review":
      return <ReviewQueueContainer api={api} />;
    case "tasks":
    case "costs":
      return <AgentTasksContainer api={api} />;
    case "task":
      return (
        <DetailContainer<TaskReceiptDto>
          slug={route.id}
          label="task receipt"
          load={(id) => api.taskReceipt(id)}
          render={(receipt) => <TaskReceiptPage receipt={receipt} />}
        />
      );
    case "integrations":
      return <IntegrationsContainer api={api} />;
    case "settings":
      return <SettingsPage />;
    case "billing":
      // The portal is served by the LOCAL daemon, which deliberately has no workspace-billing feed:
      // putting one on this page would place the (remote) workspace on a path the local portal needs
      // to render, and a workspace outage must never degrade local operation. The workspace serves
      // this DTO itself at GET /v1/workspaces/:id/billing; until an install is linked to one, the
      // honest answer for a local install is "no workspace connected", which is exactly what a null
      // panel renders — never a fabricated plan or an empty-looking subscription.
      return <BillingPage billing={null} />;
    case "admin-diagnostics":
      return <AdminDiagnosticsPage />;
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
        <RoutedPage route={route} overview={state.overview} api={api} />
      )}
    </AppShell>
  );
}
