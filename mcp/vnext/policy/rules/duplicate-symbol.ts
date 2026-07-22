import { normalizeFinding, type MinimalChangeFinding } from "../types.js";
import { compareText, injectableEvidence, type Rule, type RuleContext } from "./shared.js";

/**
 * Deterministic "a newly exported symbol duplicates one the repository already has" check.
 *
 * A reuse suggestion is only honest when it points at a real, injectable repository symbol — so this
 * rule fires ONLY when the diff introduces an exported symbol whose name matches a symbol carried by a
 * verified/approved evidence row in a DIFFERENT file. The cited evidence is the existing symbol's real
 * record, so the agent can retrieve and reuse it. With no model (no ground truth to compare against) the
 * rule stays silent rather than guessing.
 */

// Exported declarations, in the languages this repository ships. Captures the declared name.
const EXPORT_PATTERNS: RegExp[] = [
  /^\s*export\s+(?:default\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/,
  /^\s*export\s+(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/,
  /^\s*export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/,
  /^\s*export\s+interface\s+([A-Za-z_$][\w$]*)/,
  /^\s*export\s+type\s+([A-Za-z_$][\w$]*)/,
  /^\s*export\s+enum\s+([A-Za-z_$][\w$]*)/,
];

function exportedSymbols(addedLines: readonly string[]): string[] {
  const names = new Set<string>();
  for (const line of addedLines) {
    for (const pattern of EXPORT_PATTERNS) {
      const match = pattern.exec(line);
      if (match) names.add(match[1]);
    }
  }
  return [...names].sort(compareText);
}

export const duplicateSymbolRule: Rule = (ctx: RuleContext): MinimalChangeFinding[] => {
  if (!ctx.model) return [];
  const existing = injectableEvidence(ctx.model, ctx.task.repository_id).filter((record) => record.symbol);
  if (existing.length === 0) return [];

  // symbol -> the deterministic first evidence row that anchors it (ordered by path, then evidence_id).
  const bySymbol = new Map<string, (typeof existing)[number]>();
  for (const record of [...existing].sort(
    (a, b) => compareText(a.path ?? "", b.path ?? "") || compareText(a.evidence_id, b.evidence_id),
  )) {
    const symbol = record.symbol as string;
    if (!bySymbol.has(symbol)) bySymbol.set(symbol, record);
  }

  const findings: MinimalChangeFinding[] = [];
  for (const file of ctx.diff.files) {
    if (file.is_binary) continue;
    for (const symbol of exportedSymbols(file.added_lines)) {
      const anchor = bySymbol.get(symbol);
      if (!anchor || anchor.path === file.path) continue; // Same file: an edit, not a duplicate.
      findings.push(
        normalizeFinding({
          finding_id: `mc:duplicate_symbol:${file.path}:${symbol}`,
          kind: "duplicate_symbol",
          title: `Duplicate symbol \`${symbol}\``,
          explanation:
            `\`${symbol}\` is newly exported in \`${file.path}\`, but the repository already provides \`${symbol}\` in \`${anchor.path}\`. Reuse the existing symbol instead of re-declaring it.`,
          evidence: [anchor],
          deterministic: true,
          severity: "warning",
          suggested_files: [file.path, anchor.path ?? file.path],
        }),
      );
    }
  }
  return findings;
};
