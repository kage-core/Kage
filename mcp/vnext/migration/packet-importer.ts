import { createHash } from "node:crypto";

import type { MemoryPacket, MemoryType } from "../../kernel.js";
import type { Repository } from "../repo-model/repository.js";
import { impactFor, reviewPolicyFor, ALWAYS_PROPOSED_KINDS } from "../compiler/candidates.js";
import type { ClaimRecord, EntityKind, TrustState } from "../repo-model/types.js";
import { LEGACY_PACKET_MIGRATIONS_TABLE } from "./schema.js";

/**
 * Import the pre-existing `.agent_memory` packet store into the repository model.
 *
 * This is a ONE-WAY, NON-DESTRUCTIVE bridge from Kage's legacy memory into the Phase B model. Every
 * honesty gate that governs the compiler governs the importer too, and then some:
 *
 *  - Legacy trust is NOT vNext trust. A packet's legacy `status`/quality score is a historical
 *    human/heuristic judgement, never a re-checkable verified-evidence backing. So an imported claim
 *    is floored at `proposed` (non-injectable) for every live packet — a legacy "approved" packet
 *    does NOT become an injectable `approved`/`verified` claim. It routes to review instead.
 *  - The only trust states an import may mint are: `superseded` (the packet was superseded),
 *    `archived` (the packet was deprecated), or `proposed` (everything else). None are injectable.
 *  - Confidence is never a fabricated 1: an imported claim carries a neutral, unmeasured 0.5.
 *  - The ORIGINAL packet is preserved verbatim in the migration ledger so the import is losslessly
 *    reversible, and packet files are NEVER deleted.
 *  - Attribution is preserved: `created_by` is the packet's author, not "importer".
 */

export type ImportDisposition =
  | "create"
  | "merge"
  | "archive"
  | "review"
  | "ungrounded"
  | "rejected_junk";

export interface ImportOptions {
  // The repository a legacy packet's claims belong to. Legacy packets are repo-scoped but do not carry
  // a vNext repository id, so the caller supplies one (default a stable local id).
  repositoryId?: string;
  now?: () => string;
}

export interface PacketClassification {
  disposition: ImportDisposition;
  trust_state: TrustState;
  entity_kind: EntityKind;
  entity_name: string;
  claim_kind: string;
  content: string;
  review_policy: ClaimRecord["review_policy"];
}

export interface ImportResult {
  legacy_packet_id: string;
  source_fingerprint: string;
  disposition: ImportDisposition;
  entity_id: string | null;
  claim: ClaimRecord | null;
  original_packet: MemoryPacket;
}

export interface LegacyPacketMigrationRecord {
  legacy_packet_id: string;
  source_fingerprint: string;
  entity_id: string | null;
  claim_id: string | null;
  disposition: string;
  original_packet_json: string;
  migrated_at: string;
}

const DEFAULT_REPOSITORY_ID = "repository:local";

// Legacy packet type -> repository-model entity kind. Deterministic and total over MemoryType. The
// kinds in ALWAYS_PROPOSED (decision/owner/invariant/incident) route to human review on import.
const PACKET_KIND_MAP: Record<MemoryType, EntityKind> = {
  repo_map: "component",
  runbook: "runbook",
  bug_fix: "incident",
  decision: "decision",
  proposal: "decision",
  rationale: "decision",
  convention: "contract",
  workflow: "flow",
  gotcha: "component",
  reference: "component",
  policy: "invariant",
  issue_context: "incident",
  code_explanation: "component",
  negative_result: "decision",
  constraint: "invariant",
};

function entityKindFor(type: MemoryType): EntityKind {
  return PACKET_KIND_MAP[type] ?? "component";
}

// A stable slug for an entity name (self-contained; mirrors the resolver's slug shape).
function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function digest(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 32);
}

function lengthPrefixed(fields: readonly string[]): string {
  return fields.map((field) => `${Buffer.byteLength(field, "utf8")}:${field}`).join("");
}

export function entityId(repositoryId: string, kind: EntityKind, slug: string): string {
  return `entity-${digest(lengthPrefixed([repositoryId, kind, slug]))}`;
}

export function claimId(entityId: string, claimKind: string, content: string): string {
  return `claim-${digest(lengthPrefixed([entityId, claimKind, content]))}`;
}

/**
 * A stable content fingerprint over a packet's identity- and content-bearing fields. `apply` compares
 * a plan entry's stored fingerprint against the current packet's fingerprint and refuses to import a
 * packet that drifted since the plan was made. Deterministic: same content -> same fingerprint.
 */
