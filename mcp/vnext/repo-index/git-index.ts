import { createHash } from "node:crypto";

import type { KageContributorsReport } from "../../kernel.js";
import { fileFactId } from "./legacy-code-graph.js";
import type { IndexedFact, IndexedRelation } from "./source.js";

function sha(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 32);
}

export function ownerFactId(contributor: string): string {
  return `owner:${contributor}`;
}

// Git evidence is *raw authorship and co-change only*. The kernel's contributor report also carries
// bus-factor heuristics — `silo_files`, `hotspot_files`, `ownership_pct` — but those are inferences,
// not facts: this adapter deliberately ignores them. An `owned_by` relation here means nothing more
// than "this author actually touched this file" (a raw commit-history observation). It never encodes
// an ownership percentage as confidence, and downstream compilation keeps ownership `proposed`.
export function contributorEvidence(report: KageContributorsReport): {
  facts: IndexedFact[];
  relations: IndexedRelation[];
} {
  const facts: IndexedFact[] = [];
  const relations: IndexedRelation[] = [];
  for (const profile of report.contributors) {
    const contributor = profile.contributor.trim();
    if (!contributor) continue;
    const ownerId = ownerFactId(contributor);
    facts.push({
      fact_id: ownerId,
      kind: "owner",
      name: contributor,
      // Owners are not tied to a single path; the touched files ride the owned_by relations.
      path: "",
      line: null,
      fingerprint: sha(`owner:${contributor}:${profile.commits_total}`),
      confidence: 1,
    });
    for (const touched of profile.files_touched) {
      const path = touched.path.replace(/\\/g, "/").replace(/^\/+/, "");
      if (!path) continue;
      relations.push({
        from: fileFactId(path),
        type: "owned_by",
        to: ownerId,
        evidence_fact_ids: [ownerId],
      });
    }
  }
  return { facts, relations };
}
