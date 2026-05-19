#!/usr/bin/env node

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const kernel = await import(pathToFileURL(join(root, "mcp/dist/kernel.js")).href);
const args = parseArgs(process.argv.slice(2));

const report = kernel.benchmarkCodingMemoryQuality({
  topK: Number(args["top-k"] ?? 10),
  packetsPerTopic: Number(args["packets-per-topic"] ?? 5),
  distractorsPerTopic: Number(args["distractors-per-topic"] ?? 7),
  keep: Boolean(args.keep),
});

if (args.out) writeFileSync(String(args.out), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary, null, 2));

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) result[key] = true;
    else {
      result[key] = next;
      index += 1;
    }
  }
  return result;
}
