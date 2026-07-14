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
import { existsSync, statSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve as resolvePath, sep } from "node:path";
import { memoryRoot, observe, recall, type MemoryPacket } from "./kernel.js";
import { isRecord } from "./type-guards.js";
import {
  buildProxyDelivery,
  buildProxyReceipt,
  createUpstreamTokenCounter,
  planProxyForward,
  proxyTaskId,
  requestModel,
  type ProxyForwardPlan,
  type ProxyMode,
} from "./vnext/adapters/anthropic-proxy.js";
import { extractProviderUsage, totalPromptTokens, type ProviderUsage } from "./vnext/measurement/token-count.js";
import { openReceiptSink, type ReceiptSink } from "./vnext/measurement/receipt-sink.js";
import { spoolContextDelivery } from "./vnext/storage/delivery-spool.js";

const MEMORY_HEADER = "# Verified repo memory (injected by Kage — follow it, it is checked against this code)";
const MAX_MEMORY_CHARS = 6000; // ~1.5k tokens, so injection never dominates the prompt
const BODY_PACKET_COUNT = 2;   // top N hits inject their FULL body (memory that answers, not just points)
const MAX_BODY_CHARS = 2200;   // per-packet body cap so one long packet can't starve the next

interface ProxyStats {
  requests: number;
  injected: number;
  captured: number;
  receipts: number;
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

function systemToText(system: unknown): string {
  if (typeof system === "string") return system;
  if (Array.isArray(system)) {
    return system
      .filter((block): block is { text: string } => isRecord(block) && typeof block.text === "string")
      .map((block) => block.text)
      .join("\n");
  }
  return "";
}

// Claude Code's real system prompt (confirmed against a live 2.1.202 request, not guessed)
// includes an Environment block with a literal "Primary working directory: <path>" line.
// Reading it (never writing it — `system` stays byte-identical, see injectMemory) lets one
// proxy process serve every repo in a workspace instead of being pinned to one --project.
const WORKING_DIR_RE = /Primary working directory:\s*(\S+)/;

// Pure + exported for testing. workspaceRoot is the opt-in safety boundary: multi-repo
// routing is OFF (always defaultProjectDir) unless --workspace was passed, and even then a
// parsed candidate is only honored if it resolves to workspaceRoot itself or a real
// descendant of it — an untrusted client claiming an arbitrary "working directory" can never
// redirect the proxy to read/write memory outside the directory tree the operator chose.
export function resolveRequestProjectDir(defaultProjectDir: string, workspaceRoot: string | undefined, body: Record<string, unknown>): string {
  if (!workspaceRoot) return defaultProjectDir;
  const match = systemToText(body.system).match(WORKING_DIR_RE);
  if (!match) return defaultProjectDir;
  const candidate = resolvePath(match[1]);
  const root = resolvePath(workspaceRoot);
  if (candidate !== root && !candidate.startsWith(root + sep)) return defaultProjectDir;
  try {
    if (!statSync(candidate).isDirectory()) return defaultProjectDir;
  } catch {
    return defaultProjectDir;
  }
  return candidate;
}

// Only a POST to exactly /v1/messages is a completion we inject into. IMPORTANT: the
// sibling endpoint /v1/messages/count_tokens also starts with "/v1/messages" — injecting
// into it would pollute Claude Code's own token accounting (making it think its context is
// larger than it is) and inflate the injected counter. Match the path exactly, sans query.
export function isCompletionsRequest(method: string | undefined, url: string | undefined): boolean {
  if (method !== "POST") return false;
  const path = (url ?? "").split("?")[0];
  return path === "/v1/messages";
}

// Build the injected memory text from recall hits. The top BODY_PACKET_COUNT packets emit their
// FULL body (capped per-packet) so the agent can ANSWER from memory instead of re-reading the
// code; the rest stay as one-line title+summary pointers. Pure + exported for unit testing.
export function buildInjectedMemory(results: Array<{ packet: MemoryPacket }>): string {
  const sections: string[] = [MEMORY_HEADER];
  results.forEach((entry, index) => {
    const p = entry.packet;
    const when = (p.created_at || p.updated_at || "").slice(0, 10);
    const cited = (p.paths ?? []).slice(0, 3).join(", ");
    const provenance = [when, cited].filter(Boolean).join(" · ");
    if (index < BODY_PACKET_COUNT && p.body?.trim()) {
      sections.push(`## ${p.title}${provenance ? `\n_${provenance}_` : ""}\n\n${p.body.trim().slice(0, MAX_BODY_CHARS)}`);
    } else {
      sections.push(`- ${p.title} — ${p.summary}${provenance ? ` (${provenance})` : ""}`);
    }
  });
  return sections.join("\n\n");
}

// Pure + exported so it is unit-testable without a network: given an Anthropic Messages
// request body, return it with relevant memory appended to the last user message. No memory => no change.
export function injectMemory(projectDir: string, body: Record<string, unknown>): { body: Record<string, unknown>; injected: number } {
  const query = lastUserText(body).slice(0, 1000);
  if (!query.trim()) return { body, injected: 0 };
  const result = recall(projectDir, query, 4, false);
  if (!result.results.length) return { body, injected: 0 };
  const memoryText = buildInjectedMemory(result.results).slice(0, MAX_MEMORY_CHARS);

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

export interface ProxyOptions {
  port?: number;
  upstream?: string;
  verbose?: boolean;
  noInject?: boolean;
  workspace?: string;
  // audit (measure only, forward the client's exact bytes) vs assist (forward the transformed body).
  // Defaults to assist: that is what every existing `kage proxy` user already runs.
  mode?: ProxyMode;
  // Injectable for tests; `null` disables receipts; undefined opens the repo-local vNext store.
  receiptSink?: ReceiptSink | null;
  // Opt-in: spend one extra provider round trip per transformed request to MEASURE the token count
  // of the body that was not sent, which is the only way a receipt can honestly be "exact".
  countTokens?: boolean;
}

export function startProxy(projectDir: string, options: ProxyOptions = {}): Server {
  const port = options.port ?? 8788;
  const upstreamUrl = new URL(options.upstream ?? process.env.KAGE_PROXY_UPSTREAM ?? "https://api.anthropic.com");
  const mode: ProxyMode = options.mode ?? "assist";
  const stats: ProxyStats = { requests: 0, injected: 0, captured: 0, receipts: 0, input_tokens: 0, output_tokens: 0 };

  // One sink per repo (a --workspace proxy serves many), opened lazily and never retried: a repo
  // whose store cannot be opened (e.g. Node 18, which has no node:sqlite) records no receipts and
  // otherwise behaves exactly as before.
  const sinks = new Map<string, ReceiptSink | null>();
  function receiptSinkFor(requestProjectDir: string): ReceiptSink | null {
    if (options.receiptSink !== undefined) return options.receiptSink;
    // A repo with no .agent_memory is a plain passthrough and stays one: the proxy must not
    // create a memory tree in a directory the user never ran `kage init` in.
    if (!existsSync(memoryRoot(requestProjectDir))) return null;
    if (!sinks.has(requestProjectDir)) sinks.set(requestProjectDir, openReceiptSink(requestProjectDir));
    return sinks.get(requestProjectDir) ?? null;
  }
  // A stable per-process id, NOT the literal string "default": without this every proxy
  // run ever, across restarts, shared one observation-dedup bucket, and diverged from any
  // real Claude Code session id a hook might be recording under — so the same prompt could
  // be captured twice (once via the proxy tap, once via a UserPromptSubmit hook) with no
  // way for the hash-based dedup to ever catch it. Scoping to one id per run doesn't erase
  // that hook/proxy overlap risk (the proxy has no visibility into Claude Code's own session
  // id), but it does make repeat requests within one run correctly dedupe, and makes
  // proxy-captured observations clearly attributable in `.agent_memory/observations`.
  const sessionId = `proxy-${randomUUID()}`;

  const server = createServer((clientReq, clientRes) => {
    void handle(clientReq, clientRes);
  });
  server.on("close", () => {
    for (const sink of sinks.values()) sink?.close?.();
    sinks.clear();
  });

  // Measurement is best-effort, always. It runs after the client has already been answered, it
  // catches everything, and it can only ever fail to record — never fail a request.
  async function recordReceipt(args: {
    requestProjectDir: string;
    requestId: string;
    model: string | null;
    plan: ProxyForwardPlan;
    headers: Record<string, string | string[] | undefined>;
    usage: ProviderUsage;
    latencyMs: number;
    compositionLatencyMs: number;
  }): Promise<void> {
    try {
      // A receipt describes a TRANSFORMATION. A request Kage did not transform has nothing to
      // measure, and writing an "exact, zero savings, transformations: []" row for it would let a
      // later exact-coverage metric read as high-exact while no transformed request was ever
      // exactly measured. No transformation, no receipt.
      if (!args.plan.transformations.length) return;

      const sink = receiptSinkFor(args.requestProjectDir);
      if (!sink) return;

      // What the transformation COST is a receipt. Whether it ever reached the agent is a DELIVERY,
      // and they are different facts: in audit the candidate is measured and then thrown away, so
      // the receipt exists and the attachment does not. Spooled (not written straight to SQLite)
      // for one reason above all: the same record has to be writable by a hook whose daemon is
      // dead, and a lost measurement must never become a broken session.
      const delivery = buildProxyDelivery({
        task_id: proxyTaskId(args.requestProjectDir, sessionId),
        mode,
        plan: args.plan,
        composition_latency_ms: args.compositionLatencyMs,
      });
      if (delivery) spoolContextDelivery(args.requestProjectDir, delivery);

      // The provider's usage always describes the body that was SENT. The other body is unmeasured
      // unless we pay to measure it — and if we don't, its count stays null and the receipt is
      // honestly "partial". Nothing here ever fills the gap with an estimate.
      let measuredInputTokens: number | null = null;
      if (options.countTokens) {
        const counter = createUpstreamTokenCounter({ upstream: upstreamUrl, headers: args.headers });
        const unsent = args.plan.forwarded.equals(args.plan.original) ? args.plan.measured : args.plan.original;
        measuredInputTokens = await counter(unsent);
      }

      sink.write(buildProxyReceipt({
        task_id: proxyTaskId(args.requestProjectDir, sessionId),
        request_id: args.requestId,
        model: args.model,
        mode,
        plan: args.plan,
        forwarded_usage: args.usage,
        measured_input_tokens: measuredInputTokens,
        latency_ms: args.latencyMs,
      }));
      stats.receipts += 1;
    } catch { /* a receipt is never worth breaking a session over */ }
  }

  async function handle(clientReq: IncomingMessage, clientRes: ServerResponse): Promise<void> {
    const startedAt = Date.now();
    const raw = await readBody(clientReq);
    const isMessages = isCompletionsRequest(clientReq.method, clientReq.url);

    let injected = 0;
    let userPrompt = "";
    let model: string | null = null;
    // What bytes go on the wire, and what bytes the receipt describes. Null for anything that is
    // not an eligible, parseable POST /v1/messages — count_tokens included, which stays a strict
    // passthrough and is never measured.
    let plan: ProxyForwardPlan | null = null;
    // MEASURED, not estimated: the wall time Kage spent composing the context it would attach. It
    // is the only number that can populate the Phase A context-latency percentiles from the proxy.
    let compositionLatencyMs = 0;
    // Resolved once per request so --workspace can route each request to the right repo
    // (see resolveRequestProjectDir); with no --workspace this is always the fixed projectDir,
    // identical to pre-multi-repo behavior.
    let requestProjectDir = projectDir;
    if (isMessages && raw.length) {
      try {
        const parsed = JSON.parse(raw.toString("utf8")) as Record<string, unknown>;
        requestProjectDir = resolveRequestProjectDir(projectDir, options.workspace, parsed);
        model = requestModel(parsed);
        let transformed: Buffer | null = null;
        // --no-inject forwards the exact original bytes (diagnostic: proves whether the proxy can
        // carry subscription traffic at all, independent of any memory injection).
        if (!options.noInject && existsSync(memoryRoot(requestProjectDir))) {
          userPrompt = lastUserText(parsed);
          const composeStartedAt = performance.now();
          const result = injectMemory(requestProjectDir, parsed);
          if (result.injected) {
            injected = result.injected;
            transformed = Buffer.from(JSON.stringify(result.body), "utf8");
          }
          compositionLatencyMs = performance.now() - composeStartedAt;
        }
        // In audit mode this constructs the candidate body but forwards the ORIGINAL bytes: the
        // whole point of an audit baseline is that the audited traffic was not touched.
        plan = planProxyForward({ mode, original: raw, transformed });
      } catch { /* not JSON we understand — pass through untouched, and measure nothing */ }
    }

    const outBody = plan ? plan.forwarded : raw;

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
          const latencyMs = Date.now() - startedAt;
          stats.requests += 1;
          // In audit mode nothing was injected on the wire, so nothing may be counted as injected.
          stats.injected += mode === "assist" ? injected : 0;
          try {
            // Usage is what the PROVIDER measured for the body we actually sent. Absent usage is
            // null (unmeasured), never 0. The counter shows PROMPT tokens (uncached + cache writes
            // + cache reads) — `usage.input_tokens` alone is only the uncached remainder and would
            // under-report a cached session by an order of magnitude.
            const usage = extractProviderUsage(Buffer.concat(tap).toString("utf8"));
            stats.input_tokens += totalPromptTokens(usage) ?? 0;
            stats.output_tokens += usage.output_tokens ?? 0;
            // Capture the exchange into the memory loop — no hook required, agent-agnostic.
            if (status < 300 && userPrompt.trim()) {
              observe(requestProjectDir, { type: "user_prompt", agent: "kage-proxy", session_id: sessionId, text: userPrompt.slice(0, 4000), summary: userPrompt.slice(0, 200) });
              stats.captured += 1;
            }
            if (status < 300 && plan) {
              void recordReceipt({
                requestProjectDir,
                requestId: `${sessionId}:${stats.requests}`,
                model,
                plan,
                headers: clientReq.headers,
                usage,
                latencyMs,
                compositionLatencyMs,
              });
            }
          } catch { /* capture/measurement is best-effort; never affect the client */ }
          process.stdout.write(
            `\r  kage proxy [${mode}] · ${stats.requests} req · ${stats.injected} memories injected · ${stats.captured} captured · ` +
            `${stats.receipts} receipts · ${stats.input_tokens.toLocaleString()} in / ${stats.output_tokens.toLocaleString()} out tokens   `
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
    const hasMemory = existsSync(memoryRoot(projectDir));
    console.log(`Kage proxy listening on http://localhost:${port}  →  upstream ${upstreamUrl.origin}`);
    console.log(`\nPoint your agent at it (one line, no other setup):`);
    console.log(`  export ANTHROPIC_BASE_URL=http://localhost:${port}`);
    if (options.workspace) {
      console.log(`\nMulti-repo mode: routing each request to its Claude Code "Primary working directory" under ${options.workspace}.`);
      console.log(`Falls back to ${projectDir} for clients that don't report one (e.g. aider, codex) or report one outside the workspace.`);
    } else {
      console.log(`\nThen use Claude Code normally in ${projectDir}.`);
      console.log(hasMemory
        ? `Kage will inject verified memory outbound and capture the exchange inbound. Ctrl-C to stop.`
        : `No .agent_memory here yet — run \`kage init\` first, or the proxy is a plain passthrough. Ctrl-C to stop.`);
    }
    console.log(mode === "audit"
      ? `\nMode: audit — your request bytes are forwarded unchanged; Kage only measures what an injected request would have cost.`
      : `\nMode: assist — Kage appends verified memory to the last user turn and records what that cost.`);
  });
  return server;
}
