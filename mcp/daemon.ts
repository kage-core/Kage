import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, watch, writeFileSync, type FSWatcher } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import {
  benchmarkProject,
  distillSession,
  indexProject,
  kageMetrics,
  memoryInbox,
  observe,
  qualityReport,
  recall,
  type ObservationEvent,
} from "./kernel.js";

export interface DaemonStatus {
  ok: boolean;
  project_dir: string;
  pid: number;
  host: string;
  rest_port: number;
  viewer_port: number;
  started_at: string;
  status_path: string;
  index_watch: boolean;
  last_indexed_at: string;
}

export interface DaemonDoctor {
  configured: boolean;
  running: boolean;
  status?: DaemonStatus;
  endpoints: string[];
  warnings: string[];
}

export interface ViewerStatus {
  ok: boolean;
  project_dir: string;
  host: string;
  port: number;
  url: string;
}

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_REST_PORT = 3111;
const DEFAULT_VIEWER_PORT = 3113;

function daemonDir(projectDir: string): string {
  return join(projectDir, ".agent_memory", "daemon");
}

function isInside(parent: string, child: string): boolean {
  const a = resolve(parent);
  const b = resolve(child);
  return b === a || b.startsWith(`${a}/`);
}

function contentType(filePath: string): string {
  const ext = extname(filePath);
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".js") return "application/javascript; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".md") return "text/markdown; charset=utf-8";
  return "application/octet-stream";
}

function statusPath(projectDir: string): string {
  return join(daemonDir(projectDir), "status.json");
}

function json(res: ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(value, null, 2));
}

function notFound(res: ServerResponse): void {
  json(res, 404, { ok: false, error: "not_found" });
}

function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8").trim();
      if (!text) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(text) as Record<string, unknown>);
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

export function readDaemonStatus(projectDir: string): DaemonStatus | null {
  const path = statusPath(projectDir);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as DaemonStatus;
}

export function daemonDoctor(projectDir: string): DaemonDoctor {
  const status = readDaemonStatus(projectDir) ?? undefined;
  let running = false;
  if (status) {
    try {
      process.kill(status.pid, 0);
      running = true;
    } catch {
      running = false;
    }
  }
  const restPort = status?.rest_port ?? DEFAULT_REST_PORT;
  const warnings = [
    ...(running ? [] : ["Daemon is not running. Start it with `kage daemon start --project <repo>`."]),
    ...(running && status && !status.index_watch ? ["Index file watcher is not active; run `kage index --project <repo>` after source changes."] : []),
  ];
  return {
    configured: Boolean(status),
    running,
    status,
    endpoints: [
      `GET http://${DEFAULT_HOST}:${restPort}/health`,
      `POST http://${DEFAULT_HOST}:${restPort}/kage/recall`,
      `POST http://${DEFAULT_HOST}:${restPort}/kage/observe`,
      `POST http://${DEFAULT_HOST}:${restPort}/kage/distill`,
      `GET http://${DEFAULT_HOST}:${restPort}/kage/metrics`,
      `GET http://${DEFAULT_HOST}:${restPort}/kage/quality`,
      `GET http://${DEFAULT_HOST}:${restPort}/kage/inbox`,
      `GET http://${DEFAULT_HOST}:${restPort}/kage/benchmark`,
    ],
    warnings,
  };
}

export function stopDaemon(projectDir: string): { ok: boolean; message: string; status?: DaemonStatus } {
  const status = readDaemonStatus(projectDir);
  if (!status) return { ok: false, message: "No daemon status file found." };
  try {
    process.kill(status.pid, "SIGTERM");
    return { ok: true, message: `Sent SIGTERM to Kage daemon pid ${status.pid}.`, status };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error), status };
  }
}

