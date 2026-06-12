import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer, get } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { daemonContextReport, daemonDoctor, startLiveFeed, viewerBenchmarkReport, viewerRedirectLocation, viewerReportPaths, viewerStaticHeaders, viewerUrl } from "./daemon.js";
import { capture, indexProject } from "./kernel.js";

test("viewer bare routes redirect to index while preserving query params", () => {
  assert.equal(viewerRedirectLocation("/", "", "?graph=/repo/.agent_memory/graph/graph.json"), "/viewer/index.html?graph=/repo/.agent_memory/graph/graph.json");
  assert.equal(viewerRedirectLocation("/viewer", "", "?graph=/repo/.agent_memory/graph/graph.json"), "/viewer/index.html?graph=/repo/.agent_memory/graph/graph.json");
  assert.equal(viewerRedirectLocation("/viewer/", "?graph=/repo/.agent_memory/graph/graph.json", "?fallback=true"), "/viewer/index.html?graph=/repo/.agent_memory/graph/graph.json");
  assert.equal(viewerRedirectLocation("/viewer/graph.html", "?graph=/repo/.agent_memory/graph/graph.json", "?fallback=true"), null);
});

test("viewer static responses include browser security headers", () => {
  const headers = viewerStaticHeaders("/repo/mcp/viewer/index.html");
  assert.equal(headers["content-type"], "text/html; charset=utf-8");
  assert.equal(headers["x-content-type-options"], "nosniff");
  assert.equal(headers["referrer-policy"], "no-referrer");
  assert.equal(headers["cross-origin-opener-policy"], "same-origin");
  assert.match(headers["content-security-policy"], /default-src 'self'/);
  assert.match(headers["content-security-policy"], /script-src 'self'/);
  assert.match(headers["content-security-policy"], /script-src-attr 'none'/);
  assert.doesNotMatch(headers["content-security-policy"], /script-src 'unsafe-inline'/);
});

test("viewer url serves every report param including the value ledger", () => {
  const reports = viewerReportPaths("/repo");
  assert.equal(reports.value, "/repo/.agent_memory/reports/value.json");
  assert.equal(reports.trust, "/repo/.agent_memory/reports/trust.json");
  assert.equal(reports.metrics, "/repo/.agent_memory/metrics.json");

  const url = viewerUrl("127.0.0.1", 3113, "/repo");
  assert.match(url, /^http:\/\/127\.0\.0\.1:3113\/viewer\/index\.html\?/);
  assert.match(url, /graph=%2Frepo%2F\.agent_memory%2Fgraph%2Fgraph\.json/);
  assert.match(url, /value=%2Frepo%2F\.agent_memory%2Freports%2Fvalue\.json/);
  assert.match(url, /&view=code$/);
});

