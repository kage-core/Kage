import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { workerData } from "node:worker_threads";
import {
  buildStructuralFileForWorker,
  type StructuralIndexManifest,
  type StructuralWorkerResultFile,
} from "./kernel.js";

interface StructuralWorkerData {
  projectDir: string;
  files: string[];
  knownFiles: string[];
  prior: StructuralIndexManifest;
  outputPath: string;
  shared: SharedArrayBuffer;
}

function writeResult(path: string, result: StructuralWorkerResultFile): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(result, null, 2)}\n`, "utf8");
}

function notifyDone(shared: SharedArrayBuffer): void {
  const done = new Int32Array(shared);
  Atomics.add(done, 0, 1);
  Atomics.notify(done, 0);
}

const data = workerData as StructuralWorkerData;

try {
  const results = data.files.map((file) => buildStructuralFileForWorker(data.projectDir, file, data.knownFiles, data.prior));
  writeResult(data.outputPath, { ok: true, results });
} catch (error) {
  writeResult(data.outputPath, {
    ok: false,
    results: [],
    error: error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error),
  });
} finally {
  notifyDone(data.shared);
}
