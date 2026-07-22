import type { MemoryPacket } from "../../kernel.js";
import type { Repository } from "../repo-model/repository.js";
import type { TrustState, EntityKind } from "../repo-model/types.js";
import {
  classifyPacket,
  importPacket,
  packetFingerprint,
  type ImportDisposition,
  type ImportOptions,
} from "./packet-importer.js";

/**
 * The dry-run migration planner and its non-destructive `apply`.
 *
 * `planMigration` classifies every legacy packet WITHOUT writing anything and returns per-disposition
 * counts plus one entry per packet, each carrying the source fingerprint the packet had when the plan
 * was made. `applyMigration` re-checks that fingerprint against the current packet and refuses to
 * import any packet that drifted since the plan — so a stale plan can never silently import content
 * the reviewer never saw. It NEVER deletes packet files; the legacy store stays intact.
 */

export type DispositionCounts = Record<ImportDisposition, number>;

export interface MigrationPlanEntry {
  legacy_packet_id: string;
  source_fingerprint: string;
  disposition: ImportDisposition;
  entity_kind: EntityKind;
  entity_name: string;
  claim_kind: string;
  trust_state: TrustState;
}

export interface MigrationPlan {
  generated_at: string;
  repository_id: string;
  counts: DispositionCounts;
  entries: MigrationPlanEntry[];
}

export interface ApplyResultEntry {
  legacy_packet_id: string;
  disposition: ImportDisposition | "skipped_missing" | "skipped_fingerprint_mismatch";
  claim_id: string | null;
  entity_id: string | null;
}

export interface ApplyResult {
  applied: number;
  skipped_fingerprint_mismatch: number;
  skipped_missing: number;
  entries: ApplyResultEntry[];
}

const DEFAULT_REPOSITORY_ID = "repository:local";

function emptyCounts(): DispositionCounts {
  return {
    create: 0,
    merge: 0,
    archive: 0,
    review: 0,
    ungrounded: 0,
    rejected_junk: 0,
  };
}

export function planMigration(
  packets: readonly MemoryPacket[],
  model: Repository,
  opts: ImportOptions = {},
): MigrationPlan {
  const repositoryId = opts.repositoryId ?? DEFAULT_REPOSITORY_ID;
  const now = opts.now ?? (() => new Date().toISOString());
  const counts = emptyCounts();
  const entries: MigrationPlanEntry[] = [];

  for (const packet of packets) {
    const classification = classifyPacket(packet, model, opts);
    counts[classification.disposition] += 1;
    entries.push({
      legacy_packet_id: packet.id,
      source_fingerprint: packetFingerprint(packet),
      disposition: classification.disposition,
      entity_kind: classification.entity_kind,
      entity_name: classification.entity_name,
      claim_kind: classification.claim_kind,
      trust_state: classification.trust_state,
    });
  }

  return { generated_at: now(), repository_id: repositoryId, counts, entries };
}

/**
 * Apply a plan. Only a packet whose CURRENT fingerprint still matches the plan entry is imported; a
 * drifted or missing packet is skipped and left untouched (not recorded as migrated). Idempotent via
 * importPacket (a re-apply folds onto existing claims).
 */
export function applyMigration(
  plan: MigrationPlan,
  packets: readonly MemoryPacket[],
  model: Repository,
  opts: ImportOptions = {},
): ApplyResult {
  const byId = new Map<string, MemoryPacket>();
  for (const packet of packets) byId.set(packet.id, packet);

  const importOpts: ImportOptions = {
    repositoryId: opts.repositoryId ?? plan.repository_id ?? DEFAULT_REPOSITORY_ID,
    now: opts.now,
  };

  const result: ApplyResult = {
    applied: 0,
    skipped_fingerprint_mismatch: 0,
    skipped_missing: 0,
    entries: [],
  };

  for (const entry of plan.entries) {
    const packet = byId.get(entry.legacy_packet_id);
    if (!packet) {
      result.skipped_missing += 1;
      result.entries.push({
        legacy_packet_id: entry.legacy_packet_id,
        disposition: "skipped_missing",
        claim_id: null,
        entity_id: null,
      });
      continue;
    }
    if (packetFingerprint(packet) !== entry.source_fingerprint) {
      // The packet changed since the plan was made: refuse to import content the reviewer never saw.
      result.skipped_fingerprint_mismatch += 1;
      result.entries.push({
        legacy_packet_id: entry.legacy_packet_id,
        disposition: "skipped_fingerprint_mismatch",
        claim_id: null,
        entity_id: null,
      });
      continue;
    }

    const imported = importPacket(packet, model, importOpts);
    result.applied += 1;
    result.entries.push({
      legacy_packet_id: imported.legacy_packet_id,
      disposition: imported.disposition,
      claim_id: imported.claim?.claim_id ?? null,
      entity_id: imported.entity_id,
    });
  }

  return result;
}

export function renderPlanText(plan: MigrationPlan): string {
  const lines: string[] = [];
  lines.push(`Migration plan (${plan.entries.length} packet(s), repository ${plan.repository_id}):`);
  for (const [disposition, count] of Object.entries(plan.counts)) {
    lines.push(`  ${disposition.padEnd(14)} ${count}`);
  }
  return lines.join("\n");
}
