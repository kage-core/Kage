#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { daemonDoctor, readDaemonStatus, startDaemon, startViewer, stopDaemon } from "./daemon.js";
import {
  connectProject,
  downProject,
  renderConnect,
  renderDown,
  renderReceipts,
  renderStatus,
  renderUp,
  runtimeClientFor,
  runtimeDownFrom,
  runWithProxy,
  startProxyDaemon,
  upProject,
  vnextReceipts,
  vnextStatus,
} from "./vnext/runtime/commands.js";
import {
  SETUP_AGENTS,
  auditClaudeMemStore,
  auditProject,
  defaultClaudeMemStorePath,
  renderClaudeMemAuditReceipt,
  benchmarkTaskComparison,
  benchmarkSavings,
  teamMemoryReport,
  writeTeamLink,
  readTeamLink,
  benchmarkCodingMemoryQuality,
  benchmarkMemoryScale,
  benchmarkTrust,
  buildEmbeddingIndex,
  approvePending,
  benchmarkProject,
  buildBranchOverlay,
  buildCodeGraph,
  buildKnowledgeGraph,
  buildStructuralIndex,
  capture,
  changelog,
  createReviewArtifact,
  createPublicCandidate,
  distillSession,
  doctorProject,
  ensureTreeSitterLanguages,
  exportPublicBundle,
  graphMermaid,
  initProject,
  indexProject,
  installAgentPolicy,
  kageCleanupCandidates,
  kageCapabilityAudit,
  kageContext,
  kageFetchPublicGraphNode,
  kageListPublicDomains,
  kageSearchPublicGraph,
  kageSessionLearningLedger,
  KAGE_WORKFLOW_TEXT,
  kageContributors,
  kageContextSlots,
  kageDecisionIntelligence,
  deleteContextSlot,
  kageDependencyPath,
  kageFileContext,
  kageGraphInsights,
  kageHookInstall,
  kageHookStatus,
  kageHookUninstall,
  kageRisk,
  kageMemoryAccess,
  kageActivity,
  kageMemoryAudit,
  kageMemoryHandoff,
  kageMemoryLifecycle,
  kageMemoryLineage,
  kageMemoryReconciliation,
  kageMemoryTimeline,
  kageLayers,
  kageMetrics,
  kageModuleHealth,
  kageProjectProfile,
  kageRepoXray,
  kageWorkspace,
  kageWorkspaceRecall,
  kageResume,
  kageReviewerSuggestions,
  kageSessionCaptureReport,
  kageSessionReplay,
  learn,
  learnPersonal,
  memoryInbox,
  mergePacketFiles,
  PACKET_MERGE_DRIVER_CONFIG,
  loadPendingPackets,
  MEMORY_TYPES,
  WORK_STAGES,
  observe,
  minimalChangeReport,
  prCheck,
  prSummarize,
  proposeFromDiff,
  qualityReport,
  queryCodeGraph,
  queryGraph,
  recall,
  recallWithEmbeddings,
  searchDocs,
  docsRecallSection,
  recordFeedback,
  reverifyMemory,
  generateSkills,
  remediationFor,
  repairProject,
  gcProject,
  compactProject,
  verifyCitations,
  kageSuppressedMemory,
  runDemo,
  refreshProject,
  rejectPending,
  registryRecommendations,
  setupAgent,
  generatePluginHooks,
  setupDoctor,
  setContextSlot,
  staleCatch,
  formatStaleCatch,
  supersedeMemory,
  transitionWorkStage,
  claimWorkItem,
  linkImplements,
  listWorkItems,
  loadApprovedPackets,
  gitUserName,
  kageConflicts,
  syncPersonal,
  syncSetup,
  syncStatus,
  truthReport,
  truthScorecardSvg,
  truthScorecardMarkdown,
  validateProject,
  valueSummary,
  bootstrapStarterMemory,
  teamValueReport,
  formatTokenCount,
  formatValueGains,
  formatRecallValueReceipt,
  verifyAgentActivation,
  writeCodeIndex,
  type CaptureInput,
  type ContradictionFinding,
  type MemoryType,
  type ObservationEvent,
  type SetupAgent,
  type WorkStage,
  type WorkStageTransitionResult,
} from "./kernel.js";
import { buildGraphRegistryManifest } from "./graph-registry.js";
import { checkReportMarkdown, driftCheck, formatCheckReport, kageCheckWorkflowYaml, writeCheckBaseline } from "./check.js";
import { lintOkfBundle, loadOkfConcepts, migratePacketsToOkf, okfBundleDir, okfViewerHtml } from "./okf.js";
import { probeAssistStorage, startProxy } from "./proxy.js";
import { startCloudServer } from "./cloud-server.js";
import { cloudCreateTeam, cloudInvite, cloudPush, cloudPull, cloudList, cloudReview } from "./cloud-client.js";
import {
  isLegacyCommand,
  mapLegacyCommand,
  formatDeprecationNotice,
  recordLegacyUsage,
  renderLegacyHelp,
  scanLegacyCommandUsage,
} from "./vnext/migration/legacy-command-map.js";

const CORE_USAGE = `Kage — code-grounded memory for coding agents

The v4 surface (portal + workspace):
  kage connect --project <dir>               attach the vNext runtime + adapters in audit mode (no prompt is changed)
  kage status --project <dir>                memory + runtime health and measurement coverage
  kage open --project <dir>                  open the local dashboard (recall, review, receipts, team)
  kage doctor --project <dir>                health check
  kage export --project <dir> --format okf --out <dir>   export the repository model as an OKF bundle
  kage migrate plan --project <dir>          dry-run import of legacy packets into the repository model

Getting started:
  kage install [--project <dir>]             one-shot: init + index + auto-wire detected agents
  kage up [--project <dir>]                  bring the ambient stack up ONCE: audit config + runtime + background proxy
  kage run -- <command>                      run any agent through the proxy (sets ANTHROPIC_BASE_URL for it)
  kage down [--project <dir>]                stop the background proxy + runtime daemon that \`kage up\` started
  kage context "<query>" --project <dir>     validate + recall + code graph + knowledge graph in one call
  kage check [--project <dir>]               verify CLAUDE.md/AGENTS.md/docs claims against the code — counted, not estimated
  kage setup <agent> --project <dir> --write wire your agent (claude-code, codex, cursor, ...)

Run 'kage help --all' for the full command list (lifecycle, CI, benchmarks, daemon, workspace).
Pre-vNext commands are deprecated but still callable — run 'kage legacy --help' for the map.`;

const FULL_USAGE = `Kage — full command reference

Usage:
  kage index --project <dir>
  kage check [--project <dir>] [--json | --md] [--base <ref>] [--write-baseline] [--init-ci [--force]]
  kage scan --project <dir> [--json] [--scorecard [--out <file>]]
  kage demo [--project <dir>]
  kage install [--project <dir>] [--agents a,b] [--no-agents] [--json]
  kage init --project <dir> [--with-policy]
  kage policy --project <dir>
  kage doctor --project <dir>
  kage repair --project <dir> [--json]
  kage setup list
  kage setup <agent> --project <dir> [--write] [--json]
  kage setup doctor --project <dir> [--json]
  kage setup verify-agent --agent <agent> --project <dir> [--json]
  kage daemon start --project <dir> [--port 3111]
  kage daemon stop --project <dir>
  kage daemon status --project <dir> [--json]
  kage daemon doctor --project <dir> [--json]
  kage viewer --project <dir> [--port 3113]
  kage hook install --project <dir> [--json]
  kage hook status --project <dir> [--json]
  kage hook uninstall --project <dir> [--json]
  kage refresh --project <dir> [--full] [--force] [--json]
  kage merge-packet <ours> <base> <theirs>      git merge driver for .agent_memory/packets/*.md
  kage gc --project <dir> [--dry-run] [--force] [--json]
  kage compact --project <dir> [--execute] [--json]     dry-run by default; --execute prunes/deprecates for real
  kage verify --project <dir> [--id <packet-id>] [--json]
  kage suppressed --project <dir> [--json]
  kage pr summarize --project <dir> [--json]
  kage pr check --project <dir> [--json]
  kage minimal-change check --project <dir> [--base <ref>] [--json]
  kage staleguard --project <dir> [--json]
  kage upgrade [--dry-run]
  kage branch --project <dir> [--json]
  kage metrics --project <dir> [--json]   raw counts: code graph size, memory graph size, harness readiness
  kage gains --project <dir> [--json]
  kage savings --project <dir> [--queries <n>] [--json]   deterministic token-reduction receipt (no LLM on the measurement path)
  kage team --project <dir> [--json]   team memory health: contributors, pending review, stale-withheld, contradictions
  kage report team --project <dir> [--json]   the lead-facing "is this helping?" report: measured value, or unavailable — estimates keep an _estimated suffix and never masquerade as measured
  kage proxy --project <dir> [--port 8788] [--upstream <url>] [--workspace <dir>] [--mode audit|assist|protect] [--count-tokens] [--no-receipts] [--no-inject] [--verbose]   drop-in proxy: inject memory outbound, capture exchanges inbound, record measured transformation receipts (--mode audit forwards your exact bytes and only measures; --mode protect forwards the original but measures a defensive transform; assist refuses to start on unhealthy reversible/receipt storage)
  kage up [--project <dir>] [--port 8788] [--mode audit|assist] [--foreground] [--no-runtime] [--json]   one command: connect (audit-only config) + vNext runtime + BACKGROUND proxy on --port — detached, survives this terminal (a machine reboot stops it: run kage up once afterwards; no system service), stopped with kage down; --mode governs the proxy process alone and defaults to audit = measurement only (deliberately unlike bare \`kage proxy\`, which keeps assist as its back-compat default); re-running reuses a VERIFIED live proxy (pid + port checked, never the state file alone) and exits 0, cleaning a stale record first; --foreground keeps the proxy in this terminal with no daemon state (kage down does not manage it); --no-runtime skips the vNext runtime daemon
  kage down [--project <dir>] [--json]   stop what kage up started: SIGTERM the verified background proxy (SIGKILL after a bounded grace), remove its state file, and stop the runtime daemon; per-component honest output (stopped / was not running / stale state cleaned); exits 0 when the end state is nothing-running; a foreground proxy is stopped with Ctrl-C instead
  kage run [--project <dir>] [--port 8788] -- <command> [args...]   exec <command> with ANTHROPIC_BASE_URL=http://localhost:<port> in its env (and nothing else), inheriting your terminal; with no --port it uses the background proxy's verified recorded port, falling back to 8788; fails fast with a \`kage up\` hint when nothing listens — run never starts the proxy (up owns that lifecycle)
  kage memory-access --project <dir> [--json]
  kage activity --project <dir> [--json]
  kage memory-audit --project <dir> [--limit <n>] [--json]
  kage slots --project <dir> [--json]
  kage slots set --project <dir> --label <label> --content <text> [--description <text>] [--paths a,b] [--tags a,b] [--size-limit <n>] [--unpinned] [--json]
  kage slots delete --project <dir> --label <label> [--json]
  kage handoff --project <dir> [--json]
  kage layers --project <dir> [--json]
  kage lifecycle --project <dir> [--json]
  kage reverify --project <dir> --packet <id> [--evidence <text>] [--verified-by <text>] [--json]   re-ground a stale packet; changed code requires --evidence (a bare re-stamp is refused)
  kage reconcile --project <dir> [--session <id>] [--json]
  kage timeline --project <dir> [--days <n>] [--json]
  kage lineage --project <dir> [--json]
  kage supersede --project <dir> --packet <old-id> --replacement <new-id> [--reason <text>] [--json]
  kage conflicts --project <dir> [--json]
  kage skills --project <dir> [--dir <path>] [--dry-run] [--json]
  kage contributors --project <dir> [--json]
  kage profile --project <dir> [--json]   repo concepts, key files, and memory focus in one summary
  kage xray --project <dir> [--json]   first-use code structure map: layers, entry points, what to read first
  kage capabilities --project <dir> [--json]   maps memory/benchmark/dashboard/viewer readiness to evidence
  kage decisions --project <dir> [--json]   why-memory coverage: which decisions are captured, which are missing
  kage module-health --project <dir> [--json]   rolls up graph, test, cleanup, and git signals per module
  kage graph-insights --project <dir> [--json]   central files, cycles, communities, and entry flows in the code graph
  kage workspace --project <workspace-dir> [--json]
  kage workspace recall "<query>" --project <workspace-dir> [--json]
  kage audit --project <dir> [--json]   trust score plus concrete memory/code-graph recommendations
  kage audit-claude-mem [--store <path>] [--project <dir>] [--json]   classifies a claude-mem store's memory against this repo
  kage inbox --project <dir> [--json]
  kage quality --project <dir> [--json]   useful-memory ratio, duplicate burden, evidence + path grounding coverage
  kage benchmark --project <dir> [--json]
  kage benchmark --trust --project <dir> [--json]
  kage benchmark --memory-quality [--json]
  kage benchmark --scale [--sizes 240,1000,5000] [--json]
  kage benchmark --project <dir> --compare --task <task> [--json]
  kage code-graph --project <dir> [--json]
  kage code-graph "<query>" --project <dir> [--json]
  kage cleanup-candidates --project <dir> [--json]
  kage dependency-path --project <dir> --from <path> --to <path> [--json]
  kage reviewers --project <dir> [--targets a,b] [--changed-files a,b] [--json]
  kage risk --project <dir> [--targets a,b] [--changed-files a,b] [--json]
  kage code-index --project <dir> [--json]
  kage structural-index --project <dir> [--json]
  kage graph --project <dir> [--json]
  kage graph --project <dir> --mermaid
  kage graph "<query>" --project <dir> [--json]
  kage graph-registry --project <dir> [--json]
  kage embeddings build --project <dir> [--model Xenova/all-MiniLM-L6-v2] [--json]
  kage context "<query>" --project <dir> [--limit <n>] [--targets a,b] [--changed-files a,b] [--session <id>] [--json]   the kage_context MCP tool, reproducible outside an agent session
  kage community-domains                                list community knowledge-graph domains (untrusted, advisory)
  kage community-search "<query>" [--domain <name>]      search the community knowledge graph (untrusted, advisory)
  kage community-fetch --domain <name> --node <id>       fetch one community graph node
  kage ledger --project <dir> [--session <id>] [--limit <n>] [--json]   this session's learning candidates: save/ignore/needs-evidence
  kage workflow                                          print the Kage memory workflow loop (no action taken)
  kage recall "<query>" --project <dir> [--json] [--explain] [--embeddings] [--docs] [--max-context-tokens <n>] [--structural-hops <n>]
  kage docs-search "<query>" --project <dir> [--limit <n>] [--json]   search this repo's own committed docs (README, docs/**, *.md)
  kage file-context --project <dir> --path <file> [--json]
  kage prompt-context --project <dir> --query "<task>" [--json]   recall + savings receipt for an ambient prompt hook
  kage observe --project <dir> --event <json>
  kage sessions --project <dir> [--json]
  kage replay --project <dir> [--session <id>] [--limit <n>] [--json]
  kage distill --project <dir> --session <id> [--auto] [--json]
  kage resume --project <dir> [--json]
  kage learn --project <dir> --learning <text> [--personal] [--title <title>] [--type <type>] [--evidence <text>] [--verified-by <text>] [--tags a,b] [--paths a,b] [--graph-nodes a,b] [--discovery-tokens <n>] [--allow-missing-paths]
  kage sync setup --remote <git-url>            init ~/.kage/memory as a git repo wired to your private remote
  kage sync [--json]                            commit + pull --rebase + push personal memory (newest-wins conflicts)
  kage sync --status [--json]                   ahead/behind/dirty for the personal store (fetch only)
  kage cloud serve [--port 8790] [--db <path>] [--verbose]   run a Kage Cloud server (self-host behind your own proxy/VPN)
  kage cloud create-team --server <url> --name <name> [--json]   creates a team + owner token (shown once)
  kage cloud invite --server <url> --team <id> --token <token> --label <name> [--json]   issue another teammate's token
  kage cloud link --project <dir> --server <url> --team <id> --token <token> [--json]   remember this team so kage viewer shows a Team link
  kage cloud push --project <dir> --server <url> --team <id> --token <token> [--json]   submit local approved packets (lands pending)
  kage cloud pull --project <dir> --server <url> --team <id> --token <token> [--json]   pull team-approved packets (re-verified locally on recall)
  kage cloud list --server <url> --team <id> --token <token> [--status pending|approved|rejected] [--json]
  kage cloud approve|reject --server <url> --team <id> --token <token> --packet <id> [--json]   review gate: a submitter cannot approve their own packet
  kage feedback --project <dir> --packet <packet-id> --kind helpful|wrong|stale
  kage capture --project <dir> --title <title> --body <body> [--type <type>] [--summary <summary>] [--tags a,b] [--paths a,b] [--stack a,b] [--graph-nodes a,b] [--allow-missing-paths]
  kage propose --project <dir> --from-diff
  kage review-artifact --project <dir>
  kage promote --project <dir> --public <packet-id>
  kage export-public --project <dir>
  kage registry --project <dir> [--json]
  kage changelog --project <dir> [--days <n>] [--json]
  kage review --project <dir>
  kage claim --packet <id> --project <dir> [--actor <name>] [--json]
  kage implements --packet <output-id> --proposal <proposal-id> --evidence <text> --project <dir> [--json]
  kage stage --packet <id> --to <proposed|claimed|in_review> --project <dir> [--actor <name>] [--evidence <text>] [--json]
  kage gate list --project <dir> [--stage <stage>] [--json]
  kage gate review --project <dir>
  kage validate --project <dir>
  kage connect --project <dir> [--agents claude-code,proxy] [--no-start] [--json]   audit mode only; connect never enables prompt mutation
  kage status --project <dir> [--json]   legacy memory health + vNext attachment and measurement coverage (exact/partial/unavailable)
  kage open --project <dir> [--port <n>]   launch the local dashboard
  kage receipts --project <dir> [--task <id>] [--limit <n>] [--json]   measured fields only; an unmeasured cost prints as unavailable, never as 0
  kage migrate plan --project <dir> [--pending] [--out <path>] [--json]   dry-run import of legacy packets into the repository model (non-destructive; per-disposition counts)
  kage migrate apply --project <dir> --plan <path> [--json]   apply a migration plan; imports only packets whose fingerprint still matches (nothing becomes injectable)
  kage export --project <dir> --format okf --out <dir>   export the repository model as an OKF concept bundle (identifiers round-trip through foreign OKF consumers)
  kage model export-fixture --project <dir> --out <path> [--repository <id>]   deterministic repository-model v1 fixture (sorted by id; no timestamps/paths) for cross-phase compatibility tests
  kage okf view [--project <dir>] [--pending]   view your memory as a self-contained OKF page (no server)
  kage okf migrate [--project <dir>] [--pending]   packets → OKF bundle under .agent_memory/okf
  kage okf lint [<dir|file>] [--project <dir>]   check OKF conformance (defaults to this repo's bundle)
  kage okf import [<dir>] [--project <dir>] [--json]   read an OKF bundle back into packets

Maintainer tools:
  kage gen-plugin-hooks [--plugin-dir <dir>] [--json]   regenerate plugin/hooks/* from the claude-code setup templates so the plugin and npm install paths ship identical hooks

Back-compat aliases (identical behavior to the modern verb, kept for older scripts):
  kage audit-log → memory-audit · kage capability-audit , kage readiness → capabilities
  kage context-slots → slots · kage memory-handoff → handoff · kage memory-layers → layers
  kage memory-lifecycle → lifecycle · kage memory-lineage → lineage · kage session-replay → replay
  kage memory-reconcile , kage memory-reconciliation → reconcile · kage skills-build → skills

Types:
  ${MEMORY_TYPES.join(", ")}`;

function usage(): never {
  console.log(CORE_USAGE);
  process.exit(1);
}

