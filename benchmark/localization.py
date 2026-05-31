"""Model-free retrieval-localization benchmark.

Measures the part of the value chain Kage actually owns: given a real GitHub
issue, does Kage's code search surface the file the fix needs to touch? Ground
truth = the file(s) edited by the SWE-bench Verified gold patch (tests
excluded). No model and no Docker required.

Per task: checkout the issue's base_commit, build Kage's code graph, query it
with the issue text, and record the rank at which the gold file appears.

Usage: python localization.py <tasks.json> <repo_checkout_dir>
  tasks.json: [{instance_id, base_commit, problem_statement, gold_files}, ...]
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

KAGE = ["node", str(Path(__file__).resolve().parents[1] / "mcp" / "dist" / "cli.js")]


def sh(args, cwd=None, timeout=300):
    return subprocess.run(args, cwd=cwd, capture_output=True, text=True, timeout=timeout)


def kage_json(sub_args, cwd):
    p = sh(KAGE + sub_args, cwd=None)
    if p.returncode != 0 or not p.stdout.strip():
        return None
    try:
        return json.loads(p.stdout)
    except json.JSONDecodeError:
        return None


def predicted_files(repo_dir: str, query: str) -> list[str]:
    """Ranked, de-duplicated file paths Kage surfaces for the query."""
    files: list[str] = []

    def add(path):
        if path and path not in files:
            files.append(path)

    cg = kage_json(["code-graph", query, "--project", repo_dir, "--json"], repo_dir)
    if isinstance(cg, dict):
        # symbols and files come back in relevance order, each carrying a path.
        for sym in cg.get("symbols", []) or []:
            add(sym.get("path"))
        for f in cg.get("files", []) or []:
            add(f.get("path"))
    return files


def norm(p: str) -> str:
    return p.lstrip("./").replace("src/", "", 1)


def rank_of(gold: list[str], preds: list[str]) -> int | None:
    gold_n = {norm(g) for g in gold}
    for i, p in enumerate(preds, 1):
        if norm(p) in gold_n:
            return i
    return None


def main() -> None:
    tasks = json.loads(Path(sys.argv[1]).read_text())
    repo_dir = sys.argv[2]
    rows = []
    for t in tasks:
        sh(["git", "checkout", "--quiet", "--force", t["base_commit"]], cwd=repo_dir)
        sh(["git", "clean", "-qfdx"], cwd=repo_dir)
        sh(KAGE + ["index", "--project", repo_dir], cwd=repo_dir)
        query = " ".join(t["problem_statement"].split())[:400]
        preds = predicted_files(repo_dir, query)
        r = rank_of(t["gold_files"], preds)
        rows.append({"id": t["instance_id"], "gold": t["gold_files"], "rank": r,
                     "top5": preds[:5]})
        print(f"{t['instance_id']:24s} gold={t['gold_files']} rank={r} top5={preds[:5]}")

    n = len(rows)
    def hit(k): return sum(1 for r in rows if r["rank"] and r["rank"] <= k)
    print("\n=== Localization on psf/requests (SWE-bench Verified) ===")
    print(f"tasks: {n}")
    for k in (1, 3, 5, 10):
        print(f"  hit@{k}: {hit(k)}/{n} ({hit(k)/n*100:.0f}%)")
    ranked = [r['rank'] for r in rows if r['rank']]
    if ranked:
        mrr = sum(1/r for r in ranked) / n
        print(f"  MRR: {mrr:.3f}")
    Path("results").mkdir(exist_ok=True)
    Path("results/localization.json").write_text(json.dumps(rows, indent=2))


if __name__ == "__main__":
    main()
