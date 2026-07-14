import { createHash, randomUUID } from "node:crypto";
import { isRecord } from "../../type-guards.js";
import type {
  AdapterCapability,
  AdapterHandshake,
  ContextCapsule,
  EvidenceEvent,
  PrivacyClass,
  RepositoryIdentity,
  TaskIdentity,
} from "../protocol/index.js";
import { KAGE_PROTOCOL_VERSION } from "../protocol/index.js";

export const CLAUDE_ADAPTER_ID = "claude-code-hooks";
export const CLAUDE_AGENT_SURFACE = "claude-code";

// The context block the hook prints into the session. The delimiters are literal and stable so a
// reader (human or model) can see exactly where repository memory starts and stops, and so a
// future adapter can strip it back out for exact measurement.
export const KAGE_CONTEXT_BEGIN = "<<<KAGE_CONTEXT>>>";
export const KAGE_CONTEXT_END = "<<<END_KAGE_CONTEXT>>>";

// A prompt is evidence, not a payload: keep it bounded so one pasted stack trace cannot turn a
// hook post into a multi-megabyte request the runtime would reject anyway.
const MAX_TEXT_CHARS = 4_000;
const MAX_PATH_CHARS = 1_024;

const CLAUDE_CAPABILITIES: AdapterCapability[] = [
  "session_start",
  "prompt",
  "file_open",
  "file_edit",
  "tool_result",
  "session_end",
  "inject_system",
  "inject_user_turn",
];

// Only paths and tool names are team-shareable by default. Anything carrying user or file text
// stays local_raw, which is the class the storage layer treats as never-leaves-this-machine.
const PRIVACY_BY_EVENT: Record<EvidenceEvent["event_type"], PrivacyClass> = {
  session_start: "team_metadata",
  session_end: "team_metadata",
  file_open: "team_metadata",
  file_edit: "team_metadata",
  prompt: "local_raw",
  tool_result: "local_raw",
};

const EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
const READ_TOOLS = new Set(["Read", "NotebookRead"]);

function text(value: unknown, limit = MAX_TEXT_CHARS): string {
  return typeof value === "string" ? value.slice(0, limit) : "";
}

function toolInput(payload: Record<string, unknown>): Record<string, unknown> {
  const value = payload.tool_input ?? payload.toolInput;
  return isRecord(value) ? value : {};
}

function hookPath(payload: Record<string, unknown>): string {
  const input = toolInput(payload);
  const candidate = input.file_path ?? input.path ?? input.notebook_path;
  return text(candidate, MAX_PATH_CHARS);
}

function fingerprint(parts: readonly unknown[]): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

export function claudeRepositoryIdentity(
  root: string,
  git: { remote?: string | null; branch?: string | null; commit?: string | null } = {},
): RepositoryIdentity {
  const remote = typeof git.remote === "string" && git.remote.trim() ? git.remote.trim() : null;
  // Identity follows the repository, not the checkout state: branch and commit move constantly and
  // must not fork the repo_id (or every commit would look like a new repository).
  const repoId = `repo_${createHash("sha256").update(remote ?? root).digest("hex").slice(0, 32)}`;
  return {
    repo_id: repoId,
    root,
    remote,
    branch: typeof git.branch === "string" && git.branch.trim() ? git.branch.trim() : null,
    commit: typeof git.commit === "string" && git.commit.trim() ? git.commit.trim() : null,
    worktree: root,
  };
}

export function claudeTaskIdentity(repository: RepositoryIdentity, sessionId: string): TaskIdentity {
  const session = sessionId.trim() || "default";
  return {
    task_id: `task_${createHash("sha256").update(`${repository.repo_id}|${session}`).digest("hex").slice(0, 32)}`,
    session_id: session,
    // Kage never invents a user identity locally; a team surface supplies one later.
    user_id: null,
    agent_surface: CLAUDE_AGENT_SURFACE,
  };
}

