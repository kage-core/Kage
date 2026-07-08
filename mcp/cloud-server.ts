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
