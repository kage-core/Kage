import { access, mkdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const projectRoot = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const toolsRoot = process.env.KAGE_VIDEO_TOOLS || "/tmp/kage-video-tools";
const puppeteerPath = `${toolsRoot}/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js`;
const ffmpegPath = `${toolsRoot}/node_modules/@ffmpeg-installer/darwin-arm64/ffmpeg`;
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const outputPath = join(projectRoot, "docs/assets/kage-social-demo.mp4");
const posterPath = join(projectRoot, "docs/assets/kage-social-demo-poster.png");
const frameDir = join("/tmp", `kage-social-demo-frames-${Date.now()}`);
const fps = 18;

for (const requiredPath of [puppeteerPath, ffmpegPath, chromePath]) {
  try {
    await access(requiredPath);
  } catch {
    console.error(`Missing demo render dependency: ${requiredPath}`);
    console.error("Install render tools with: npm --prefix /tmp/kage-video-tools install puppeteer-core @ffmpeg-installer/ffmpeg");
    process.exit(1);
  }
}

const { default: puppeteer } = await import(`file://${puppeteerPath}`);

const scenes = [
  {
    frames: 108,
    mode: "setup",
    day: "Monday",
    top: "ME: FINALLY, TIME TO SHIP",
    bottom: "AI AGENT #1 WANTS A STORY",
    laptop: "Fix release bug",
    interruption: "what is this repo?",
    storyTitle: "",
    storyLines: [],
    actionLines: []
  },
  {
    frames: 162,
    mode: "bedtime",
    day: "Monday",
    top: "EVERY TIME I START WORKING",
    bottom: "and that is how we run tests.",
    laptop: "Agent waits for repo lore",
    interruption: "nice. thanks.",
    storyTitle: "Once upon a time...",
    storyLines: [
      "tests lived in mcp/kernel.test.ts",
      "release logic lived in mcp/kernel.ts",
      "the publish flow had rules"
    ],
    actionLines: []
  },
  {
    frames: 144,
    mode: "repeat",
    day: "Tuesday",
    top: "THE NEXT DAY",
    bottom: "NEW AGENT. SAME BEDTIME STORY.",
    laptop: "Continue release work",
    interruption: "can you explain the repo first?",
    storyTitle: "Once upon a time...",
    storyLines: [
      "the release helper was private",
      "graph freshness was content-based",
      "push-only commits should not need refresh"
    ],
    actionLines: []
  },
  {
    frames: 162,
    mode: "breaking",
    day: "Wednesday",
    top: "AGENT #7 ASKS A DEEP QUESTION",
    bottom: "THIS IS HOW FOUNDERS AGE",
    laptop: "Please just run the tests",
    interruption: "before I run tests... what are tests?",
    storyTitle: "I AM NOT CODING.",
    storyLines: [
      "I AM PARENTING.",
      "I have explained this release flow nine times."
    ],
    actionLines: []
  },
  {
    frames: 162,
    mode: "kage",
    day: "Kage enters",
    top: "KAGE: PUT THE STORY IN THE REPO",
    bottom: "NO MORE BEDTIME STORIES",
    laptop: "so the next agent just... knows?",
    interruption: "yes.",
    storyTitle: "Repo memory saved",
    storyLines: [
      "runbook",
      "decision",
      "bug fix",
      "paths",
      "tests",
      "why"
    ],
    actionLines: [
      "kage learn",
      "repo memory saved"
    ]
  },
  {
    frames: 216,
    mode: "demo",
    day: "Thursday",
    top: "WAIT.",
    bottom: "IT JUST STARTED WORKING?",
    laptop: "Fix release bug",
    interruption: "recalled context. running tests.",
    storyTitle: "Actual demo",
    storyLines: [],
    actionLines: [
      "kage_context(project, \"release bug\")",
      "recalled release runbook",
      "found affected files",
      "found test command",
      "editing mcp/kernel.ts",
      "running tests"
    ]
  },
  {
    frames: 108,
    mode: "grown",
    day: "Thursday",
    top: "WHEN THE AGENT STOPS ASKING STUPID QUESTIONS",
    bottom: "THE CHILD HAS GROWN.",
    laptop: "tests passing",
    interruption: "the repo remembered.",
    storyTitle: "tests passing",
    storyLines: [
      "no repo lecture",
      "no repeated setup",
      "work started"
    ],
    actionLines: []
  },
  {
    frames: 108,
    mode: "cta",
    day: "Kage",
    top: "STOP ONBOARDING AGENTS",
    bottom: "GIVE YOUR REPO MEMORY",
    laptop: "npm install -g @kage-core/kage-graph-mcp",
    interruption: "your repo should onboard agents",
    storyTitle: "Kage",
    storyLines: [
      "repo-local memory",
      "source-backed context",
      "for Codex, Claude Code, Cursor, and more"
    ],
    actionLines: []
  }
];

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function html() {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      :root {
        --paper: #fbf4df;
        --ink: #17130e;
        --muted: #8f7f62;
        --green: #32ef8f;
        --green-dark: #0b7b47;
        --yellow: #ffe27a;
        --blue: #9ed7ff;
        --pink: #ffb8d0;
        --caption: "Arial Black", Impact, system-ui, sans-serif;
        --hand: "Comic Sans MS", "Marker Felt", "Trebuchet MS", system-ui, sans-serif;
        --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        width: 1600px;
        height: 900px;
        overflow: hidden;
        background:
          radial-gradient(circle at 12% 10%, rgba(255, 226, 122, .28), transparent 18%),
          radial-gradient(circle at 86% 14%, rgba(50, 239, 143, .2), transparent 20%),
          repeating-linear-gradient(0deg, rgba(23, 19, 14, .035) 0 1px, transparent 1px 36px),
          repeating-linear-gradient(90deg, rgba(23, 19, 14, .025) 0 1px, transparent 1px 36px),
          var(--paper);
        color: var(--ink);
        font-family: var(--hand);
      }
      .stage {
        position: relative;
        width: 1600px;
        height: 900px;
      }
      .caption {
        position: absolute;
        left: 46px;
        right: 46px;
        z-index: 20;
        text-align: center;
        font: 900 67px/.92 var(--caption);
        letter-spacing: 0;
        text-transform: uppercase;
        color: white;
        -webkit-text-stroke: 4px var(--ink);
        text-shadow: 7px 8px 0 rgba(23, 19, 14, .25);
      }
      .caption.top { top: 28px; }
      .caption.bottom { bottom: 28px; }
      .day {
        position: absolute;
        left: 72px;
        top: 132px;
        z-index: 15;
        padding: 15px 22px;
        background: white;
        border: 5px solid var(--ink);
        border-radius: 9px 14px 8px 13px;
        box-shadow: 9px 10px 0 rgba(23, 19, 14, .18);
        font: 900 34px/1 var(--caption);
        text-transform: uppercase;
        transform: rotate(-3deg);
      }
      .desk {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 186px;
        background:
          repeating-linear-gradient(90deg, rgba(23, 19, 14, .06) 0 2px, transparent 2px 46px),
          #e6c980;
        border-top: 7px solid var(--ink);
      }
      .human-wrap {
        position: absolute;
        left: 92px;
        bottom: 126px;
        z-index: 8;
        transform: translateY(calc(var(--human-drop) * 1px)) rotate(calc(var(--human-tilt) * 1deg));
      }
      .human {
        width: 390px;
        height: 420px;
        overflow: visible;
      }
      .stroke {
        fill: none;
        stroke: var(--ink);
        stroke-width: 8;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .thin { stroke-width: 5; }
      .fill-white { fill: white; stroke: var(--ink); stroke-width: 8; }
      .fill-hoodie { fill: #dad5ca; stroke: var(--ink); stroke-width: 8; }
      .fill-skin { fill: #ffd8a8; stroke: var(--ink); stroke-width: 8; }
      .face-tired { opacity: var(--face-tired); }
      .face-proud { opacity: var(--face-proud); }
      .coffee {
        position: absolute;
        left: 414px;
        bottom: 16px;
        z-index: 9;
        width: 82px;
        height: 110px;
        border: 6px solid var(--ink);
        border-radius: 8px 8px 18px 18px;
        background: white;
        transform: rotate(2deg);
      }
      .coffee::before {
        content: "";
        position: absolute;
        right: -32px;
        top: 28px;
        width: 36px;
        height: 40px;
        border: 6px solid var(--ink);
        border-left: 0;
        border-radius: 0 28px 28px 0;
      }
      .coffee::after {
        content: "coffee";
        position: absolute;
        left: 8px;
        top: 42px;
        font: 900 15px/1 var(--mono);
        transform: rotate(-8deg);
      }
      .laptop {
        position: absolute;
        left: 548px;
        bottom: 174px;
        z-index: 10;
        width: 418px;
        height: 255px;
        background: #f5f5f0;
        border: 7px solid var(--ink);
        border-radius: 14px 14px 6px 6px;
        transform: rotate(-1deg);
        box-shadow: 10px 12px 0 rgba(23, 19, 14, .16);
      }
      .laptop::after {
        content: "";
        position: absolute;
        left: -36px;
        right: -36px;
        bottom: -34px;
        height: 34px;
        border: 7px solid var(--ink);
        border-top: 0;
        background: #d7d2c4;
        border-radius: 0 0 18px 18px;
      }
      .laptop-title {
        position: absolute;
        left: 22px;
        right: 22px;
        top: 24px;
        padding: 14px;
        border: 4px dashed var(--ink);
        background: white;
        font: 900 27px/1.15 var(--hand);
        text-align: center;
      }
      .popup {
        position: absolute;
        left: 920px;
        top: 235px;
        z-index: 16;
        width: 450px;
        min-height: 108px;
        padding: 20px 24px;
        border: 6px solid var(--ink);
        border-radius: 18px 24px 16px 22px;
        background: var(--blue);
        box-shadow: 9px 10px 0 rgba(23, 19, 14, .18);
        font: 900 31px/1.08 var(--hand);
        transform: translateY(calc((1 - var(--popup-in)) * 24px)) rotate(2deg) scale(calc(.94 + var(--popup-in) * .06));
        opacity: var(--popup-in);
      }
      .popup::before {
        content: "";
        position: absolute;
        left: -28px;
        bottom: 24px;
        width: 36px;
        height: 28px;
        background: var(--blue);
        border-left: 6px solid var(--ink);
        border-bottom: 6px solid var(--ink);
        transform: rotate(28deg);
      }
      .agent {
        position: absolute;
        left: 1035px;
        bottom: 150px;
        z-index: 11;
        width: 230px;
        height: 300px;
        transform: translateY(calc((1 - var(--agent-in)) * 70px)) rotate(calc(var(--agent-tilt) * 1deg)) scale(var(--agent-scale));
        opacity: var(--agent-in);
      }
      .agent svg { width: 100%; height: 100%; overflow: visible; }
      .grown .baby-only { opacity: 0; }
      .grown .grown-only { opacity: 1; }
      .baby-only { opacity: 1; }
      .grown-only { opacity: 0; }
      .book {
        position: absolute;
        left: 452px;
        top: 238px;
        z-index: 14;
        width: 662px;
        min-height: 315px;
        padding: 34px 42px;
        border: 7px solid var(--ink);
        border-radius: 16px 20px 14px 18px;
        background:
          linear-gradient(90deg, transparent 48.5%, rgba(23, 19, 14, .2) 48.5% 51.5%, transparent 51.5%),
          #fff7d7;
        box-shadow: 13px 15px 0 rgba(23, 19, 14, .19);
        transform: translateY(calc((1 - var(--book-in)) * 42px)) rotate(-1deg);
        opacity: var(--book-in);
      }
      .book-title {
        font: 900 40px/1.05 Georgia, serif;
        margin-bottom: 20px;
      }
      .book-lines {
        display: grid;
        gap: 13px;
        font: 900 27px/1.08 var(--hand);
      }
      .book-line {
        opacity: var(--line-in);
        transform: translateX(calc((1 - var(--line-in)) * -18px));
      }
      .stamp-wall {
        position: absolute;
        left: 460px;
        top: 348px;
        z-index: 17;
        display: grid;
        grid-template-columns: repeat(3, 160px);
        gap: 18px;
        opacity: var(--stamp-wall-in);
        transform: rotate(-2deg);
      }
      .stamp {
        height: 70px;
        display: grid;
        place-items: center;
        border: 6px solid var(--green-dark);
        border-radius: 8px;
        color: var(--green-dark);
        background: rgba(50, 239, 143, .2);
        font: 900 24px/1 var(--caption);
        text-transform: uppercase;
        transform: scale(var(--stamp-in));
      }
      .kage {
        position: absolute;
        left: 1080px;
        top: 422px;
        z-index: 18;
        width: 210px;
        height: 210px;
        opacity: var(--kage-in);
        transform: translateY(calc((1 - var(--kage-in)) * 50px)) rotate(-5deg);
      }
      .kage svg { width: 100%; height: 100%; overflow: visible; }
      .action {
        position: absolute;
        left: 360px;
        right: 360px;
        bottom: 124px;
        z-index: 19;
        min-height: 116px;
        padding: 18px 24px;
        border: 6px solid var(--ink);
        border-radius: 15px;
        background: #12110e;
        color: var(--green);
        box-shadow: 10px 12px 0 rgba(23, 19, 14, .22);
        opacity: var(--action-in);
        transform: translateY(calc((1 - var(--action-in)) * 36px));
        font: 800 24px/1.3 var(--mono);
      }
      .action-line {
        white-space: nowrap;
        opacity: var(--line-in);
      }
      .repo-box {
        position: absolute;
        left: 1180px;
        bottom: 142px;
        z-index: 9;
        width: 220px;
        height: 126px;
        border: 7px solid var(--ink);
        border-radius: 10px;
        background: #ffdf8a;
        display: grid;
        place-items: center;
        font: 900 28px/1 var(--caption);
        text-transform: uppercase;
        transform: rotate(3deg);
      }
      .progress {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 40;
        height: 9px;
        background: rgba(23, 19, 14, .16);
      }
      .progress div {
        height: 100%;
        width: calc(var(--overall) * 100%);
        background: var(--green);
      }
      .mode-setup { --book-in: 0; --kage-in: 0; --action-in: 0; --stamp-wall-in: 0; --agent-scale: .86; --agent-tilt: -5; --human-drop: 0; --human-tilt: 0; --face-tired: 1; --face-proud: 0; }
      .mode-bedtime { --book-in: 1; --kage-in: 0; --action-in: 0; --stamp-wall-in: 0; --agent-scale: .78; --agent-tilt: 7; --human-drop: 8; --human-tilt: -2; --face-tired: 1; --face-proud: 0; }
      .mode-repeat { --book-in: 1; --kage-in: 0; --action-in: 0; --stamp-wall-in: 0; --agent-scale: .79; --agent-tilt: -8; --human-drop: 18; --human-tilt: -4; --face-tired: 1; --face-proud: 0; }
      .mode-breaking { --book-in: 1; --kage-in: 0; --action-in: 0; --stamp-wall-in: 0; --agent-scale: .78; --agent-tilt: 10; --human-drop: 30; --human-tilt: -6; --face-tired: 1; --face-proud: 0; }
      .mode-kage { --book-in: .95; --kage-in: 1; --action-in: 1; --stamp-wall-in: 1; --agent-scale: .78; --agent-tilt: 2; --human-drop: 10; --human-tilt: 1; --face-tired: 1; --face-proud: 0; }
      .mode-demo { --book-in: 0; --kage-in: .42; --action-in: 1; --stamp-wall-in: 0; --agent-scale: 1.04; --agent-tilt: -2; --human-drop: 0; --human-tilt: 1; --face-tired: .45; --face-proud: .55; }
      .mode-grown { --book-in: 1; --kage-in: .55; --action-in: 0; --stamp-wall-in: 0; --agent-scale: 1.12; --agent-tilt: 1; --human-drop: -2; --human-tilt: 3; --face-tired: 0; --face-proud: 1; }
      .mode-cta { --book-in: 1; --kage-in: .85; --action-in: 0; --stamp-wall-in: 0; --agent-scale: 1.08; --agent-tilt: 0; --human-drop: -2; --human-tilt: 2; --face-tired: 0; --face-proud: 1; }
      .mode-demo .agent,
      .mode-grown .agent,
      .mode-cta .agent {
        left: 990px;
      }
      .mode-demo .agent,
      .mode-grown .agent,
      .mode-cta .agent {
        --agent-in: 1;
      }
      .mode-demo .agent,
      .mode-grown .agent,
      .mode-cta .agent {
        color: var(--green);
      }
      .mode-demo .agent .baby-only,
      .mode-grown .agent .baby-only,
      .mode-cta .agent .baby-only {
        opacity: 0;
      }
      .mode-demo .agent .grown-only,
      .mode-grown .agent .grown-only,
      .mode-cta .agent .grown-only {
        opacity: 1;
      }
    </style>
  </head>
  <body>
    <div class="stage">
      <div class="caption top"></div>
      <div class="caption bottom"></div>
      <div class="day"></div>
      <div class="desk"></div>

      <div class="human-wrap">
        <svg class="human" viewBox="0 0 390 420" aria-hidden="true">
          <path class="fill-hoodie" d="M104 408 C112 305 142 246 198 246 C258 246 294 308 306 408 Z" />
          <path class="fill-skin" d="M132 130 C132 70 172 38 218 44 C267 51 296 91 286 145 C278 190 250 218 205 218 C158 218 132 184 132 130 Z" />
          <path class="stroke" d="M128 95 C153 54 196 35 246 57" />
          <path class="stroke" d="M139 72 C160 45 212 34 256 67" />
          <path class="stroke thin" d="M158 122 L184 122" />
          <path class="stroke thin" d="M226 123 L252 123" />
          <g class="face-tired">
            <path class="stroke thin" d="M156 145 C166 154 176 154 187 145" />
            <path class="stroke thin" d="M226 145 C238 154 248 154 258 145" />
            <path class="stroke thin" d="M190 184 C209 174 229 178 246 190" />
          </g>
          <g class="face-proud">
            <path class="stroke thin" d="M157 137 C168 128 179 128 188 137" />
            <path class="stroke thin" d="M226 137 C237 128 248 128 258 137" />
            <path class="stroke thin" d="M183 180 C203 204 234 203 255 179" />
          </g>
          <path class="stroke thin" d="M204 136 C198 152 197 161 206 164" />
          <path class="stroke" d="M123 286 C76 264 47 238 38 206" />
          <path class="stroke" d="M287 292 C318 269 337 241 344 206" />
          <path class="stroke" d="M41 204 C60 196 72 205 76 224" />
          <path class="stroke" d="M340 204 C322 195 311 205 308 225" />
          <path class="stroke thin" d="M160 286 C183 305 214 306 237 286" />
        </svg>
        <div class="coffee"></div>
      </div>

      <div class="laptop">
        <div class="laptop-title"></div>
      </div>
      <div class="repo-box">repo</div>

      <div class="agent">
        <svg viewBox="0 0 230 300" aria-hidden="true">
          <g class="baby-only">
            <path class="fill-white" d="M66 120 C63 70 94 42 132 49 C172 56 194 88 184 130 C176 166 149 184 113 178 C85 173 68 151 66 120 Z" />
            <path class="stroke thin" d="M86 103 L104 107" />
            <path class="stroke thin" d="M143 107 L160 103" />
            <path class="stroke thin" d="M105 145 C121 137 139 139 153 151" />
            <path class="fill-white" d="M82 190 C102 168 154 169 174 190 L166 254 L90 254 Z" />
            <path class="stroke" d="M94 255 L80 286" />
            <path class="stroke" d="M160 255 L178 286" />
            <path class="stroke" d="M95 199 L54 188" />
            <path class="stroke" d="M164 199 L204 188" />
            <path class="fill-white" d="M127 18 L180 78 L133 70 Z" />
          </g>
          <g class="grown-only">
            <path class="fill-white" d="M62 93 C62 50 93 28 130 34 C169 40 191 70 184 110 C177 146 151 164 113 159 C82 155 63 130 62 93 Z" />
            <path class="stroke thin" d="M89 92 C100 83 112 83 122 92" />
            <path class="stroke thin" d="M143 92 C154 83 166 83 176 92" />
            <path class="stroke thin" d="M92 92 L176 92" />
            <path class="stroke thin" d="M102 132 C122 149 149 149 169 130" />
            <path class="fill-white" d="M72 168 C96 145 159 145 184 168 L184 260 L72 260 Z" />
            <path class="stroke" d="M91 259 L76 292" />
            <path class="stroke" d="M163 259 L181 292" />
            <path class="stroke" d="M82 184 L36 152" />
            <path class="stroke" d="M175 184 L214 148" />
            <path class="fill-white" d="M126 7 L184 70 L131 61 Z" />
            <path class="stroke thin" d="M92 201 L164 201" />
          </g>
        </svg>
      </div>
      <div class="popup"></div>

      <div class="book">
        <div class="book-title"></div>
        <div class="book-lines"></div>
      </div>
      <div class="stamp-wall"></div>

      <div class="kage">
        <svg viewBox="0 0 210 210" aria-hidden="true">
          <path d="M45 34 L160 20 L176 158 L58 176 Z" fill="#baffd9" stroke="#17130e" stroke-width="8" stroke-linejoin="round" />
          <path d="M75 58 L138 51" class="stroke thin" />
          <path d="M78 86 L145 79" class="stroke thin" />
          <path d="M80 114 L134 108" class="stroke thin" />
          <circle cx="106" cy="142" r="24" fill="#32ef8f" stroke="#17130e" stroke-width="7" />
          <path d="M93 142 L102 151 L121 130" class="stroke thin" />
          <path d="M35 92 C12 88 14 61 37 64" class="stroke" />
          <path d="M171 81 C198 76 200 110 174 110" class="stroke" />
          <text x="76" y="197" font-family="Arial Black, sans-serif" font-size="24" fill="#17130e">KAGE</text>
        </svg>
      </div>

      <div class="action"></div>
      <div class="progress"><div></div></div>
    </div>

    <script>
      const scenes = ${JSON.stringify(scenes)};
      const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
      const ease = (value) => {
        const t = clamp(value);
        return t * t * (3 - 2 * t);
      };
      const text = (selector, value) => {
        document.querySelector(selector).textContent = value || "";
      };
      const html = (selector, value) => {
        document.querySelector(selector).innerHTML = value || "";
      };
      const lineOpacity = (index, progress, total) => {
        const start = .18 + index * (.62 / Math.max(1, total));
        return ease((progress - start) / .18);
      };
      const safe = (value) => String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

      window.kageSocialDemoRender = (index, progress, overall) => {
        const scene = scenes[index];
        document.body.className = "mode-" + scene.mode;
        document.documentElement.style.setProperty("--overall", overall);
        document.documentElement.style.setProperty("--popup-in", ease((progress - .2) / .18));
        document.documentElement.style.setProperty("--agent-in", ease((progress - .08) / .16));
        document.documentElement.style.setProperty("--line-in", ease((progress - .2) / .25));
        text(".caption.top", scene.top);
        text(".caption.bottom", scene.bottom);
        text(".day", scene.day);
        text(".laptop-title", scene.laptop);
        text(".popup", scene.interruption);
        text(".book-title", scene.storyTitle);
        const bookLines = scene.mode === "kage" ? [] : scene.storyLines;
        html(".book-lines", bookLines.map((line, lineIndex) => {
          const opacity = lineOpacity(lineIndex, progress, bookLines.length);
          return '<div class="book-line" style="--line-in:' + opacity.toFixed(3) + '">' + safe(line) + '</div>';
        }).join(""));
        html(".stamp-wall", scene.storyLines.map((line, lineIndex) => {
          const stampIn = scene.mode === "kage" ? lineOpacity(lineIndex, progress, scene.storyLines.length) : 0;
          return '<div class="stamp" style="--stamp-in:' + stampIn.toFixed(3) + '">' + safe(line) + '</div>';
        }).join(""));
        html(".action", scene.actionLines.map((line, lineIndex) => {
          const opacity = lineOpacity(lineIndex, progress, scene.actionLines.length);
          return '<div class="action-line" style="--line-in:' + opacity.toFixed(3) + '">&gt; ' + safe(line) + '</div>';
        }).join(""));
      };
    </script>
  </body>
</html>`;
}

const totalFrames = scenes.reduce((sum, scene) => sum + scene.frames, 0);

function frameToScene(frame) {
  let cursor = 0;
  for (let index = 0; index < scenes.length; index += 1) {
    const scene = scenes[index];
    if (frame < cursor + scene.frames) {
      return {
        index,
        progress: (frame - cursor) / Math.max(1, scene.frames - 1)
      };
    }
    cursor += scene.frames;
  }
  return { index: scenes.length - 1, progress: 1 };
}

await rm(frameDir, { recursive: true, force: true });
await mkdir(frameDir, { recursive: true });
await writeFile(join(frameDir, "index.html"), html(), "utf8");

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"]
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(join(frameDir, "index.html")).href);

  for (let frame = 0; frame < totalFrames; frame += 1) {
    const { index, progress } = frameToScene(frame);
    const overall = frame / Math.max(1, totalFrames - 1);
    await page.evaluate(
      ({ index: sceneIndex, progress: sceneProgress, overall: overallProgress }) => {
        window.kageSocialDemoRender(sceneIndex, sceneProgress, overallProgress);
      },
      { index, progress, overall }
    );
    await page.screenshot({
      path: join(frameDir, `frame-${String(frame).padStart(5, "0")}.png`),
      type: "png"
    });
  }

  await page.evaluate(() => window.kageSocialDemoRender(6, 0.66, 0.86));
  await page.screenshot({ path: posterPath, type: "png" });
} finally {
  await browser.close();
}

const result = spawnSync(ffmpegPath, [
  "-y",
  "-framerate",
  String(fps),
  "-i",
  join(frameDir, "frame-%05d.png"),
  "-vf",
  "format=yuv420p",
  "-movflags",
  "+faststart",
  outputPath
], { stdio: "inherit" });

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const videoStats = await stat(outputPath);
const posterStats = await stat(posterPath);
console.log(`Rendered ${outputPath} (${Math.round(videoStats.size / 1024)} KB, ${(totalFrames / fps).toFixed(2)}s)`);
console.log(`Rendered ${posterPath} (${Math.round(posterStats.size / 1024)} KB)`);
