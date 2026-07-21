import { isRecord } from "../../type-guards.js";
import { ContentStore } from "./content-store.js";

// W2 — reversible HISTORY digestion.
//
// The dominant context-window waste in an agent session is not any single body — it is the
// CONVERSATION HISTORY: every old tool_result is re-sent verbatim on every subsequent turn. This
// module digests tool payloads that sit in the STABLE PREFIX (strictly before the live zone) down to
// a deterministic head / error-lines / tail summary plus a `kage-content:<sha256>` retrieval marker.
// The EXACT original is stored in the content-addressed store BEFORE any byte is dropped, so the
// model (or a human) can always retrieve it — reversibility is the license for aggression here.
//
// CACHE-STABILITY is the load-bearing property: the digest is a pure function of the payload bytes
// (no wall-clock, no randomness, no request-relative numbering), so a session that re-sends the same
// history produces a byte-identical digested prefix on every turn. The provider prompt cache misses
// ONCE (the first digested request) and then re-keys on the digest form. Idempotence follows from
// determinism plus the marker guard: a block that already carries a retrieval marker is never
// re-digested, so a digested history is a fixed point.
//
// Fail-open discipline (same as the rest of the pipeline): no store, a store failure, or an
// unrecognizable shape means the block is left byte-identical. Never a dropped byte without a
// stored original.

export const HISTORY_DIGEST_TRANSFORMATION = "history_digest";

const HEAD_LINES = 10;
const TAIL_LINES = 5;
const MAX_ERROR_LINES = 8;
const ERROR_LINE = /\b(error|fail(?:ed|ure)?|fatal|panic|exception|traceback)\b/i;

export interface DigestHistoryOptions {
  store: ContentStore;
  /** Payloads smaller than this many bytes are never digested. */
  minBytes: number;
  /** Recorded on stored originals for retrieval authorization. */
  task_id?: string;
}

export interface DigestHistoryResult {
  messages: unknown[];
  changed: boolean;
  retrieval_ids: string[];
  /** Real byte delta across all digested payloads (original minus digest), never estimated. */
  saved_bytes: number;
  warnings: string[];
}

/** Deterministic digest of one payload: head lines, error lines, tail lines, and the marker. */
export function digestText(text: string, retrievalId: string): string {
  const lines = text.split("\n");
  const head = lines.slice(0, HEAD_LINES);
  const tail = lines.length > HEAD_LINES + TAIL_LINES ? lines.slice(-TAIL_LINES) : [];
  const middle = lines.slice(HEAD_LINES, lines.length - (tail.length || 0));
  const errorLines: string[] = [];
  for (const line of middle) {
    if (errorLines.length >= MAX_ERROR_LINES) break;
    if (ERROR_LINE.test(line)) errorLines.push(line);
  }
  const omitted = middle.length - errorLines.length;
  const parts = [
    ...head,
    ...(errorLines.length ? ["… error lines from the omitted region:", ...errorLines] : []),
    `… [kage-history] ${omitted} of ${lines.length} lines (${Buffer.byteLength(text, "utf8")} bytes) archived; exact original: ${retrievalId}`,
    ...tail,
  ];
  return parts.join("\n");
}

// The digest's own structural line. Idempotence keys on THIS exact shape — not on any occurrence of
// the retrieval prefix, because a legitimate payload can mention "kage-content:" (this very
// repository's diffs and sources do) and must still be digestible.
const DIGEST_LINE = /^… \[kage-history\] \d+ of \d+ lines \(\d+ bytes\) archived; exact original: kage-content:[0-9a-f]{64}$/m;

/** True when this text IS one of our digests — never digest a digest. */
function alreadyDigested(text: string): boolean {
  return DIGEST_LINE.test(text);
}

interface PayloadSite {
  /** The payload text to digest. */
  text: string;
  /** Write the digested text back into a COPY of the message; returns the new message. */
  replace(message: Record<string, unknown>, digested: string): Record<string, unknown>;
}

