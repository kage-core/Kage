import type { EventStore } from "../storage/event-store.js";
import { Repository } from "../repo-model/repository.js";
import { Pipeline } from "../compiler/pipeline.js";

/**
 * Off-request-path compilation scheduler.
 *
 * The daemon schedules compilation AFTER event batches; context and event requests never wait for it.
 * When an event is appended, the runtime calls `notify(repositoryId)`; the scheduler debounces dirty
 * repositories and drains them on a later `setImmediate` tick, so the HTTP handler returns without
 * ever running the compiler inline.
 *
 * Lifecycle-safe: a pending drain is cancellable, and `stop()` prevents any further database access.
 * The runtime awaits `stop()` before it closes the database, so a compile can never touch a closed
 * handle. Each drain is a synchronous `Pipeline.run` with no snapshot source, so it completes fully
 * within one tick and never interleaves a half-written transaction with a request handler.
 *
 * Fail-open: a compile that throws is logged and dropped; it never crashes the runtime and never
 * blocks the next batch. Idempotency lives in the pipeline, so a dropped-then-retried batch is safe.
 */
export class CompilerScheduler {
  private readonly pipeline: Pipeline;
  private readonly dirty = new Set<string>();
  private scheduled: NodeJS.Immediate | undefined;
  private draining: Promise<void> | undefined;
  private stopped = false;

  constructor(model: Repository, events: EventStore) {
    this.pipeline = new Pipeline({ model, events });
  }

  /** Mark a repository as having new events to compile. Cheap and non-blocking. */
  notify(repositoryId: string): void {
    if (this.stopped) return;
    this.dirty.add(repositoryId);
    if (this.scheduled === undefined) {
      this.scheduled = setImmediate(() => {
        this.scheduled = undefined;
        this.draining = this.drain();
      });
    }
  }

  private async drain(): Promise<void> {
    // Snapshot and clear the dirty set: any repo notified after this point re-schedules a fresh drain.
    const pending = [...this.dirty];
    this.dirty.clear();
    for (const repositoryId of pending) {
      if (this.stopped) return;
      try {
        await this.pipeline.run(repositoryId);
      } catch (error) {
        // Best-effort: a compile failure is logged, never fatal. The next batch retries idempotently.
        console.error("[kage-vnext] repository compilation failed:", error);
      }
    }
  }

  /**
   * Stop scheduling and wait for any in-flight drain to finish. After this resolves, the scheduler
   * makes no further database calls, so the runtime may safely close the database.
   */
  async stop(): Promise<void> {
    this.stopped = true;
    if (this.scheduled !== undefined) {
      clearImmediate(this.scheduled);
      this.scheduled = undefined;
    }
    await this.draining;
  }
}
