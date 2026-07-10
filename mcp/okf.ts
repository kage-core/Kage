// Kage <-> Google Open Knowledge Format (OKF) adapter.
//
// OKF (github.com/GoogleCloudPlatform/knowledge-catalog/okf) is Kage's standard
// on-disk interchange format for memory. A Kage memory packet is rendered as an
// OKF concept document: a Markdown file with YAML frontmatter whose only required
// field is `type`, plus the recommended `title` / `description` / `resource` /
// `tags` / `timestamp`. Kage's trust metadata (status, scope, confidence, the
// content-hash anchors, the lineage) rides along as OKF-legal custom `x-kage-*`
// frontmatter keys — OKF mandates that consumers preserve unknown producer fields,
// so a Kage bundle stays fully OKF-conformant and renders in any OKF consumer.
//
// Round-trip is lossless: every Kage-authored concept embeds the exact packet as a
// fenced ```json kage-state block in the body, so packet -> concept -> packet is an
// identity. Concepts WITHOUT that block (hand-authored or produced by another tool)
// are imported best-effort from their frontmatter + body, which is what lets Kage
// consume any third-party OKF bundle.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import {
  MEMORY_TYPES,
  PACKET_SCHEMA_VERSION,
  loadApprovedPackets,
  loadPendingPackets,
  makePacketId,
  memoryRoot,
  packetVerificationLabel,
  parseFrontmatter,
  slugify,
  type MemoryPacket,
  type MemoryType,
} from "./kernel.js";

// ---- type vocabulary mapping (Kage snake_case <-> OKF display string) ----

const TYPE_DISPLAY: Record<MemoryType, string> = {
  repo_map: "Repo Map",
  runbook: "Runbook",
  bug_fix: "Bug Fix",
  decision: "Decision",
  proposal: "Proposal",
  rationale: "Rationale",
  convention: "Convention",
  workflow: "Workflow",
  gotcha: "Gotcha",
  reference: "Reference",
  policy: "Policy",
  issue_context: "Issue Context",
  code_explanation: "Code Explanation",
  negative_result: "Negative Result",
  constraint: "Constraint",
};

const DISPLAY_TO_TYPE: Record<string, MemoryType> = Object.fromEntries(
  Object.entries(TYPE_DISPLAY).map(([k, v]) => [v.toLowerCase(), k as MemoryType]),
);

export function okfType(type: MemoryType): string {
  return TYPE_DISPLAY[type] ?? "Reference";
}

export function kageType(display: unknown): MemoryType {
  const key = String(display ?? "").trim().toLowerCase();
  if (DISPLAY_TO_TYPE[key]) return DISPLAY_TO_TYPE[key];
  if ((MEMORY_TYPES as readonly string[]).includes(key)) return key as MemoryType;
  return "reference";
}

// ---- the lossless machine-state block ----

const STATE_FENCE_OPEN = "```json kage-state";
const STATE_FENCE_CLOSE = "```";

function extractKageState(content: string): MemoryPacket | null {
  const open = content.indexOf(STATE_FENCE_OPEN);
  if (open === -1) return null;
  const start = open + STATE_FENCE_OPEN.length;
  const close = content.indexOf("\n```", start);
  if (close === -1) return null;
  try {
    const obj = JSON.parse(content.slice(start, close).trim()) as MemoryPacket;
    if (obj && obj.schema_version === PACKET_SCHEMA_VERSION && obj.id && obj.title) return obj;
  } catch {
    // fall through to best-effort import
  }
  return null;
}

// ---- small local helpers (kept self-contained; no reliance on kernel internals) ----

function yamlScalar(value: string): string {
  // JSON-encoded strings are valid YAML flow scalars and dodge every quoting/colon
  // edge case, so we never hand-roll YAML escaping.
  return JSON.stringify(value ?? "");
}

function yamlList(items: string[]): string {
  return `[${items.map((item) => JSON.stringify(item)).join(", ")}]`;
}

