import type { ClaimDto, EntityCardDto, EntityHealthDto, RelatedEntityDto } from "../api/types";
import { ClaimCard } from "../components/ClaimCard";
import { KnowledgeHealth } from "../components/KnowledgeHealth";
import { withBase } from "../router";

// Shared building blocks for the feature / runbook / decision detail pages. Every knowledge page
// follows the same honesty spine: an identity header, a CURRENT TRUTH region (injectable claims
// only), a separately labelled HISTORY AND UNCERTAINTY region (everything non-current, each item
// tagged with its trust state), and a KNOWLEDGE HEALTH region. Keeping these in one place stops the
// three pages from drifting apart.

// The kinds that own their own dedicated detail page today. Related entities of other kinds
// (owner, contract, data_model, …) are shown as plain text, never as links that would 404.
const LINKABLE_KINDS: Partial<Record<RelatedEntityDto["kind"], string>> = {
  feature: "features",
  component: "components",
  flow: "flows",
  runbook: "runbooks",
  decision: "decisions",
};

function relatedHref(entity: RelatedEntityDto): string | null {
  const base = LINKABLE_KINDS[entity.kind];
  return base ? withBase(`/${base}/${encodeURIComponent(entity.slug)}`) : null;
}

export function EntityHeader({ entity }: { entity: EntityCardDto }): React.ReactElement {
  return (
    <header className="entity-header">
      <p className="entity-kind">{entity.kind}</p>
      <h1>{entity.canonical_name}</h1>
      <p className="entity-slug mono">{entity.slug}</p>
      {entity.status === "archived" && (
        <p className="entity-archived">Archived — kept for provenance, not current guidance.</p>
      )}
    </header>
  );
}

// A titled list of related entities of a single kind, filtered from the full relation set. Renders
// an honest empty state so an absent relation reads as "none recorded", not "not loaded".
export function RelatedList({
  related,
  kinds,
  emptyLabel,
}: {
  related: RelatedEntityDto[];
  kinds: RelatedEntityDto["kind"][];
  emptyLabel: string;
}): React.ReactElement {
  const matching = related.filter((r) => kinds.includes(r.kind));
  if (matching.length === 0) {
    return <p className="muted">{emptyLabel}</p>;
  }
  return (
    <ul className="related-list">
      {matching.map((r) => {
        const href = relatedHref(r);
        return (
          <li key={`${r.entity_id}:${r.relation_type}`} className="related-item">
            {href ? <a href={href}>{r.canonical_name}</a> : <span>{r.canonical_name}</span>}
            <span className="related-relation mono"> {r.relation_type}</span>
          </li>
        );
      })}
    </ul>
  );
}

// A titled list of current-truth claims. Every claim here is injectable by construction, so the
// trust label is suppressed as redundant. Empty sections say so.
export function CurrentClaims({
  claims,
  emptyLabel,
}: {
  claims: ClaimDto[];
  emptyLabel: string;
}): React.ReactElement {
  if (claims.length === 0) {
    return <p className="muted">{emptyLabel}</p>;
  }
  return (
    <div className="claim-stack">
      {claims.map((c) => (
        <ClaimCard key={c.claim_id} claim={c} />
      ))}
    </div>
  );
}

// The history / uncertainty region: every non-current claim, each tagged with its trust state so a
// reader can never mistake a stale or superseded claim for current behaviour. Shown, but labelled.
export function HistoryRegion({ claims }: { claims: ClaimDto[] }): React.ReactElement {
  return (
    <section className="history-region" aria-label="History and uncertainty">
      <h2>Recent changes</h2>
      {claims.length === 0 ? (
        <p className="muted">No superseded, stale, disputed, or proposed claims.</p>
      ) : (
        <div className="claim-stack">
          {claims.map((c) => (
            <ClaimCard key={c.claim_id} claim={c} showTrustLabel />
          ))}
        </div>
      )}
    </section>
  );
}

export function HealthRegion({ health }: { health: EntityHealthDto }): React.ReactElement {
  return (
    <section className="health-region" aria-label="Knowledge health">
      <h2>Knowledge health</h2>
      <KnowledgeHealth health={health} />
    </section>
  );
}

// Partition current claims into named buckets by claim kind, preserving order and never dropping a
// claim: anything that matches no explicit bucket falls into `rest`.
export function bucketByKind(
  claims: ClaimDto[],
  buckets: Record<string, (kind: string) => boolean>,
): { matched: Record<string, ClaimDto[]>; rest: ClaimDto[] } {
  const matched: Record<string, ClaimDto[]> = {};
  for (const name of Object.keys(buckets)) matched[name] = [];
  const rest: ClaimDto[] = [];
  for (const claim of claims) {
    const name = Object.keys(buckets).find((n) => buckets[n](claim.claim_kind));
    if (name) matched[name].push(claim);
    else rest.push(claim);
  }
  return { matched, rest };
}
