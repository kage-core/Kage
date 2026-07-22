import type { EntityDetailDto } from "../api/types";
import {
  CurrentClaims,
  EntityHeader,
  HealthRegion,
  HistoryRegion,
  RelatedList,
  bucketByKind,
} from "./KnowledgePageParts";

// The feature (and, by reuse, component / flow) detail page. Its structure follows the approved
// information order: CURRENT TRUTH first — Purpose, Flow, Invariants, Verification, Runbooks — then a
// clearly separated HISTORY AND UNCERTAINTY region for non-current claims, then KNOWLEDGE HEALTH.
//
// The honesty spine, enforced by the page tests:
//   - `current_claims` (injectable only) populates the Current-truth region; a stale/disputed claim
//     can NEVER appear here — it lives in the History region, tagged with its trust state.
//   - Purpose always shows the entity summary so the page has a lead even before claims accrue.
//   - Every section renders an explicit empty state, so "none recorded" never masquerades as "not
//     loaded".

interface FeaturePageProps {
  feature: EntityDetailDto;
}

// Bucket current claims into the feature sections by claim kind. Anything unmatched falls through to
// Purpose so no current claim is ever dropped from the page.
const SECTION_BUCKETS: Record<string, (kind: string) => boolean> = {
  invariants: (k) => k.includes("invariant"),
  verification: (k) => k.includes("verification") || k.includes("test"),
  flow: (k) => k.includes("flow") || k.includes("behavior") || k.includes("behaviour"),
};

export function FeaturePage({ feature }: FeaturePageProps): React.ReactElement {
  const { entity, current_claims, other_claims, related, health } = feature;
  const { matched, rest } = bucketByKind(current_claims, SECTION_BUCKETS);

  return (
    <div className="knowledge-page feature-page">
      <EntityHeader entity={entity} />

      <section className="current-truth-region" aria-label="Current truth">
        <section aria-label="Purpose">
          <h2>Purpose</h2>
          <p className="entity-summary">{entity.summary || "No purpose has been recorded yet."}</p>
          <CurrentClaims claims={rest} emptyLabel="No additional purpose claims recorded." />
        </section>

        <section aria-label="Flow">
          <h2>Flow</h2>
          <RelatedList
            related={related}
            kinds={["flow"]}
            emptyLabel="No flow is linked to this feature yet."
          />
          <CurrentClaims claims={matched.flow} emptyLabel="No behavioural claims recorded." />
        </section>

        <section aria-label="Invariants">
          <h2>Invariants</h2>
          <CurrentClaims
            claims={matched.invariants}
            emptyLabel="No invariants have been verified for this feature."
          />
        </section>

        <section aria-label="Verification">
          <h2>Verification</h2>
          <CurrentClaims
            claims={matched.verification}
            emptyLabel="No verification evidence has been recorded."
          />
        </section>

        <section aria-label="Runbooks">
          <h2>Runbooks</h2>
          <RelatedList
            related={related}
            kinds={["runbook"]}
            emptyLabel="No runbook operates this feature yet."
          />
        </section>
      </section>

      <HistoryRegion claims={other_claims} />
      <HealthRegion health={health} />
    </div>
  );
}
