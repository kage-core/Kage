// The Settings section. It states the LOCAL operating posture — privacy mode, retention, and budget —
// as configured facts about how this daemon runs, and points operators at the segregated diagnostics
// surface for low-level internals. It never inlines raw packets, graph edges, or database dumps: those
// live only under /admin/diagnostics so the honesty boundary between "product view" and "raw internals"
// is explicit.

import { withBase } from "../router";

export function SettingsPage(): React.ReactElement {
  return (
    <section aria-label="Settings">
      <h1>Settings</h1>
      <p className="muted">
        How this local Kage daemon is configured. These are the current operating facts, read from the
        local configuration — not remote account settings.
      </p>

      <dl className="settings-list">
        <div className="settings-row">
          <dt>Privacy mode</dt>
          <dd>
            Audit mode. The portal is read-only and never sits on the context-delivery path; the live
            feed emits identifiers and enums only, never raw prompt text or claim content.
          </dd>
        </div>
        <div className="settings-row">
          <dt>Retention</dt>
          <dd>
            Events, receipts, and knowledge are retained locally in this repository&rsquo;s Kage
            database. Nothing is sent to a remote service in the local single-user model.
          </dd>
        </div>
        <div className="settings-row">
          <dt>Budget</dt>
          <dd>
            Context budgets and compression thresholds are governed by the local vNext configuration.
            The proxy&rsquo;s mode (audit or assist) determines whether requests are transformed at all.
          </dd>
        </div>
      </dl>

      <h2>Operator tools</h2>
      <p>
        Low-level internals — raw memory packets, graph internals, compiler state, and storage
        diagnostics — are kept off the product surfaces and exposed only to operators.
      </p>
      <p>
        <a href={withBase("/admin/diagnostics")}>Open admin diagnostics</a>
      </p>
    </section>
  );
}
