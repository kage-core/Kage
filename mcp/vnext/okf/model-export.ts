import { createHash } from "node:crypto";

import { extractFencedJson, okfType } from "../../okf.js";
import type { MemoryType } from "../../kernel.js";
import type { Repository } from "../repo-model/repository.js";
import type { EntityKind, EntityRecord, TrustState } from "../repo-model/types.js";
import { isInjectableTrustState } from "../repo-model/types.js";
import { LEGACY_PACKET_MIGRATIONS_TABLE } from "../migration/schema.js";

/**
 * Export the repository model as OKF concept documents.
 *
 * One concept per entity. Its body carries the entity's current claims (with trust and impact), the
 * source-backed evidence each claim rests on, and the legacy packet ids the entity descends from. The
 * `x-kage-*` frontmatter carries the trust/freshness signals for a Kage-aware consumer.
 *
 * The load-bearing honesty property here is round-trip identity preservation THROUGH a foreign
 * consumer: a non-Kage OKF tool may drop unknown `x-kage-*` frontmatter, so the vNext identifiers
 * (entity_id, claim_ids, evidence refs, legacy ids) also ride in a machine-state fenced block IN THE
 * BODY — which OKF consumers preserve. `parseModelConcept` reads that block back, so a concept that
 * has been through a foreign tool still re-imports with its identifiers intact.
 *
 * Export never invents trust: an entity's exported concept reports exactly the trust states the store
 * holds. A proposed claim is exported as proposed, never dressed up as verified.
 */

export const MODEL_STATE_FENCE = "```json kage-model-state";
const MODEL_STATE_FENCE_CLOSE = "```";

export interface ExportedEvidenceRef {
  evidence_id: string;
  source_type: string;
  source_uri: string;
  source_fingerprint: string;
  path: string | null;
  symbol: string | null;
  verification_method: string;
  verification_state: string;
}

export interface ExportedClaim {
  claim_id: string;
  claim_kind: string;
  normalized_content: string;
  trust_state: TrustState;
  confidence: number;
  impact_class: string;
  injectable: boolean;
  evidence: ExportedEvidenceRef[];
}

export interface ModelConcept {
  entity_id: string;
  repository_id: string;
  kind: EntityKind;
  canonical_name: string;
  slug: string;
  summary: string;
  status: string;
  claims: ExportedClaim[];
  legacy_packet_ids: string[];
}

export interface ExportedConceptDocument {
  entity_id: string;
  file_name: string;
  markdown: string;
  concept: ModelConcept;
}

// ── Build the concept from the store ────────────────────────────────────────

export function exportModelConcept(model: Repository, entity: EntityRecord): ModelConcept {
  const claims = model.claimsForEntity(entity.entity_id).map((claim) => {
    const evidence = model.evidenceForClaim(claim.claim_id).map(({ evidence }) => ({
      evidence_id: evidence.evidence_id,
      source_type: evidence.source_type,
      source_uri: evidence.source_uri,
      source_fingerprint: evidence.source_fingerprint,
      path: evidence.path,
      symbol: evidence.symbol,
      verification_method: evidence.verification_method,
      verification_state: evidence.verification_state,
    }));
    return {
      claim_id: claim.claim_id,
      claim_kind: claim.claim_kind,
      normalized_content: claim.normalized_content,
      trust_state: claim.trust_state,
      confidence: claim.confidence,
      impact_class: claim.impact_class,
      injectable: isInjectableTrustState(claim.trust_state),
      evidence,
    } satisfies ExportedClaim;
  });

  return {
    entity_id: entity.entity_id,
    repository_id: entity.repository_id,
    kind: entity.kind,
    canonical_name: entity.canonical_name,
    slug: entity.slug,
    summary: entity.summary,
    status: entity.status,
    claims,
    legacy_packet_ids: legacyPacketIdsForEntity(model, entity.entity_id),
  };
}

interface LegacyIdRow {
  legacy_packet_id: string;
}

function legacyPacketIdsForEntity(model: Repository, entityId: string): string[] {
  const rows = model.database
    .prepare(
      `SELECT legacy_packet_id FROM ${LEGACY_PACKET_MIGRATIONS_TABLE}
       WHERE entity_id = ? ORDER BY legacy_packet_id`,
    )
    .all(entityId) as unknown as LegacyIdRow[];
  return rows.map((row) => row.legacy_packet_id);
}

// ── Render to OKF markdown ──────────────────────────────────────────────────

function yamlScalar(value: string): string {
  return JSON.stringify(value ?? "");
}

function yamlList(items: readonly string[]): string {
  return `[${items.map((item) => JSON.stringify(item)).join(", ")}]`;
}

