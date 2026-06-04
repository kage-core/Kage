import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, watch, writeFileSync, type FSWatcher } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import {
  benchmarkCodingMemoryQuality,
  benchmarkMemoryScale,
  benchmarkProject,
  type BenchmarkReport,
  type CodingMemoryQualityBenchmarkReport,
  type MemoryScaleBenchmarkReport,
  capture,
  deleteContextSlot,
  distillSession,
  indexProject,
  kageDependencyPath,
  kageContributors,
  kageContextSlots,
  kageDecisionIntelligence,
  kageGraphInsights,
  kageMemoryAccess,
  kageMemoryAudit,
  kageMemoryHandoff,
  kageMemoryLifecycle,
  kageMemoryLineage,
  kageMemoryReconciliation,
  kageMemoryTimeline,
  kageMetrics,
  kageModuleHealth,
  kageCapabilityAudit,
  kageProjectProfile,
  kageRepoXray,
  kageRisk,
  kageSessionCaptureReport,
  kageSessionLearningLedger,
  kageSessionReplay,
  kageTeammateBrief,
  kageWorkspace,
  learn,
  memoryInbox,
  observe,
  qualityReport,
  benchmarkTrust,
  queryGraph,
  recall,
  recordFeedback,
  setupDoctor,
  setContextSlot,
  validateProject,
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

export interface DaemonContextReport {
  context_block: string;
  recall: ReturnType<typeof recall>;
  graph: ReturnType<typeof queryGraph>;
  teammate_brief: ReturnType<typeof kageTeammateBrief>;
  learning_ledger: ReturnType<typeof kageSessionLearningLedger> | null;
  risk: ReturnType<typeof kageRisk> | null;
  dependency_path: ReturnType<typeof kageDependencyPath> | null;
  validation: ReturnType<typeof validateProject>;
  memory_reconciliation: ReturnType<typeof kageMemoryReconciliation>;
}

export interface ViewerStatus {
  ok: boolean;
  project_dir: string;
  host: string;
  port: number;
  url: string;
}

export type ViewerBenchmarkReport = BenchmarkReport & {
  summary: CodingMemoryQualityBenchmarkReport["summary"];
  memory_quality: Pick<CodingMemoryQualityBenchmarkReport, "dataset" | "summary" | "source_diversity" | "by_category" | "baselines" | "caveats">;
  memory_scale: Pick<MemoryScaleBenchmarkReport, "sizes" | "summary" | "results" | "caveats">;
  proof_ledger: Array<{
    id: "memory-quality" | "source-diversity" | "memory-scale" | "local-gates";
    label: string;
    metric: string;
    target: string;
    actual: number;
    unit: "percent" | "score";
    pass: boolean;
    command: string;
    next_action: string;
  }>;
};

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

export function viewerStaticHeaders(filePath: string): Record<string, string> {
  return {
    "content-type": contentType(filePath),
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "cross-origin-opener-policy": "same-origin",
    "content-security-policy": [
      "default-src 'self'",
      "script-src 'self'",
      "script-src-attr 'none'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "connect-src 'self'",
      "font-src 'none'",
      "object-src 'none'",
      "base-uri 'none'",
      "frame-ancestors 'none'",
    ].join("; "),
  };
}

export function viewerRedirectLocation(pathname: string, search: string, fallbackSearch: string): string | null {
  if (pathname !== "/" && pathname !== "/viewer" && pathname !== "/viewer/") return null;
  return `/viewer/index.html${search || fallbackSearch}`;
}

export function viewerBenchmarkReport(projectDir: string): ViewerBenchmarkReport {
  const gates = benchmarkProject(projectDir);
  const memoryQuality = benchmarkCodingMemoryQuality();
  const memoryScale = benchmarkMemoryScale({ sizes: [240], topK: 10 });
  const requiredGates = gates.gates.filter((gate) => gate.required);
  const requiredGatePasses = requiredGates.filter((gate) => gate.pass).length;
  const requiredGatePercent = requiredGates.length ? Math.round((requiredGatePasses / requiredGates.length) * 100) : (gates.ok ? 100 : 0);
  const recallAt10 = Number(memoryQuality.summary.recall_at_10_percent ?? memoryQuality.summary.recall_at_k_percent ?? 0);
  const sourceDiversity = memoryQuality.source_diversity;
  const scaleHitRate = Number(memoryScale.summary.largest_hit_rate_percent ?? 0);
  const scaleContextCut = Number(memoryScale.summary.largest_context_reduction_percent ?? 0);
  return {
    ...gates,
    summary: memoryQuality.summary,
    memory_quality: {
      dataset: memoryQuality.dataset,
      summary: memoryQuality.summary,
      source_diversity: memoryQuality.source_diversity,
      by_category: memoryQuality.by_category,
      baselines: memoryQuality.baselines,
      caveats: memoryQuality.caveats,
    },
    memory_scale: {
      sizes: memoryScale.sizes,
      summary: memoryScale.summary,
      results: memoryScale.results,
      caveats: memoryScale.caveats,
    },
    proof_ledger: [
      {
        id: "memory-quality",
        label: "Coding-memory retrieval",
        metric: `${recallAt10.toFixed(2)}% R@10, ${memoryQuality.summary.ndcg_at_10.toFixed(4)} NDCG@10`,
        target: ">=95% R@10 and >=0.85 NDCG@10",
        actual: recallAt10,
        unit: "percent",
        pass: recallAt10 >= 95 && memoryQuality.summary.ndcg_at_10 >= 0.85,
        command: "kage benchmark --memory-quality --json",
        next_action: "Use this as the fast coding-memory retrieval proof before publishing benchmark claims.",
      },
      {
        id: "source-diversity",
        label: "Source diversity",
        metric: `${sourceDiversity.unique_sources} sources in top ${sourceDiversity.top_k}; max ${sourceDiversity.max_results_from_one_source} from one source`,
        target: ">=2 sources and <=3 results from one observed session",
        actual: sourceDiversity.unique_sources,
        unit: "score",
        pass: sourceDiversity.pass,
        command: "kage benchmark --memory-quality --json",
        next_action: sourceDiversity.pass ? "Use this to prove noisy sessions cannot crowd out independent repo memory." : "Inspect recall source diversity before publishing memory-quality claims.",
      },
      {
        id: "memory-scale",
        label: "Memory scale sanity",
        metric: `${memoryScale.summary.largest_packets} packets, ${scaleHitRate.toFixed(2)}% hit rate, ${scaleContextCut.toFixed(2)}% context cut`,
        target: ">=95% hit rate and >=80% context reduction",
        actual: scaleHitRate,
        unit: "percent",
        pass: scaleHitRate >= 95 && scaleContextCut >= 80,
        command: "kage benchmark --scale --sizes 240 --json",
        next_action: "Run kage benchmark --scale --sizes 240,1000,5000 --json for a larger release proof.",
      },
      {
        id: "local-gates",
        label: "Repo trust gates",
        metric: `${requiredGatePasses}/${requiredGates.length || gates.gates.length} required gates passing`,
        target: "100% required gates passing",
        actual: requiredGatePercent,
        unit: "percent",
        pass: gates.ok,
        command: "kage benchmark --project . --json",
        next_action: gates.ok ? "Keep this green before handoff, README updates, or release." : "Fix failing repo benchmark gates before sharing this memory state.",
      },
    ],
  };
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

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

function filePathHints(query: string): string[] {
  const matches = query.match(/[A-Za-z0-9_./@-]+\.(?:ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|kt|kts|rb|php|cs|c|h|cc|cpp|hpp|swift|json|md)\b/g) ?? [];
  return [...new Set(matches.map((match) => match.replace(/^\.\//, "")).filter((match) => !/^https?:\/\//.test(match)))];
}

function wantsDependencyPath(query: string): boolean {
  return /\b(connect|connected|dependency|depend|depends|path|impact|flow|trace)\b/i.test(query);
}

function riskContextBlock(result: ReturnType<typeof kageRisk>): string {
  const targets = Object.values(result.targets);
  if (!targets.length) return "";
  const lines = targets.slice(0, 5).map((item) => {
    const coChange = item.git.co_change_partners.length
      ? ` Co-change: ${item.git.co_change_partners.slice(0, 3).map((partner) => `${partner.file_path} (${partner.count})`).join(", ")}.`
      : "";
    return `- ${item.risk_summary}${coChange}`;
  });
  return `\n## Risk Signals\n${lines.join("\n")}`;
}

export function daemonContextReport(projectDir: string, body: Record<string, unknown>): DaemonContextReport {
  const query = String(body.query ?? "");
  const limit = Number(body.limit ?? 5);
  const validation = validateProject(projectDir);
  const recallResult = recall(projectDir, query, limit, Boolean(body.explain));
  const graphResult = queryGraph(projectDir, query, 5);
  const explicitTargets = [...stringArray(body.targets), ...filePathHints(query)];
  const changedFiles = stringArray(body.changed_files);
  const riskResult = explicitTargets.length || changedFiles.length ? kageRisk(projectDir, explicitTargets, changedFiles) : null;
  const pathHints = filePathHints(query);
  const dependencyResult = wantsDependencyPath(query) && pathHints.length >= 2
    ? kageDependencyPath(projectDir, pathHints[0], pathHints[1])
    : null;
  const reconciliation = kageMemoryReconciliation(projectDir, {
    sessionId: typeof body.session_id === "string" ? body.session_id : undefined,
    limit: 5,
  });
  const teammateBrief = kageTeammateBrief(projectDir, {
    query,
    targets: explicitTargets,
    changedFiles,
    recallResult,
    riskResult,
    reconciliation,
  });
  const learningLedger = typeof body.session_id === "string" && body.session_id.trim()
    ? kageSessionLearningLedger(projectDir, { sessionId: body.session_id, limit: 20 })
    : null;
  const validationText = validation.ok ? "Memory healthy." : `Warnings: ${validation.warnings.join("; ")}`;
  const contextBlock = [
    recallResult.context_block,
    teammateBrief.context_block,
    learningLedger ? learningLedger.context_block : "",
    graphResult.context_block ? `\n## Graph Facts\n${graphResult.context_block}` : "",
    riskResult ? riskContextBlock(riskResult) : "",
    dependencyResult ? `\n## Dependency Path\n${dependencyResult.summary}${dependencyResult.path.length ? `\nPath: ${dependencyResult.path.join(" -> ")}` : ""}` : "",
    reconciliation.unresolved_count ? `\n## Memory Reconciliation\n${reconciliation.agent_instruction}` : "",
    `\n_${validationText}_`,
  ].filter(Boolean).join("");
  return {
    context_block: contextBlock,
    recall: recallResult,
    graph: graphResult,
    teammate_brief: teammateBrief,
    learning_ledger: learningLedger,
    risk: riskResult,
    dependency_path: dependencyResult,
    validation,
    memory_reconciliation: reconciliation,
  };
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
      `POST http://${DEFAULT_HOST}:${restPort}/kage/context`,
      `POST http://${DEFAULT_HOST}:${restPort}/kage/recall`,
      `POST http://${DEFAULT_HOST}:${restPort}/kage/capture`,
      `POST http://${DEFAULT_HOST}:${restPort}/kage/learn`,
      `POST http://${DEFAULT_HOST}:${restPort}/kage/feedback`,
      `POST http://${DEFAULT_HOST}:${restPort}/kage/observe`,
      `POST http://${DEFAULT_HOST}:${restPort}/kage/distill`,
      `GET http://${DEFAULT_HOST}:${restPort}/kage/learning-ledger`,
      `GET http://${DEFAULT_HOST}:${restPort}/kage/replay`,
      `GET http://${DEFAULT_HOST}:${restPort}/kage/setup-doctor`,
      `GET http://${DEFAULT_HOST}:${restPort}/kage/profile`,
      `GET http://${DEFAULT_HOST}:${restPort}/kage/xray`,
      `GET http://${DEFAULT_HOST}:${restPort}/kage/capabilities`,
      `GET http://${DEFAULT_HOST}:${restPort}/kage/context-slots`,
      `POST http://${DEFAULT_HOST}:${restPort}/kage/context-slots`,
      `DELETE http://${DEFAULT_HOST}:${restPort}/kage/context-slots/:label`,
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
      if (req.method === "GET" && url.pathname === "/kage/profile") {
        json(res, 200, kageProjectProfile(projectDir));
        return;
      }
      if (req.method === "GET" && url.pathname === "/kage/xray") {
        json(res, 200, kageRepoXray(projectDir));
        return;
      }
      if (req.method === "GET" && url.pathname === "/kage/capabilities") {
        json(res, 200, kageCapabilityAudit(projectDir));
        return;
      }
      if (req.method === "GET" && url.pathname === "/kage/replay") {
        json(res, 200, kageSessionReplay(projectDir, {
          sessionId: url.searchParams.get("session") ?? undefined,
          limit: Number(url.searchParams.get("limit") ?? 200),
        }));
        return;
      }
      if (req.method === "GET" && url.pathname === "/kage/learning-ledger") {
        json(res, 200, kageSessionLearningLedger(projectDir, {
          sessionId: url.searchParams.get("session") ?? undefined,
          limit: Number(url.searchParams.get("limit") ?? 50),
        }));
        return;
      }
      if (req.method === "GET" && url.pathname === "/kage/context-slots") {
        json(res, 200, kageContextSlots(projectDir));
        return;
      }
      if (req.method === "GET" && url.pathname === "/kage/lifecycle") {
        json(res, 200, kageMemoryLifecycle(projectDir));
        return;
      }
      if (req.method === "GET" && url.pathname === "/kage/memory-audit") {
        json(res, 200, kageMemoryAudit(projectDir, Number(url.searchParams.get("limit") ?? 100)));
        return;
      }
      if (req.method === "GET" && url.pathname === "/kage/handoff") {
        json(res, 200, kageMemoryHandoff(projectDir));
        return;
      }
      if (req.method === "GET" && url.pathname === "/kage/timeline") {
        json(res, 200, kageMemoryTimeline(projectDir, Number(url.searchParams.get("days") ?? 14)));
        return;
      }
      if (req.method === "GET" && url.pathname === "/kage/lineage") {
        json(res, 200, kageMemoryLineage(projectDir));
        return;
      }
      if (req.method === "GET" && url.pathname === "/kage/inbox") {
        json(res, 200, memoryInbox(projectDir));
        return;
      }
      if (req.method === "GET" && url.pathname === "/kage/benchmark") {
        json(res, 200, url.searchParams.get("mode") === "memory_quality" ? benchmarkCodingMemoryQuality() : benchmarkProject(projectDir));
        return;
      }
      if (req.method === "GET" && url.pathname === "/kage/setup-doctor") {
        json(res, 200, setupDoctor(projectDir));
        return;
      }
      if (req.method === "POST" && url.pathname === "/kage/context") {
        const body = await readBody(req);
        json(res, 200, daemonContextReport(projectDir, body));
        return;
      }
      if (req.method === "POST" && url.pathname === "/kage/recall") {
        const body = await readBody(req);
        json(res, 200, recall(projectDir, String(body.query ?? ""), Number(body.limit ?? 5), Boolean(body.explain)));
        return;
      }
      if (req.method === "POST" && url.pathname === "/kage/capture") {
        const body = await readBody(req);
        const result = capture({
          projectDir,
          title: String(body.title ?? ""),
          summary: body.summary == null ? undefined : String(body.summary),
          body: String(body.body ?? body.learning ?? ""),
          type: body.type == null ? undefined : String(body.type) as never,
          tags: stringArray(body.tags),
          paths: stringArray(body.paths),
          stack: stringArray(body.stack),
        });
        json(res, result.ok ? 200 : 400, result);
        return;
      }
      if (req.method === "POST" && url.pathname === "/kage/learn") {
        const body = await readBody(req);
        const result = learn({
          projectDir,
          learning: String(body.learning ?? body.body ?? ""),
          title: body.title == null ? undefined : String(body.title),
          type: body.type == null ? undefined : String(body.type) as never,
          evidence: body.evidence == null ? undefined : String(body.evidence),
          verifiedBy: body.verified_by == null ? body.verifiedBy == null ? undefined : String(body.verifiedBy) : String(body.verified_by),
          tags: stringArray(body.tags),
          paths: stringArray(body.paths),
          stack: stringArray(body.stack),
        });
        json(res, result.ok ? 200 : 400, result);
        return;
      }
      if (req.method === "POST" && url.pathname === "/kage/feedback") {
        const body = await readBody(req);
        const result = recordFeedback(projectDir, String(body.packet_id ?? body.packet ?? ""), String(body.kind ?? "") as never);
        json(res, result.ok ? 200 : 400, result);
        return;
      }
      if (req.method === "POST" && url.pathname === "/kage/context-slots") {
        const body = await readBody(req);
        const result = setContextSlot(projectDir, {
          label: String(body.label ?? ""),
          content: String(body.content ?? ""),
          description: body.description == null ? undefined : String(body.description),
          pinned: body.pinned == null ? undefined : Boolean(body.pinned),
          size_limit: body.size_limit == null ? undefined : Number(body.size_limit),
          paths: stringArray(body.paths),
          tags: stringArray(body.tags),
        });
        json(res, result.ok ? 200 : 400, result);
        return;
      }
      if (req.method === "DELETE" && url.pathname.startsWith("/kage/context-slots/")) {
        const label = decodeURIComponent(url.pathname.slice("/kage/context-slots/".length));
        const result = deleteContextSlot(projectDir, label);
        json(res, result.ok ? 200 : 404, result);
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
  const threeDir = resolve(__dirname, "..", "node_modules", "three");
  const projectRoot = resolve(projectDir);
  const graphPath = join(projectRoot, ".agent_memory", "graph", "graph.json");
  const codePath = join(projectRoot, ".agent_memory", "code_graph", "graph.json");
  const metricsPath = join(projectRoot, ".agent_memory", "metrics.json");
  const inboxPath = join(projectRoot, ".agent_memory", "inbox.json");
  const reviewPath = join(projectRoot, ".agent_memory", "review", "memory-review.md");
  const pendingDir = join(projectRoot, ".agent_memory", "pending");
  const reportsDir = join(projectRoot, ".agent_memory", "reports");
  const qualityPath = join(reportsDir, "quality.json");
  const benchmarkPath = join(reportsDir, "benchmark.json");
  const contributorsPath = join(reportsDir, "contributors.json");
  const profilePath = join(reportsDir, "profile.json");
  const xrayPath = join(reportsDir, "xray.json");
  const capabilitiesPath = join(reportsDir, "capabilities.json");
  const slotsPath = join(reportsDir, "context-slots.json");
  const decisionsPath = join(reportsDir, "decisions.json");
  const riskPath = join(reportsDir, "risk.json");
  const moduleHealthPath = join(reportsDir, "module-health.json");
  const graphInsightsPath = join(reportsDir, "graph-insights.json");
  const workspacePath = join(reportsDir, "workspace.json");
  const sessionsPath = join(reportsDir, "sessions.json");
  const replayPath = join(reportsDir, "replay.json");
  const memoryAccessPath = join(reportsDir, "memory-access.json");
  const memoryAuditPath = join(reportsDir, "memory-audit.json");
  const handoffPath = join(reportsDir, "handoff.json");
  const lifecyclePath = join(reportsDir, "lifecycle.json");
  const timelinePath = join(reportsDir, "timeline.json");
  const lineagePath = join(reportsDir, "lineage.json");
  const setupPath = join(reportsDir, "setup.json");
  const trustPath = join(reportsDir, "trust.json");

  // Pre-generate lightweight JSON reports so the viewer can load them directly.
  try {
    mkdirSync(reportsDir, { recursive: true });
    const metrics = kageMetrics(projectDir);
    writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));
    const inbox = memoryInbox(projectDir);
    writeFileSync(inboxPath, JSON.stringify(inbox, null, 2));
    writeFileSync(qualityPath, JSON.stringify(qualityReport(projectDir), null, 2));
    writeFileSync(benchmarkPath, JSON.stringify(viewerBenchmarkReport(projectDir), null, 2));
    writeFileSync(contributorsPath, JSON.stringify(kageContributors(projectDir), null, 2));
    writeFileSync(profilePath, JSON.stringify(kageProjectProfile(projectDir), null, 2));
    writeFileSync(xrayPath, JSON.stringify(kageRepoXray(projectDir), null, 2));
    writeFileSync(capabilitiesPath, JSON.stringify(kageCapabilityAudit(projectDir), null, 2));
    writeFileSync(slotsPath, JSON.stringify(kageContextSlots(projectDir), null, 2));
    writeFileSync(decisionsPath, JSON.stringify(kageDecisionIntelligence(projectDir), null, 2));
    writeFileSync(riskPath, JSON.stringify(kageRisk(projectDir), null, 2));
    writeFileSync(moduleHealthPath, JSON.stringify(kageModuleHealth(projectDir), null, 2));
    writeFileSync(graphInsightsPath, JSON.stringify(kageGraphInsights(projectDir), null, 2));
    writeFileSync(workspacePath, JSON.stringify(kageWorkspace(projectDir), null, 2));
    writeFileSync(sessionsPath, JSON.stringify(kageSessionCaptureReport(projectDir), null, 2));
    writeFileSync(replayPath, JSON.stringify(kageSessionReplay(projectDir), null, 2));
    writeFileSync(memoryAccessPath, JSON.stringify(kageMemoryAccess(projectDir), null, 2));
    writeFileSync(memoryAuditPath, JSON.stringify(kageMemoryAudit(projectDir), null, 2));
    writeFileSync(handoffPath, JSON.stringify(kageMemoryHandoff(projectDir), null, 2));
    writeFileSync(lifecyclePath, JSON.stringify(kageMemoryLifecycle(projectDir), null, 2));
    writeFileSync(timelinePath, JSON.stringify(kageMemoryTimeline(projectDir), null, 2));
    writeFileSync(lineagePath, JSON.stringify(kageMemoryLineage(projectDir), null, 2));
    writeFileSync(setupPath, JSON.stringify(setupDoctor(projectDir), null, 2));
    writeFileSync(trustPath, JSON.stringify(benchmarkTrust(projectDir), null, 2));
  } catch {
    // non-fatal: viewer will show 404 for reports if generation fails
  }

  const url = `http://${host}:${port}/viewer/index.html?graph=${encodeURIComponent(graphPath)}&code=${encodeURIComponent(codePath)}&metrics=${encodeURIComponent(metricsPath)}&inbox=${encodeURIComponent(inboxPath)}&review=${encodeURIComponent(reviewPath)}&pending=${encodeURIComponent(pendingDir)}&quality=${encodeURIComponent(qualityPath)}&benchmark=${encodeURIComponent(benchmarkPath)}&contributors=${encodeURIComponent(contributorsPath)}&profile=${encodeURIComponent(profilePath)}&xray=${encodeURIComponent(xrayPath)}&capabilities=${encodeURIComponent(capabilitiesPath)}&slots=${encodeURIComponent(slotsPath)}&decisions=${encodeURIComponent(decisionsPath)}&risk=${encodeURIComponent(riskPath)}&moduleHealth=${encodeURIComponent(moduleHealthPath)}&graphInsights=${encodeURIComponent(graphInsightsPath)}&workspace=${encodeURIComponent(workspacePath)}&sessions=${encodeURIComponent(sessionsPath)}&replay=${encodeURIComponent(replayPath)}&memoryAccess=${encodeURIComponent(memoryAccessPath)}&memoryAudit=${encodeURIComponent(memoryAuditPath)}&handoff=${encodeURIComponent(handoffPath)}&lifecycle=${encodeURIComponent(lifecyclePath)}&timeline=${encodeURIComponent(timelinePath)}&lineage=${encodeURIComponent(lineagePath)}&setup=${encodeURIComponent(setupPath)}&trust=${encodeURIComponent(trustPath)}&view=code`;

  const server = createServer((req, res) => {
    const requestUrl = new URL(req.url ?? "/", `http://${host}:${port}`);
    let filePath: string | null = null;
    const redirectLocation = viewerRedirectLocation(requestUrl.pathname, requestUrl.search, new URL(url).search);
    if (redirectLocation) {
      res.writeHead(302, { location: redirectLocation });
      res.end();
      return;
    } else if (requestUrl.pathname.startsWith("/viewer/")) {
      filePath = join(viewerDir, normalize(requestUrl.pathname.replace(/^\/viewer\//, "")));
    } else if (requestUrl.pathname.startsWith("/vendor/three/")) {
      filePath = join(threeDir, normalize(requestUrl.pathname.replace(/^\/vendor\/three\//, "")));
    } else {
      const decoded = decodeURIComponent(requestUrl.pathname);
      filePath = resolve(decoded);
      if (!isInside(projectRoot, filePath)) filePath = null;
    }

    if (!filePath || (!isInside(viewerDir, filePath) && !isInside(projectRoot, filePath) && !isInside(threeDir, filePath)) || !existsSync(filePath)) {
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
    res.writeHead(200, viewerStaticHeaders(filePath));
    res.end(readFileSync(filePath));
  });

  await new Promise<void>((resolveListen) => server.listen(port, host, resolveListen));
  console.log(`Kage viewer listening on ${url}`);
  process.on("SIGTERM", () => {
    server.close(() => process.exit(0));
  });
  return { ok: true, project_dir: projectRoot, host, port, url };
}
