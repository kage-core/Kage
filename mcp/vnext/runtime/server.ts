import { createHash, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo, Socket } from "node:net";
import { TextDecoder } from "node:util";
import { buildContextCapsule } from "../context/capsule-builder.js";
import { validateContextRequest, type ContextSource } from "../context/source.js";
import { WorkerContextSource } from "../context/worker-source.js";
import { validateEvidenceEvent, validateHandshake } from "../protocol/index.js";
import { openVnextDatabase, type LocalDatabase } from "../storage/database.js";
import { EventStore } from "../storage/event-store.js";
import { migrateLocalDatabase } from "../storage/migrations.js";
import { ReceiptStore } from "../storage/receipt-store.js";
import { acquireRuntimeLock, releaseRuntimeLock, type RuntimeLockLease } from "./lock.js";
import { assertRuntimeDirectoryLease, ensureRuntimeDirectory, resolveRuntimePaths } from "./paths.js";
import {
  removeRuntimeStatus,
  writeRuntimeStatus,
  type RuntimeStatusLease,
  type VnextRuntimeStatus,
} from "./status.js";
import { ensureRuntimeToken } from "./token.js";

const HOST = "127.0.0.1" as const;
const DEFAULT_PORT = 3112;
const MAX_JSON_BYTES = 2 * 1024 * 1024;
const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });

type RouteKind = "health" | "status" | "handshakes" | "events" | "context" | "receipts";

interface MatchedRoute {
  kind: RouteKind;
  method: "GET" | "POST";
  taskId?: string;
}

class RequestFailure extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code);
  }
}

export interface LocalRuntimeOptions {
  projectDir: string;
  port?: number;
  mode?: "audit" | "assist";
  contextSource?: ContextSource | null;
}

export interface LocalRuntimeHandle {
  url: string;
  token: string;
  status: VnextRuntimeStatus;
  address: AddressInfo;
  database: LocalDatabase;
  eventStore: EventStore;
  store: EventStore;
  receiptStore: ReceiptStore;
  // The source the runtime actually resolved. Exposed so a test can assert the shipped default
  // is off-thread: without it, reverting the default to an on-request-thread source is a silent
  // one-line regression that every other test still passes.
  contextSource: ContextSource | null;
  close(): Promise<void>;
}

function json(res: ServerResponse, status: number, value: unknown): void {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(body);
}

function error(res: ServerResponse, status: number, code: string): void {
  json(res, status, { ok: false, error: code });
}

function isJsonContentType(req: IncomingMessage): boolean {
  const value = req.headers["content-type"];
  if (typeof value !== "string") return false;
  return value.split(";", 1)[0].trim().toLowerCase() === "application/json";
}

function declaredLength(req: IncomingMessage): number | undefined {
  const value = req.headers["content-length"];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !/^\d+$/.test(value)) throw new RequestFailure(400, "invalid_json");
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new RequestFailure(413, "payload_too_large");
  return parsed;
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  if (!isJsonContentType(req)) throw new RequestFailure(415, "unsupported_media_type");
  const length = declaredLength(req);
  if (length !== undefined && length > MAX_JSON_BYTES) {
    req.resume();
    throw new RequestFailure(413, "payload_too_large");
  }

  const chunks = await new Promise<Buffer[]>((resolve, reject) => {
    const values: Buffer[] = [];
    let bytes = 0;
    let settled = false;
    const cleanup = () => {
      req.off("data", onData);
      req.off("end", onEnd);
      req.off("aborted", onAborted);
      req.off("error", onError);
    };
    const finishReject = (failure: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      req.on("error", () => {});
      req.resume();
      reject(failure);
    };
    const onData = (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += buffer.length;
      if (bytes > MAX_JSON_BYTES) {
        finishReject(new RequestFailure(413, "payload_too_large"));
        return;
      }
      values.push(buffer);
    };
    const onEnd = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(values);
    };
    const onAborted = () => finishReject(new RequestFailure(400, "invalid_json"));
    const onError = () => finishReject(new RequestFailure(400, "invalid_json"));
    req.on("data", onData);
    req.once("end", onEnd);
    req.once("aborted", onAborted);
    req.once("error", onError);
  });

  try {
    return JSON.parse(UTF8_DECODER.decode(Buffer.concat(chunks))) as unknown;
  } catch {
    throw new RequestFailure(400, "invalid_json");
  }
}

function isAuthorized(req: IncomingMessage, token: string): boolean {
  const authorization = req.headers.authorization;
  if (typeof authorization !== "string") return false;
  const expected = createHash("sha256").update(`Bearer ${token}`).digest();
  const actual = createHash("sha256").update(authorization).digest();
  return timingSafeEqual(expected, actual);
}