export function claudeHandshake(
  repository: RepositoryIdentity,
  sessionId: string,
  agentVersion: string | null = null,
): AdapterHandshake {
  return {
    protocol_version: KAGE_PROTOCOL_VERSION,
    adapter_id: CLAUDE_ADAPTER_ID,
    agent_surface: CLAUDE_AGENT_SURFACE,
    agent_version: agentVersion,
    repository,
    task: claudeTaskIdentity(repository, sessionId),
    capabilities: CLAUDE_CAPABILITIES,
  };
}

// Protocol v1 is frozen: a Claude hook that has no protocol event type is SKIPPED, never coerced
// into the nearest one. Returning null is the honest answer and the adapter treats it as a no-op.
export function claudeEventType(hookEventName: string, toolName: string): EvidenceEvent["event_type"] | null {
  switch (hookEventName) {
    case "SessionStart":
      return "session_start";
    case "UserPromptSubmit":
      return "prompt";
    case "PreToolUse":
      if (READ_TOOLS.has(toolName)) return "file_open";
      if (EDIT_TOOLS.has(toolName)) return "file_edit";
      return null;
    case "PostToolUse":
    case "PostToolUseFailure":
      return "tool_result";
    case "SessionEnd":
      return "session_end";
    default:
      return null;
  }
}

function eventPayload(
  eventType: EvidenceEvent["event_type"],
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const tool = text(payload.tool_name ?? payload.toolName, 128);
  switch (eventType) {
    case "session_start":
      return { agent_surface: CLAUDE_AGENT_SURFACE };
    case "session_end":
      return { agent_surface: CLAUDE_AGENT_SURFACE, reason: text(payload.reason, 128) };
    case "prompt":
      return { text: text(payload.prompt ?? payload.user_prompt ?? payload.message) };
    case "file_open":
    case "file_edit":
      // Paths and the tool name only. The edit's old/new text is the most sensitive thing a hook
      // ever sees and it has no place in a team_metadata event.
      return { tool, path: hookPath(payload) };
    case "tool_result":
      return {
        tool,
        path: hookPath(payload),
        outcome: payload.hook_event_name === "PostToolUseFailure" ? "error" : "ok",
      };
  }
}

export function claudeHookToEvent(
  eventType: EvidenceEvent["event_type"],
  payload: Record<string, unknown>,
  repository: RepositoryIdentity,
  now: Date = new Date(),
): EvidenceEvent | null {
  const sessionId = text(payload.session_id ?? payload.sessionId, 256);
  const task = claudeTaskIdentity(repository, sessionId);
  const body = eventPayload(eventType, payload);
  // A file event with no path, or a prompt with no text, is not evidence — it is noise.
  if ((eventType === "file_open" || eventType === "file_edit") && !body.path) return null;
  if (eventType === "prompt" && !body.text) return null;

  const occurredAt = now.toISOString();
  return {
    protocol_version: KAGE_PROTOCOL_VERSION,
    event_id: `event_${randomUUID()}`,
    event_type: eventType,
    occurred_at: occurredAt,
    repository_id: repository.repo_id,
    task_id: task.task_id,
    privacy_class: PRIVACY_BY_EVENT[eventType],
    // The store deduplicates on source_fingerprint, so the fingerprint must describe the SIGNAL,
    // not this particular post: a hook retried after a failed-open post must not double-record.
    // event_id is random and deliberately excluded.
    source_fingerprint: fingerprint([repository.repo_id, task.task_id, eventType, occurredAt, body]),
    payload: body,
  };
}

export function renderContextBlock(capsule: ContextCapsule): string {
  if (!capsule.sections.length) return "";
  const body = capsule.sections
    .map((section) => `## ${section.title} (${section.kind})\n${section.body}`)
    .join("\n\n");
  return `${KAGE_CONTEXT_BEGIN}\n${body}\n${KAGE_CONTEXT_END}\n`;
}
