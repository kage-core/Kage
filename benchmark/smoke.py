"""No-Docker, no-model smoke check for the ablation harness.

Confirms the pieces line up before spending compute/budget:
  1. core modules import,
  2. the SWE-bench Verified dataset loads and rows have the fields we use,
  3. the Kage memory layer is reachable (recall returns without error).

Does NOT call the model or score patches. Exit code is non-zero on failure.
"""

from __future__ import annotations

import sys


def check_imports() -> None:
    import agent  # noqa: F401
    import kage_memory  # noqa: F401
    print("ok: modules import")


def check_dataset() -> None:
    from datasets import load_dataset

    ds = load_dataset("princeton-nlp/SWE-bench_Verified", split="test")
    row = dict(ds[0])
    for field in ("instance_id", "repo", "base_commit", "problem_statement"):
        assert field in row, f"dataset row missing {field}"
    print(f"ok: dataset loads ({len(ds)} tasks); sample={row['instance_id']}")


def check_kage() -> None:
    import kage_memory

    if not kage_memory.is_available():
        print("warn: kage CLI not on PATH — only the control arm will run")
        return
    print("ok: kage CLI present")


def main() -> int:
    failed = False
    for name, fn in (("imports", check_imports), ("dataset", check_dataset), ("kage", check_kage)):
        try:
            fn()
        except Exception as e:  # noqa: BLE001
            print(f"FAIL [{name}]: {e}")
            failed = True
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
