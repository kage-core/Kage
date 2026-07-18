import { normalizeFinding, type MinimalChangeFinding } from "../types.js";
import { compareText, diffEvidence, matchesAny, type Rule, type RuleContext } from "./shared.js";

/**
 * Deterministic "this diff changes a public contract or removes an exported symbol" check.
 *
 * A public contract — an API schema, a `.proto`, a GraphQL schema, a `.d.ts` type surface — or the
 * removal of an exported symbol is a breaking-change risk for every downstream consumer. This rule flags
 * such changes from the diff alone (ground truth), so `deterministic: true`, and asks the agent to
 * confirm the change is intended and the corresponding knowledge/contract is updated. Advisory only.
 */

// An exported declaration line, used to detect a REMOVED export (a public-surface deletion/rename).
const EXPORT_LINE = /^\s*export\b/;

export const publicContractRule: Rule = (ctx: RuleContext): MinimalChangeFinding[] => {
  const findings: MinimalChangeFinding[] = [];
  for (const file of ctx.diff.files) {
    if (file.is_binary) continue;

    const isContractFile = matchesAny(file.path, ctx.policy.contract_path_patterns);
    const removesExport = file.removed_lines.some((line) => EXPORT_LINE.test(line));

    if (!isContractFile && !removesExport) continue;

    const reason = isContractFile
      ? `\`${file.path}\` is a public contract (schema/API surface).`
      : `\`${file.path}\` removes or changes an exported symbol.`;

    findings.push(
      normalizeFinding({
        finding_id: `mc:public_contract:${file.path}`,
        kind: "public_contract",
        title: `Public contract change in \`${file.path}\``,
        explanation:
          `${reason} A public-contract change can break downstream consumers. Confirm it is intended and that the corresponding knowledge/contract is updated, or dismiss with a recorded reason.`,
        evidence: [diffEvidence({ repository_id: ctx.task.repository_id, source_uri: file.path, path: file.path, symbol: null })],
        deterministic: true,
        severity: "warning",
        suggested_files: [file.path],
      }),
    );
  }
  return findings.sort((a, b) => compareText(a.finding_id, b.finding_id));
};
