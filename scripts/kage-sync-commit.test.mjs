import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Regression guard for a data-loss bug: the kage-sync job runs on every push, so its own push loses
// the race to a concurrent commit (a `kage learn` memory write, a PR merge) all the time. The naive
// reconciliation deleted the concurrent packet — the sync job silently ate freshly-captured memory.
// scripts/kage-sync-commit.sh reconciles WITHOUT ever deleting a packet a concurrent commit added.
// This test reproduces the exact race and asserts survival.

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "kage-sync-commit.sh");
const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: "t",
  GIT_AUTHOR_EMAIL: "t@t",
  GIT_COMMITTER_NAME: "t",
  GIT_COMMITTER_EMAIL: "t@t",
};

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, env: GIT_ENV, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function writePacket(repo, name, body) {
  mkdirSync(join(repo, ".agent_memory", "packets"), { recursive: true });
  writeFileSync(join(repo, ".agent_memory", "packets", name), body, "utf8");
}

test("kage-sync reconciliation never deletes a packet a concurrent commit added", () => {
  const root = mkdtempSync(join(tmpdir(), "kage-sync-race-"));
  try {
    const remote = join(root, "remote.git");
    git(root, "init", "-q", "--bare", "-b", "master", remote);

    // Base state on master: one packet + a derived graph artifact.
    const A = join(root, "A");
    git(root, "clone", "-q", remote, A);
    writePacket(A, "base.md", "base packet");
    mkdirSync(join(A, ".agent_memory"), { recursive: true });
    writeFileSync(join(A, ".agent_memory", "graph.json"), '{"nodes":1}', "utf8");
    git(A, "add", "-A");
    git(A, "commit", "-qm", "init");
    git(A, "push", "-q", "origin", "master");

    const B = join(root, "B");
    git(root, "clone", "-q", remote, B);

    // Sync job A regenerates the derived graph AND proposes its own new packet — left UNCOMMITTED in
    // the working tree, exactly as the workflow leaves them when it invokes the commit script.
    writeFileSync(join(A, ".agent_memory", "graph.json"), '{"nodes":2}', "utf8");
    writePacket(A, "sync-proposed.md", "a packet the sync job itself captured");

    // Concurrently, a memory packet lands on master FIRST (the packet Kage must never lose).
    writePacket(B, "gotcha-vite.md", "VITE-BASE GOTCHA — high value, captured moments ago");
    git(B, "add", "-A");
    git(B, "commit", "-qm", "memory: capture vite gotcha [skip ci]");
    git(B, "push", "-q", "origin", "master");

    // Sync job A's push will be rejected; the script must reconcile without eating the concurrent packet.
    execFileSync("bash", [SCRIPT, "master"], { cwd: A, env: GIT_ENV, stdio: ["ignore", "pipe", "pipe"] });

    // What actually landed on the remote.
    const landed = git(remote, "ls-tree", "-r", "--name-only", "master");
    assert.ok(
      landed.includes(".agent_memory/packets/gotcha-vite.md"),
      "the concurrently-added packet MUST survive the sync reconciliation (it was silently deleted before the fix)",
    );
    assert.ok(
      landed.includes(".agent_memory/packets/sync-proposed.md"),
      "the sync job's own newly proposed packet must also survive",
    );
    assert.ok(landed.includes(".agent_memory/packets/base.md"), "the pre-existing packet must survive");
    // The sync's actual job — the regenerated graph — still lands.
    assert.match(git(remote, "show", "master:.agent_memory/graph.json"), /"nodes":\s*2/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
