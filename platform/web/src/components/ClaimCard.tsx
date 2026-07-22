import type { ClaimDto, TrustState } from "../api/types";
import { EvidenceList } from "./EvidenceList";

// A single claim, rendered with its ground-truth evidence. Used both for CURRENT TRUTH (injectable
// claims, where the trust label is redundant reinforcement) and for HISTORY / UNCERTAINTY (proposed,
// stale, disputed, superseded), where the label is load-bearing: it is how a reader knows the claim
// is NOT current. The label text is carried as words, never color alone.

interface ClaimCardProps {
  claim: ClaimDto;
  // When true the trust-state label is shown. Current-truth panels can hide it (everything there is
  // injectable by construction); history panels must show it.
  showTrustLabel?: boolean;
}

const TRUST_LABELS: Record<TrustState, string> = {
  proposed: "Proposed",
  verified: "Verified",
  approved: "Approved",
  stale: "Stale",
  disputed: "Disputed",
  superseded: "Superseded",
  archived: "Archived",
};

export function ClaimCard({ claim, showTrustLabel = false }: ClaimCardProps): React.ReactElement {
  return (
    <article className="claim-card" data-trust={claim.trust_state}>
      <p className="claim-content">{claim.content}</p>
      <p className="claim-meta">
        {showTrustLabel && (
          <span className="claim-trust" data-trust={claim.trust_state}>
            {TRUST_LABELS[claim.trust_state]}
          </span>
        )}
        <span className="claim-kind mono">{claim.claim_kind}</span>
      </p>
      <EvidenceList evidence={claim.evidence} />
    </article>
  );
}

export { TRUST_LABELS };