function firstHeading(body: string): string | null {
  const match = body.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function stripFirstHeading(body: string): string {
  return body.replace(/^#\s+.+\n?/, "").trim();
}

function summarize(body: string): string {
  const text = body.replace(/\s+/g, " ").trim();
  return text.length > 280 ? `${text.slice(0, 277).trimEnd()}…` : text;
}

function oneLine(value: string): string {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string" && value.trim()) {
    return value.replace(/^\[|\]$/g, "").split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
  }
  return [];
}

function asNumber(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : fallback;
}

function ensureDir(path: string): void {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

function citationText(ref: Record<string, unknown>): string {
  const kind = ref.kind ? String(ref.kind) : "source";
  const where = ref.path ? ` ${String(ref.path)}` : ref.resource ? ` ${String(ref.resource)}` : "";
  const at = ref.captured_at ? ` (${String(ref.captured_at)})` : "";
  return `${kind}${where}${at}`.trim();
}

function okfVerifiedStatus(packet: MemoryPacket): string {
  if (packet.status === "superseded") return "superseded";
  if (packet.status === "deprecated") return "deprecated";
  // "verified" is earned, not born: capture provenance (repo_local_agent_capture)
  // is not a check of the claim. Only an actual recheck (evidence-backed
  // reverification, validation pass) may carry the label.
  return packetVerificationLabel(packet);
}

// ---- packet -> OKF concept document ----

export function packetToOkfConcept(packet: MemoryPacket): string {
  const fm: string[] = [];
  fm.push(`type: ${yamlScalar(okfType(packet.type))}`);
  fm.push(`title: ${yamlScalar(packet.title)}`);
  fm.push(`description: ${yamlScalar(packet.summary ?? "")}`);
  const resource = packet.paths?.[0];
  if (resource) fm.push(`resource: ${yamlScalar(resource)}`);
  if (packet.tags?.length) fm.push(`tags: ${yamlList(packet.tags)}`);
  const freshness = packet.freshness as Record<string, unknown> | undefined;
  const timestamp = (freshness && (freshness.last_verified_at as string)) || packet.updated_at;
  if (timestamp) fm.push(`timestamp: ${yamlScalar(String(timestamp))}`);
  // Kage trust extension (OKF-legal arbitrary producer fields).
  fm.push(`x-kage-id: ${yamlScalar(packet.id)}`);
  fm.push(`x-kage-type: ${yamlScalar(packet.type)}`);
  fm.push(`x-kage-status: ${yamlScalar(packet.status)}`);
  fm.push(`x-kage-scope: ${yamlScalar(packet.scope)}`);
  fm.push(`x-kage-visibility: ${yamlScalar(packet.visibility)}`);
  // No x-kage-confidence: the field was a hardcoded 0.7 nobody computed or
  // consumed — a number that means nothing must not ship as trust metadata.
  fm.push(`x-kage-verified: ${yamlScalar(okfVerifiedStatus(packet))}`);
  if (packet.paths?.length) fm.push(`x-kage-paths: ${yamlList(packet.paths)}`);
  if (packet.stack?.length) fm.push(`x-kage-stack: ${yamlList(packet.stack)}`);

  const body: string[] = [];
  body.push(`# ${packet.title}`, "");
  if (packet.summary?.trim() && packet.summary.trim() !== packet.body?.trim()) body.push(`> ${oneLine(packet.summary)}`, "");
  if (packet.body?.trim()) body.push(packet.body.trim(), "");

  const ctx = packet.context;
  if (ctx) {
    if (ctx.why?.trim()) body.push("## Why", "", ctx.why.trim(), "");
    if (ctx.trigger?.trim()) body.push("## Trigger", "", ctx.trigger.trim(), "");
    if (ctx.action?.trim()) body.push("## Action", "", ctx.action.trim(), "");
    if (ctx.verification?.trim()) body.push("## Verification", "", ctx.verification.trim(), "");
    if (ctx.risk_if_forgotten?.trim()) body.push("## Risk if forgotten", "", ctx.risk_if_forgotten.trim(), "");
    if (ctx.stale_when?.trim()) body.push("## Stale when", "", ctx.stale_when.trim(), "");
    if (ctx.rejected_alternatives?.length) {
      body.push("## Rejected alternatives", "", ...ctx.rejected_alternatives.map((alt) => `- ${alt}`), "");
    }
  }

  if (packet.source_refs?.length) {
    body.push("# Citations", "");
    packet.source_refs.forEach((ref, i) => body.push(`[${i + 1}] ${citationText(ref as Record<string, unknown>)}`));
    body.push("");
  }

  body.push(
    "## Kage state",
    "",
    "Machine state for lossless round-trip; OKF consumers can ignore it.",
    "",
    STATE_FENCE_OPEN,
    JSON.stringify(packet),
    STATE_FENCE_CLOSE,
    "",
  );

  return `---\n${fm.join("\n")}\n---\n\n${body.join("\n")}\n`;
}

// ---- OKF concept document -> packet ----

export function okfConceptToPacket(
  content: string,
  opts: { projectDir?: string; sourcePath?: string } = {},
): MemoryPacket | null {
  // A file carrying git conflict markers is not a valid concept — surface it as
  // unparseable so validation flags it and the repair / merge-driver path (which
  // parses each side separately) resolves it, rather than silently picking a side.
  if (/^(?:<{7} |={7}\s*$|>{7} )/m.test(content)) return null;
  // Lossless path: a Kage-authored concept carries its exact packet.
  const state = extractKageState(content);
  if (state) return state;

  // Best-effort import of a foreign / hand-authored OKF concept.
  const { frontmatter, body } = parseFrontmatter(content);
  const fm = frontmatter as Record<string, unknown>;
  if (!String(fm.type ?? "").trim() && !firstHeading(body)) return null;

  const projectDir = opts.projectDir ?? ".";
  const base = opts.sourcePath ? basename(opts.sourcePath, ".md") : "concept";
  const type = kageType(fm.type);
  const title = String(fm.title ?? firstHeading(body) ?? base);
  const cleanBody = stripFirstHeading(body) || body.trim();
  const paths = fm["x-kage-paths"]
    ? asStringArray(fm["x-kage-paths"])
    : fm.resource
      ? [String(fm.resource)]
      : [];
  const timestamp = fm.timestamp ? String(fm.timestamp) : new Date().toISOString();

  return {
    schema_version: PACKET_SCHEMA_VERSION,
    id: fm["x-kage-id"] ? String(fm["x-kage-id"]) : makePacketId(projectDir, type, title, base),
    title,
    summary: String(fm.description ?? summarize(cleanBody)),
    body: cleanBody,
    type,
    scope: (String(fm["x-kage-scope"] ?? "repo")) as MemoryPacket["scope"],
    visibility: (String(fm["x-kage-visibility"] ?? "team")) as MemoryPacket["visibility"],
    sensitivity: "internal",
    status: (String(fm["x-kage-status"] ?? "approved")) as MemoryPacket["status"],
    confidence: asNumber(fm["x-kage-confidence"], 0.7),
    tags: asStringArray(fm.tags),
    paths,
    stack: asStringArray(fm["x-kage-stack"]),
    source_refs: [
      { kind: "okf_import", path: opts.sourcePath ? relative(projectDir, opts.sourcePath) : undefined, resource: fm.resource },
    ],
    freshness: { ttl_days: 365, last_verified_at: fm.timestamp ?? null, verification: "okf_import" },
    edges: [],
    quality: { reviewer: null, votes_up: 0, votes_down: 0, uses_30d: 0, reports_stale: 0 },
    created_at: timestamp,
    updated_at: timestamp,
  };
}

// ---- conformance lint ----

export function lintOkfConcept(content: string): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!content.startsWith("---")) errors.push("missing YAML frontmatter");
  const { frontmatter } = parseFrontmatter(content);
  if (!String((frontmatter as Record<string, unknown>).type ?? "").trim()) {
    errors.push("frontmatter missing required non-empty `type`");
  }
  return { ok: errors.length === 0, errors };
}

