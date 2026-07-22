import { appendFileSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, relative, sep } from "node:path";

/**
 * v4 legacy-command quarantine map.
 *
 * Task 10 cuts the default product surface over to the focused vNext verbs (connect/status/open/
 * doctor/export/migrate at the CLI, kage_context/kage_retrieve/kage_feedback at the MCP layer). The
 * long tail of pre-vNext commands stays CALLABLE through v4 for back-compat, but each one is
 * deprecated: it prints exactly one supported replacement, a v5 removal notice, and the migration
 * doc link, and it is reachable under `kage legacy <command>` as well as directly.
 *
 * A command maps to EITHER a single supported v4 replacement verb, OR is `removed` — deprecated with
 * no direct replacement because its behavior has no safe migration value (advisory community graph,
 * inferred-savings guesses superseded by measured receipts, one-off diagnostics superseded by the
 * portal). A removed command still runs under `kage legacy` for one major version; the notice says so.
 *
 * Telemetry is deliberately minimal: `recordLegacyUsage` writes ONLY the command name + version +
 * timestamp. It never records arguments, which can carry private paths or query text.
 */

export const V4_VERSION = "v4";
export const V4_REMOVAL_VERSION = "v5";
export const LEGACY_DOCS_PATH = "docs/migration/v4-command-map.md";

/** The only verbs that may appear on the right-hand side of a mapping — the supported v4 surface. */
const SUPPORTED_V4_VERBS = new Set([
  "connect",
  "status",
  "open",
  "doctor",
  "export",
  "migrate",
  "context",
  "receipts",
]);

interface LegacyEntry {
  /** Single supported replacement verb, or null when the command is removed with no direct migration. */
  replacement: string | null;
  /** Human reason shown in the deprecation notice. */
  reason: string;
}

/**
 * The map. Keys are the legacy command names (as typed on the CLI). Aliases (e.g. `memory-timeline`
 * for `timeline`) are separate keys pointing at the same replacement so either spelling resolves.
 */
const LEGACY_COMMANDS: Record<string, LegacyEntry> = {
  // --- Memory activity / lineage / handoff diagnostics -> the portal dashboard ---
  timeline: { replacement: "open", reason: "Memory activity now lives in the local dashboard." },
  "memory-timeline": { replacement: "open", reason: "Memory activity now lives in the local dashboard." },
  lineage: { replacement: "open", reason: "Supersession chains are shown in the local dashboard." },
  handoff: { replacement: "open", reason: "Teammate handoff is shown in the local dashboard." },
  activity: { replacement: "open", reason: "Session activity is shown in the local dashboard." },
  "memory-access": { replacement: "open", reason: "Memory access is shown in the local dashboard." },
  "memory-audit": { replacement: "open", reason: "The memory audit trail is shown in the local dashboard." },
  layers: { replacement: "open", reason: "Layered recall is shown in the local dashboard." },
  inbox: { replacement: "open", reason: "The review inbox now lives in the local dashboard." },
  lifecycle: { replacement: "open", reason: "Memory lifecycle is shown in the local dashboard." },

  // --- Inferred savings / gains -> MEASURED receipts (honesty: measured over estimated) ---
  gains: { replacement: "receipts", reason: "Inferred savings are replaced by measured receipts." },
  savings: { replacement: "receipts", reason: "Inferred savings are replaced by measured receipts." },

  // --- Trust / team rollups -> status ---
  team: { replacement: "status", reason: "Team memory health is folded into `kage status`." },
  audit: { replacement: "status", reason: "The trust score is folded into `kage status`." },
  quality: { replacement: "status", reason: "Memory quality is folded into `kage status`." },
  capabilities: { replacement: "status", reason: "Readiness is folded into `kage status`." },

  // --- One-off code/graph diagnostics -> the combined kage_context surface ---
  profile: { replacement: "context", reason: "Repo overview is answered by `kage context`." },
  xray: { replacement: "context", reason: "First-use structure is answered by `kage context`." },
  "repo-xray": { replacement: "context", reason: "First-use structure is answered by `kage context`." },
  decisions: { replacement: "context", reason: "Decision coverage is answered by `kage context`." },
  "module-health": { replacement: "context", reason: "Module health is answered by `kage context`." },
  "graph-insights": { replacement: "context", reason: "Graph insights are answered by `kage context`." },
  "code-graph": { replacement: "context", reason: "Caller/usage queries are answered by `kage context`." },
  graph: { replacement: "context", reason: "Graph facts are answered by `kage context`." },
  recall: { replacement: "context", reason: "`kage context` recalls memory and queries the graph in one call." },
  "cleanup-candidates": { replacement: "context", reason: "Cleanup candidates are answered by `kage context`." },
  reviewers: { replacement: "context", reason: "Reviewer/risk context is answered by `kage context`." },
  contributors: { replacement: "context", reason: "Contributor context is answered by `kage context`." },
  "dependency-path": { replacement: "context", reason: "Dependency paths are answered by `kage context`." },
  "docs-search": { replacement: "context", reason: "Repo doc search is answered by `kage context`." },
  risk: { replacement: "context", reason: "Change risk is answered by `kage context`." },

  // --- Community registry / promotion -> removed (advisory-only, untrusted, no safe migration) ---
  "community-domains": { replacement: null, reason: "The community graph is advisory-only and was removed from the primary surface." },
  "community-search": { replacement: null, reason: "The community graph is advisory-only and was removed from the primary surface." },
  "community-fetch": { replacement: null, reason: "The community graph is advisory-only and was removed from the primary surface." },
  registry: { replacement: null, reason: "The registry surface is advisory-only and was removed." },
  "graph-registry": { replacement: null, reason: "The registry surface is advisory-only and was removed." },
  promote: { replacement: null, reason: "Public promotion was removed; assets are never published automatically." },
  "export-public": { replacement: null, reason: "Public bundle export was removed; assets are never published automatically." },

  // --- Competitor / external-store audit -> removed (no safe migration) ---
  "audit-claude-mem": { replacement: null, reason: "Cross-tool audit was removed; it has no safe migration value in v4." },
};

