import {
  byteLength,
  guardCompression,
  passthroughResult,
  type CompressionInput,
  type CompressionResult,
  type Compressor,
} from "./types.js";

// Conservative JSON truncation.
//
// Preservation rules (Task 2 step 4):
//   - Object shape and ALL keys are preserved (ids, statuses, errors, counts survive because keys are
//     never dropped).
//   - Long arrays keep the first HEAD and last TAIL items and replace the omitted middle with a single
//     string marker recording how many items were dropped.
//   - Invalid JSON returns `none` (untransformed) — we never emit malformed JSON.
//
// Determinism: JSON.parse + a fixed structural walk + JSON.stringify with a stable 2-space indent. No
// key reordering beyond what the input object already implies (insertion order is preserved by V8).

const ARRAY_MAX = 20;
const ARRAY_HEAD = 5;
const ARRAY_TAIL = 5;

function omittedMarker(count: number): string {
  return `[kage:omitted ${count} array items]`;
}

interface Walk {
  value: unknown;
  changed: boolean;
}

function walk(node: unknown): Walk {
  if (Array.isArray(node)) {
    let changed = false;
    if (node.length > ARRAY_MAX) {
      const head = node.slice(0, ARRAY_HEAD).map((item) => {
        const w = walk(item);
        if (w.changed) changed = true;
        return w.value;
      });
      const tail = node.slice(node.length - ARRAY_TAIL).map((item) => {
        const w = walk(item);
        if (w.changed) changed = true;
        return w.value;
      });
      const omitted = node.length - ARRAY_HEAD - ARRAY_TAIL;
      return { value: [...head, omittedMarker(omitted), ...tail], changed: true };
    }
    const value = node.map((item) => {
      const w = walk(item);
      if (w.changed) changed = true;
      return w.value;
    });
    return { value, changed };
  }
  if (node !== null && typeof node === "object") {
    let changed = false;
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(node as Record<string, unknown>)) {
      const w = walk(val);
      if (w.changed) changed = true;
      out[key] = w.value;
    }
    return { value: out, changed };
  }
  return { value: node, changed: false };
}

function runFn(body: string): CompressionResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return passthroughResult(body, ["invalid json; not transformed"]);
  }
  const walked = walk(parsed);
  if (!walked.changed) return passthroughResult(body);
  const output = JSON.stringify(walked.value, null, 2);
  const original = byteLength(body);
  const outBytes = byteLength(output);
  if (outBytes >= original) {
    // Re-serialization (pretty printing) can inflate small payloads; do not claim savings.
    return passthroughResult(body, ["json compression did not reduce bytes"]);
  }
  return {
    compressor: "json",
    output,
    lossy: true,
    original_bytes: original,
    output_bytes: outBytes,
    warnings: [],
  };
}

export function compressJson(body: string): CompressionResult {
  return guardCompression(body, () => runFn(body));
}

export const jsonCompressor: Compressor = {
  id: "json",
  supports(input: CompressionInput): boolean {
    const media = input.media_type.toLowerCase();
    if (media.includes("json")) return true;
    const trimmed = input.body.trimStart();
    return trimmed.startsWith("{") || trimmed.startsWith("[");
  },
  compress(input: CompressionInput): CompressionResult {
    return compressJson(input.body);
  },
};
