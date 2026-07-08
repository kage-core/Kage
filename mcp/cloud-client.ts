// Thin HTTP client for a Kage Cloud server (mcp/cloud-server.ts), used by `kage cloud *`.
// Deliberately dumb: it moves packets and lets the server's review gate decide who approves
// what. All TRUST decisions happen locally — see teamRecallEntries in kernel.ts, which
// re-verifies every pulled packet's citations against the checkout it's running in before an
// agent ever sees it.

import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { loadApprovedPackets, writeTeamPacket, clearTeamPackets, type MemoryPacket } from "./kernel.js";

interface CloudResponse<T> {
  status: number;
  body: T;
}

function call<T = Record<string, unknown>>(serverUrl: string, method: string, path: string, token: string | undefined, payload?: unknown): Promise<CloudResponse<T>> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, serverUrl);
    const doRequest = url.protocol === "http:" ? httpRequest : httpsRequest;
    const body = payload !== undefined ? JSON.stringify(payload) : undefined;
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (token) headers.authorization = `Bearer ${token}`;
    if (body !== undefined) headers["content-length"] = String(Buffer.byteLength(body));
    const req = doRequest(
      { protocol: url.protocol, hostname: url.hostname, port: url.port || (url.protocol === "http:" ? 80 : 443), path: url.pathname + url.search, method, headers },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c as Buffer));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          try {
            resolve({ status: res.statusCode ?? 0, body: raw ? (JSON.parse(raw) as T) : ({} as T) });
          } catch {
            reject(new Error(`Kage Cloud returned non-JSON response (status ${res.statusCode}): ${raw.slice(0, 200)}`));
          }
        });
      }
    );
    req.on("error", reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
}

export async function cloudCreateTeam(serverUrl: string, name: string): Promise<{ team_id: string; name: string; token: string }> {
  const { status, body } = await call<{ team_id: string; name: string; token: string; error?: string; message?: string }>(serverUrl, "POST", "/v1/teams", undefined, { name });
  if (status !== 201) throw new Error(`kage cloud create-team failed (${status}): ${body.message ?? body.error ?? "unknown error"}`);
  return body;
}

export async function cloudInvite(serverUrl: string, teamId: string, token: string, label: string): Promise<{ token: string; label: string }> {
  const { status, body } = await call<{ token: string; label: string; error?: string; message?: string }>(serverUrl, "POST", `/v1/teams/${teamId}/tokens`, token, { label });
  if (status !== 201) throw new Error(`kage cloud invite failed (${status}): ${body.message ?? body.error ?? "unknown error"}`);
  return body;
}

export async function cloudPush(serverUrl: string, teamId: string, token: string, projectDir: string): Promise<{ submitted: number; failed: Array<{ title: string; reason: string }> }> {
  const packets = loadApprovedPackets(projectDir);
  const failed: Array<{ title: string; reason: string }> = [];
  let submitted = 0;
  for (const packet of packets) {
    const { status, body } = await call<{ id?: string; error?: string; message?: string; errors?: string[] }>(serverUrl, "POST", `/v1/teams/${teamId}/packets`, token, { packet });
    if (status === 201) submitted += 1;
    else failed.push({ title: packet.title, reason: body.message ?? (body.errors ?? []).join("; ") ?? body.error ?? `status ${status}` });
  }
  return { submitted, failed };
}

export async function cloudPull(serverUrl: string, teamId: string, token: string, projectDir: string): Promise<{ pulled: number }> {
  const { status, body } = await call<{ packets: Array<{ packet: MemoryPacket }>; error?: string; message?: string }>(serverUrl, "GET", `/v1/teams/${teamId}/packets?status=approved`, token);
  if (status !== 200) throw new Error(`kage cloud pull failed (${status}): ${body.message ?? body.error ?? "unknown error"}`);
  clearTeamPackets(projectDir);
  for (const entry of body.packets) writeTeamPacket(projectDir, entry.packet);
  return { pulled: body.packets.length };
}

export async function cloudList(serverUrl: string, teamId: string, token: string, status: string): Promise<Array<{ packet: MemoryPacket; submitted_by: string; approved_by: string | null }>> {
  const { status: httpStatus, body } = await call<{ packets: Array<{ packet: MemoryPacket; submitted_by: string; approved_by: string | null }>; error?: string; message?: string }>(
    serverUrl, "GET", `/v1/teams/${teamId}/packets?status=${encodeURIComponent(status)}`, token
  );
  if (httpStatus !== 200) throw new Error(`kage cloud list failed (${httpStatus}): ${body.message ?? body.error ?? "unknown error"}`);
  return body.packets;
}

export async function cloudReview(serverUrl: string, teamId: string, token: string, packetId: string, action: "approve" | "reject"): Promise<{ status: string }> {
  const { status: httpStatus, body } = await call<{ status?: string; error?: string; message?: string }>(serverUrl, "POST", `/v1/teams/${teamId}/packets/${encodeURIComponent(packetId)}/${action}`, token);
  if (httpStatus !== 200) throw new Error(`kage cloud ${action} failed (${httpStatus}): ${body.message ?? body.error ?? "unknown error"}`);
  return { status: body.status ?? "unknown" };
}
