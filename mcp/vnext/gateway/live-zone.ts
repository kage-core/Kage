import { isRecord } from "../../type-guards.js";

// The live zone is the CACHE-SAFETY contract for the transform pipeline.
//
// A provider's prompt cache keys on a byte-identical prefix. The pipeline is only allowed to mutate
// the MUTABLE region of a request; the STABLE PREFIX (system + tools + older turns) must survive
// byte-for-byte, or every cached token is re-billed. The live zone declares, per adapter, exactly
// which slice of the request may change and where injected context is allowed to land.
//
// Indices are half-open ranges into the request's `messages` array:
//   messages[0 .. mutable_start)   -> stable prefix (never touched)
//   messages[mutable_start .. mutable_end) -> mutable region (may be transformed)
// An EMPTY mutable region (mutable_start === mutable_end) means "no mutation" — the pipeline leaves
// the request byte-identical. Unknown adapters always receive an empty mutable region.

export interface LiveZone {
  /** messages[0 .. stable_prefix_end) are the byte-stable prefix (never mutated). */
  stable_prefix_end: number;
  /** First mutable message index (inclusive). */
  mutable_start: number;
  /** End of the mutable region (exclusive). */
  mutable_end: number;
  /** Where injected context is allowed to land within the mutable region. */
  injection_location: "system" | "user_turn" | "tool_result";
}

interface HasMessages {
  messages?: unknown;
}

function messagesOf(request: HasMessages): unknown[] {
  return Array.isArray(request.messages) ? request.messages : [];
}

// Anthropic Messages: system, tools, and every message before the final USER turn are the stable
// prefix; the final user turn (and anything after it, e.g. an assistant prefill) is mutable. This
// is exactly the region the shipped proxy's injectLastUserTurn already respects — it appends to the
// last user turn and never touches `system`, because a modified system prompt is rejected by
// subscription/OAuth tokens.
export function anthropicLiveZone(request: HasMessages): LiveZone {
  const messages = messagesOf(request);
  let lastUser = -1;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (isRecord(message) && message.role === "user") {
      lastUser = i;
      break;
    }
  }
  if (lastUser === -1) {
    // No user turn to mutate: leave the whole request stable.
    return {
      stable_prefix_end: messages.length,
      mutable_start: messages.length,
      mutable_end: messages.length,
      injection_location: "user_turn",
    };
  }
  return {
    stable_prefix_end: lastUser,
    mutable_start: lastUser,
    mutable_end: messages.length,
    injection_location: "user_turn",
  };
}

// An adapter Kage does not understand gets NO mutable region — the pipeline forwards it untouched.
// Native hooks declare their supported injection point during handshake; until then they, too, are
// treated as unknown.
export function unknownLiveZone(request: HasMessages): LiveZone {
  const messages = messagesOf(request);
  return {
    stable_prefix_end: messages.length,
    mutable_start: messages.length,
    mutable_end: messages.length,
    injection_location: "user_turn",
  };
}
