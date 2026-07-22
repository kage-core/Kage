import { KAGE_PROTOCOL_VERSION, type EvidenceEvent } from "../protocol/index.js";
import type { LocalDatabase } from "./database.js";
import { parseJsonObject, stringifyJsonObject } from "./json.js";

interface EvidenceEventRow {
  event_id: string;
  event_type: EvidenceEvent["event_type"];
  occurred_at: string;
  repository_id: string;
  task_id: string;
  privacy_class: EvidenceEvent["privacy_class"];
  source_fingerprint: string;
  payload_json: string;
}

export interface EventAppendResult {
  inserted: boolean;
}

export class EventStore {
  constructor(private readonly db: LocalDatabase) {}

  append(event: EvidenceEvent): EventAppendResult {
    const payloadJson = stringifyJsonObject(
      event.payload,
      `evidence_events.payload_json for event_id "${event.event_id}"`,
    );
    const result = this.db
      .prepare(`
        INSERT INTO evidence_events (
          event_id,
          event_type,
          occurred_at,
          repository_id,
          task_id,
          privacy_class,
          source_fingerprint,
          payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(source_fingerprint) DO NOTHING
      `)
      .run(
        event.event_id,
        event.event_type,
        event.occurred_at,
        event.repository_id,
        event.task_id,
        event.privacy_class,
        event.source_fingerprint,
        payloadJson,
      );

    return { inserted: result.changes !== 0 };
  }

  forTask(taskId: string): EvidenceEvent[] {
    return this.query(`WHERE task_id = ? ORDER BY occurred_at, event_id`, taskId);
  }

  // Every event for a repository in stable (occurred_at, event_id) order. The compiler reads this to
  // rebuild episodes; the ordering is the same total order the checkpoint cursor and lag counter use.
  forRepository(repositoryId: string): EvidenceEvent[] {
    return this.query(`WHERE repository_id = ? ORDER BY occurred_at, event_id`, repositoryId);
  }

  private query(clause: string, param: string): EvidenceEvent[] {
    const rows = this.db
      .prepare(`
        SELECT
          event_id,
          event_type,
          occurred_at,
          repository_id,
          task_id,
          privacy_class,
          source_fingerprint,
          payload_json
        FROM evidence_events
        ${clause}
      `)
      .all(param) as unknown as EvidenceEventRow[];

    return rows.map((row) => ({
      protocol_version: KAGE_PROTOCOL_VERSION,
      event_id: row.event_id,
      event_type: row.event_type,
      occurred_at: row.occurred_at,
      repository_id: row.repository_id,
      task_id: row.task_id,
      privacy_class: row.privacy_class,
      source_fingerprint: row.source_fingerprint,
      payload: parseJsonObject(
        row.payload_json,
        `evidence_events.payload_json for event_id "${row.event_id}"`,
      ),
    }));
  }
}
