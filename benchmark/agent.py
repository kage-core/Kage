"""Fixed minimal agent scaffold for the Kage ablation.

A bash-only tool-use loop (mini-swe-agent style) that operates inside a task's
git checkout. This scaffold is held IDENTICAL across both ablation arms; the
only thing that differs between arms is the optional `extra_context` block that
the Kage memory layer injects. Keeping the scaffold minimal minimizes confounds:
the measured delta is attributable to memory, not to scaffold cleverness.
"""

from __future__ import annotations

import subprocess
import time
from dataclasses import dataclass, field

from anthropic import Anthropic

SYSTEM = """You are an autonomous software engineer fixing a real GitHub issue.

You are working inside a git checkout at {repo_dir}. Use the `bash` tool to
explore the code, make edits, and run the project's tests. Make the smallest
change that fixes the issue. Do NOT edit test files. When you are confident the
fix is complete and tests pass, stop and reply with the single token DONE.

Constraints:
- All commands run from {repo_dir}.
- Edit files in place (e.g. with `python - <<'PY' ... PY`, `sed`, or writing
  files). Do not create new top-level files unless necessary for the fix.
"""

BASH_TOOL = {
    "name": "bash",
    "description": "Run a shell command inside the task's git checkout and return its stdout/stderr.",
    "input_schema": {
        "type": "object",
        "properties": {"command": {"type": "string"}},
        "required": ["command"],
    },
}


@dataclass
class TaskResult:
    patch: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    cache_read_tokens: int = 0
    steps: int = 0
    wall_clock_s: float = 0.0
    stopped_reason: str = ""
    transcript: list = field(default_factory=list)


def _run(cmd: str, cwd: str, timeout: int = 120) -> str:
    try:
        p = subprocess.run(
            cmd, shell=True, cwd=cwd, capture_output=True, text=True, timeout=timeout
        )
        out = (p.stdout or "") + (p.stderr or "")
        return out[-8000:] if len(out) > 8000 else out
    except subprocess.TimeoutExpired:
        return f"<command timed out after {timeout}s>"


def run_task(
    *,
    repo_dir: str,
    problem_statement: str,
    model: str,
    max_steps: int = 40,
    extra_context: str | None = None,
    client: Anthropic | None = None,
) -> TaskResult:
    """Drive the fixed scaffold on one task. Returns patch + usage metrics.

    `extra_context` is the ONLY arm-dependent input: empty for `control`,
    a Kage-recalled context block for the `kage` arm.
    """
    client = client or Anthropic()
    system = [
        {
            "type": "text",
            "text": SYSTEM.format(repo_dir=repo_dir),
            "cache_control": {"type": "ephemeral"},
        }
    ]

    user_text = f"# Issue to fix\n\n{problem_statement}\n"
    if extra_context:
        user_text += (
            "\n# Repository memory (recalled by Kage — may speed up the fix)\n\n"
            f"{extra_context}\n"
        )

    messages = [{"role": "user", "content": user_text}]
    result = TaskResult(patch="")
    t0 = time.time()

    for step in range(max_steps):
        resp = client.messages.create(
            model=model,
            max_tokens=4096,
            system=system,
            tools=[BASH_TOOL],
            messages=messages,
        )
        u = resp.usage
        result.prompt_tokens += u.input_tokens
        result.completion_tokens += u.output_tokens
        result.cache_read_tokens += getattr(u, "cache_read_input_tokens", 0) or 0
        result.steps = step + 1

        messages.append({"role": "assistant", "content": resp.content})

        tool_uses = [b for b in resp.content if b.type == "tool_use"]
        texts = [b.text for b in resp.content if b.type == "text"]
        result.transcript.append({"step": step, "text": " ".join(texts)[:500]})

        if not tool_uses:
            result.stopped_reason = "model_stopped"
            break

        tool_results = []
        for tu in tool_uses:
            cmd = (tu.input or {}).get("command", "")
            output = _run(cmd, cwd=repo_dir)
            tool_results.append(
                {"type": "tool_result", "tool_use_id": tu.id, "content": output}
            )
        messages.append({"role": "user", "content": tool_results})
    else:
        result.stopped_reason = "max_steps"

    result.wall_clock_s = round(time.time() - t0, 2)
    # The prediction is the working-tree diff produced by the agent.
    result.patch = _run("git add -A && git diff --cached", cwd=repo_dir, timeout=60)
    return result
