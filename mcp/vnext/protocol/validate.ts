import { isRecord } from "../../type-guards.js";
import {
  KAGE_PROTOCOL_VERSION,
  type AdapterCapability,
  type AdapterHandshake,
  type EvidenceEvent,
  type PrivacyClass,
} from "./types.js";

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

const ADAPTER_CAPABILITIES = new Set<AdapterCapability>([
  "session_start",
  "prompt",
  "file_open",
  "file_edit",
  "tool_result",
  "session_end",
  "inject_system",
  "inject_user_turn",
  "provider_usage",
]);
const EVIDENCE_EVENT_TYPES = new Set<EvidenceEvent["event_type"]>([
  "session_start",
  "prompt",
  "file_open",
  "file_edit",
  "tool_result",
  "session_end",
]);
const PRIVACY_CLASSES = new Set<PrivacyClass>(["local_raw", "team_metadata", "team_approved"]);
const ISO_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function requiredString(value: unknown, name: string, errors: string[]): value is string {
  if (typeof value === "string" && value.trim()) return true;
  errors.push(`${name} must be a non-empty string`);
  return false;
}

function nullableString(value: unknown, name: string, errors: string[]): value is string | null {
  if (value === null || (typeof value === "string" && value.trim())) return true;
  errors.push(`${name} must be null or a non-empty string`);
  return false;
}

function isoTimestamp(value: unknown, name: string, errors: string[]): value is string {
  const text = typeof value === "string" ? value : "";
  const match = ISO_TIMESTAMP.exec(text);
  if (match) {
    const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const hour = Number(hourText);
    const minute = Number(minuteText);
    const second = Number(secondText);
    const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (
      month >= 1
      && month <= 12
      && day >= 1
      && day <= daysInMonth[month - 1]
      && hour <= 23
      && minute <= 59
      && second <= 59
      && Number.isFinite(Date.parse(text))
    ) return true;
  }
  errors.push(`${name} must be an ISO timestamp`);
  return false;
}

export function validateHandshake(value: unknown): ValidationResult<AdapterHandshake> {
  const errors: string[] = [];
  if (!isRecord(value)) return { ok: false, errors: ["handshake must be an object"] };

  if (value.protocol_version !== KAGE_PROTOCOL_VERSION) errors.push("unsupported protocol_version");
  requiredString(value.adapter_id, "adapter_id", errors);
  requiredString(value.agent_surface, "agent_surface", errors);
  nullableString(value.agent_version, "agent_version", errors);

  if (!isRecord(value.repository)) {
    errors.push("repository must be an object");
  } else {
    requiredString(value.repository.repo_id, "repository.repo_id", errors);
    requiredString(value.repository.root, "repository.root", errors);
    nullableString(value.repository.remote, "repository.remote", errors);
    nullableString(value.repository.branch, "repository.branch", errors);
    nullableString(value.repository.commit, "repository.commit", errors);
    requiredString(value.repository.worktree, "repository.worktree", errors);
  }

  if (!isRecord(value.task)) {
    errors.push("task must be an object");
  } else {
    requiredString(value.task.task_id, "task.task_id", errors);
    requiredString(value.task.session_id, "task.session_id", errors);
    nullableString(value.task.user_id, "task.user_id", errors);
    requiredString(value.task.agent_surface, "task.agent_surface", errors);
  }

  if (!Array.isArray(value.capabilities)) {
    errors.push("capabilities must be an array");
  } else {
    value.capabilities.forEach((capability, index) => {
      if (!ADAPTER_CAPABILITIES.has(capability as AdapterCapability)) {
        errors.push(`capabilities[${index}] is invalid`);
      }
    });
  }

  return errors.length ? { ok: false, errors } : { ok: true, value: value as unknown as AdapterHandshake };
}

export function validateEvidenceEvent(value: unknown): ValidationResult<EvidenceEvent> {
  const errors: string[] = [];
  if (!isRecord(value)) return { ok: false, errors: ["event must be an object"] };

  if (value.protocol_version !== KAGE_PROTOCOL_VERSION) errors.push("unsupported protocol_version");
  requiredString(value.event_id, "event_id", errors);
  if (!EVIDENCE_EVENT_TYPES.has(value.event_type as EvidenceEvent["event_type"])) errors.push("event_type is invalid");
  isoTimestamp(value.occurred_at, "occurred_at", errors);
  requiredString(value.repository_id, "repository_id", errors);
  requiredString(value.task_id, "task_id", errors);
  if (!PRIVACY_CLASSES.has(value.privacy_class as PrivacyClass)) errors.push("privacy_class is invalid");
  requiredString(value.source_fingerprint, "source_fingerprint", errors);
  if (!isRecord(value.payload)) errors.push("payload must be an object");

  return errors.length ? { ok: false, errors } : { ok: true, value: value as unknown as EvidenceEvent };
}