export async function startDaemon(projectDir: string, options: { host?: string; restPort?: number; viewerPort?: number } = {}): Promise<void> {
  const host = options.host ?? DEFAULT_HOST;
  const restPort = options.restPort ?? DEFAULT_REST_PORT;
  const viewerPort = options.viewerPort ?? DEFAULT_VIEWER_PORT;
  mkdirSync(daemonDir(projectDir), { recursive: true });
  indexProject(projectDir);
  let lastIndexedAt = new Date().toISOString();
  const status: DaemonStatus = {
    ok: true,
    project_dir: projectDir,
    pid: process.pid,
    host,
    rest_port: restPort,
    viewer_port: viewerPort,
    started_at: new Date().toISOString(),
    status_path: statusPath(projectDir),
    index_watch: false,
    last_indexed_at: lastIndexedAt,
  };
  writeFileSync(status.status_path, JSON.stringify(status, null, 2), "utf8");
  let watcher: FSWatcher | null = null;
  let refreshTimer: NodeJS.Timeout | null = null;
  const refreshIndex = () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      try {
        indexProject(projectDir);
        lastIndexedAt = new Date().toISOString();
        status.last_indexed_at = lastIndexedAt;
        writeFileSync(status.status_path, JSON.stringify(status, null, 2), "utf8");
      } catch {
        // Keep the daemon alive; doctor/status surfaces stale indexes separately.
      }
    }, 350);
  };
  try {
    watcher = watch(projectDir, { recursive: true }, (_event, filename) => {
      const file = String(filename ?? "");
      if (!file || file.includes("node_modules") || file.includes(".git") || file.includes(".agent_memory/indexes") || file.includes(".agent_memory/code_graph") || file.includes(".agent_memory/graph")) return;
      refreshIndex();
    });
    status.index_watch = true;
    writeFileSync(status.status_path, JSON.stringify(status, null, 2), "utf8");
  } catch {
    status.index_watch = false;
    writeFileSync(status.status_path, JSON.stringify(status, null, 2), "utf8");
  }

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://${host}:${restPort}`);
    try {
      if (req.method === "GET" && url.pathname === "/health") {
        json(res, 200, { ok: true, name: "kage-daemon", project_dir: projectDir, pid: process.pid });
        return;
      }
      if (req.method === "GET" && url.pathname === "/kage/status") {
        status.last_indexed_at = lastIndexedAt;
        json(res, 200, status);
        return;
      }
      if (req.method === "GET" && url.pathname === "/kage/metrics") {
        json(res, 200, kageMetrics(projectDir));
        return;
      }
      if (req.method === "GET" && url.pathname === "/kage/quality") {
        json(res, 200, qualityReport(projectDir));
        return;
      }
      if (req.method === "GET" && url.pathname === "/kage/inbox") {
        json(res, 200, memoryInbox(projectDir));
        return;
      }
      if (req.method === "GET" && url.pathname === "/kage/benchmark") {
        json(res, 200, benchmarkProject(projectDir));
        return;
      }
      if (req.method === "POST" && url.pathname === "/kage/recall") {
        const body = await readBody(req);
        json(res, 200, recall(projectDir, String(body.query ?? ""), Number(body.limit ?? 5), Boolean(body.explain)));
        return;
      }
      if (req.method === "POST" && url.pathname === "/kage/observe") {
        const body = await readBody(req);
        json(res, 200, observe(projectDir, body as unknown as ObservationEvent));
        return;
      }
      if (req.method === "POST" && url.pathname === "/kage/distill") {
        const body = await readBody(req);
        json(res, 200, distillSession(projectDir, String(body.session_id ?? body.session ?? "default")));
        return;
      }
      notFound(res);
    } catch (error) {
      json(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  await new Promise<void>((resolve) => server.listen(restPort, host, resolve));
  console.log(`Kage daemon listening on http://${host}:${restPort}`);
  console.log(`Project: ${projectDir}`);
  console.log(`Status: ${status.status_path}`);

  process.on("SIGTERM", () => {
    if (watcher) watcher.close();
    if (refreshTimer) clearTimeout(refreshTimer);
    server.close(() => process.exit(0));
  });
}

export async function startViewer(projectDir: string, options: { host?: string; port?: number } = {}): Promise<ViewerStatus> {
  const host = options.host ?? DEFAULT_HOST;
  const port = options.port ?? DEFAULT_VIEWER_PORT;
  const viewerDir = resolve(__dirname, "..", "viewer");
  const projectRoot = resolve(projectDir);
  const graphPath = join(projectRoot, ".agent_memory", "graph", "graph.json");
  const codePath = join(projectRoot, ".agent_memory", "code_graph", "graph.json");
  const metricsPath = join(projectRoot, ".agent_memory", "metrics.json");
  const inboxPath = join(projectRoot, ".agent_memory", "inbox.json");
  const reviewPath = join(projectRoot, ".agent_memory", "review", "memory-review.md");
  const pendingDir = join(projectRoot, ".agent_memory", "pending");

  // Pre-generate lightweight JSON reports so the viewer can load them directly.
  try {
    const metrics = kageMetrics(projectDir);
    writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));
    const inbox = memoryInbox(projectDir);
    writeFileSync(inboxPath, JSON.stringify(inbox, null, 2));
  } catch {
    // non-fatal: viewer will show 404 for reports if generation fails
  }

  const url = `http://${host}:${port}/viewer/index.html?graph=${encodeURIComponent(graphPath)}&code=${encodeURIComponent(codePath)}&metrics=${encodeURIComponent(metricsPath)}&inbox=${encodeURIComponent(inboxPath)}&review=${encodeURIComponent(reviewPath)}&pending=${encodeURIComponent(pendingDir)}`;

  const server = createServer((req, res) => {
    const requestUrl = new URL(req.url ?? "/", `http://${host}:${port}`);
    let filePath: string | null = null;
    if (requestUrl.pathname === "/" || requestUrl.pathname === "/viewer") {
      filePath = join(viewerDir, "index.html");
    } else if (requestUrl.pathname.startsWith("/viewer/")) {
      filePath = join(viewerDir, normalize(requestUrl.pathname.replace(/^\/viewer\//, "")));
    } else {
      const decoded = decodeURIComponent(requestUrl.pathname);
      filePath = resolve(decoded);
      if (!isInside(projectRoot, filePath)) filePath = null;
    }

    if (!filePath || (!isInside(viewerDir, filePath) && !isInside(projectRoot, filePath)) || !existsSync(filePath)) {
      json(res, 404, { ok: false, error: "not_found" });
      return;
    }
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      const files = readdirSync(filePath)
        .filter((name: string) => name.endsWith(".json") || name.endsWith(".md"))
        .sort()
        .map((name: string) => ({ name, path: join(filePath!, name) }));
      json(res, 200, { ok: true, files });
      return;
    }
    res.writeHead(200, { "content-type": contentType(filePath) });
    res.end(readFileSync(filePath));
  });

  await new Promise<void>((resolveListen) => server.listen(port, host, resolveListen));
  console.log(`Kage viewer listening on ${url}`);
  process.on("SIGTERM", () => {
    server.close(() => process.exit(0));
  });
  return { ok: true, project_dir: projectRoot, host, port, url };
}