test("viewer dashboard is a CSP-safe multi-section page backed by external console.js", () => {
  const indexHtml = readFileSync(join(process.cwd(), "viewer", "index.html"), "utf8");
  const consoleJs = readFileSync(join(process.cwd(), "viewer", "console.js"), "utf8");
  // CSP forbids inline scripts: the page must load console.js externally.
  assert.match(indexHtml, /<script src="\.\/console\.js/);
  assert.doesNotMatch(indexHtml, /<script>\s*\n\s*\(function/);
  // Multi-section dashboard: sidebar nav drives separate Gains / Overview / Graph / Memory / Insights sections.
  // Gains is the landing tab: value first, trust as proof.
  assert.match(indexHtml, /data-section="gains" aria-current="true"/);
  assert.match(indexHtml, /id="gainsHero"/);
  assert.match(indexHtml, /id="gainsTimeline"/);
  assert.match(indexHtml, /data-section="overview"/);
  assert.match(indexHtml, /data-section="graph"/);
  assert.match(indexHtml, /data-section="memory"/);
  assert.match(indexHtml, /data-section="activity"/);
  assert.match(indexHtml, /data-section="insights"/);
  // Core surfaces: trust hero, stat tiles, the memory<->code graph canvas, the memory list, and insight charts.
  assert.match(indexHtml, /id="hero"/);
  assert.match(indexHtml, /id="tiles"/);
  assert.match(indexHtml, /id="graph"/);
  assert.match(indexHtml, /id="list"/);
  assert.match(indexHtml, /id="donut"/);
  // console.js reads the lifecycle/trust/suppressed/metrics reports and renders the graph + insights.
  assert.match(consoleJs, /lifecycle/);
  assert.match(consoleJs, /trust_score/);
  assert.match(consoleJs, /suppressed/);
  assert.match(consoleJs, /metrics/);
  assert.match(consoleJs, /buildGraph/);
  assert.match(consoleJs, /renderActivity/);
  assert.match(indexHtml, /id="activityFeed"/);
  // The Gains tab reads the value ledger and renders the savings receipt + timeline.
  assert.match(consoleJs, /renderGains/);
  assert.match(consoleJs, /value\.json/);
  assert.match(consoleJs, /recall_served/);
  assert.match(consoleJs, /stale_withheld/);
});

test("viewer benchmark report combines local gates with coding memory retrieval proof", () => {
  const project = mkdtempSync(join(tmpdir(), "kage-viewer-benchmark-"));
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");

  const report = viewerBenchmarkReport(project);

  assert.equal(Array.isArray(report.gates), true);
  assert.equal(report.summary.benchmark, "Kage coding memory quality");
  assert.equal(report.summary.recall_at_10_percent, 100);
  assert.equal(report.memory_quality.dataset.observations, 240);
  assert.equal(report.memory_quality.summary.context_reduction_percent > 0, true);
  assert.equal(report.memory_scale.summary.largest_packets, 240);
  assert.equal(report.memory_scale.summary.largest_hit_rate_percent, 100);
});

test("viewer benchmark report exposes a proof ledger with runnable commands", () => {
  const project = mkdtempSync(join(tmpdir(), "kage-viewer-benchmark-proof-"));
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }), "utf8");

  const report = viewerBenchmarkReport(project);

  assert.equal(report.proof_ledger.length >= 3, true);
  assert.ok(report.proof_ledger.some((item) => item.id === "memory-quality" && item.command === "kage benchmark --memory-quality --json" && item.pass));
  assert.ok(report.proof_ledger.some((item) => item.id === "source-diversity" && item.command === "kage benchmark --memory-quality --json" && item.pass));
  assert.ok(report.proof_ledger.some((item) => item.id === "memory-scale" && item.command === "kage benchmark --scale --sizes 240 --json"));
  assert.ok(report.proof_ledger.some((item) => item.id === "local-gates" && item.command === "kage benchmark --project . --json"));
  for (const item of report.proof_ledger) {
    assert.equal(typeof item.label, "string");
    assert.equal(typeof item.metric, "string");
    assert.equal(typeof item.next_action, "string");
    assert.equal(item.next_action.length > 0, true);
  }
});

