// History-based client-side routing with no routing dependency. The portal is served under `/app/`
// by the daemon behind a strict CSP; we drive navigation with the History API and a `popstate`
// subscription, keeping the bundle small and self-hosted.
//
// `parseRoute` is a pure function (path string in, Route out) so it is trivially testable. Unknown
// paths resolve to a `not-found` route that carries the offending path for a useful 404 page.

import { useEffect, useState } from "react";

export type Route =
  | { page: "overview" }
  | { page: "system-map"; view: string }
  | { page: "features" }
  | { page: "feature"; slug: string }
  | { page: "components" }
  | { page: "component"; slug: string }
  | { page: "flows" }
  | { page: "flow"; slug: string }
  | { page: "runbooks" }
  | { page: "runbook"; slug: string }
  | { page: "decisions" }
  | { page: "decision"; slug: string }
  | { page: "review" }
  | { page: "tasks" }
  | { page: "task"; id: string }
  | { page: "costs" }
  | { page: "integrations" }
  | { page: "settings" }
  | { page: "billing" }
  | { page: "admin-diagnostics" }
  | { page: "not-found"; path: string };

export interface NavLink {
  label: string;
  href: string;
}

// The product information architecture, in a FIXED order. The AppShell renders these as the primary
// navigation landmark and the router test asserts every href resolves to a real route.
export const navLinks: NavLink[] = [
  { label: "Overview", href: "/overview" },
  { label: "System Map", href: "/system-map" },
  { label: "Features", href: "/features" },
  { label: "Components", href: "/components" },
  { label: "Flows", href: "/flows" },
  { label: "Runbooks", href: "/runbooks" },
  { label: "Decisions", href: "/decisions" },
  { label: "Review Queue", href: "/review" },
  { label: "Agent Tasks", href: "/tasks" },
  { label: "Costs and Outcomes", href: "/costs" },
  { label: "Integrations", href: "/integrations" },
  { label: "Settings", href: "/settings" },
  { label: "Billing", href: "/billing" },
];

// The daemon serves the portal under `/app/`. Detect that mount from the current pathname so the SPA
// can strip it before routing and re-add it on every internal link — the portal uses root-absolute
// hrefs, and a full-page navigation to `/review` (rather than `/app/review`) would leave the mount.
// At the root mount (dev, tests) the base is empty and every helper here is a no-op.
export function portalBase(pathname: string = typeof window !== "undefined" ? window.location.pathname : "/"): string {
  return pathname === "/app" || pathname.startsWith("/app/") ? "/app" : "";
}

// Prefix a root-absolute portal link with the current mount base. Fragment links (`#…`) and absolute
// URLs (`https://…`) are never rewritten; only same-origin root-absolute paths are moved under the base.
export function withBase(href: string, base: string = portalBase()): string {
  if (!base) return href;
  if (!href.startsWith("/")) return href; // fragments, relative, and absolute URLs pass through
  return `${base}${href}`;
}

function splitPath(input: string): { segments: string[]; query: URLSearchParams } {
  const [rawPath, rawQuery = ""] = input.split("?");
  const segments = rawPath.split("/").filter((s) => s.length > 0);
  return { segments, query: new URLSearchParams(rawQuery) };
}

export function parseRoute(input: string): Route {
  const { segments, query } = splitPath(input);

  if (segments.length === 0) return { page: "overview" };

  const [head, tail] = segments;

  switch (head) {
    case "overview":
      if (segments.length === 1) return { page: "overview" };
      break;
    case "system-map":
      if (segments.length === 1) {
        return { page: "system-map", view: query.get("view") ?? "feature" };
      }
      break;
    case "features":
      if (segments.length === 1) return { page: "features" };
      if (segments.length === 2) return { page: "feature", slug: tail };
      break;
    case "components":
      if (segments.length === 1) return { page: "components" };
      if (segments.length === 2) return { page: "component", slug: tail };
      break;
    case "flows":
      if (segments.length === 1) return { page: "flows" };
      if (segments.length === 2) return { page: "flow", slug: tail };
      break;
    case "runbooks":
      if (segments.length === 1) return { page: "runbooks" };
      if (segments.length === 2) return { page: "runbook", slug: tail };
      break;
    case "decisions":
      if (segments.length === 1) return { page: "decisions" };
      if (segments.length === 2) return { page: "decision", slug: tail };
      break;
    case "review":
      if (segments.length === 1) return { page: "review" };
      break;
    case "tasks":
      if (segments.length === 1) return { page: "tasks" };
      if (segments.length === 2) return { page: "task", id: tail };
      break;
    case "costs":
      if (segments.length === 1) return { page: "costs" };
      break;
    case "integrations":
      if (segments.length === 1) return { page: "integrations" };
      break;
    case "settings":
      if (segments.length === 1) return { page: "settings" };
      break;
    case "billing":
      if (segments.length === 1) return { page: "billing" };
      break;
    case "admin":
      // The segregated operator surface. Raw packets, graph edges, checkpoints, and DB diagnostics
      // live ONLY here, never on the main portal pages.
      if (segments.length === 2 && tail === "diagnostics") return { page: "admin-diagnostics" };
      break;
  }

  return { page: "not-found", path: input };
}

export function routeToPath(route: Route): string {
  switch (route.page) {
    case "overview":
      return "/overview";
    case "system-map":
      return `/system-map?view=${encodeURIComponent(route.view)}`;
    case "features":
      return "/features";
    case "feature":
      return `/features/${encodeURIComponent(route.slug)}`;
    case "components":
      return "/components";
    case "component":
      return `/components/${encodeURIComponent(route.slug)}`;
    case "flows":
      return "/flows";
    case "flow":
      return `/flows/${encodeURIComponent(route.slug)}`;
    case "runbooks":
      return "/runbooks";
    case "runbook":
      return `/runbooks/${encodeURIComponent(route.slug)}`;
    case "decisions":
      return "/decisions";
    case "decision":
      return `/decisions/${encodeURIComponent(route.slug)}`;
    case "review":
      return "/review";
    case "tasks":
      return "/tasks";
    case "task":
      return `/tasks/${encodeURIComponent(route.id)}`;
    case "costs":
      return "/costs";
    case "integrations":
      return "/integrations";
    case "settings":
      return "/settings";
    case "billing":
      return "/billing";
    case "admin-diagnostics":
      return "/admin/diagnostics";
    case "not-found":
      return route.path;
  }
}

// The portal is mounted under a base path (e.g. `/app/`) by the daemon. We route on the pathname
// AFTER that base, so links stay origin-relative and CSP-safe.
function stripBase(pathname: string, base: string): string {
  if (base && pathname.startsWith(base)) {
    const rest = pathname.slice(base.length);
    return rest.startsWith("/") ? rest : `/${rest}`;
  }
  return pathname;
}

export function currentPath(base = portalBase()): string {
  return stripBase(window.location.pathname, base) + window.location.search;
}

export function navigateTo(route: Route, base = portalBase()): void {
  const path = routeToPath(route);
  const prefix = base.replace(/\/$/, "");
  window.history.pushState({}, "", `${prefix}${path}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

// Subscribe a component to the current route. Re-renders on `popstate` (back/forward and our own
// `navigateTo`). `base` is the daemon mount prefix.
export function useRoute(base = portalBase()): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(currentPath(base)));
  useEffect(() => {
    const onChange = (): void => setRoute(parseRoute(currentPath(base)));
    window.addEventListener("popstate", onChange);
    return () => window.removeEventListener("popstate", onChange);
  }, [base]);
  return route;
}
