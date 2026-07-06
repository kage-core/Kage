// Kage proxy — a Headroom-style drop-in between a coding agent and the Anthropic API.
//
// The point is the FORM FACTOR: `export ANTHROPIC_BASE_URL=http://localhost:8788` and any
// Anthropic-API client (Claude Code, Codex CLI, aider, ...) flows through Kage with zero
// per-agent install and zero code changes. This first slice does two things and nothing
// else, so it can be a SAFE passthrough:
//   1. outbound: inject relevant verified repo memory into the last user message (NOT `system` —
//                subscription/OAuth tokens reject a modified system prompt with a 429)
//   2. inbound:  tap the (streamed) response to record the exchange into the memory loop
// It never rewrites the model's output and preserves streaming byte-for-byte. Token
// COMPRESSION (the Headroom savings number) is deliberately a later layer — this slice
// proves the plumbing + the "agent gets smarter across sessions with no setup" magic.

import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";
import { existsSync } from "node:fs";
import { memoryRoot, observe, recall } from "./kernel.js";

const MEMORY_HEADER = "# Verified repo memory (injected by Kage — follow it, it is checked against this code)";
const MAX_MEMORY_CHARS = 6000; // ~1.5k tokens, so injection never dominates the prompt

interface ProxyStats {
  requests: number;
  injected: number;
  captured: number;
  input_tokens: number;
  output_tokens: number;
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk as Buffer));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", () => resolve(Buffer.concat(chunks)));
  });
}

function lastUserText(body: Record<string, unknown>): string {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i] as Record<string, unknown> | undefined;
    if (!message || message.role !== "user") continue;
    const content = message.content;
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      const text = content
        .filter((block): block is { type: string; text: string } => isRecord(block) && block.type === "text" && typeof block.text === "string")
        .map((block) => block.text)
        .join("\n");
      if (text) return text;
    }
  }
  return "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Pure + exported so it is unit-testable without a network: given an Anthropic Messages
// request body, return it with relevant memory appended to the last user message. No memory => no change.
export function injectMemory(projectDir: string, body: Record<string, unknown>): { body: Record<string, unknown>; injected: number } {
  const query = lastUserText(body).slice(0, 1000);
  if (!query.trim()) return { body, injected: 0 };
  const result = recall(projectDir, query, 4, false);
  if (!result.results.length) return { body, injected: 0 };
  const memoryText = `${MEMORY_HEADER}\n\n${result.context_block}`.slice(0, MAX_MEMORY_CHARS);

  // Inject into the LAST USER MESSAGE, never the system prompt. Subscription/OAuth tokens
  // (Claude Code on a plan, not an API key) require the system prompt's first block to be the
  // exact Claude Code identity string; prepending to it makes Anthropic reject the request
  // (observed: 429 rate_limit_error on /v1/messages?beta=true, every request). Appending to the
  // user turn keeps `system` byte-identical and works for both OAuth and API-key requests.
  const messages = Array.isArray(body.messages) ? [...body.messages] : [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (!isRecord(message) || message.role !== "user") continue;
    if (typeof message.content === "string") {
      messages[i] = { ...message, content: `${message.content}\n\n${memoryText}` };
    } else if (Array.isArray(message.content)) {
      messages[i] = { ...message, content: [...message.content, { type: "text", text: memoryText }] };
    } else {
      messages[i] = { ...message, content: memoryText };
    }
    return { body: { ...body, messages }, injected: result.results.length };
  }
  return { body, injected: 0 };
}

// Best-effort usage + assistant text from either a non-streamed JSON body or a streamed SSE
// transcript. Used only for the receipt and capture — never to alter what the client sees.
function extractUsageAndText(raw: string): { input: number; output: number; text: string } {
  const trimmed = raw.trimStart();
  if (trimmed.startsWith("{")) {
    try {
      const json = JSON.parse(raw) as Record<string, any>;
      const usage = json.usage ?? {};
      const text = Array.isArray(json.content)
        ? json.content.filter((b: any) => b?.type === "text").map((b: any) => b.text).join("")
        : "";
      return { input: Number(usage.input_tokens ?? 0), output: Number(usage.output_tokens ?? 0), text };
    } catch { /* fall through to SSE parse */ }
  }
  let input = 0;
  let output = 0;
  let text = "";
  for (const line of raw.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const event = JSON.parse(payload) as Record<string, any>;
      if (event.type === "message_start" && event.message?.usage) input = Number(event.message.usage.input_tokens ?? input);
      if (event.usage?.output_tokens != null) output = Number(event.usage.output_tokens);
      if (event.type === "content_block_delta" && event.delta?.type === "text_delta") text += event.delta.text ?? "";
    } catch { /* skip malformed event */ }
  }
  return { input, output, text };
}

