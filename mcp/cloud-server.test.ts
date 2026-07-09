import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { type Server, request as httpRequest } from "node:http";
import { capture, recall } from "./kernel.js";
import { startCloudServer } from "./cloud-server.js";
import { cloudCreateTeam, cloudInvite, cloudPush, cloudPull, cloudList, cloudReview } from "./cloud-client.js";

function getText(url: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(url, (res) => {
      let body = "";
      res.on("data", (c) => { body += c; });
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on("error", reject);
    req.end();
  });
}

function tempProject(): string {
  const dir = mkdtempSync(join(tmpdir(), "kage-cloud-test-"));
  mkdirSync(join(dir, ".agent_memory", "packets"), { recursive: true });
  return dir;
}

async function withServer<T>(fn: (url: string) => Promise<T>): Promise<T> {
  const dbPath = join(mkdtempSync(join(tmpdir(), "kage-cloud-db-")), "test.db");
  const server: Server = startCloudServer({ port: 0, dbPath });
  await new Promise<void>((resolve) => server.on("listening", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  try {
    return await fn(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
  }
}

test("kage cloud: full team lifecycle — create, push, self-approval blocked, real approve, pull, recall", async () => {
  await withServer(async (url) => {
    const team = await cloudCreateTeam(url, "Payments Team");
    assert.equal(team.name, "Payments Team");
    assert.match(team.token, /^kct_/);

    const submitter = tempProject();
    capture({
      projectDir: submitter,
      title: "Refunds must go through the ledger, never direct DB writes",
      body: "processRefund must route through the ledger service so refund events are auditable. Verified by: npm test.",
      type: "decision",
      allowMissingPaths: true,
    });

    const pushed = await cloudPush(url, team.team_id, team.token, submitter);
    assert.equal(pushed.submitted, 1);
    assert.deepEqual(pushed.failed, []);

    const pending = await cloudList(url, team.team_id, team.token, "pending");
    assert.equal(pending.length, 1);
    assert.equal(pending[0].submitted_by, "owner");
    const packetId = pending[0].packet.id;

    // The review gate must be REAL: the same token that submitted cannot approve it.
    await assert.rejects(() => cloudReview(url, team.team_id, team.token, packetId, "approve"), /self_approval_blocked|403/);

    // A second, genuinely different teammate CAN approve.
    const reviewer = await cloudInvite(url, team.team_id, team.token, "reviewer");
    assert.equal(reviewer.label, "reviewer");
    const approval = await cloudReview(url, team.team_id, reviewer.token, packetId, "approve");
    assert.equal(approval.status, "approved");

    const approved = await cloudList(url, team.team_id, team.token, "approved");
    assert.equal(approved.length, 1);
    assert.equal(approved[0].approved_by, "reviewer");

    // A DIFFERENT repo (a second machine/checkout) pulls the team's approved memory.
    const puller = tempProject();
    mkdirSync(join(puller, "src"), { recursive: true });
    const pullResult = await cloudPull(url, team.team_id, team.token, puller);
    assert.equal(pullResult.pulled, 1);

    // It must actually surface in recall — pulled memory is real memory, not a data dump.
    const recalled = recall(puller, "does processRefund write to the database directly?", 5, false);
    assert.equal((recalled.team ?? []).length, 1);
    assert.match(recalled.context_block, /## Team Memory/);
    assert.match(recalled.context_block, /Refunds must go through the ledger/);
  });
});

test("kage cloud: unauthenticated requests are rejected, invalid packets are rejected", async () => {
  await withServer(async (url) => {
    const team = await cloudCreateTeam(url, "Solo Team");
    const project = tempProject();
    capture({ projectDir: project, title: "Valid packet", body: "A real decision. Verified by: npm test.", type: "decision", allowMissingPaths: true });

    // Wrong token entirely: push collects per-packet failures rather than throwing (it may
    // be pushing many packets), so assert on the collected failure, not a rejection.
    const pushWithBadToken = await cloudPush(url, team.team_id, "kct_not-a-real-token", project);
    assert.equal(pushWithBadToken.submitted, 0);
    assert.equal(pushWithBadToken.failed.length, 1);

    // list() with a bad token must 401, not silently return an empty list.
    await assert.rejects(() => cloudList(url, team.team_id, "kct_not-a-real-token", "pending"), /401/);
  });
});

test("kage cloud: a stale pull is re-verified locally, not trusted from the server's say-so", async () => {
  await withServer(async (url) => {
    const team = await cloudCreateTeam(url, "Verify Team");
    const submitter = tempProject();
    mkdirSync(join(submitter, "src"), { recursive: true });
    const { writeFileSync } = await import("node:fs");
    writeFileSync(join(submitter, "src", "auth.ts"), "export function login() { return true; }\n", "utf8");
    capture({
      projectDir: submitter,
      title: "login() requires 2FA for admin accounts",
      body: "login() must enforce 2FA when the account role is admin. Verified by: npm test.",
      type: "decision",
      paths: ["src/auth.ts"],
    });
    const pushed = await cloudPush(url, team.team_id, team.token, submitter);
    assert.equal(pushed.submitted, 1);
    const pending = await cloudList(url, team.team_id, team.token, "pending");
    await cloudReview(url, team.team_id, team.token, pending[0].packet.id, "reject");
    // Re-submit and approve via a second token so it's actually approved for the next step.
    const pushed2 = await cloudPush(url, team.team_id, team.token, submitter);
    assert.equal(pushed2.submitted, 1);
    const pending2 = await cloudList(url, team.team_id, team.token, "pending");
    const reviewer = await cloudInvite(url, team.team_id, team.token, "reviewer2");
    await cloudReview(url, team.team_id, reviewer.token, pending2[0].packet.id, "approve");

    // Puller has NO src/auth.ts at all — the cited path doesn't exist in this checkout.
    const puller = tempProject();
    await cloudPull(url, team.team_id, team.token, puller);
    const recalled = recall(puller, "does login require 2fa for admins?", 5, false);
    // Must NOT surface: the server approved it, but this checkout can't verify it, so it's withheld.
    assert.equal((recalled.team ?? []).length, 0);
  });
});

test("kage cloud: GET /dashboard renders pending + approved packets and rejects a bad token", async () => {
  await withServer(async (url) => {
    const team = await cloudCreateTeam(url, "Dashboard Team");
    const project = tempProject();
    capture({ projectDir: project, title: "Widget uses shadow DOM", body: "The widget renders inside a shadow root. Verified by: npm test.", type: "decision", allowMissingPaths: true });
    await cloudPush(url, team.team_id, team.token, project);
    const pending = await cloudList(url, team.team_id, team.token, "pending");
    const reviewer = await cloudInvite(url, team.team_id, team.token, "reviewer");
    await cloudReview(url, team.team_id, reviewer.token, pending[0].packet.id, "approve");

    const page = await getText(`${url}/dashboard?team=${team.team_id}&token=${encodeURIComponent(team.token)}`);
    assert.equal(page.status, 200);
    assert.match(page.body, /Dashboard Team/);
    assert.match(page.body, /Widget uses shadow DOM/);
    // A reviewer must see the FULL claim, not just the title — the whole point of showing
    // more than a summary is that "approve" is a trust decision, not a rubber stamp.
    assert.match(page.body, /The widget renders inside a shadow root\. Verified by: npm test\./);
    // No cited paths on this packet: the reviewer must be warned it can't be re-verified,
    // not left to assume citations exist because the card looks the same either way.
    assert.match(page.body, /No cited paths/);
    assert.match(page.body, /Approved \(1\)/);
    assert.match(page.body, /Pending review \(0\)/);

    const noParams = await getText(`${url}/dashboard`);
    assert.equal(noParams.status, 200);
    assert.match(noParams.body, /Team ID/);

    const badToken = await getText(`${url}/dashboard?team=${team.team_id}&token=kct_not-real`);
    assert.equal(badToken.status, 401);
  });
});

test("kage cloud: dashboard shows cited paths for a grounded packet, not just its title", async () => {
  await withServer(async (url) => {
    const team = await cloudCreateTeam(url, "Grounded Team");
    const project = tempProject();
    mkdirSync(join(project, "src"), { recursive: true });
    const { writeFileSync } = await import("node:fs");
    writeFileSync(join(project, "src", "checkout.ts"), "export function checkout() { return true; }\n", "utf8");
    capture({
      projectDir: project,
      title: "checkout() validates cart total server-side",
      body: "checkout() must re-validate the cart total server-side, never trust the client-sent amount. Verified by: npm test.",
      type: "decision",
      paths: ["src/checkout.ts"],
    });
    await cloudPush(url, team.team_id, team.token, project);
    const page = await getText(`${url}/dashboard?team=${team.team_id}&token=${encodeURIComponent(team.token)}`);
    assert.equal(page.status, 200);
    assert.match(page.body, /Cites:/);
    assert.match(page.body, /src\/checkout\.ts/);
    assert.doesNotMatch(page.body, /No cited paths/);
  });
});
