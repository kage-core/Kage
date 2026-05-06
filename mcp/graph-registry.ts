import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createSignedManifest, type SignedManifest } from "./registry/index.js";
import {
  PACKET_SCHEMA_VERSION,
  auditProject,
  buildCodeGraph,
  buildIndexes,
  buildKnowledgeGraph,
  ensureMemoryDirs,
  graphRegistryDir,
  kageMetrics,
  loadApprovedPackets,
  memoryInbox,
  type MemoryStatus,
  type MemoryType,
  type MemoryPacket,
} from "./kernel.js";

export interface GraphRegistryArtifact {
  name: string;
  kind: "memory_graph" | "code_graph" | "indexes" | "metrics" | "audit" | "inbox";
  path: string;
  schema_version: number | null;
  sha256: string;
  bytes: number;
}

export interface GraphRegistryPayload {
  schema_version: 1;
  repo_key: string;
  project_dir: string;
  generated_at: string;
  repo_state: {
    branch: string | null;
    head: string | null;
    merge_base: string | null;
  };
  artifacts: GraphRegistryArtifact[];
  sources: {
    packet_schema_version: number;
    packet_count: number;
    packets: Array<{
      id: string;
      title: string;
      type: MemoryType;
      status: MemoryStatus;
      updated_at: string;
      content_sha256: string;
    }>;
  };
  reports: {
    metrics: {
      path: string;
      readiness_score: number;
      evidence_coverage_percent: number;
    };
    audit: {
      path: string;
      ok: boolean;
      trust_score: number;
      structured_coverage_percent: number;
      precise_coverage_percent: number;
    };
    inbox: {
      path: string;
      ok: boolean;
      pending: number;
      stale: number;
      duplicates: number;
      missing_context: number;
    };
  };
}

export interface GraphRegistryManifestResult {
  ok: boolean;
  project_dir: string;
  path: string;
  manifest: SignedManifest<GraphRegistryPayload>;
  artifacts: GraphRegistryArtifact[];
  errors: string[];
}

function nowIso(): string {
  return new Date().toISOString();
}

