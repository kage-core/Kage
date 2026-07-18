import { normalizeFinding, type MinimalChangeFinding } from "../types.js";
import { basename, compareText, diffEvidence, type Rule, type RuleContext } from "./shared.js";

/**
 * Deterministic "a new third-party dependency was added" check.
 *
 * A new dependency is the single most expensive rung of the reuse ladder — it enlarges the supply-chain
 * surface for the whole repository. This rule reads the parsed diff for added dependency declarations in
 * a package manifest (or lockfile) and asks the agent to justify each one. It is deterministic ground
 * truth (the manifest line is in the diff), so `deterministic: true`; it is advisory (`warning`), and it
 * requires justification rather than blocking.
 */

// An added package.json line that declares a dependency: `"name": "<version-spec>"`. We only accept
// values that look like a version spec (semver range, tag, url, workspace/file protocol) so that added
// script or config entries are not misread as dependencies.
const PACKAGE_JSON_DEP = /^\s*"([^"]+)"\s*:\s*"([^"]*)"\s*,?\s*$/;
const VERSION_SPEC = /^(?:[\^~><=]|\d|\*|latest|workspace:|file:|link:|npm:|git\+|https?:|github:)/;

// requirements.txt style: `name==1.2.3`, `name>=1.0`, `name~=2`, or a bare package name.
const PY_REQUIREMENT = /^\s*([A-Za-z0-9][A-Za-z0-9._-]*)\s*(==|>=|<=|~=|!=|>|<)?/;

// go.mod require line: `\tmodule/path v1.2.3`.
const GO_REQUIRE = /^\s*([a-z0-9][a-z0-9._/-]+)\s+v\d/;

function detectNames(fileBasename: string, addedLines: readonly string[], policy: RuleContext["policy"]): string[] {
  const names = new Set<string>();
  const lower = fileBasename.toLowerCase();
  const isManifest = policy.manifest_files.includes(fileBasename) || policy.lockfiles.includes(fileBasename);
  if (!isManifest) return [];

  for (const line of addedLines) {
    if (lower === "package.json" || lower.endsWith(".json")) {
      const match = PACKAGE_JSON_DEP.exec(line);
      if (match && VERSION_SPEC.test(match[2].trim())) names.add(match[1]);
      continue;
    }
    if (lower.startsWith("requirements") && lower.endsWith(".txt")) {
      const match = PY_REQUIREMENT.exec(line);
      if (match && !line.trim().startsWith("#")) names.add(match[1]);
      continue;
    }
    if (lower === "go.mod") {
      const match = GO_REQUIRE.exec(line);
      if (match) names.add(match[1]);
      continue;
    }
    // Lockfiles and other manifests: fall back to the package.json name:value shape when present.
    const match = PACKAGE_JSON_DEP.exec(line);
    if (match && VERSION_SPEC.test(match[2].trim())) names.add(match[1]);
  }
  return [...names].sort(compareText);
}

export const newDependencyRule: Rule = (ctx: RuleContext): MinimalChangeFinding[] => {
  const findings: MinimalChangeFinding[] = [];
  for (const file of ctx.diff.files) {
    if (file.is_binary || file.change_type === "deleted") continue;
    const name = basename(file.path);
    for (const dep of detectNames(name, file.added_lines, ctx.policy)) {
      findings.push(
        normalizeFinding({
          finding_id: `mc:new_dependency:${file.path}:${dep}`,
          kind: "new_dependency",
          title: `New dependency \`${dep}\``,
          explanation:
            `\`${dep}\` is added in \`${file.path}\`. A new dependency enlarges the supply-chain surface for the whole repository — justify why an existing repository symbol or an already-present dependency cannot do this, or dismiss with a recorded reason.`,
          evidence: [
            diffEvidence({ repository_id: ctx.task.repository_id, source_uri: file.path, path: file.path, symbol: dep }),
          ],
          deterministic: true,
          severity: "warning",
          suggested_files: [file.path],
        }),
      );
    }
  }
  return findings;
};
