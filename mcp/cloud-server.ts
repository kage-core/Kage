// Kage Cloud v1 server — the real, running implementation of the design in docs/CLOUD.md.
//
// WHAT THIS IS: a minimal, self-hostable packet exchange for team namespaces, matching the
// "verification stays client-side" principle: the server stores packets + author identity
// and enforces a review gate (a submitter can never approve their own packet), but it never
// re-derives trust. Every packet a client pulls is re-verified against ITS OWN checkout by
// the existing kernel.ts recall machinery (teamRecallEntries -> recallStaleReason) before it
// is ever served to an agent — the server never sees a line of the team's source code.
//
// WHAT THIS IS NOT (yet): deployed anywhere public. It has no TLS, no rate limiting, and no
// multi-team isolation beyond bearer tokens — treat it like any other self-hosted internal
// tool (put it behind your own reverse proxy / VPN / auth layer before exposing it). Zero new
// dependencies: node:http + node:sqlite, consistent with the rest of this package.

import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { randomBytes, createHash, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { validatePacket, type MemoryPacket } from "./kernel.js";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tokens (
  token_hash TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  label TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS packets (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  status TEXT NOT NULL,
  packet_json TEXT NOT NULL,
  submitted_by_hash TEXT NOT NULL,
  submitted_by_label TEXT NOT NULL,
  approved_by_label TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateToken(): string {
  return `kct_${randomBytes(24).toString("base64url")}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

interface AuthedRequest {
  teamId: string;
  tokenHash: string;
  label: string;
}

export function openCloudDb(dbPath: string): DatabaseSync {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(SCHEMA);
  return db;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(payload) });
  res.end(payload);
}

function sendHtml(res: ServerResponse, status: number, html: string): void {
  res.writeHead(status, { "content-type": "text/html; charset=utf-8", "content-length": Buffer.byteLength(html) });
  res.end(html);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c as Buffer));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw) as Record<string, unknown>);
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
    req.on("error", reject);
  });
}

function authenticate(db: DatabaseSync, req: IncomingMessage, teamId: string): AuthedRequest | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  if (!token) return null;
  const tokenHash = hashToken(token);
  const row = db.prepare("SELECT team_id, label FROM tokens WHERE token_hash = ?").get(tokenHash) as
    | { team_id: string; label: string }
    | undefined;
  if (!row || row.team_id !== teamId) return null;
  return { teamId, tokenHash, label: row.label };
}

interface DashboardPacketRow {
  packet_json: string;
  submitted_by_label: string;
  approved_by_label: string | null;
  updated_at: string;
}

// Server-rendered — no build step, no frontend framework, consistent with the rest of this
// package's zero-dependency ethos. The token travels in the URL query string, same trust
// boundary as passing it on the CLI: fine for a self-hosted internal tool behind your own
// VPN/reverse proxy, not something to expose publicly without adding real auth in front of it.
function renderDashboard(teamName: string, teamId: string, token: string, pending: DashboardPacketRow[], approved: DashboardPacketRow[], label: string): string {
  const packetRow = (row: DashboardPacketRow, actions: boolean): string => {
    const packet = JSON.parse(row.packet_json) as MemoryPacket;
    const meta = actions
      ? `submitted by <b>${escapeHtml(row.submitted_by_label)}</b>`
      : `submitted by <b>${escapeHtml(row.submitted_by_label)}</b> · approved by <b>${escapeHtml(row.approved_by_label ?? "?")}</b>`;
    return `
      <div class="packet" data-id="${escapeHtml(packet.id)}">
        <div class="packet-head">
          <span class="type">${escapeHtml(packet.type)}</span>
          <span class="title">${escapeHtml(packet.title)}</span>
        </div>
        <div class="summary">${escapeHtml(packet.summary || packet.body.slice(0, 160))}</div>
        <div class="meta">${meta}</div>
        ${actions ? `
        <div class="actions">
          <button class="approve" onclick="review('${escapeHtml(packet.id)}','approve')">Approve</button>
          <button class="reject" onclick="review('${escapeHtml(packet.id)}','reject')">Reject</button>
        </div>` : ""}
        <div class="error" id="err-${escapeHtml(packet.id).replace(/[^a-z0-9]/gi, "_")}"></div>
      </div>`;
  };

  return `<!doctype html><html><head><meta charset="utf-8"><title>Kage Cloud — ${escapeHtml(teamName)}</title>
<style>
  :root { color-scheme: dark; }
  body { background: #0d0d0f; color: #e8e6e3; font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 32px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .sub { color: #8a8a8f; font-size: 13px; margin-bottom: 28px; }
  .you { color: #7cc4ff; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.04em; color: #8a8a8f; border-bottom: 1px solid #232326; padding-bottom: 8px; margin: 28px 0 12px; }
  .packet { background: #16161a; border: 1px solid #232326; border-radius: 8px; padding: 14px 16px; margin-bottom: 10px; }
  .packet-head { display: flex; gap: 8px; align-items: baseline; margin-bottom: 4px; }
  .type { font-size: 11px; text-transform: uppercase; color: #9b8cff; background: #1e1a2e; padding: 2px 6px; border-radius: 4px; }
  .title { font-weight: 600; }
  .summary { color: #b7b5b0; font-size: 13px; margin: 6px 0; }
  .meta { color: #8a8a8f; font-size: 12px; }
  .meta b { color: #cfcdc9; font-weight: 600; }
  .actions { margin-top: 10px; display: flex; gap: 8px; }
  button { border: none; border-radius: 6px; padding: 6px 14px; font-size: 13px; cursor: pointer; }
  .approve { background: #1f7a4d; color: #fff; }
  .reject { background: #232326; color: #cfcdc9; }
  .empty { color: #6b6b70; font-size: 13px; font-style: italic; }
  .error { color: #ff8c8c; font-size: 12px; margin-top: 8px; }
</style></head>
<body>
  <h1>Kage Cloud · ${escapeHtml(teamName)}</h1>
  <div class="sub">signed in as <span class="you">${escapeHtml(label)}</span> · team ${escapeHtml(teamId)}</div>

  <h2>Pending review (${pending.length})</h2>
  ${pending.length ? pending.map((r) => packetRow(r, true)).join("") : `<div class="empty">Nothing pending.</div>`}

  <h2>Approved (${approved.length})</h2>
  ${approved.length ? approved.map((r) => packetRow(r, false)).join("") : `<div class="empty">Nothing approved yet.</div>`}

  <script>
    const TOKEN = ${JSON.stringify(token)};
    const TEAM = ${JSON.stringify(teamId)};
    async function review(packetId, action) {
      const errBox = document.getElementById("err-" + packetId.replace(/[^a-z0-9]/gi, "_"));
      errBox.textContent = "";
      const res = await fetch(\`/v1/teams/\${TEAM}/packets/\${encodeURIComponent(packetId)}/\${action}\`, {
        method: "POST",
        headers: { authorization: "Bearer " + TOKEN },
      });
      if (res.ok) { window.location.reload(); return; }
      const body = await res.json().catch(() => ({}));
      errBox.textContent = body.message || body.error || ("failed: " + res.status);
    }
  </script>
</body></html>`;
}

export function startCloudServer(options: { port?: number; dbPath?: string; verbose?: boolean } = {}): Server {
  const port = options.port ?? 8790;
  const dbPath = options.dbPath ?? process.env.KAGE_CLOUD_DB_PATH ?? "./kage-cloud.db";
  const db = openCloudDb(dbPath);

  const server = createServer((req, res) => {
    void handle(req, res).catch((error) => {
      sendJson(res, 500, { error: "internal_error", message: error instanceof Error ? error.message : String(error) });
    });
  });

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? "/", "http://localhost");
    const parts = url.pathname.split("/").filter(Boolean);
    if (options.verbose) console.log(`[cloud] ${req.method} ${url.pathname}`);

    if (req.method === "GET" && url.pathname === "/v1/health") {
      return sendJson(res, 200, { ok: true });
    }

    // GET /dashboard?team=<id>&token=<token> — a real, clickable view of the review gate.
    // Server-rendered, no separate frontend build; the API endpoints above remain the
    // source of truth (the page's Approve/Reject buttons call them, they don't bypass them).
    if (req.method === "GET" && url.pathname === "/dashboard") {
      const teamId = url.searchParams.get("team");
      const token = url.searchParams.get("token");
      if (!teamId || !token) {
        return sendHtml(res, 200, `<!doctype html><html><body style="background:#0d0d0f;color:#e8e6e3;font-family:sans-serif;padding:32px">
          <h1>Kage Cloud dashboard</h1>
          <form>
            <p>Team ID <input name="team" style="width:320px"></p>
            <p>Token <input name="token" style="width:320px"></p>
            <button>Open</button>
          </form>
        </body></html>`);
      }
      // Browser navigation never sends an Authorization header, so the token travels in the
      // query string instead — looked up against the SAME token table authenticate() uses.
      const tokenRow = db.prepare("SELECT team_id, label FROM tokens WHERE token_hash = ?").get(hashToken(token)) as { team_id: string; label: string } | undefined;
      if (!tokenRow || tokenRow.team_id !== teamId) return sendHtml(res, 401, `<body style="background:#0d0d0f;color:#ff8c8c;font-family:sans-serif;padding:32px">Invalid team/token.</body>`);
      const label = tokenRow.label;
      const team = db.prepare("SELECT name FROM teams WHERE id = ?").get(teamId) as { name: string } | undefined;
      if (!team) return sendHtml(res, 404, `<body style="background:#0d0d0f;color:#ff8c8c;font-family:sans-serif;padding:32px">Team not found.</body>`);
      const pending = db.prepare("SELECT packet_json, submitted_by_label, approved_by_label, updated_at FROM packets WHERE team_id = ? AND status = 'pending' ORDER BY updated_at DESC").all(teamId) as unknown as DashboardPacketRow[];
      const approved = db.prepare("SELECT packet_json, submitted_by_label, approved_by_label, updated_at FROM packets WHERE team_id = ? AND status = 'approved' ORDER BY updated_at DESC").all(teamId) as unknown as DashboardPacketRow[];
      return sendHtml(res, 200, renderDashboard(team.name, teamId, token, pending, approved, label));
    }

    // POST /v1/teams — create a team + its first (owner) token. No auth: this IS the
    // signup step. Everything downstream requires a token minted here (or by /tokens).
    if (req.method === "POST" && parts.length === 2 && parts[0] === "v1" && parts[1] === "teams") {
      const body = await readJsonBody(req);
      const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : null;
      if (!name) return sendJson(res, 400, { error: "invalid_request", message: "name is required" });
      const teamId = randomUUID();
      const token = generateToken();
      db.prepare("INSERT INTO teams (id, name, created_at) VALUES (?, ?, ?)").run(teamId, name, nowIso());
      db.prepare("INSERT INTO tokens (token_hash, team_id, label, created_at) VALUES (?, ?, ?, ?)").run(hashToken(token), teamId, "owner", nowIso());
      return sendJson(res, 201, { team_id: teamId, name, token });
    }

    // POST /v1/teams/:id/tokens — issue an additional token for an existing teammate.
    // Requires an existing valid token for the SAME team (you can't mint access to a team
    // you aren't already a member of).
    if (req.method === "POST" && parts.length === 4 && parts[0] === "v1" && parts[1] === "teams" && parts[3] === "tokens") {
      const teamId = parts[2];
      const auth = authenticate(db, req, teamId);
      if (!auth) return sendJson(res, 401, { error: "unauthorized" });
      const body = await readJsonBody(req);
      const label = typeof body.label === "string" && body.label.trim() ? body.label.trim() : `member-${randomUUID().slice(0, 8)}`;
      const token = generateToken();
      db.prepare("INSERT INTO tokens (token_hash, team_id, label, created_at) VALUES (?, ?, ?, ?)").run(hashToken(token), teamId, label, nowIso());
      return sendJson(res, 201, { token, label });
    }

    // POST /v1/teams/:id/packets — submit a packet. Always lands PENDING, regardless of
    // the packet's own `status` field (a client cannot submit its way to pre-approved).
    if (req.method === "POST" && parts.length === 4 && parts[0] === "v1" && parts[1] === "teams" && parts[3] === "packets") {
      const teamId = parts[2];
      const auth = authenticate(db, req, teamId);
      if (!auth) return sendJson(res, 401, { error: "unauthorized" });
      const body = await readJsonBody(req);
      const packet = body.packet as Partial<MemoryPacket> | undefined;
      if (!packet || typeof packet !== "object") return sendJson(res, 400, { error: "invalid_request", message: "packet is required" });
      const validation = validatePacket(packet, "packet");
      if (!validation.ok) return sendJson(res, 400, { error: "invalid_packet", errors: validation.errors });
      const stamped: MemoryPacket = { ...(packet as MemoryPacket), status: "pending", scope: "org" };
      const now = nowIso();
      // Upsert, not insert: a packet's id is deterministic (derived from title+type+repo), so
      // resubmitting after a rejection — or pushing updated content for an already-approved
      // packet — must not 500 on a primary-key collision. Either case correctly resets to
      // PENDING with fresh content and clears any prior approval: previously-approved content
      // being silently replaced without a new review would defeat the review gate entirely.
      db.prepare(
        `INSERT INTO packets (id, team_id, status, packet_json, submitted_by_hash, submitted_by_label, approved_by_label, created_at, updated_at)
         VALUES (?, ?, 'pending', ?, ?, ?, NULL, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           status = 'pending', packet_json = excluded.packet_json, submitted_by_hash = excluded.submitted_by_hash,
           submitted_by_label = excluded.submitted_by_label, approved_by_label = NULL, updated_at = excluded.updated_at`
      ).run(stamped.id, teamId, JSON.stringify(stamped), auth.tokenHash, auth.label, now, now);
      return sendJson(res, 201, { id: stamped.id, status: "pending" });
    }

    // GET /v1/teams/:id/packets?status=approved|pending|rejected (default: approved) — list.
    if (req.method === "GET" && parts.length === 4 && parts[0] === "v1" && parts[1] === "teams" && parts[3] === "packets") {
      const teamId = parts[2];
      const auth = authenticate(db, req, teamId);
      if (!auth) return sendJson(res, 401, { error: "unauthorized" });
      const status = url.searchParams.get("status") ?? "approved";
      const rows = db.prepare("SELECT packet_json, submitted_by_label, approved_by_label, created_at, updated_at FROM packets WHERE team_id = ? AND status = ? ORDER BY updated_at DESC").all(teamId, status) as Array<{
        packet_json: string;
        submitted_by_label: string;
        approved_by_label: string | null;
        created_at: string;
        updated_at: string;
      }>;
      return sendJson(res, 200, {
        status,
        packets: rows.map((row) => ({
          packet: JSON.parse(row.packet_json),
          submitted_by: row.submitted_by_label,
          approved_by: row.approved_by_label,
          created_at: row.created_at,
          updated_at: row.updated_at,
        })),
      });
    }

    // POST /v1/teams/:id/packets/:packetId/approve|reject — the review gate. Approve is
    // blocked when the approving token is the same one that submitted the packet: a real
    // gate, not cosmetic — a team member cannot promote their own claim into trusted team
    // memory unwitnessed.
    if (req.method === "POST" && parts.length === 6 && parts[0] === "v1" && parts[1] === "teams" && parts[3] === "packets" && (parts[5] === "approve" || parts[5] === "reject")) {
      const teamId = parts[2];
      // Kage packet IDs contain colons (e.g. "repo:...:decision:..."), which the client
      // percent-encodes; url.pathname does NOT auto-decode, so this must be undone here or
      // every lookup misses and every approve/reject 404s.
      const packetId = decodeURIComponent(parts[4]);
      const action = parts[5];
      const auth = authenticate(db, req, teamId);
      if (!auth) return sendJson(res, 401, { error: "unauthorized" });
      const row = db.prepare("SELECT status, submitted_by_hash, packet_json FROM packets WHERE id = ? AND team_id = ?").get(packetId, teamId) as
        | { status: string; submitted_by_hash: string; packet_json: string }
        | undefined;
      if (!row) return sendJson(res, 404, { error: "not_found" });
      if (row.status !== "pending") return sendJson(res, 409, { error: "not_pending", status: row.status });
      if (action === "approve" && row.submitted_by_hash === auth.tokenHash) {
        return sendJson(res, 403, { error: "self_approval_blocked", message: "a submitter cannot approve their own packet — have a teammate review it" });
      }
      const nextStatus = action === "approve" ? "approved" : "rejected";
      const packet = { ...JSON.parse(row.packet_json), status: nextStatus };
      db.prepare("UPDATE packets SET status = ?, packet_json = ?, approved_by_label = ?, updated_at = ? WHERE id = ?").run(
        nextStatus,
        JSON.stringify(packet),
        action === "approve" ? auth.label : null,
        nowIso(),
        packetId
      );
      return sendJson(res, 200, { id: packetId, status: nextStatus });
    }

    sendJson(res, 404, { error: "not_found" });
  }

  server.listen(port, () => {
    console.log(`Kage Cloud server listening on http://localhost:${port}  (db: ${dbPath})`);
    console.log(`This is a self-hosted server — put it behind your own reverse proxy/VPN before exposing it publicly.`);
  });
  server.on("close", () => db.close());
  return server;
}