function ensureDir(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

function writeJson(path: string, value: unknown): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readGit(projectDir: string, args: string[]): string | null {
  try {
    return execFileSync("git", args, { cwd: projectDir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || null;
  } catch {
    return null;
  }
}

function gitBranch(projectDir: string): string | null {
  return readGit(projectDir, ["rev-parse", "--abbrev-ref", "HEAD"]);
}

function gitHead(projectDir: string): string | null {
  return readGit(projectDir, ["rev-parse", "HEAD"]);
}

function gitMergeBase(projectDir: string): string | null {
  return readGit(projectDir, ["merge-base", "HEAD", "origin/HEAD"]) ?? gitHead(projectDir);
}

function repoKey(projectDir: string): string {
  return (readGit(projectDir, ["config", "--get", "remote.origin.url"]) ?? projectDir)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "local-repo";
}

function canonicalPacketText(packet: MemoryPacket): string {
  return JSON.stringify({
    title: packet.title,
    summary: packet.summary,
    body: packet.body,
    type: packet.type,
    tags: packet.tags,
    paths: packet.paths,
  });
}

function graphRegistryArtifact(projectDir: string, path: string, name: string, kind: GraphRegistryArtifact["kind"]): GraphRegistryArtifact | null {
  const absolute = join(projectDir, path);
  if (!existsSync(absolute)) return null;
  const bytes = readFileSync(absolute);
  let schemaVersion: number | null = null;
  try {
    const parsed = JSON.parse(bytes.toString("utf8")) as Record<string, unknown>;
    schemaVersion = typeof parsed.schema_version === "number" ? parsed.schema_version : null;
  } catch {
    schemaVersion = null;
  }
  return {
    name,
    kind,
    path,
    schema_version: schemaVersion,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes: statSync(absolute).size,
  };
}

export function buildGraphRegistryManifest(projectDir: string): GraphRegistryManifestResult {
  ensureMemoryDirs(projectDir);
  ensureDir(graphRegistryDir(projectDir));
  buildIndexes(projectDir);
  buildCodeGraph(projectDir);
  buildKnowledgeGraph(projectDir);
  const metrics = kageMetrics(projectDir);
  const audit = auditProject(projectDir);
  const inbox = memoryInbox(projectDir);

  const metricsPath = ".agent_memory/metrics.json";
  const auditPath = ".agent_memory/audit.json";
  const inboxPath = ".agent_memory/inbox.json";
  writeJson(join(projectDir, metricsPath), metrics);
  writeJson(join(projectDir, auditPath), audit);
  writeJson(join(projectDir, inboxPath), inbox);

  const artifacts = [
    graphRegistryArtifact(projectDir, ".agent_memory/graph/graph.json", "memory graph", "memory_graph"),
    graphRegistryArtifact(projectDir, ".agent_memory/code_graph/graph.json", "code graph", "code_graph"),
    graphRegistryArtifact(projectDir, ".agent_memory/indexes/catalog.json", "packet catalog", "indexes"),
    graphRegistryArtifact(projectDir, ".agent_memory/indexes/graph.json", "memory graph index", "indexes"),
    graphRegistryArtifact(projectDir, ".agent_memory/indexes/code-graph.json", "code graph index", "indexes"),
    graphRegistryArtifact(projectDir, metricsPath, "metrics report", "metrics"),
    graphRegistryArtifact(projectDir, auditPath, "audit report", "audit"),
    graphRegistryArtifact(projectDir, inboxPath, "memory inbox report", "inbox"),
  ].filter((artifact): artifact is GraphRegistryArtifact => Boolean(artifact));
  const packets = loadApprovedPackets(projectDir).sort((a, b) => a.id.localeCompare(b.id));
  const payload: GraphRegistryPayload = {
    schema_version: 1,
    repo_key: repoKey(projectDir),
    project_dir: projectDir,
    generated_at: nowIso(),
    repo_state: {
      branch: gitBranch(projectDir),
      head: gitHead(projectDir),
      merge_base: gitMergeBase(projectDir),
    },
    artifacts,
    sources: {
      packet_schema_version: PACKET_SCHEMA_VERSION,
      packet_count: packets.length,
      packets: packets.map((packet) => ({
        id: packet.id,
        title: packet.title,
        type: packet.type,
        status: packet.status,
        updated_at: packet.updated_at,
        content_sha256: createHash("sha256").update(canonicalPacketText(packet)).digest("hex"),
      })),
    },
    reports: {
      metrics: {
        path: metricsPath,
        readiness_score: metrics.harness.readiness_score,
        evidence_coverage_percent: metrics.memory_graph.evidence_coverage_percent,
      },
      audit: {
        path: auditPath,
        ok: audit.ok,
        trust_score: audit.trust_score,
        structured_coverage_percent: audit.checks.structured_memory.coverage_percent,
        precise_coverage_percent: audit.checks.code_graph.precise_coverage_percent,
      },
      inbox: {
        path: inboxPath,
        ok: inbox.ok,
        pending: inbox.counts.pending,
        stale: inbox.counts.stale,
        duplicates: inbox.counts.duplicates,
        missing_context: inbox.counts.missing_context,
      },
    },
  };
  const manifest = createSignedManifest({
    kind: "graph_registry",
    name: `${repoKey(projectDir)} graph registry`,
    version: payload.repo_state.head?.slice(0, 12) ?? payload.generated_at.slice(0, 10),
    keyId: `${repoKey(projectDir)}-local`,
    payload,
  });
  const path = join(graphRegistryDir(projectDir), "manifest.json");
  writeJson(path, manifest);
  const errors = [
    ...(!artifacts.some((artifact) => artifact.kind === "memory_graph") ? ["memory graph artifact missing"] : []),
    ...(!artifacts.some((artifact) => artifact.kind === "code_graph") ? ["code graph artifact missing"] : []),
  ];
  return { ok: errors.length === 0, project_dir: projectDir, path, manifest, artifacts, errors };
}
