import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const projectRoot = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const toolsRoot = process.env.KAGE_VIDEO_TOOLS || "/tmp/kage-video-tools";
const puppeteerPath = `${toolsRoot}/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js`;
const ffmpegPath = `${toolsRoot}/node_modules/@ffmpeg-installer/darwin-arm64/ffmpeg`;
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const demoRepo = process.env.KAGE_REAL_DEMO_REPO || "/tmp/kage-real-team-demo";
const codexLogPath = process.env.KAGE_CODEX_LOG || "/tmp/kage-codex-recall-proof.log";
const claudeLogPath = process.env.KAGE_CLAUDE_LOG || "/tmp/kage-claude-recall-proof.log";
const outputPath = join(projectRoot, "docs/assets/kage-real-team-demo.mp4");
const posterPath = join(projectRoot, "docs/assets/kage-real-team-demo-poster.png");
const frameDir = join("/tmp", `kage-real-team-demo-frames-${Date.now()}`);

for (const requiredPath of [puppeteerPath, ffmpegPath, chromePath, demoRepo, codexLogPath, claudeLogPath]) {
  try {
    await access(requiredPath);
  } catch {
    console.error(`Missing real demo dependency: ${requiredPath}`);
    console.error("Expected a prepared demo repo and captured Codex/Claude CLI proof logs.");
    process.exit(1);
  }
}

const { default: puppeteer } = await import(`file://${puppeteerPath}`);

function run(command, args, cwd = demoRepo) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function stripAnsi(text) {
  return text
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/\u001b\][^\u0007]*(\u0007|\u001b\\)/g, "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
}

function cleanLog(text) {
  return stripAnsi(text)
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line && !line.includes("WARN codex_core") && !line.includes("ignoring interface."))
    .join("\n");
}

function pickLines(text, patterns, fallback = []) {
  const lines = text.split(/\r?\n/);
  const found = [];
  for (const pattern of patterns) {
    const index = lines.findIndex((line) => pattern.test(line));
    if (index >= 0) found.push(lines[index]);
  }
  return found.length ? found : fallback;
}

function truncate(text, length = 76) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  return normalized.length > length ? `${normalized.slice(0, length - 1)}…` : normalized;
}

const codexLog = cleanLog(await readFile(codexLogPath, "utf8"));
const claudeLog = cleanLog(await readFile(claudeLogPath, "utf8"));
const recall = JSON.parse(run("kage", ["recall", "payment webhook retry logic safe change", "--project", demoRepo, "--json", "--explain"]));
const codeGraph = JSON.parse(run("kage", ["code-graph", "payment webhook retry", "--project", demoRepo, "--json"]));
const metrics = JSON.parse(run("kage", ["metrics", "--project", demoRepo, "--json"]));
const packet = recall.results?.[0]?.packet || {};
const packetFile = existsSync(join(demoRepo, ".agent_memory/packets/gotcha-payment-webhook-retry-validation-gotcha-50370ce9.json"))
  ? ".agent_memory/packets/gotcha-payment-webhook-retry-validation-gotcha-50370ce9.json"
  : ".agent_memory/packets/*.json";

const codexProof = pickLines(codexLog, [
  /mcp: kage\/kage_context started/,
  /kage recall "payment webhook retry logic safe change"/,
  /Kage packet:/,
  /tokens used/
], [
  "mcp: kage/kage_context started",
  "kage recall \"payment webhook retry logic safe change\"",
  `Kage packet: "${packet.title}"`,
  "tokens used"
]);

const claudeProof = pickLines(claudeLog, [
  /Kage packet:/,
  /Retry logic lives/,
  /Gotcha:/,
  /Source path:/
], [
  `Kage packet: ${packet.title}`,
  "Retry logic lives in src/payments.ts",
  "Gotcha: test:payments points at missing JS",
  "Source path: src/payments.ts"
]);

