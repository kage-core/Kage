"""Fixed minimal agent scaffold for the Kage ablation.

A bash-only tool-use loop (mini-swe-agent style) that operates inside a task's
git checkout. This scaffold is held IDENTICAL across both ablation arms; the
only thing that differs between arms is the optional `extra_context` block that
the Kage memory layer injects. Keeping the scaffold minimal minimizes confounds:
the measured delta is attributable to memory, not to scaffold cleverness.
"""

from __future__ import annotations

import os
import subprocess
import time
from dataclasses import dataclass, field

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


def _build_prompt(problem_statement: str, extra_context: str | None) -> str:
    text = f"# Issue to fix\n\n{problem_statement}\n"
    if extra_context:
        text += (
            "\n# Repository memory (recalled by Kage — may speed up the fix)\n\n"
            f"{extra_context}\n"
        )
    return text


def run_task(
    *,
    repo_dir: str,
    problem_statement: str,
    model: str,
    provider: str | None = None,
    max_steps: int = 40,
    extra_context: str | None = None,
) -> TaskResult:
    """Drive the fixed scaffold on one task. Returns patch + usage metrics.

    The provider/model is just the agent's driver — the ablation's independent
    variable is `extra_context` (Kage on vs off), so any provider is valid.
    `extra_context` is empty for `control`, a Kage context block for `kage`.
    """
    provider = (provider or os.environ.get("PROVIDER", "openai")).lower()
    runner = _run_openai if provider == "openai" else _run_anthropic
    result = TaskResult(patch="")
    t0 = time.time()
    runner(
        repo_dir=repo_dir, model=model, max_steps=max_steps,
        user_text=_build_prompt(problem_statement, extra_context), result=result,
    )
    result.wall_clock_s = round(time.time() - t0, 2)
    # Capture only source-code changes — exclude .agent_memory (Kage writes
    # memory packets into the checkout) and any other non-code artifacts.
    result.patch = _run(
        "git add -A -- ':!.agent_memory' ':!*.pyc' ':!__pycache__' "
        "&& git diff --cached -- ':!.agent_memory'",
        cwd=repo_dir, timeout=60,
    )
    return result


def _run_anthropic(*, repo_dir, model, max_steps, user_text, result):
    from anthropic import Anthropic

    client = Anthropic()
    system = [{"type": "text", "text": SYSTEM.format(repo_dir=repo_dir),
               "cache_control": {"type": "ephemeral"}}]
    messages = [{"role": "user", "content": user_text}]
    for step in range(max_steps):
        resp = client.messages.create(
            model=model, max_tokens=4096, system=system, tools=[BASH_TOOL], messages=messages
        )
        u = resp.usage
        result.prompt_tokens += u.input_tokens
        result.completion_tokens += u.output_tokens
        result.cache_read_tokens += getattr(u, "cache_read_input_tokens", 0) or 0
        result.steps = step + 1
        messages.append({"role": "assistant", "content": resp.content})
        tool_uses = [b for b in resp.content if b.type == "tool_use"]
        if not tool_uses:
            result.stopped_reason = "model_stopped"
            return
        tool_results = []
        for tu in tool_uses:
            out = _run((tu.input or {}).get("command", ""), cwd=repo_dir)
            tool_results.append({"type": "tool_result", "tool_use_id": tu.id, "content": out})
        messages.append({"role": "user", "content": tool_results})
    result.stopped_reason = "max_steps"


_OPENAI_TOOL = {"type": "function", "function": {
    "name": "bash", "description": BASH_TOOL["description"],
    "parameters": BASH_TOOL["input_schema"]}}


def _run_openai(*, repo_dir, model, max_steps, user_text, result):
    from openai import OpenAI, RateLimitError

    client = OpenAI()
    messages = [
        {"role": "system", "content": SYSTEM.format(repo_dir=repo_dir)},
        {"role": "user", "content": user_text},
    ]
    for step in range(max_steps):
        # Retry on 429 rate-limit with exponential backoff (max 3 retries).
        for attempt in range(4):
            try:
                resp = client.chat.completions.create(
                    model=model, messages=messages, tools=[_OPENAI_TOOL], max_tokens=4096
                )
                break
            except RateLimitError as e:
                if attempt == 3:
                    raise
                wait = 2 ** attempt * 30  # 30s, 60s, 120s
                print(f"  rate-limited, waiting {wait}s (attempt {attempt+1}/3)…")
                time.sleep(wait)
        u = resp.usage
        if u:
            result.prompt_tokens += u.prompt_tokens
            result.completion_tokens += u.completion_tokens
        result.steps = step + 1
        msg = resp.choices[0].message
        messages.append(msg.model_dump(exclude_none=True))
        if not msg.tool_calls:
            result.stopped_reason = "model_stopped"
            return
        for tc in msg.tool_calls:
            import json as _json
            try:
                cmd = _json.loads(tc.function.arguments or "{}").get("command", "")
            except _json.JSONDecodeError:
                cmd = ""
            out = _run(cmd, cwd=repo_dir)
            messages.append({"role": "tool", "tool_call_id": tc.id, "content": out})
    result.stopped_reason = "max_steps"
