import type { ReactElement } from "react";
import type { EntityListDto } from "../api/types";
import { withBase } from "../router";

// The browse-list for one entity kind (Components, Flows, Runbooks, Decisions). Each entity links to
// its detail page and carries the same verified/stale/disputed health the System Map shows. An empty
// list states so plainly — it is never a "coming soon" placeholder.
export function EntityListPage({
  title,
  section,
  list,
}: {
  title: string;
  /** URL segment for the detail route, e.g. "components" → /components/<slug>. */
  section: string;
  list: EntityListDto;
}): ReactElement {
  if (list.entities.length === 0) {
    return (
      <section aria-label={title}>
        <h1>{title}</h1>
        <p className="muted">No {title.toLowerCase()} have been captured for this repository yet.</p>
      </section>
    );
  }

  return (
    <section aria-label={title}>
      <h1>{title}</h1>
      <p className="muted">
        {list.entities.length} {list.entities.length === 1 ? "entry" : "entries"}
      </p>
      <ul className="entity-list" style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.75rem" }}>
        {list.entities.map((entity) => (
          <li key={entity.entity_id} className="card">
            <a href={withBase(`/${section}/${entity.slug}`)}>
              <strong>{entity.canonical_name}</strong>
            </a>
            {entity.summary && <p className="muted">{entity.summary}</p>}
            <p className="muted" style={{ fontSize: "0.85em" }}>
              {entity.verified_claims} verified
              {entity.stale_claims > 0 && ` · ${entity.stale_claims} stale`}
              {entity.disputed_claims > 0 && ` · ${entity.disputed_claims} disputed`}
              {entity.status === "archived" && " · archived"}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
