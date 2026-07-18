/**
 * Deterministic unified-diff parser for the Minimal Change Guard's post-diff checks (Phase D, Task 9).
 *
 * This is pure, allocation-only ground-truth extraction: it turns a `git diff` text into a structured
 * `ParsedDiff` and NOTHING else. It never runs git, never touches the filesystem, and never makes a
 * model call, so the same bytes always parse to the same structure. It also fails open on arbitrary
 * input — junk that is not a valid diff yields an empty (or best-effort) structure, never a throw —
 * because a post-diff rule that crashed on a malformed diff could block work, and the guard is advisory.
 */

export interface DiffHunk {
  header: string;
  added_lines: string[];
  removed_lines: string[];
}

export type DiffChangeType = "added" | "modified" | "deleted" | "renamed";

export interface FileDiff {
  old_path: string | null;
  new_path: string | null;
  // The canonical path used by rules: the new path for adds/modifies/renames, the old path for deletes.
  path: string;
  change_type: DiffChangeType;
  is_binary: boolean;
  hunks: DiffHunk[];
  // Flattened added/removed content lines (leading +/- stripped), across every hunk in the file.
  added_lines: string[];
  removed_lines: string[];
}

export interface ParsedDiff {
  files: FileDiff[];
}

// Strip a leading `a/` or `b/` prefix git puts on diff paths (unless the path is literally `/dev/null`).
function stripPrefix(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === "/dev/null") return trimmed;
  if (trimmed.startsWith("a/") || trimmed.startsWith("b/")) return trimmed.slice(2);
  return trimmed;
}

// Extract the two paths from a `diff --git a/x b/y` header. Paths with spaces are uncommon in this
// corpus; we take the a/ and b/ tokens conservatively and let the ---/+++ lines refine them.
function parseGitHeader(line: string): { a: string | null; b: string | null } {
  const rest = line.slice("diff --git ".length);
  const match = /^(a\/.*?) (b\/.*)$/.exec(rest);
  if (!match) return { a: null, b: null };
  return { a: stripPrefix(match[1]), b: stripPrefix(match[2]) };
}

function canonicalPath(file: {
  old_path: string | null;
  new_path: string | null;
  change_type: DiffChangeType;
}): string {
  if (file.change_type === "deleted") return file.old_path ?? file.new_path ?? "";
  return file.new_path ?? file.old_path ?? "";
}

// The declared line counts from a `@@ -oldStart[,oldCount] +newStart[,newCount] @@` header. Omitted
// counts default to 1 (git's convention). These counts — not prefix pattern-matching — decide when a
// hunk body ends, so a content line beginning `--- `/`+++ ` (removed body `-- …` / added body `++ …`)
// is attributed as content, never mistaken for a file header. A header that does not parse yields
// Infinity so the hunk stays greedily open until the next `@@`/`diff --git` (fail-open, matches the
// pre-existing behavior for malformed hunks rather than truncating them).
function parseHunkCounts(line: string): { old: number; new: number } {
  const match = /^@@+ -\d+(?:,(\d+))? \+\d+(?:,(\d+))? @@/.exec(line);
  if (!match) return { old: Number.POSITIVE_INFINITY, new: Number.POSITIVE_INFINITY };
  return {
    old: match[1] === undefined ? 1 : Number.parseInt(match[1], 10),
    new: match[2] === undefined ? 1 : Number.parseInt(match[2], 10),
  };
}

export function parseUnifiedDiff(text: string): ParsedDiff {
  const files: FileDiff[] = [];
  if (typeof text !== "string" || text.length === 0) return { files };

  const lines = text.split("\n");
  let current: FileDiff | null = null;
  let hunk: DiffHunk | null = null;
  // Remaining declared old/new lines for the open hunk body. While either is positive the hunk body is
  // still being consumed and every line is content — this is what keeps a `--- `/`+++ ` content line
  // from being pattern-matched as a file header.
  let oldRemaining = 0;
  let newRemaining = 0;

  const closeHunk = () => {
    if (current && hunk) current.hunks.push(hunk);
    hunk = null;
    oldRemaining = 0;
    newRemaining = 0;
  };
  const closeFile = () => {
    closeHunk();
    if (current) {
      current.path = canonicalPath(current);
      files.push(current);
    }
    current = null;
  };

  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      closeFile();
      const { a, b } = parseGitHeader(line);
      current = {
        old_path: a,
        new_path: b,
        path: "",
        change_type: "modified",
        is_binary: false,
        hunks: [],
        added_lines: [],
        removed_lines: [],
      };
      continue;
    }
    if (!current) continue; // Preamble before the first file header: ignore, never throw.

    // Inside an open hunk body every line is content, decided by the declared line counts — NOT by
    // prefix matching. This must run before the `--- `/`+++ ` header checks so that a removed line
    // whose body is `-- …` (wire `--- …`) or an added line whose body is `++ …` (wire `+++ …`) is
    // accounted as content and never overwrites the file path.
    if (hunk && (oldRemaining > 0 || newRemaining > 0)) {
      if (line.startsWith("\\")) continue; // "\ No newline at end of file": not a content line.
      if (line.startsWith("+")) {
        const content = line.slice(1);
        hunk.added_lines.push(content);
        current.added_lines.push(content);
        newRemaining -= 1;
      } else if (line.startsWith("-")) {
        const content = line.slice(1);
        hunk.removed_lines.push(content);
        current.removed_lines.push(content);
        oldRemaining -= 1;
      } else {
        // Context line (leading space, or a stray empty split artifact): present in both sides.
        oldRemaining -= 1;
        newRemaining -= 1;
      }
      if (oldRemaining <= 0 && newRemaining <= 0) closeHunk();
      continue;
    }

    if (line.startsWith("new file mode")) {
      current.change_type = "added";
      continue;
    }
    if (line.startsWith("deleted file mode")) {
      current.change_type = "deleted";
      continue;
    }
    if (line.startsWith("rename from ")) {
      current.change_type = "renamed";
      current.old_path = stripPrefix(line.slice("rename from ".length));
      continue;
    }
    if (line.startsWith("rename to ")) {
      current.change_type = "renamed";
      current.new_path = stripPrefix(line.slice("rename to ".length));
      continue;
    }
    if (line.startsWith("Binary files ") || line.startsWith("GIT binary patch")) {
      current.is_binary = true;
      continue;
    }
    if (line.startsWith("--- ")) {
      closeHunk();
      const path = stripPrefix(line.slice(4));
      if (path !== "/dev/null") current.old_path = path;
      else current.change_type = current.change_type === "renamed" ? "renamed" : "added";
      continue;
    }
    if (line.startsWith("+++ ")) {
      const path = stripPrefix(line.slice(4));
      if (path !== "/dev/null") current.new_path = path;
      else current.change_type = current.change_type === "renamed" ? "renamed" : "deleted";
      continue;
    }
    if (line.startsWith("@@")) {
      closeHunk();
      hunk = { header: line, added_lines: [], removed_lines: [] };
      const counts = parseHunkCounts(line);
      oldRemaining = counts.old;
      newRemaining = counts.new;
      // A hunk header that declares zero changed lines on both sides has no body to consume.
      if (oldRemaining <= 0 && newRemaining <= 0) closeHunk();
      continue;
    }
    // Any remaining line is file metadata (index, mode, \ No newline) outside a hunk body: ignored for
    // content accounting. In-hunk content is fully handled by the line-count block above.
  }

  closeFile();
  return { files };
}