// A tool payload site inside one message: an Anthropic `tool_result` block (string or all-text-block
// content) or an OpenAI `role:"tool"` string message. Anything else is not a history payload.
function payloadSites(message: Record<string, unknown>): Array<{ site: PayloadSite; blockIndex: number | null }> {
  const sites: Array<{ site: PayloadSite; blockIndex: number | null }> = [];

  // OpenAI: {role:"tool", content: "<string>"}.
  if (message.role === "tool" && typeof message.content === "string") {
    sites.push({
      blockIndex: null,
      site: {
        text: message.content,
        replace: (m, digested) => ({ ...m, content: digested }),
      },
    });
    return sites;
  }

  // Anthropic: {role:"user", content: [{type:"tool_result", content: string | text-blocks}]}.
  const content = message.content;
  if (!Array.isArray(content)) return sites;
  content.forEach((block, index) => {
    if (!isRecord(block) || block.type !== "tool_result") return;
    const inner = block.content;
    if (typeof inner === "string") {
      sites.push({
        blockIndex: index,
        site: {
          text: inner,
          replace: (m, digested) => {
            const blocks = [...(m.content as unknown[])];
            blocks[index] = { ...(blocks[index] as Record<string, unknown>), content: digested };
            return { ...m, content: blocks };
          },
        },
      });
      return;
    }
    if (Array.isArray(inner)) {
      const texts = inner
        .filter((b): b is { type: string; text: string } => isRecord(b) && b.type === "text" && typeof b.text === "string")
        .map((b) => b.text);
      if (texts.length && texts.length === inner.length) {
        sites.push({
          blockIndex: index,
          site: {
            text: texts.join("\n"),
            replace: (m, digested) => {
              const blocks = [...(m.content as unknown[])];
              blocks[index] = {
                ...(blocks[index] as Record<string, unknown>),
                content: [{ type: "text", text: digested }],
              };
              return { ...m, content: blocks };
            },
          },
        });
      }
    }
  });
  return sites;
}

/**
 * Digest every eligible tool payload in `messages[0 .. mutableStart)`. Pure over its inputs: the
 * input array and its messages are never mutated; a fresh array is returned. Anything at or after
 * `mutableStart` is untouched by construction.
 */
export async function digestHistoryMessages(
  messages: unknown[],
  mutableStart: number,
  options: DigestHistoryOptions,
): Promise<DigestHistoryResult> {
  const out = [...messages];
  const retrieval_ids: string[] = [];
  const warnings: string[] = [];
  let saved = 0;
  let changed = false;

  const end = Math.min(mutableStart, out.length);
  for (let i = 0; i < end; i += 1) {
    const message = out[i];
    if (!isRecord(message)) continue;
    let current = message;
    for (const { site } of payloadSites(current)) {
      const bytes = Buffer.byteLength(site.text, "utf8");
      if (bytes < options.minBytes) continue;
      if (alreadyDigested(site.text)) continue;
      let retrievalId: string;
      try {
        // Store the EXACT original first — content-addressed, so identical payloads across turns
        // dedup to one object and yield the same marker (determinism across the session).
        const metadata = options.store.put(Buffer.from(site.text, "utf8"), {
          media_type: "text/plain",
          task_id: options.task_id ?? "history",
        });
        retrievalId = metadata.retrieval_id;
      } catch (error) {
        warnings.push(`history digest skipped a payload (store failed): ${error instanceof Error ? error.message : String(error)}`);
        continue; // fail-open: leave this payload byte-identical
      }
      const digested = digestText(site.text, retrievalId);
      const digestedBytes = Buffer.byteLength(digested, "utf8");
      if (digestedBytes >= bytes) continue; // never claim a saving that is not real
      // Re-resolve the site against the CURRENT copy of the message (an earlier site in the same
      // message may already have replaced it).
      current = site.replace(current, digested);
      retrieval_ids.push(retrievalId);
      saved += bytes - digestedBytes;
      changed = true;
    }
    if (current !== message) out[i] = current;
  }

  return { messages: out, changed, retrieval_ids, saved_bytes: saved, warnings };
}
