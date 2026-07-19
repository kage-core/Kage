// The segregated operator surface. This is the ONLY place in the portal where raw, unsummarised
// internals are surfaced: packet files, raw graph edges, compiler checkpoints, and database
// diagnostics. Keeping them here — off every product page — is a Phase C honesty gate: the main portal
// shows verified, current truth; anything raw or low-level is quarantined behind /admin/diagnostics so
// it can never be mistaken for the product's curated view.
//
// The raw artefacts themselves are served by the daemon's legacy viewer (graph.json, packet files) and
// by the database on disk; this page is the labelled entry point and boundary, linking out rather than
// re-rendering the dumps inline.

const RAW_ARTEFACTS: Array<{ id: string; label: string; description: string; href: string }> = [
  {
    id: "packets",
    label: "Packet files",
    description: "The raw OKF concept files under .agent_memory/packets, exactly as stored on disk.",
    href: "/viewer/index.html",
  },
  {
    id: "graph",
    label: "Raw graph edges",
    description: "The unfiltered knowledge-graph edges, including proposed and superseded relations.",
    href: "/viewer/index.html",
  },
  {
    id: "checkpoints",
    label: "Compiler checkpoints",
    description: "The repository compiler's checkpoint offsets and model-lag counters.",
    href: "/viewer/index.html",
  },
  {
    id: "database",
    label: "Database diagnostics",
    description: "Low-level storage internals: schema version, table row counts, migration state.",
    href: "/viewer/index.html",
  },
];

export function AdminDiagnosticsPage(): React.ReactElement {
  return (
    <section aria-label="Admin diagnostics">
      <h1>Admin diagnostics</h1>
      <p role="note" className="admin-warning">
        For operators only. This surface exposes raw, unsummarised internals. It is deliberately kept
        out of the product pages so that curated, verified truth and low-level dumps are never confused.
      </p>

      <section aria-label="Raw diagnostics">
        <h2>Raw diagnostics</h2>
        <ul className="admin-artefact-list">
          {RAW_ARTEFACTS.map((artefact) => (
            <li key={artefact.id} className="admin-artefact">
              <a href={artefact.href}>{artefact.label}</a>
              <span className="muted"> — {artefact.description}</span>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