export function startProxy(projectDir: string, options: { port?: number; upstream?: string; verbose?: boolean; noInject?: boolean } = {}): Server {
  const port = options.port ?? 8788;
  const upstreamUrl = new URL(options.upstream ?? process.env.KAGE_PROXY_UPSTREAM ?? "https://api.anthropic.com");
  const stats: ProxyStats = { requests: 0, injected: 0, captured: 0, input_tokens: 0, output_tokens: 0 };
  const hasMemory = existsSync(memoryRoot(projectDir));

  const server = createServer((clientReq, clientRes) => {
    void handle(clientReq, clientRes);
  });

  async function handle(clientReq: IncomingMessage, clientRes: ServerResponse): Promise<void> {
    const raw = await readBody(clientReq);
    const isMessages = clientReq.method === "POST" && (clientReq.url ?? "").startsWith("/v1/messages");

    let outBody = raw;
    let injected = 0;
    let userPrompt = "";
    // --no-inject forwards the exact original bytes (diagnostic: proves whether the proxy can
    // carry subscription traffic at all, independent of any memory injection).
    if (isMessages && hasMemory && raw.length && !options.noInject) {
      try {
        const parsed = JSON.parse(raw.toString("utf8")) as Record<string, unknown>;
        userPrompt = lastUserText(parsed);
        const result = injectMemory(projectDir, parsed);
        injected = result.injected;
        outBody = Buffer.from(JSON.stringify(result.body), "utf8");
      } catch { /* not JSON we understand — pass through untouched */ }
    }

    const headers: Record<string, string | string[]> = { ...clientReq.headers } as Record<string, string | string[]>;
    delete headers.host;
    delete headers["content-length"];
    headers["accept-encoding"] = "identity"; // read the body plaintext for the receipt; upstream returns identity
    headers["content-length"] = String(outBody.length);
    if (isMessages) headers["host"] = upstreamUrl.host;

    const doRequest = upstreamUrl.protocol === "http:" ? httpRequest : httpsRequest;
    const upstreamReq = doRequest(
      {
        protocol: upstreamUrl.protocol,
        hostname: upstreamUrl.hostname,
        port: upstreamUrl.port || (upstreamUrl.protocol === "http:" ? 80 : 443),
        path: clientReq.url,
        method: clientReq.method,
        headers: { ...headers, host: upstreamUrl.host },
      },
      (upstreamRes) => {
        // Strip hop-by-hop headers — Node frames the client response itself. Forwarding
        // upstream's transfer-encoding/connection while we manage the write stream corrupts
        // the framing so the client never sees end-of-stream.
        const passHeaders: Record<string, string | string[]> = {};
        for (const [key, value] of Object.entries(upstreamRes.headers)) {
          if (value === undefined) continue;
          if (["transfer-encoding", "connection", "keep-alive", "content-length", "content-encoding"].includes(key.toLowerCase())) continue;
          passHeaders[key] = value;
        }
        clientRes.writeHead(upstreamRes.statusCode ?? 502, passHeaders);
        const status = upstreamRes.statusCode ?? 0;
        const tap: Buffer[] = [];
        upstreamRes.on("data", (chunk: Buffer) => {
          clientRes.write(chunk); // passthrough, unmodified, preserves streaming
          // Tap for the receipt/capture and — always — for surfacing error bodies.
          if (isMessages || status >= 300) tap.push(chunk);
        });
        upstreamRes.on("end", () => {
          clientRes.end();
          // Diagnostics: every request when --verbose; every non-2xx always. This is what
          // tells us, on subscription auth, whether the request even reached upstream and
          // how it was answered (401/403 = auth/header issue, not a Kage bug).
          if (options.verbose || status >= 300) {
            const body = status >= 300 ? Buffer.concat(tap).toString("utf8").slice(0, 300).replace(/\s+/g, " ") : "";
            console.log(`\n[proxy] ${clientReq.method} ${clientReq.url} -> ${status}${body ? `  ${body}` : ""}`);
          }
          if (!isMessages) return;
          stats.requests += 1;
          stats.injected += injected;
          try {
            const { input, output } = extractUsageAndText(Buffer.concat(tap).toString("utf8"));
            stats.input_tokens += input;
            stats.output_tokens += output;
            // Capture the exchange into the memory loop — no hook required, agent-agnostic.
            if (status < 300 && userPrompt.trim()) {
              observe(projectDir, { type: "user_prompt", agent: "kage-proxy", text: userPrompt.slice(0, 4000), summary: userPrompt.slice(0, 200) });
              stats.captured += 1;
            }
          } catch { /* receipt/capture is best-effort; never affect the client */ }
          process.stdout.write(
            `\r  kage proxy · ${stats.requests} req · ${stats.injected} memories injected · ${stats.captured} captured · ` +
            `${stats.input_tokens.toLocaleString()} in / ${stats.output_tokens.toLocaleString()} out tokens   `
          );
        });
      }
    );
    upstreamReq.on("error", (err) => {
      console.error(`\n[proxy] upstream error for ${clientReq.method} ${clientReq.url}: ${err.message}`);
      if (!clientRes.headersSent) clientRes.writeHead(502, { "content-type": "application/json" });
      clientRes.end(JSON.stringify({ type: "error", error: { type: "kage_proxy_error", message: "upstream request failed" } }));
    });
    upstreamReq.end(outBody);
  }

  server.listen(port, () => {
    console.log(`Kage proxy listening on http://localhost:${port}  →  upstream ${upstreamUrl.origin}`);
    console.log(`\nPoint your agent at it (one line, no other setup):`);
    console.log(`  export ANTHROPIC_BASE_URL=http://localhost:${port}`);
    console.log(`\nThen use Claude Code normally in ${projectDir}.`);
    console.log(hasMemory
      ? `Kage will inject verified memory outbound and capture the exchange inbound. Ctrl-C to stop.`
      : `No .agent_memory here yet — run \`kage init\` first, or the proxy is a plain passthrough. Ctrl-C to stop.`);
  });
  return server;
}
