import { createHash } from "node:crypto";

import type { DocsIndexArtifact } from "../../kernel.js";
import type { IndexedFact } from "./source.js";

function relativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");
}

// Documents are committed repo docs only (the artifact's `source: "repo-docs"` is the kernel's own
// honesty marker) — never external content. Each doc chunk becomes a `document` fact. Heading
// anchors are preserved by baking them into the addressable fact id, since the IndexedFact shape
// intentionally carries no separate anchor field.
export function documentFacts(artifact: DocsIndexArtifact): IndexedFact[] {
  const facts: IndexedFact[] = [];
  for (const chunk of artifact.chunks) {
    const docPath = relativePath(chunk.doc_path);
    const anchor = chunk.anchor.trim();
    const factId = anchor ? `document:${docPath}#${anchor}` : `document:${docPath}:${chunk.line}`;
    facts.push({
      fact_id: factId,
      kind: "document",
      name: chunk.heading || docPath,
      path: docPath,
      line: chunk.line,
      // Fingerprint the current chunk text so the fact changes when the doc content changes.
      fingerprint: createHash("sha256").update(`${docPath}#${anchor}\n${chunk.text}`).digest("hex").slice(0, 32),
      confidence: 1,
    });
  }
  return facts;
}