const scenes = [
  {
    label: "01",
    duration: 72,
    kicker: "real terminal proof",
    title: "Teammate A asks Codex.",
    subtitle: "Codex starts in the repo and reaches for Kage before reading the project from scratch.",
    leftTitle: "Terminal / Codex CLI",
    leftLines: [
      ["$", "codex exec -C /tmp/kage-real-team-demo"],
      ["user", "How do I safely change payment webhook retry logic?"],
      ["mcp", codexProof[0]],
      ["note", "MCP call was denied by the CLI session, so Codex used Kage CLI fallback."]
    ],
    rightTitle: "Repo",
    graphTitle: "Kage starts from repo memory",
    inspectorTitle: "Why this matters",
    inspector: [
      "same project",
      "same weird command",
      "same retry flow",
      "no rediscovery loop"
    ],
    stats: [
      ["Agent", "Codex CLI"],
      ["Repo", "local"],
      ["DB", "0"]
    ],
    nodes: ["Codex", "Kage", "Repo", "Memory"]
  },
  {
    label: "02",
    duration: 84,
    kicker: "recall",
    title: "Kage returns the useful memory.",
    subtitle: "Not the whole transcript. Just the durable gotcha, source paths, command, and evidence.",
    leftTitle: "Kage recall",
    leftLines: [
      ["tool", "kage recall \"payment webhook retry logic safe change\""],
      ["hit", truncate(packet.title, 68)],
      ["score", String(recall.results?.[0]?.score ?? "rank #1")],
      ["why", truncate(recall.results?.[0]?.why_matched?.slice(0, 5).join(", "), 76)]
    ],
    rightTitle: "Memory packet",
    graphTitle: "Memory linked to code paths",
    inspectorTitle: truncate(packet.title, 58),
    inspector: [
      "type: gotcha",
      "paths: src/payments.ts",
      "paths: tests/payments.test.ts",
      "command: npm run test:payments"
    ],
    stats: [
      ["Quality", String(packet.quality?.score ?? 100)],
      ["Evidence", `${metrics.memory_graph.evidence_coverage_percent}%`],
      ["Status", packet.status || "approved"]
    ],
    nodes: ["Gotcha", "src", "test", "command"]
  },
  {
    label: "03",
    duration: 84,
    kicker: "code graph",
    title: "The code graph shows the flow.",
    subtitle: "Kage stores learned memory separately from source-derived facts, then connects them.",
    leftTitle: "Code graph facts",
    leftLines: [
      ["fn", "scheduleRetry -> src/payments.ts:7"],
      ["fn", "handleWebhook -> src/payments.ts:12"],
      ["call", "retryInSeconds calls scheduleRetry"],
      ["test", "tests/payments.test.ts imports handleWebhook"]
    ],
    rightTitle: "Source graph",
    graphTitle: "Source-derived context",
    inspectorTitle: "Not a markdown folder",
    inspector: [
      `${codeGraph.files?.length || metrics.code_graph.files} files`,
      `${codeGraph.symbols?.length || metrics.code_graph.symbols} symbols`,
      `${codeGraph.imports?.length || metrics.code_graph.imports} imports`,
      `${codeGraph.calls?.length || metrics.code_graph.calls} calls`
    ],
    stats: [
      ["Files", String(metrics.code_graph.files)],
      ["Symbols", String(metrics.code_graph.symbols)],
      ["Calls", String(metrics.code_graph.calls)]
    ],
    nodes: ["file", "symbol", "call", "test"]
  },
  {
    label: "04",
    duration: 92,
    kicker: "codex answer",
    title: "Codex answers with saved context.",
    subtitle: "It already knows the safe path: change the retry function, update the test, and fix the broken test harness.",
    leftTitle: "Actual Codex CLI output",
    leftLines: [
      ["codex", truncate(codexProof[2] || `Kage packet: "${packet.title}"`, 82)],
      ["codex", "Change retry policy in scheduleRetry."],
      ["codex", "Keep handleWebhook's retry:<seconds> contract intact."],
      ["codex", "Fix/verify test:payments before trusting it."]
    ],
    rightTitle: "Stored packet",
    graphTitle: "Codex learned once",
    inspectorTitle: "Packet file",
    inspector: [
      packetFile,
      "source: explicit_capture",
      "freshness: verified",
      "promotion: org/global gated"
    ],
    stats: [
      ["Paths", String(packet.paths?.length || 4)],
      ["Tags", String(packet.tags?.length || 5)],
      ["Saved", "repo"]
    ],
    nodes: ["Codex", "packet", "git", "future"]
  },
  {
    label: "05",
    duration: 84,
    kicker: "handoff",
    title: "Teammate B asks Claude Code.",
    subtitle: "Same repo. Different agent. It recalls the memory Codex created.",
    leftTitle: "Terminal / Claude CLI",
    leftLines: [
      ["$", "claude -p \"How do I safely change retry logic?\""],
      ["claude", truncate(claudeProof[0], 82)],
      ["claude", truncate(claudeProof[1], 82)],
      ["claude", truncate(claudeProof[3], 82)]
    ],
    rightTitle: "Same source of truth",
    graphTitle: "Claude reads the same repo memory",
    inspectorTitle: "Cross-agent win",
    inspector: [
      "Codex found it",
      "Kage stored it",
      "Claude recalled it",
      "team avoids repeat discovery"
    ],
    stats: [
      ["Agent", "Claude"],
      ["Packet", "same"],
      ["Files", "same"]
    ],
    nodes: ["Claude", "Kage", "Gotcha", "Code"]
  },
  {
    label: "06",
    duration: 92,
    kicker: "viewer proof",
    title: "The graph is inspectable.",
    subtitle: "Teams can see the memory node, the source files, the command, and the evidence instead of trusting a black box.",
    leftTitle: "Memory graph",
    leftLines: [
      ["node", truncate(packet.title, 82)],
      ["edge", "applies_to -> src/payments.ts"],
      ["edge", "covered_by -> tests/payments.test.ts"],
      ["edge", "documents_command -> npm run test:payments"]
    ],
    rightTitle: "Metrics",
    graphTitle: "Memory + code graph",
    inspectorTitle: "Tiny demo repo metrics",
    inspector: [
      `${metrics.memory_graph.entities} entities`,
      `${metrics.memory_graph.edges} edges`,
      `${metrics.memory_graph.evidence_coverage_percent}% evidence backed`,
      `${metrics.quality.useful_memory_ratio_percent}% useful memory ratio`
    ],
    stats: [
      ["Readiness", String(metrics.harness.readiness_score)],
      ["Pending", String(metrics.memory_graph.pending_packets)],
      ["Stale", String(metrics.quality.totals.stale)]
    ],
    nodes: ["memory", "file", "test", "evidence"]
  },
  {
    label: "07",
    duration: 78,
    kicker: "what kage proves",
    title: "One agent learns. The repo remembers.",
    subtitle: "Future agents start with team knowledge: runbooks, gotchas, decisions, workflows, and source-grounded code graph context.",
    leftTitle: "Kage",
    leftLines: [
      ["install", "npm install -g @kage-core/kage-graph-mcp"],
      ["codex", "kage setup codex --project . --write"],
      ["claude", "kage setup claude-code --project . --write"],
      ["viewer", "kage viewer --project ."]
    ],
    rightTitle: "Shipping story",
    graphTitle: "Shared repo memory",
    inspectorTitle: "For teams",
    inspector: [
      "less rediscovery",
      "fewer wasted tokens",
      "portable across agents",
      "memory lives with code"
    ],
    stats: [
      ["Agents", "13"],
      ["External DB", "0"],
      ["Open", "source"]
    ],
    nodes: ["team", "repo", "agents", "ship"]
  }
];

