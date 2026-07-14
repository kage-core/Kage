import { parentPort, workerData } from "node:worker_threads";
import { LegacyContextSource } from "./legacy-source.js";
import type { ContextRequest } from "./source.js";

// The worker entry for WorkerContextSource. Importing legacy-source.js here is deliberate: it
// pulls the ~22k-line kernel into THIS thread, not the runtime's. LegacyContextSource is
// unchanged and still the only vNext module that touches the kernel -- the change is where it
// is loaded and executed.
//
// Everything below runs on a thread the parent can terminate(), which is the whole point: the
// kernel's recall/kageRisk/kageTeammateBrief are synchronous, so a runaway analysis can only
// be stopped by killing the thread that is running it.

interface ContextWorkerJob {
  job_id: number;
  request: ContextRequest;
}

const port = parentPort;
if (!port) throw new Error("Kage vNext context worker must run as a worker thread.");

const { projectDir } = workerData as { projectDir: string };
const source = new LegacyContextSource(projectDir);

port.on("message", (message: ContextWorkerJob) => {
  void (async () => {
    try {
      const candidates = await source.find(message.request);
      port.postMessage({ job_id: message.job_id, ok: true, candidates });
    } catch (failure) {
      // Only the message crosses the thread boundary: an Error is not usefully structured-
      // cloned, and the parent turns this into the runtime's non-leaking 503 anyway.
      port.postMessage({
        job_id: message.job_id,
        ok: false,
        error: failure instanceof Error ? failure.message : String(failure),
      });
    }
  })();
});
