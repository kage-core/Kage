import type { EvidenceDto } from "../api/types";

// The ground-truth anchors behind a claim. Each anchor identifies the SOURCE record (a file path,
// symbol, and line range, or a source URI) so a reader can verify the claim against the repository
// itself.
//
// HONESTY GATE — evidence coordinates are shown as verifiable TEXT, never a fabricated link. The
// backend's `source_uri` is an internal record locator, not a URL: real values are opaque
// scheme/relative strings like "fact:src/refunds.ts#refund", "source:src/auth.ts#login", or bare
// repo paths like "package.json". The portal has no source-viewer route and no configured code-host
// base URL, so there is nothing those strings resolve to in a browser. Rendering them as <a href>
// produced links that silently go nowhere — the exact dishonesty this gate forbids. We therefore
// render the coordinates as text a reader can use to locate the source manually, and only ever emit
// a real <a href> once a genuinely navigable target exists. We render:
//   - the human location (path + line range, falling back to the source URI) as text,
//   - the verification state (Verified / Failed / Unavailable) carried as TEXT, never color alone,
//   - the stance (Supports / Contradicts), so a contradicting anchor is never silently dropped.
//
// An empty anchor set is stated explicitly — an absent list would read as "not loaded", not "no
// evidence recorded".

interface EvidenceListProps {
  evidence: EvidenceDto[];
}

const VERIFICATION_LABELS: Record<EvidenceDto["verification_state"], string> = {
  verified: "Verified",
  failed: "Failed",
  unavailable: "Unavailable",
};

const STANCE_LABELS: Record<EvidenceDto["stance"], string> = {
  supports: "Supports",
  contradicts: "Contradicts",
};

// The human-readable location of an anchor: prefer path + line range, fall back to the source URI.
function anchorLabel(e: EvidenceDto): string {
  const base = e.path ?? e.source_uri;
  if (e.line_start !== null && e.line_end !== null) {
    return e.line_start === e.line_end
      ? `${base}:${e.line_start}`
      : `${base}:${e.line_start}-${e.line_end}`;
  }
  if (e.line_start !== null) return `${base}:${e.line_start}`;
  return base;
}

export function EvidenceList({ evidence }: EvidenceListProps): React.ReactElement {
  if (evidence.length === 0) {
    return <p className="evidence-empty muted">No evidence anchors recorded</p>;
  }

  return (
    <ul className="evidence-list">
      {evidence.map((e) => (
        <li key={e.evidence_id} className="evidence-item" data-stance={e.stance}>
          <span className="evidence-location mono">{anchorLabel(e)}</span>
          {e.symbol && <span className="evidence-symbol mono"> {e.symbol}</span>}
          <span className="evidence-verification" data-state={e.verification_state}>
            {VERIFICATION_LABELS[e.verification_state]}
          </span>
          <span className="evidence-stance" data-stance={e.stance}>
            {STANCE_LABELS[e.stance]}
          </span>
        </li>
      ))}
    </ul>
  );
}
