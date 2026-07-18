import {
  byteLength,
  guardCompression,
  passthroughResult,
  type CompressionInput,
  type CompressionResult,
  type Compressor,
} from "./types.js";

// Conservative test-output folding.
//
// Preservation rules (Task 2 step 4):
//   - Test runners repeat the SAME multi-line failure block many times (parametrized/retried cases).
//     Identical failure blocks are grouped: the first occurrence is kept verbatim and annotated with a
//     "... this failure repeated N times" marker; later identical blocks are dropped.
//   - Failing test names, locations, and assertion messages are inside the kept block, so they survive.
//   - Summary/count blocks are unique and always kept.
//
// A "block" is a run of non-blank lines delimited by blank lines. Grouping is by exact block text, so
// the transform is deterministic and order-preserving (first appearance wins).

const SUMMARY = /\b\d+\s+(passing|failing|pending|passed|failed|skipped|tests?)\b/i;
const FAIL_MARKER = /\b(fail|failed|failing|not ok|assertion|error|expected)\b/i;

function splitBlocks(body: string): string[] {
  const lines = body.split("\n");
  const blocks: string[] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (line.trim() === "") {
      if (current.length > 0) {
        blocks.push(current.join("\n"));
        current = [];
      }
      continue;
    }
    current.push(line);
  }
  if (current.length > 0) blocks.push(current.join("\n"));
  return blocks;
}

function runFn(body: string): CompressionResult {
  const blocks = splitBlocks(body);
  if (blocks.length === 0) return passthroughResult(body);
  const order: { text: string; count: number }[] = [];
  const seen = new Map<string, number>();
  for (const block of blocks) {
    const existing = seen.get(block);
    if (existing !== undefined) {
      order[existing].count += 1;
    } else {
      seen.set(block, order.length);
      order.push({ text: block, count: 1 });
    }
  }
  let lossy = false;
  const rendered = order.map((entry) => {
    if (entry.count > 1) {
      lossy = true;
      return `${entry.text}\n... this failure repeated ${entry.count} times`;
    }
    return entry.text;
  });
  if (!lossy) return passthroughResult(body);
  const output = rendered.join("\n\n");
  return {
    compressor: "test_output",
    output,
    lossy: true,
    original_bytes: byteLength(body),
    output_bytes: byteLength(output),
    warnings: [],
  };
}

export function compressTestOutput(body: string): CompressionResult {
  return guardCompression(body, () => runFn(body));
}

export const testOutputCompressor: Compressor = {
  id: "test_output",
  supports(input: CompressionInput): boolean {
    const media = input.media_type.toLowerCase();
    if (media.includes("test")) return true;
    return SUMMARY.test(input.body) && FAIL_MARKER.test(input.body);
  },
  compress(input: CompressionInput): CompressionResult {
    return compressTestOutput(input.body);
  },
};
