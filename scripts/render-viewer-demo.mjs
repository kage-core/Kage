import { access, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const toolsRoot = process.env.KAGE_VIDEO_TOOLS || "/tmp/kage-video-tools";
const puppeteerPath = `${toolsRoot}/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js`;
const ffmpegPath = `${toolsRoot}/node_modules/@ffmpeg-installer/darwin-arm64/ffmpeg`;
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const outputPath = join(projectRoot, "docs/assets/kage-viewer-demo.mp4");
const posterPath = join(projectRoot, "docs/assets/kage-viewer-demo-poster.png");
const frameDir = join(projectRoot, "docs/assets/viewer-demo-frames-wide");
const url = process.env.KAGE_VIEWER_URL || "https://kage-core.github.io/Kage/viewer/";

for (const requiredPath of [puppeteerPath, ffmpegPath, chromePath]) {
  try {
    await access(requiredPath);
  } catch {
    console.error(`Missing demo render dependency: ${requiredPath}`);
    console.error("Install with: npm --prefix /tmp/kage-video-tools install puppeteer-core sharp @ffmpeg-installer/ffmpeg");
    process.exit(1);
  }
}

const { default: puppeteer } = await import(`file://${puppeteerPath}`);

await rm(frameDir, { recursive: true, force: true });
await mkdir(frameDir, { recursive: true });

let frame = 0;

async function capture(page, repeats = 8) {
  const buffer = await page.screenshot({ type: "png" });
  for (let i = 0; i < repeats; i += 1) {
    const name = `frame-${String(frame).padStart(4, "0")}.png`;
    await writeFile(join(frameDir, name), buffer);
    frame += 1;
  }
}

async function showCaption(page, kicker, title, body = "") {
  await page.evaluate(({ kicker, title, body }) => {
    window.kageDemoSetCaption(kicker, title, body);
  }, { kicker, title, body });
}

async function setCursor(page, x, y) {
  await page.evaluate(({ x, y }) => {
    window.kageDemoSetCursor(x, y);
  }, { x, y });
}

async function highlight(page, selector) {
  await page.evaluate((selector) => {
    window.kageDemoHighlight(selector);
  }, selector);
}

async function updateStateCard(page, headline) {
  await page.evaluate((headline) => {
    window.kageDemoUpdateState(headline);
  }, headline);
}

async function captureStep(page, action, repeats = 10, delay = 650) {
  if (action) await action();
  await new Promise((resolve) => setTimeout(resolve, delay));
  await updateStateCard(page);
  await capture(page, repeats);
}

async function showGraph(page) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await new Promise((resolve) => setTimeout(resolve, 450));
  await updateStateCard(page);
}

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--hide-scrollbars"]
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForFunction(() => {
    const summary = document.querySelector("#graphSummary")?.textContent || "";
    return summary.includes("loaded:");
  }, { timeout: 30000 });
  await page.addStyleTag({
    content: `
      .kage-demo-caption {
        position: fixed;
        left: 30px;
        bottom: 30px;
        width: min(560px, calc(100vw - 60px));
        z-index: 9998;
        border: 1px solid rgba(65, 255, 143, 0.48);
        border-radius: 8px;
        background: linear-gradient(180deg, rgba(2, 8, 5, .94), rgba(5, 18, 11, .90));
        box-shadow: 0 0 34px rgba(65, 255, 143, .18), 0 24px 80px rgba(0, 0, 0, .55);
        padding: 18px 20px 17px;
        color: #d7f9df;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        pointer-events: none;
      }
      .kage-demo-caption .kicker {
        color: #41ff8f;
        font-weight: 900;
        font-size: 13px;
        letter-spacing: .08em;
        text-transform: uppercase;
      }
      .kage-demo-caption .title {
        margin-top: 8px;
        color: #f0fff2;
        font-size: 29px;
        line-height: 1.08;
        font-weight: 950;
        letter-spacing: 0;
      }
      .kage-demo-caption .body {
        margin-top: 10px;
        color: #9be7c0;
        font: 16px/1.45 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .kage-demo-highlight {
        position: fixed;
        z-index: 9997;
        pointer-events: none;
        border: 2px solid #41ff8f;
        border-radius: 8px;
        box-shadow: 0 0 0 9999px rgba(0, 0, 0, .16), 0 0 24px rgba(65, 255, 143, .34);
        transition: all .22s ease;
      }
      .kage-demo-cursor {
        position: fixed;
        width: 22px;
        height: 22px;
        border: 2px solid #41ff8f;
        border-radius: 50%;
        z-index: 9999;
        pointer-events: none;
        transform: translate(-50%, -50%);
        box-shadow: 0 0 18px rgba(65, 255, 143, .75);
        background: rgba(65, 255, 143, .12);
        transition: left .28s ease, top .28s ease;
      }
      .kage-demo-state {
        position: fixed;
        right: 30px;
        bottom: 30px;
        width: 470px;
        z-index: 9998;
        border: 1px solid rgba(106, 215, 255, .40);
        border-radius: 8px;
        background: linear-gradient(180deg, rgba(3, 12, 13, .94), rgba(3, 8, 6, .91));
        box-shadow: 0 0 30px rgba(106, 215, 255, .14), 0 24px 80px rgba(0, 0, 0, .48);
        padding: 15px 16px 14px;
        color: #d7f9df;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        pointer-events: none;
      }
      .kage-demo-state .state-head {
        color: #6ad7ff;
        font-size: 13px;
        font-weight: 900;
        letter-spacing: .08em;
        text-transform: uppercase;
      }
      .kage-demo-state .state-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-top: 11px;
      }
      .kage-demo-state .state-pill {
        border: 1px solid rgba(106, 215, 255, .22);
        border-radius: 5px;
        padding: 8px 9px;
        background: rgba(4, 18, 20, .70);
      }
      .kage-demo-state strong {
        display: block;
        color: #f0fff2;
        font-size: 16px;
      }
      .kage-demo-state span {
        display: block;
        margin-top: 3px;
        color: #8fb8a0;
        font-size: 11px;
        text-transform: uppercase;
      }
      .kage-demo-state .state-results {
        margin-top: 12px;
        display: grid;
        gap: 6px;
        color: #9be7c0;
        font-size: 12px;
      }
      .kage-demo-state .state-result {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `
  });
  await page.evaluate(() => {
    const caption = document.createElement("div");
    caption.className = "kage-demo-caption";
    caption.innerHTML = `<div class="kicker"></div><div class="title"></div><div class="body"></div>`;
    document.body.appendChild(caption);
    const highlight = document.createElement("div");
    highlight.className = "kage-demo-highlight";
    highlight.style.opacity = "0";
    document.body.appendChild(highlight);
    const cursor = document.createElement("div");
    cursor.className = "kage-demo-cursor";
    cursor.style.left = "800px";
    cursor.style.top = "450px";
    document.body.appendChild(cursor);
    const stateCard = document.createElement("div");
    stateCard.className = "kage-demo-state";
    stateCard.innerHTML = `
      <div class="state-head">Live viewer state</div>
      <div class="state-grid">
        <div class="state-pill"><strong data-state="selected">none</strong><span>Selected</span></div>
        <div class="state-pill"><strong data-state="graph">Combined</strong><span>Graph</span></div>
        <div class="state-pill"><strong data-state="nodes">0</strong><span>Visible Nodes</span></div>
        <div class="state-pill"><strong data-state="relations">0</strong><span>Visible Relations</span></div>
      </div>
      <div class="state-results"></div>
    `;
    document.body.appendChild(stateCard);
    window.kageDemoSetCaption = (kicker, title, body) => {
      caption.querySelector(".kicker").textContent = kicker;
      caption.querySelector(".title").textContent = title;
      caption.querySelector(".body").textContent = body;
    };
    window.kageDemoSetCursor = (x, y) => {
      cursor.style.left = `${x}px`;
      cursor.style.top = `${y}px`;
    };
    window.kageDemoHighlight = (selector) => {
      const target = document.querySelector(selector);
      if (!target) {
        highlight.style.opacity = "0";
        return;
      }
      const rect = target.getBoundingClientRect();
      highlight.style.opacity = "1";
      highlight.style.left = `${Math.max(8, rect.left - 8)}px`;
      highlight.style.top = `${Math.max(8, rect.top - 8)}px`;
      highlight.style.width = `${rect.width + 16}px`;
      highlight.style.height = `${rect.height + 16}px`;
    };
    window.kageDemoUpdateState = (headline = "Live viewer state") => {
      const subhead = document.querySelector("#graphSubhead")?.textContent || "";
      const match = subhead.match(/(\d+) visible nodes and (\d+) visible relations/);
      const mode = document.querySelector("#workspaceMode")?.textContent || document.querySelector("#viewMode")?.value || "Combined";
      const details = (document.querySelector("#selectionDetails")?.innerText || "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      var selected = details[0] && !/^Select an entity/.test(details[0]) ? details[0] : "none";
      var graphKind = mode;
      const graphIndex = details.findIndex((line) => line === "GRAPH");
      if (graphIndex >= 0 && details[graphIndex + 1]) graphKind = details[graphIndex + 1];
      const titles = selected === "none"
        ? [...document.querySelectorAll("#entityList .item-title")].slice(0, 4).map((item) => item.textContent || "").filter(Boolean)
        : details.filter((line) => !["ID", "SUMMARY", "GRAPH", "ALIASES", "EVIDENCE"].includes(line)).slice(0, 5);
      stateCard.querySelector(".state-head").textContent = headline;
      stateCard.querySelector('[data-state="selected"]').textContent = selected.length > 18 ? selected.slice(0, 18) + "..." : selected;
      stateCard.querySelector('[data-state="graph"]').textContent = graphKind;
      stateCard.querySelector('[data-state="nodes"]').textContent = match ? match[1] : "-";
      stateCard.querySelector('[data-state="relations"]').textContent = match ? match[2] : "-";
      const results = stateCard.querySelector(".state-results");
      results.textContent = "";
      titles.forEach((title) => {
        const line = document.createElement("div");
        line.className = "state-result";
        line.textContent = `> ${title}`;
        results.appendChild(line);
      });
    };
  });
  await updateStateCard(page);

  await showCaption(
    page,
    "Kage viewer",
    "Repo memory you can inspect.",
    "The hosted viewer auto-loads the Kage repo graph: memory, code, metrics, and evidence."
  );
  await highlight(page, "#graphSummary");
  await updateStateCard(page, "Auto-loaded repo graph");
  await capture(page, 18);

  await showCaption(
    page,
    "Signal view",
    "2,083 nodes. 4,681 relations.",
    "The viewer hides dependency noise by default so the useful graph stays playable."
  );
  await setCursor(page, 1135, 156);
  await highlight(page, "#fitView");
  await updateStateCard(page, "Filtered to playable signal");
  await captureStep(page, () => page.click("#fitView"), 14);

  await showCaption(
    page,
    "Memory inspection",
    "Click a real runbook memory.",
    "The side inspector shows the title, type, summary, graph kind, and evidence."
  );
  await setCursor(page, 330, 665);
  await highlight(page, ".graph-canvas-wrap");
  await captureStep(page, () => page.mouse.click(330, 665), 20);

  await showCaption(
    page,
    "Path relations",
    "Memory is connected to repo paths.",
    "Click a path node to see evidence for why this file matters."
  );
  await showGraph(page);
  await setCursor(page, 451, 714);
  await highlight(page, ".graph-canvas-wrap");
  await captureStep(page, () => page.mouse.click(451, 714), 18);

  await showCaption(
    page,
    "Decision memory",
    "Decisions stay visible after the session ends.",
    "The inspector explains what was decided and which repo surface it applies to."
  );
  await showGraph(page);
  await setCursor(page, 520, 548);
  await highlight(page, ".graph-canvas-wrap");
  await captureStep(page, () => page.mouse.click(520, 548), 20);

  await showCaption(
    page,
    "Source graph",
    "Code nodes come from source.",
    "Click a function node to inspect file, symbol, and source-derived metadata."
  );
  await showGraph(page);
  await setCursor(page, 1030, 580);
  await highlight(page, ".graph-canvas-wrap");
  await captureStep(page, () => page.mouse.click(1030, 580), 18);

  await showCaption(
    page,
    "Tests and files",
    "The graph also exposes tests and repo files.",
    "Agents can follow the same map instead of rediscovering structure every run."
  );
  await showGraph(page);
  await setCursor(page, 636, 688);
  await highlight(page, ".graph-canvas-wrap");
  await captureStep(page, () => page.mouse.click(636, 688), 18);

  await showCaption(
    page,
    "Hive memory",
    "One agent learns. The repo remembers. Future agents recall.",
    "Shared repo memory for Codex, Claude Code, Cursor, and MCP agents."
  );
  await highlight(page, "#graphCanvas");
  await captureStep(page, null, 20);

  await page.screenshot({ path: posterPath, type: "png" });
} finally {
  await browser.close();
}

const ffmpeg = spawnSync(ffmpegPath, [
  "-y",
  "-framerate", "12",
  "-i", join(frameDir, "frame-%04d.png"),
  "-vf", "format=yuv420p",
  "-movflags", "+faststart",
  outputPath
], { stdio: "inherit" });

if (ffmpeg.status !== 0) {
  process.exit(ffmpeg.status || 1);
}

console.log(`Wrote ${outputPath}`);
console.log(`Wrote ${posterPath}`);