// Stale-catch lines lead with color when attached to a terminal so the
// retention heartbeat is impossible to miss; plain text otherwise (CI, pipes).
function printStaleCatch(result: ReturnType<typeof staleCatch>): void {
  const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
  const [headline, ...rest] = formatStaleCatch(result);
  if (!useColor) {
    console.log([headline, ...rest].join("\n"));
    return;
  }
  const tint = result.invalidated.length ? "\u001b[33m" : "\u001b[32m";
  console.log(`${tint}${headline}\u001b[0m`);
  if (rest.length) console.log(rest.join("\n"));
}

function takeArg(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
}

function listArg(value: string | undefined): string[] {
  return value ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];
}

function projectArg(args: string[]): string {
  return takeArg(args, "--project") ?? process.cwd();
}

function numberArg(args: string[], name: string, fallback: number): number {
  const value = takeArg(args, name);
  return value ? Number(value) : fallback;
}

function printContradictionWarning(contradictions: ContradictionFinding[] | undefined): void {
  if (!contradictions?.length) return;
  console.log(`\n⚠ This contradicts ${contradictions.length} existing memor${contradictions.length === 1 ? "y" : "ies"}:`);
  for (const item of contradictions) {
    console.log(`  - ${item.packet_id} (${item.title}): ${item.reason}`);
  }
  console.log("  Resolve with kage supersede --packet <old> --replacement <new>, or keep both intentionally.");
}

function firstPositional(args: string[]): string | undefined {
  return args.find((arg, index) => index > 0 && !arg.startsWith("--") && !args[index - 1]?.startsWith("--"));
}

async function review(projectDir: string): Promise<void> {
  const pending = loadPendingPackets(projectDir);
  if (pending.length === 0) {
    console.log("No pending packets to review.");
    return;
  }

  const rl = createInterface({ input, output });
  try {
    for (const packet of pending) {
      console.log("\n─────────────────────────────────────────");
      console.log(`Title: ${packet.title}`);
      console.log(`Type:  ${packet.type}`);
      console.log(`ID:    ${packet.id}`);
      console.log(`By:    ${packet.author_name ?? "(unknown)"}${packet.author_branch ? ` on ${packet.author_branch}` : ""}`);
      console.log(`Tags:  ${packet.tags.join(", ") || "(none)"}`);
      console.log(`Paths: ${packet.paths.join(", ") || "(none)"}`);
      console.log("\n" + packet.body);
      const answer = (await rl.question("\n(a) approve  (r) reject  (s) skip  (q) quit: ")).trim().toLowerCase();
      if (answer === "q") break;
      if (answer === "a") {
        const path = approvePending(projectDir, packet.id);
        console.log(`Approved: ${path}`);
      } else if (answer === "r") {
        const path = rejectPending(projectDir, packet.id);
        console.log(`Rejected: ${path}`);
      } else {
        console.log("Skipped.");
      }
    }
  } finally {
    rl.close();
  }
}

// The terminal in_review -> done transition is deliberately reachable ONLY here
// (TTY-interactive) or via the cloud path's token-authenticated approve — never
// as a scriptable, agent-callable command or MCP tool. `kage stage` (the generic
// escape hatch below) explicitly refuses that one edge non-interactively for the
// same reason. This local gate is a plain actor-string comparison — weaker than
// the cloud path's cryptographic token-hash check; say so if a reviewer asks.
async function gateReview(projectDir: string): Promise<void> {
  const inReview = listWorkItems(projectDir, { stage: "in_review" });
  if (inReview.length === 0) {
    console.log("No work items in review.");
    return;
  }
  const rl = createInterface({ input, output });
  try {
    for (const item of inReview) {
      console.log("\n─────────────────────────────────────────");
      console.log(`Title:      ${item.title}`);
      console.log(`ID:         ${item.id}`);
      console.log(`Claimed by: ${item.claimed_by ?? "(unclaimed)"}`);
      console.log(`Status:     ${item.status}`);
      const answer = (await rl.question("\n(a) approve -> done  (b) send back to claimed  (s) skip  (q) quit: ")).trim().toLowerCase();
      if (answer === "q") break;
      if (answer === "a" || answer === "b") {
        const actor = (await rl.question("Your name/identity (for the self-approval check): ")).trim() || gitUserName(projectDir) || "unknown";
        const toStage: WorkStage = answer === "a" ? "done" : "claimed";
        const result = transitionWorkStage(projectDir, item.id, toStage, { actor, evidence: answer === "a" ? "kage gate review: approved" : "kage gate review: sent back" });
        if (result.ok) console.log(`${toStage === "done" ? "Approved" : "Sent back"}: ${item.id}`);
        else console.log(`Failed: ${result.errors.join("; ")}`);
      } else {
        console.log("Skipped.");
      }
    }
  } finally {
    rl.close();
  }
}

