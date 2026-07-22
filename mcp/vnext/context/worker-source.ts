import { join } from "node:path";
import { Worker } from "node:worker_threads";
import type { ContextCandidate, ContextRequest, ContextSource } from "./source.js";

// Why a worker at all: recall, kageRisk (which falls back to a full code-graph build) and
// kageTeammateBrief are SYNCHRONOUS. Run on the runtime's thread they occupy the single event
// loop for their whole duration, so /v2/health, /v2/events and /v2/receipts cannot be answered
// and Task 5's fail-open adapters drop evidence. A timeout on that thread would be a lie: the
// timer cannot fire while the loop is blocked. On a worker thread both problems go away -- the
// loop stays free, and terminate() can preempt synchronous CPU work.

// The deadline is a runaway killer, not a latency budget. Callers (Task 5's adapters) abort at
// ~500 ms client-side and fail open; they never wait for this. A legitimate cold code-graph
// build on a real repository can take tens of seconds, and killing it would mean the graph is
// never built and every later request pays the cold cost again. 60 s is comfortably above a
// cold build and far below "wedged forever", which is the only thing this bound exists to
// catch.
export const DEFAULT_CONTEXT_WORKER_TIMEOUT_MS = 60_000;

// Jobs are serialized (one kernel analysis at a time, so the code-graph cache stays coherent
// and CPU is not oversubscribed), so a queue is unavoidable. It is bounded because an
// unbounded one is just a slower memory leak: past this depth the runtime is not going to
// catch up, and an honest refusal (503) beats a request that will be answered long after the
// caller has given up.
export const DEFAULT_CONTEXT_WORKER_QUEUE_LIMIT = 16;

// A deadline kill is not an isolated failure. buildCodeGraph writes graph.json only when it
// finishes, so a repository whose cold build exceeds the deadline never persists a graph: the
// respawned worker starts the same build from scratch, gets killed again, and /v2/context 503s
// forever while every request pins a core for the whole timeout. Callers have already given up
// (adapters abort in ~500 ms and fail open), so the work is burned for nobody.
//
// After a kill, therefore: drop the queued jobs — they would re-enter the same doomed build —
// and fail fast for a cooldown instead of re-running it per request. Recovery is real, not
// permanent lockout: the next request after the cooldown tries again, and an out-of-band
// `kage refresh` (which warms graph.json) makes that attempt succeed. Any success clears it.
export const DEFAULT_CONTEXT_WORKER_COOLDOWN_MS = 30_000;

export interface WorkerContextSourceOptions {
  projectDir: string;
  timeoutMs?: number;
  queueLimit?: number;
  cooldownMs?: number;
  now?: () => number;
  // Test seam: point the source at a script that fakes the kernel's synchronous CPU burn
  // without loading the kernel. Production leaves both unset.
  workerPath?: string;
  workerData?: Record<string, unknown>;
}

interface PendingJob {
  request: ContextRequest;
  resolve(candidates: ContextCandidate[]): void;
  reject(failure: Error): void;
}

interface InFlightJob {
  job: PendingJob;
  jobId: number;
  timer: NodeJS.Timeout;
}

interface WorkerReply {
  job_id?: unknown;
  ok?: unknown;
  candidates?: unknown;
  error?: unknown;
}

function defaultWorkerPath(): string {
  // CommonJS output: this file is dist/vnext/context/worker-source.js and the compiled worker
  // entry is its sibling. Same resolution the structural worker uses (kernel.ts).
  return join(__dirname, "context-worker.js");
}

// A persistent worker, not one per request: the kernel module load and the code-graph cache
// are both expensive, and per-request workers would pay both on every call. The cost of
// persistence is that a runaway job would poison every later request -- which is exactly why
// a terminate() is always followed by a respawn on the next job.
export class WorkerContextSource implements ContextSource {
  private readonly projectDir: string;
  private readonly timeoutMs: number;
  private readonly queueLimit: number;
  private readonly cooldownMs: number;
  private readonly now: () => number;
  private readonly workerPath: string;
  private readonly workerData: Record<string, unknown>;

  private worker: Worker | undefined;
  private inFlight: InFlightJob | undefined;
  private readonly queue: PendingJob[] = [];
  private nextJobId = 1;
  private closed = false;
  private cooldownUntil = 0;

  constructor(options: WorkerContextSourceOptions) {
    this.projectDir = options.projectDir;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_CONTEXT_WORKER_TIMEOUT_MS;
    this.queueLimit = options.queueLimit ?? DEFAULT_CONTEXT_WORKER_QUEUE_LIMIT;
    this.cooldownMs = options.cooldownMs ?? DEFAULT_CONTEXT_WORKER_COOLDOWN_MS;
    this.now = options.now ?? Date.now;
    this.workerPath = options.workerPath ?? defaultWorkerPath();
    this.workerData = options.workerData ?? {};
  }

