import { access, mkdir, rm, writeFile, readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const projectRoot = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const toolsRoot = process.env.KAGE_VIDEO_TOOLS || "/tmp/kage-video-tools";
const puppeteerPath = `${toolsRoot}/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js`;
const ffmpegPath = `${toolsRoot}/node_modules/@ffmpeg-installer/darwin-arm64/ffmpeg`;
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const outputPath = join(projectRoot, "docs/assets/kage-team-memory-demo.mp4");
const posterPath = join(projectRoot, "docs/assets/kage-team-memory-demo-poster.png");
const frameDir = join("/tmp", `kage-team-memory-demo-frames-${Date.now()}`);
const demoRepo = join("/tmp", "kage-team-memory-demo-repo");

for (const requiredPath of [puppeteerPath, ffmpegPath, chromePath]) {
  try {
    await access(requiredPath);
  } catch {
    console.error(`Missing demo render dependency: ${requiredPath}`);
    console.error("Install with: npm --prefix /tmp/kage-video-tools install puppeteer-core @ffmpeg-installer/ffmpeg");
    process.exit(1);
  }
}

function run(command, args, cwd = demoRepo) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function truncate(text, length = 80) {
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

async function writeDemoRepo() {
  await rm(demoRepo, { recursive: true, force: true });
  await mkdir(join(demoRepo, "src"), { recursive: true });
  await mkdir(join(demoRepo, "tests"), { recursive: true });
  await writeFile(join(demoRepo, "package.json"), JSON.stringify({
    name: "kage-payments-demo",
    private: true,
    scripts: {
      test: "node tests/smoke.test.js",
      "test:payments": "node tests/payments.test.js"
    }
  }, null, 2));
  await writeFile(join(demoRepo, "README.md"), `# Payments Demo

Small demo repo used to show Kage team memory.

General smoke tests do not cover webhook retry behavior. Use the payments test
workflow when changing retry/backoff logic.
`);
  await writeFile(join(demoRepo, "src/payments.ts"), `export type WebhookEvent = {
  id: string;
  type: "payment.succeeded" | "payment.failed";
  attempts: number;
};

export function scheduleRetry(event: WebhookEvent): number {
  if (event.type !== "payment.failed") return 0;
  return Math.min(60, Math.pow(2, event.attempts) * 5);
}

export function handleWebhook(event: WebhookEvent): string {
  const retryInSeconds = scheduleRetry(event);
  return retryInSeconds ? \`retry:\${retryInSeconds}\` : "complete";
}
`);
  await writeFile(join(demoRepo, "tests/payments.test.ts"), `import { handleWebhook } from "../src/payments";

const result = handleWebhook({ id: "evt_demo", type: "payment.failed", attempts: 2 });
if (result !== "retry:20") {
  throw new Error(\`expected retry:20, got \${result}\`);
}

console.log("payments retry workflow ok");
`);
  await writeFile(join(demoRepo, "tests/smoke.test.js"), `console.log("smoke ok");\n`);
}

await writeDemoRepo();

const setupOutput = run("kage", ["init", "--project", demoRepo]);
const firstRefreshRaw = run("kage", ["refresh", "--project", demoRepo, "--json"]);
const firstRefresh = JSON.parse(firstRefreshRaw);

const captureOutput = run("kage", [
  "capture",
  "--project", demoRepo,
  "--title", "Payments retry changes require webhook regression test",
  "--type", "workflow",
  "--summary", "When changing payment webhook retry/backoff logic, update the payments regression test and run npm run test:payments. The generic smoke test does not cover retry edge cases.",
  "--body", "Teammate A's Codex session traced handleWebhook -> scheduleRetry in src/payments.ts and found that generic smoke tests do not cover payment retry behavior. Future agents changing retry/backoff logic should update tests/payments.test.ts and run npm run test:payments before handoff.",
  "--tags", "payments,workflow,tests,team-memory,codex",
  "--paths", "src/payments.ts,tests/payments.test.ts,package.json"
]);

const refreshRaw = run("kage", ["refresh", "--project", demoRepo, "--json"]);
const refresh = JSON.parse(refreshRaw);
const recallRaw = run("kage", [
  "recall",
  "How do I safely change webhook retry logic?",
  "--project", demoRepo,
  "--json",
  "--explain"
]);
const recall = JSON.parse(recallRaw);
const graph = JSON.parse(await readFile(join(demoRepo, ".agent_memory/graph/graph.json"), "utf8"));
const codeGraph = JSON.parse(await readFile(join(demoRepo, ".agent_memory/code_graph/graph.json"), "utf8"));
const packetPath = captureOutput.match(/Captured repo-local packet: (.+)$/m)?.[1] || "";
const packet = packetPath && existsSync(packetPath) ? JSON.parse(await readFile(packetPath, "utf8")) : recall.results[0]?.packet;

const demoFacts = {
  demoRepo,
  setupLine: setupOutput.split("\n")[0] || "Initialized Kage repo memory",
  packetFile: packetPath ? packetPath.replace(`${demoRepo}/`, "") : ".agent_memory/packets/*.json",
  packetTitle: packet?.title || "Payments retry changes require webhook regression test",
  packetSummary: packet?.summary || "",
  recallTitle: recall.results[0]?.packet?.title || packet?.title || "",
  recallWhy: recall.results[0]?.why_matched?.slice(0, 4).join(", ") || "workflow, payments, tests",
  graphEntities: refresh.memory_graph.entities,
  graphEdges: refresh.memory_graph.edges,
  evidenceCoverage: refresh.metrics.memory_graph.evidence_coverage_percent,
  codeFiles: refresh.code_graph.files,
  symbols: refresh.code_graph.symbols,
  tests: refresh.code_graph.tests,
  firstFiles: firstRefresh.code_graph.files,
  firstSymbols: firstRefresh.code_graph.symbols,
  packetPathList: packet?.paths || ["src/payments.ts", "tests/payments.test.ts", "package.json"],
  graphEntityCount: graph.entities?.length || refresh.memory_graph.entities,
  graphEdgeCount: graph.edges?.length || refresh.memory_graph.edges,
  codeGraphFiles: codeGraph.files?.length || refresh.code_graph.files
};

const scenes = [
  {
    duration: 72,
    kicker: "team repo",
    title: "Two teammates. Two agents. One codebase.",
    subtitle: "Kage keeps the useful repo knowledge where both agents can reach it.",
    leftTitle: "Teammate A / Codex",
    leftLines: [
      ["user", "Figure out webhook retry changes."],
      ["codex", "Using Kage before reading the repo."],
      ["tool", "kage_context(project, query)"]
    ],
    rightTitle: "Repo state",
    rightLines: [
      ["files", `${demoFacts.firstFiles} indexed files`],
      ["symbols", `${demoFacts.firstSymbols} source symbols`],
      ["memory", "no team packet yet"]
    ],
    graphTitle: "Cold repo",
    inspectorTitle: "Problem",
    inspector: ["agent context dies", "Slack/PR lore gets lost", "next teammate starts cold"],
    stat: [["Agents", "Codex + Claude"], ["External DB", "0"], ["Memory", "repo-local"]]
  },
  {
    duration: 80,
    kicker: "codex learns",
    title: "Codex finds a reusable workflow.",
    subtitle: "The useful part is not the whole transcript. It is the durable repo fact.",
    leftTitle: "Codex context",
    leftLines: [
      ["code", "handleWebhook -> scheduleRetry"],
      ["test", "tests/payments.test.ts covers retry"],
      ["run", "npm run test:payments"]
    ],
    rightTitle: "Code graph",
    rightLines: [
      ["file", "src/payments.ts"],
      ["file", "tests/payments.test.ts"],
      ["script", "package.json -> test:payments"]
    ],
    graphTitle: "Source-derived code graph",
    inspectorTitle: "What Codex learned",
    inspector: ["generic smoke test is not enough", "retry changes need payments test", "future agents should know this first"],
    stat: [["Files", String(demoFacts.codeFiles)], ["Symbols", String(demoFacts.symbols)], ["Tests", String(demoFacts.tests)]]
  },
  {
    duration: 82,
    kicker: "codex writes memory",
    title: "Kage stores the learning with the repo.",
    subtitle: "Repo-local memory is a git-visible packet, not a hidden SaaS database.",
    leftTitle: "Codex action",
    leftLines: [
      ["tool", "kage_capture(type='workflow')"],
      ["write", demoFacts.packetFile],
      ["status", "repo-local packet approved"]
    ],
    rightTitle: "Memory packet",
    rightLines: [
      ["title", truncate(demoFacts.packetTitle, 48)],
      ["paths", demoFacts.packetPathList.slice(0, 2).join(", ")],
      ["scope", "repo"]
    ],
    graphTitle: "Packet connected to paths",
    inspectorTitle: "Stored memory",
    inspector: ["type: workflow", "source refs: explicit capture", "freshness: verified", "privacy scanned before write"],
    stat: [["Review", "git/PR"], ["Org/global", "gated"], ["Packet", "JSON"]]
  },
  {
    duration: 82,
    kicker: "repo refresh",
    title: "Kage rebuilds memory + code graphs.",
    subtitle: "Indexes, source graph, memory graph, metrics, and stale checks update from local files.",
    leftTitle: "Kage refresh",
    leftLines: [
      ["tool", "kage_refresh(project)"],
      ["ok", "validation: ok"],
      ["graph", `${demoFacts.graphEntities} entities / ${demoFacts.graphEdges} edges`]
    ],
    rightTitle: "Trust signals",
    rightLines: [
      ["evidence", `${demoFacts.evidenceCoverage}% coverage`],
      ["stale", "0 stale packets"],
      ["quality", "source-grounded"]
    ],
    graphTitle: "Evidence graph",
    inspectorTitle: "Why this is not a notes folder",
    inspector: ["memory -> source path", "memory -> test file", "memory -> command", "memory -> evidence"],
    stat: [["Entities", String(demoFacts.graphEntities)], ["Edges", String(demoFacts.graphEdges)], ["Evidence", `${demoFacts.evidenceCoverage}%`]]
  },
  {
    duration: 88,
    kicker: "teammate b",
    title: "Claude Code opens the same repo later.",
    subtitle: "It recalls the workflow Codex saved instead of rediscovering it.",
    leftTitle: "Teammate B / Claude Code",
    leftLines: [
      ["user", "How do I safely change webhook retry logic?"],
      ["tool", "kage_context(project, query)"],
      ["recall", truncate(demoFacts.recallTitle, 58)]
    ],
    rightTitle: "Recall result",
    rightLines: [
      ["memory", truncate(demoFacts.recallTitle, 52)],
      ["matched", truncate(demoFacts.recallWhy, 52)],
      ["next", "update test + run test:payments"]
    ],
    graphTitle: "Same repo memory",
    inspectorTitle: "Handoff",
    inspector: ["Codex learned it", "Kage stored it", "Claude recalled it", "teammate starts with context"],
    stat: [["Rediscovery", "avoided"], ["Tokens", "saved"], ["Team", "shared"]]
  },
  {
    duration: 88,
    kicker: "viewer proof",
    title: "The team can inspect the memory graph.",
    subtitle: "Click memory, files, tests, commands, and evidence instead of trusting a black box.",
    leftTitle: "Viewer",
    leftLines: [
      ["node", truncate(demoFacts.packetTitle, 58)],
      ["edge", "applies_to -> src/payments.ts"],
      ["edge", "covered_by -> tests/payments.test.ts"]
    ],
    rightTitle: "Kage",
    rightLines: [
      ["local", "memory lives with the repo"],
      ["portable", "Codex, Claude Code, Cursor, MCP"],
      ["proof", "graph + source refs"]
    ],
    graphTitle: "Inspectable team memory",
    inspectorTitle: "What ships with the repo",
    inspector: ["runbooks", "decisions", "gotchas", "bug fixes", "workflows", "code graph context"],
    stat: [["Black box", "no"], ["Agents", "13"], ["DB", "0"]]
  }
];

const { default: puppeteer } = await import(`file://${puppeteerPath}`);
await rm(frameDir, { recursive: true, force: true });
await mkdir(frameDir, { recursive: true });

const totalFrames = scenes.reduce((sum, scene) => sum + scene.duration, 0);

function pageHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    :root{--bg:#020604;--panel:#06110b;--line:#174a2b;--green:#55ff91;--soft:#b6ffc9;--cyan:#41c9ff;--amber:#ffcf45;--text:#effff2;--muted:#8eb79c}
    *{box-sizing:border-box} body{margin:0;width:1600px;height:900px;overflow:hidden;background:radial-gradient(circle at 70% 20%,rgba(65,201,255,.16),transparent 28%),#020604;color:var(--text);font-family:Menlo,Monaco,Consolas,monospace}
    .shell{position:absolute;inset:28px;border:1px solid rgba(85,255,145,.48);border-radius:18px;background:linear-gradient(180deg,rgba(2,13,7,.97),rgba(2,6,4,.99));box-shadow:0 0 50px rgba(85,255,145,.15);overflow:hidden}
    .scan{position:absolute;inset:0;background:linear-gradient(rgba(255,255,255,.025) 50%,rgba(0,0,0,.07) 50%);background-size:100% 4px;pointer-events:none}
    .top{position:absolute;left:38px;right:38px;top:30px;display:flex;justify-content:space-between;align-items:center}.brand{display:flex;align-items:center;gap:15px;color:var(--green);font-size:24px;font-weight:950}.eye{width:54px;height:34px;filter:drop-shadow(0 0 14px rgba(85,255,145,.85))}.eye path{fill:none;stroke:var(--green);stroke-width:4}.eye ellipse{fill:var(--green)}
    .pills{display:flex;gap:10px}.pill{border:1px solid rgba(85,255,145,.42);border-radius:7px;padding:9px 12px;background:rgba(4,25,13,.76);color:var(--soft);font-size:13px;font-weight:900}
    .layout{position:absolute;left:58px;right:58px;top:108px;bottom:50px;display:grid;grid-template-columns:1fr 1fr;gap:26px}.hero{height:245px}.kicker{color:var(--green);font-size:15px;text-transform:uppercase;font-weight:950;letter-spacing:.12em}.title{margin-top:13px;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:54px;line-height:1;letter-spacing:0;font-weight:950}.subtitle{margin-top:16px;max-width:700px;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#a8d9b7;font-size:22px;line-height:1.34}
    .box{border:1px solid rgba(85,255,145,.25);border-radius:10px;background:rgba(1,9,5,.78);box-shadow:inset 0 0 34px rgba(85,255,145,.035)}.term{height:450px;padding:22px}.head{display:flex;justify-content:space-between;margin-bottom:17px;color:var(--muted);font-size:13px;text-transform:uppercase;letter-spacing:.08em;font-weight:950}.line{display:grid;grid-template-columns:100px 1fr;gap:13px;margin:14px 0;font-size:20px;line-height:1.27}.prompt{color:var(--cyan);font-weight:950}.text{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .graph{height:350px;padding:18px;position:relative;overflow:hidden}.grid{position:absolute;inset:62px 20px 20px;background-image:linear-gradient(rgba(85,255,145,.11) 1px,transparent 1px),linear-gradient(90deg,rgba(85,255,145,.11) 1px,transparent 1px);background-size:58px 58px}.graph-title{position:absolute;top:17px;left:20px;color:var(--soft);font-size:16px;font-weight:950}.svg{position:absolute;inset:64px 22px 18px;width:calc(100% - 44px);height:calc(100% - 82px)}
    .inspector{height:190px;padding:18px}.selected{color:var(--amber);font-size:20px;font-weight:950;margin-bottom:10px}.inspect{display:grid;grid-template-columns:1fr 1fr;gap:9px 18px;color:#baffca;font-size:17px}.inspect div:before{content:"> ";color:var(--green)}
    .stats{height:120px;padding:15px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.stat{border:1px solid rgba(65,201,255,.24);border-radius:7px;padding:12px;background:rgba(1,16,18,.72)}.stat strong{display:block;color:var(--cyan);font-size:23px}.stat span{display:block;margin-top:7px;color:var(--muted);text-transform:uppercase;font-size:11px;font-weight:950}.progress{position:absolute;left:34px;right:34px;bottom:22px;height:3px;background:rgba(85,255,145,.13)}.progress div{height:100%;width:0;background:linear-gradient(90deg,var(--green),var(--cyan));box-shadow:0 0 18px rgba(85,255,145,.7)}
  </style></head><body><div class="shell"><div class="scan"></div><div class="top"><div class="brand"><svg class="eye" viewBox="0 0 120 72"><path d="M8 36 C38 6 82 6 112 36 C82 66 38 66 8 36Z"></path><ellipse id="pupil" cx="60" cy="36" rx="17" ry="22"></ellipse></svg>KAGE://TEAM-MEMORY</div><div class="pills"><div class="pill">REAL KAGE RUN</div><div class="pill">GIT-NATIVE</div><div class="pill">MCP READY</div></div></div><main class="layout"><section><div class="hero"><div id="kicker" class="kicker"></div><div id="title" class="title"></div><div id="subtitle" class="subtitle"></div></div><div class="term box"><div class="head"><span id="leftTitle"></span><span>session</span></div><div id="leftLines"></div></div></section><section><div class="graph box"><div id="graphTitle" class="graph-title"></div><div class="grid"></div><svg class="svg" viewBox="0 0 680 350"><defs><filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4" result="b"></feGaussianBlur><feMerge><feMergeNode in="b"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge></filter></defs><g id="edges"></g><g id="nodes"></g></svg></div><div class="inspector box"><div class="head"><span id="rightTitle"></span><span id="rightMeta"></span></div><div id="inspectorTitle" class="selected"></div><div id="inspector" class="inspect"></div></div><div id="stats" class="stats box"></div></section></main><div class="progress"><div id="progress"></div></div></div><script>
  const scenes=${JSON.stringify(scenes)};
  const nodeSets=[
    [["Codex",90,92,"#41c9ff"],["repo",250,130,"#55ff91"],["lost",440,92,"#8eb79c"],["Claude",560,230,"#ffcf45"]],
    [["query",82,248,"#41c9ff"],["payments.ts",245,132,"#55ff91"],["test",430,88,"#ffcf45"],["script",560,220,"#41c9ff"]],
    [["Codex",78,98,"#41c9ff"],["packet",235,130,"#55ff91"],["paths",420,86,"#ffcf45"],["git",555,230,"#55ff91"]],
    [["packet",92,88,"#55ff91"],["entity",245,220,"#41c9ff"],["edge",420,106,"#ffcf45"],["metrics",560,225,"#55ff91"]],
    [["Claude",85,90,"#ffcf45"],["repo",245,90,"#55ff91"],["workflow",420,150,"#41c9ff"],["test",560,240,"#55ff91"]],
    [["workflow",86,86,"#55ff91"],["payments.ts",260,150,"#ffcf45"],["test.ts",445,94,"#41c9ff"],["evidence",560,235,"#55ff91"]]
  ];
  function draw(idx,p,g){const s=scenes[idx];kicker.textContent=s.kicker;title.textContent=s.title;subtitle.textContent=s.subtitle;leftTitle.textContent=s.leftTitle;rightTitle.textContent=s.rightTitle;graphTitle.textContent=s.graphTitle;inspectorTitle.textContent=s.inspectorTitle;rightMeta.textContent=s.kicker;progress.style.width=(g*100).toFixed(2)+"%";pupil.setAttribute("ry",Math.max(6,22-Math.sin(g*Math.PI*16)*8).toFixed(2));const show=Math.max(1,Math.ceil(s.leftLines.length*Math.min(1,p*1.4)));leftLines.innerHTML=s.leftLines.slice(0,show).map(l=>'<div class="line"><div class="prompt">'+l[0]+'</div><div class="text">'+l[1]+'</div></div>').join("");inspector.innerHTML=s.inspector.map(x=>'<div>'+x+'</div>').join("");stats.innerHTML=s.stat.map(x=>'<div class="stat"><strong>'+x[1]+'</strong><span>'+x[0]+'</span></div>').join("");const ns=nodeSets[idx];let paths=[];for(let i=0;i<ns.length-1;i++){const a=ns[i],b=ns[i+1],dash=230+i*45;paths.push('<path d="M'+a[1]+' '+a[2]+' C '+(a[1]+95)+' '+(a[2]-55)+', '+(b[1]-95)+' '+(b[2]+55)+', '+b[1]+' '+b[2]+'" fill="none" stroke="'+(i%2?'#41c9ff':'#55ff91')+'" stroke-width="3" opacity=".75" stroke-dasharray="'+dash+'" stroke-dashoffset="'+Math.max(0,dash*(1-p*1.35))+'"></path>')}edges.innerHTML=paths.join("");nodes.innerHTML=ns.map((n,i)=>{const visible=p>i*.12;const scale=visible?1+Math.sin(g*34+i)*.035:.5;return '<g transform="translate('+n[1]+' '+n[2]+') scale('+scale+')" opacity="'+(visible?1:0)+'"><circle r="24" fill="#020604" stroke="'+n[3]+'" stroke-width="4" filter="url(#glow)"></circle><text y="54" text-anchor="middle" fill="'+n[3]+'" font-size="16" font-weight="950">'+n[0]+'</text></g>'}).join("")}
  window.draw=draw;
  </script></body></html>`;
}

let frame = 0;
const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--hide-scrollbars"]
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  await page.setContent(pageHtml(), { waitUntil: "load" });
  let elapsed = 0;
  for (let sceneIndex = 0; sceneIndex < scenes.length; sceneIndex += 1) {
    const scene = scenes[sceneIndex];
    for (let sceneFrame = 0; sceneFrame < scene.duration; sceneFrame += 1) {
      const localProgress = sceneFrame / Math.max(1, scene.duration - 1);
      const globalProgress = elapsed / Math.max(1, totalFrames - 1);
      await page.evaluate(({ sceneIndex, localProgress, globalProgress }) => window.draw(sceneIndex, localProgress, globalProgress), {
        sceneIndex,
        localProgress,
        globalProgress
      });
      await page.screenshot({ path: join(frameDir, `frame-${String(frame).padStart(4, "0")}.png`), type: "png" });
      frame += 1;
      elapsed += 1;
    }
  }
  await page.screenshot({ path: posterPath, type: "png" });
} finally {
  await browser.close();
}

const ffmpeg = spawnSync(ffmpegPath, [
  "-y",
  "-framerate", "8",
  "-i", join(frameDir, "frame-%04d.png"),
  "-vf", "format=yuv420p",
  "-movflags", "+faststart",
  outputPath
], { stdio: "inherit" });

if (ffmpeg.status !== 0) process.exit(ffmpeg.status || 1);

const videoStat = await stat(outputPath);
const posterStat = await stat(posterPath);
console.log(`Demo repo: ${demoRepo}`);
console.log(`Packet: ${demoFacts.packetFile}`);
console.log(`Graph entities: ${demoFacts.graphEntityCount}; edges: ${demoFacts.graphEdgeCount}; code files: ${demoFacts.codeGraphFiles}`);
console.log(`Wrote ${outputPath} (${Math.round(videoStat.size / 1024)} KB)`);
console.log(`Wrote ${posterPath} (${Math.round(posterStat.size / 1024)} KB)`);
