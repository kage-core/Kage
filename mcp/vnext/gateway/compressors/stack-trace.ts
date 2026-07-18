import {
  byteLength,
  guardCompression,
  passthroughResult,
  type CompressionInput,
  type CompressionResult,
  type Compressor,
} from "./types.js";

// Conservative stack-trace frame collapsing.
//
// Preservation rules (Task 2 step 4):
//   - The root message line and every non-frame line (including "Caused by:" chain roots) are kept
//     verbatim, so the error type and each caused-by boundary survive.
//   - Runs of frame lines longer than HEAD+TAIL keep the first HEAD (nearest to the message, i.e. the
//     application frames) and the last TAIL (the boundary/bootstrap frames), replacing the middle with
//     a "... N frames omitted ..." marker.
//   - Short traces are left untouched.

const FRAME = /^\s+(at\s|File\s|#\d+\s)/;
const HEAD = 5;
const TAIL = 3;

function isFrame(line: string): boolean {
  return FRAME.test(line);
}

function flushFrames(buffer: string[], out: string[]): boolean {
  if (buffer.length <= HEAD + TAIL) {
    out.push(...buffer);
    return false;
  }
  const omitted = buffer.length - HEAD - TAIL;
  out.push(...buffer.slice(0, HEAD));
  out.push(`... ${omitted} frames omitted ...`);
  out.push(...buffer.slice(buffer.length - TAIL));
  return true;
}

function runFn(body: string): CompressionResult {
  const lines = body.split("\n");
  const out: string[] = [];
  let buffer: string[] = [];
  let collapsed = false;
  for (const line of lines) {
    if (isFrame(line)) {
      buffer.push(line);
      continue;
    }
    if (buffer.length > 0) {
      if (flushFrames(buffer, out)) collapsed = true;
      buffer = [];
    }
    out.push(line);
  }
  if (buffer.length > 0 && flushFrames(buffer, out)) collapsed = true;
  if (!collapsed) return passthroughResult(body);
  const output = out.join("\n");
  return {
    compressor: "stack_trace",
    output,
    lossy: true,
    original_bytes: byteLength(body),
    output_bytes: byteLength(output),
    warnings: [],
  };
}

export function compressStackTrace(body: string): CompressionResult {
  return guardCompression(body, () => runFn(body));
}

export const stackTraceCompressor: Compressor = {
  id: "stack_trace",
  supports(input: CompressionInput): boolean {
    const media = input.media_type.toLowerCase();
    if (media.includes("stack")) return true;
    return /\n\s+at\s/.test(input.body) || /\bTraceback \(most recent call last\)/.test(input.body);
  },
  compress(input: CompressionInput): CompressionResult {
    return compressStackTrace(input.body);
  },
};
