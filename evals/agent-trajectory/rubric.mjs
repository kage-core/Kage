// Behavior predicates over an agent's recorded tool-call trajectory.
//
// A trajectory is { events: [{ seq, tool, input }] } where `tool` is the raw tool
// name the agent invoked (built-ins like "Read"/"Edit", or MCP tools like
// "mcp__kage__kage_context"). These predicates ask behavioral questions — "did the
// agent recall before it edited?" — not implementation questions. They are pure.

function shortName(name) {
  return String(name || "").replace(/^mcp__[^_]+__/, "");
}

const RECALL_TOOLS = new Set(["kage_context", "kage_recall", "kage_search", "kage_fetch", "kage_workspace_recall"]);
const CAPTURE_TOOLS = new Set(["kage_learn", "kage_capture", "kage_distill", "kage_propose_from_diff"]);
const MAINTAIN_TOOLS = new Set(["kage_refresh", "kage_pr_check", "kage_supersede", "kage_reverify", "kage_propose_from_diff", "kage_memory_reconcile"]);
const INSPECT_TOOLS = new Set(["Read", "Grep", "Glob"]);
const EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit", "create_file", "str_replace_editor"]);

export function isKageTool(name) {
  return /kage/i.test(String(name));
}
export function isRecall(name) {
  return RECALL_TOOLS.has(shortName(name));
}
export function isCapture(name) {
  return CAPTURE_TOOLS.has(shortName(name));
}
export function isMaintain(name) {
  return MAINTAIN_TOOLS.has(shortName(name));
}
export function isEdit(name) {
  return EDIT_TOOLS.has(shortName(name)) || EDIT_TOOLS.has(name);
}

const firstIndex = (events, pred) => events.findIndex((e) => pred(e.tool));

// Registry of named behaviors. Each is (events, scenario) -> boolean.
export const PREDICATES = {
  // The agent reached for Kage at all, unprompted by the task.
  used_kage: (events) => events.some((e) => isKageTool(e.tool)),

  // It consulted memory BEFORE it first modified code (or recalled at all if it
  // never edited). This is the core "check what the team already knows" behavior.
  recalled_before_first_edit: (events) => {
    const firstEdit = firstIndex(events, isEdit);
    const firstRecall = firstIndex(events, isRecall);
    if (firstEdit === -1) return firstRecall !== -1;
    return firstRecall !== -1 && firstRecall < firstEdit;
  },

  // After producing a durable learning/fix, it captured it back to memory.
  captured_a_learning: (events) => events.some((e) => isCapture(e.tool)),

  // It ran a maintenance/verification step (refresh / pr check / reverify / supersede).
  ran_maintenance: (events) => events.some((e) => isMaintain(e.tool)),

  // It edited at least one file (used to detect "edited without ever recalling").
  edited_code: (events) => events.some((e) => isEdit(e.tool)),

  // It edited code without ever consulting memory first — the anti-pattern.
  edited_without_recall: (events) => {
    const firstEdit = firstIndex(events, isEdit);
    if (firstEdit === -1) return false;
    const recallBefore = events.slice(0, firstEdit).some((e) => isRecall(e.tool));
    return !recallBefore;
  },

  // A read-only/question task: it consulted memory and answered without editing.
  answered_without_editing: (events) =>
    events.some((e) => isRecall(e.tool)) && !events.some((e) => isEdit(e.tool)),

  // After changing code that memory points at, it ran a memory-maintenance step
  // (reconcile / supersede / reverify / pr check) rather than leaving memory stale.
  maintained_after_edit: (events) => {
    const firstEdit = firstIndex(events, isEdit);
    if (firstEdit === -1) return false;
    return events.slice(firstEdit + 1).some((e) => isMaintain(e.tool));
  },

  // It actually looked at the real source (didn't act blind on memory alone).
  inspected_source: (events) => events.some((e) => INSPECT_TOOLS.has(e.tool)),

  // It gave memory feedback (marked a recalled packet stale/wrong via kage_feedback).
  reported_feedback: (events) => events.some((e) => shortName(e.tool) === "kage_feedback"),

  // It reached for the specific tool the scenario expects (scenario.expectedTool,
  // a short name like "kage_risk"). Used by the broader-surface scenarios that
  // probe whether an agent naturally chooses a given diagnostic/graph tool.
  used_expected_tool: (events, scenario) =>
    Boolean(scenario && scenario.expectedTool) &&
    events.some((e) => shortName(e.tool) === scenario.expectedTool),

  // It addressed a wrong/stale memory at all — by flagging it (feedback),
  // replacing it (supersede), or writing a correction (learn). Any of these is
  // good hygiene; supersede/learn are arguably better than a bare stale flag.
  corrected_memory: (events) =>
    events.some((e) => shortName(e.tool) === "kage_feedback" || isCapture(e.tool) || isMaintain(e.tool)),
};
