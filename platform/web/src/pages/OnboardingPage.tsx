import type { RepositoryDto } from "../api/types";

// Local, single-operator onboarding. Four explicit steps, all local: confirm the detected
// repository, choose supported agent adapters, start the daemon in AUDIT mode, and wait for the
// first health/measurement receipt. Audit mode observes agent traffic but does NOT modify requests —
// stated plainly so the operator knows exactly when (and only when) Kage would begin changing
// requests. The local flow never asks for a team account or GitHub write permission; Phase E extends
// this page with managed workspace + GitHub App installation.

interface OnboardingPageProps {
  detectedRepository: RepositoryDto;
}

export function OnboardingPage({
  detectedRepository,
}: OnboardingPageProps): React.ReactElement {
  return (
    <section className="onboarding" aria-labelledby="onboarding-heading">
      <h1 id="onboarding-heading">Connect this repository to Kage</h1>

      <p className="mode-callout">
        <span className="status-icon" aria-hidden="true">
          ◎
        </span>
        <span>Audit mode</span>
      </p>

      <p>
        Kage starts in audit mode: it observes your agent&rsquo;s requests to build repository
        memory and measure attachment, but it <strong>does not modify agent requests</strong>.
        Requests only change later, after you explicitly enable attachment for a supported adapter.
      </p>

      <h2>Detected repository</h2>
      <p>
        Confirm this is the repository you want to connect:{" "}
        <strong>{detectedRepository.name}</strong>
        {detectedRepository.branch ? (
          <>
            {" "}
            on branch <code>{detectedRepository.branch}</code>
          </>
        ) : null}
        .
      </p>

      <h2>Local setup steps</h2>
      <ol aria-label="Local setup steps">
        <li>Confirm the detected repository above is correct.</li>
        <li>Choose supported agent adapters to observe.</li>
        <li>Start the daemon in audit mode (observe only, no request changes).</li>
        <li>Wait for the first health and measurement receipt to arrive.</li>
      </ol>

      <p>
        <button type="button" className="repo-switcher">
          Connect repository
        </button>
      </p>
    </section>
  );
}
