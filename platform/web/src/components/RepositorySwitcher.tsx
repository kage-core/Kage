import type { RepositoryDto } from "../api/types";

// The repository identity control in the banner. Phase C is single-repository, so this is a
// disabled-but-labeled affordance that names the current repository and its branch; Phase E turns it
// into a real workspace switcher. Rendering it as a button keeps the future interaction (and its
// keyboard reachability) honest today.

interface RepositorySwitcherProps {
  repository: RepositoryDto | null;
}

export function RepositorySwitcher({
  repository,
}: RepositorySwitcherProps): React.ReactElement {
  if (!repository) {
    return (
      <button type="button" className="repo-switcher" disabled>
        <span className="repo-name">Detecting repository…</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      className="repo-switcher"
      // Single-repository in Phase C; the control is present for keyboard order and future use.
      aria-label={`Current repository: ${repository.name}`}
    >
      <span className="repo-name">{repository.name}</span>
      {repository.branch ? (
        <span className="repo-branch">{repository.branch}</span>
      ) : null}
    </button>
  );
}
