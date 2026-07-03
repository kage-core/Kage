// kage check — deterministic drift checker for agent-context files.
//
// Verifies mechanically-checkable claims in the files agents are told to trust
// (CLAUDE.md, AGENTS.md, .cursor/rules, README, docs/) against the code they
// describe. Three buckets, all counts of reproducible checks — never estimates:
//   confirmed    claim checked and false (two-sided evidence: doc line + ground truth)
//   verified     claim checked and true
//   unverifiable claim of a supported type we could not check (with the reason)
//
// Precision-first: a false positive costs more trust than a missed finding, so
// every extractor errs toward the unverifiable bucket when context suggests the
// claim might be hypothetical (placeholders, "e.g.", build artifacts).
//
// Deliberately independent of the code graph and memory store: `kage check`
// must run on any repo in seconds and leave nothing behind.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export interface CheckClaim {
  type: "path" | "npm-script" | "make-target" | "cli-subcommand";
  doc: string;
  line: number;
  claim: string;
  evidence: string;
  fix_hint?: string;
  /** Set in --base mode: confirmed drift that predates the diff (suppressed from output/exit). */
  preexisting?: boolean;
}

export interface CheckReport {
  schema_version: 1;
  project_dir: string;
  checked_at: string;
  base: string | null;
  head: string | null;
  totals: {
    confirmed: number;
    verified: number;
    unverifiable: number;
    suppressed_preexisting: number;
    suppressed_baseline: number;
  };
  confirmed: CheckClaim[];
  verified: CheckClaim[];
  unverifiable: CheckClaim[];
  docs_scanned: string[];
}

