#!/usr/bin/env bash
#
# Commit the sync job's regenerated `.agent_memory/` and push it, reconciling with any push that
# lands concurrently — WITHOUT ever deleting a memory packet a concurrent commit added.
#
# The bug this exists to prevent (and its regression test, scripts/kage-sync-commit.test.mjs):
# the sync job runs on every push, so its own push frequently loses the race to another commit
# (a `kage learn` memory write, a PR merge). The naive reconciliation — `git reset --soft
# origin/<branch>` then `git add .agent_memory/` — re-stages THIS job's OLDER working tree, which
# never contained the packet the winning commit just added. `git add` then stages that packet as a
# DELETION, and the sync commit silently eats freshly-captured memory. For a memory product that is
# the worst possible failure. The `git checkout origin/<branch> -- .agent_memory/packets/` below
# restores the branch's packets before re-staging, so a concurrent packet can never be deleted;
# derived artifacts (graph/, indexes/) and this job's own newly proposed packets are still committed.
#
# Idempotent and non-fatal: git identity and the working-tree changes are the caller's; this only
# commits + pushes. On repeated push failure it warns and exits 0 (the next sync run reconciles).

set -uo pipefail

BRANCH="${1:-${GITHUB_REF_NAME:-master}}"
MSG="chore: kage sync — rebuild graphs and update memory [skip ci]"

git add .agent_memory/
if git diff --cached --quiet; then
  echo "No memory changes to commit"
  exit 0
fi
git commit -m "$MSG"

for attempt in 1 2 3 4 5; do
  if git push; then
    exit 0
  fi
  echo "push rejected (concurrent push) — reconciling, retry ${attempt}/5"
  git fetch origin "$BRANCH"
  git reset --soft "origin/$BRANCH"
  # CRITICAL — never delete a packet a concurrent commit added. Restore the branch's packets into the
  # working tree before re-staging. A packet this job's older tree lacks would otherwise be staged as
  # a deletion by `git add`. This job's own new packets (absent from the branch) are left untouched.
  git checkout "origin/$BRANCH" -- .agent_memory/packets/ 2>/dev/null || true
  git add .agent_memory/
  if git diff --cached --quiet; then
    echo "already up to date"
    exit 0
  fi
  git commit -m "$MSG"
  sleep $((attempt * 2))
done

echo "::warning::kage sync could not push after 5 retries; the next sync run will reconcile"
exit 0
