import { access, mkdir, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const toolsRoot = process.env.KAGE_VIDEO_TOOLS || "/tmp/kage-video-tools";
const puppeteerPath = `${toolsRoot}/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js`;
const ffmpegPath = `${toolsRoot}/node_modules/@ffmpeg-installer/darwin-arm64/ffmpeg`;
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const outputPath = join(projectRoot, "docs/assets/kage-yc-demo.mp4");
const posterPath = join(projectRoot, "docs/assets/kage-yc-demo-poster.png");
const frameDir = join("/tmp", `kage-yc-demo-frames-${Date.now()}`);

for (const requiredPath of [puppeteerPath, ffmpegPath, chromePath]) {
  try {
    await access(requiredPath);
  } catch {
    console.error(`Missing demo render dependency: ${requiredPath}`);
    console.error("Install with: npm --prefix /tmp/kage-video-tools install puppeteer-core @ffmpeg-installer/ffmpeg");
    process.exit(1);
  }
}

const { default: puppeteer } = await import(`file://${puppeteerPath}`);

await mkdir(frameDir, { recursive: true });

const scenes = [
  {
    duration: 72,
    label: "Problem",
    kicker: "before kage",
    title: "Every agent starts cold.",
    subtitle: "Same repo. Fresh session. No team memory.",
    terminal: [
      { prompt: "user", text: "How do I add this setup check?" },
      { prompt: "agent", text: "Let me inspect the repository first..." },
      { prompt: "agent", text: "Reading files... following imports... checking tests..." }
    ],
    graphTitle: "Context disappears",
    inspectorTitle: "Hidden repo knowledge",
    inspector: [
      "run commands",
      "decisions",
      "gotchas",
      "bug fixes",
      "workflows"
    ],
    stats: [
      ["Result", "rediscovery"],
      ["Tokens", "wasted"],
      ["Memory", "none"]
    ]
  },
  {
    duration: 84,
    label: "Recall",
    kicker: "codex calls kage_context",
    title: "Kage recalls repo memory first.",
    subtitle: "The agent gets source-grounded context before digging through files.",
    terminal: [
      { prompt: "tool", text: "kage_context(project, query)" },
      { prompt: "memory", text: "Decision: setup must verify active agent reachability" },
      { prompt: "memory", text: "Runbook: Claude Code MCP setup + SessionStart hook" },
      { prompt: "memory", text: "Gotcha: sub-agents do not receive SessionStart hooks" }
    ],
    graphTitle: "Repo memory",
    selected: "Decision memory",
    inspectorTitle: "Why this matters",
    inspector: [
      "status: approved",
      "scope: repo",
      "source: explicit capture",
      "paths: AGENTS.md, mcp/kernel.ts"
    ],
    stats: [
      ["Packets", "35"],
      ["Evidence", "100%"],
      ["Ready", "yes"]
    ]
  },
  {
    duration: 84,
    label: "Code graph",
    kicker: "source-derived context",
    title: "Then it queries the code graph.",
    subtitle: "Files, symbols, calls, tests, and routes are indexed separately from memory.",
    terminal: [
      { prompt: "tool", text: "kage_context(query includes code graph)" },
      { prompt: "code", text: "function setupAgent -> mcp/kernel.ts:4225" },
      { prompt: "code", text: "constant AGENTS_POLICY -> mcp/kernel.ts:787" },
      { prompt: "test", text: "test setup writes Codex config idempotently" }
    ],
    graphTitle: "Code graph",
    selected: "setupAgent",
    inspectorTitle: "Source facts",
    inspector: [
      "13 files",
      "1,937 symbols",
      "2,406 calls",
      "64 tests"
    ],
    stats: [
      ["Parser", "TS AST"],
      ["Routes", "12"],
      ["Tests", "64"]
    ]
  },
  {
    duration: 84,
    label: "Learn",
    kicker: "agent learns",
    title: "Useful discoveries become repo memory.",
    subtitle: "Repo-local memory is written directly as git-visible JSON. Org/global sharing stays review-gated.",
    terminal: [
      { prompt: "tool", text: "kage_capture(type='decision')" },
      { prompt: "write", text: ".agent_memory/packets/decision-*.json" },
      { prompt: "saved", text: "Codex demo should show recall, code graph, and activation proof" },
      { prompt: "policy", text: "Do not store raw transcripts or secrets." }
    ],
    graphTitle: "New memory packet",
    selected: "Decision packet",
    inspectorTitle: "Packet schema",
    inspector: [
      "type: decision",
      "paths: AGENTS.md, mcp/kernel.ts",
      "freshness: verified",
      "quality: source-backed"
    ],
    stats: [
      ["Review", "repo via git"],
      ["Org/global", "human gated"],
      ["DB", "0 external"]
    ]
  },
  {
    duration: 84,
    label: "Refresh",
    kicker: "repo graph updates",
    title: "Kage refreshes the graph.",
    subtitle: "Indexes, memory graph, code graph, metrics, and stale checks update from local files.",
    terminal: [
      { prompt: "tool", text: "kage_refresh(project)" },
      { prompt: "ok", text: "validation: ok" },
      { prompt: "graph", text: "158 memory entities, 391 evidence-backed edges" },
      { prompt: "metric", text: "readiness score: 100" }
    ],
    graphTitle: "Evidence graph",
    selected: "affects_path",
    inspectorTitle: "Trust boundary",
    inspector: [
      "memory -> source path",
      "memory -> type",
      "memory -> tag",
      "memory -> evidence"
    ],
    stats: [
      ["Entities", "158"],
      ["Edges", "391"],
      ["Stale", "0"]
    ]
  },
  {
    duration: 84,
    label: "Viewer",
    kicker: "inspectable memory",
    title: "The viewer shows the receipts.",
    subtitle: "Click through memory, code paths, tests, decisions, runbooks, and evidence.",
    terminal: [
      { prompt: "viewer", text: "Decision memory selected" },
      { prompt: "edge", text: "applies_to -> mcp/kernel.ts" },
      { prompt: "edge", text: "covered_by -> mcp/kernel.test.ts" },
      { prompt: "edge", text: "tagged -> ambient-memory" }
    ],
    graphTitle: "Memory + code",
    selected: "Viewer graph",
    inspectorTitle: "Selected node",
    inspector: [
      "title: activation proof",
      "type: decision",
      "scope: repo",
      "evidence: source refs"
    ],
    stats: [
      ["Black box", "no"],
      ["Source refs", "yes"],
      ["Portable", "MCP"]
    ]
  },
  {
    duration: 84,
    label: "Handoff",
    kicker: "team memory",
    title: "The next agent starts with context.",
    subtitle: "Codex, Claude Code, Cursor, and MCP agents read the same repo memory.",
    terminal: [
      { prompt: "teammate", text: "How does this setup flow work?" },
      { prompt: "agent", text: "I found the repo memory and code graph context." },
      { prompt: "agent", text: "Here is the decision, affected files, and test surface." }
    ],
    graphTitle: "Shared repo memory",
    selected: "Future agent",
    inspectorTitle: "Kage",
    inspector: [
      "local-first",
      "git-native",
      "MCP ready",
      "no external DB"
    ],
    stats: [
      ["Agents", "13"],
      ["Recall", "ready"],
      ["Website", "kage-core"]
    ]
  }
];

const totalFrames = scenes.reduce((sum, scene) => sum + scene.duration, 0);

function html() {
  return `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      :root {
        color-scheme: dark;
        --bg: #020604;
        --panel: #06110b;
        --line: #163c26;
        --green: #55ff91;
        --green-soft: #9fffc1;
        --cyan: #41c9ff;
        --amber: #ffcf45;
        --text: #e7ffed;
        --muted: #8fb8a0;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        width: 1600px;
        height: 900px;
        overflow: hidden;
        background:
          radial-gradient(circle at 78% 20%, rgba(65, 201, 255, .18), transparent 28%),
          radial-gradient(circle at 18% 84%, rgba(85, 255, 145, .14), transparent 32%),
          #020604;
        color: var(--text);
        font-family: Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      }
      .shell {
        position: absolute;
        inset: 28px;
        border: 1px solid rgba(85, 255, 145, .46);
        border-radius: 18px;
        background: linear-gradient(180deg, rgba(2, 13, 7, .96), rgba(2, 6, 4, .98));
        box-shadow: 0 0 50px rgba(85, 255, 145, .16), inset 0 0 90px rgba(85, 255, 145, .035);
        overflow: hidden;
      }
      .scanline {
        position: absolute;
        inset: 0;
        background:
          linear-gradient(rgba(255,255,255,.025) 50%, rgba(0,0,0,.08) 50%),
          linear-gradient(90deg, rgba(255,0,0,.012), rgba(0,255,0,.01), rgba(0,0,255,.012));
        background-size: 100% 4px, 6px 100%;
        pointer-events: none;
        mix-blend-mode: screen;
      }
      .topbar {
        position: absolute;
        left: 34px;
        right: 34px;
        top: 28px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 14px;
        color: var(--green);
        font-size: 22px;
        font-weight: 900;
        letter-spacing: .04em;
      }
      .eye {
        width: 54px;
        height: 34px;
        filter: drop-shadow(0 0 14px rgba(85, 255, 145, .85));
      }
      .eye path { fill: none; stroke: var(--green); stroke-width: 4; }
      .eye ellipse { fill: var(--green); transform-origin: center; }
      .status {
        display: flex;
        gap: 10px;
      }
      .pill {
        border: 1px solid rgba(85, 255, 145, .42);
        border-radius: 7px;
        padding: 9px 12px;
        color: var(--green-soft);
        background: rgba(5, 24, 13, .74);
        font-size: 13px;
        font-weight: 800;
      }
      .stage {
        position: absolute;
        left: 58px;
        right: 58px;
        top: 104px;
        bottom: 50px;
        display: grid;
        grid-template-columns: 1.03fr .97fr;
        gap: 26px;
      }
      .left, .right {
        min-width: 0;
        display: grid;
        gap: 20px;
      }
      .hero {
        min-height: 194px;
      }
      .kicker {
        color: var(--green);
        font-size: 15px;
        text-transform: uppercase;
        font-weight: 900;
        letter-spacing: .12em;
      }
      .title {
        margin-top: 13px;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 57px;
        line-height: .98;
        letter-spacing: 0;
        font-weight: 950;
        color: #f1fff4;
      }
      .subtitle {
        margin-top: 18px;
        max-width: 700px;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #a8d9b7;
        font-size: 22px;
        line-height: 1.34;
      }
      .terminal, .inspector, .graph, .stats {
        border: 1px solid rgba(85, 255, 145, .24);
        border-radius: 10px;
        background: rgba(1, 9, 5, .76);
        box-shadow: inset 0 0 34px rgba(85, 255, 145, .035);
      }
      .terminal {
        height: 390px;
        padding: 22px;
      }
      .terminal-head, .panel-head {
        display: flex;
        justify-content: space-between;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: .08em;
        font-weight: 900;
        font-size: 13px;
        margin-bottom: 16px;
      }
      .terminal-line {
        display: grid;
        grid-template-columns: 94px 1fr;
        gap: 14px;
        margin: 14px 0;
        font-size: 20px;
        line-height: 1.28;
      }
      .prompt {
        color: var(--cyan);
        font-weight: 900;
      }
      .line-text {
        color: var(--text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .graph {
        height: 350px;
        padding: 18px;
        position: relative;
        overflow: hidden;
      }
      .grid {
        position: absolute;
        inset: 62px 20px 20px 20px;
        background-image:
          linear-gradient(rgba(85, 255, 145, .11) 1px, transparent 1px),
          linear-gradient(90deg, rgba(85, 255, 145, .11) 1px, transparent 1px);
        background-size: 58px 58px;
        opacity: .9;
      }
      svg.graph-svg {
        position: absolute;
        inset: 64px 22px 18px 22px;
        width: calc(100% - 44px);
        height: calc(100% - 82px);
      }
      .graph-label {
        position: absolute;
        top: 17px;
        left: 20px;
        color: var(--green-soft);
        font-weight: 900;
        font-size: 16px;
      }
      .inspector {
        height: 190px;
        padding: 18px;
      }
      .selected {
        color: var(--amber);
        font-size: 19px;
        font-weight: 900;
        margin-bottom: 10px;
      }
      .inspect-list {
        display: grid;
        gap: 9px;
        color: #baf7c8;
        font-size: 17px;
      }
      .inspect-list div::before {
        content: "> ";
        color: var(--green);
      }
      .stats {
        height: 120px;
        padding: 15px;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }
      .stat {
        border: 1px solid rgba(65, 201, 255, .24);
        border-radius: 7px;
        padding: 12px;
        background: rgba(1, 16, 18, .72);
      }
      .stat strong {
        display: block;
        color: var(--cyan);
        font-size: 23px;
      }
      .stat span {
        display: block;
        margin-top: 7px;
        color: var(--muted);
        text-transform: uppercase;
        font-size: 11px;
        font-weight: 900;
      }
      .progress {
        position: absolute;
        left: 34px;
        right: 34px;
        bottom: 22px;
        height: 3px;
        background: rgba(85, 255, 145, .13);
      }
      .progress > div {
        height: 100%;
        background: linear-gradient(90deg, var(--green), var(--cyan));
        width: 0%;
        box-shadow: 0 0 18px rgba(85, 255, 145, .7);
      }
      .fade {
        opacity: 1;
        transform: translateY(0);
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <div class="scanline"></div>
      <div class="topbar">
        <div class="brand">
          <svg class="eye" viewBox="0 0 120 72" aria-hidden="true">
            <path d="M8 36 C38 6 82 6 112 36 C82 66 38 66 8 36Z"></path>
            <ellipse id="eyePupil" cx="60" cy="36" rx="17" ry="22"></ellipse>
          </svg>
          KAGE://YC-DEMO
        </div>
        <div class="status">
          <div class="pill">MCP READY</div>
          <div class="pill">LOCAL FIRST</div>
          <div class="pill">NO EXTERNAL DB</div>
        </div>
      </div>
      <main class="stage">
        <section class="left">
          <div class="hero">
            <div class="kicker" id="kicker"></div>
            <div class="title" id="title"></div>
            <div class="subtitle" id="subtitle"></div>
          </div>
          <div class="terminal">
            <div class="terminal-head"><span>Codex session</span><span id="sceneLabel"></span></div>
            <div id="terminalLines"></div>
          </div>
        </section>
        <section class="right">
          <div class="graph">
            <div class="graph-label" id="graphTitle"></div>
            <div class="grid"></div>
            <svg class="graph-svg" viewBox="0 0 680 350">
              <defs>
                <filter id="nodeGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="4" result="blur"></feGaussianBlur>
                  <feMerge><feMergeNode in="blur"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge>
                </filter>
              </defs>
              <g id="edges"></g>
              <g id="nodes"></g>
            </svg>
          </div>
          <div class="inspector">
            <div class="panel-head"><span>Inspector</span><span id="selected"></span></div>
            <div class="selected" id="inspectorTitle"></div>
            <div class="inspect-list" id="inspectorList"></div>
          </div>
          <div class="stats" id="stats"></div>
        </section>
      </main>
      <div class="progress"><div id="progress"></div></div>
    </div>
    <script>
      const scenes = ${JSON.stringify(scenes)};
      const nodeSets = [
        [{x:90,y:80,t:"agent",c:"#41c9ff"},{x:250,y:138,t:"files",c:"#ffcf45"},{x:440,y:90,t:"?",c:"#8fb8a0"},{x:560,y:220,t:"lost",c:"#8fb8a0"}],
        [{x:80,y:82,t:"Codex",c:"#41c9ff"},{x:235,y:82,t:"memory",c:"#55ff91"},{x:415,y:142,t:"decision",c:"#ffcf45"},{x:540,y:230,t:"paths",c:"#55ff91"}],
        [{x:72,y:246,t:"query",c:"#41c9ff"},{x:240,y:136,t:"setupAgent",c:"#55ff91"},{x:416,y:84,t:"kernel.ts",c:"#ffcf45"},{x:546,y:214,t:"tests",c:"#41c9ff"}],
        [{x:96,y:110,t:"learning",c:"#41c9ff"},{x:282,y:128,t:"packet",c:"#55ff91"},{x:462,y:84,t:"paths",c:"#ffcf45"},{x:554,y:238,t:"git",c:"#55ff91"}],
        [{x:84,y:96,t:"packet",c:"#55ff91"},{x:230,y:206,t:"entity",c:"#41c9ff"},{x:390,y:106,t:"edge",c:"#ffcf45"},{x:552,y:210,t:"metrics",c:"#55ff91"}],
        [{x:86,y:88,t:"decision",c:"#55ff91"},{x:250,y:150,t:"kernel.ts",c:"#ffcf45"},{x:438,y:98,t:"test.ts",c:"#41c9ff"},{x:560,y:232,t:"evidence",c:"#55ff91"}],
        [{x:82,y:94,t:"Codex",c:"#41c9ff"},{x:238,y:94,t:"repo",c:"#55ff91"},{x:410,y:154,t:"Claude",c:"#ffcf45"},{x:552,y:246,t:"Cursor",c:"#41c9ff"}]
      ];
      function setScene(index, localProgress, globalProgress) {
        const scene = scenes[index];
        document.getElementById("kicker").textContent = scene.kicker;
        document.getElementById("title").textContent = scene.title;
        document.getElementById("subtitle").textContent = scene.subtitle;
        document.getElementById("sceneLabel").textContent = scene.label;
        document.getElementById("graphTitle").textContent = scene.graphTitle;
        document.getElementById("selected").textContent = scene.selected || "";
        document.getElementById("inspectorTitle").textContent = scene.inspectorTitle;
        document.getElementById("progress").style.width = (globalProgress * 100).toFixed(2) + "%";
        document.getElementById("eyePupil").setAttribute("ry", Math.max(5, 22 - Math.sin(globalProgress * Math.PI * 14) * 9).toFixed(2));

        const visibleLines = Math.max(1, Math.ceil(scene.terminal.length * Math.min(1, localProgress * 1.25)));
        document.getElementById("terminalLines").innerHTML = scene.terminal.slice(0, visibleLines).map((line) =>
          '<div class="terminal-line"><div class="prompt">' + line.prompt + '</div><div class="line-text">' + line.text + '</div></div>'
        ).join("");
        document.getElementById("inspectorList").innerHTML = scene.inspector.map((item) => '<div>' + item + '</div>').join("");
        document.getElementById("stats").innerHTML = scene.stats.map((stat) =>
          '<div class="stat"><strong>' + stat[1] + '</strong><span>' + stat[0] + '</span></div>'
        ).join("");

        const nodes = nodeSets[index];
        const edges = [];
        for (let i = 0; i < nodes.length - 1; i += 1) edges.push([nodes[i], nodes[i + 1]]);
        document.getElementById("edges").innerHTML = edges.map(([a, b], edgeIndex) => {
          const dash = 220 + edgeIndex * 40;
          return '<path d="M' + a.x + ' ' + a.y + ' C ' + (a.x + 90) + ' ' + (a.y - 60) + ', ' + (b.x - 90) + ' ' + (b.y + 60) + ', ' + b.x + ' ' + b.y + '" fill="none" stroke="' + (edgeIndex % 2 ? '#41c9ff' : '#55ff91') + '" stroke-width="3" opacity=".72" stroke-dasharray="' + dash + '" stroke-dashoffset="' + Math.max(0, dash * (1 - localProgress * 1.3)) + '"></path>';
        }).join("");
        document.getElementById("nodes").innerHTML = nodes.map((n, nodeIndex) => {
          const show = localProgress > nodeIndex * 0.12;
          const scale = show ? 1 + Math.sin((globalProgress * 32) + nodeIndex) * .035 : .4;
          const opacity = show ? 1 : 0;
          return '<g transform="translate(' + n.x + ' ' + n.y + ') scale(' + scale + ')" opacity="' + opacity + '">' +
            '<circle r="24" fill="#020604" stroke="' + n.c + '" stroke-width="4" filter="url(#nodeGlow)"></circle>' +
            '<text y="54" text-anchor="middle" fill="' + n.c + '" font-size="17" font-weight="900">' + n.t + '</text>' +
          '</g>';
        }).join("");
      }
      window.setScene = setScene;
    </script>
  </body>
  </html>`;
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
  await page.setContent(html(), { waitUntil: "load" });

  let elapsed = 0;
  for (let sceneIndex = 0; sceneIndex < scenes.length; sceneIndex += 1) {
    const scene = scenes[sceneIndex];
    for (let sceneFrame = 0; sceneFrame < scene.duration; sceneFrame += 1) {
      const localProgress = scene.duration === 1 ? 1 : sceneFrame / (scene.duration - 1);
      const globalProgress = elapsed / (totalFrames - 1);
      await page.evaluate(({ sceneIndex, localProgress, globalProgress }) => {
        window.setScene(sceneIndex, localProgress, globalProgress);
      }, { sceneIndex, localProgress, globalProgress });
      const name = `frame-${String(frame).padStart(4, "0")}.png`;
      await page.screenshot({ path: join(frameDir, name), type: "png" });
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

if (ffmpeg.status !== 0) {
  process.exit(ffmpeg.status || 1);
}

const videoStat = await stat(outputPath);
const posterStat = await stat(posterPath);
console.log(`Wrote ${outputPath} (${Math.round(videoStat.size / 1024)} KB)`);
console.log(`Wrote ${posterPath} (${Math.round(posterStat.size / 1024)} KB)`);
