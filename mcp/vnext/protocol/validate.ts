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

function ownValue(record: Record<string, unknown>, name: string): unknown {
  return Object.prototype.hasOwnProperty.call(record, name) ? record[name] : undefined;
}

function requiredString(value: unknown, name: string, errors: string[]): string | undefined {
  if (typeof value === "string" && value.trim()) return value;
  errors.push(`${name} must be a non-empty string`);
  return undefined;
}

function nullableString(value: unknown, name: string, errors: string[]): string | null | undefined {
  if (value === null || (typeof value === "string" && value.trim())) return value;
  errors.push(`${name} must be null or a non-empty string`);
  return undefined;
}

function isoTimestamp(value: unknown, name: string, errors: string[]): string | undefined {
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
    ) return text;
  }
  errors.push(`${name} must be an ISO timestamp`);
  return undefined;
}

function isKnownString<T extends string>(value: unknown, allowed: ReadonlySet<T>): value is T {
  return typeof value === "string" && allowed.has(value as T);
}

export function validateHandshake(value: unknown): ValidationResult<AdapterHandshake> {
  const errors: string[] = [];
  if (!isRecord(value)) return { ok: false, errors: ["handshake must be an object"] };

  const protocolVersion = ownValue(value, "protocol_version");
  if (protocolVersion !== KAGE_PROTOCOL_VERSION) errors.push("unsupported protocol_version");
  const adapterId = requiredString(ownValue(value, "adapter_id"), "adapter_id", errors);
  const agentSurface = requiredString(ownValue(value, "agent_surface"), "agent_surface", errors);
  const agentVersion = nullableString(ownValue(value, "agent_version"), "agent_version", errors);

  let repository: AdapterHandshake["repository"] | undefined;
  const repositoryValue = ownValue(value, "repository");
  if (!isRecord(repositoryValue)) {
    errors.push("repository must be an object");
  } else {
    const repoId = requiredString(ownValue(repositoryValue, "repo_id"), "repository.repo_id", errors);
    const root = requiredString(ownValue(repositoryValue, "root"), "repository.root", errors);
    const remote = nullableString(ownValue(repositoryValue, "remote"), "repository.remote", errors);
    const branch = nullableString(ownValue(repositoryValue, "branch"), "repository.branch", errors);
    const commit = nullableString(ownValue(repositoryValue, "commit"), "repository.commit", errors);
    const worktree = requiredString(ownValue(repositoryValue, "worktree"), "repository.worktree", errors);
    if (
      repoId !== undefined
      && root !== undefined
      && remote !== undefined
      && branch !== undefined
      && commit !== undefined
      && worktree !== undefined
    ) {
      repository = { repo_id: repoId, root, remote, branch, commit, worktree };
    }
  }

  let task: AdapterHandshake["task"] | undefined;
  const taskValue = ownValue(value, "task");
  if (!isRecord(taskValue)) {
    errors.push("task must be an object");
  } else {
    const taskId = requiredString(ownValue(taskValue, "task_id"), "task.task_id", errors);
    const sessionId = requiredString(ownValue(taskValue, "session_id"), "task.session_id", errors);
    const userId = nullableString(ownValue(taskValue, "user_id"), "task.user_id", errors);
    const taskAgentSurface = requiredString(ownValue(taskValue, "agent_surface"), "task.agent_surface", errors);
    if (taskId !== undefined && sessionId !== undefined && userId !== undefined && taskAgentSurface !== undefined) {
      task = { task_id: taskId, session_id: sessionId, user_id: userId, agent_surface: taskAgentSurface };
    }
  }

  let capabilities: AdapterCapability[] | undefined;
  const capabilitiesValue = ownValue(value, "capabilities");
  if (!Array.isArray(capabilitiesValue)) {
    errors.push("capabilities must be an array");
  } else {
    const validatedCapabilities: AdapterCapability[] = [];
    for (let index = 0; index < capabilitiesValue.length; index += 1) {
      const capability = capabilitiesValue[index];
      if (isKnownString(capability, ADAPTER_CAPABILITIES)) {
        validatedCapabilities.push(capability);
      } else {
        errors.push(`capabilities[${index}] is invalid`);
      }
    }
    if (validatedCapabilities.length === capabilitiesValue.length) capabilities = validatedCapabilities;
  }

  if (
    errors.length
    || protocolVersion !== KAGE_PROTOCOL_VERSION
    || adapterId === undefined
    || agentSurface === undefined
    || agentVersion === undefined
    || repository === undefined
    || task === undefined
    || capabilities === undefined
  ) return { ok: false, errors };

  return {
    ok: true,
    value: {
      protocol_version: KAGE_PROTOCOL_VERSION,
      adapter_id: adapterId,
      agent_surface: agentSurface,
      agent_version: agentVersion,
      repository,
      task,
      capabilities,
    },
  };
}

export function validateEvidenceEvent(value: unknown): ValidationResult<EvidenceEvent> {
  const errors: string[] = [];
  if (!isRecord(value)) return { ok: false, errors: ["event must be an object"] };

  const protocolVersion = ownValue(value, "protocol_version");
  if (protocolVersion !== KAGE_PROTOCOL_VERSION) errors.push("unsupported protocol_version");
  const eventId = requiredString(ownValue(value, "event_id"), "event_id", errors);
  const eventTypeValue = ownValue(value, "event_type");
  const eventType = isKnownString(eventTypeValue, EVIDENCE_EVENT_TYPES) ? eventTypeValue : undefined;
  if (eventType === undefined) errors.push("event_type is invalid");
  const occurredAt = isoTimestamp(ownValue(value, "occurred_at"), "occurred_at", errors);
  const repositoryId = requiredString(ownValue(value, "repository_id"), "repository_id", errors);
  const taskId = requiredString(ownValue(value, "task_id"), "task_id", errors);
  const privacyClassValue = ownValue(value, "privacy_class");
  const privacyClass = isKnownString(privacyClassValue, PRIVACY_CLASSES) ? privacyClassValue : undefined;
  if (privacyClass === undefined) errors.push("privacy_class is invalid");
  const sourceFingerprint = requiredString(ownValue(value, "source_fingerprint"), "source_fingerprint", errors);
  const payloadValue = ownValue(value, "payload");
  const payload = isRecord(payloadValue) ? Object.fromEntries(Object.entries(payloadValue)) : undefined;
  if (payload === undefined) errors.push("payload must be an object");

  if (
    errors.length
    || protocolVersion !== KAGE_PROTOCOL_VERSION
    || eventId === undefined
    || eventType === undefined
    || occurredAt === undefined
    || repositoryId === undefined
    || taskId === undefined
    || privacyClass === undefined
    || sourceFingerprint === undefined
    || payload === undefined
  ) return { ok: false, errors };

  return {
    ok: true,
    value: {
      protocol_version: KAGE_PROTOCOL_VERSION,
      event_id: eventId,
      event_type: eventType,
      occurred_at: occurredAt,
      repository_id: repositoryId,
      task_id: taskId,
      privacy_class: privacyClass,
      source_fingerprint: sourceFingerprint,
      payload,
    },
  };
}