// The single trust signal for the concept, reported at the strongest state any claim honestly holds:
//   - "verified" ONLY when a claim is evidence-verified (trust_state === "verified"). A foreign OKF
//     consumer reads this as an evidence-verified fact, so it must never be minted from a human
//     approval alone.
//   - "approved" when no claim is verified but at least one is injectable by human approval.
//   - "proposed" (the honest floor) otherwise.
function conceptTrust(concept: ModelConcept): string {
  if (concept.claims.some((claim) => claim.trust_state === "verified")) return "verified";
  if (concept.claims.some((claim) => claim.injectable)) return "approved";
  return "proposed";
}

// Entity kind -> a legacy MemoryType so we can reuse okf.ts's OKF display-type vocabulary. Best-effort
// and purely cosmetic (the authoritative kind is in x-kage-kind and the machine-state block).
const KIND_TO_MEMORY_TYPE: Partial<Record<EntityKind, MemoryType>> = {
  runbook: "runbook",
  decision: "decision",
  incident: "issue_context",
  invariant: "policy",
  contract: "convention",
  component: "code_explanation",
  flow: "workflow",
};

function okfDisplayType(kind: EntityKind): string {
  return okfType(KIND_TO_MEMORY_TYPE[kind] ?? "reference");
}

export function renderModelConceptMarkdown(concept: ModelConcept): string {
  const fm: string[] = [];
  fm.push(`type: ${yamlScalar(okfDisplayType(concept.kind))}`);
  fm.push(`title: ${yamlScalar(concept.canonical_name)}`);
  fm.push(`description: ${yamlScalar(concept.summary)}`);
  const firstPath = concept.claims.flatMap((c) => c.evidence).map((e) => e.path).find((p) => p);
  if (firstPath) fm.push(`resource: ${yamlScalar(firstPath)}`);
  // Kage trust extension (OKF-legal arbitrary producer fields).
  fm.push(`x-kage-entity-id: ${yamlScalar(concept.entity_id)}`);
  fm.push(`x-kage-repository-id: ${yamlScalar(concept.repository_id)}`);
  fm.push(`x-kage-kind: ${yamlScalar(concept.kind)}`);
  fm.push(`x-kage-trust: ${yamlScalar(conceptTrust(concept))}`);
  fm.push(`x-kage-claim-ids: ${yamlList(concept.claims.map((c) => c.claim_id))}`);
  if (concept.legacy_packet_ids.length) {
    fm.push(`x-kage-legacy-packets: ${yamlList(concept.legacy_packet_ids)}`);
  }

  const body: string[] = [];
  body.push(`# ${concept.canonical_name}`, "");
  if (concept.summary.trim()) body.push(concept.summary.trim(), "");

  if (concept.claims.length) {
    body.push("## Claims", "");
    for (const claim of concept.claims) {
      body.push(`### ${claim.claim_kind} — ${claim.trust_state}${claim.injectable ? " (injectable)" : ""}`);
      body.push("");
      if (claim.normalized_content.trim()) body.push(claim.normalized_content.trim(), "");
      if (claim.evidence.length) {
        body.push("Evidence:");
        for (const ev of claim.evidence) {
          body.push(`- ${ev.source_uri} — ${ev.verification_method} (${ev.verification_state})`);
        }
        body.push("");
      }
    }
  }

  if (concept.legacy_packet_ids.length) {
    body.push("## Legacy packets", "");
    for (const id of concept.legacy_packet_ids) body.push(`- ${id}`);
    body.push("");
  }

  body.push(
    "## Kage model state",
    "",
    "Machine state for lossless round-trip; OKF consumers can ignore it.",
    "",
    MODEL_STATE_FENCE,
    JSON.stringify(concept),
    MODEL_STATE_FENCE_CLOSE,
    "",
  );

  return `---\n${fm.join("\n")}\n---\n\n${body.join("\n")}\n`;
}

// ── Parse back (foreign-consumer safe) ──────────────────────────────────────

export function parseModelConcept(content: string): ModelConcept | null {
  const parsed = extractFencedJson(content, MODEL_STATE_FENCE) as ModelConcept | null;
  if (parsed && typeof parsed.entity_id === "string" && Array.isArray(parsed.claims)) return parsed;
  return null;
}

// ── Bundle export ───────────────────────────────────────────────────────────

export function modelConceptFileName(concept: ModelConcept): string {
  const idHash = createHash("sha256").update(concept.entity_id).digest("hex").slice(0, 8);
  return `${concept.slug || "concept"}-${idHash}.md`;
}

/**
 * Export every entity in a repository as an OKF concept document, in a stable (kind, slug) order so a
 * re-export is byte-stable.
 */
export function exportModel(model: Repository, repositoryId: string): ExportedConceptDocument[] {
  return model.listEntities(repositoryId).map((entity) => {
    const concept = exportModelConcept(model, entity);
    return {
      entity_id: entity.entity_id,
      file_name: modelConceptFileName(concept),
      markdown: renderModelConceptMarkdown(concept),
      concept,
    };
  });
}