  find(request: ContextRequest): Promise<ContextCandidate[]> {
    if (this.closed) {
      return Promise.reject(new Error("Kage vNext context worker is closed."));
    }
    if (this.now() < this.cooldownUntil) {
      return Promise.reject(new Error(
        "Kage vNext context worker is cooling down after a timeout; the last analysis exceeded its deadline.",
      ));
    }
    if (this.queue.length >= this.queueLimit) {
      return Promise.reject(new Error(
        `Kage vNext context worker is overloaded: ${this.queue.length} jobs already queued.`,
      ));
    }
    return new Promise<ContextCandidate[]>((resolve, reject) => {
      this.queue.push({ request, resolve, reject });
      this.pump();
    });
  }

  // Diagnostics, and the only honest way for a test to assert the thread is really gone.
  workerRunning(): boolean {
    return this.worker !== undefined;
  }

  async close(): Promise<void> {
    this.closed = true;
    const inFlight = this.inFlight;
    this.inFlight = undefined;
    if (inFlight) {
      clearTimeout(inFlight.timer);
      inFlight.job.reject(new Error("Kage vNext context worker is closed."));
    }
    for (const job of this.queue.splice(0)) {
      job.reject(new Error("Kage vNext context worker is closed."));
    }
    await this.discardWorker();
  }

  private pump(): void {
    if (this.closed || this.inFlight || !this.queue.length) return;
    const job = this.queue.shift()!;
    const jobId = this.nextJobId;
    this.nextJobId += 1;

    let worker: Worker;
    try {
      worker = this.ensureWorker();
    } catch (failure) {
      job.reject(failure instanceof Error ? failure : new Error(String(failure)));
      this.pump();
      return;
    }

    const timer = setTimeout(() => {
      void this.failInFlight(jobId, new Error(
        `Kage vNext context worker timed out after ${this.timeoutMs} ms.`,
      ), { timedOut: true });
    }, this.timeoutMs);
    // The deadline must not be the reason a healthy process stays alive.
    timer.unref?.();
    this.inFlight = { job, jobId, timer };
    worker.postMessage({ job_id: jobId, request: job.request });
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker(this.workerPath, {
      workerData: { ...this.workerData, projectDir: this.projectDir },
    });
    // Every handler checks identity first: a message or exit from a worker we already
    // discarded must not touch the job now running on its replacement.
    worker.on("message", (reply: WorkerReply) => {
      if (this.worker !== worker) return;
      this.settle(reply);
    });
    worker.on("error", (failure: Error) => {
      if (this.worker !== worker) return;
      void this.failInFlight(this.inFlight?.jobId, failure);
    });
    worker.on("exit", () => {
      if (this.worker !== worker) return;
      void this.failInFlight(
        this.inFlight?.jobId,
        new Error("Kage vNext context worker exited unexpectedly."),
      );
    });
    this.worker = worker;
    return worker;
  }

  private settle(reply: WorkerReply): void {
    const inFlight = this.inFlight;
    // A reply for a job we already gave up on (raced a timeout) is dropped, not misattributed.
    if (!inFlight || reply.job_id !== inFlight.jobId) return;
    clearTimeout(inFlight.timer);
    this.inFlight = undefined;
    if (reply.ok === true && Array.isArray(reply.candidates)) {
      // A completed analysis proves the worker can finish: whatever tripped the last deadline
      // is over (a graph was probably just built and persisted), so stop failing fast.
      this.cooldownUntil = 0;
      inFlight.job.resolve(reply.candidates as ContextCandidate[]);
    } else {
      inFlight.job.reject(new Error(
        typeof reply.error === "string" ? reply.error : "Kage vNext context worker returned an invalid reply.",
      ));
    }
    this.pump();
  }

  // Fail the in-flight job AND destroy the thread that was running it. Whatever went wrong --
  // deadline, uncaught throw, unexpected exit -- the worker's state is now untrustworthy or it
  // is stuck in synchronous CPU work that nothing else can interrupt. The next job gets a
  // fresh one.
  private async failInFlight(
    jobId: number | undefined,
    failure: Error,
    options: { timedOut?: boolean } = {},
  ): Promise<void> {
    const inFlight = this.inFlight;
    if (inFlight && (jobId === undefined || inFlight.jobId === jobId)) {
      clearTimeout(inFlight.timer);
      this.inFlight = undefined;
      inFlight.job.reject(failure);
    }
    if (options.timedOut) {
      // Everything queued behind a deadline kill would re-enter the same analysis that just
      // failed to finish. Refuse them now instead of burning a core per request on work whose
      // callers have already aborted.
      this.cooldownUntil = this.now() + this.cooldownMs;
      for (const job of this.queue.splice(0)) job.reject(failure);
    }
    await this.discardWorker();
    this.pump();
  }

  private async discardWorker(): Promise<void> {
    const worker = this.worker;
    if (!worker) return;
    this.worker = undefined;
    worker.removeAllListeners();
    // terminate() is the only thing that can stop a thread spinning inside synchronous kernel
    // work. It is also what makes the deadline real rather than decorative.
    try {
      await worker.terminate();
    } catch {
      // A worker that already died cannot be terminated twice; nothing left to reclaim.
    }
  }
}
