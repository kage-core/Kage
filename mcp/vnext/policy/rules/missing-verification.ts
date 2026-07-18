import { normalizeFinding, type MinimalChangeFinding } from "../types.js";
import { compareText, diffEvidence, isTestPath, matchesAny, type Rule, type RuleContext } from "./shared.js";

/**
 * Deterministic "source changed but no test changed with it" check.
 *
 * When a diff modifies non-test source code (excluding pure manifest/contract/doc files) but contains no
 * test file at all, the change ships unverified. This is ground truth from the diff, so
 * `deterministic: true`. It is advisory: it never asserts "lines avoided" or a controlled comparison —
 * it only observes the absence of a test file in the same diff and asks for verification.
 */

const CODE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".go", ".rs", ".java", ".rb"];

function isCodeFile(path: string): boolean {
  return CODE_EXTENSIONS.some((ext) => path.endsWith(ext));
}

export const missingVerificationRule: Rule = (ctx: RuleContext): MinimalChangeFinding[] => {
  const changedSource: string[] = [];
  let sawTest = false;

  for (const file of ctx.diff.files) {
    if (file.is_binary || file.change_type === "deleted") continue;
    if (isTestPath(file.path, ctx.policy.test_path_patterns)) {
      sawTest = true;
      continue;
    }
    if (!isCodeFile(file.path)) continue; // manifests, docs, schemas are not "source needing a unit test".
    if (matchesAny(file.path, ctx.policy.contract_path_patterns)) continue;
    changedSource.push(file.path);
  }

  if (sawTest || changedSource.length === 0) return [];

  const files = changedSource.sort(compareText);
  return [
    normalizeFinding({
      finding_id: `mc:missing_verification`,
      kind: "missing_verification",
      title: "Source changed without a test in the diff",
      explanation:
        `This diff changes ${files.map((f) => `\`${f}\``).join(", ")} but includes no test file. Add or update a test that exercises the change, or dismiss with a recorded reason.`,
      evidence: files.map((path) =>
        diffEvidence({ repository_id: ctx.task.repository_id, source_uri: path, path, symbol: null }),
      ),
      deterministic: true,
      severity: "warning",
      suggested_files: files,
    }),
  ];
};