function receiptRoute(pathname: string): MatchedRoute | undefined {
  const match = /^\/v2\/tasks\/([^/]+)\/receipts$/.exec(pathname);
  if (!match) return undefined;
  try {
    const taskId = decodeURIComponent(match[1]);
    if (!taskId || taskId.includes("/")) return undefined;
    return { kind: "receipts", method: "GET", taskId };
  } catch {
    return undefined;
  }
}

function matchRoute(pathname: string): MatchedRoute | undefined {
  if (pathname === "/v2/health") return { kind: "health", method: "GET" };
  if (pathname === "/v2/status") return { kind: "status", method: "GET" };
  if (pathname === "/v2/handshakes") return { kind: "handshakes", method: "POST" };
  if (pathname === "/v2/events") return { kind: "events", method: "POST" };
  if (pathname === "/v2/context") return { kind: "context", method: "POST" };
  return receiptRoute(pathname);
}

interface PersistedTaskIdentity {
  session_id: string;
  repository_id: string;
  agent_surface: string;
  user_id: string | null;
}

function persistHandshake(
  db: LocalDatabase,
  value: ReturnType<typeof validateHandshake> & { ok: true },
): "accepted" | "conflict" {
  const handshake = value.value;
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = db.prepare(`
      INSERT INTO tasks (task_id, session_id, repository_id, agent_surface, user_id, started_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(task_id) DO NOTHING
    `).run(
      handshake.task.task_id,
      handshake.task.session_id,
      handshake.repository.repo_id,
      handshake.task.agent_surface,
      handshake.task.user_id,
      new Date().toISOString(),
    );
    let status: "accepted" | "conflict" = "accepted";
    if (result.changes === 0) {
      const persisted = db.prepare(`
        SELECT session_id, repository_id, agent_surface, user_id
        FROM tasks
        WHERE task_id = ?
      `).get(handshake.task.task_id) as PersistedTaskIdentity | undefined;
      if (!persisted) throw new Error("Persisted Kage vNext task disappeared during handshake comparison.");
      if (
        persisted.session_id !== handshake.task.session_id
        || persisted.repository_id !== handshake.repository.repo_id
        || persisted.agent_surface !== handshake.task.agent_surface
        || persisted.user_id !== handshake.task.user_id
      ) status = "conflict";
    }
    db.exec("COMMIT");
    return status;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function createRequestHandler(
  token: string,
  getStatus: () => VnextRuntimeStatus | undefined,
  db: LocalDatabase,
  eventStore: EventStore,
  receiptStore: ReceiptStore,
  contextSource: ContextSource | null,
): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  return async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", `http://${HOST}`);
      const route = matchRoute(url.pathname);
      if (!route) {
        error(res, 404, "not_found");
        return;
      }
      if (req.method !== route.method) {
        error(res, 405, "method_not_allowed");
        return;
      }
      if (route.kind === "health") {
        json(res, 200, { ok: true, protocol_version: 1 });
        return;
      }
      if (!isAuthorized(req, token)) {
        error(res, 401, "unauthorized");
        return;
      }

      if (route.kind === "status") {
        const status = getStatus();
        if (!status) {
          error(res, 503, "runtime_starting");
          return;
        }
        json(res, 200, status);
        return;
      }
      if (route.kind === "receipts") {
        json(res, 200, { receipts: receiptStore.forTask(route.taskId!) });
        return;
      }

      const body = await readJson(req);
      if (route.kind === "handshakes") {
        const handshake = validateHandshake(body);
        if (!handshake.ok) {
          error(res, 400, "invalid_protocol");
          return;
        }
        if (persistHandshake(db, handshake) === "conflict") {
          error(res, 409, "task_identity_conflict");
          return;
        }
        json(res, 202, { status: "accepted" });
        return;
      }
      if (route.kind === "events") {
        const event = validateEvidenceEvent(body);
        if (!event.ok) {
          error(res, 400, "invalid_protocol");
          return;
        }
        const result = eventStore.append(event.value);
        json(res, 202, { status: result.inserted ? "inserted" : "deduplicated" });
        return;
      }
      const contextRequest = validateContextRequest(body);
      if (!contextRequest.ok) {
        error(res, 400, "invalid_protocol");
        return;
      }
      if (!contextSource) {
        error(res, 503, "context_source_unavailable");
        return;
      }
      try {
        const capsule = await buildContextCapsule(contextSource, contextRequest.value);
        json(res, 200, capsule);
      } catch (failure) {
        // The client never learns why (no internal paths or messages over the wire), but a
        // code bug in the source must not vanish: it is a bug, not an availability event.
        console.error("[kage-vnext] context source failed:", failure);
        error(res, 503, "context_source_unavailable");
      }
    } catch (caught) {
      if (caught instanceof RequestFailure) {
        error(res, caught.status, caught.code);
        return;
      }
      error(res, 500, "internal_error");
    }
  };
}

function closeServer(server: Server, sockets: ReadonlySet<Socket>): Promise<void> {
  if (!server.listening) {
    for (const socket of sockets) socket.destroy();
    return Promise.resolve();
  }
  const closed = new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  for (const socket of sockets) socket.destroy();
  return closed;
}

