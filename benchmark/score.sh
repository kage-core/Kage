#!/usr/bin/env bash
# Score an arm's predictions with the OFFICIAL SWE-bench harness (needs Docker).
# Usage: ./score.sh <arm> <run-dir>   e.g.  ./score.sh kage results/run1
set -euo pipefail

ARM="${1:?usage: score.sh <arm> <run-dir>}"
RUN_DIR="${2:?usage: score.sh <arm> <run-dir>}"
PREDS="${RUN_DIR}/preds_${ARM}.jsonl"

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: Docker is required by the official SWE-bench evaluation harness." >&2
  exit 1
fi

# Resolution rate, per-instance results, and logs are written by the harness.
python -m swebench.harness.run_evaluation \
  --dataset_name princeton-nlp/SWE-bench_Verified \
  --predictions_path "${PREDS}" \
  --run_id "kage-ablation-${ARM}" \
  --max_workers 4 \
  --cache_level instance

echo "Done. See *.json report and logs/run_evaluation/kage-ablation-${ARM}/"
