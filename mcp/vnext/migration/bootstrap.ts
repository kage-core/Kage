import { openRepositoryModel } from "./model-store.js";
import { planMigration, applyMigration } from "./migration-report.js";
import { loadApprovedPackets } from "../../kernel.js";

export interface PortalBootstrapResult {
  /** True only when this call actually imported packets (the model was empty and packets existed). */
  bootstrapped: boolean;
  /** Entities already in the model before this call — >0 means we left it untouched. */
  entities_before: number;
  /** Packets imported this call. */
  imported: number;
  /** Why nothing was imported, when bootstrapped is false. Null when it did import. */
  reason: string | null;
}

/**
 * Populate the knowledge-portal repository model from the repo's approved packets, IF the model is
 * empty. The portal reads the compiled repository model, not the legacy packet store — so a repo with
 * plenty of memory but no migrated model shows an EMPTY portal, which is disqualifying the first time
 * a prospect opens it. This bootstraps that model on demand so `kage viewer` is never blank.
 *
 * Deliberately conservative and safe to call on every viewer launch:
 *   - Gated on an empty model: if any entity exists, it does nothing (idempotent, no churn).
 *   - Non-destructive: packet files are never touched; nothing imported is injectable (every claim is
 *     proposed until reviewed), so this only populates a READ view, never the agent's context.
 *   - Never throws: a Node without node:sqlite, or any failure, returns a reason instead of crashing
 *     the viewer. The portal then serves its honest empty state.
 *
 * Not a substitute for `kage migrate` — that stays the explicit, reviewable path (and can include
 * pending packets). This is only the "don't show a new user a blank dashboard" bootstrap.
 */
export function bootstrapPortalModelIfEmpty(projectDir: string): PortalBootstrapResult {
  let opened: ReturnType<typeof openRepositoryModel> | undefined;
  try {
    opened = openRepositoryModel(projectDir);
  } catch (error) {
    return {
      bootstrapped: false,
      entities_before: 0,
      imported: 0,
      reason: error instanceof Error ? error.message : "repository model unavailable",
    };
  }
  try {
    const before = (opened.model.database.prepare("SELECT COUNT(*) AS c FROM entities").get() as { c: number }).c;
    if (before > 0) {
      return { bootstrapped: false, entities_before: before, imported: 0, reason: "model already populated" };
    }
    const packets = loadApprovedPackets(projectDir);
    if (packets.length === 0) {
      return { bootstrapped: false, entities_before: 0, imported: 0, reason: "no approved packets to import" };
    }
    const plan = planMigration(packets, opened.model);
    const result = applyMigration(plan, packets, opened.model);
    return {
      bootstrapped: result.applied > 0,
      entities_before: 0,
      imported: result.applied,
      reason: result.applied > 0 ? null : "nothing imported (all packets junk or ungrounded)",
    };
  } catch (error) {
    return {
      bootstrapped: false,
      entities_before: 0,
      imported: 0,
      reason: error instanceof Error ? error.message : "bootstrap failed",
    };
  } finally {
    opened.close();
  }
}
