import { createHash } from "node:crypto";

import {
  buildCodeGraph as legacyBuildCodeGraph,
  buildDocsIndex as legacyBuildDocsIndex,
  kageContributors as legacyKageContributors,
  type CodeGraph,
  type DocsIndexArtifact,
  type KageContributorsReport,
} from "../../kernel.js";
import type { IndexedFact, IndexedRelation } from "./source.js";

// The narrow seam over the kernel. The repository model must not deeply couple to the 22k-line
// kernel: everything it needs from the legacy engine flows through these three functions, which
// tests can fake wholesale. `repository-scanner.ts` depends only on this interface and the
// `RepositorySnapshot`/`IndexedFact`/`IndexedRelation` types — never on `kernel.js` directly.
export interface LegacyIndexKernel {
  buildCodeGraph(projectDir: string): CodeGraph;
  buildDocsIndex(projectDir: string): DocsIndexArtifact;
  kageContributors(projectDir: string): KageContributorsReport;
}

export const DEFAULT_INDEX_KERNEL: LegacyIndexKernel = {
  buildCodeGraph(projectDir) {
    // force:true so the snapshot always reflects current source content, never a stale cache.
    return legacyBuildCodeGraph(projectDir, { force: true });
  },
  buildDocsIndex(projectDir) {
    return legacyBuildDocsIndex(projectDir);
  },
  kageContributors(projectDir) {
    return legacyKageContributors(projectDir);
  },
};

// Repository-relative, POSIX-normalized, never absolute. All evidence paths pass through here
// before they leave the adapter so nothing downstream ever sees a local absolute root.
function relativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");
}

function sha(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 32);
}

export function fileFactId(path: string): string {
  return `file:${relativePath(path)}`;
}

function symbolFactId(id: string): string {
  return `symbol:${id}`;
}

// Facts are code-graph certainties, so their fingerprints come from *current source content*: the
// per-file content hash the code graph already computed. Facts that name a path with a known file
// hash reuse it; anything else falls back to a stable hash of the fact's own identity so the
// fingerprint is always deterministic for a given tree.
export function codeGraphEvidence(graph: CodeGraph): { facts: IndexedFact[]; relations: IndexedRelation[] } {
  const facts: IndexedFact[] = [];
  const relations: IndexedRelation[] = [];
  const hashByPath = new Map<string, string>();
  for (const file of graph.files) hashByPath.set(relativePath(file.path), file.hash);
  const fingerprintFor = (path: string, fallback: string): string =>
    hashByPath.get(relativePath(path)) ?? sha(fallback);

  // Files.
  for (const file of graph.files) {
    const path = relativePath(file.path);
    facts.push({
      fact_id: fileFactId(path),
      kind: "file",
      name: path,
      path,
      line: null,
      fingerprint: file.hash,
      confidence: 1,
    });
  }

  // Symbols + their containing-file "contains" relation.
  for (const symbol of graph.symbols) {
    const path = relativePath(symbol.path);
    facts.push({
      fact_id: symbolFactId(symbol.id),
      kind: "symbol",
      name: symbol.name,
      path,
      line: symbol.line,
      fingerprint: fingerprintFor(path, symbol.id),
      confidence: 1,
    });
    relations.push({
      from: fileFactId(path),
      type: "contains",
      to: symbolFactId(symbol.id),
      evidence_fact_ids: [fileFactId(path)],
    });
  }

  const symbolById = new Map(graph.symbols.map((symbol) => [symbol.id, symbol]));

  // Routes + the route→handler "exposes" relation.
  for (const route of graph.routes) {
    const path = relativePath(route.file_path);
    const routeFactId = `route:${route.id}`;
    facts.push({
      fact_id: routeFactId,
      kind: "route",
      name: `${route.method} ${route.path}`,
      path,
      line: route.line,
      fingerprint: fingerprintFor(path, route.id),
      confidence: 1,
    });
    if (route.handler_symbol) {
      const handler = symbolById.get(route.handler_symbol);
      relations.push({
        from: routeFactId,
        type: "exposes",
        to: handler ? symbolFactId(handler.id) : route.handler_symbol,
        evidence_fact_ids: [routeFactId],
      });
    }
  }

  // Imports.
  for (const edge of graph.imports) {
    const from = relativePath(edge.from_path);
    relations.push({
      from: fileFactId(from),
      type: "imports",
      to: edge.to_path ? fileFactId(relativePath(edge.to_path)) : `module:${edge.specifier}`,
      evidence_fact_ids: [fileFactId(from)],
    });
  }

  // Calls (structural edges; downstream extractors decide any trust they carry).
  for (const call of graph.calls) {
    if (!call.from_symbol) continue;
    relations.push({
      from: symbolFactId(call.from_symbol),
      type: "calls",
      to: symbolFactId(call.to_symbol),
      evidence_fact_ids: [symbolFactId(call.from_symbol)],
    });
  }

  // Tests + the handler→test "verified_by" relation.
  for (const testEdge of graph.tests) {
    const testPath = relativePath(testEdge.test_path);
    const testFactId = `test:${testEdge.test_symbol}`;
    facts.push({
      fact_id: testFactId,
      kind: "test",
      name: testEdge.title || testEdge.test_symbol,
      path: testPath,
      line: testEdge.line,
      fingerprint: fingerprintFor(testPath, testEdge.test_symbol),
      confidence: 1,
    });
    const covered = testEdge.covers_symbol
      ? (symbolById.has(testEdge.covers_symbol) ? symbolFactId(testEdge.covers_symbol) : `symbol:${testEdge.covers_symbol}`)
      : testEdge.covers_path
        ? fileFactId(relativePath(testEdge.covers_path))
        : null;
    if (covered) {
      relations.push({
        from: covered,
        type: "verified_by",
        to: testPath,
        evidence_fact_ids: [testFactId],
      });
    }
  }

  // Packages → dependency + script facts (path is the manifest, never a made-up location).
  for (const pkg of graph.packages) {
    if (pkg.kind === "script") {
      facts.push({
        fact_id: `script:${pkg.name}`,
        kind: "script",
        name: pkg.name,
        path: "package.json",
        line: null,
        fingerprint: sha(`script:${pkg.name}:${pkg.version}`),
        confidence: 1,
      });
    } else {
      facts.push({
        fact_id: `dependency:${pkg.name}`,
        kind: "dependency",
        name: pkg.name,
        path: "package.json",
        line: null,
        fingerprint: sha(`dependency:${pkg.name}:${pkg.version}`),
        confidence: 1,
      });
    }
  }

  return { facts, relations };
}
