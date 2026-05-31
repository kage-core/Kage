import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { daemonContextReport, daemonDoctor, viewerBenchmarkReport, viewerRedirectLocation, viewerStaticHeaders } from "./daemon.js";
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

test("viewer normal pages use document scrolling instead of nested workspace scrolling", () => {
  const css = readFileSync(join(process.cwd(), "viewer", "styles.css"), "utf8");
  const memoryHtml = readFileSync(join(process.cwd(), "viewer", "memory.html"), "utf8");
  const rule = (selector: string) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
    assert.ok(match, `missing ${selector}`);
    return match[1];
  };

  assert.match(rule("body.viewer-page-memory .workspace-body"), /height:\s*auto/);
  assert.match(rule("body.viewer-page-memory.has-selection .details-panel"), /max-height:\s*calc\(100vh - 176px\)/);
  assert.match(rule("body.viewer-page-memory.has-selection .details-panel"), /position:\s*sticky/);
  assert.match(rule("body.viewer-page-memory .memory-panel"), /min-height:\s*0/);
  assert.match(rule("body.viewer-page-memory .memory-list"), /min-height:\s*280px/);
  const workspaceShellRule = rule("body.viewer-page-memory .workspace-shell,\nbody.viewer-page-intel .workspace-shell,\nbody.viewer-page-owners .workspace-shell,\nbody.viewer-page-review .workspace-shell,\nbody.viewer-page-data .workspace-shell");
  assert.match(workspaceShellRule, /min-height:\s*calc\(100vh - 176px\)/);
  assert.match(workspaceShellRule, /height:\s*auto/);
  assert.match(workspaceShellRule, /overflow:\s*visible/);
  assert.match(rule(".memory-list"), /height:\s*auto/);
  assert.match(rule(".memory-list"), /overflow:\s*visible/);
  assert.match(rule(".intelligence-list"), /height:\s*auto/);
  assert.match(rule(".intelligence-list"), /overflow:\s*visible/);
  assert.match(memoryHtml, /<details class="memory-governance"/);
  assert.ok(memoryHtml.indexOf("id=\"memoryList\"") < memoryHtml.indexOf("class=\"memory-governance\""));
});

test("viewer defaults keep advanced diagnostics out of normal workflows", () => {
  const css = readFileSync(join(process.cwd(), "viewer", "styles.css"), "utf8");
  const app = readFileSync(join(process.cwd(), "viewer", "app.js"), "utf8");
  const graphHtml = readFileSync(join(process.cwd(), "viewer", "graph.html"), "utf8");
  const rule = (selector: string) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
    assert.ok(match, `missing ${selector}`);
    return match[1];
  };

  assert.match(rule(".sidebar-secondary"), /display:\s*none/);
  assert.match(rule(".status-strip"), /display:\s*none/);
  assert.match(rule(".autoload-status"), /display:\s*none/);
  assert.match(rule(".app-header .file-picker"), /display:\s*none/);
  assert.match(rule("#dashboardReview"), /display:\s*none/);
  assert.match(rule("body.viewer-page-memory .memory-overview"), /display:\s*none/);
  assert.match(rule("body.viewer-page-review .proof-panel"), /display:\s*none/);
  assert.match(rule(".inspector-path-finder"), /display:\s*none\s*!important/);
  assert.match(rule("body.viewer-page-graph .graph-insights-panel"), /display:\s*none/);
  assert.doesNotMatch(graphHtml, /<span>Render Mode<\/span>/);
  assert.match(app, /cards\.concat\(tailCards\)\.slice\(0,\s*3\)/);
  assert.match(app, /riskFirst = new Set\(\["Before You Edit", "Change Risk", "Module Health", "Decision Memory", "Graph Insights", "Memory Quality"\]\)/);
  assert.match(app, /userFacingRiskTargets\(risk\)/);
  assert.match(app, /primaryCards = normalizedCards\.filter/);
  assert.match(app, /intel-deep-drawer/);
});

test("viewer labels separate inbox blockers from handoff review work", () => {
  const app = readFileSync(join(process.cwd(), "viewer", "app.js"), "utf8");
  const htmlFiles = ["index.html", "graph.html", "intel.html", "memory.html", "review.html", "owners.html", "data.html"];

  for (const file of htmlFiles) {
    const html = readFileSync(join(process.cwd(), "viewer", file), "utf8");
    assert.doesNotMatch(html, /Open risks/);
    assert.match(html, /Open edit checklist/);
  }

  assert.doesNotMatch(app, /openCount = Number\(firstNumber\(handoff\.totals\.open_items/);
  assert.doesNotMatch(app, /blockers = Number\(firstNumber\(handoff\.totals\.open_items/);
  assert.match(app, /handoffReviewCount/);
  assert.match(app, /Inbox: clear/);
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
