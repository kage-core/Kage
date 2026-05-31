"""Orchestrator for the Kage memory ablation on SWE-bench Verified.

Runs the fixed agent scaffold over a task set twice — once with no memory
(`control`) and once with Kage memory (`kage`) — and writes SWE-bench-format
predictions plus per-task token/wall-clock metrics for each arm. Patch *scoring*
(resolution rate) is done separately by the official harness via `score.sh`,
which needs Docker.

Usage:
  python run_ablation.py --arm control --limit 5 --out results/run1
  python run_ablation.py --arm kage    --limit 5 --out results/run1
  python run_ablation.py --arm both    --full    --out results/full

Env:
  PROVIDER  openai (default) | anthropic
  MODEL     overrides the default model for the provider
  OPENAI_API_KEY / ANTHROPIC_API_KEY  per provider
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
from collections import defaultdict
from pathlib import Path

import agent
import kage_memory

PROVIDER = os.environ.get("PROVIDER", "openai").lower()
DEFAULT_MODEL = {"openai": "gpt-4o", "anthropic": "claude-sonnet-4-6"}
MODEL = os.environ.get("MODEL") or DEFAULT_MODEL.get(PROVIDER, "gpt-4o")
DATASET = "princeton-nlp/SWE-bench_Verified"
MODEL_NAME_TAG = {"control": "kage-ablation-control", "kage": "kage-ablation-kage"}


def load_tasks(limit: int | None, ids_file: str | None) -> list[dict]:
    from datasets import load_dataset

    ds = load_dataset(DATASET, split="test")
    rows = [dict(r) for r in ds]
    if ids_file and Path(ids_file).exists():
        wanted = {
            ln.strip() for ln in Path(ids_file).read_text().splitlines()
            if ln.strip() and not ln.startswith("#") and ln.strip() != "AUTO"
        }
        if wanted:
            rows = [r for r in rows if r["instance_id"] in wanted]
    # Group by repo, deterministic order, so continual-learning can accumulate.
    rows.sort(key=lambda r: (r["repo"], r["instance_id"]))
    if limit:
        # Keep whole repos together when sampling.
        by_repo: dict[str, list] = defaultdict(list)
        for r in rows:
            by_repo[r["repo"]].append(r)
        out: list[dict] = []
        for repo in sorted(by_repo):
            for r in by_repo[repo]:
                if len(out) >= limit:
                    return out
                out.append(r)
        return out
    return rows


def prepare_checkout(task: dict, cache_root: Path, work_root: Path) -> str:
    """Clone the repo at base_commit into an isolated per-task working dir."""
    repo = task["repo"]
    cache = cache_root / repo.replace("/", "__")
    if not cache.exists():
        subprocess.run(
            ["git", "clone", "--quiet", f"https://github.com/{repo}.git", str(cache)],
            check=True,
        )
    work = work_root / task["instance_id"]
    if work.exists():
        shutil.rmtree(work)
    shutil.copytree(cache, work)
    subprocess.run(["git", "fetch", "--quiet", "--all"], cwd=work)
    subprocess.run(["git", "checkout", "--quiet", "--force", task["base_commit"]], cwd=work, check=True)
    subprocess.run(["git", "clean", "-qfdx"], cwd=work)
    return str(work)


def run_arm(arm: str, tasks: list[dict], out_dir: Path) -> None:
    cache_root = out_dir / "_repo_cache"
    work_root = out_dir / f"_work_{arm}"
    cache_root.mkdir(parents=True, exist_ok=True)
    work_root.mkdir(parents=True, exist_ok=True)

    mem = None
    if arm == "kage":
        if not kage_memory.is_available():
            raise SystemExit("kage CLI not on PATH; install @kage-core/kage-graph-mcp")
        mem = kage_memory.KageMemory(str(out_dir / "kage_store"))

    preds_path = out_dir / f"preds_{arm}.jsonl"
    metrics_path = out_dir / f"metrics_{arm}.json"
    metrics: list[dict] = []

    with preds_path.open("w") as preds_f:
        for i, task in enumerate(tasks, 1):
            iid = task["instance_id"]
            print(f"[{arm}] {i}/{len(tasks)} {iid}")
            repo_dir = prepare_checkout(task, cache_root, work_root)

            extra = None
            if mem is not None:
                mem.restore(task["repo"], repo_dir)
                extra = mem.recall(repo_dir, task["problem_statement"][:600]) or None

            res = agent.run_task(
                repo_dir=repo_dir,
                problem_statement=task["problem_statement"],
                model=MODEL,
                provider=PROVIDER,
                extra_context=extra,
            )

            preds_f.write(json.dumps({
                "instance_id": iid,
                "model_name_or_path": MODEL_NAME_TAG[arm],
                "model_patch": res.patch,
            }) + "\n")
            preds_f.flush()

            metrics.append({
                "instance_id": iid,
                "repo": task["repo"],
                "prompt_tokens": res.prompt_tokens,
                "completion_tokens": res.completion_tokens,
                "cache_read_tokens": res.cache_read_tokens,
                "steps": res.steps,
                "wall_clock_s": res.wall_clock_s,
                "stopped_reason": res.stopped_reason,
                "context_injected": bool(extra),
            })

            if mem is not None:
                # Capture an outcome learning, then persist for later same-repo tasks.
                mem.capture(
                    repo_dir,
                    learning=f"Worked issue {iid}. Patch touched: "
                             f"{res.patch[:300] or '(no diff)'}",
                    title=f"swe task {iid}",
                    verified_by="swe-bench ablation run",
                )
                mem.persist(task["repo"], repo_dir)

            metrics_path.write_text(json.dumps(metrics, indent=2))

    print(f"[{arm}] wrote {preds_path} and {metrics_path}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--arm", choices=["control", "kage", "both"], default="both")
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--full", action="store_true")
    ap.add_argument("--ids-file", default="pilot_tasks.txt")
    ap.add_argument("--out", default="results/run")
    args = ap.parse_args()

    key = "OPENAI_API_KEY" if PROVIDER == "openai" else "ANTHROPIC_API_KEY"
    if not os.environ.get(key):
        raise SystemExit(f"{key} not set (PROVIDER={PROVIDER})")

    limit = None if args.full else (args.limit or 5)
    tasks = load_tasks(limit, None if args.full else args.ids_file)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    print(f"{len(tasks)} tasks | model={MODEL} | arm={args.arm} | out={out_dir}")

    arms = ["control", "kage"] if args.arm == "both" else [args.arm]
    for arm in arms:
        run_arm(arm, tasks, out_dir)


if __name__ == "__main__":
    main()
