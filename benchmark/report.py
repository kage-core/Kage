"""Merge official scoring + token/time metrics into an ablation report table.

Run after score.sh has produced the SWE-bench evaluation report JSON for each
arm. Looks for the harness output report `*kage-ablation-<arm>*.json` and the
`metrics_<arm>.json` written by run_ablation.py.

Usage: python report.py <run-dir>
"""

from __future__ import annotations

import glob
import json
import statistics
import sys
from pathlib import Path


def load_resolution(arm: str) -> tuple[int, int]:
    """Return (resolved, total) from the official harness report, else (0, 0)."""
    for pat in (f"*kage-ablation-{arm}*.json", f"*{arm}*report*.json"):
        for f in glob.glob(pat):
            try:
                d = json.loads(Path(f).read_text())
            except Exception:
                continue
            resolved = d.get("resolved_instances")
            total = d.get("total_instances") or d.get("submitted_instances")
            if isinstance(resolved, list):
                resolved = len(resolved)
            if resolved is not None and total:
                return int(resolved), int(total)
    return 0, 0


def arm_metrics(run_dir: Path, arm: str) -> dict:
    m = json.loads((run_dir / f"metrics_{arm}.json").read_text())
    tok = [r["prompt_tokens"] + r["completion_tokens"] for r in m]
    times = [r["wall_clock_s"] for r in m]
    resolved, total = load_resolution(arm)
    return {
        "tasks": len(m),
        "resolved": resolved,
        "total_scored": total,
        "resolution_rate": (resolved / total) if total else None,
        "total_tokens": sum(tok),
        "avg_tokens": round(statistics.mean(tok)) if tok else 0,
        "avg_time_s": round(statistics.mean(times), 1) if times else 0,
        "ctx_injected": sum(1 for r in m if r.get("context_injected")),
    }


def pct(x: float | None) -> str:
    return f"{x*100:.1f}%" if x is not None else "n/a (run score.sh)"


def main() -> None:
    run_dir = Path(sys.argv[1] if len(sys.argv) > 1 else "results/run")
    c = arm_metrics(run_dir, "control")
    k = arm_metrics(run_dir, "kage")

    def delta_tok():
        if not c["avg_tokens"]:
            return "n/a"
        d = (k["avg_tokens"] - c["avg_tokens"]) / c["avg_tokens"] * 100
        return f"{d:+.1f}%"

    lines = [
        "# Kage memory ablation — SWE-bench Verified",
        "",
        f"Tasks: {c['tasks']} | Kage context injected on {k['ctx_injected']} task(s)",
        "",
        "| Metric | control | kage | delta |",
        "|---|---|---|---|",
        f"| Resolution rate | {pct(c['resolution_rate'])} | {pct(k['resolution_rate'])} | "
        f"{'+' if (k['resolution_rate'] or 0) >= (c['resolution_rate'] or 0) else ''}"
        f"{((k['resolution_rate'] or 0) - (c['resolution_rate'] or 0))*100:.1f} pts |",
        f"| Avg tokens/task | {c['avg_tokens']:,} | {k['avg_tokens']:,} | {delta_tok()} |",
        f"| Avg time/task (s) | {c['avg_time_s']} | {k['avg_time_s']} | — |",
        "",
        "_Resolution rate is scored by the official SWE-bench harness (Docker)._",
        "_The headline result is the ablation **delta**, not absolute rate "
        "(the minimal scaffold is held identical across arms)._",
    ]
    out = run_dir / "report.md"
    out.write_text("\n".join(lines))
    print("\n".join(lines))
    print(f"\nWrote {out}")


if __name__ == "__main__":
    main()