export interface MapLegacyResult {
  /** The legacy command as typed. */
  command: string;
  /** True when `command` is a known legacy command. */
  isLegacy: boolean;
  /** True when the command is deprecated with no direct replacement (still reachable via `kage legacy`). */
  removed: boolean;
  /** The single supported replacement verb, or null. */
  replacementCommand: string | null;
  /** The full replacement argv with the verb swapped and the caller's flags preserved; [] when removed or not legacy. */
  replacement: string[];
  /** The version this command is removed in. */
  removalVersion: string;
  /** The migration doc path. */
  docs: string;
  /** Human reason. */
  reason: string;
}

/** Is `command` a known legacy (deprecated) command? */
export function isLegacyCommand(command: string): boolean {
  return Object.prototype.hasOwnProperty.call(LEGACY_COMMANDS, command);
}

/** Every known legacy command name, sorted. */
export function allLegacyCommands(): string[] {
  return Object.keys(LEGACY_COMMANDS).sort();
}

/** Render the `kage legacy --help` body: each deprecated command and its single replacement (or "removed"). */
export function renderLegacyHelp(): string {
  const lines: string[] = [
    "Kage — legacy (deprecated) commands",
    "",
    `These commands are deprecated in ${V4_VERSION} and will be removed in ${V4_REMOVAL_VERSION}.`,
    `They remain callable directly or via \`kage legacy <command> ...\`. See ${LEGACY_DOCS_PATH}.`,
    "",
  ];
  const width = Math.max(...allLegacyCommands().map((name) => name.length));
  for (const name of allLegacyCommands()) {
    const entry = LEGACY_COMMANDS[name];
    const target = entry.replacement ? `-> kage ${entry.replacement}` : "-> removed (no direct replacement)";
    lines.push(`  kage ${name.padEnd(width)}   ${target}`);
  }
  return lines.join("\n");
}

/** The distinct set of supported replacement verbs referenced by the map. */
export function legacyReplacementCommands(): string[] {
  const set = new Set<string>();
  for (const entry of Object.values(LEGACY_COMMANDS)) {
    if (entry.replacement) set.add(entry.replacement);
  }
  return [...set].sort();
}

/**
 * Map a legacy invocation (argv = [command, ...rest]) to its supported replacement, preserving the
 * caller's flags. For a mapped command the replacement argv swaps only the verb; for a removed command
 * the replacement is empty. A non-legacy command returns isLegacy=false with an empty replacement.
 */
export function mapLegacyCommand(argv: string[]): MapLegacyResult {
  const command = argv[0] ?? "";
  const rest = argv.slice(1);
  const entry = LEGACY_COMMANDS[command];
  if (!entry) {
    return {
      command,
      isLegacy: false,
      removed: false,
      replacementCommand: null,
      replacement: [],
      removalVersion: V4_REMOVAL_VERSION,
      docs: LEGACY_DOCS_PATH,
      reason: "",
    };
  }
  const removed = entry.replacement === null;
  return {
    command,
    isLegacy: true,
    removed,
    replacementCommand: entry.replacement,
    replacement: entry.replacement ? [entry.replacement, ...rest] : [],
    removalVersion: V4_REMOVAL_VERSION,
    docs: LEGACY_DOCS_PATH,
    reason: entry.reason,
  };
}