export function packetFingerprint(packet: MemoryPacket): string {
  const canonical = JSON.stringify([
    packet.id,
    packet.title,
    packet.summary ?? "",
    packet.body ?? "",
    packet.type,
    packet.status,
    (packet.paths ?? []).slice().sort(),
    packet.updated_at ?? "",
  ]);
  return createHash("sha256").update(canonical).digest("hex");
}

function isJunk(packet: MemoryPacket): boolean {
  const title = (packet.title ?? "").trim();
  const body = (packet.body ?? "").trim();
  const summary = (packet.summary ?? "").trim();
  // Nothing to make a claim from: no title, or no content at all.
  if (title.length === 0 || (body.length === 0 && summary.length === 0)) return true;
  // Kage's OWN auto-generated branch bookkeeping — a `workflow` packet titled "Change memory: <ref>"
  // that kage_propose_from_diff writes on every branch, in every repo. It carries no repository
  // knowledge (it is a per-commit changelog of Kage's internal store), so importing it into the model
  // shows a buyer a "flow: Change memory: master" node that reads as noise. Excluded from the model;
  // the packet itself is untouched and still recallable. This is universal, not a dogfood artifact.
  if (packet.type === "workflow" && /^change memory:/i.test(title)) return true;
  return false;
}

// Trust an imported packet is allowed to carry. Legacy trust is never laundered into an injectable
// state: only superseded/archived (both non-injectable) or proposed.
function trustForStatus(status: MemoryPacket["status"]): TrustState {
  if (status === "superseded") return "superseded";
  if (status === "deprecated") return "archived";
  return "proposed";
}

/**
 * Classify a packet WITHOUT writing anything — the dry-run planner reads this to build its counts.
 * Returns the disposition, the honesty-floored trust, and the entity/claim shape the import will use.
 */
export function classifyPacket(
  packet: MemoryPacket,
  model: Repository,
  opts: ImportOptions = {},
): PacketClassification {
  const repositoryId = opts.repositoryId ?? DEFAULT_REPOSITORY_ID;
  const kind = entityKindFor(packet.type);
  const entityName = (packet.title ?? "").trim() || packet.id;
  const claimKind = packet.type;
  const content = ((packet.body ?? "").trim() || (packet.summary ?? "").trim());
  const reviewPolicy = reviewPolicyFor(kind);
  const trust = trustForStatus(packet.status);

  if (isJunk(packet)) {
    return {
      disposition: "rejected_junk",
      trust_state: trust,
      entity_kind: kind,
      entity_name: entityName,
      claim_kind: claimKind,
      content,
      review_policy: reviewPolicy,
    };
  }

  const eid = entityId(repositoryId, kind, slugify(entityName));
  const cid = claimId(eid, claimKind, content);

  let disposition: ImportDisposition;
  if (model.getClaim(cid)) {
    // Already imported (or an identical claim already exists): a replay folds onto it.
    disposition = "merge";
  } else if (packet.status === "superseded" || packet.status === "deprecated") {
    disposition = "archive";
  } else if (ALWAYS_PROPOSED_KINDS.has(kind)) {
    // A decision/owner/invariant/incident is always a human judgement — it can only ever be proposed
    // for review on import, never auto-trusted.
    disposition = "review";
  } else if (!(packet.paths ?? []).some((path) => path.trim().length > 0)) {
    // No cited path to anchor evidence against: honestly ungrounded, still a proposed claim.
    disposition = "ungrounded";
  } else {
    disposition = "create";
  }

  return {
    disposition,
    trust_state: trust,
    entity_kind: kind,
    entity_name: entityName,
    claim_kind: claimKind,
    content,
    review_policy: reviewPolicy,
  };
}

/**
 * Import a single packet into the model, recording the mapping in the migration ledger. Idempotent:
 * re-importing the same packet folds onto the existing claim (disposition "merge") and re-records the
 * (unchanged) mapping rather than creating a duplicate.
 */
