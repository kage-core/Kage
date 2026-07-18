import type { RunbookDetailDto } from "../api/types";
import {
  CurrentClaims,
  EntityHeader,
  HealthRegion,
  HistoryRegion,
  RelatedList,
  bucketByKind,
} from "./KnowledgePageParts";

// The runbook detail page. Runbooks are operational and safety-critical, so the page leads with
// whether the procedure has ever been proven to work — `last_successful_execution`. The Phase B model
// records this as an explicit value or null; a null renders "No successful execution has been
// recorded" rather than being silently omitted (which would let an unproven runbook read as safe).
//
// The safety-relevant sections — prerequisites, environment, safety class, steps, expected output,
// rollback, escalation, owner, invalidation triggers — are always present with honest empty states,
// so a missing rollback plan is visible as a gap, not hidden. Non-current claims are separated into
// the History region exactly as on the feature page.

interface RunbookPageProps {
  runbook: RunbookDetailDto;
}

const SECTION_BUCKETS: Record<string, (kind: string) => boolean> = {
  prerequisites: (k) => k.includes("prerequisite") || k.includes("precondition"),
  environment: (k) => k.includes("environment"),
  safety: (k) => k.includes("safety"),
  steps: (k) => k.includes("procedure") || k.includes("step"),
  expected: (k) => k.includes("expected") || k.includes("output"),
  rollback: (k) => k.includes("rollback"),
  escalation: (k) => k.includes("escalation") || k.includes("escalate"),
  invalidation: (k) => k.includes("invalidation") || k.includes("trigger"),
};

function LastSuccess({ at }: { at: string | null }): React.ReactElement {
  return (
    <section aria-label="Last successful execution">
      <h2>Last successful execution</h2>
      {at === null ? (
        <p className="runbook-no-success">No successful execution has been recorded</p>
      ) : (
        <p className="runbook-last-success">
          Last succeeded <time dateTime={at}>{at}</time>
        </p>
      )}
    </section>
  );
}

export function RunbookPage({ runbook }: RunbookPageProps): React.ReactElement {
  const { entity, current_claims, other_claims, related, health, last_successful_execution } =
    runbook;
  const { matched, rest } = bucketByKind(current_claims, SECTION_BUCKETS);

  return (
    <div className="knowledge-page runbook-page">
      <EntityHeader entity={entity} />

      <LastSuccess at={last_successful_execution} />

      <section className="current-truth-region" aria-label="Current truth">
        <section aria-label="Prerequisites">
          <h2>Prerequisites</h2>
          <CurrentClaims claims={matched.prerequisites} emptyLabel="No prerequisites recorded." />
        </section>

        <section aria-label="Environment">
          <h2>Environment</h2>
          <CurrentClaims claims={matched.environment} emptyLabel="No environment recorded." />
        </section>

        <section aria-label="Safety class">
          <h2>Safety class</h2>
          <CurrentClaims claims={matched.safety} emptyLabel="No safety class recorded." />
        </section>

        <section aria-label="Steps">
          <h2>Steps</h2>
          <CurrentClaims
            claims={[...matched.steps, ...rest]}
            emptyLabel="No steps have been recorded yet."
          />
        </section>

        <section aria-label="Expected output">
          <h2>Expected output</h2>
          <CurrentClaims claims={matched.expected} emptyLabel="No expected output recorded." />
        </section>

        <section aria-label="Rollback">
          <h2>Rollback</h2>
          <CurrentClaims claims={matched.rollback} emptyLabel="No rollback plan recorded." />
        </section>

        <section aria-label="Escalation">
          <h2>Escalation</h2>
          <CurrentClaims claims={matched.escalation} emptyLabel="No escalation path recorded." />
        </section>

        <section aria-label="Owner">
          <h2>Owner</h2>
          <RelatedList related={related} kinds={["owner"]} emptyLabel="No owner recorded." />
        </section>

        <section aria-label="Invalidation triggers">
          <h2>Invalidation triggers</h2>
          <CurrentClaims
            claims={matched.invalidation}
            emptyLabel="No invalidation triggers recorded."
          />
        </section>
      </section>

      <HistoryRegion claims={other_claims} />
      <HealthRegion health={health} />
    </div>
  );
}
