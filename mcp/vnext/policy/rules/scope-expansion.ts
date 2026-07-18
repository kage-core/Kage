import { normalizeFinding, type MinimalChangeFinding } from "../types.js";
import { componentDirectories, compareText, type Rule, type RuleContext } from "./shared.js";

/**
 * Deterministic "this diff touches a component the task was not scoped to" check.
 *
 * The task declares the component slugs it intends to change. This rule attributes each changed file to
 * the component that owns its directory (derived from the repository model's injectable evidence paths),
 * and flags any file owned by a component outside the declared set. Attribution is ground truth from the
 * model, so `deterministic: true`; the finding cites the owning component's real evidence. A file with no
 * owning component is not flagged — the guard never invents a scope it cannot prove.
 */

export const scopeExpansionRule: Rule = (ctx: RuleContext): MinimalChangeFinding[] => {
  if (!ctx.model) return [];
  // An empty declared set means the task did not scope itself; there is no scope to expand beyond.
  if (ctx.task.declared_components.length === 0) return [];

  const declared = new Set(ctx.task.declared_components);
  const directories = componentDirectories(ctx.model, ctx.task.repository_id);
  const offenders = new Map<string, { slug: string; files: Set<string>; evidenceId: string; path: string }>();

  for (const file of ctx.diff.files) {
    if (file.is_binary) continue;
    // Longest-prefix owner wins (directories is sorted by descending length).
    const owner = directories.find(
      (entry) => file.path === entry.directory || file.path.startsWith(`${entry.directory}/`),
    );
    if (!owner || declared.has(owner.slug)) continue;
    const bucket = offenders.get(owner.slug) ?? {
      slug: owner.slug,
      files: new Set<string>(),
      evidenceId: owner.evidence.evidence_id,
      path: owner.evidence.path ?? owner.directory,
    };
    bucket.files.add(file.path);
    offenders.set(owner.slug, bucket);
  }

  const findings: MinimalChangeFinding[] = [];
  for (const slug of [...offenders.keys()].sort(compareText)) {
    const bucket = offenders.get(slug)!;
    const files = [...bucket.files].sort(compareText);
    // Re-derive the owning component's evidence to cite (deterministic first match for this slug).
    const evidence = directories
      .filter((entry) => entry.slug === slug)
      .map((entry) => entry.evidence)
      .sort((a, b) => compareText(a.evidence_id, b.evidence_id));
    findings.push(
      normalizeFinding({
        finding_id: `mc:scope_expansion:${slug}`,
        kind: "scope_expansion",
        title: `Change outside declared scope: \`${slug}\``,
        explanation:
          `This task declares scope [${ctx.task.declared_components.join(", ")}], but changes ${files
            .map((f) => `\`${f}\``)
            .join(", ")} which belong to the \`${slug}\` component. Confirm the cross-component change is intended, or split it out.`,
        evidence,
        deterministic: true,
        severity: "warning",
        suggested_files: files,
      }),
    );
  }
  return findings;
};