export function importPacket(
  packet: MemoryPacket,
  model: Repository,
  opts: ImportOptions = {},
): ImportResult {
  const repositoryId = opts.repositoryId ?? DEFAULT_REPOSITORY_ID;
  const now = opts.now ?? (() => new Date().toISOString());
  const fingerprint = packetFingerprint(packet);
  const classification = classifyPacket(packet, model, opts);
  const timestamp = now();

  if (classification.disposition === "rejected_junk") {
    recordMigration(model, {
      legacy_packet_id: packet.id,
      source_fingerprint: fingerprint,
      entity_id: null,
      claim_id: null,
      disposition: classification.disposition,
      original_packet_json: JSON.stringify(packet),
      migrated_at: timestamp,
    });
    return {
      legacy_packet_id: packet.id,
      source_fingerprint: fingerprint,
      disposition: classification.disposition,
      entity_id: null,
      claim: null,
      original_packet: packet,
    };
  }

  const slug = slugify(classification.entity_name);
  const eid = entityId(repositoryId, classification.entity_kind, slug);
  const cid = claimId(eid, classification.claim_kind, classification.content);

  // Fold onto an existing claim if it is already present (replay / duplicate content).
  const existing = model.getClaim(cid);
  if (existing) {
    recordMigration(model, {
      legacy_packet_id: packet.id,
      source_fingerprint: fingerprint,
      entity_id: existing.entity_id,
      claim_id: existing.claim_id,
      disposition: "merge",
      original_packet_json: JSON.stringify(packet),
      migrated_at: timestamp,
    });
    return {
      legacy_packet_id: packet.id,
      source_fingerprint: fingerprint,
      disposition: "merge",
      entity_id: existing.entity_id,
      claim: existing,
      original_packet: packet,
    };
  }

  // Upsert the entity (dedupes on repository+kind+slug; returns the existing row if present).
  const entity = model.upsertEntity({
    entity_id: eid,
    repository_id: repositoryId,
    kind: classification.entity_kind,
    canonical_name: classification.entity_name,
    slug,
    summary: (packet.summary ?? "").trim(),
    status: classification.trust_state === "archived" ? "archived" : "active",
    created_at: timestamp,
    updated_at: timestamp,
  });

  // Confidence is neutral and unmeasured (0.5). Never 1 — that would present legacy memory as a
  // verified measurement, which it is not.
  const claim: ClaimRecord = {
    claim_id: cid,
    entity_id: entity.entity_id,
    claim_kind: classification.claim_kind,
    normalized_content: classification.content,
    trust_state: classification.trust_state,
    confidence: 0.5,
    impact_class: impactFor(classification.entity_kind),
    valid_from_commit: null,
    valid_to_commit: null,
    supersedes_claim_id: null,
    review_policy: classification.review_policy,
    // Attribution is preserved: the team member who authored the packet, not the importer.
    created_by: packet.author_name?.trim() || "legacy-import",
    created_at: packet.created_at || timestamp,
    updated_at: timestamp,
  };
  // No evidence links: a legacy packet is not re-checkable ground truth, so nothing here can carry a
  // claim to verified. createClaim's honesty gate would in any case reject a verified/approved claim
  // without backing; the floored trust makes that impossible by construction.
  const created = model.createClaim(claim, []);

  recordMigration(model, {
    legacy_packet_id: packet.id,
    source_fingerprint: fingerprint,
    entity_id: entity.entity_id,
    claim_id: created.claim_id,
    disposition: classification.disposition,
    original_packet_json: JSON.stringify(packet),
    migrated_at: timestamp,
  });

  return {
    legacy_packet_id: packet.id,
    source_fingerprint: fingerprint,
    disposition: classification.disposition,
    entity_id: entity.entity_id,
    claim: created,
    original_packet: packet,
  };
}

// ── Migration ledger access ─────────────────────────────────────────────────

interface LegacyMigrationRow {
  legacy_packet_id: string;
  source_fingerprint: string;
  entity_id: string | null;
  claim_id: string | null;
  disposition: string;
  original_packet_json: string;
  migrated_at: string;
}

export function recordMigration(model: Repository, record: LegacyPacketMigrationRecord): void {
  model.database
    .prepare(
      `INSERT INTO ${LEGACY_PACKET_MIGRATIONS_TABLE}
         (legacy_packet_id, source_fingerprint, entity_id, claim_id, disposition, original_packet_json, migrated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(legacy_packet_id) DO UPDATE SET
         source_fingerprint = excluded.source_fingerprint,
         entity_id = excluded.entity_id,
         claim_id = excluded.claim_id,
         disposition = excluded.disposition,
         original_packet_json = excluded.original_packet_json,
         migrated_at = excluded.migrated_at`,
    )
    .run(
      record.legacy_packet_id,
      record.source_fingerprint,
      record.entity_id,
      record.claim_id,
      record.disposition,
      record.original_packet_json,
      record.migrated_at,
    );
}

export function readMigration(
  model: Repository,
  legacyPacketId: string,
): LegacyPacketMigrationRecord | null {
  const row = model.database
    .prepare(`SELECT * FROM ${LEGACY_PACKET_MIGRATIONS_TABLE} WHERE legacy_packet_id = ?`)
    .get(legacyPacketId) as LegacyMigrationRow | undefined;
  return row ? { ...row } : null;
}

export function listMigrations(model: Repository): LegacyPacketMigrationRecord[] {
  const rows = model.database
    .prepare(`SELECT * FROM ${LEGACY_PACKET_MIGRATIONS_TABLE} ORDER BY legacy_packet_id`)
    .all() as unknown as LegacyMigrationRow[];
  return rows.map((row) => ({ ...row }));
}
