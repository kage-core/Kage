"""The swappable memory layer for the ablation.

This is the ONLY component that differs between the `control` and `kage` arms.

Continual-learning mechanism (SWE-Bench-CL style): each SWE-bench task is a
fresh checkout, but we keep a persistent `.agent_memory` per *repository* and
restore it into each checkout before the task and persist it back after. So a
learning captured on `django` task N is available to `django` task N+1 — which
is exactly the "accumulate / transfer across tasks" axis Kage claims to win.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
from pathlib import Path

KAGE = shutil.which("kage") or "kage"


def _kage(args: list[str], cwd: str | None = None, timeout: int = 180) -> subprocess.CompletedProcess:
    return subprocess.run(
        [KAGE, *args], cwd=cwd, capture_output=True, text=True, timeout=timeout
    )


class KageMemory:
    """Manages persistent per-repo Kage memory across the run."""

    def __init__(self, store_root: str):
        # store_root/<repo>/.agent_memory persists across that repo's tasks.
        self.store_root = Path(store_root)
        self.store_root.mkdir(parents=True, exist_ok=True)

    def _repo_store(self, repo: str) -> Path:
        d = self.store_root / repo.replace("/", "__")
        d.mkdir(parents=True, exist_ok=True)
        return d

    def restore(self, repo: str, repo_dir: str) -> None:
        """Copy persisted memory for `repo` into the fresh checkout, then index."""
        src = self._repo_store(repo) / ".agent_memory"
        dst = Path(repo_dir) / ".agent_memory"
        if src.exists():
            if dst.exists():
                shutil.rmtree(dst)
            shutil.copytree(src, dst)
        # (Re)build the code graph/index for this checkout so recall is grounded.
        _kage(["index", "--project", repo_dir])

    def recall(self, repo_dir: str, query: str) -> str:
        """Return an injectable context block, or '' if nothing useful."""
        p = _kage(["recall", query, "--project", repo_dir, "--json"])
        if p.returncode != 0 or not p.stdout.strip():
            return ""
        try:
            data = json.loads(p.stdout)
        except json.JSONDecodeError:
            return p.stdout.strip()[:4000]
        # The CLI returns an agent-ready context block plus ranked summaries;
        # prefer the prebuilt block when present.
        block = data.get("context_block") or data.get("context") or ""
        if not block and isinstance(data.get("results"), list):
            rows = []
            for r in data["results"][:5]:
                p = r.get("packet", r)
                rows.append(f"- {p.get('title','')}: {p.get('summary','')}")
            block = "\n".join(rows)
        return (block or "").strip()[:4000]

    def capture(self, repo_dir: str, *, learning: str, title: str, verified_by: str,
                paths: list[str] | None = None) -> None:
        """Persist a learning from the just-finished task."""
        args = [
            "learn", "--project", repo_dir,
            "--learning", learning, "--title", title,
            "--type", "bug_fix", "--verified-by", verified_by,
        ]
        if paths:
            args += ["--paths", ",".join(paths)]
        _kage(args)

    def persist(self, repo: str, repo_dir: str) -> None:
        """Copy memory back out of the checkout into the persistent per-repo store."""
        src = Path(repo_dir) / ".agent_memory"
        dst = self._repo_store(repo) / ".agent_memory"
        if src.exists():
            if dst.exists():
                shutil.rmtree(dst)
            shutil.copytree(src, dst)


def is_available() -> bool:
    return shutil.which("kage") is not None or os.path.exists(KAGE)
