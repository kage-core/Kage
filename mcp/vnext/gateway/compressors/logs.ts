import {
  byteLength,
  guardCompression,
  passthroughResult,
  type CompressionInput,
  type CompressionResult,
  type Compressor,
} from "./types.js";

// Conservative log folding.
//
// Preservation rules (Task 2 step 4):
//   - Every error/fatal/panic/exception line is kept verbatim, never folded.
//   - Runs of identical consecutive non-error lines longer than the threshold are folded to one copy
//     plus a "... repeated N times" marker (N = full run length, so a 98-line run reports 98).
//   - First and last lines survive because a folded run still emits one copy of its line.
//   - Unique lines are always kept.

const ERROR_LINE = /\b(error|fatal|panic|exception|traceback|segfault)\b/i;
const FOLD_THRESHOLD = 3;

export function isErrorLine(line: string): boolean {
  return ERROR_LINE.test(line);
}

function runFn(body: string): CompressionResult {
  const lines = body.split("\n");
  const out: string[] = [];
  let folded = false;
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    // Count the maximal run of this exact line.
    let runEnd = index + 1;
    while (runEnd < lines.length && lines[runEnd] === line) runEnd += 1;
    const runLength = runEnd - index;
    if (runLength >= FOLD_THRESHOLD && !isErrorLine(line)) {
      out.push(line);
      out.push(`... repeated ${runLength} times`);
      folded = true;
    } else {
      for (let i = 0; i < runLength; i += 1) out.push(line);
    }
    index = runEnd;
  }
  if (!folded) return passthroughResult(body);
  const output = out.join("\n");
  return {
    compressor: "logs",
    output,
    lossy: true,
    original_bytes: byteLength(body),
    output_bytes: byteLength(output),
    warnings: [],
  };
}

export function compressLogs(body: string): CompressionResult {
  return guardCompression(body, () => runFn(body));
}

export const logCompressor: Compressor = {
  id: "logs",
  supports(input: CompressionInput): boolean {
    const media = input.media_type.toLowerCase();
    if (media.includes("log")) return true;
    if (media === "text/plain") return true;
    return false;
  },
  compress(input: CompressionInput): CompressionResult {
    return compressLogs(input.body);
  },
};