// ---- filenames / bundle layout ----

export function okfConceptFileName(packet: MemoryPacket): string {
  const idHash = createHash("sha256").update(packet.id).digest("hex").slice(0, 8);
  return `${slugify(packet.title) || "concept"}-${idHash}.md`;
}

export function okfBundleDir(projectDir: string): string {
  return join(memoryRoot(projectDir), "okf");
}

// ---- whole-bundle migration ----

export interface OkfMigrationResult {
  root: string;
  written: number;
  byType: Record<string, number>;
}

function titleCaseDir(dir: string): string {
  return dir.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function buildLog(entries: Array<{ date: string; line: string }>): string {
  const byDate = new Map<string, string[]>();
  for (const entry of entries) {
    const date = entry.date || "unknown";
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(entry.line);
  }
  const out = ["# Log", ""];
  for (const date of [...byDate.keys()].sort().reverse()) {
    out.push(`## ${date}`, "", ...byDate.get(date)!.map((line) => `- ${line}`), "");
  }
  return `${out.join("\n")}\n`;
}

export function migratePacketsToOkf(
  projectDir: string,
  opts: { includePending?: boolean } = {},
): OkfMigrationResult {
  const packets = [
    ...loadApprovedPackets(projectDir),
    ...(opts.includePending ? loadPendingPackets(projectDir) : []),
  ];
  const root = okfBundleDir(projectDir);
  ensureDir(root);

  const byType: Record<string, number> = {};
  const indexByType: Record<string, string[]> = {};
  const logEntries: Array<{ date: string; line: string }> = [];

  for (const packet of packets) {
    const typeDir = slugify(okfType(packet.type));
    const dir = join(root, typeDir);
    ensureDir(dir);
    const file = okfConceptFileName(packet);
    writeFileSync(join(dir, file), packetToOkfConcept(packet), "utf8");
    byType[packet.type] = (byType[packet.type] ?? 0) + 1;
    (indexByType[typeDir] ??= []).push(`- [${packet.title}](/${typeDir}/${file}) — ${oneLine(packet.summary)}`);
    logEntries.push({
      date: (packet.updated_at || packet.created_at || "").slice(0, 10),
      line: `**Update** ${packet.title} (${okfType(packet.type)})`,
    });
  }

  for (const [typeDir, lines] of Object.entries(indexByType)) {
    writeFileSync(join(root, typeDir, "index.md"), `# ${titleCaseDir(typeDir)}\n\n${lines.sort().join("\n")}\n`, "utf8");
  }

  const rootIndex = [
    "# Kage knowledge bundle",
    "",
    `${packets.length} concepts in Open Knowledge Format (OKF) v0.1, with the Kage trust extension (\`x-kage-*\`).`,
    "",
  ];
  for (const typeDir of Object.keys(indexByType).sort()) {
    rootIndex.push(`- [${titleCaseDir(typeDir)}](/${typeDir}/index.md) (${indexByType[typeDir].length})`);
  }
  writeFileSync(join(root, "index.md"), `${rootIndex.join("\n")}\n`, "utf8");
  writeFileSync(join(root, "log.md"), buildLog(logEntries), "utf8");

  return { root, written: packets.length, byType };
}

// ---- bundle reader (consume any OKF bundle, ours or a third party's) ----

function walkMarkdown(root: string): string[] {
  const out: string[] = [];
  let entries: string[] = [];
  try {
    entries = readdirSync(root);
  } catch {
    return out;
  }
  for (const name of entries) {
    const path = join(root, name);
    let stats;
    try {
      stats = statSync(path);
    } catch {
      continue;
    }
    if (stats.isDirectory()) out.push(...walkMarkdown(path));
    else if (name.endsWith(".md")) out.push(path);
  }
  return out.sort();
}

export function loadOkfConcepts(dir: string, opts: { projectDir?: string } = {}): MemoryPacket[] {
  if (!existsSync(dir)) return [];
  const out: MemoryPacket[] = [];
  for (const path of walkMarkdown(dir)) {
    const name = basename(path);
    if (name === "index.md" || name === "log.md") continue;
    try {
      const packet = okfConceptToPacket(readFileSync(path, "utf8"), {
        projectDir: opts.projectDir ?? dir,
        sourcePath: path,
      });
      if (packet) out.push(packet);
    } catch {
      // a single malformed concept must not break the whole bundle read
    }
  }
  return out;
}

// A clean, self-contained OKF bundle viewer — one HTML file with the concepts
// inlined, so it opens directly in a browser (no server, no giant URL). Renders
// concepts as filterable cards with their OKF type, resource, and verification
// status; click for the body. This is the "view your memory as an OKF bundle"
// experience, and it works on ANY OKF bundle, not just Kage's.
export function okfViewerHtml(concepts: MemoryPacket[], opts: { title?: string } = {}): string {
  const rows = concepts.map((p) => ({
    t: okfType(p.type),
    title: p.title,
    desc: p.summary || "",
    resource: p.paths?.[0] || "",
    tags: p.tags || [],
    v: okfVerifiedStatus(p),
    body: p.body || "",
    updated: (p.updated_at || "").slice(0, 10),
  }));
  const data = JSON.stringify(rows).replace(/<\/(script)/gi, "<\\/$1");
  const title = (opts.title || "Kage").replace(/[<>&"]/g, "");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>OKF bundle — ${title}</title>
<style>
:root{--g:#1f9d57;--ink:#16201a;--mut:#5b665e;--line:#e3e6e0;--paper:#fff;--bg:#f7f8f6;--code:#0c110d}
*{box-sizing:border-box}body{margin:0;font:15px/1.5 -apple-system,Segoe UI,Inter,sans-serif;color:var(--ink);background:var(--bg)}
header{padding:26px 24px 18px;border-bottom:1px solid var(--line);background:var(--paper)}
.wrap{max-width:1120px;margin:0 auto}
.brand{display:flex;align-items:center;gap:9px;font-weight:600;font-size:13px;color:var(--mut)}
.brand .dot{width:17px;height:17px;border-radius:5px;border:1.5px solid var(--g);position:relative}
.brand .dot::after{content:"";position:absolute;inset:4px;border-radius:50%;background:var(--g);opacity:.5}
h1{margin:10px 0 2px;font-size:22px}
.stats{color:var(--mut);font-size:13.5px}.stats b{color:var(--ink)}
.controls{max-width:1120px;margin:16px auto 0;padding:0 24px;display:flex;flex-wrap:wrap;gap:10px;align-items:center}
#q{flex:1;min-width:200px;padding:9px 13px;border:1px solid var(--line);border-radius:9px;font-size:14px;background:var(--paper);color:var(--ink)}
#chips{display:flex;flex-wrap:wrap;gap:7px}
.chip{padding:6px 11px;border:1px solid var(--line);border-radius:999px;background:var(--paper);color:var(--mut);font-size:12.5px;cursor:pointer}
.chip.on{border-color:var(--g);color:var(--g);font-weight:600}
main#grid{max-width:1120px;margin:18px auto 60px;padding:0 24px;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
.card{padding:15px 16px;border:1px solid var(--line);border-radius:12px;background:var(--paper);cursor:pointer;transition:border-color .12s}
.card:hover{border-color:var(--g)}
.meta{display:flex;align-items:center;gap:8px}
.badge{font:600 10.5px/1 ui-monospace,monospace;text-transform:uppercase;letter-spacing:.05em;color:var(--g);background:rgba(31,157,87,.1);padding:4px 7px;border-radius:5px}
.pill{margin-left:auto;font:600 11px/1 ui-monospace,monospace;padding:3px 8px;border-radius:999px}
.pill.ok{color:#0c7a4d;background:rgba(12,122,77,.12)}.pill.warn{color:#9a6b08;background:rgba(154,107,8,.14)}.pill.dim{color:var(--mut);background:rgba(0,0,0,.05)}
.ti{margin-top:9px;font-weight:600;font-size:15px;line-height:1.3}
.res{margin-top:6px;font:12px/1.4 ui-monospace,monospace;color:#155e9c;word-break:break-all}
.ds{margin-top:7px;color:var(--mut);font-size:13px}
.empty{color:var(--mut);padding:50px;text-align:center;grid-column:1/-1}
.detail{position:fixed;top:0;right:0;width:min(560px,93vw);height:100vh;overflow:auto;background:var(--paper);border-left:1px solid var(--line);box-shadow:-8px 0 34px rgba(0,0,0,.1);padding:24px 26px 60px;z-index:10}
.detail.hidden{display:none}
.detail .x{position:absolute;top:13px;right:16px;border:0;background:none;font-size:25px;color:var(--mut);cursor:pointer;line-height:1}
.detail h2{margin:12px 0 4px;font-size:19px}
.tags{margin-top:10px;display:flex;flex-wrap:wrap;gap:6px}.tags span{font:11px/1 ui-monospace,monospace;color:var(--mut);background:rgba(0,0,0,.05);padding:4px 7px;border-radius:5px}
.detail pre{margin-top:16px;padding:14px 15px;background:var(--code);color:#c7cfc4;border-radius:10px;white-space:pre-wrap;font:12.5px/1.7 ui-monospace,monospace}
.upd{font:11px/1 ui-monospace,monospace;color:var(--mut)}
@media (prefers-color-scheme:dark){:root{--ink:#e7ebe4;--mut:#9aa49c;--line:#2a2f2a;--bg:#0e110e}body{background:var(--bg)}header,.card,#q,.chip,.detail{background:#161a16}.badge{background:rgba(31,157,87,.16)}.pill.dim{background:rgba(255,255,255,.07)}.tags span{background:rgba(255,255,255,.07)}}
</style></head><body>
<header><div class="wrap">
  <div class="brand"><span class="dot"></span> Open Knowledge Format · viewed with Kage</div>
  <h1>${title} — memory bundle</h1>
  <div class="stats"><b id="n">0</b> concepts · <b id="nv">0</b> verified · <b id="nd">0</b> need attention</div>
</div></header>
<div class="controls"><input id="q" placeholder="Search concepts…" autocomplete="off"><div id="chips"></div></div>
<main id="grid"></main>
<div id="detail" class="detail hidden"></div>
<script>
var C=${data};
(function(){
  var grid=document.getElementById('grid'),q=document.getElementById('q'),chips=document.getElementById('chips'),detail=document.getElementById('detail'),active='all';
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m];});}
  function vClass(v){return v==='fresh'||v==='verified'?'ok':(v==='drifted'||v==='stale'?'warn':'dim');}
  var nv=0,nd=0;C.forEach(function(c){if(c.v==='fresh'||c.v==='verified')nv++;if(c.v==='drifted'||c.v==='stale')nd++;});
  document.getElementById('n').textContent=C.length;document.getElementById('nv').textContent=nv;document.getElementById('nd').textContent=nd;
  var types={};C.forEach(function(c){types[c.t]=(types[c.t]||0)+1;});
  function mkChip(label,key){var b=document.createElement('button');b.className='chip'+(key==='all'?' on':'');b.textContent=label;b.onclick=function(){active=key;[].forEach.call(chips.children,function(x){x.classList.remove('on');});b.classList.add('on');render();};chips.appendChild(b);}
  mkChip('All '+C.length,'all');Object.keys(types).sort().forEach(function(t){mkChip(t+' '+types[t],t);});
  q.oninput=render;
  function render(){var term=q.value.toLowerCase();grid.innerHTML='';var shown=0;
    C.forEach(function(c){
      if(active!=='all'&&c.t!==active)return;
      if(term&&(c.title+' '+c.desc+' '+c.resource+' '+c.tags.join(' ')).toLowerCase().indexOf(term)<0)return;
      shown++;var card=document.createElement('div');card.className='card';
      card.innerHTML='<div class="meta"><span class="badge">'+esc(c.t)+'</span><span class="pill '+vClass(c.v)+'">'+esc(c.v)+'</span></div><div class="ti">'+esc(c.title)+'</div>'+(c.resource?'<div class="res">'+esc(c.resource)+'</div>':'')+'<div class="ds">'+esc(c.desc.slice(0,150))+'</div>';
      card.onclick=function(){show(c);};grid.appendChild(card);
    });
    if(!shown)grid.innerHTML='<div class="empty">No concepts match.</div>';
  }
  function show(c){
    detail.innerHTML='<button class="x" aria-label="Close" onclick="document.getElementById(\\'detail\\').classList.add(\\'hidden\\')">&times;</button><div class="meta"><span class="badge">'+esc(c.t)+'</span><span class="pill '+vClass(c.v)+'">'+esc(c.v)+'</span>'+(c.updated?'<span class="upd" style="margin-left:8px">'+esc(c.updated)+'</span>':'')+'</div><h2>'+esc(c.title)+'</h2>'+(c.resource?'<div class="res">resource · '+esc(c.resource)+'</div>':'')+(c.tags.length?'<div class="tags">'+c.tags.map(function(t){return '<span>'+esc(t)+'</span>';}).join('')+'</div>':'')+'<pre>'+esc(c.body)+'</pre>';
    detail.classList.remove('hidden');
  }
  document.addEventListener('keydown',function(e){if(e.key==='Escape')detail.classList.add('hidden');});
  render();
})();
</script></body></html>
`;
}

export function lintOkfBundle(dir: string): { files: number; failures: Array<{ path: string; errors: string[] }> } {
  const failures: Array<{ path: string; errors: string[] }> = [];
  let files = 0;
  for (const path of walkMarkdown(dir)) {
    const name = basename(path);
    if (name === "index.md" || name === "log.md") continue;
    files += 1;
    const result = lintOkfConcept(readFileSync(path, "utf8"));
    if (!result.ok) failures.push({ path, errors: result.errors });
  }
  return { files, failures };
}
