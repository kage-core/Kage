import {
  byteLength,
  guardCompression,
  passthroughResult,
  type CompressionInput,
  type CompressionResult,
  type Compressor,
} from "./types.js";

// Conservative unified-diff context trimming.
//
// Preservation rules (Task 2 step 4):
//   - Filenames, mode/index/rename headers, and EVERY hunk header (@@ ... @@) are kept verbatim.
//   - Every added (+) and removed (-) line is kept verbatim.
//   - Unchanged context lines (leading space) are trimmed: a run longer than 2*CONTEXT keeps the first
//     CONTEXT and last CONTEXT lines and replaces the middle with a "... N unchanged lines ..." marker.
//   - Binary diffs are NOT transformed (returns `none`).

const CONTEXT = 3;

function isBinaryDiff(body: string): boolean {
  return /^Binary files .* differ$/m.test(body) || /^GIT binary patch$/m.test(body);
}

// A context line is a leading-space line that is NOT a hunk header and NOT a +/- change line.
function isContextLine(line: string): boolean {
  return line.startsWith(" ");
}

function flushContext(buffer: string[], out: string[]): boolean {
  if (buffer.length <= CONTEXT * 2) {
    out.push(...buffer);
    return false;
  }
  const omitted = buffer.length - CONTEXT * 2;
  out.push(...buffer.slice(0, CONTEXT));
  out.push(`... ${omitted} unchanged lines ...`);
  out.push(...buffer.slice(buffer.length - CONTEXT));
  return true;
}

function runFn(body: string): CompressionResult {
  if (isBinaryDiff(body)) return passthroughResult(body, ["binary diff; not transformed"]);
  const lines = body.split("\n");
  const out: string[] = [];
  let buffer: string[] = [];
  let trimmed = false;
  for (const line of lines) {
    if (isContextLine(line)) {
      buffer.push(line);
      continue;
    }
    if (buffer.length > 0) {
      if (flushContext(buffer, out)) trimmed = true;
      buffer = [];
    }
    out.push(line);
  }
  if (buffer.length > 0 && flushContext(buffer, out)) trimmed = true;
  if (!trimmed) return passthroughResult(body);
  const output = out.join("\n");
  return {
    compressor: "diff",
    output,
    lossy: true,
    original_bytes: byteLength(body),
    output_bytes: byteLength(output),
    warnings: [],
  };
}

export function compressDiff(body: string): CompressionResult {
  return guardCompression(body, () => runFn(body));
}

export const diffCompressor: Compressor = {
  id: "diff",
  supports(input: CompressionInput): boolean {
    const media = input.media_type.toLowerCase();
    if (media.includes("diff") || media.includes("patch")) return true;
    return /^diff --git /m.test(input.body) || /^@@ /m.test(input.body);
  },
  compress(input: CompressionInput): CompressionResult {
    return compressDiff(input.body);
  },
};
