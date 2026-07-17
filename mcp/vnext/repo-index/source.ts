import type { RepositoryIdentity } from "../protocol/index.js";

// A repository snapshot is the deterministic, source-derived view of a repository: code-graph
// certainties (facts), structural edges between them (relations), and *inferred* groupings that
// are only ever proposals. Facts and relations are ground truth read straight off the indexes;
// proposals are guesses the compiler (Task 5+) must still verify before anything is injectable.

export type IndexedFactKind =
  | "file"
  | "symbol"
  | "route"
  | "test"
  | "script"
  | "document"
  | "owner"
  | "dependency";

export interface IndexedFact {
  fact_id: string;
  kind: IndexedFactKind;
  name: string;
  // Repository-relative path (never absolute). For facts with no single path (owners), this is "".
  path: string;
  line: number | null;
  // Fingerprint of the current source content backing this fact. Deterministic for a given tree.
  fingerprint: string;
  // Facts are code-graph certainties. This is the literal `1` type on purpose: a fact is either a
  // deterministic observation (confidence 1) or it is not a fact — inferences go to `proposals`.
  confidence: 1;
}

export type IndexedRelationType =
  | "contains"
  | "calls"
  | "imports"
  | "exposes"
  | "verified_by"
  | "owned_by"
  | "depends_on";

export interface IndexedRelation {
  from: string;
  type: IndexedRelationType;
  to: string;
  evidence_fact_ids: string[];
}

export interface FeatureProposal {
  kind: "feature" | "flow";
  name: string;
  evidence_fact_ids: string[];
  // Inferred groupings are never certainties: they are always `proposed`, awaiting verification.
  trust_state: "proposed";
}

export interface RepositorySnapshot {
  repository: RepositoryIdentity;
  facts: IndexedFact[];
  relations: IndexedRelation[];
  proposals: FeatureProposal[];
}

// Symmetry with the context seam's `ContextSource`: something that produces a repository snapshot.
export interface RepositoryIndexSource {
  scan(): Promise<RepositorySnapshot>;
}
