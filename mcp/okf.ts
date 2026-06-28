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
  const freshness = packet.freshness as Record<string, unknown> | undefined;
  return freshness && freshness.last_verified_at ? "verified" : "unverified";
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
  fm.push(`x-kage-confidence: ${packet.confidence}`);
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