test("live feed streams packet writes and value ledger events over SSE", async () => {
  const project = mkdtempSync(join(tmpdir(), "kage-live-feed-"));
  mkdirSync(join(project, ".agent_memory", "packets"), { recursive: true });
  mkdirSync(join(project, ".agent_memory", "reports"), { recursive: true });
  const feed = startLiveFeed(project, { debounceMs: 25, heartbeatMs: 60_000 });
  const server = createServer((req, res) => {
    if (req.url === "/kage/events") {
      feed.handleRequest(req, res);
      return;
    }
    res.writeHead(404);
    res.end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;

  let received = "";
  const request = get(`http://127.0.0.1:${port}/kage/events`, (res) => {
    assert.equal(res.statusCode, 200);
    assert.match(String(res.headers["content-type"]), /text\/event-stream/);
    res.on("data", (chunk) => { received += String(chunk); });
  });
  const waitFor = async (pattern: RegExp) => {
    const deadline = Date.now() + 5000;
    while (!pattern.test(received)) {
      if (Date.now() > deadline) throw new Error(`timed out waiting for ${pattern}; received so far: ${received}`);
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  };

  try {
    await waitFor(/: connected/);
    assert.equal(feed.clientCount(), 1);

    // new packet file -> packet_written with the packet title
    writeFileSync(join(project, ".agent_memory", "packets", "demo-packet.json"), JSON.stringify({ title: "Demo packet from the live feed" }), "utf8");
    await waitFor(/"type":"packet_written"/);
    await waitFor(/Demo packet from the live feed/);

    // same file rewritten -> packet_updated
    writeFileSync(join(project, ".agent_memory", "packets", "demo-packet.json"), JSON.stringify({ title: "Demo packet, revised" }), "utf8");
    await waitFor(/"type":"packet_updated"/);

    // value ledger append -> value_event carrying the ledger entry
    writeFileSync(
      join(project, ".agent_memory", "reports", "value.json"),
      JSON.stringify({ totals: { tokens_saved: 1200 }, events: [{ kind: "recall_served", tokens_saved: 1200, at: new Date().toISOString() }] }),
      "utf8"
    );
    await waitFor(/"type":"value_event"/);
    await waitFor(/"kind":"recall_served"/);
  } finally {
    request.destroy();
    feed.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("daemon doctor advertises complete REST memory operations", () => {
  const project = mkdtempSync(join(tmpdir(), "kage-daemon-doctor-"));

  const report = daemonDoctor(project);

  assert.ok(report.endpoints.includes("POST http://127.0.0.1:3111/kage/context"));
  assert.ok(report.endpoints.includes("POST http://127.0.0.1:3111/kage/capture"));
  assert.ok(report.endpoints.includes("POST http://127.0.0.1:3111/kage/learn"));
  assert.ok(report.endpoints.includes("POST http://127.0.0.1:3111/kage/feedback"));
  assert.ok(report.endpoints.includes("GET http://127.0.0.1:3111/kage/setup-doctor"));
  assert.ok(report.endpoints.includes("GET http://127.0.0.1:3111/kage/profile"));
  assert.ok(report.endpoints.includes("GET http://127.0.0.1:3111/kage/xray"));
  assert.ok(report.endpoints.includes("GET http://127.0.0.1:3111/kage/capabilities"));
  assert.ok(report.endpoints.includes("GET http://127.0.0.1:3111/kage/context-slots"));
  assert.ok(report.endpoints.includes("POST http://127.0.0.1:3111/kage/context-slots"));
  assert.ok(report.endpoints.includes("GET http://127.0.0.1:3111/kage/replay"));
  assert.ok(report.endpoints.includes("GET http://127.0.0.1:3111/kage/learning-ledger"));
});

test("daemon context report gives REST agents combined memory graph and risk context", () => {
  const project = mkdtempSync(join(tmpdir(), "kage-daemon-context-"));
  mkdirSync(join(project, "src"), { recursive: true });
  mkdirSync(join(project, "test"), { recursive: true });
  writeFileSync(join(project, "src", "auth.ts"), "export function verifyToken(token: string) { return token.length > 0; }\n", "utf8");
  writeFileSync(
    join(project, "test", "auth.test.ts"),
    "import { verifyToken } from '../src/auth.js';\ntest('verifyToken accepts non-empty tokens', () => verifyToken('token'));\n",
    "utf8"
  );
  const captured = capture({
    projectDir: project,
    title: "Auth token verification gotcha",
    body: "When editing src/auth.ts, keep token verification side-effect free because middleware callers retry failed requests.",
    type: "gotcha",
    paths: ["src/auth.ts"],
    tags: ["auth", "rest"],
  });
  assert.equal(captured.ok, true);
  indexProject(project);

  const report = daemonContextReport(project, {
    query: "auth token flow in src/auth.ts",
    targets: ["src/auth.ts"],
    limit: 3,
  });

  assert.match(report.context_block, /# Kage Context/);
  assert.match(report.context_block, /Teammate Brief/);
  assert.match(report.context_block, /Verification Contract/);
  assert.match(report.context_block, /test\/auth\.test\.ts/);
  assert.match(report.context_block, /Auth token verification gotcha/);
  assert.equal(report.recall.results.some((item) => item.packet.title === "Auth token verification gotcha"), true);
  assert.equal(report.graph.entities.length + report.graph.edges.length > 0, true);
  assert.ok(report.risk);
  assert.equal(report.risk.targets["src/auth.ts"].target, "src/auth.ts");
});