/**
 * One deterministic deprecation banner: exactly one replacement command (or an explicit "no direct
 * replacement"), the v5 removal notice, and the migration doc link.
 */
export function formatDeprecationNotice(result: MapLegacyResult): string {
  const head = `kage ${result.command} is deprecated in ${V4_VERSION} and will be removed in ${result.removalVersion}.`;
  const replacement = result.replacementCommand
    ? `Use \`kage ${result.replacementCommand}\` instead.`
    : `There is no direct replacement (${result.reason}). It remains callable via \`kage legacy ${result.command}\` until ${result.removalVersion}.`;
  const docs = `See ${result.docs}.`;
  return `${head} ${replacement} ${docs}`;
}

export interface RecordLegacyUsageOptions {
  homeDir?: string;
  version?: string;
  now?: () => string;
}

function legacyHome(homeDir?: string): string {
  if (homeDir) return homeDir;
  if (process.env.KAGE_HOME) return process.env.KAGE_HOME;
  return join(homedir(), ".kage");
}

/**
 * Record a deprecated invocation locally. Stores ONLY the command name + version + timestamp — never
 * arguments (which may contain private paths or query text). Fail-open: never throws.
 */
export function recordLegacyUsage(command: string, opts: RecordLegacyUsageOptions = {}): void {
  try {
    const dir = legacyHome(opts.homeDir);
    mkdirSync(dir, { recursive: true });
    const entry = {
      command,
      version: opts.version ?? V4_VERSION,
      at: (opts.now ?? (() => new Date().toISOString()))(),
    };
    appendFileSync(join(dir, "legacy-usage.jsonl"), JSON.stringify(entry) + "\n", "utf8");
  } catch {
    // Telemetry is best-effort; a deprecated command must still run when the log cannot be written.
  }
}

export interface LegacyUsageHit {
  /** Repo-relative file path (posix-style separators). */
  file: string;
  /** 1-indexed line number. */
  line: number;
  /** The legacy command found. */
  command: string;
  /** The supported replacement verb, or undefined when the command is removed. */
  replacement?: string;
  /** True when the command is removed with no direct replacement. */
  removed: boolean;
}

const SCAN_EXTENSIONS = new Set([".sh", ".bash", ".zsh", ".json", ".yml", ".yaml", ".toml", ".mjs", ".cjs", ".js", ".ts", ".md", ".txt", ""]);
const SCAN_SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "coverage", ".agent_memory"]);

/**
 * Scan scripts/config under `root` for invocations of legacy commands (`kage <legacy-command>`), so the
 * migration report can name every file that still calls a deprecated command. Deterministic and
 * self-contained; skips vendored/build directories and binary-ish extensions.
 */
export function scanLegacyCommandUsage(root: string): LegacyUsageHit[] {
  const hits: LegacyUsageHit[] = [];
  // Build one alternation of all legacy command names, longest first so `memory-timeline` wins over a
  // hypothetical `memory`. Matches `kage <cmd>` at a word boundary.
  const names = Object.keys(LEGACY_COMMANDS).sort((a, b) => b.length - a.length).map(escapeRegExp);
  const pattern = new RegExp(`\\bkage\\s+(${names.join("|")})(?=\\s|$|["'])`, "g");

  const walk = (dir: string): void => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      const full = join(dir, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        if (SCAN_SKIP_DIRS.has(name)) continue;
        walk(full);
        continue;
      }
      const dot = name.lastIndexOf(".");
      const ext = dot >= 0 ? name.slice(dot) : "";
      if (!SCAN_EXTENSIONS.has(ext)) continue;
      let content: string;
      try {
        content = readFileSync(full, "utf8");
      } catch {
        continue;
      }
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i += 1) {
        pattern.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = pattern.exec(lines[i])) !== null) {
          const command = m[1];
          const entry = LEGACY_COMMANDS[command];
          hits.push({
            file: relative(root, full).split(sep).join("/"),
            line: i + 1,
            command,
            replacement: entry.replacement ?? undefined,
            removed: entry.replacement === null,
          });
        }
      }
    }
  };

  walk(root);
  hits.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file < b.file ? -1 : 1));
  return hits;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Keep the SUPPORTED_V4_VERBS invariant honest at module load: no mapping may point at a non-supported verb.
for (const [command, entry] of Object.entries(LEGACY_COMMANDS)) {
  if (entry.replacement && !SUPPORTED_V4_VERBS.has(entry.replacement)) {
    throw new Error(`legacy-command-map: ${command} maps to unsupported verb ${entry.replacement}`);
  }
}
