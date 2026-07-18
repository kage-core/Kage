import type { ReactNode } from "react";
import type { RepositoryDto } from "../api/types";
import { navLinks } from "../router";
import { RepositorySwitcher } from "./RepositorySwitcher";

// The accessible application shell: a skip link, a banner landmark carrying brand + repository
// identity, the primary navigation landmark, and the main content region. Page content is passed as
// children; `route` is the current origin-relative path string, used to mark the active nav link
// with `aria-current="page"` (so the active state is exposed to assistive tech, not signaled by
// color alone).

interface AppShellProps {
  repository: RepositoryDto | null;
  route: string;
  children: ReactNode;
}

// First path segment, ignoring the leading slash and any query string. Used to decide which nav
// section owns the current route (e.g. `/features/checkout` -> "features", active for "Features").
function firstSegment(path: string): string {
  const clean = path.split("?")[0];
  const segments = clean.split("/").filter((s) => s.length > 0);
  // Treat the root and the empty path as the overview section.
  return segments[0] ?? "overview";
}

function isActive(href: string, route: string): boolean {
  const routeSeg = firstSegment(route);
  const linkSeg = firstSegment(href);
  if (routeSeg === "overview" && linkSeg === "overview") return true;
  return routeSeg === linkSeg;
}

export function AppShell({
  repository,
  route,
  children,
}: AppShellProps): React.ReactElement {
  return (
    <div className="kage-app">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <header className="shell-banner" role="banner">
        <RepositorySwitcher repository={repository} />
        <span className="shell-brand">Kage knowledge portal</span>
      </header>

      <div className="shell-body">
        <nav className="shell-nav" aria-label="Repository knowledge">
          <ul>
            {navLinks.map((link) => {
              const active = isActive(link.href, route);
              return (
                <li key={link.href}>
                  <a
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                  >
                    {link.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="shell-main" id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