async function runCleanupSteps(
  steps: readonly (() => void | Promise<void>)[],
): Promise<unknown | undefined> {
  let firstFailure: unknown;
  for (const step of steps) {
    try {
      await step();
    } catch (error) {
      firstFailure ??= error;
    }
  }
  return firstFailure;
}

export async function startLocalRuntime(options: LocalRuntimeOptions): Promise<LocalRuntimeHandle> {
  const mode = options.mode ?? "audit";
  const requestedPort = options.port ?? DEFAULT_PORT;
  if ((mode !== "audit" && mode !== "assist") || !Number.isInteger(requestedPort) || requestedPort < 0 || requestedPort > 65_535) {
    throw new Error("Invalid Kage vNext local runtime options.");
  }

  const paths = resolveRuntimePaths(options.projectDir);
  const directoryLease = ensureRuntimeDirectory(paths.runtimeDirectory);
  assertRuntimeDirectoryLease(directoryLease);
  const token = ensureRuntimeToken(paths.tokenPath);
  // The default source runs the legacy kernel on a worker thread. It must never run on this
  // thread: its work is synchronous, so it would hold the runtime's single event loop for the
  // whole analysis and /v2/health, /v2/events and /v2/receipts would go unanswered.
  const contextSource = options.contextSource === undefined
    ? new WorkerContextSource({ projectDir: options.projectDir })
    : options.contextSource;
  let server: Server | undefined;
  let database: LocalDatabase | undefined;
  let lockLease: RuntimeLockLease | undefined;
  let statusLease: RuntimeStatusLease | undefined;
  const sockets = new Set<Socket>();

  try {
    assertRuntimeDirectoryLease(directoryLease);
    lockLease = acquireRuntimeLock(paths.lockPath);
    assertRuntimeDirectoryLease(directoryLease);
    const openedDatabase = openVnextDatabase(paths.databasePath);
    database = openedDatabase;
    assertRuntimeDirectoryLease(directoryLease);
    migrateLocalDatabase(openedDatabase);
    assertRuntimeDirectoryLease(directoryLease);
    const eventStore = new EventStore(openedDatabase);
    const receiptStore = new ReceiptStore(openedDatabase);
    let status: VnextRuntimeStatus | undefined;
    server = createServer(createRequestHandler(
      token,
      () => status,
      openedDatabase,
      eventStore,
      receiptStore,
      contextSource,
    ));
    server.on("connection", (socket) => {
      sockets.add(socket);
      socket.once("close", () => sockets.delete(socket));
    });
    assertRuntimeDirectoryLease(directoryLease);
    await new Promise<void>((resolve, reject) => {
      server!.once("error", reject);
      server!.listen(requestedPort, HOST, () => {
        server!.off("error", reject);
        resolve();
      });
    });
    assertRuntimeDirectoryLease(directoryLease);

    const address = server.address();
    if (!address || typeof address === "string" || address.address !== HOST || address.family !== "IPv4") {
      throw new Error("Kage vNext local runtime did not bind to IPv4 loopback.");
    }
    status = {
      protocol_version: 1,
      pid: process.pid,
      host: HOST,
      port: address.port,
      mode,
      started_at: new Date().toISOString(),
      database_path: paths.databasePath,
      token_path: paths.tokenPath,
    };
    assertRuntimeDirectoryLease(directoryLease);
    statusLease = writeRuntimeStatus(paths.statusPath, status);
    assertRuntimeDirectoryLease(directoryLease);

    let closePromise: Promise<void> | undefined;
    const close = (): Promise<void> => {
      closePromise ??= (async () => {
        const cleanupFailure = await runCleanupSteps([
          () => closeServer(server!, sockets),
          // The runtime owns the source's lifetime: the context worker thread would otherwise
          // keep the process alive after close().
          () => contextSource?.close?.(),
          () => openedDatabase.close(),
          () => {
            if (!statusLease) return;
            assertRuntimeDirectoryLease(directoryLease);
            removeRuntimeStatus(statusLease);
          },
          () => {
            if (lockLease) releaseRuntimeLock(lockLease);
          },
        ]);
        if (cleanupFailure) throw cleanupFailure;
      })();
      return closePromise;
    };

    return {
      url: `http://${HOST}:${address.port}`,
      token,
      status,
      address,
      database: openedDatabase,
      eventStore,
      store: eventStore,
      receiptStore,
      contextSource,
      close,
    };
  } catch (caught) {
    await runCleanupSteps([
      () => server ? closeServer(server, sockets) : undefined,
      () => contextSource?.close?.(),
      () => database?.close(),
      () => {
        if (!statusLease) return;
        assertRuntimeDirectoryLease(directoryLease);
        removeRuntimeStatus(statusLease);
      },
      () => {
        if (lockLease) releaseRuntimeLock(lockLease);
      },
    ]);
    throw caught;
  }
}
