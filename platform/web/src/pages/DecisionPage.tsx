import type { DecisionDetailDto } from "../api/types";
import {
  CurrentClaims,
  EntityHeader,
  HealthRegion,
  HistoryRegion,
  RelatedList,
} from "./KnowledgePageParts";

// The decision (ADR-style) detail page. It leads with the current rationale (injectable claims),
// then the alternatives considered, the entities the decision affects, what it supersedes, and who
// approved it. The honesty gates it must honour:
//   - `approved_by` is shown verbatim when an accepted review recorded a decider, and rendered as
//     "No approver recorded" when null — never invented. A high-impact decision with no approver is a
//     visible gap, not a blank.
//   - Superseded prior decisions live in the History region, tagged "Superseded"; they never appear
//     in the current-truth rationale.

interface DecisionPageProps {
  decision: DecisionDetailDto;
}

export function DecisionPage({ decision }: DecisionPageProps): React.ReactElement {
  const { entity, current_claims, other_claims, related, health, approved_by, supersedes_claim_ids } =
    decision;

  // Rationale and alternatives are both current-truth claims; split them by kind so the reader sees
  // "why we chose this" apart from "what we rejected". Anything unmatched stays in rationale.
  const alternatives = current_claims.filter((c) => c.claim_kind.includes("alternative"));
  const rationale = current_claims.filter((c) => !c.claim_kind.includes("alternative"));

  return (
    <div className="knowledge-page decision-page">
      <EntityHeader entity={entity} />

      <section aria-label="Approval">
        <h2>Approval</h2>
        {approved_by !== null ? (
          <p className="decision-approver">
            Approved by <span className="mono">{approved_by}</span>
          </p>
        ) : (
          <p className="decision-approver muted">No approver recorded</p>
        )}
      </section>

      <section className="current-truth-region" aria-label="Current truth">
        <section aria-label="Rationale">
          <h2>Rationale</h2>
          <p className="entity-summary">{entity.summary || "No rationale summary recorded."}</p>
          <CurrentClaims claims={rationale} emptyLabel="No current rationale claims recorded." />
        </section>

        <section aria-label="Alternatives considered">
          <h2>Alternatives considered</h2>
          <CurrentClaims claims={alternatives} emptyLabel="No alternatives were recorded." />
        </section>

        <section aria-label="Affected entities">
          <h2>Affected entities</h2>
          <RelatedList
            related={related}
            kinds={["feature", "component", "flow", "runbook", "contract", "data_model"]}
            emptyLabel="No affected entities recorded."
          />
        </section>

        <section aria-label="Supersedes">
          <h2>Supersedes</h2>
          {supersedes_claim_ids.length > 0 ? (
            <ul className="supersedes-list">
              {supersedes_claim_ids.map((id) => (
                <li key={id} className="mono">
                  {id}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">This decision supersedes nothing recorded.</p>
          )}
        </section>
      </section>

      <HistoryRegion claims={other_claims} />
      <HealthRegion health={health} />
    </div>
  );
}
