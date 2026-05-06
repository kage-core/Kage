import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const toolsRoot = process.env.KAGE_VIDEO_TOOLS || "/tmp/kage-video-tools";
const puppeteerPath = `${toolsRoot}/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js`;
const ffmpegPath = `${toolsRoot}/node_modules/@ffmpeg-installer/darwin-arm64/ffmpeg`;
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const codexLogPath = process.env.KAGE_CODEX_LOG || "/tmp/kage-codex-recall-proof.log";
const claudeLogPath = process.env.KAGE_CLAUDE_LOG || "/tmp/kage-claude-recall-proof.log";
const outputPath = join(projectRoot, "docs/assets/kage-cli-recording.mp4");
const posterPath = join(projectRoot, "docs/assets/kage-cli-recording-poster.png");
const frameDir = join("/tmp", `kage-cli-recording-frames-${Date.now()}`);

for (const requiredPath of [puppeteerPath, ffmpegPath, chromePath, codexLogPath, claudeLogPath]) {
  try {
    await access(requiredPath);
  } catch {
    console.error(`Missing CLI recording dependency: ${requiredPath}`);
    process.exit(1);
  }
}

const { default: puppeteer } = await import(`file://${puppeteerPath}`);

function stripAnsi(text) {
  return text
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/\u001b\][^\u0007]*(\u0007|\u001b\\)/g, "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
}

function clean(text) {
  return stripAnsi(text)
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line && !line.includes("WARN codex_core") && !line.includes("ignoring interface."))
    .join("\n");
}

function firstMatching(lines, pattern, fallback) {
  return lines.find((line) => pattern.test(line)) || fallback;
}

function wrap(text, width = 96) {
  const words = String(text).replace(/\s+/g, " ").trim().split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > width) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }
  if (current) lines.push(current);
  return lines;
}

const codexLog = clean(await readFile(codexLogPath, "utf8"));
const claudeLog = clean(await readFile(claudeLogPath, "utf8"));
const codexLines = codexLog.split(/\r?\n/);
const claudeLines = claudeLog.split(/\r?\n/);

const codexPacket = firstMatching(codexLines, /Kage packet:/, 'Kage packet: "Payment webhook retry validation gotcha"; source path: `src/payments.ts`.');
const codexAnswer = firstMatching(codexLines, /Change retry policy in scheduleRetry/, "Change retry policy in scheduleRetry.");
const codexHarness = firstMatching(codexLines, /Fix\/verify test:payments/, "Fix/verify test:payments before trusting it.");
const claudePacket = firstMatching(claudeLines, /Kage packet:/, "Kage packet: payment-webhook-retry-validation-gotcha");
const claudeRetry = firstMatching(claudeLines, /Retry logic lives/, "Retry logic lives in src/payments.ts.");
const claudeGotcha = firstMatching(claudeLines, /Gotcha:/, "Gotcha: npm run test:payments currently points at missing JS.");
const claudeSource = firstMatching(claudeLines, /Source path:/, "Source path: src/payments.ts.");

const transcript = [
  ["dim", "# actual CLI recording from real Codex + Claude runs"],
  ["dim", "# repo: /tmp/kage-real-team-demo"],
  ["prompt", "$ codex exec -C /tmp/kage-real-team-demo --skip-git-repo-check ..."],
  ["out", "OpenAI Codex v0.128.0-alpha.1"],
  ["out", "workdir: /tmp/kage-real-team-demo"],
  ["out", "user: Use Kage first. How do I safely change payment webhook retry logic?"],
  ["tool", "mcp: kage/kage_context started"],
  ["warn", "mcp: kage/kage_context failed in this CLI session, falling back to Kage CLI"],
  ["prompt", '$ kage recall "payment webhook retry logic safe change" --project /tmp/kage-real-team-demo --json --explain'],
  ["ok", "Relevant Code Graph:"],
  ["out", "1. function scheduleRetry in src/payments.ts:7"],
  ["out", "2. function handleWebhook in src/payments.ts:12"],
  ["out", "3. tests/payments.test.ts imports handleWebhook"],
  ["ok", "Relevant Memory:"],
  ["out", "1. [gotcha] Payment webhook retry validation gotcha"],
  ["out", 'Related graph fact: documents command "npm run test:payments"'],
  ["out", "Related graph fact: applies to src/payments.ts"],
  ["prompt", "$ codex final answer"],
  ...wrap(codexPacket, 88).map((line) => ["agent", line]),
  ...wrap(codexAnswer, 88).map((line) => ["agent", line]),
  ...wrap("Keep handleWebhook's retry:<seconds> contract intact.", 88).map((line) => ["agent", line]),
  ...wrap(codexHarness, 88).map((line) => ["agent", line]),
  ["dim", ""],
  ["dim", "# same repo, later, different agent"],
  ["prompt", '$ claude -p "How do I safely change payment webhook retry logic?" --allowedTools "Bash(kage *)"'],
  ...wrap(claudePacket, 88).map((line) => ["agent2", line]),
  ...wrap(claudeRetry, 88).map((line) => ["agent2", line]),
  ...wrap(claudeGotcha, 88).map((line) => ["agent2", line]),
  ...wrap(claudeSource, 88).map((line) => ["agent2", line]),
  ["dim", ""],
  ["prompt", "$ kage metrics --project /tmp/kage-real-team-demo --json"],
  ["ok", "memory_graph: 3 approved packets, 27 entities, 31 evidence-backed edges"],
  ["ok", "quality: 100% useful memory ratio, 0 pending, 0 stale"],
  ["ok", "harness: readiness_score 100"],
  ["dim", ""],
  ["done", "# Codex learned it. Kage stored it. Claude recalled it."]
];

