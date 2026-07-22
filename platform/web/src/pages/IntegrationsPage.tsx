import type { IntegrationDto } from "../api/types";
import { StatusBadge } from "../components/StatusBadge";

// The Integrations section. It reports the health of each attached adapter (proxy, hooks) with the
// state carried in TEXT via StatusBadge — never color alone — and a link to the last successful
// attach. Adapter CONFIGURATION and privacy modes live on Settings; this page is about live health.
//
// Raw diagnostics (packet files, graph edges, database internals) are deliberately absent here — they
// live only under /admin/diagnostics. This page is a portal surface, so it shows meaning, not dumps.

interface IntegrationsPageProps {
  integrations: IntegrationDto[];
}

export function IntegrationsPage({ integrations }: IntegrationsPageProps): React.ReactElement {
  return (
    <section aria-label="Integrations">
      <h1>Integrations</h1>
      <p className="muted">
        The adapters that attach Kage to your agents. Health is measured from real attach attempts, so
        an adapter that is passing through rather than attaching is labelled as such — never counted as
        a silent success.
      </p>

      {integrations.length === 0 ? (
        <p className="integration-empty muted">
          No integrations are attached yet. Connect an agent adapter to start attaching repository
          knowledge.
        </p>
      ) : (
        <ul className="integration-list">
          {integrations.map((integration) => (
            <li key={integration.id} className="integration-item">
              <span className="integration-name">{integration.name}</span>
              <StatusBadge state={integration.state} />
              <span className="integration-last muted">
                {integration.last_success_at
                  ? `Last attached ${integration.last_success_at}`
                  : "No successful attach recorded"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