async function main(): Promise<void> {
  let args = process.argv.slice(2);
  let command = args[0];
  if (!command) usage();
  if (command === "help") {
    console.log(args.includes("--all") ? FULL_USAGE : CORE_USAGE);
    return;
  }

  // Phase E Task 10 quarantines the pre-vNext commands behind `kage legacy`. `kage legacy <command>`
  // unwraps to the deprecated command; the banner below then fires exactly once for it.
  if (command === "legacy") {
    const inner = args.slice(1);
    if (inner.length === 0 || inner[0] === "--help" || inner[0] === "help") {
      console.log(renderLegacyHelp());
      return;
    }
    // `kage legacy scan` — the migration report: which scripts/config still invoke a legacy command.
    if (inner[0] === "scan") {
      const projectDir = projectArg(inner);
      const hits = scanLegacyCommandUsage(projectDir);
      if (inner.includes("--json")) {
        console.log(JSON.stringify({ project: projectDir, count: hits.length, hits }, null, 2));
        return;
      }
      if (hits.length === 0) {
        console.log("No scripts or config invoke a deprecated kage command.");
        return;
      }
      console.log(`${hits.length} legacy command invocation(s) still present:`);
      for (const hit of hits) {
        const target = hit.removed ? "removed (no direct replacement)" : `use kage ${hit.replacement}`;
        console.log(`  ${hit.file}:${hit.line}  kage ${hit.command} -> ${target}`);
      }
      return;
    }
    args = inner;
    command = args[0];
  }

  // Every deprecated invocation — direct or via `kage legacy` — prints exactly one supported
  // replacement, the v5 removal notice, and the docs link (to stderr, so --json stdout stays clean),
  // and records ONLY the command name + version locally (never arguments, which can carry private
  // paths or query text). The command still runs afterward for one major version.
  if (isLegacyCommand(command)) {
    console.error(formatDeprecationNotice(mapLegacyCommand(args)));
    recordLegacyUsage(command);
  }

  if (command === "merge-packet") {
    // Git merge driver (%A %O %B): runs before any heavy setup — merge drivers
    // must be fast and dependency-free. Exit 0 = merged, 1 = leave conflict.
    const [ours, base, theirs] = [args[1], args[2], args[3]];
    if (!ours || !base || !theirs) {
      console.error("Usage: kage merge-packet <ours> <base> <theirs>");
      console.error(`Enable once per clone: ${PACKET_MERGE_DRIVER_CONFIG}`);
      process.exit(1);
    }
    const result = mergePacketFiles(ours, base, theirs, process.cwd());
    console.error(result.detail);
    process.exit(result.ok ? 0 : 1);
  }

  if (command === "sync") {
    // Personal-store sync (docs/CLOUD.md v1): plain git under the hood, no
    // tree-sitter or repo indexes needed, so it runs before the heavy setup.
    if (args[1] === "setup") {
      const remote = takeArg(args, "--remote");
      if (!remote) {
        console.error("Usage: kage sync setup --remote <git-url>");
        process.exit(2);
      }
      const result = syncSetup(remote);
      if (args.includes("--json")) {
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.ok ? 0 : 2);
      }
      if (!result.ok) {
        console.error(`kage sync setup failed:\n${result.errors.map((error) => `  - ${error}`).join("\n")}`);
        process.exit(2);
      }
      console.log(`Personal memory store: ${result.memory_dir}${result.initialized ? " (new git repo)" : ""}`);
      console.log(`Remote: ${result.remote}${result.remote_updated ? " (updated)" : ""}`);
      console.log(`Pushed ${result.branch ?? "HEAD"} to origin. Run \`kage sync\` on any machine to stay in sync.`);
      return;
    }
    if (args.includes("--status")) {
      const result = syncStatus();
      if (args.includes("--json")) {
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.ok ? 0 : 2);
      }
      if (!result.ok) {
        console.error(`kage sync status failed:\n${result.errors.map((error) => `  - ${error}`).join("\n")}`);
        process.exit(2);
      }
      console.log(`Personal memory store: ${result.memory_dir}`);
      console.log(`Remote: ${result.remote} (branch ${result.branch ?? "unknown"})`);
      console.log(`Ahead ${result.ahead}, behind ${result.behind}, ${result.dirty ? "uncommitted local changes" : "clean"}`);
      for (const warning of result.warnings) console.log(`Warning: ${warning}`);
      return;
    }
    const result = syncPersonal();
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 2);
    }
    if (!result.ok) {
      console.error(`kage sync failed:\n${result.errors.map((error) => `  - ${error}`).join("\n")}`);
      process.exit(2);
    }
    console.log(`kage sync: pushed ${result.pushed}, pulled ${result.pulled}, resolved ${result.resolved}`);
    if (result.conflict_backups.length) {
      console.log(`Conflict losers preserved:\n${result.conflict_backups.map((path) => `  - ${path}`).join("\n")}`);
    }
    return;
  }

  if (command === "cloud") {
    const sub = args[1];

    if (sub === "serve") {
      const port = args.includes("--port") ? numberArg(args, "--port", 8790) : 8790;
      const dbPath = takeArg(args, "--db");
      startCloudServer({ port, dbPath: dbPath ?? undefined, verbose: args.includes("--verbose") });
      return;
    }

    const server = takeArg(args, "--server");
    if (!server && sub !== undefined) {
      console.error("Usage: kage cloud <create-team|invite|push|pull|list|approve|reject> --server <url> ...");
      process.exit(2);
    }

    if (sub === "create-team") {
      const name = takeArg(args, "--name");
      if (!name) { console.error("Usage: kage cloud create-team --server <url> --name <name>"); process.exit(2); }
      const result = await cloudCreateTeam(server!, name);
      if (args.includes("--json")) { console.log(JSON.stringify(result, null, 2)); return; }
      console.log(`Team created: ${result.name} (${result.team_id})`);
      console.log(`Owner token (save this — it is shown once): ${result.token}`);
      console.log(`\nNext: kage cloud push --project . --server ${server} --team ${result.team_id} --token ${result.token}`);
      return;
    }

    const teamId = takeArg(args, "--team");
    const token = takeArg(args, "--token");
    if (sub && sub !== "create-team" && (!teamId || !token)) {
      console.error("Usage: kage cloud <subcommand> --server <url> --team <team-id> --token <token> ...");
      process.exit(2);
    }

    if (sub === "link") {
      const linked = writeTeamLink(projectArg(args), { server: server!, team_id: teamId!, token: token! });
      if (args.includes("--json")) { console.log(JSON.stringify(linked, null, 2)); return; }
      console.log(`Linked. \`kage viewer\` will now show a Team link to ${server}.`);
      return;
    }

    if (sub === "invite") {
      const label = takeArg(args, "--label") ?? "teammate";
      const result = await cloudInvite(server!, teamId!, token!, label);
      if (args.includes("--json")) { console.log(JSON.stringify(result, null, 2)); return; }
      console.log(`New token for "${result.label}" (save this — it is shown once): ${result.token}`);
      return;
    }

    if (sub === "push") {
      const result = await cloudPush(server!, teamId!, token!, projectArg(args));
      if (args.includes("--json")) { console.log(JSON.stringify(result, null, 2)); return; }
      console.log(`Submitted ${result.submitted} packet(s) for review.`);
      if (result.failed.length) console.log(`Failed:\n${result.failed.map((f) => `  - ${f.title}: ${f.reason}`).join("\n")}`);
      return;
    }

    if (sub === "pull") {
      const result = await cloudPull(server!, teamId!, token!, projectArg(args));
      if (args.includes("--json")) { console.log(JSON.stringify(result, null, 2)); return; }
      console.log(`Pulled ${result.pulled} team-approved packet(s). They'll surface in recall's "Team Memory" section, re-verified against this checkout.`);
      return;
    }

    if (sub === "list") {
      const status = takeArg(args, "--status") ?? "pending";
      const result = await cloudList(server!, teamId!, token!, status);
      if (args.includes("--json")) { console.log(JSON.stringify(result, null, 2)); return; }
      if (!result.length) { console.log(`No ${status} packets.`); return; }
      for (const entry of result) {
        console.log(`[${entry.packet.id}] ${entry.packet.title}`);
        console.log(`  submitted by ${entry.submitted_by}${entry.approved_by ? `, approved by ${entry.approved_by}` : ""}`);
      }
      return;
    }

    if (sub === "approve" || sub === "reject") {
      const packetId = takeArg(args, "--packet");
      if (!packetId) { console.error(`Usage: kage cloud ${sub} --server <url> --team <team-id> --token <token> --packet <packet-id>`); process.exit(2); }
      const result = await cloudReview(server!, teamId!, token!, packetId, sub);
      let workItemResult: WorkStageTransitionResult | null = null;
      if (sub === "approve" && result.status === "approved") {
        const project = projectArg(args);
        const local = loadApprovedPackets(project).find((p) => p.id === packetId);
        if (local && local.type === "proposal" && local.stage === "in_review") {
          workItemResult = transitionWorkStage(project, packetId, "done", {
            actor: gitUserName(project) ?? "cloud-approved",
            evidence: "kage cloud approve: approved by a teammate on Kage Cloud",
          });
        }
      }
      if (args.includes("--json")) { console.log(JSON.stringify({ ...result, work_item: workItemResult }, null, 2)); return; }
      console.log(`Packet ${packetId}: ${result.status}`);
      if (workItemResult) {
        console.log(workItemResult.ok
          ? `  Work item advanced to done (non-forgeable cloud approval).`
          : `  Work item stage NOT advanced: ${workItemResult.errors.join("; ")}`);
      }
      return;
    }

    console.error("Usage: kage cloud <serve|create-team|invite|push|pull|list|approve|reject> ...");
    process.exit(2);
  }

  if (command === "run") {
    // A pure exec wrapper: no tree-sitter, no indexes — it must start fast and get out of the
    // way. Everything after the first `--` belongs to the child, untouched (so a child's own
    // --project or --help is never mistaken for ours).
    const rest = args.slice(1);
    const separator = rest.indexOf("--");
    const own = separator === -1 ? rest : rest.slice(0, separator);
    if (own.includes("--help")) {
      console.log("kage run — run one command through the local Kage proxy.");
      console.log("");
      console.log("Usage:  kage run [--project <dir>] [--port 8788] -- <command> [args...]");
      console.log("        kage run -- claude");
      console.log("");
      console.log("Sets ANTHROPIC_BASE_URL=http://localhost:<port> in the child's environment (and nothing");
      console.log("else), inherits your terminal, and exits with the child's exit code. With no --port it");
      console.log("uses the background proxy's recorded port — verified live (pid + port), never trusted");
      console.log("from the state file alone — and falls back to 8788. If nothing is listening it fails");
      console.log("fast with a hint to start `kage up` — run never starts the proxy itself: up owns the");
      console.log("proxy lifecycle, run only points a command at it.");
      return;
    }
    const childCommand = separator === -1 ? [] : rest.slice(separator + 1);
    if (!childCommand.length) {
      console.error("Usage: kage run [--project <dir>] [--port <n>] -- <command> [args...]   e.g. kage run -- claude");
      process.exit(2);
    }
    const result = await runWithProxy({
      project_dir: projectArg(own),
      // No --port means "ask the verified daemon state, then fall back to 8788" — see runWithProxy.
      port: own.includes("--port") ? numberArg(own, "--port", 8788) : undefined,
      command: childCommand,
    });
    if (result.hint) console.error(result.hint);
    process.exit(result.exit_code);
  }

  if (command === "down") {
    if (args.includes("--help")) {
      console.log("kage down — stop what `kage up` started: the background proxy and the runtime daemon.");
      console.log("");
      console.log("Usage:  kage down [--project <dir>] [--json]");
      console.log("");
      console.log("Verifies the recorded proxy is really ours (pid alive + port accepting) before sending");
      console.log("SIGTERM, escalates to SIGKILL after a bounded grace, removes the state file, and stops");
      console.log("the runtime daemon. A stale record (left by a crash or SIGKILL) is cleaned and reported");
      console.log("as stale — never signalled. Exits 0 whenever the end state is nothing-running.");
      console.log("");
      console.log("Note: `kage down` manages only the background proxy `kage up` recorded. A foreground");
      console.log("proxy (`kage proxy` or `kage up --foreground`) is stopped with Ctrl-C in its terminal.");
      return;
    }
    const project = projectArg(args);
    const result = await downProject({
      project_dir: project,
      // The runtime daemon is the legacy daemon process (it hosts the vNext runtime when up
      // started it with --vnext), so down reuses the exact `kage daemon stop` code path.
      stop_runtime: (dir) => runtimeDownFrom(stopDaemon, dir),
    });
    if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
    else console.log(renderDown(result));
    if (!result.ok) process.exit(1);
    return;
  }

  await ensureTreeSitterLanguages();

  if (command === "index") {
    const result = indexProject(projectArg(args));
    console.log(`Indexed ${result.projectDir}`);
    console.log(`Packets: ${result.packets}`);
    console.log(`Migrated legacy nodes: ${result.migrated}`);
    if (result.policyPath) console.log(`Agent policy: ${result.policyPath}`);
    console.log(`Indexes:\n${result.indexes.map((path) => `  - ${path}`).join("\n")}`);
    return;
  }

  if (command === "check") {
    const checkTarget = resolve(projectArg(args));
    if (args.includes("--init-ci")) {
      const workflowPath = join(checkTarget, ".github", "workflows", "kage-check.yml");
      if (existsSync(workflowPath) && !args.includes("--force")) {
        console.log(`${workflowPath} already exists — rerun with --force to overwrite.`);
        process.exit(2);
      }
      mkdirSync(dirname(workflowPath), { recursive: true });
      writeFileSync(workflowPath, kageCheckWorkflowYaml(), "utf8");
      console.log(`Wrote ${workflowPath}`);
      console.log("Every PR now gets a drift check: it comments and fails only when the diff breaks a documented claim.");
      return;
    }
    let report;
    try {
      report = driftCheck(checkTarget, { base: takeArg(args, "--base") });
    } catch (error) {
      console.error(`kage check failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(2);
    }
    if (args.includes("--write-baseline")) {
      const written = writeCheckBaseline(checkTarget, report);
      console.log(`Baseline written: ${written} (${report.confirmed.length} finding(s) accepted — future runs gate only on new drift)`);
      return;
    }
    if (args.includes("--json")) console.log(JSON.stringify(report, null, 2));
    else if (args.includes("--md")) console.log(checkReportMarkdown(report));
    else console.log(formatCheckReport(report));
    process.exit(report.totals.confirmed > 0 ? 1 : 0);
  }

  if (command === "scan") {
    const scanTarget = resolve(projectArg(args));
    if (scanTarget === homedir()) {
      console.log("That's your home directory, not a repo — scanning it would crawl everything you own.");
      console.log("cd into a project and rerun, or point at one:");
      console.log("  npx -y kage-graph-mcp scan --project /path/to/repo");
      process.exit(2);
    }
    // scan is read-only by promise ("nothing generated"): if the repo has no Kage memory
    // yet — e.g. a one-off scan of a repo you don't own — don't leave a .agent_memory/
    // tree behind. Remove what the graph build created, but only if it wasn't there before.
    const hadMemory = existsSync(join(scanTarget, ".agent_memory"));
    const cleanupScanArtifacts = () => {
      if (hadMemory) return;
      try { rmSync(join(scanTarget, ".agent_memory"), { recursive: true, force: true }); } catch {}
    };
    const result = truthReport(scanTarget);
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      cleanupScanArtifacts();
      return;
    }
    if (args.includes("--scorecard")) {
      // A shareable artifact, not terminal output: write the SVG (or Markdown if
      // --out ends in .md) and echo the Markdown table so it's pasteable now.
      const out = takeArg(args, "--out");
      const asMarkdown = out ? out.toLowerCase().endsWith(".md") : false;
      const outPath = out ?? join(scanTarget, "kage-scorecard.svg");
      writeFileSync(outPath, asMarkdown ? truthScorecardMarkdown(result) : truthScorecardSvg(result), "utf8");
      console.log(`Scorecard written to ${outPath}`);
      console.log("Share it: embed the SVG in a README, screenshot it, or post it.\n");
      console.log(truthScorecardMarkdown(result));
      cleanupScanArtifacts();
      return;
    }
    console.log(`Kage Truth Report — ${result.project_dir}`);
    console.log(`Scanned ${result.totals.files_scanned} files, ${result.totals.symbols_scanned} symbols${result.totals.docs_scanned ? `, ${result.totals.docs_scanned} doc file(s)` : ""}\n`);
    console.log(result.headline ? `  ${result.headline}\n` : "");
    const sections: Array<{ kind: string; heading: string; clean: string; count: number }> = [
      { kind: "knowledge_void", heading: "KNOWLEDGE VOID — high churn, zero memory", clean: "no undocumented hot files", count: result.totals.knowledge_voids },
      { kind: "untested_hot", heading: "UNTESTED HOT PATH — depended on, no test covers it", clean: "every hot path has a test", count: result.totals.untested_hot_paths },
      { kind: "complexity_hotspot", heading: "COMPLEXITY HOTSPOT — big file, many dependents", clean: "no oversized hub files", count: result.totals.complexity_hotspots },
      { kind: "debt_marker", heading: "KNOWN DEBT — TODO / FIXME / HACK left in code", clean: "no debt markers in code", count: result.totals.debt_markers },
      { kind: "bus_factor", heading: "BUS FACTOR 1 — one head holds it all", clean: "no single-owner hot files", count: result.totals.bus_factor_files },
      { kind: "duplicate_cluster", heading: "DUPLICATE IMPLEMENTATIONS", clean: "no duplicate implementations", count: result.totals.duplicate_clusters },
      { kind: "ghost_export", heading: "GHOST KNOWLEDGE — exported, never called", clean: "no dead exports", count: result.totals.ghost_exports },
      { kind: "doc_lie", heading: "DOC LIES — the README vs reality", clean: "docs match the code", count: result.totals.doc_lies },
    ];
    for (const section of sections) {
      const items = result.findings.filter((finding) => finding.kind === section.kind);
      if (!items.length) continue;
      console.log(`■ ${section.heading} (${section.count}${section.count > items.length ? `, showing top ${items.length}` : ""})`);
      for (const finding of items) {
        console.log(`  • ${finding.title}`);
        console.log(`    ${finding.detail}`);
        for (const evidence of finding.evidence) console.log(`      ${evidence}`);
      }
      console.log("");
    }
    // Reframe the categories that came back clean as reassurance, not emptiness.
    // (doc checks only run when docs exist, so skip that line when none scanned.)
    const cleanLabels = sections
      .filter((section) => section.count === 0 && !(section.kind === "doc_lie" && !result.totals.docs_scanned))
      .map((section) => section.clean);
    if (result.findings.length && cleanLabels.length) {
      console.log(`Clean: ${cleanLabels.join(" · ")}\n`);
    }
    if (!result.findings.length) {
      const small = result.totals.files_scanned < 30;
      const noGit = result.warnings.some((warning) => warning.includes("Git history"));
      if (small || noGit) {
        console.log(`Nothing alarming found — though ${small ? "a repo this small" : "a repo without git history"} gives these signals little to work with.`);
        console.log("Where Kage pays off here is the memory loop: what you and your agents learn while building this gets kept, verified, and recalled.\n");
      } else {
        console.log("No findings across 8 checks — this repo's knowledge is well distributed.\n");
      }
    }
    if (result.warnings.length) console.log(`Warnings:\n${result.warnings.map((warning) => `  - ${warning}`).join("\n")}\n`);
    console.log(result.findings.length ? "Fix the void:" : "Next:");
    for (const action of result.next_actions) console.log(`  ${action}`);
    cleanupScanArtifacts();
    return;
  }

  if (command === "demo") {
    // Default to a temp dir: the demo must never write into the user's cwd uninvited.
    const demoDir = takeArg(args, "--project") ?? mkdtempSync(join(tmpdir(), "kage-demo-"));
    const result = runDemo(demoDir);
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Running the Kage demo in a sandbox repo: ${result.project_dir}\n`);
    console.log("  Created a small repo: src/auth.ts, src/payments.ts, src/legacy-retry.ts");
    console.log(`  Captured ${result.captured.length} memories, each citing real files — accepted and fingerprinted.\n`);
    console.log("1. Then we tried to save a memory citing a file that does NOT exist:");
    if (result.rejected_hallucination) {
      console.log(`   ✗ "${result.rejected_hallucination.title}" — REFUSED at write time:`);
      console.log(`     ${result.rejected_hallucination.error}\n`);
    }
    console.log("2. Then we DELETED src/legacy-retry.ts and asked for recall again:");
    for (const w of result.withheld) console.log(`   ⊘ "${w.title}" — WITHHELD\n     ${w.reason}`);
    console.log("\n3. What recall actually returns now — only memory that still checks out:");
    for (const t of result.recalled) console.log(`   ✓ ${t}`);

    // The sandbox proves the mechanism; the runner's own repo makes it matter.
    const here = process.cwd();
    if (existsSync(join(here, ".git")) && !takeArg(args, "--project")) {
      console.log("\nThat was a sandbox. This is YOUR repo — scanning (read-only, ~a minute)...\n");
      try {
        const report = truthReport(here);
        console.log(`  ${report.headline}`);
        for (const finding of report.findings.slice(0, 3)) {
          console.log(`  • ${finding.title}`);
        }
        if (report.findings.length > 3) console.log(`  …and ${report.findings.length - 3} more.`);
        console.log("\n  Full report:  npx -y @kage-core/kage-graph-mcp scan --project .");
      } catch {
        console.log("  (scan skipped — run it yourself: npx -y @kage-core/kage-graph-mcp scan --project .)");
      }
    } else {
      console.log("\nNow point it at a real repo:");
      console.log("  npx -y @kage-core/kage-graph-mcp scan --project .     the Truth Report — what your repo is hiding");
    }
    console.log("\nWire it in (one command, auto-detects your agents):");
    console.log("  npx -y @kage-core/kage-graph-mcp install");
    return;
  }

  if (command === "okf") {
    // OKF (Open Knowledge Format) is Kage's standard on-disk memory format.
    const sub = args[1] && !args[1].startsWith("--") ? args[1] : "";
    const project = resolve(projectArg(args));

    if (sub === "migrate" || sub === "export") {
      const result = migratePacketsToOkf(project, { includePending: args.includes("--pending") });
      console.log(`Kage memory → OKF: wrote ${result.written} concept(s) to ${result.root}`);
      for (const [type, count] of Object.entries(result.byType).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${type}: ${count}`);
      }
      console.log("\nConformant OKF bundle: index.md (progressive disclosure), log.md (history), concept docs.");
      console.log("Trust metadata rides in x-kage-* frontmatter, so any OKF consumer (incl. Google's visualizer) reads it unchanged.");
      return;
    }

    if (sub === "lint") {
      const target = args[2] && !args[2].startsWith("--") ? resolve(args[2]) : okfBundleDir(project);
      const { files, failures } = lintOkfBundle(target);
      if (failures.length === 0) {
        console.log(`OKF lint: ${files} concept(s) in ${target} — all conformant.`);
        return;
      }
      console.log(`OKF lint: ${failures.length}/${files} concept(s) non-conformant in ${target}:`);
      for (const failure of failures) console.log(`  ${failure.path}: ${failure.errors.join("; ")}`);
      process.exit(1);
    }

    if (sub === "import") {
      const dir = args[2] && !args[2].startsWith("--") ? resolve(args[2]) : okfBundleDir(project);
      const packets = loadOkfConcepts(dir, { projectDir: project });
      if (args.includes("--json")) {
        console.log(JSON.stringify(packets, null, 2));
        return;
      }
      console.log(`Read ${packets.length} concept(s) from OKF bundle ${dir}`);
      for (const packet of packets.slice(0, 20)) console.log(`  [${packet.type}] ${packet.title}`);
      if (packets.length > 20) console.log(`  … and ${packets.length - 20} more`);
      return;
    }

    if (sub === "view") {
      migratePacketsToOkf(project, { includePending: args.includes("--pending") });
      const concepts = loadOkfConcepts(okfBundleDir(project), { projectDir: project });
      const out = join(okfBundleDir(project), "viewer.html");
      writeFileSync(out, okfViewerHtml(concepts, { title: basename(project) }), "utf8");
      console.log(`OKF viewer: ${concepts.length} concept(s) — a self-contained page, no server, no giant URL.`);
      console.log(`Open it:  open ${out}`);
      return;
    }

    console.log("kage okf — Open Knowledge Format is Kage's standard memory format.");
    console.log("  kage okf view [--project <dir>]                   view your memory as a clean OKF bundle (self-contained page)");
    console.log("  kage okf migrate [--project <dir>] [--pending]   packets → OKF bundle (.agent_memory/okf)");
    console.log("  kage okf lint [<dir|file>] [--project <dir>]      check OKF conformance");
    console.log("  kage okf import [<dir>] [--project <dir>] [--json]  read an OKF bundle back into packets");
    return;
  }

  if (command === "migrate") {
    // Import the legacy .agent_memory packet store into the Phase B repository model. Non-destructive:
    // packet files are never deleted. `plan` is a dry run (writes nothing to the model); `apply` only
    // imports packets whose fingerprint still matches the plan.
    const sub = args[1] && !args[1].startsWith("--") ? args[1] : "";
    const project = resolve(projectArg(args));
    const json = args.includes("--json");
    const defaultPlanPath = join(project, ".agent_memory", "daemon", "vnext", "migration-plan.json");

    const { openRepositoryModel } = await import("./vnext/migration/model-store.js");
    const { planMigration, applyMigration, renderPlanText } = await import(
      "./vnext/migration/migration-report.js"
    );

    if (sub === "plan") {
      const packets = [
        ...loadApprovedPackets(project),
        ...(args.includes("--pending") ? loadPendingPackets(project) : []),
      ];
      const opened = openRepositoryModel(project);
      try {
        const plan = planMigration(packets, opened.model);
        const outPath = takeArg(args, "--out") ? resolve(takeArg(args, "--out")!) : defaultPlanPath;
        mkdirSync(dirname(outPath), { recursive: true });
        writeFileSync(outPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
        if (json) {
          console.log(JSON.stringify({ ...plan, plan_path: outPath }, null, 2));
          return;
        }
        console.log(renderPlanText(plan));
        console.log(`\nPlan written to ${outPath}`);
        console.log(`Apply it:  kage migrate apply --project ${project} --plan ${outPath}`);
      } finally {
        opened.close();
      }
      return;
    }

    if (sub === "apply") {
      const planPath = takeArg(args, "--plan");
      if (!planPath) {
        console.error("Usage: kage migrate apply --project <dir> --plan <path> [--json]");
        process.exit(2);
      }
      const plan = JSON.parse(readFileSync(resolve(planPath), "utf8"));
      // Load both approved and pending so apply can find any planned packet by id.
      const packetsById = new Map<string, ReturnType<typeof loadApprovedPackets>[number]>();
      for (const packet of [...loadApprovedPackets(project), ...loadPendingPackets(project)]) {
        packetsById.set(packet.id, packet);
      }
      const opened = openRepositoryModel(project);
      try {
        const result = applyMigration(plan, [...packetsById.values()], opened.model);
        if (json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }
        console.log(
          `Applied ${result.applied} packet(s); skipped ${result.skipped_fingerprint_mismatch} (drifted), ${result.skipped_missing} (missing).`,
        );
        console.log("Nothing imported is injectable — every imported claim is proposed/archived until reviewed.");
      } finally {
        opened.close();
      }
      return;
    }

    console.log("kage migrate — import legacy packet memory into the repository model (non-destructive).");
    console.log("  kage migrate plan --project <dir> [--pending] [--out <path>] [--json]   dry run: per-disposition counts + a plan file");
    console.log("  kage migrate apply --project <dir> --plan <path> [--json]               import only packets whose fingerprint still matches");
    return;
  }

  if (command === "export") {
    // Export the repository model as an OKF concept bundle. Identifiers ride in a machine-state body
    // block, so the export round-trips even through a foreign OKF consumer that drops x-kage-* fields.
    const project = resolve(projectArg(args));
    const format = takeArg(args, "--format") ?? "okf";
    if (format !== "okf") {
      console.error(`kage export: unsupported --format "${format}" (only "okf" is supported).`);
      process.exit(2);
    }
    const out = takeArg(args, "--out");
    if (!out) {
      console.error("Usage: kage export --project <dir> --format okf --out <dir>");
      process.exit(2);
    }
    const outDir = resolve(out);
    const { openRepositoryModel, repositoryIds } = await import("./vnext/migration/model-store.js");
    const { exportModel } = await import("./vnext/okf/model-export.js");
    const opened = openRepositoryModel(project);
    try {
      mkdirSync(outDir, { recursive: true });
      const indexLines = ["# Kage model — OKF export", ""];
      let written = 0;
      for (const repositoryId of repositoryIds(opened.model)) {
        for (const doc of exportModel(opened.model, repositoryId)) {
          writeFileSync(join(outDir, doc.file_name), doc.markdown, "utf8");
          indexLines.push(`- [${doc.concept.canonical_name}](/${doc.file_name}) — ${doc.concept.kind}`);
          written += 1;
        }
      }
      writeFileSync(join(outDir, "index.md"), `${indexLines.join("\n")}\n`, "utf8");
      if (args.includes("--json")) {
        console.log(JSON.stringify({ out: outDir, written }, null, 2));
        return;
      }
      console.log(`Kage model → OKF: wrote ${written} concept(s) to ${outDir}`);
      console.log("Trust/freshness rides in x-kage-* frontmatter; identifiers also ride in a body block so a foreign OKF tool round-trips them.");
    } finally {
      opened.close();
    }
    return;
  }

  if (command === "model") {
    // `kage model export-fixture --project <dir> --out <path> [--repository <id>]`
    // Serialize a deterministic repository-model v1 fixture for cross-phase compatibility tests. The
    // fixture sorts every row by its stable id and excludes timestamps, raw payloads, and local paths,
    // so two runs over the same model are byte-identical.
    const sub = args[1] && !args[1].startsWith("--") ? args[1] : "";
    if (sub !== "export-fixture") {
      console.log("kage model — repository-model tooling.");
      console.log("  kage model export-fixture --project <dir> --out <path> [--repository <id>]   deterministic repository-model v1 fixture");
      process.exit(sub ? 2 : 0);
    }
    const project = resolve(projectArg(args));
    const out = takeArg(args, "--out");
    if (!out) {
      console.error("Usage: kage model export-fixture --project <dir> --out <path> [--repository <id>]");
      process.exit(2);
    }
    const requestedRepo = takeArg(args, "--repository");
    const { openRepositoryModel, repositoryIds } = await import("./vnext/migration/model-store.js");
    const { serializeModelFixture, renderModelFixture } = await import("./vnext/repo-model/fixture.js");
    const opened = openRepositoryModel(project);
    try {
      const repos = repositoryIds(opened.model);
      let repositoryId: string;
      if (requestedRepo) {
        if (!repos.includes(requestedRepo)) {
          console.error(`kage model export-fixture: repository "${requestedRepo}" has no entities in the model.`);
          process.exit(2);
        }
        repositoryId = requestedRepo;
      } else if (repos.length === 1) {
        repositoryId = repos[0];
      } else if (repos.length === 0) {
        console.error("kage model export-fixture: the model is empty (no entities to serialize).");
        process.exit(2);
        return;
      } else {
        console.error(`kage model export-fixture: multiple repositories (${repos.join(", ")}); pass --repository <id>.`);
        process.exit(2);
        return;
      }
      const fixture = serializeModelFixture(opened.model, repositoryId);
      const outPath = resolve(out);
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, renderModelFixture(fixture), "utf8");
      if (args.includes("--json")) {
        console.log(JSON.stringify({
          out: outPath,
          repository_id: repositoryId,
          fixture_version: fixture.fixture_version,
          entities: fixture.entities.length,
          claims: fixture.claims.length,
          evidence: fixture.evidence.length,
          relations: fixture.relations.length,
        }, null, 2));
        return;
      }
      console.log(`Kage model → fixture: wrote ${fixture.fixture_version} for ${repositoryId} to ${outPath}`);
      console.log(`  entities=${fixture.entities.length} claims=${fixture.claims.length} evidence=${fixture.evidence.length} relations=${fixture.relations.length}`);
    } finally {
      opened.close();
    }
    return;
  }

  if (command === "init") {
    const withPolicy = args.includes("--with-policy");
    const result = initProject(projectArg(args), { policy: withPolicy });
    console.log(`Initialized Kage memory for ${result.index.projectDir}`);
    console.log("\nCreated:");
    console.log("  .agent_memory/            memory packets + indexes (only directory Kage owns)");
    console.log(`  .gitattributes            kage-packet merge driver for packet JSON${result.gitAttributes.changed ? "" : " (already current)"}`);
    if (result.policyInstalled) {
      console.log("  AGENTS.md, CLAUDE.md      agent policy (requested via --with-policy)");
      console.log("  .claude/settings.json     allowed kage tools (requested via --with-policy)");
    }
    console.log(`\nPackets: ${result.index.packets}`);
    if (result.index.migrated) console.log(`Migrated legacy nodes: ${result.index.migrated}`);
    console.log(result.validation.ok ? "Validation passed." : "Validation failed.");
    if (result.validation.errors.length) console.log(`Errors:\n${result.validation.errors.map((error) => `  - ${error}`).join("\n")}`);
    if (result.validation.warnings.length) console.log(`Warnings:\n${result.validation.warnings.map((warning) => `  - ${warning}`).join("\n")}`);
    console.log("\nTip — version control:");
    console.log("  commit  .agent_memory/packets/    (your team's reviewed memory)");
    console.log("  ignore  .agent_memory/indexes/ .agent_memory/reports/    (regenerated)");
    console.log("\nEnable the packet merge driver once per clone:");
    console.log(`  ${PACKET_MERGE_DRIVER_CONFIG}`);
    if (!result.policyInstalled) {
      console.log("\nNot written (opt-in): agent policy files. Add them with `kage policy --project .`");
      console.log("or rerun `kage init --with-policy` when you're ready to commit them.");
    }
    console.log("\nNext:");
    console.log("  kage setup <agent> --project . --write    wire your agent (claude-code, codex, cursor, ...)");
    console.log("  kage viewer --project .                   see the dashboard");
    if (!result.validation.ok) process.exit(2);
    return;
  }

  if (command === "install") {
    const project = projectArg(args);
    const agentsFlag = takeArg(args, "--agents");
    const skipAgents = args.includes("--no-agents");
    const json = args.includes("--json");
    const home = homedir();
    // Detection is config-dir presence, not PATH: agents like Cursor never expose a binary.
    const probes: Array<{ agent: SetupAgent; paths: string[] }> = [
      { agent: "claude-code", paths: [join(home, ".claude.json"), join(home, ".claude")] },
      { agent: "codex", paths: [join(home, ".codex")] },
      { agent: "cursor", paths: [join(home, ".cursor")] },
      { agent: "windsurf", paths: [join(home, ".codeium", "windsurf")] },
      { agent: "gemini-cli", paths: [join(home, ".gemini")] },
      { agent: "opencode", paths: [join(home, ".config", "opencode"), join(home, ".opencode")] },
      { agent: "goose", paths: [join(home, ".config", "goose")] },
      { agent: "aider", paths: [join(home, ".aider.conf.yml")] },
    ];
    const requested = agentsFlag
      ? agentsFlag.split(",").map((a) => a.trim()).filter((a): a is SetupAgent => SETUP_AGENTS.includes(a as SetupAgent))
      : null;
    const detected = requested ?? probes.filter((p) => p.paths.some((path) => existsSync(path))).map((p) => p.agent);

    const init = initProject(project, { policy: false });
    // T4 — day-one value: bootstrap one verifiable starter runbook from package.json scripts so the
    // very first recall answers from memory instead of returning nothing.
    const bootstrap = bootstrapStarterMemory(project);
    // Always write the repo policy (AGENTS.md + CLAUDE.md) — it is what instructs
    // agents to use Kage and it travels with the repo, so teammates who clone are
    // covered even before they wire their own agent. Decoupled from agent detection:
    // a machine where no agent is auto-detected must still commit the policy.
    const policy = installAgentPolicy(project);
    const wired: Array<{ agent: SetupAgent; ok: boolean; config_path?: string; error?: string }> = [];
    if (!skipAgents) {
      for (const agent of detected) {
        try {
          const result = setupAgent(agent, project, { write: true });
          wired.push({ agent, ok: result.wrote, config_path: result.config_path ?? undefined, error: result.wrote || result.write_supported ? undefined : `config is print-only — run: kage setup ${agent} --project . and paste it` });
        } catch (error) {
          wired.push({ agent, ok: false, error: error instanceof Error ? error.message : String(error) });
        }
      }
    }
    if (json) {
      console.log(JSON.stringify({ project_dir: init.index.projectDir, packets: init.index.packets, validation_ok: init.validation.ok, agents: wired, bootstrap }, null, 2));
      if (!init.validation.ok) process.exit(2);
      return;
    }
    console.log(`Kage installed in ${init.index.projectDir}\n`);
    console.log("  Memory      .agent_memory/ created — packets are plain files, reviewable in git");
    if (bootstrap.created) {
      console.log(`  First win   starter runbook captured ("${bootstrap.title}") — try it now:`);
      console.log(`                kage context "how do I run the tests" --project .`);
    }
    console.log(`  Indexes     ${init.index.indexes.length} built (code graph, recall, structure)`);
    console.log(`  Policy      AGENTS.md + CLAUDE.md ${policy.created ? "written" : policy.updated ? "updated" : "current"} — commit these so every teammate's agent uses Kage`);
    if (skipAgents) {
      console.log("  Agents      skipped (--no-agents)");
    } else if (!wired.length) {
      console.log("  Agents      none detected — wire one manually: kage setup <agent> --project . --write");
    } else {
      for (const w of wired) {
        if (w.ok) console.log(`  Agents      ${w.agent} ✓ wired${w.config_path ? ` (${w.config_path})` : ""}`);
        else console.log(`  Agents      ${w.agent} ✗ ${w.error ?? "print-only; run kage setup " + w.agent + " --project . --write"}`);
      }
    }
    // Do the version-control housekeeping instead of telling the user to. Both are
    // idempotent and safe to skip if this isn't a git repo.
    let vcDone = false;
    try {
      const gitignorePath = join(project, ".gitignore");
      const want = [".agent_memory/indexes/", ".agent_memory/reports/"];
      const current = existsSync(gitignorePath) ? readFileSync(gitignorePath, "utf8") : "";
      const missing = want.filter((line) => !current.split("\n").some((l) => l.trim() === line));
      if (missing.length) {
        const prefix = current && !current.endsWith("\n") ? "\n" : "";
        writeFileSync(gitignorePath, `${current}${prefix}${current ? "" : "# Kage: regenerated, not committed\n"}${missing.join("\n")}\n`, "utf8");
      }
      execFileSync("git", ["-C", project, "config", "merge.kage-packet.driver", "npx -y @kage-core/kage-graph-mcp merge-packet %A %O %B"], { stdio: "ignore" });
      vcDone = true;
    } catch { /* not a git repo or no git — fall back to a hint */ }
    console.log(`  Git         ${vcDone ? ".gitignore + packet merge driver configured" : "skipped (not a git repo)"}`);
    if (skipAgents || !wired.some((w) => w.ok)) {
      console.log("\nNext:  wire an agent — kage setup <agent> --project . --write");
    } else if (wired.some((w) => w.agent === "claude-code" && w.ok)) {
      console.log("\nNext:  restart your agent — Kage then recalls automatically every session.");
    } else {
      console.log("\nNext:  restart your agent — its policy file now instructs it to call Kage each session.");
    }
    console.log("       kage scan      a Truth Report on this repo");
    if (!vcDone) console.log(`\nWhen this becomes a git repo, run once: ${PACKET_MERGE_DRIVER_CONFIG}`);
    if (!init.validation.ok) process.exit(2);
    return;
  }

  if (command === "policy") {
    const result = installAgentPolicy(projectArg(args));
    console.log(`${result.created ? "Created" : result.updated ? "Updated" : "Already current"} agent policy: ${result.path}`);
    return;
  }

  if (command === "doctor") {
    const result = doctorProject(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Kage Doctor: ${result.projectDir}`);
    console.log(`Memory root: ${result.memoryRoot}`);
    console.log(`Git branch: ${result.gitBranch ?? "(not a git repo)"}`);
    console.log(`Packets: ${result.packets}`);
    console.log(`Pending: ${result.pending}`);
    console.log(`Public candidates: ${result.publicCandidates}`);
    console.log(`Graph entities: ${result.graphEntities}`);
    console.log(`Graph edges: ${result.graphEdges}`);
    console.log(`Registry recommendations: ${result.registryRecommendations.length}`);
    console.log(`Indexes present: ${result.indexesPresent.join(", ") || "(none)"}`);
    console.log(`Indexes missing: ${result.indexesMissing.join(", ") || "(none)"}`);
    console.log(result.validation.ok ? "Validation: passed" : "Validation: failed");
    if (result.validation.errors.length) console.log(`Errors:\n${result.validation.errors.map((error) => `  - ${error}`).join("\n")}`);
    if (result.validation.warnings.length) console.log(`Warnings:\n${result.validation.warnings.map((warning) => `  - ${warning}`).join("\n")}`);
    console.log("\nRecall smoke test:\n");
    console.log(result.sampleRecall);
    if (!result.validation.ok) {
      console.log("\nSomething broken? kage repair --project .");
      process.exit(2);
    }
    return;
  }

  if (command === "repair") {
    const result = repairProject(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      if (!result.ok || !result.validation.ok) process.exit(2);
      return;
    }
    console.log(`Kage repair — ${result.project_dir}\n`);
    const areaLabel: Record<string, string> = { packets: "Memory", indexes: "Indexes", locks: "Locks", agents: "Agents" };
    for (const action of result.actions) {
      const mark = action.status === "fixed" ? "✓" : action.status === "failed" ? "✗" : "•";
      console.log(`  ${(areaLabel[action.area] ?? action.area).padEnd(12)}${mark} ${action.target} — ${action.detail}`);
    }
    console.log(`\n${result.fixed} fixed, ${result.skipped} already healthy, ${result.failed} failed`);
    if (result.removed_packets.length) {
      console.log(`\nRemoved ${result.removed_packets.length} unrecoverable packet(s) — backups kept in .agent_memory/backup/:`);
      for (const removed of result.removed_packets) console.log(`  ${removed}`);
    }
    console.log(result.validation.ok ? "Validation: passed" : "Validation: still failing");
    if (result.validation.errors.length) console.log(`Errors:\n${result.validation.errors.map((error) => `  - ${error}`).join("\n")}`);
    if (!result.ok || !result.validation.ok) process.exit(2);
    return;
  }

  if (command === "setup") {
    const action = args[1];
    if (action === "list") {
      console.log(SETUP_AGENTS.join("\n"));
      return;
    }
    if (action === "doctor") {
      const result = setupDoctor(projectArg(args));
      if (args.includes("--json")) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      console.log("Kage setup doctor");
      for (const item of result) {
        const hookStatus = item.hook_summary
          ? item.hook_summary.ready ? " hooks: installed" : ` hooks: missing ${item.hook_summary.missing.join(", ")}`
          : "";
        console.log(`- ${item.agent}: ${item.configured ? "configured" : "not detected"}${hookStatus}${item.config_path ? ` (${item.config_path})` : ""}`);
      }
      return;
    }
    if (action === "verify-agent") {
      const agent = takeArg(args, "--agent") ?? "codex";
      if (!SETUP_AGENTS.includes(agent as SetupAgent)) usage();
      const result = verifyAgentActivation(agent as SetupAgent, projectArg(args));
      if (args.includes("--json")) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      console.log(`Kage agent activation: ${result.agent}`);
      console.log(`Status: ${result.status}`);
      console.log(`Config: ${result.checks.config_mentions_kage ? "kage configured" : result.checks.config_present ? "config present, kage missing" : "missing"}${result.config_path ? ` (${result.config_path})` : ""}`);
      console.log(`Policy: ${result.checks.policy_installed ? "installed" : "missing"}`);
      console.log(`Indexes: ${result.checks.indexes_present ? "present" : "missing"}`);
      console.log(`Recall: ${result.checks.recall_works ? "ok" : "failed"} (${result.recall_preview})`);
      console.log(`Code graph: ${result.checks.code_graph_works ? "ok" : "failed"} (${result.code_graph_summary})`);
      if (result.hook_summary) {
        console.log(`Ambient hooks: ${result.checks.ambient_hooks_present ? "installed" : `missing ${result.hook_summary.missing.join(", ")}`}`);
      }
      console.log(`Active MCP tool: ${result.checks.mcp_tool_reachable ? "reachable" : "not verified from CLI"}`);
      if (result.warnings.length) console.log(`Warnings:\n${result.warnings.map((warning) => `  - ${warning}`).join("\n")}`);
      if (result.next_steps.length) console.log(`Next steps:\n${result.next_steps.map((step) => `  - ${step}`).join("\n")}`);
      if (result.status !== "ready") process.exitCode = 2;
      return;
    }
    if (!action || !SETUP_AGENTS.includes(action as SetupAgent)) usage();
    const result = setupAgent(action as SetupAgent, projectArg(args), { write: args.includes("--write") });
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Kage setup for ${result.agent}`);
    if (result.config_path) console.log(`Config path: ${result.config_path}`);
    console.log(result.write_supported ? `Write support: ${result.wrote ? "wrote config" : "available with --write"}` : "Write support: print-only");
    console.log("\nConfig:\n");
    console.log(result.config);
    if (result.instructions.length) {
      console.log("\nInstructions:");
      for (const instruction of result.instructions) console.log(`- ${instruction}`);
    }
    if (result.warnings.length) {
      console.log("\nWarnings:");
      for (const warning of result.warnings) console.log(`- ${warning}`);
    }
    return;
  }

  if (command === "gen-plugin-hooks") {
    // Maintainer tool: regenerate plugin/hooks/* from the setupAgent("claude-code") templates
    // so the plugin and the npm install path ship identical hooks (one source of truth).
    const pluginDir = takeArg(args, "--plugin-dir") ?? join(process.cwd(), "plugin");
    const result = generatePluginHooks(pluginDir);
    if (args.includes("--json")) { console.log(JSON.stringify({ plugin_dir: pluginDir, ...result }, null, 2)); return; }
    console.log(`Generated plugin hooks in ${join(pluginDir, "hooks")}`);
    console.log(`  scripts: ${result.scripts.join(", ")}`);
    console.log(`  events:  ${result.events.join(", ")}`);
    if (result.removed.length) console.log(`  removed: ${result.removed.join(", ")}`);
    return;
  }

  if (command === "daemon") {
    const action = args[1];
    const projectDir = projectArg(args);
    if (action === "start") {
      await startDaemon(projectDir, {
        restPort: numberArg(args, "--port", 3111),
        // Opt-in, and audit-only: startOptionalVnextRuntime starts the local runtime in audit mode
        // and leaves the legacy daemon serving if it cannot.
        vnext: args.includes("--vnext"),
      });
      return;
    }
    if (action === "stop") {
      const result = stopDaemon(projectDir);
      if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
      else console.log(result.message);
      if (!result.ok) process.exit(2);
      return;
    }
    if (action === "status") {
      const result = readDaemonStatus(projectDir);
      if (args.includes("--json")) console.log(JSON.stringify(result ?? { ok: false }, null, 2));
      else if (result) console.log(`Kage daemon pid ${result.pid} at http://${result.host}:${result.rest_port}`);
      else console.log("No Kage daemon status found.");
      return;
    }
    if (action === "doctor") {
      const result = daemonDoctor(projectDir);
      if (args.includes("--json")) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      console.log(`Daemon configured: ${result.configured ? "yes" : "no"}`);
      console.log(`Daemon running: ${result.running ? "yes" : "no"}`);
      console.log("Endpoints:");
      for (const endpoint of result.endpoints) console.log(`- ${endpoint}`);
      if (result.warnings.length) console.log(`Warnings:\n${result.warnings.map((warning) => `  - ${warning}`).join("\n")}`);
      return;
    }
    usage();
  }

  if (command === "viewer") {
    await startViewer(projectArg(args), { port: numberArg(args, "--port", 3113) });
    return;
  }

  // `open` is today's viewer under the vNext name, so the connect → status → open → receipts
  // surface is complete now and Phase C can replace the dashboard behind it without renaming a
  // command a user has already learned.
  if (command === "open") {
    await startViewer(projectArg(args), { port: numberArg(args, "--port", 3113) });
    return;
  }

  if (command === "connect") {
    const project = projectArg(args);
    const json = args.includes("--json");
    // There is no --mode flag, by design: Phase A connects in audit mode, and audit forwards the
    // agent's exact bytes. Enabling prompt mutation is not something a connect default may do.
    const result = await connectProject({
      project_dir: project,
      agents: listArg(takeArg(args, "--agents")),
      start: !args.includes("--no-start"),
      initialize_memory: (dir) => { initProject(dir, { policy: false }); },
    });
    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(renderConnect(result));
    return;
  }

  if (command === "status") {
    const project = projectArg(args);
    const report = await vnextStatus(runtimeClientFor(project));
    const validation = validateProject(project);
    const memory = {
      ok: validation.ok,
      errors: validation.errors.length,
      warnings: validation.warnings.length,
    };
    if (args.includes("--json")) {
      console.log(JSON.stringify({ ...report, memory }, null, 2));
      if (!validation.ok) process.exit(2);
      return;
    }
    console.log(renderStatus(report));
    console.log("");
    console.log(`Memory: ${memory.ok ? "valid" : "INVALID"} (${memory.errors} errors, ${memory.warnings} warnings)`);
    if (!validation.ok) process.exit(2);
    return;
  }

  if (command === "receipts") {
    const project = projectArg(args);
    const taskId = takeArg(args, "--task");
    const limit = args.includes("--limit") ? numberArg(args, "--limit", 0) : undefined;
    const report = await vnextReceipts(runtimeClientFor(project), {
      task_id: taskId,
      limit: Number.isSafeInteger(limit) && (limit as number) > 0 ? limit : undefined,
    });
    if (args.includes("--json")) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }
    console.log(renderReceipts(report));
    return;
  }

  if (command === "up") {
    if (args.includes("--help")) {
      console.log("kage up — bring the ambient stack up with one command; the proxy runs in the background.");
      console.log("");
      console.log("Usage:  kage up [--project <dir>] [--port 8788] [--mode audit|assist] [--foreground] [--no-runtime] [--json]");
      console.log("");
      console.log("In order: (1) connect — writes the audit-only vNext config (up NEVER writes assist config;");
      console.log("--mode governs the proxy process alone, exactly like kage proxy --mode); (2) starts the");
      console.log("vNext runtime daemon (detached) when this Node supports it — if it can't run, the proxy");
      console.log("still works and evidence just isn't captured to /v2/events (--no-runtime skips it); (3)");
      console.log("starts the proxy DETACHED in the background on --port (default 8788): it survives this");
      console.log("terminal closing, and `kage down` stops it. A machine reboot stops it too — run `kage up`");
      console.log("once afterwards; there is no system service. --foreground keeps the proxy in this");
      console.log("terminal instead (Ctrl-C stops it; no daemon state is written, so `kage down` does not");
      console.log("manage it).");
      console.log("");
      console.log("Default --mode audit: measurement only, nothing injected — the safe onboarding default.");
      console.log("Note: bare `kage proxy` keeps its historical assist default; `kage up` deliberately does not.");
      console.log("Already running? up verifies the recorded proxy (pid alive + port accepting — never the");
      console.log("state file alone), reuses it, and exits 0; a stale record is cleaned and started fresh.");
      console.log("Then, in ANY terminal: kage run -- <agent>   or   export ANTHROPIC_BASE_URL=http://localhost:<port>");
      return;
    }
    const project = projectArg(args);
    const port = args.includes("--port") ? numberArg(args, "--port", 8788) : 8788;
    const modeArg = takeArg(args, "--mode");
    if (modeArg && modeArg !== "audit" && modeArg !== "assist") {
      console.error(`Unknown --mode "${modeArg}". Use audit (measure only, forward the client's exact bytes) or assist (inject memory).`);
      process.exitCode = 1;
      return;
    }
    const mode = modeArg === "assist" ? ("assist" as const) : ("audit" as const);
    const foreground = args.includes("--foreground");
    let result;
    try {
      result = await upProject({
        project_dir: project,
        port,
        mode,
        start_runtime: !args.includes("--no-runtime"),
        initialize_memory: (dir) => { initProject(dir, { policy: false }); },
      });
    } catch (error) {
      // Fail-open ethos: nothing half-started is left behind — the config write is idempotent,
      // the runtime is a detached daemon or nothing, and the proxy has not started yet.
      console.error(`kage up: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }

    // The default path: start the proxy DETACHED, confirm it listens, record it, exit 0. The
    // state file is written by this parent only after liveness is confirmed (proxy-daemon.ts),
    // so a failed start leaves nothing behind but the log.
    if (result.proxy.action === "start" && !foreground) {
      const started = await startProxyDaemon({ project_dir: project, port: result.port, mode: result.mode });
      if (!started.ok) {
        if (args.includes("--json")) {
          console.log(JSON.stringify({ ...result, daemon: { running: false, ...started } }, null, 2));
        }
        console.error(`kage up: the background proxy did not start — ${started.detail}. Log: ${started.log_path}`);
        process.exit(1);
      }
      if (args.includes("--json")) {
        const daemon = { running: true, pid: started.state.pid, port: started.state.port, mode: started.state.mode, log_path: started.state.log_path, reason: null };
        console.log(JSON.stringify({ ...result, daemon }, null, 2));
        return;
      }
      console.log(renderUp(result));
      console.log("");
      console.log(`Proxy running in the background (pid ${started.state.pid}, log: ${started.state.log_path}). Stop it with \`kage down --project ${project}\`.`);
      console.log("It survives this terminal; a machine reboot stops it — run `kage up` once afterwards.");
      return;
    }

    // reuse_running carries the verified daemon record inside result.proxy.daemon, so --json
    // consumers see the live pid/port/mode without a separate field.
    if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
    else console.log(renderUp(result, { foreground }));
    // reuse_running: the verified daemon already serves this project — exit 0, nothing to start.
    // already_listening: a listener we did not record owns the port; the honest message printed
    // above suggests --port and we exit 0 without touching any state.
    if (result.proxy.action !== "start") return;
    console.log("");
    const server = startProxy(project, { port: result.port, mode: result.mode });
    server.on("error", (error) => {
      const code = (error as NodeJS.ErrnoException).code;
      console.error(code === "EADDRINUSE"
        ? `kage up: port ${result.port} was claimed between the check and the start. If that's another Kage proxy you're already set; otherwise rerun with --port <n>.`
        : `kage up: the proxy could not start — ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    });
    return;
  }

  if (command === "hook") {
    const action = args[1];
    const projectDir = projectArg(args);
    const result = action === "install"
      ? kageHookInstall(projectDir)
      : action === "status"
        ? kageHookStatus(projectDir)
        : action === "uninstall"
          ? kageHookUninstall(projectDir)
          : null;
    if (!result) usage();
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      if (!result.ok) process.exit(2);
      return;
    }
    console.log(result.message);
    if (result.hook_path) console.log(`Hook: ${result.hook_path}`);
    console.log(`Installed: ${result.installed ? "yes" : "no"}`);
    console.log(`Changed: ${result.changed ? "yes" : "no"}`);
    if (result.warnings.length) console.log(`Warnings:\n${result.warnings.map((warning) => `  - ${warning}`).join("\n")}`);
    if (result.errors.length) console.log(`Errors:\n${result.errors.map((error) => `  - ${error}`).join("\n")}`);
    if (!result.ok) process.exit(2);
    return;
  }

  if (command === "gc") {
    const project = projectArg(args);
    const dryRun = args.includes("--dry-run");
    const force = args.includes("--force");
    const result = gcProject(project, { dryRun, force });
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    const label = dryRun ? " [dry-run]" : "";
    console.log(`Kage GC${label} — scanned ${result.total_scanned} packets`);
    if (result.deprecated.length) {
      console.log(`\nDeprecated (${result.deprecated.length}):`);
      for (const p of result.deprecated) console.log(`  ✗ ${p.title} — ${p.reason}`);
    }
    if (result.deleted.length) {
      console.log(`\nDeleted (${result.deleted.length}):`);
      for (const p of result.deleted) console.log(`  ✗ ${p.title}`);
    }
    if (!result.deprecated.length && !result.deleted.length) {
      console.log("No stale packets found — memory is clean.");
    }
    return;
  }

  if (command === "compact") {
    const project = projectArg(args);
    // Safe by default, matching kage_compact's MCP default (dry_run:true unless set
    // false) — the CLI used to default to executing, the opposite safety posture of
    // the exact same compactProject() call reached via MCP. --dry-run is still
    // accepted (now a no-op) so existing scripts that pass it keep working.
    const dryRun = !args.includes("--execute");
    const result = compactProject(project, { dryRun });
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    const label = dryRun ? " [dry-run]" : "";
    console.log(`Kage compact${label} — scanned ${result.total_scanned} packets`);
    if (result.pruned_citations.length) {
      console.log(`\nPruned dead citations (${result.pruned_citations.length}):`);
      for (const p of result.pruned_citations) console.log(`  ✗ ${p.title} — removed ${p.removed_paths.join(", ")}`);
    }
    if (result.deprecated.length) {
      console.log(`\nDeprecated stale (${result.deprecated.length}):`);
      for (const p of result.deprecated) console.log(`  ✗ ${p.title} — ${p.reason}`);
    }
    if (result.duplicate_clusters.length) {
      console.log(`\nDuplicate clusters to merge (${result.duplicate_clusters.length}) — review with kage_compact / kage supersede:`);
      for (const cluster of result.duplicate_clusters) {
        console.log(`  ~${cluster.score} similarity:`);
        for (const member of cluster.packets) console.log(`     • ${member.title} (${member.id})`);
      }
    }
    if (!result.pruned_citations.length && !result.deprecated.length && !result.duplicate_clusters.length) {
      console.log("Nothing to compact — memory is clean.");
    }
    return;
  }

  if (command === "verify") {
    const project = projectArg(args);
    const idFlag = args.indexOf("--id");
    const id = idFlag >= 0 ? args[idFlag + 1] : undefined;
    const result = verifyCitations(project, { id });
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      if (!result.ok) process.exit(2);
      return;
    }
    if (!result.ok) {
      console.log(`Verification failed:\n${result.errors.map((error) => `  - ${error}`).join("\n")}`);
      process.exit(2);
    }
    console.log(`Kage verify — ${result.checked} packet(s): ${result.valid} valid, ${result.stale} stale, ${result.ungrounded} ungrounded`);
    for (const entry of result.packets.filter((p) => p.stale || !p.grounded)) {
      const flags = [entry.stale ? `stale:${entry.stale_severity}` : "", entry.grounded ? "" : "ungrounded"].filter(Boolean).join(", ");
      console.log(`  ⚠ ${entry.title} [${flags}]`);
      if (entry.missing_paths.length) console.log(`      missing: ${entry.missing_paths.join(", ")}`);
      for (const reason of entry.stale_reasons) console.log(`      - ${reason}`);
    }
    return;
  }

  if (command === "suppressed") {
    const result = kageSuppressedMemory(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Kage suppressed memory — ${result.count} packet(s) currently withheld from recall`);
    for (const item of result.items) {
      console.log(`  ⊘ ${item.title}`);
      console.log(`      ${item.reason}`);
    }
    if (!result.count) console.log("  (none — all recallable memory is grounded and current)");
    return;
  }

  if (command === "refresh") {
    const result = refreshProject(projectArg(args), { full: args.includes("--full"), force: args.includes("--force") });
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      if (!result.ok) process.exit(2);
      return;
    }
    console.log(`Refreshed ${result.project_dir}`);
    if (result.quiet_refresh) console.log("Quiet refresh (non-default branch): packet metadata not rewritten on disk; use --force to persist.");
    console.log(`Packets indexed: ${result.index.packets}`);
    console.log(`Packet metadata updated: ${result.updated_packets}`);
    console.log(`Code graph: ${result.code_graph.files} files, ${result.code_graph.symbols} symbols, ${result.code_graph.imports} imports, ${result.code_graph.calls} calls`);
    console.log(`Memory graph: ${result.memory_graph.entities} entities, ${result.memory_graph.edges} edges, ${result.memory_graph.episodes} episodes`);
    console.log(`Stale packets: ${result.stale_packets.length}`);
    for (const packet of result.stale_packets.slice(0, 8)) {
      console.log(`  - ${packet.title} (${packet.id}): ${packet.reasons.join("; ")}`);
    }
    console.log(result.validation.ok ? "Validation: passed" : "Validation: failed");
    if (result.validation.errors.length) console.log(`Errors:\n${result.validation.errors.map((error) => `  - ${error}`).join("\n")}`);
    if (result.validation.warnings.length) console.log(`Warnings:\n${result.validation.warnings.map((warning) => `  - ${warning}`).join("\n")}`);
    console.log(`Next actions:\n${result.next_actions.map((action) => `  - ${action}`).join("\n")}`);
    if (!result.ok) process.exit(2);
    return;
  }

  if (command === "minimal-change") {
    const action = args[1];
    if (action === "check") {
      const project = projectArg(args);
      const report = minimalChangeReport(project, { base: takeArg(args, "--base") ?? null });
      if (args.includes("--json")) {
        console.log(JSON.stringify(report, null, 2));
        if (report && !report.ok) process.exit(2);
        return;
      }
      if (!report) {
        console.log("Minimal Change Guard is not enabled for this project.");
        console.log("Enable it in .agent_memory/daemon/vnext/config.json (vnext.minimal_change).");
        return;
      }
      console.log(`Minimal Change Guard (${report.mode}) for ${project}`);
      console.log(report.summary);
      for (const finding of report.findings) {
        const tag = report.blocking.includes(finding) ? "BLOCK" : finding.severity === "info" ? "note " : "warn ";
        console.log(`  [${tag}] ${finding.kind}: ${finding.title}${finding.deterministic ? "" : " (advisory, model opinion)"}`);
        for (const evidence of finding.evidence.slice(0, 3)) {
          console.log(`         evidence: ${evidence.source_uri}${evidence.symbol ? `#${evidence.symbol}` : ""}`);
        }
      }
      if (report.suppressed.length) {
        console.log(`Suppressed: ${report.suppressed.length} finding(s) with recorded justifications.`);
      }
      if (!report.ok) {
        console.log("To dismiss a finding, record a justification (actor, reason, commit, expiry).");
        process.exit(2);
      }
      return;
    }
    usage();
  }

  if (command === "pr") {
    const action = args[1];
    if (action === "summarize") {
      const result = prSummarize(projectArg(args));
      if (args.includes("--json")) {
        console.log(JSON.stringify(result, null, 2));
        if (!result.ok) process.exit(2);
        return;
      }
      console.log(`PR summary for ${result.project_dir}`);
      console.log(`Branch: ${result.branch ?? "(detached)"}`);
      console.log(`Changed files: ${result.changed_files.join(", ") || "(none)"}`);
      if (result.diff_memory_packet_id) console.log(`Repo memory: ${result.diff_memory_packet_id}`);
      if (result.branch_summary_path) console.log(`Branch summary: ${result.branch_summary_path}`);
      if (result.review_artifact_path) console.log(`Review artifact: ${result.review_artifact_path}`);
      if (result.warnings.length) console.log(`Warnings:\n${result.warnings.map((warning) => `  - ${warning}`).join("\n")}`);
      if (result.errors.length) console.log(`Errors:\n${result.errors.map((error) => `  - ${error}`).join("\n")}`);
      if (!result.ok) process.exit(2);
      return;
    }
    if (action === "check") {
      const result = prCheck(projectArg(args));
      if (args.includes("--json")) {
        console.log(JSON.stringify(result, null, 2));
        if (!result.ok) process.exit(2);
        return;
      }
      // The stale-catch moment comes first: the human-readable heartbeat that a
      // change just invalidated team memory beats the mechanical check output.
      printStaleCatch(staleCatch(projectArg(args)));
      console.log("");
      console.log(`PR memory check for ${result.project_dir}`);
      console.log(`Branch: ${result.branch ?? "(detached)"}`);
      console.log(`Changed files: ${result.changed_files.length}`);
      console.log(`Memory packet changes: ${result.memory_packet_changes.length}`);
      console.log(`Code graph current: ${result.code_graph_current ? "yes" : "no"}`);
      console.log(`Memory graph current: ${result.memory_graph_current ? "yes" : "no"}`);
      console.log(`Stale packets: ${result.stale_packets.length}`);
      if (result.warnings.length) console.log(`Warnings:\n${result.warnings.map((warning) => `  - ${warning}`).join("\n")}`);
      if (result.errors.length) console.log(`Errors:\n${result.errors.map((error) => `  - ${error}`).join("\n")}`);
      console.log(`Required actions:\n${result.required_actions.map((action) => `  - ${action}`).join("\n")}`);
      if (!result.ok) process.exit(2);
      return;
    }
    usage();
  }

  if (command === "staleguard") {
    // Lightweight stale-catch for pre-commit/pre-push hooks: no graph builds,
    // no validation — just "did this change invalidate team memory?". Advisory
    // by design (exit 0) so it informs the commit instead of blocking it.
    const result = staleCatch(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    printStaleCatch(result);
    return;
  }

  if (command === "upgrade") {
    const commandLine = "npm install -g @kage-core/kage-graph-mcp@latest";
    if (args.includes("--dry-run")) {
      console.log(commandLine);
      return;
    }
    console.log(`Running: ${commandLine}`);
    execFileSync("npm", ["install", "-g", "@kage-core/kage-graph-mcp@latest"], { stdio: "inherit" });
    console.log("Kage upgraded. Restart Codex or Claude Code so the MCP process reloads the new package.");
    return;
  }

  if (command === "graph") {
    const query = firstPositional(args);
    if (query) {
      const result = queryGraph(projectArg(args), query);
      if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
      else console.log(result.context_block);
      return;
    }
    if (args.includes("--mermaid")) {
      const result = graphMermaid(projectArg(args));
      console.log("```mermaid");
      console.log(result.mermaid);
      console.log("```");
      return;
    }
    const graph = buildKnowledgeGraph(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(graph, null, 2));
      return;
    }
    console.log(`Kage Graph: ${graph.project_dir}`);
    console.log(`Entities: ${graph.entities.length}`);
    console.log(`Edges: ${graph.edges.length}`);
    console.log(`Episodes: ${graph.episodes.length}`);
    console.log(`Branch: ${graph.repo_state.branch ?? "(none)"}`);
    console.log("\nTop facts:");
    for (const edge of graph.edges.slice(0, 10)) console.log(`- ${edge.fact}`);
    return;
  }

  if (command === "graph-registry") {
    const result = buildGraphRegistryManifest(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Kage Graph Registry: ${result.project_dir}`);
    console.log(`Manifest: ${result.path}`);
    console.log(`Artifacts: ${result.artifacts.length}`);
    console.log(`Packets: ${result.manifest.payload.sources.packet_count}`);
    console.log(`Signature: ${result.manifest.signature.payload_sha256}`);
    if (result.errors.length) {
      console.log("\nErrors:");
      for (const error of result.errors) console.log(`  - ${error}`);
      process.exitCode = 2;
    }
    return;
  }

  if (command === "community-domains") {
    console.log(await kageListPublicDomains());
    return;
  }

  if (command === "community-search") {
    const query = firstPositional(args);
    if (!query) usage();
    console.log(await kageSearchPublicGraph(query, takeArg(args, "--domain") ?? null));
    return;
  }

  if (command === "community-fetch") {
    const domain = takeArg(args, "--domain");
    const nodeId = takeArg(args, "--node");
    if (!domain || !nodeId) usage();
    console.log(await kageFetchPublicGraphNode(domain, nodeId));
    return;
  }

  if (command === "ledger") {
    const result = kageSessionLearningLedger(projectArg(args), {
      sessionId: takeArg(args, "--session"),
      limit: args.includes("--limit") ? numberArg(args, "--limit", 50) : undefined,
    });
    if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
    else console.log(result.context_block);
    return;
  }

  if (command === "workflow") {
    console.log(KAGE_WORKFLOW_TEXT);
    return;
  }

  if (command === "code-graph") {
    const query = firstPositional(args);
    if (query) {
      const result = queryCodeGraph(projectArg(args), query);
      if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
      else console.log(result.context_block);
      return;
    }
    const graph = buildCodeGraph(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(graph, null, 2));
      return;
    }
    console.log(`Kage Code Graph: ${graph.project_dir}`);
    console.log(`Files: ${graph.files.length}`);
    console.log(`Symbols: ${graph.symbols.length}`);
    console.log(`Imports: ${graph.imports.length}`);
    console.log(`Calls: ${graph.calls.length}`);
    console.log(`Routes: ${graph.routes.length}`);
    console.log(`Tests: ${graph.tests.length}`);
    console.log(`Packages/scripts: ${graph.packages.length}`);
    console.log(`Branch: ${graph.repo_state.branch ?? "(none)"}`);
    console.log("\nTop symbols:");
    for (const symbol of graph.symbols.slice(0, 10)) console.log(`- ${symbol.kind} ${symbol.name} (${symbol.path}:${symbol.line})`);
    return;
  }

  if (command === "risk") {
    const result = kageRisk(projectArg(args), listArg(takeArg(args, "--targets")), listArg(takeArg(args, "--changed-files")));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log("Kage risk assessment");
    for (const item of Object.values(result.targets)) {
      console.log(`- ${item.risk_summary}`);
      if (item.dependents.length) console.log(`  Dependents: ${item.dependents.slice(0, 5).join(", ")}`);
      if (item.git.co_change_partners.length) console.log(`  Co-change: ${item.git.co_change_partners.map((p) => `${p.file_path} (${p.count})`).join(", ")}`);
    }
    if (result.global_hotspots.length) {
      console.log("Global hotspots:");
      for (const hotspot of result.global_hotspots) console.log(`- ${hotspot.file_path}: ${hotspot.commit_count_90d} commits in 90d`);
    }
    if (result.warnings.length) console.log(`Warnings:\n${result.warnings.map((warning) => `  - ${warning}`).join("\n")}`);
    return;
  }

  if (command === "dependency-path") {
    const from = takeArg(args, "--from");
    const to = takeArg(args, "--to");
    if (!from || !to) usage();
    const result = kageDependencyPath(projectArg(args), from, to);
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(result.summary);
    if (result.path.length) console.log(`Path: ${result.path.join(" -> ")}`);
    for (const edge of result.edges) {
      console.log(`- ${edge.from_path}:${edge.line} ${edge.kind} ${edge.specifier} -> ${edge.to_path}`);
    }
    if (result.warnings.length) console.log(`Warnings:\n${result.warnings.map((warning) => `  - ${warning}`).join("\n")}`);
    return;
  }

  if (command === "cleanup-candidates") {
    const result = kageCleanupCandidates(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Kage cleanup candidates: ${result.summary}`);
    for (const candidate of result.candidates.slice(0, 20)) {
      console.log(`- ${candidate.path}: ${candidate.confidence} (${Math.round(candidate.score * 100)}%)`);
      console.log(`  ${candidate.reasons.join("; ")}`);
    }
    if (result.warnings.length) console.log(`Warnings:\n${result.warnings.map((warning) => `  - ${warning}`).join("\n")}`);
    return;
  }

  if (command === "reviewers") {
    const result = kageReviewerSuggestions(projectArg(args), listArg(takeArg(args, "--targets")), listArg(takeArg(args, "--changed-files")));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Kage reviewer suggestions: ${result.summary}`);
    for (const suggestion of result.suggestions) {
      console.log(`- ${suggestion.reviewer}: ${Math.round(suggestion.score)}%`);
      console.log(`  ${suggestion.reasons.slice(0, 3).join("; ")}`);
    }
    if (result.warnings.length) console.log(`Warnings:\n${result.warnings.map((warning) => `  - ${warning}`).join("\n")}`);
    return;
  }

  if (command === "contributors") {
    const result = kageContributors(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Kage contributors: ${result.summary}`);
    for (const profile of result.contributors.slice(0, 10)) {
      console.log(`- ${profile.contributor}: ${profile.commits_total} commits, ${profile.commits_90d} in 90d, ${profile.primary_owned_files} owned files`);
      if (profile.files_touched.length) console.log(`  Top files: ${profile.files_touched.slice(0, 3).map((file) => `${file.path} (${file.commits})`).join(", ")}`);
      if (profile.silo_files.length) console.log(`  Silo files: ${profile.silo_files.slice(0, 3).map((file) => `${file.path} (${Math.round(file.ownership_pct * 100)}%)`).join(", ")}`);
    }
    if (result.warnings.length) console.log(`Warnings:\n${result.warnings.map((warning) => `  - ${warning}`).join("\n")}`);
    return;
  }

  if (command === "profile") {
    const result = kageProjectProfile(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Kage project profile: ${result.summary}`);
    console.log(`Files: ${result.totals.files} (${result.totals.source_files} source, ${result.totals.test_files} test), symbols: ${result.totals.symbols}`);
    console.log(`Memory: ${result.totals.approved_memory} packets, ${result.totals.memory_code_coverage_percent}% memory-code coverage`);
    if (result.top_concepts.length) console.log(`Top concepts: ${result.top_concepts.slice(0, 6).map((item) => `${item.concept} (${item.count})`).join(", ")}`);
    if (result.key_files.length) {
      console.log("Key files:");
      for (const file of result.key_files.slice(0, 8)) console.log(`- ${file.path}: ${file.why.slice(0, 3).join("; ")}`);
    }
    if (result.run_commands.length) {
      console.log("Commands:");
      for (const commandItem of result.run_commands.slice(0, 6)) console.log(`- ${commandItem.name}: ${commandItem.command}`);
    }
    if (result.next_actions.length) console.log(`Next: ${result.next_actions[0]}`);
    if (result.warnings.length) console.log(`Warnings:\n${result.warnings.map((warning) => `  - ${warning}`).join("\n")}`);
    return;
  }

  if (command === "xray" || command === "repo-xray") {
    const result = kageRepoXray(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Kage Repo X-Ray: ${result.summary}`);
    for (const line of result.first_use_script) console.log(`- ${line}`);
    for (const layer of result.layers) {
      console.log(`\n${layer.title}: ${layer.summary}`);
      for (const item of layer.items.slice(0, 5)) {
        console.log(`- ${item.path}: ${item.evidence.slice(0, 2).join("; ")}`);
      }
    }
    if (result.next_actions.length) console.log(`\nNext: ${result.next_actions[0]}`);
    if (result.warnings.length) console.log(`Warnings:\n${result.warnings.map((warning) => `  - ${warning}`).join("\n")}`);
    return;
  }

  if (command === "decisions") {
    const result = kageDecisionIntelligence(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Kage decision intelligence: ${result.summary}`);
    if (result.top_decisions.length) {
      console.log("Top why-memory:");
      for (const item of result.top_decisions.slice(0, 10)) {
        console.log(`- ${item.title} (${item.type})`);
        if (item.paths.length) console.log(`  Paths: ${item.paths.slice(0, 3).join(", ")}`);
        if (item.why) console.log(`  Why: ${item.why}`);
      }
    }
    if (result.coverage_gaps.length) {
      console.log("Uncovered important paths:");
      for (const gap of result.coverage_gaps.slice(0, 10)) console.log(`- ${gap.path}: ${gap.reason}`);
    }
    if (result.warnings.length) console.log(`Warnings:\n${result.warnings.map((warning) => `  - ${warning}`).join("\n")}`);
    return;
  }

  if (command === "code-index") {
    const result = writeCodeIndex(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Kage Code Index: ${result.project_dir}`);
    console.log(`Parser: ${result.parser}`);
    console.log(`Path: ${result.path}`);
    console.log(`Documents: ${result.documents}`);
    console.log(`Symbols: ${result.symbols}`);
    if (result.warnings.length) {
      console.log("\nWarnings:");
      for (const warning of result.warnings) console.log(`  - ${warning}`);
    }
    if (result.errors.length) {
      console.log("\nErrors:");
      for (const error of result.errors) console.log(`  - ${error}`);
      process.exitCode = 2;
    }
    return;
  }

  if (command === "structural-index") {
    const result = buildStructuralIndex(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Kage Structural Index: ${result.manifest.project_dir}`);
    console.log(`Files: ${result.files.length}`);
    console.log(`Symbols: ${result.symbols.length}`);
    console.log(`Edges: ${result.edges.length}`);
    console.log(`Metadata-only files: ${result.manifest.files.metadata_only}`);
    console.log(`Cache: ${result.manifest.cache.hits} hits, ${result.manifest.cache.misses} misses`);
    console.log(`Workers: ${result.manifest.worker_count}`);
    console.log(`Path: .agent_memory/structural`);
    return;
  }

  if (command === "branch") {
    const result = buildBranchOverlay(projectArg(args));
    if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(`Branch: ${result.branch ?? "(detached)"}`);
      console.log(`Head: ${result.head ?? "(none)"}`);
      console.log(`Merge base: ${result.merge_base ?? "(none)"}`);
      console.log(`Changed files: ${result.changed_files.join(", ") || "(none)"}`);
      console.log(`Pending packets: ${result.pending_packet_ids.length}`);
    }
    return;
  }

  if (command === "metrics") {
    const result = kageMetrics(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Kage Metrics: ${result.project_dir}`);
    console.log(`Readiness score: ${result.harness.readiness_score}/100`);
    console.log(`Validation: ${result.harness.validation_ok ? "passed" : "failed"} (${result.harness.errors} errors, ${result.harness.warnings} warnings)`);
    console.log(`Policy installed: ${result.harness.policy_installed ? "yes" : "no"}`);
    console.log("\nCode graph:");
    console.log(`  Files: ${result.code_graph.files}`);
    console.log(`  Symbols: ${result.code_graph.symbols}`);
    console.log(`  Imports: ${result.code_graph.imports}`);
    console.log(`  Calls: ${result.code_graph.calls}`);
    console.log(`  Routes: ${result.code_graph.routes}`);
    console.log(`  Tests: ${result.code_graph.tests}`);
    console.log(`  Indexer coverage: ${result.code_graph.indexer_coverage_percent}%`);
    console.log(`  Languages: ${Object.entries(result.code_graph.languages).map(([name, count]) => `${name}=${count}`).join(", ") || "(none)"}`);
    console.log(`  Parsers: ${Object.entries(result.code_graph.parsers).map(([name, count]) => `${name}=${count}`).join(", ") || "(none)"}`);
    console.log("\nStructural index:");
    console.log(`  Files: ${result.structural_index.files}`);
    console.log(`  Symbols: ${result.structural_index.symbols}`);
    console.log(`  Edges: ${result.structural_index.edges}`);
    console.log(`  Metadata-only files: ${result.structural_index.metadata_only_files}`);
    console.log(`  Workers: ${result.structural_index.worker_count}`);
    console.log(`  Cache: ${result.structural_index.cache_hits} hits, ${result.structural_index.cache_misses} misses`);
    console.log("\nMemory graph:");
    console.log(`  Approved packets: ${result.memory_graph.approved_packets}`);
    console.log(`  Pending packets: ${result.memory_graph.pending_packets}`);
    console.log(`  Episodes: ${result.memory_graph.episodes}`);
    console.log(`  Entities: ${result.memory_graph.entities}`);
    console.log(`  Edges: ${result.memory_graph.edges}`);
    console.log(`  Evidence coverage: ${result.memory_graph.evidence_coverage_percent}%`);
    console.log(`  Average quality: ${result.memory_graph.average_quality_score}/100`);
    console.log(`  Duplicate candidates: ${result.memory_graph.duplicate_candidate_pairs}`);
    console.log("\nToken savings (whole-repo modeled estimate, not measured usage):");
    console.log(`  Indexed source tokens: ${result.savings.estimated_indexed_source_tokens}`);
    console.log(`  Memory tokens: ${result.savings.estimated_memory_tokens}`);
    console.log(`  Recall context tokens: ${result.savings.estimated_recall_context_tokens}`);
    console.log(`  Estimated tokens saved per recall: ${result.savings.estimated_tokens_saved_per_recall}`);
    console.log(`  This models a typical recall against the whole indexed repo — it is not from real recall events.`);
    console.log(`  For your actual cumulative savings: kage gains. For a reproducible before/after benchmark: kage savings.`);
    if (result.quality) {
      console.log("\nQuality:");
      console.log(`  Useful memory ratio: ${result.quality.useful_memory_ratio_percent}%`);
      console.log(`  Duplicate burden: ${result.quality.duplicate_burden}%`);
      console.log(`  Evidence coverage: ${result.quality.evidence_coverage_percent}%`);
      console.log(`  Review queue size: ${result.quality.totals.pending}`);
    }
    if (result.pain) {
      console.log("\nPain avoided:");
      console.log(`  Recall hit rate: ${result.pain.recall_hit_rate_percent}%`);
      console.log(`  Estimated rediscovery avoided: ${result.pain.estimated_rediscovery_avoided}`);
      console.log(`  Estimated tokens saved: ${result.pain.estimated_tokens_saved}`);
      console.log(`  Time to first use: ${result.pain.time_to_first_use_seconds}s`);
    }
    if (result.memory_access) {
      console.log("\nMemory access:");
      console.log(`  Tracked packets: ${result.memory_access.tracked_packets}`);
      console.log(`  Uses in 30d: ${result.memory_access.uses_30d}`);
      console.log(`  Hot / cold packets: ${result.memory_access.hot_packets} / ${result.memory_access.cold_packets}`);
    }
    return;
  }

  if (command === "report" && args[1] === "team") {
    // T3 — the lead-facing "is this helping?" report. Measured-or-unavailable, never fabricated;
    // estimated figures keep their _estimated suffix so they can never masquerade as measured.
    const report = teamValueReport(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }
    console.log(`Team value report — ${report.generated_for}`);
    console.log("");
    console.log(`Value (measured counts): recalls served ${report.value.recalls_served}, stale withheld ${report.value.stale_withheld}`);
    console.log(`Value (ESTIMATED tokens): read-vs-source ${report.value.tokens_saved_estimated}, knowledge replay ${report.value.replay_tokens_estimated}`);
    console.log("");
    if (report.injection_gate.available) {
      console.log(`Injection gate (live): ${report.injection_gate.injected}/${report.injection_gate.gates} requests injected (rate ${report.injection_gate.injection_rate}), avg confidence ${report.injection_gate.average_confidence}`);
    } else {
      console.log(`Injection gate (live): ${report.injection_gate.note}`);
    }
    console.log("");
    console.log(`Store composition: ${report.composition.total_packets} packets — ${Math.round(report.composition.non_derivable_share * 100)}% non-derivable (what code cannot say), ${Math.round(report.composition.derivable_risk_share * 100)}% derivable-risk`);
    for (const row of report.composition.classes.slice(0, 6)) {
      console.log(`  ${row.class}: ${row.count} packets, ${row.uses_30d} uses in 30d`);
    }
    console.log("");
    if (report.top_memories.length) {
      console.log("Most-used memory (30d):");
      for (const memory of report.top_memories) console.log(`  ${memory.uses_30d}× [${memory.type}] ${memory.title}`);
    } else {
      console.log("Most-used memory (30d): none recorded yet");
    }
    console.log("");
    console.log(`Coverage: ${report.coverage.areas} top-level areas; dark (no approved memory): ${report.coverage.dark_areas.length ? report.coverage.dark_areas.join(", ") : "none"}`);
    console.log(`Review health: ${report.review_health.pending} pending${report.review_health.oldest_pending_days !== null ? ` (oldest ${report.review_health.oldest_pending_days}d)` : ""}, ${report.review_health.contradictions} contradiction link(s)`);
    return;
  }

  if (command === "gains") {
    const summary = valueSummary(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(summary, null, 2));
      return;
    }
    // Rendering lives in the kernel (formatValueGains) so the measured/estimated honesty
    // contract is unit-tested, not re-typed here where it could silently drift.
    for (const line of formatValueGains(summary)) console.log(line);
    return;
  }

  if (command === "file-context") {
    const path = takeArg(args, "--path");
    if (!path) usage();
    const result = kageFileContext(projectArg(args), path);
    if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
    else if (result.context_block) console.log(result.context_block);
    // No verified packets cite this file: print nothing so hooks can gate on empty output.
    return;
  }

  if (command === "prompt-context") {
    // Top-of-task recall for an ambient UserPromptSubmit hook: recall on the user's prompt
    // and emit the memory. Silent when nothing relevant is found, so hooks can gate on empty.
    const query = takeArg(args, "--query") ?? firstPositional(args);
    if (!query) usage();
    const project = projectArg(args);
    const result = recall(project, query!, 5, false, {});
    if (args.includes("--json")) { console.log(JSON.stringify(result, null, 2)); return; }
    if (!result.results.length) return;
    // Lead with felt behavior, not a vanity/gameable token number: tell the agent these are
    // verified team memories to follow. (The tokens/$ ledger lives in `kage gains`.) Keep
    // only the trust-relevant stale-withheld signal here.
    const plural = result.results.length === 1 ? "y" : "ies";
    const withheld = result.value_receipt?.stale_withheld ?? 0;
    console.log(result.context_block);
    console.log(`_${result.results.length} verified team memor${plural} above — follow them.${withheld ? ` ${withheld} stale memor${withheld === 1 ? "y" : "ies"} withheld (code changed under them).` : ""}_`);
    return;
  }

  if (command === "memory-access") {
    const result = kageMemoryAccess(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Kage memory access: ${result.totals.tracked_packets} tracked packet${result.totals.tracked_packets === 1 ? "" : "s"}`);
    console.log(`Recent uses: ${result.totals.uses_30d} in ${result.window_days} days`);
    console.log(`Hot / cold: ${result.totals.hot_packets} / ${result.totals.cold_packets}`);
    if (result.recommendations.length) {
      console.log("\nRecommended review:");
      for (const item of result.recommendations.slice(0, 5)) {
        console.log(`- ${item.summary}`);
        console.log(`  ${item.action}`);
      }
    }
    console.log("\nTop recalled packets:");
    for (const entry of result.entries.filter((item) => !(item.tags.includes("change-memory") && item.tags.includes("diff-proposal"))).slice(0, 10)) {
      if (!entry.total_uses) continue;
      console.log(`- ${entry.title}: ${entry.uses_30d} recent, ${entry.total_uses} total${entry.best_rank ? `, best rank ${entry.best_rank}` : ""}`);
    }
    return;
  }

  if (command === "activity") {
    const result = kageActivity(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Kage activity: ${result.totals.events} events (${result.totals.recalls} recalls, ${result.totals.captures} captures); ${result.totals.recalls_7d} recalls in 7 days`);
    console.log("\nRecent:");
    for (const event of result.events.slice(0, 15)) {
      console.log(`- ${event.at.slice(0, 16).replace("T", " ")}  ${event.kind.padEnd(9)} ${event.title}`);
    }
    return;
  }

  if (command === "layers" || command === "memory-layers") {
    const result = kageLayers(projectArg(args));
    if (args.includes("--json")) { console.log(JSON.stringify(result, null, 2)); return; }
    console.log("Kage memory layers");
    for (const layer of result.layers) {
      console.log(`  ${layer.layer} ${layer.label} (${layer.count})`);
      console.log(`     ${layer.description}`);
      for (const ex of layer.examples) console.log(`     · ${ex}`);
    }
    return;
  }

  if (command === "lifecycle" || command === "memory-lifecycle") {
    const result = kageMemoryLifecycle(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Kage memory lifecycle: ${result.totals.approved} approved, ${result.totals.pending} pending`);
    console.log(`Healthy / hot / stale: ${result.totals.healthy} / ${result.totals.hot} / ${result.totals.stale}`);
    console.log(`Ungrounded / disputed / generated: ${result.totals.ungrounded} / ${result.totals.disputed} / ${result.totals.generated}`);
    if (result.recommendations.length) {
      console.log("\nRecommended actions:");
      for (const item of result.recommendations.slice(0, 6)) {
        console.log(`- ${item.title ? `${item.title}: ` : ""}${item.summary}`);
        console.log(`  ${item.action}`);
      }
    }
    return;
  }

  if (command === "reverify") {
    const packetId = takeArg(args, "--packet");
    if (!packetId) usage();
    const result = reverifyMemory(projectArg(args), packetId!, {
      evidence: takeArg(args, "--evidence"),
      verifiedBy: takeArg(args, "--verified-by"),
    });
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
    } else if (result.ok) {
      console.log(`Reverified ${result.packet_id}`);
      console.log(`  grounding refreshed for ${result.refreshed_paths.length} path(s)${result.was_stale ? " · stale flag cleared" : ""}`);
      if (result.changed_paths.length) console.log(`  evidence recorded for changed path(s): ${result.changed_paths.join(", ")}`);
      if (result.missing_paths.length) console.log(`  dropped missing path(s): ${result.missing_paths.join(", ")}`);
    } else {
      console.log(`Reverify failed: ${result.errors.join("; ")}`);
    }
    if (!result.ok) process.exit(2);
    return;
  }

  if (command === "skills" || command === "skills-build") {
    const result = generateSkills(projectArg(args), {
      dryRun: args.includes("--dry-run"),
      dir: takeArg(args, "--dir"),
    });
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      const verb = result.dry_run ? "Would generate" : "Generated";
      console.log(`Kage skills: ${verb} ${result.generated.length} skill file(s) in ${result.dir}/ from verified memory`);
      for (const skill of result.generated) console.log(`  ${result.dry_run ? "·" : "✓"} ${skill.path}  (${skill.type})`);
      if (result.skipped.length) console.log(`  skipped ${result.skipped.length} packet(s) not skill-worthy or not grounded`);
      if (result.errors.length) console.log(`  errors: ${result.errors.join("; ")}`);
      if (!result.dry_run && result.generated.length) {
        if (result.git_ignored) {
          console.log(`\n⚠ ${result.dir}/ is git-ignored, so these skills won't reach your team. Un-ignore it (or run with --dir <tracked-path>) and commit them.`);
        } else {
          console.log(`\nThese are plain files in ${result.dir}/ — commit them so every teammate's agent loads the same skills.`);
        }
      }
    }
    if (!result.ok) process.exit(2);
    return;
  }

  if (command === "reconcile" || command === "memory-reconcile" || command === "memory-reconciliation") {
    const result = kageMemoryReconciliation(projectArg(args), {
      sessionId: takeArg(args, "--session"),
      limit: numberArg(args, "--limit", 25),
    });
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(result.agent_instruction);
      if (result.items.length) {
        console.log("\nItems:");
        for (const item of result.items) {
          console.log(`- ${item.packet_id}: ${item.title}`);
          console.log(`  Paths: ${item.changed_paths.join(", ") || item.paths.join(", ")}`);
          console.log(`  Action: ${item.next_action}`);
        }
      }
    }
    if (!result.ok) process.exitCode = 2;
    return;
  }

  if (command === "memory-audit" || command === "audit-log") {
    const result = kageMemoryAudit(projectArg(args), numberArg(args, "--limit", 100));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Kage memory audit: ${result.totals.total} mutation${result.totals.total === 1 ? "" : "s"}`);
    console.log(`Capture / feedback / supersede: ${result.totals.capture} / ${result.totals.feedback} / ${result.totals.supersede}`);
    for (const entry of result.entries.slice(0, 12)) {
      console.log(`- ${entry.operation}: ${entry.packet_titles.join(", ") || entry.packet_ids.join(", ")} (${entry.timestamp.slice(0, 19)})`);
    }
    if (!result.entries.length) console.log("No memory mutations have been audited yet.");
    return;
  }

  if (command === "capabilities" || command === "capability-audit" || command === "readiness") {
    const result = kageCapabilityAudit(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Kage capability audit: ${result.overall_score}/100 (${result.status})`);
    console.log(result.summary);
    for (const pillar of result.pillars) {
      console.log(`\n${pillar.label}: ${pillar.score}/100 (${pillar.status})`);
      for (const item of pillar.evidence.slice(0, 4)) console.log(`  - ${item.label}: ${item.value}`);
      if (pillar.gaps.length) console.log(`  Gap: ${pillar.gaps[0]}`);
      if (pillar.actions.length) console.log(`  Action: ${pillar.actions[0]}`);
    }
    return;
  }

  if (command === "slots" || command === "context-slots") {
    const action = args[1] && !args[1].startsWith("--") ? args[1] : undefined;
    if (!action || action === "list") {
      const result = kageContextSlots(projectArg(args));
      if (args.includes("--json")) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      console.log(`Kage pinned context slots: ${result.summary}`);
      for (const slot of result.slots) {
        console.log(`- ${slot.label}${slot.pinned ? " [pinned]" : ""}: ${slot.description || "(no description)"}`);
        console.log(`  ${slot.content.slice(0, 160)}${slot.content.length > 160 ? "..." : ""}`);
      }
      if (!result.slots.length) console.log("No slots yet. Add one with `kage slots set --label project_context --content \"...\" --project .`.");
      if (result.warnings.length) console.log(`Warnings:\n${result.warnings.map((warning) => `  - ${warning}`).join("\n")}`);
      return;
    }
    if (action === "set") {
      const label = takeArg(args, "--label");
      const content = takeArg(args, "--content");
      if (!label || !content) usage();
      const result = setContextSlot(projectArg(args), {
        label,
        content,
        description: takeArg(args, "--description"),
        pinned: !args.includes("--unpinned"),
        size_limit: numberArg(args, "--size-limit", 2000),
        paths: listArg(takeArg(args, "--paths")),
        tags: listArg(takeArg(args, "--tags")),
      });
      if (args.includes("--json")) {
        console.log(JSON.stringify(result, null, 2));
        if (!result.ok) process.exit(2);
        return;
      }
      if (!result.ok) {
        console.error(`Context slot not saved:\n${result.errors.map((error) => `  - ${error}`).join("\n")}`);
        process.exit(2);
      }
      console.log(`Saved context slot: ${result.slot?.label}`);
      return;
    }
    if (action === "delete") {
      const label = takeArg(args, "--label");
      if (!label) usage();
      const result = deleteContextSlot(projectArg(args), label);
      if (args.includes("--json")) {
        console.log(JSON.stringify(result, null, 2));
        if (!result.ok) process.exit(2);
        return;
      }
      if (!result.ok) {
        console.error(`Context slot not deleted:\n${result.errors.map((error) => `  - ${error}`).join("\n")}`);
        process.exit(2);
      }
      console.log(`Deleted context slot: ${result.deleted?.label}`);
      return;
    }
    usage();
  }

  if (command === "handoff" || command === "memory-handoff") {
    const result = kageMemoryHandoff(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Kage memory handoff: ${result.totals.open_items} open item${result.totals.open_items === 1 ? "" : "s"}, ${result.totals.distillable_sessions} distillable session${result.totals.distillable_sessions === 1 ? "" : "s"}, ${result.totals.recent_mutations} recent mutation${result.totals.recent_mutations === 1 ? "" : "s"}`);
    console.log(result.summary);
    console.log(`Primary action: ${result.primary_action.label} — ${result.primary_action.action}`);
    if (result.items.length) {
      console.log("\nNext actions:");
      for (const item of result.items.slice(0, 10)) {
        console.log(`- [${item.severity}] ${item.title}: ${item.summary}`);
        console.log(`  ${item.action}`);
      }
    }
    if (result.recommendations.length) {
      console.log("\nRecommendations:");
      for (const item of result.recommendations.slice(0, 5)) console.log(`- ${item}`);
    }
    return;
  }

  if (command === "timeline" || command === "memory-timeline") {
    const result = kageMemoryTimeline(projectArg(args), numberArg(args, "--days", 14));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Kage memory timeline: last ${result.days} day${result.days === 1 ? "" : "s"} — ${result.totals.total} event${result.totals.total === 1 ? "" : "s"}`);
    console.log(`Added / updated / pending / deprecated: ${result.totals.added} / ${result.totals.updated} / ${result.totals.pending} / ${result.totals.deprecated}`);
    for (const entry of result.entries.slice(0, 12)) {
      const prefix = entry.kind === "added" ? "+" : entry.kind === "updated" ? "~" : entry.kind === "pending" ? "?" : "-";
      console.log(`  ${prefix} [${entry.type}] ${entry.title} (${entry.date.slice(0, 10)})`);
    }
    if (!result.entries.length) console.log("No memory activity in this period.");
    return;
  }

  if (command === "lineage" || command === "memory-lineage") {
    const result = kageMemoryLineage(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Kage memory lineage: ${result.totals.chains} replacement chain${result.totals.chains === 1 ? "" : "s"}, ${result.totals.orphans} orphan${result.totals.orphans === 1 ? "" : "s"}`);
    for (const chain of result.chains.slice(0, 10)) {
      console.log(`- ${chain.current_title}: replaces ${chain.superseded_packet_ids.length} packet${chain.superseded_packet_ids.length === 1 ? "" : "s"}`);
      console.log(`  ${chain.action}`);
    }
    if (result.orphans.length) {
      console.log("\nNeeds repair:");
      for (const orphan of result.orphans.slice(0, 10)) console.log(`- ${orphan.title}: ${orphan.action}`);
    }
    if (!result.chains.length && !result.orphans.length) console.log("No superseded memory chains yet.");
    return;
  }

  if (command === "supersede") {
    const oldId = takeArg(args, "--packet");
    const replacementId = takeArg(args, "--replacement");
    if (!oldId || !replacementId) usage();
    const result = supersedeMemory(projectArg(args), oldId, replacementId, takeArg(args, "--reason") ?? "");
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    if (!result.ok) {
      console.error(`Failed to supersede memory: ${result.errors.join("; ")}`);
      process.exit(1);
    }
    console.log(`Superseded memory: ${result.old_packet_id}`);
    console.log(`Replacement: ${result.replacement_packet_id}`);
    if (result.warnings.length) console.log(`Warnings:\n${result.warnings.map((warning) => `  - ${warning}`).join("\n")}`);
    return;
  }

  if (command === "conflicts") {
    const result = kageConflicts(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    if (!result.count) {
      console.log("Memory conflicts: none — no contradicting packet pairs found.");
      return;
    }
    console.log(`Memory conflicts: ${result.count} contradicting packet pair${result.count === 1 ? "" : "s"}`);
    for (const pair of result.pairs) {
      console.log(`\n  ⚠ ${pair.a.title}  <-->  ${pair.b.title}`);
      console.log(`    ${pair.a.id}`);
      console.log(`    ${pair.b.id}`);
      console.log(`    shared paths: ${pair.shared_paths.join(", ")}`);
      console.log(`    ${pair.reason}`);
    }
    console.log("\nResolve each with: kage supersede --packet <old> --replacement <new>");
    return;
  }

  if (command === "module-health") {
    const result = kageModuleHealth(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Kage module health: ${result.summary}`);
    for (const item of result.modules.slice(0, 20)) {
      console.log(`- ${item.module}: ${item.grade} (${item.score}) - ${item.reasons.join("; ")}`);
    }
    if (result.warnings.length) console.log(`Warnings:\n${result.warnings.map((warning) => `  - ${warning}`).join("\n")}`);
    return;
  }

  if (command === "graph-insights") {
    const result = kageGraphInsights(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Kage graph insights: ${result.summary}`);
    if (result.central_files.length) {
      console.log("Central files:");
      for (const file of result.central_files.slice(0, 10)) console.log(`- ${file.path}: pagerank ${file.pagerank}, ${file.dependents} dependent(s)`);
    }
    if (result.dependency_cycles.length) {
      console.log("Dependency cycles:");
      for (const cycle of result.dependency_cycles.slice(0, 5)) console.log(`- ${cycle.files.join(" -> ")}`);
    }
    if (result.entry_flows.length) {
      console.log("Entry flows:");
      for (const flow of result.entry_flows.slice(0, 5)) console.log(`- ${flow.path.join(" -> ")}`);
    }
    return;
  }

  if (command === "workspace") {
    const subcommand = args[1];
    if (subcommand === "recall") {
      const query = args.find((arg, index) => index > 1 && !arg.startsWith("--") && !args[index - 1]?.startsWith("--"));
      if (!query) usage();
      const result = kageWorkspaceRecall(projectArg(args), query, numberArg(args, "--limit", 8));
      if (args.includes("--json")) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      console.log(result.context_block);
      if (result.warnings.length) console.log(`Warnings:\n${result.warnings.map((warning) => `  - ${warning}`).join("\n")}`);
      return;
    }
    const result = kageWorkspace(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Kage workspace: ${result.summary}`);
    for (const repo of result.repos) {
      const deps = repo.dependencies_on_workspace_repos.length
        ? ` depends on ${repo.dependencies_on_workspace_repos.map((dep) => dep.alias).join(", ")}`
        : "";
      console.log(`- ${repo.alias}: ${repo.path} (${repo.approved_packets} packets, ${repo.code_files} files)${deps}`);
    }
    if (result.route_contracts.length) {
      console.log("Route contracts:");
      for (const contract of result.route_contracts.slice(0, 10)) {
        console.log(`- ${contract.provider_repo} ${contract.method} ${contract.path} -> ${contract.consumer_repo}/${contract.consumer_file}`);
      }
    }
    if (result.topic_contracts.length) {
      console.log("Topic/event contracts:");
      for (const contract of result.topic_contracts.slice(0, 10)) {
        console.log(`- ${contract.producer_repo} ${contract.topic} -> ${contract.consumer_repo}/${contract.consumer_file}`);
      }
    }
    if (result.co_changes.length) {
      console.log("Cross-repo co-changes:");
      for (const link of result.co_changes.slice(0, 10)) {
        console.log(`- ${link.source_repo}/${link.source_file} <-> ${link.target_repo}/${link.target_file} (${link.frequency}x, strength ${link.strength})`);
      }
    }
    if (result.warnings.length) console.log(`Warnings:\n${result.warnings.map((warning) => `  - ${warning}`).join("\n")}`);
    return;
  }

  if (command === "audit-claude-mem") {
    const projectDir = projectArg(args);
    const storePath = takeArg(args, "--store") ?? defaultClaudeMemStorePath();
    const result = auditClaudeMemStore(projectDir, { storePath });
    if (!result.ok) {
      console.error(result.error);
      process.exit(2);
    }
    if (args.includes("--json")) {
      console.log(JSON.stringify(result.report, null, 2));
      return;
    }
    console.log(renderClaudeMemAuditReceipt(result.report));
    return;
  }

  if (command === "audit") {
    const result = auditProject(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Kage Audit: ${result.project_dir}`);
    console.log(`Trust score: ${result.trust_score}/100`);
    console.log(`Validation: ${result.checks.validation.ok ? "passed" : "failed"}`);
    console.log(`Memory inbox: ${result.checks.memory_inbox.approved_packets} approved, ${result.checks.memory_inbox.pending_packets} pending, ${result.checks.memory_inbox.stale_packets} stale`);
    console.log(`Structured memory: ${result.checks.structured_memory.structured_packets}/${result.checks.structured_memory.total_packets} (${result.checks.structured_memory.coverage_percent}%)`);
    console.log(`Code graph precision: ${result.checks.code_graph.precise_files}/${result.checks.code_graph.files} precise (${result.checks.code_graph.precise_coverage_percent}%), ${result.checks.code_graph.ast_files} AST, ${result.checks.code_graph.fallback_files} fallback`);
    console.log(`Memory-code graph edges: ${result.checks.graph_links.memory_code_edges} (${result.checks.graph_links.precise_memory_code_edges} precise, ${result.checks.graph_links.path_memory_code_edges} path)`);
    if (result.recommendations.length) {
      console.log("\nRecommendations:");
      for (const recommendation of result.recommendations) console.log(`  - ${recommendation}`);
    }
    if (!result.ok) process.exitCode = 2;
    return;
  }

  if (command === "inbox") {
    const result = memoryInbox(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Kage Memory Inbox: ${result.project_dir}`);
    console.log(`Approved: ${result.counts.approved}`);
    console.log(`Pending: ${result.counts.pending}`);
    console.log(`Stale: ${result.counts.stale}`);
    console.log(`Duplicates: ${result.counts.duplicates}`);
    console.log(`Missing structured context: ${result.counts.missing_context}`);
    console.log(`Validation: ${result.counts.validation_errors} errors, ${result.counts.validation_warnings} warnings`);
    if (result.items.length) {
      console.log("\nInbox items:");
      for (const item of result.items.slice(0, 30)) {
        console.log(`  - [${item.severity}] ${item.kind}: ${item.title ?? item.summary}`);
        console.log(`    Action: ${item.action}`);
      }
      if (result.items.length > 30) console.log(`  ... ${result.items.length - 30} more item(s)`);
    }
    if (result.recommendations.length) {
      console.log("\nRecommendations:");
      for (const recommendation of result.recommendations) console.log(`  - ${recommendation}`);
    }
    if (!result.ok) process.exitCode = 2;
    return;
  }

  if (command === "quality") {
    const result = qualityReport(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Kage Quality: ${result.project_dir}`);
    console.log(`Useful memory ratio: ${result.useful_memory_ratio_percent}%`);
    console.log(`Duplicate burden: ${result.duplicate_burden}%`);
    console.log(`Evidence coverage: ${result.evidence_coverage_percent}%`);
    console.log(`Path grounding coverage: ${result.path_grounding_coverage_percent}%`);
    console.log(`Review queue size: ${result.totals.pending}`);
    console.log(`Approved vs pending ratio: ${result.approved_to_pending_ratio}`);
    console.log(`Type coverage: ${Object.entries(result.memory_type_coverage).map(([type, count]) => `${type}=${count}`).join(", ") || "(none)"}`);
    return;
  }

  if (command === "proxy") {
    const project = projectArg(args);
    const port = args.includes("--port") ? numberArg(args, "--port", 8788) : 8788;
    const upstream = takeArg(args, "--upstream");
    const workspace = takeArg(args, "--workspace");
    const modeArg = takeArg(args, "--mode");
    if (modeArg && modeArg !== "audit" && modeArg !== "assist" && modeArg !== "protect") {
      console.error(`Unknown --mode "${modeArg}". Use audit (measure only, forward the client's exact bytes), assist (inject memory + reversible compression), or protect (defensive, measured, forwards the original).`);
      process.exitCode = 1;
      return;
    }
    // Bare `kage proxy` keeps its historical assist default (kage up defaults to audit — see G7);
    // audit and protect are explicit opt-ins.
    const mode = modeArg === "audit" ? ("audit" as const) : modeArg === "protect" ? ("protect" as const) : ("assist" as const);
    // assist can ADD and (with lossy enabled) COMPRESS context. A lossy transform with no reversible
    // store is a data-loss risk, and assist with no receipt sink runs entirely unmeasured — so the CLI
    // refuses to start assist on unhealthy storage rather than quietly degrading. audit/protect are
    // always safe (they forward the client's exact bytes), so they never gate on storage health.
    if (mode === "assist" && existsSync(join(project, ".agent_memory"))) {
      const health = probeAssistStorage(project);
      if (!health.healthy) {
        console.error(`kage proxy --mode assist refused: ${health.detail}.`);
        console.error(`assist needs healthy reversible + receipt storage before it may add or compress context. Run \`kage proxy --mode audit\` to measure safely instead.`);
        process.exitCode = 1;
        return;
      }
    }
    startProxy(project, {
      port,
      upstream: upstream ?? undefined,
      verbose: args.includes("--verbose"),
      noInject: args.includes("--no-inject"),
      workspace: workspace ?? undefined,
      mode,
      receiptSink: args.includes("--no-receipts") ? null : undefined,
      countTokens: args.includes("--count-tokens"),
    });
    return;
  }

  if (command === "savings") {
    const result = benchmarkSavings(projectArg(args), { queries: args.includes("--queries") ? numberArg(args, "--queries", 12) : undefined });
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    const pct = result.reduction_percent;
    console.log("");
    console.log(`  Kage cut context by ${pct}%`);
    console.log("");
    console.log(`  Baseline (read the files)   ${formatTokenCount(result.baseline_tokens_avg)} tokens / query`);
    console.log(`  With Kage (recall + graph)  ${formatTokenCount(result.kage_tokens_avg)} tokens / query`);
    console.log(`  Saved                       ${formatTokenCount(result.baseline_tokens_avg - result.kage_tokens_avg)} tokens / query  (${result.queries} queries, recall hit ${Math.round(result.recall_hit_rate * 100)}%)`);
    console.log("");
    console.log(`  Deterministic · no LLM · rerun on this commit = identical ${pct}%`);
    console.log(`  Reproduce:  npx -y @kage-core/kage-graph-mcp savings --project . --json`);
    console.log("");
    console.log(`  ${result.caveats[0]}`);
    console.log(`  This is a controlled benchmark, not your cumulative usage. For that: kage gains.`);
    console.log("");
    return;
  }

  if (command === "team") {
    const result = teamMemoryReport(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    const freshPct = Math.round(result.freshness_rate * 100);
    console.log("");
    console.log(`  Team memory health: ${freshPct}% verified fresh`);
    console.log("");
    console.log(`  ${result.approved_packets} approved packets` + (result.unattributed_packets ? `  (${result.unattributed_packets} unattributed)` : ""));
    if (result.contributors.length) {
      console.log(`  Contributors: ${result.contributors.map((c) => `${c.name} (${c.packets})`).join(", ")}`);
    }
    console.log(`  Pending review     ${result.pending_review}${result.oldest_pending_days !== null ? `  (oldest ${result.oldest_pending_days}d)` : ""}`);
    console.log(`  Stale, withheld    ${result.stale_withheld}`);
    console.log(`  Contradictions     ${result.contradictions}`);
    console.log(`  Conflicts saved    ${result.conflicts_preserved}  (concurrent edits preserved, not dropped)`);
    console.log("");
    console.log(`  Reproduce:  npx -y @kage-core/kage-graph-mcp team --project . --json`);
    return;
  }

  if (command === "benchmark") {
    if (args.includes("--trust")) {
      const result = benchmarkTrust(projectArg(args));
      if (args.includes("--json")) {
        console.log(JSON.stringify(result, null, 2));
        if (!result.ok) process.exitCode = 1;
        return;
      }
      console.log("Kage Trust Benchmark — can this memory be trusted?");
      console.log(`Trust score: ${result.trust_score}/100  (${result.ok ? "PASS" : "REVIEW"})`);
      console.log(`  Hallucinated-citation rejection: ${result.metrics.hallucinated_citation_rejection_rate}%  (${result.detail.hallucination.rejected}/${result.detail.hallucination.attempted})`);
      console.log(`  Stale-memory exclusion:          ${result.metrics.stale_memory_exclusion_rate}%  (${result.detail.staleness.excluded_after}/${result.detail.staleness.recallable_before})`);
      console.log(`  Live grounding rate:             ${result.metrics.live_grounding_rate}%  (${result.detail.live_memory.grounded}/${result.detail.live_memory.checked} packets)`);
      console.log(`  Wrong-advice prevented:          ${result.metrics.wrong_advice_prevented_rate}%`);
      if (!result.ok) process.exitCode = 1;
      return;
    }
    if (args.includes("--memory-quality")) {
      const result = benchmarkCodingMemoryQuality({
        topK: Number(takeArg(args, "--top-k") ?? 10),
        packetsPerTopic: Number(takeArg(args, "--packets-per-topic") ?? 5),
        distractorsPerTopic: Number(takeArg(args, "--distractors-per-topic") ?? 7),
        keep: args.includes("--keep"),
      });
      if (args.includes("--json")) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      console.log("Kage Coding Memory Quality Benchmark");
      console.log(`Packets: ${result.summary.packets}`);
      console.log(`Queries: ${result.summary.queries}`);
      console.log(`Refresh/index: ${result.summary.refresh_ms}ms`);
      console.log(`R@5: ${result.summary.recall_at_5_percent ?? "n/a"}%`);
      console.log(`R@10: ${result.summary.recall_at_10_percent ?? "n/a"}%`);
      console.log(`NDCG@10: ${result.summary.ndcg_at_10}`);
      console.log(`MRR: ${result.summary.mrr}`);
      console.log(`Median recall: ${result.summary.median_latency_ms}ms`);
      console.log(`Context reduction: ${result.summary.context_reduction_percent}%`);
      return;
    }
    if (args.includes("--scale")) {
      const sizes = String(takeArg(args, "--sizes") ?? "240,1000,5000")
        .split(",")
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isFinite(value) && value > 0);
      const result = benchmarkMemoryScale({
        sizes,
        topK: Number(takeArg(args, "--top-k") ?? 10),
        keep: args.includes("--keep"),
      });
      if (args.includes("--json")) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      console.log("Kage Memory Scale Benchmark");
      console.log(`Sizes: ${result.sizes.join(", ")}`);
      console.log(`Top K: ${result.top_k}`);
      console.log(`Largest corpus: ${result.summary.largest_packets} packets`);
      console.log(`Hit rate: ${result.summary.largest_hit_rate_percent}%`);
      console.log(`Median recall: ${result.summary.largest_median_recall_latency_ms}ms`);
      console.log(`Context reduction: ${result.summary.largest_context_reduction_percent}%`);
      for (const row of result.results) {
        console.log(`- ${row.packets} packets: ${row.recall_hit_rate_percent}% hit, ${row.median_recall_latency_ms}ms median, ${row.context_reduction_percent}% context reduction`);
      }
      return;
    }
    if (args.includes("--compare")) {
      const result = benchmarkTaskComparison(projectArg(args), takeArg(args, "--task") ?? firstPositional(args) ?? "how do I run tests");
      if (args.includes("--json")) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      console.log(`Kage A/B Benchmark: ${result.project_dir}`);
      console.log(`Task: ${result.task}`);
      console.log("");
      console.log("Without Kage:");
      console.log(`  Files examined: ${result.baseline_without_kage.files_examined}`);
      console.log(`  Full-file tokens: ${result.baseline_without_kage.full_file_tokens}`);
      console.log(`  Steps: ${result.baseline_without_kage.steps}`);
      console.log(`  Estimated time: ${result.baseline_without_kage.estimated_time_seconds}s`);
      console.log("");
      console.log("With Kage:");
      console.log(`  Memory packets: ${result.with_kage.memory_packets_used}`);
      console.log(`  Code facts: ${result.with_kage.code_files_returned + result.with_kage.code_symbols_returned + result.with_kage.code_routes_returned + result.with_kage.code_tests_returned}`);
      console.log(`  Context tokens: ${result.with_kage.context_tokens}`);
      console.log(`  Steps: ${result.with_kage.steps}`);
      console.log(`  Estimated time: ${result.with_kage.estimated_time_seconds}s`);
      console.log("");
      console.log("Delta:");
      console.log(`  Estimated tokens saved: ${result.delta.estimated_tokens_saved}`);
      console.log(`  Context reduction: ${result.delta.context_reduction_percent}%`);
      console.log(`  Rediscovery steps saved: ${result.delta.rediscovery_steps_saved}`);
      console.log(`  Estimated time saved: ${result.delta.estimated_time_saved_seconds}s`);
      console.log(`  Full-file reads avoided: ${result.delta.full_file_reads_avoided}`);
      console.log(`  Recall hit: ${result.delta.recall_hit ? "yes" : "no"}`);
      console.log(`  Code graph hit: ${result.delta.code_graph_hit ? "yes" : "no"}`);
      console.log("");
      console.log("Baseline files:");
      for (const file of result.evidence.baseline_files.slice(0, 8)) console.log(`  - ${file.path} (${file.tokens} tokens): ${file.why}`);
      console.log("");
      console.log("Kage memory:");
      for (const packet of result.evidence.kage_memory.slice(0, 5)) console.log(`  - ${packet.title} (${packet.type}, score ${packet.score})`);
      return;
    }
    const result = benchmarkProject(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Kage Benchmark: ${result.project_dir}`);
    console.log(`OK: ${result.ok ? "yes" : "no"}`);
    console.log(`Overall score: ${result.overall_score}/100`);
    console.log("Gates:");
    for (const gate of result.gates) console.log(`  - ${gate.name}: ${gate.actual}${gate.unit === "percent" ? "%" : ""} / target ${gate.target}${gate.unit === "percent" ? "%" : ""} (${gate.pass ? "pass" : "fail"})`);
    console.log("Pain metrics:");
    for (const [name, value] of Object.entries(result.pain_metrics)) console.log(`${name}: ${value}`);
    return;
  }

  if (command === "learn") {
    const learning = takeArg(args, "--learning");
    if (!learning) usage();
    const personal = args.includes("--personal");
    const result = (personal ? learnPersonal : learn)({
      projectDir: projectArg(args),
      learning,
      title: takeArg(args, "--title"),
      type: takeArg(args, "--type") as MemoryType | undefined,
      evidence: takeArg(args, "--evidence"),
      verifiedBy: takeArg(args, "--verified-by"),
      tags: listArg(takeArg(args, "--tags")),
      paths: listArg(takeArg(args, "--paths")),
      stack: listArg(takeArg(args, "--stack")),
      graphNodes: listArg(takeArg(args, "--graph-nodes")),
      allowMissingPaths: args.includes("--allow-missing-paths"),
      strictCitations: true,
      strictContradictions: args.includes("--strict-contradictions"),
      discoveryTokens: args.includes("--discovery-tokens") ? numberArg(args, "--discovery-tokens", 0) : undefined,
    });
    if (!result.ok) {
      console.error(`Learning capture blocked:\n${result.errors.map((error) => `  - ${error}`).join("\n")}`);
      process.exit(2);
    }
    console.log(`Captured ${personal ? "personal" : "session"} learning: ${result.path}`);
    printContradictionWarning(result.contradictions);
    if (result.warnings?.length) console.log(`Warnings:\n${result.warnings.map((warning) => `  - ${warning}`).join("\n")}`);
    console.log(personal
      ? "Personal memory is recalled with lower trust and never enters repo review flows. Sync it across machines with `kage sync`."
      : "Repo-local memory is written immediately. Promotion to org/global still requires explicit review.");
    return;
  }

  if (command === "propose") {
    if (!args.includes("--from-diff")) usage();
    const result = proposeFromDiff(projectArg(args));
    if (!result.ok) {
      console.error(`Proposal blocked:\n${result.errors.map((error) => `  - ${error}`).join("\n")}`);
      process.exit(2);
    }
    console.log(`Wrote branch review summary: ${result.path}`);
    if (result.packetPath) console.log(`Captured repo-local change memory: ${result.packetPath}`);
    console.log(`Changed files: ${result.changedFiles.join(", ")}`);
    console.log("Use org/global promotion commands when this memory should leave the repo.");
    return;
  }

  if (command === "review-artifact") {
    const result = createReviewArtifact(projectArg(args));
    console.log(`Wrote review artifact: ${result.path}`);
    console.log(`Pending packets: ${result.pending}`);
    return;
  }

  if (command === "promote") {
    const id = takeArg(args, "--public");
    if (!id) usage();
    const result = createPublicCandidate(projectArg(args), id);
    if (!result.ok) {
      console.error(`Promotion blocked:\n${result.errors.map((error) => `  - ${error}`).join("\n")}`);
      process.exit(2);
    }
    console.log(`Created public review candidate: ${result.path}`);
    console.log("This file is local only until a human publishes it.");
    return;
  }

  if (command === "export-public") {
    const result = exportPublicBundle(projectArg(args));
    if (!result.ok) {
      console.error(`Public bundle blocked:\n${result.errors.map((error) => `  - ${error}`).join("\n")}`);
      process.exit(2);
    }
    console.log(`Exported public bundle: ${result.path}`);
    console.log(`Packets: ${result.packetCount}`);
    return;
  }

  if (command === "registry") {
    const result = registryRecommendations(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    if (result.length === 0) {
      console.log("No registry recommendations found for this repo.");
      return;
    }
    for (const item of result) {
      console.log(`${item.id} [${item.kind}] ${item.title}`);
      console.log(`  ${item.summary}`);
      console.log(`  matched: ${item.matched.join(", ") || "(repo metadata)"}`);
      console.log(`  trust: ${item.trust}; install: ${item.install}`);
    }
    return;
  }

  if (command === "recall") {
    const query = firstPositional(args);
    if (!query) usage();
    const maxContextTokens = args.includes("--max-context-tokens") ? numberArg(args, "--max-context-tokens", 0) : undefined;
    const structuralHops = args.includes("--structural-hops") ? numberArg(args, "--structural-hops", 2) : undefined;
    const result = args.includes("--embeddings")
      ? await recallWithEmbeddings(projectArg(args), query, 5, args.includes("--explain"))
      : recall(projectArg(args), query, 5, args.includes("--explain"), { maxContextTokens, structuralHops });
    if (args.includes("--docs")) {
      const docsSection = docsRecallSection(projectArg(args), query, 3);
      if (docsSection) result.context_block = `${result.context_block}\n\n${docsSection}`;
    }
    if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(result.context_block);
      if (result.value_receipt) {
        console.log(formatRecallValueReceipt(result.value_receipt));
      }
    }
    return;
  }

  if (command === "context") {
    const query = firstPositional(args);
    if (!query) usage();
    const result = kageContext(projectArg(args), query, {
      limit: args.includes("--limit") ? numberArg(args, "--limit", 5) : undefined,
      targets: listArg(takeArg(args, "--targets")),
      changedFiles: listArg(takeArg(args, "--changed-files")),
      sessionId: takeArg(args, "--session"),
    });
    if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
    else console.log(result.context_block);
    if (!result.validation_ok) process.exitCode = 2;
    return;
  }

  if (command === "embeddings") {
    const action = firstPositional(args);
    if (action !== "build") usage();
    const result = await buildEmbeddingIndex(projectArg(args), { model: takeArg(args, "--model") });
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      if (!result.ok) process.exitCode = 2;
      return;
    }
    if (!result.ok) {
      console.error(`Embedding index failed:\n${result.errors.map((error) => `  - ${error}`).join("\n")}`);
      process.exit(2);
    }
    console.log(`Embedding index: ${result.path}`);
    console.log(`Provider: ${result.provider}`);
    console.log(`Model: ${result.model}`);
    console.log(`Packets: ${result.packet_count}`);
    return;
  }

  if (command === "docs-search") {
    const query = firstPositional(args);
    if (!query) usage();
    const limit = numberArg(args, "--limit", 5);
    const hits = searchDocs(projectArg(args), query, limit);
    if (args.includes("--json")) {
      console.log(JSON.stringify({ query, source: "repo-docs", hits }, null, 2));
      return;
    }
    if (!hits.length) {
      console.log("No matching docs found in this repo's own committed documentation.");
      return;
    }
    console.log(`Docs search (this repo's own committed documentation) — "${query}":`);
    for (const hit of hits) {
      console.log(`\n${hit.doc_path}:${hit.line}  [${hit.score}]  ${hit.heading}`);
      console.log(`  ${hit.snippet}`);
    }
    return;
  }

  if (command === "observe") {
    const event = takeArg(args, "--event");
    if (!event) usage();
    const result = observe(projectArg(args), JSON.parse(event) as ObservationEvent);
    if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
    else if (result.ok && result.duplicate) console.log(`Observation already stored: ${result.path}`);
    else if (result.ok) console.log(`Stored observation: ${result.path}`);
    else {
      console.error(`Observation blocked:\n${result.errors.map((error) => `  - ${error}`).join("\n")}`);
      process.exit(2);
    }
    return;
  }

  if (command === "sessions") {
    const result = kageSessionCaptureReport(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Sessions: ${result.totals.sessions}`);
    console.log(`Observations: ${result.totals.observations}`);
    console.log(`Distillable observations: ${result.totals.durable_observations}`);
    for (const session of result.sessions.slice(0, 10)) {
      console.log(`\n${session.session_id} — ${session.observations} observation${session.observations === 1 ? "" : "s"}, ${session.durable_observations} distillable`);
      console.log(`  ${session.first_at || "unknown"} → ${session.last_at || "unknown"}`);
      if (session.candidate_types.length) console.log(`  Candidates: ${session.candidate_types.join(", ")}`);
      console.log(`  Next: ${session.next_action}`);
    }
    if (!result.sessions.length) console.log("No local observation sessions recorded yet.");
    return;
  }

  if (command === "replay" || command === "session-replay") {
    const result = kageSessionReplay(projectArg(args), {
      sessionId: takeArg(args, "--session"),
      limit: Number(takeArg(args, "--limit") ?? 200),
    });
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Session replay digest: ${result.totals.sessions} session${result.totals.sessions === 1 ? "" : "s"}, ${result.totals.events} event${result.totals.events === 1 ? "" : "s"}`);
    console.log(`Durable candidates: ${result.totals.durable_candidates}`);
    for (const session of result.sessions.slice(0, 8)) {
      console.log(`\n${session.session_id} — ${session.events} event${session.events === 1 ? "" : "s"}, ${session.durable_candidates} durable candidate${session.durable_candidates === 1 ? "" : "s"}`);
      console.log(`  ${session.first_at || "unknown"} → ${session.last_at || "unknown"}`);
      if (session.paths.length) console.log(`  Paths: ${session.paths.slice(0, 4).join(", ")}`);
      if (session.commands.length) console.log(`  Commands: ${session.commands.slice(0, 3).join(", ")}`);
      if (session.durable_candidates) console.log(`  Next: ${session.distill_command}`);
    }
    if (result.events.length) {
      console.log("\nTimeline:");
      for (const event of result.events.slice(0, 20)) {
        const durable = event.durable_candidate ? ` [${event.candidate_type ?? "durable"}]` : "";
        console.log(`  ${event.timestamp} ${event.label}${durable}: ${event.summary}`);
      }
    } else {
      console.log("No local observation events recorded yet.");
    }
    return;
  }

  if (command === "distill") {
    const sessionId = takeArg(args, "--session");
    if (!sessionId) usage();
    const project = projectArg(args);
    const auto = args.includes("--auto");
    const result = distillSession(project, sessionId, { auto });
    if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
    else if (auto) {
      // Auto mode is quiet: no output for empty or already-captured sessions; one line otherwise.
      const drafted = result.candidates.filter((candidate) => candidate.ok).length;
      if (!result.skipped_reason && drafted > 0) {
        console.log(`Auto-distilled ${drafted} pending draft${drafted === 1 ? "" : "s"} from session ${sessionId}. Review with: kage review --project ${project}`);
      }
    } else {
      console.log(`Distilled session: ${sessionId}`);
      console.log(`Observations: ${result.observations}`);
      console.log(`Candidates: ${result.candidates.filter((candidate) => candidate.ok).length}`);
      if (result.errors.length) console.log(`Errors:\n${result.errors.map((error) => `  - ${error}`).join("\n")}`);
    }
    if (!result.ok && !auto) process.exit(2);
    return;
  }

  if (command === "resume") {
    const result = kageResume(projectArg(args));
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    // Prints nothing when there is no prior session data, so hooks can append output verbatim.
    if (result.has_content && result.context_block) console.log(result.context_block);
    return;
  }

  if (command === "feedback") {
    const id = takeArg(args, "--packet");
    const kind = takeArg(args, "--kind");
    if (!id || !kind) usage();
    const result = recordFeedback(projectArg(args), id, kind as never);
    if (!result.ok) {
      console.error(`Feedback failed:\n${result.errors.map((error) => `  - ${error}`).join("\n")}`);
      process.exit(2);
    }
    console.log(`Recorded ${kind} feedback for ${id}`);
    return;
  }

  if (command === "capture") {
    const title = takeArg(args, "--title");
    const body = takeArg(args, "--body");
    if (!title || !body) usage();
    const type = takeArg(args, "--type") as MemoryType | undefined;
    const input: CaptureInput = {
      projectDir: projectArg(args),
      title,
      body,
      type,
      summary: takeArg(args, "--summary"),
      tags: listArg(takeArg(args, "--tags")),
      paths: listArg(takeArg(args, "--paths")),
      stack: listArg(takeArg(args, "--stack")),
      graphNodes: listArg(takeArg(args, "--graph-nodes")),
      allowMissingPaths: args.includes("--allow-missing-paths"),
      strictCitations: true,
      strictContradictions: args.includes("--strict-contradictions"),
    };
    const result = capture(input);
    if (!result.ok) {
      console.error(`Capture blocked:\n${result.errors.map((error) => `  - ${error}`).join("\n")}`);
      process.exit(2);
    }
    console.log(`Captured repo-local packet: ${result.path}`);
    printContradictionWarning(result.contradictions);
    if (result.warnings?.length) console.log(`Warnings:\n${result.warnings.map((warning) => `  - ${warning}`).join("\n")}`);
    console.log("Repo-local memory is written immediately. Promotion to org/global still requires explicit review.");
    return;
  }

  if (command === "changelog") {
    const days = numberArg(args, "--days", 7);
    const result = changelog(projectArg(args), days);
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Memory changelog: last ${result.days} day${result.days === 1 ? "" : "s"} — ${result.added.length} added, ${result.updated.length} updated, ${result.deprecated.length} deprecated (${result.total} total)`);
    if (result.added.length > 0) {
      console.log("\nNew packets:");
      for (const entry of result.added) {
        console.log(`  + [${entry.type}] ${entry.title}  (${entry.date.slice(0, 10)})`);
      }
    }
    if (result.updated.length > 0) {
      console.log("\nUpdated packets:");
      for (const entry of result.updated) {
        console.log(`  ~ [${entry.type}] ${entry.title}  (${entry.date.slice(0, 10)})`);
      }
    }
    if (result.deprecated.length > 0) {
      console.log("\nDeprecated packets:");
      for (const entry of result.deprecated) {
        console.log(`  - [${entry.type}] ${entry.title}  (${entry.date.slice(0, 10)})`);
      }
    }
    if (result.total === 0) {
      console.log("No memory activity in this period.");
    }
    return;
  }

  if (command === "review") {
    await review(projectArg(args));
    return;
  }

  if (command === "claim") {
    const packetId = takeArg(args, "--packet");
    if (!packetId) usage();
    const project = projectArg(args);
    const actor = takeArg(args, "--actor") ?? gitUserName(project) ?? "unknown";
    const result = claimWorkItem(project, packetId!, actor);
    if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
    else if (result.ok) console.log(`Claimed ${packetId} as ${actor}.`);
    else console.log(`Claim failed: ${result.errors.join("; ")}`);
    if (!result.ok) process.exit(2);
    return;
  }

  if (command === "implements") {
    const outputId = takeArg(args, "--packet");
    const proposalId = takeArg(args, "--proposal");
    if (!outputId || !proposalId) usage();
    const project = projectArg(args);
    const evidence = takeArg(args, "--evidence") ?? "";
    const result = linkImplements(project, outputId!, proposalId!, evidence);
    // Cloud glue: if this repo has a team linked (`kage cloud link`) and the
    // proposal just advanced to in_review, push it so a teammate can approve it
    // through the non-forgeable, token-authenticated gate (see `kage cloud
    // approve`'s matching glue below) instead of the weaker local `kage gate
    // review`. Best-effort — a push failure never fails the link itself.
    let cloudPushResult: Awaited<ReturnType<typeof cloudPush>> | null = null;
    if (result.ok && result.auto_advanced) {
      const link = readTeamLink(project);
      if (link) {
        try {
          cloudPushResult = await cloudPush(link.server, link.team_id, link.token, project);
        } catch (error) {
          cloudPushResult = { submitted: 0, failed: [{ title: proposalId!, reason: error instanceof Error ? error.message : String(error) }] };
        }
      }
    }
    if (args.includes("--json")) console.log(JSON.stringify({ ...result, cloud_push: cloudPushResult }, null, 2));
    else if (result.ok) {
      console.log(`Linked ${outputId} implements ${proposalId}.`);
      if (result.auto_advanced) console.log(`  ${proposalId} advanced to in_review.`);
      if (cloudPushResult) {
        console.log(cloudPushResult.failed.length
          ? `  Cloud push failed: ${cloudPushResult.failed.map((f) => f.reason).join("; ")}`
          : `  Pushed to the team's Kage Cloud for review (kage cloud approve).`);
      }
    } else {
      console.log(`Link failed: ${result.errors.join("; ")}`);
    }
    if (!result.ok) process.exit(2);
    return;
  }

  if (command === "stage") {
    const packetId = takeArg(args, "--packet");
    const toStage = takeArg(args, "--to") as WorkStage | undefined;
    if (!packetId || !toStage || !(WORK_STAGES as readonly string[]).includes(toStage)) {
      console.error(`Usage: kage stage --packet <id> --to <${WORK_STAGES.join("|")}> --actor <name>`);
      process.exit(2);
    }
    const project = projectArg(args);
    const actor = takeArg(args, "--actor") ?? gitUserName(project) ?? "unknown";
    // The terminal in_review -> done edge is not reachable from this non-interactive
    // command — only `kage gate review` (TTY-interactive) or the cloud approve gate
    // (token-authenticated) can perform it. See gateReview()'s comment for why.
    if (toStage === "done") {
      console.error("kage stage cannot advance a work item to done non-interactively. Use `kage gate review` or `kage cloud approve`.");
      process.exit(2);
    }
    const evidence = takeArg(args, "--evidence") ?? "";
    const result = transitionWorkStage(project, packetId, toStage, { actor, evidence });
    if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
    else if (result.ok) console.log(`${packetId}: ${result.from_stage} -> ${result.to_stage}`);
    else console.log(`Transition failed: ${result.errors.join("; ")}`);
    if (!result.ok) process.exit(2);
    return;
  }

  if (command === "gate") {
    const sub = args[1];
    if (sub === "review") {
      await gateReview(projectArg(args));
      return;
    }
    if (sub === "list" || sub === undefined) {
      const project = projectArg(args);
      const stage = takeArg(args, "--stage") as WorkStage | undefined;
      const items = listWorkItems(project, { stage });
      if (args.includes("--json")) {
        console.log(JSON.stringify(items, null, 2));
        return;
      }
      if (!items.length) {
        console.log(stage ? `No work items at stage ${stage}.` : "No work items.");
        return;
      }
      for (const item of items) {
        console.log(`${item.stage.padEnd(10)} ${item.id}  ${item.title}${item.claimed_by ? `  (claimed by ${item.claimed_by})` : ""}`);
      }
      return;
    }
    usage();
  }

  if (command === "validate") {
    const result = validateProject(projectArg(args));
    if (result.errors.length) console.log(`Errors:\n${result.errors.map((error) => `  - ${error}`).join("\n")}`);
    if (result.warnings.length) console.log(`Warnings:\n${result.warnings.map((warning) => `  - ${warning}`).join("\n")}`);
    console.log(result.ok ? "Validation passed." : "Validation failed.");
    if (!result.ok) process.exit(2);
    return;
  }

  usage();
}

// Remediation-first failure: lead with the message, follow with exactly ONE
// copy-pasteable next command. Exit code stays 1, same as before.
main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  console.error(`\nTry:\n  ${remediationFor(error)}`);
  process.exit(1);
});