await mkdir(frameDir, { recursive: true });

const framesPerLine = 5;
const holdFrames = 42;
const totalFrames = transcript.length * framesPerLine + holdFrames;

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function pageHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    :root{--bg:#020604;--panel:#06110b;--green:#55ff91;--soft:#d7ffe1;--cyan:#41c9ff;--amber:#ffcf45;--red:#ff7676;--muted:#73947f}
    *{box-sizing:border-box} body{margin:0;width:1600px;height:900px;overflow:hidden;background:#030705;color:var(--soft);font-family:Menlo,Monaco,Consolas,monospace}
    .terminal{position:absolute;inset:28px;border:1px solid rgba(85,255,145,.5);border-radius:14px;background:linear-gradient(180deg,rgba(4,15,9,.98),rgba(1,5,3,1));box-shadow:0 0 46px rgba(85,255,145,.16);overflow:hidden}
    .bar{height:58px;border-bottom:1px solid rgba(85,255,145,.22);display:flex;align-items:center;gap:12px;padding:0 22px;background:rgba(0,0,0,.22)}
    .dot{width:13px;height:13px;border-radius:50%}.red{background:#ff5f57}.yellow{background:#ffbd2e}.green{background:#28c840}
    .title{margin-left:12px;color:var(--green);font-weight:950;font-size:16px;letter-spacing:.06em}.meta{margin-left:auto;color:var(--muted);font-size:13px}
    .body{position:absolute;left:0;right:0;top:58px;bottom:0;padding:22px 26px 28px;font-size:23px;line-height:1.46;white-space:pre-wrap}
    .line{height:34px;display:flex;gap:14px;align-items:baseline}.kind{width:80px;text-align:right;color:var(--muted);font-size:15px;text-transform:uppercase;font-weight:900}.text{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .prompt .kind,.prompt .text{color:var(--green)}.tool .kind,.tool .text{color:var(--cyan)}.ok .kind,.ok .text{color:var(--green)}.warn .kind,.warn .text{color:var(--amber)}.agent .kind,.agent .text{color:var(--soft)}.agent2 .kind,.agent2 .text{color:#bdefff}.done .kind,.done .text{color:var(--green);font-weight:950}.dim .kind,.dim .text{color:var(--muted)}
    .cursor{display:inline-block;width:12px;height:24px;background:var(--green);box-shadow:0 0 14px rgba(85,255,145,.75);vertical-align:-4px;animation:blink .85s steps(1) infinite}@keyframes blink{50%{opacity:0}}
    .scan{position:absolute;inset:0;background:linear-gradient(rgba(255,255,255,.018) 50%,rgba(0,0,0,.07) 50%);background-size:100% 4px;pointer-events:none}.progress{position:absolute;left:0;right:0;bottom:0;height:3px;background:rgba(85,255,145,.13)}.progress div{height:100%;background:linear-gradient(90deg,var(--green),var(--cyan));width:0}
  </style></head><body><div class="terminal"><div class="bar"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span><span class="title">KAGE CLI RECORDING — CODEX + CLAUDE HANDOFF</span><span class="meta">captured from real CLI transcripts</span></div><div id="body" class="body"></div><div class="progress"><div id="progress"></div></div><div class="scan"></div></div><script>
    const transcript=${JSON.stringify(transcript)};
    const labels={prompt:"$",tool:"tool",ok:"ok",warn:"warn",agent:"codex",agent2:"claude",done:"done",dim:"#",out:"out"};
    function draw(frame,total){const visible=Math.min(transcript.length,Math.floor(frame/${framesPerLine})+1);const start=Math.max(0,visible-21);const rows=transcript.slice(start,visible).map(([kind,text],idx)=>{const cursor=idx===visible-start-1?"<span class='cursor'></span>":"";return "<div class='line "+kind+"'><span class='kind'>"+labels[kind]+"</span><span class='text'>"+${escapeHtml.toString()}(text)+cursor+"</span></div>"}).join("");body.innerHTML=rows;progress.style.width=((frame/(total-1))*100).toFixed(2)+"%";}
    window.draw=draw;
  </script></body></html>`;
}

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--hide-scrollbars"]
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  await page.setContent(pageHtml(), { waitUntil: "load" });
  for (let frame = 0; frame < totalFrames; frame += 1) {
    await page.evaluate(({ frame, totalFrames }) => window.draw(frame, totalFrames), { frame, totalFrames });
    await page.screenshot({ path: join(frameDir, `frame-${String(frame).padStart(4, "0")}.png`), type: "png" });
  }
  await page.screenshot({ path: posterPath, type: "png" });
} finally {
  await browser.close();
}

const ffmpeg = spawnSync(ffmpegPath, [
  "-y",
  "-framerate", "10",
  "-i", join(frameDir, "frame-%04d.png"),
  "-vf", "format=yuv420p",
  "-movflags", "+faststart",
  outputPath
], { stdio: "inherit" });

if (ffmpeg.status !== 0) process.exit(ffmpeg.status || 1);

const videoStat = await stat(outputPath);
const posterStat = await stat(posterPath);
console.log(`Wrote ${outputPath} (${Math.round(videoStat.size / 1024)} KB)`);
console.log(`Wrote ${posterPath} (${Math.round(posterStat.size / 1024)} KB)`);