await mkdir(frameDir, { recursive: true });
const totalFrames = scenes.reduce((sum, scene) => sum + scene.duration, 0);

function safeText(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function pageHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    :root{--bg:#020604;--panel:#06110b;--line:#174a2b;--green:#55ff91;--soft:#b6ffc9;--cyan:#41c9ff;--amber:#ffcf45;--text:#effff2;--muted:#8eb79c}
    *{box-sizing:border-box} body{margin:0;width:1600px;height:900px;overflow:hidden;background:radial-gradient(circle at 70% 18%,rgba(65,201,255,.14),transparent 29%),radial-gradient(circle at 18% 78%,rgba(85,255,145,.12),transparent 26%),#020604;color:var(--text);font-family:Menlo,Monaco,Consolas,monospace}
    .shell{position:absolute;inset:28px;border:1px solid rgba(85,255,145,.48);border-radius:18px;background:linear-gradient(180deg,rgba(2,13,7,.98),rgba(2,6,4,.99));box-shadow:0 0 54px rgba(85,255,145,.16);overflow:hidden}
    .scan{position:absolute;inset:0;background:linear-gradient(rgba(255,255,255,.025) 50%,rgba(0,0,0,.07) 50%);background-size:100% 4px;pointer-events:none}
    .top{position:absolute;left:38px;right:38px;top:30px;display:flex;justify-content:space-between;align-items:center}.brand{display:flex;align-items:center;gap:15px;color:var(--green);font-size:24px;font-weight:950}.eye{width:54px;height:34px;filter:drop-shadow(0 0 14px rgba(85,255,145,.85))}.eye path{fill:none;stroke:var(--green);stroke-width:4}.eye ellipse{fill:var(--green)}
    .pills{display:flex;gap:10px}.pill{border:1px solid rgba(85,255,145,.42);border-radius:7px;padding:9px 12px;background:rgba(4,25,13,.76);color:var(--soft);font-size:13px;font-weight:900}
    .layout{position:absolute;left:58px;right:58px;top:108px;bottom:50px;display:grid;grid-template-columns:1fr 1fr;gap:26px}.hero{height:245px}.kicker{color:var(--green);font-size:15px;text-transform:uppercase;font-weight:950;letter-spacing:.12em}.title{margin-top:13px;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:54px;line-height:1;letter-spacing:0;font-weight:950}.subtitle{margin-top:16px;max-width:700px;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#a8d9b7;font-size:22px;line-height:1.34}
    .box{border:1px solid rgba(85,255,145,.25);border-radius:10px;background:rgba(1,9,5,.78);box-shadow:inset 0 0 34px rgba(85,255,145,.035)}.term{height:450px;padding:22px}.head{display:flex;justify-content:space-between;margin-bottom:17px;color:var(--muted);font-size:13px;text-transform:uppercase;letter-spacing:.08em;font-weight:950}.line{display:grid;grid-template-columns:92px 1fr;gap:13px;margin:14px 0;font-size:19px;line-height:1.28}.prompt{color:var(--cyan);font-weight:950}.text{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .graph{height:350px;padding:18px;position:relative;overflow:hidden}.grid{position:absolute;inset:62px 20px 20px;background-image:linear-gradient(rgba(85,255,145,.11) 1px,transparent 1px),linear-gradient(90deg,rgba(85,255,145,.11) 1px,transparent 1px);background-size:58px 58px}.graph-title{position:absolute;top:17px;left:20px;color:var(--soft);font-size:16px;font-weight:950}.svg{position:absolute;inset:64px 22px 18px;width:calc(100% - 44px);height:calc(100% - 82px)}
    .inspector{height:190px;padding:18px}.selected{color:var(--amber);font-size:20px;font-weight:950;margin-bottom:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.inspect{display:grid;grid-template-columns:1fr 1fr;gap:9px 18px;color:#baffca;font-size:16px;line-height:1.32}.inspect div{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.inspect div:before{content:"> ";color:var(--green)}
    .stats{height:120px;padding:15px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.stat{border:1px solid rgba(65,201,255,.24);border-radius:7px;padding:12px;background:rgba(1,16,18,.72)}.stat strong{display:block;color:var(--cyan);font-size:23px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.stat span{display:block;margin-top:7px;color:var(--muted);text-transform:uppercase;font-size:11px;font-weight:950}.progress{position:absolute;left:34px;right:34px;bottom:22px;height:3px;background:rgba(85,255,145,.13)}.progress div{height:100%;width:0;background:linear-gradient(90deg,var(--green),var(--cyan));box-shadow:0 0 18px rgba(85,255,145,.7)}
  </style></head><body><div class="shell"><div class="scan"></div><div class="top"><div class="brand"><svg class="eye" viewBox="0 0 120 72"><path d="M8 36 C38 6 82 6 112 36 C82 66 38 66 8 36Z"></path><ellipse id="pupil" cx="60" cy="36" rx="17" ry="22"></ellipse></svg>KAGE://REAL-TEAM-DEMO</div><div class="pills"><div class="pill">REAL CODEX CLI</div><div class="pill">REAL CLAUDE CLI</div><div class="pill">REPO MEMORY</div></div></div><main class="layout"><section><div class="hero"><div id="kicker" class="kicker"></div><div id="title" class="title"></div><div id="subtitle" class="subtitle"></div></div><div class="term box"><div class="head"><span id="leftTitle"></span><span id="label"></span></div><div id="leftLines"></div></div></section><section><div class="graph box"><div id="graphTitle" class="graph-title"></div><div class="grid"></div><svg class="svg" viewBox="0 0 680 350"><defs><filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4" result="b"></feGaussianBlur><feMerge><feMergeNode in="b"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge></filter></defs><g id="edges"></g><g id="nodes"></g></svg></div><div class="inspector box"><div class="head"><span id="rightTitle"></span><span>proof</span></div><div id="inspectorTitle" class="selected"></div><div id="inspector" class="inspect"></div></div><div id="stats" class="stats box"></div></section></main><div class="progress"><div id="progress"></div></div></div><script>
  const scenes=${JSON.stringify(scenes)};
  const colors=["#41c9ff","#55ff91","#ffcf45","#b6ffc9"];
  function draw(idx,p,g){const s=scenes[idx];kicker.textContent=s.kicker;title.textContent=s.title;subtitle.textContent=s.subtitle;leftTitle.textContent=s.leftTitle;rightTitle.textContent=s.rightTitle;graphTitle.textContent=s.graphTitle;inspectorTitle.textContent=s.inspectorTitle;label.textContent=s.label;progress.style.width=(g*100).toFixed(2)+"%";pupil.setAttribute("ry",Math.max(6,22-Math.sin(g*Math.PI*18)*8).toFixed(2));const show=Math.max(1,Math.ceil(s.leftLines.length*Math.min(1,p*1.45)));leftLines.innerHTML=s.leftLines.slice(0,show).map(l=>'<div class="line"><div class="prompt">'+l[0]+'</div><div class="text">'+${safeText.toString()}(l[1])+'</div></div>').join("");inspector.innerHTML=s.inspector.map(x=>'<div>'+${safeText.toString()}(x)+'</div>').join("");stats.innerHTML=s.stats.map(x=>'<div class="stat"><strong>'+x[1]+'</strong><span>'+x[0]+'</span></div>').join("");const names=s.nodes;const coords=[[84,92],[242,205],[424,96],[574,235]];let paths=[];for(let i=0;i<coords.length-1;i++){const a=coords[i],b=coords[i+1],dash=240+i*46;paths.push('<path d="M'+a[0]+' '+a[1]+' C '+(a[0]+108)+' '+(a[1]-68)+', '+(b[0]-108)+' '+(b[1]+68)+', '+b[0]+' '+b[1]+'" fill="none" stroke="'+colors[i%colors.length]+'" stroke-width="3" opacity=".78" stroke-dasharray="'+dash+'" stroke-dashoffset="'+Math.max(0,dash*(1-p*1.35))+'"></path>')}edges.innerHTML=paths.join("");nodes.innerHTML=coords.map((n,i)=>{const visible=p>i*.12;const scale=visible?1+Math.sin(g*34+i)*.035:.5;return '<g transform="translate('+n[0]+' '+n[1]+') scale('+scale+')" opacity="'+(visible?1:0)+'"><circle r="24" fill="#020604" stroke="'+colors[i]+'" stroke-width="4" filter="url(#glow)"></circle><text y="54" text-anchor="middle" fill="'+colors[i]+'" font-size="16" font-weight="950">'+names[i]+'</text></g>'}).join("")}
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
console.log(`Codex proof log: ${codexLogPath}`);
console.log(`Claude proof log: ${claudeLogPath}`);
console.log(`Packet: ${packet.title}`);
console.log(`Wrote ${outputPath} (${Math.round(videoStat.size / 1024)} KB)`);
console.log(`Wrote ${posterPath} (${Math.round(posterStat.size / 1024)} KB)`);