const CHECK_PATH_EXTENSIONS = "ts|tsx|js|jsx|mjs|cjs|json|md|yml|yaml|toml|py|rb|go|rs|java|kt|sh|bash|css|scss|html|sql|proto|graphql|c|h|cpp|hpp|cs|txt";
const SHELL_FENCES = new Set(["bash", "sh", "shell", "zsh", "console", "terminal"]);
// Missing paths under build-output dirs are usually "run the built artifact"
// instructions, not lies about the tree.
const BUILD_DIR_RE = /^(?:\.\/)?(dist|build|out|output|target|coverage|\.next|node_modules)\//;
// Planning/spec/design/release/research docs describe intended, past, or
// investigated states — not assertions about the current tree.
const ASPIRATIONAL_DOC_RE = /(^|\/)(plans?|proposals?|rfcs?|roadmaps?|archive[sd]?|changelog|specs?|designs?|releases?|research)([/._-]|\.md$)|(plan|design|proposal|spec|research)[^/]*\.md$/i;
// "read X (or find the checklist if missing)" — the doc hedges its own claim.
const HEDGED_RE = /if (it'?s )?(missing|present|absent|available)|may not exist|if it exists|when present/i;
// "ENV_VAR/some/path" cites a location through a variable, not a repo path.
const ENV_PREFIX_RE = /^[A-Z][A-Z0-9_]{2,}$/;
// Well-known runtime/user-data roots: absence from the tree proves nothing.
const RUNTIME_ROOT_RE = /^(appdata|userdata|home|tmp|temp|var|localappdata)$/i;
// Lines that read as illustration, not assertion. (No trailing \b: "e.g." and
// "example:" end in non-word chars, where \b before a space can never match.)
const HYPOTHETICAL_RE = /\b(e\.g\.|for example|for instance|such as|example:|hypothetical|imagine|suppose|would look like|might look like)/i;
const PLACEHOLDER_SEGMENT_RE = /^(foo|bar|baz|qux|example|sample|my|your|some|new|path|to)([-_.].*)?$/i;
const CAMEL_PLACEHOLDER_RE = /^(My|Your|Some|Example)[A-Z]/;
// `make <word>` in prose is usually English ("make sure"); these never count.
const MAKE_STOPWORDS = new Set(["sure", "it", "a", "an", "the", "this", "that", "your", "any", "all", "changes", "use", "them", "sense", "and", "or"]);
const CLI_SUB_STOPWORDS = new Set(["help", "version"]);

function safeRead(path: string): string | null {
  try {
    const stats = statSync(path);
    if (!stats.isFile() || stats.size > 2 * 1024 * 1024) return null;
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function git(projectDir: string, args: string[]): string | null {
  try {
    return execFileSync("git", args, { cwd: projectDir, encoding: "utf8", timeout: 15000, stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

function gitIgnored(projectDir: string, candidate: string): boolean {
  return git(projectDir, ["check-ignore", "-q", candidate]) !== null;
}

// --- discovery -------------------------------------------------------------

const CONTEXT_FILE_CANDIDATES = [
  "CLAUDE.md", "AGENTS.md", "GEMINI.md", ".cursorrules", ".windsurfrules",
  ".github/copilot-instructions.md", "README.md", "readme.md", "Readme.md", "CONTRIBUTING.md",
];

function discoverContextFiles(projectDir: string): string[] {
  const files: string[] = [];
  const seen = new Set<string>();
  const push = (rel: string) => {
    const lower = rel.toLowerCase();
    if (seen.has(lower)) return;
    seen.add(lower);
    files.push(rel);
  };
  for (const candidate of CONTEXT_FILE_CANDIDATES) {
    if (existsSync(join(projectDir, candidate))) push(candidate);
  }
  const rulesDir = join(projectDir, ".cursor", "rules");
  try {
    for (const name of readdirSync(rulesDir).filter((entry) => /\.(md|mdc)$/.test(entry)).sort().slice(0, 30)) {
      push(join(".cursor", "rules", name));
    }
  } catch { /* no cursor rules */ }
  // docs/**/*.md, bounded: depth 3, 200 files total.
  const walk = (relDir: string, depth: number) => {
    if (depth > 3 || files.length >= 200) return;
    let entries: string[];
    try {
      entries = readdirSync(join(projectDir, relDir)).sort();
    } catch {
      return;
    }
    for (const entry of entries) {
      if (files.length >= 200) return;
      const rel = join(relDir, entry);
      if (ASPIRATIONAL_DOC_RE.test(rel)) continue; // plans/RFCs/archives describe futures or pasts
      let stats;
      try { stats = statSync(join(projectDir, rel)); } catch { continue; }
      if (stats.isDirectory()) walk(rel, depth + 1);
      else if (entry.endsWith(".md")) push(rel);
    }
  };
  walk("docs", 1);
  return files;
}

interface DocLine { doc: string; line: number; text: string; fence: string | null }

function collectDocLines(projectDir: string, docs: string[]): DocLine[] {
  const lines: DocLine[] = [];
  for (const doc of docs) {
    const text = safeRead(join(projectDir, doc));
    if (!text) continue;
    let fence: string | null = null;
    text.split(/\r?\n/).forEach((line, index) => {
      const fenceMatch = line.match(/^\s*(?:```|~~~)\s*([A-Za-z0-9_-]*)/);
      if (fenceMatch) {
        fence = fence === null ? (fenceMatch[1] || "text").toLowerCase() : null;
        return;
      }
      lines.push({ doc, line: index + 1, text: line, fence });
    });
  }
  return lines;
}

// --- ground truth ----------------------------------------------------------

interface GroundTruth {
  scripts: Record<string, string>;
  nestedScriptFiles: Array<{ path: string; scripts: Record<string, string> }>;
  packageJsonPresent: boolean;
  packageJsonParsed: boolean;
  binNames: string[];
  makeTargets: Set<string> | null; // null = no Makefile
  makefileHasInclude: boolean;
  cliSourceText: string;
  cliSourcePaths: string[];
  repoFiles: string[] | null; // git ls-files, for did-you-mean; null when not a git repo
}

function parseScripts(text: string | null): { scripts: Record<string, string>; bin: string[]; workspaces: boolean; parsed: boolean } {
  if (!text) return { scripts: {}, bin: [], workspaces: false, parsed: false };
  try {
    const parsed = JSON.parse(text) as { scripts?: Record<string, string>; bin?: string | Record<string, string>; name?: string; workspaces?: unknown };
    const bin = typeof parsed.bin === "string" ? [parsed.name ?? ""].filter(Boolean) : Object.keys(parsed.bin ?? {});
    return { scripts: parsed.scripts ?? {}, bin, workspaces: Boolean(parsed.workspaces), parsed: true };
  } catch {
    return { scripts: {}, bin: [], workspaces: false, parsed: false };
  }
}

function loadGroundTruth(projectDir: string): GroundTruth {
  const packageJsonText = safeRead(join(projectDir, "package.json"));
  const root = parseScripts(packageJsonText);

  // Monorepos run scripts from nested packages; a root miss is not a lie if a
  // workspace defines the script. Bounded walk, node_modules excluded.
  const nestedScriptFiles: Array<{ path: string; scripts: Record<string, string> }> = [];
  const repoFilesRaw = git(projectDir, ["ls-files", "--", "*package.json"]);
  if (repoFilesRaw) {
    for (const rel of repoFilesRaw.split("\n").filter((p) => p && p !== "package.json" && !p.includes("node_modules/")).slice(0, 50)) {
      const nested = parseScripts(safeRead(join(projectDir, rel)));
      if (nested.parsed && Object.keys(nested.scripts).length) nestedScriptFiles.push({ path: rel, scripts: nested.scripts });
    }
  }

  const makefileText = safeRead(join(projectDir, "Makefile")) ?? safeRead(join(projectDir, "makefile"));
  let makeTargets: Set<string> | null = null;
  let makefileHasInclude = false;
  if (makefileText) {
    makeTargets = new Set();
    for (const raw of makefileText.split(/\r?\n/)) {
      if (/^\s*-?include\s/.test(raw)) makefileHasInclude = true;
      const target = raw.match(/^([A-Za-z0-9_./-]+)\s*:(?!=)/);
      if (target) makeTargets.add(target[1]);
      const phony = raw.match(/^\.PHONY\s*:\s*(.+)$/);
      if (phony) for (const name of phony[1].split(/\s+/)) if (name) makeTargets.add(name);
    }
  }

  // CLI dispatch strings live in cli/bin/commands-looking files. Cheap bounded
  // walk — no code graph, so `check` can run cold on a foreign repo.
  const cliSourcePaths: string[] = [];
  if (root.bin.length) {
    const roots = ["", "src", "lib", "mcp", "packages"];
    const looksCli = (name: string) => /^(cli|bin|commands?|main)[^/]*\.(ts|js|mjs|cjs|tsx|py|go|rs)$/i.test(name);
    for (const base of roots) {
      let entries: string[];
      try { entries = readdirSync(join(projectDir, base || ".")); } catch { continue; }
      for (const entry of entries) {
        const rel = base ? join(base, entry) : entry;
        try {
          const stats = statSync(join(projectDir, rel));
          if (stats.isFile() && looksCli(entry)) cliSourcePaths.push(rel);
          else if (stats.isDirectory() && /^(cli|bin|commands)$/i.test(entry)) {
            for (const sub of readdirSync(join(projectDir, rel)).slice(0, 30)) {
              const subRel = join(rel, sub);
              try { if (statSync(join(projectDir, subRel)).isFile()) cliSourcePaths.push(subRel); } catch { /* skip */ }
            }
          }
        } catch { /* skip */ }
        if (cliSourcePaths.length >= 30) break;
      }
      if (cliSourcePaths.length >= 30) break;
    }
  }
  const cliSourceText = cliSourcePaths.slice(0, 30).map((rel) => safeRead(join(projectDir, rel)) ?? "").join("\n");

  const lsFiles = git(projectDir, ["ls-files"]);
  return {
    scripts: root.scripts,
    nestedScriptFiles,
    packageJsonPresent: packageJsonText !== null,
    packageJsonParsed: root.parsed,
    binNames: root.bin,
    makeTargets,
    makefileHasInclude,
    cliSourceText,
    cliSourcePaths,
    repoFiles: lsFiles ? lsFiles.split("\n").filter(Boolean) : null,
  };
}

// --- extraction + verification ----------------------------------------------

function pathCandidates(line: string): string[] {
  const candidates = new Set<string>();
  for (const match of line.matchAll(/`([^`\n]+)`/g)) {
    const token = match[1].trim();
    if (new RegExp(`^(?:\\./)?[\\w.-]+(?:/[\\w.-]+)+\\.(?:${CHECK_PATH_EXTENSIONS})$`).test(token)) candidates.add(token.replace(/^\.\//, ""));
    // Backticked directory refs ("`src/components/`") are claims too; the
    // trailing slash marks them as deliberate. Single-segment names ("`packets/`")
    // are skipped: they usually describe a subdir of something named earlier in
    // the doc (a tree listing), so root-relative existence would misfire.
    if (/^(?:\.\/)?[\w.-]+(?:\/[\w.-]+)+\/$/.test(token)) candidates.add(token.replace(/^\.\//, ""));
  }
  for (const match of line.matchAll(new RegExp(`(?:^|[\\s("'\\[])((?:\\./)?[\\w.-]+(?:/[\\w.-]+)+\\.(?:${CHECK_PATH_EXTENSIONS}))(?=$|[\\s)"'\\],.:;])`, "g"))) {
    candidates.add(match[1].replace(/^\.\//, ""));
  }
  // "./foo.json" sneaks past the two-segment requirement because "." matches
  // [\w.-]+ — and root-level single names are usually runtime files passed as
  // arguments. Keep only real multi-segment paths, plus the handful of
  // well-known root docs that are unambiguous.
  const KNOWN_ROOT_DOC_RE = /^(CONTRIBUTING|CHANGELOG|LICENSE|README|SECURITY|CODE_OF_CONDUCT)\.(md|txt)$/i;
  return [...candidates]
    .map((candidate) => candidate.replace(/^\.\//, ""))
    .filter((candidate) => candidate.includes("/") || KNOWN_ROOT_DOC_RE.test(candidate))
    .filter((candidate) =>
      !/[*<>{}$\\]/.test(candidate)
      && !candidate.startsWith("http")
      && !candidate.includes("node_modules")
      && !candidate.startsWith(".agent_memory"));
}

function backtickSegments(line: string): string[] {
  return [...line.matchAll(/`([^`\n]+)`/g)].map((match) => match[1]);
}

export function driftCheck(projectDir: string, options: { base?: string | null } = {}): CheckReport {
  const docs = discoverContextFiles(projectDir);
  const docLines = collectDocLines(projectDir, docs);
  const truth = loadGroundTruth(projectDir);
  const head = git(projectDir, ["rev-parse", "--short", "HEAD"]);

  const confirmed: CheckClaim[] = [];
  const verified: CheckClaim[] = [];
  const unverifiable: CheckClaim[] = [];
  const seen = new Set<string>();
  const once = (key: string): boolean => {
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  };

  for (const entry of docLines) {
    const inShellFence = entry.fence !== null && SHELL_FENCES.has(entry.fence);
    const hypothetical = HYPOTHETICAL_RE.test(entry.text);

    // 1. path-ref: prose only — fenced content is sample output, not claims.
    if (entry.fence === null) {
      for (const candidate of pathCandidates(entry.text)) {
        // "src/x.ts" and "../../src/x.ts" in the same doc are one claim.
        if (!once(`path:${candidate.replace(/^(\.\.\/)+/, "")}`)) continue;
        const resolves = existsSync(join(projectDir, candidate)) || existsSync(join(projectDir, dirname(entry.doc), candidate));
        const claim = { type: "path" as const, doc: entry.doc, line: entry.line, claim: candidate };
        if (resolves) {
          verified.push({ ...claim, evidence: "file exists" });
          continue;
        }
        if (BUILD_DIR_RE.test(candidate)) {
          unverifiable.push({ ...claim, evidence: "build artifact path — existence depends on running a build, not on the tree" });
          continue;
        }
        if (hypothetical || candidate.split("/").some((segment) => PLACEHOLDER_SEGMENT_RE.test(segment) || CAMEL_PLACEHOLDER_RE.test(segment))) {
          unverifiable.push({ ...claim, evidence: "reads as an illustrative/placeholder path, not an assertion" });
          continue;
        }
        if (ENV_PREFIX_RE.test(candidate.split("/")[0]) || RUNTIME_ROOT_RE.test(candidate.split("/")[0])) {
          unverifiable.push({ ...claim, evidence: "path is anchored on an env-var or runtime data root, not the repo tree" });
          continue;
        }
        // git knows which paths are created at runtime: if the path is ignored,
        // its absence from a fresh checkout proves nothing.
        if (gitIgnored(projectDir, candidate)) {
          unverifiable.push({ ...claim, evidence: "path is gitignored — created at runtime, not tracked in the tree" });
          continue;
        }
        if (HEDGED_RE.test(entry.text)) {
          unverifiable.push({ ...claim, evidence: "the doc line itself hedges the claim (\"if missing\"-style)" });
          continue;
        }
        // Docs often cite paths relative to a package dir, not the repo root
        // (and links sometimes carry a wrong ../ depth for a file that exists).
        if (truth.repoFiles) {
          const bare = candidate.replace(/^(\.\.\/)+/, "").replace(/\/$/, "");
          const suffixMatches = truth.repoFiles.filter((file) => file.endsWith(`/${bare}`) || file.includes(`/${bare}/`));
          if (suffixMatches.length) {
            verified.push({ ...claim, evidence: `exists as ${suffixMatches[0]}${suffixMatches.length > 1 ? ` (+${suffixMatches.length - 1} more)` : ""} — cited relative to a package dir` });
            continue;
          }
        }
        // A real namespace with a missing leaf is drift; a wholly absent
        // top-level dir usually means the path lives out of tree (a consumer
        // repo the tool installs into, a sibling repo, or a runtime dir).
        const normalized = candidate.replace(/^(\.\.\/)+/, "");
        const topSegment = normalized.split("/")[0];
        if (normalized.includes("/") && !existsSync(join(projectDir, topSegment)) && !existsSync(join(projectDir, dirname(entry.doc), candidate.split("/")[0]))) {
          unverifiable.push({ ...claim, evidence: `top-level \`${topSegment}/\` does not exist in this tree — path likely refers outside the repo (installed location, sibling repo, or runtime dir)` });
          continue;
        }
        let evidence = "file does not exist in the tree";
        const deleted = git(projectDir, ["log", "--diff-filter=D", "--format=%h %cs", "-n", "1", "--", candidate]);
        if (deleted) evidence += ` — deleted in ${deleted.split(" ")[0]} (${deleted.split(" ")[1]})`;
        let fixHint: string | undefined;
        if (truth.repoFiles) {
          const base = candidate.split("/").pop() ?? candidate;
          const sameName = truth.repoFiles.filter((file) => file.endsWith(`/${base}`) || file === base);
          if (sameName.length === 1) fixHint = `did you mean ${sameName[0]}?`;
        }
        confirmed.push({ ...claim, evidence, ...(fixHint ? { fix_hint: fixHint } : {}) });
      }
    }

    // 2. npm-script-ref: prose and shell fences (a quoted command is a claim).
    if (entry.fence === null || inShellFence) {
      for (const match of entry.text.matchAll(/\b(?:npm|pnpm) run ([A-Za-z0-9:_.-]+)/g)) {
        const script = match[1];
        if (!once(`script:${script}`)) continue;
        const claim = { type: "npm-script" as const, doc: entry.doc, line: entry.line, claim: `npm run ${script}` };
        if (truth.scripts[script]) {
          verified.push({ ...claim, evidence: `"${script}" defined in package.json` });
          continue;
        }
        const nested = truth.nestedScriptFiles.find((pkg) => pkg.scripts[script]);
        if (nested) {
          verified.push({ ...claim, evidence: `"${script}" defined in ${nested.path}` });
          continue;
        }
        if (!truth.packageJsonPresent && !truth.nestedScriptFiles.length) {
          unverifiable.push({ ...claim, evidence: truth.repoFiles ? "no package.json anywhere in the repo" : "no root package.json and not a git repo — nested packages unknown" });
          continue;
        }
        if (truth.packageJsonPresent && !truth.packageJsonParsed) {
          unverifiable.push({ ...claim, evidence: "package.json could not be parsed" });
          continue;
        }
        // "cd x && npm run y" targets a directory we didn't resolve.
        if (/\bcd\s+\S+/.test(entry.text) || hypothetical) {
          unverifiable.push({ ...claim, evidence: /\bcd\s/.test(entry.text) ? "command runs after a cd — target package not resolved" : "reads as an illustrative command" });
          continue;
        }
        const available = Object.keys(truth.scripts);
        const where = truth.packageJsonPresent ? `package.json${truth.nestedScriptFiles.length ? ` or ${truth.nestedScriptFiles.length} workspace package.json file(s)` : ""}` : `any of ${truth.nestedScriptFiles.length} package.json file(s)`;
        const shown = available.slice(0, 8).join(", ") + (available.length > 8 ? ", …" : "");
        confirmed.push({ ...claim, evidence: `no "${script}" script in ${where}${available.length ? ` (root scripts: ${shown})` : ""}` });
      }
    }

    // 3. make-target-ref: shell fences, or backticked in prose — bare `make X`
    // in prose is usually English ("make sure").
    if (truth.makeTargets) {
      const segments = inShellFence ? [entry.text] : backtickSegments(entry.text);
      for (const segment of segments) {
        for (const match of segment.matchAll(/\bmake ([A-Za-z0-9_./-]+)/g)) {
          const target = match[1];
          if (MAKE_STOPWORDS.has(target.toLowerCase()) || /[$=]/.test(target)) continue;
          if (!once(`make:${target}`)) continue;
          const claim = { type: "make-target" as const, doc: entry.doc, line: entry.line, claim: `make ${target}` };
          if (truth.makeTargets.has(target)) {
            verified.push({ ...claim, evidence: "target defined in Makefile" });
          } else if (truth.makefileHasInclude) {
            unverifiable.push({ ...claim, evidence: "Makefile uses include; target may be defined in an included file" });
          } else if (hypothetical) {
            unverifiable.push({ ...claim, evidence: "reads as an illustrative command" });
          } else {
            confirmed.push({ ...claim, evidence: `no "${target}" target in Makefile` });
          }
        }
      }
    }

    // 4. cli-subcommand-ref: backticked `<bin> <sub>` vs dispatch strings.
    if (truth.binNames.length && (entry.fence === null || inShellFence)) {
      const segments = inShellFence ? [entry.text] : backtickSegments(entry.text);
      for (const bin of truth.binNames) {
        for (const segment of segments) {
          for (const match of segment.matchAll(new RegExp(`(?:^|[\\s;&|])${bin} ([a-z][a-z0-9-]+)`, "g"))) {
            const sub = match[1];
            if (CLI_SUB_STOPWORDS.has(sub)) continue;
            if (!once(`cli:${bin}:${sub}`)) continue;
            const claim = { type: "cli-subcommand" as const, doc: entry.doc, line: entry.line, claim: `${bin} ${sub}` };
            if (!truth.cliSourceText) {
              unverifiable.push({ ...claim, evidence: "no CLI dispatch source found to check against" });
            } else if (truth.cliSourceText.includes(`"${sub}"`) || truth.cliSourceText.includes(`'${sub}'`)) {
              verified.push({ ...claim, evidence: `dispatch string found in CLI source` });
            } else if (hypothetical) {
              unverifiable.push({ ...claim, evidence: "reads as an illustrative command" });
            } else {
              confirmed.push({ ...claim, evidence: `no "${sub}" dispatch string in CLI source (${truth.cliSourcePaths.slice(0, 3).join(", ")})` });
            }
          }
        }
      }
    }
  }

  // --base mode: only drift attributable to the diff counts. Everything else
  // is real but preexisting — visible in --json, silent in the gate.
  let suppressedPreexisting = 0;
  const base = options.base ?? null;
  if (base) {
    const diffRaw = git(projectDir, ["diff", "--name-status", `${base}...HEAD`]) ?? git(projectDir, ["diff", "--name-status", `${base}..HEAD`]);
    if (diffRaw === null) throw new Error(`git diff against base "${base}" failed — is it a valid ref?`);
    const changed = new Set(diffRaw.split("\n").map((row) => row.split("\t").pop() ?? "").filter(Boolean));
    const anyChanged = (predicate: (path: string) => boolean) => [...changed].some(predicate);
    for (const finding of confirmed) {
      const attributable =
        changed.has(finding.doc)
        || (finding.type === "path" && changed.has(finding.claim))
        || (finding.type === "npm-script" && anyChanged((path) => path.endsWith("package.json")))
        || (finding.type === "make-target" && anyChanged((path) => /(^|\/)[Mm]akefile$/.test(path)))
        || (finding.type === "cli-subcommand" && truth.cliSourcePaths.some((path) => changed.has(path)));
      if (!attributable) {
        finding.preexisting = true;
        suppressedPreexisting += 1;
      }
    }
  }

  // Baseline: previously accepted findings don't gate. Keys skip line numbers
  // so docs can move without re-triggering.
  let suppressedBaseline = 0;
  const baseline = readCheckBaseline(projectDir);
  if (baseline) {
    for (const finding of confirmed) {
      if (!finding.preexisting && baseline.has(claimKey(finding))) {
        finding.preexisting = true; // reuse the suppression channel
        suppressedBaseline += 1;
      }
    }
  }

  const active = confirmed.filter((finding) => !finding.preexisting);
  return {
    schema_version: 1,
    project_dir: projectDir,
    checked_at: new Date().toISOString(),
    base,
    head,
    totals: {
      confirmed: active.length,
      verified: verified.length,
      unverifiable: unverifiable.length,
      suppressed_preexisting: suppressedPreexisting,
      suppressed_baseline: suppressedBaseline,
    },
    confirmed,
    verified,
    unverifiable,
    docs_scanned: docs,
  };
}

// --- baseline ----------------------------------------------------------------

function claimKey(claim: CheckClaim): string {
  return `${claim.type}:${claim.doc}:${claim.claim}`;
}

function baselinePath(projectDir: string): string {
  return join(projectDir, ".agent_memory", "check-baseline.json");
}

function readCheckBaseline(projectDir: string): Set<string> | null {
  const text = safeRead(baselinePath(projectDir));
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as { keys?: string[] };
    return new Set(parsed.keys ?? []);
  } catch {
    return null;
  }
}

export function writeCheckBaseline(projectDir: string, report: CheckReport): string {
  const keys = report.confirmed.map(claimKey).sort();
  mkdirSync(join(projectDir, ".agent_memory"), { recursive: true });
  writeFileSync(baselinePath(projectDir), `${JSON.stringify({ schema_version: 1, written_at: new Date().toISOString(), keys }, null, 2)}\n`, "utf8");
  return baselinePath(projectDir);
}

// --- formatters ----------------------------------------------------------------

export function formatCheckReport(report: CheckReport): string {
  const lines: string[] = [];
  const total = report.totals.confirmed + report.totals.verified + report.totals.unverifiable;
  const against = report.base ? `changes since ${report.base}` : (report.head ? `commit ${report.head}` : "working tree");
  lines.push(`kage check — ${total} claims checked against ${against}`);
  if (!report.docs_scanned.length) {
    lines.push("no agent-context or doc files found (looked for CLAUDE.md, AGENTS.md, .cursor/rules, README, docs/).");
    return lines.join("\n");
  }
  const active = report.confirmed.filter((finding) => !finding.preexisting);
  if (active.length) {
    lines.push("");
    for (const finding of active) {
      lines.push(`  ${finding.doc}:${finding.line}  says \`${finding.claim}\` — reality: ${finding.evidence}`);
      if (finding.fix_hint) lines.push(`    ${finding.fix_hint}`);
    }
  }
  lines.push("");
  lines.push(`confirmed drift: ${report.totals.confirmed} · verified true: ${report.totals.verified} · unverifiable: ${report.totals.unverifiable}`);
  if (report.totals.suppressed_baseline) lines.push(`baseline: ${report.totals.suppressed_baseline} known finding(s) suppressed`);
  if (report.base && report.totals.suppressed_preexisting) lines.push(`preexisting: ${report.totals.suppressed_preexisting} finding(s) predate ${report.base} (see --json)`);
  return lines.join("\n");
}

export function checkReportMarkdown(report: CheckReport): string {
  const active = report.confirmed.filter((finding) => !finding.preexisting);
  const lines: string[] = [];
  lines.push(`### kage check — agent-context drift`);
  lines.push("");
  if (!active.length) {
    lines.push(`No new drift: ${report.totals.verified} claim(s) verified true, 0 broken${report.base ? ` by changes since \`${report.base}\`` : ""}.`);
    return lines.join("\n");
  }
  lines.push(`This ${report.base ? "diff breaks" : "repo has"} **${active.length}** documented claim(s):`);
  lines.push("");
  lines.push("| file | claim | reality |");
  lines.push("|---|---|---|");
  for (const finding of active) {
    lines.push(`| ${finding.doc}:${finding.line} | \`${finding.claim.replace(/\|/g, "\\|")}\` | ${finding.evidence.replace(/\|/g, "\\|")}${finding.fix_hint ? ` — ${finding.fix_hint}` : ""} |`);
  }
  lines.push("");
  lines.push(`_confirmed ${report.totals.confirmed} · verified ${report.totals.verified} · unverifiable ${report.totals.unverifiable} — every number is a reproducible check, not an estimate._`);
  return lines.join("\n");
}

// --- CI template ----------------------------------------------------------------

export function kageCheckWorkflowYaml(): string {
  return `name: kage check
on: pull_request
permissions:
  contents: read
  pull-requests: write
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: kage check
        id: check
        run: |
          set +e
          npx -y @kage-core/kage-graph-mcp check --project . --base "origin/\${GITHUB_BASE_REF}" --md > kage-check.md
          echo "exit=$?" >> "$GITHUB_OUTPUT"
          cat kage-check.md
      - name: comment on drift
        if: steps.check.outputs.exit == '1'
        env:
          GH_TOKEN: \${{ github.token }}
        run: gh pr comment "\${{ github.event.pull_request.number }}" --body-file kage-check.md --edit-last --create-if-none || gh pr comment "\${{ github.event.pull_request.number }}" --body-file kage-check.md
      - name: gate
        run: exit "\${{ steps.check.outputs.exit }}"
`;
}
