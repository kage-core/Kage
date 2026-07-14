// Phase A gate — the one test that has to be true for Phase B to start.
//
// It is deliberately NOT a unit test and it mocks nothing that matters: it starts the real local
// runtime (real HTTP, real token, real SQLite), drives the real adapter client against it, asks the
// real context source for a capsule, records a real context delivery, and puts a real
// `kage proxy --mode audit` between a real HTTP client and a fake PROVIDER (the only stand-in, and
// only because Anthropic will not be billed by CI).
//
// The five assertions the plan names are the phase's whole claim:
//   agent_request_unchanged === true   audit forwarded the client's exact bytes
//   receipts.length === 1              the transformed candidate was measured, once
//   receipts[0].mode === "audit"       and measured as audit, not as an assist
//   daemon_outage_result "failed_open" a dead runtime cannot break an agent session
//   mcp_calls_required === 0           none of this needed an MCP tool call
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createServer, request as httpRequest, type Server } from "node:http";
import { mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

if (!process.env.KAGE_HOME) process.env.KAGE_HOME = mkdtempSync(join(tmpdir(), "kage-vnext-gate-home-"));

import { capture } from "../kernel.js";
import { startProxy } from "../proxy.js";
import { renderContextBlock } from "./adapters/claude.js";
import {
  CLAUDE_ADAPTER_ID,
  claudeHandshake,
  claudeHookToEvent,
  claudeRepositoryIdentity,
} from "./adapters/claude.js";
import {
  attachAdapterContext,
  requestAdapterContext,
  sendAdapterEvent,
  sendAdapterHandshake,
} from "./adapters/client.js";
import { validateEvidenceEvent, validateHandshake, type TransformationReceipt } from "./protocol/index.js";
import { drainDeliverySpool } from "./storage/delivery-spool.js";
import { DeliveryStore } from "./storage/delivery-store.js";
import { readLocalReceipts } from "./runtime/client.js";
import { startLocalRuntime } from "./runtime/server.js";
import { assertVnextRuntime } from "./runtime/runtime-version.js";

// dist/vnext -> mcp/ is two levels up; the fixtures are source data, not build output.
const FIXTURES = join(__dirname, "..", "..", "vnext", "fixtures", "protocol-v1");
// dist/vnext -> repo root is three levels up (mcp/dist/vnext).
const REPO_ROOT = join(__dirname, "..", "..", "..");
const REPORT_SCRIPT = join(REPO_ROOT, "scripts", "vnext-phase-a-report.mjs");

function fixture(name: string): unknown {
  return JSON.parse(readFileSync(join(FIXTURES, `${name}.json`), "utf8")) as unknown;
}

function supportsVnextRuntime(): boolean {
  try {
    assertVnextRuntime();
    return true;
  } catch {
    return false;
  }
}

function projectWithMemory(): string {
  const project = mkdtempSync(join(tmpdir(), "kage-vnext-gate-"));
  mkdirSync(join(project, ".agent_memory", "packets"), { recursive: true });
  capture({
    projectDir: project,
    title: "Payments must be idempotent via the ledger key",
    summary: "Retries dedupe on the ledger idempotency key",
    body: "processPayment must pass the ledger idempotency key so retries dedupe. Verified by: npm test.",
    type: "decision",
    allowMissingPaths: true,
  });
  return project;
}

// The only mock in the whole gate, and it mocks the PROVIDER, not Kage: a real Anthropic endpoint
// would bill a real account from CI. It records exactly what bytes reached it, which is how the
// audit invariant is checked.
function fakeAnthropic(seen: Array<{ path: string; body: string }>): Promise<{ server: Server; url: string }> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => { body += chunk as string; });
      req.on("end", () => {
        seen.push({ path: req.url ?? "", body });
        res.writeHead(200, { "content-type": "application/json" });
        if ((req.url ?? "").startsWith("/v1/messages/count_tokens")) {
          // A deterministic stand-in for the provider's tokenizer — but still a MEASUREMENT of the
          // body that was counted, which is what makes the receipt honest rather than estimated.
          res.end(JSON.stringify({ input_tokens: Math.ceil(Buffer.byteLength(body) / 10) }));
          return;
        }
        res.end(JSON.stringify({
          content: [{ type: "text", text: "ok" }],
          usage: {
            input_tokens: 120,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0,
            output_tokens: 7,
          },
        }));
      });
    });
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

function post(port: number, path: string, body: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method: "POST",
        headers: { "content-type": "application/json", "content-length": Buffer.byteLength(body) },
      },
      (res) => {
        let received = "";
        res.on("data", (chunk) => { received += chunk as string; });
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body: received }));
      },
    );
    req.on("error", reject);
    req.end(body);
  });
}

async function listeningPort(server: Server): Promise<number> {
  await new Promise<void>((resolve) => server.on("listening", resolve));
  const address = server.address();
  return typeof address === "object" && address ? address.port : 0;
}

async function waitForReceipt(projectDir: string): Promise<TransformationReceipt[]> {
  // The proxy records a receipt AFTER the client has been answered — measurement never sits in the
  // request path — so the gate waits for the write instead of racing it.
  const deadline = Date.now() + 5_000;
  for (;;) {
    const result = readLocalReceipts(projectDir);
    if (result.available && result.receipts.length) return result.receipts;
    if (Date.now() > deadline) {
      assert.fail(`no receipt reached the local store within 5s (available=${result.available}, reason=${result.reason})`);
    }
    await new Promise((done) => setTimeout(done, 50));
  }
}

/**
 * The MCP server module (`mcp/index.ts`) is the only place a Kage tool call can be dispatched. If
 * it was never loaded into this process, no tool call could have been made — so a zero here is a
 * MEASURED zero, not an assumption about the flow. If it ever is loaded, the gate cannot prove
 * zero and returns a value that fails the assertion instead of quietly passing.
 */
function mcpCallsRequired(operations: readonly { transport: "http" | "mcp" }[]): number {
  const mcpServerModule = join(__dirname, "..", "index.js");
  const loaded = Object.keys(require.cache).some((path) => path === mcpServerModule);
  if (loaded) return Number.NaN;
  return operations.filter((operation) => operation.transport === "mcp").length;
}

const QUESTION = JSON.stringify({
  model: "claude-opus-4-8",
  system: "You are Claude Code, Anthropic's official CLI for Claude.",
  messages: [{ role: "user", content: "how should I make the payment flow idempotent?" }],
});

test("protocol v1 fixtures are accepted by the frozen validators", () => {
  const handshake = validateHandshake(fixture("handshake"));
  assert.equal(handshake.ok, true);
  const event = validateEvidenceEvent(fixture("event"));
  assert.equal(event.ok, true);

  const capsule = fixture("capsule") as Record<string, unknown>;
  assert.equal(capsule.protocol_version, 1);
  assert.equal(Array.isArray(capsule.sections), true);

  const receipt = fixture("receipt") as Record<string, unknown>;
  assert.equal(receipt.mode, "audit");
  // The fixture is the honest audit shape: the forwarded (original) prompt has a measured token
  // total and a measured cost; the candidate that was NOT sent has a count_tokens total but no
  // cache breakdown, so its cost is null. A fixture with a number there would teach a future
  // reader that a two-sided audit cost exists. It does not.
  assert.equal(typeof receipt.provider_input_cost_before_usd, "number");
  assert.equal(receipt.provider_input_cost_after_usd, null);
  assert.equal(receipt.kage_processing_cost_usd, null);
});

test("Gate A: evidence, context, and an audited receipt with no MCP call and no mutated request", { concurrency: false }, async (t) => {
  if (!supportsVnextRuntime()) {
    t.skip("node:sqlite is unavailable on this runtime");
    return;
  }

  const project = projectWithMemory();
  const operations: Array<{ name: string; transport: "http" | "mcp" }> = [];
  const seen: Array<{ path: string; body: string }> = [];
  const { server: upstream, url: upstreamUrl } = await fakeAnthropic(seen);

  // A REAL runtime: real loopback HTTP, real bearer token, real SQLite, and the shipped default
  // context source (the worker-thread legacy source), not a stub.
  const runtime = await startLocalRuntime({ projectDir: project, port: 0, mode: "audit" });
  const proxy = startProxy(project, {
    port: 0,
    upstream: upstreamUrl,
    mode: "audit",
    // No receiptSink override: the proxy opens the project's REAL vNext receipt store, the same
    // SQLite file the runtime uses, and the gate reads the receipt back out of it.
    countTokens: true,
  });
  const proxyPort = await listeningPort(proxy);

  try {
    const repository = claudeRepositoryIdentity(project, { branch: "main", commit: "deadbeef" });

    // 1. Handshake — over HTTP, from the shipped adapter client.
    const handshake = await sendAdapterHandshake({
      url: runtime.url,
      token: runtime.token,
      handshake: claudeHandshake(repository, "gate-session"),
    });
    operations.push({ name: "handshake", transport: "http" });
    assert.equal(handshake.status, "accepted");

    // 2. A prompt event — the same evidence a Claude Code UserPromptSubmit hook posts.
    const event = claudeHookToEvent(
      "prompt",
      { cwd: project, session_id: "gate-session", prompt: "how should I make the payment flow idempotent?" },
      repository,
    );
    assert.ok(event);
    const delivered = await sendAdapterEvent({ url: runtime.url, token: runtime.token, event });
    operations.push({ name: "event", transport: "http" });
    assert.equal(delivered.status, "accepted");
    const storedEvents = runtime.eventStore.forTask(event.task_id);
    assert.equal(storedEvents.length, 1);
    assert.equal(storedEvents[0].event_type, "prompt");

    // 3. A capsule — composed by the real context source on the real repo memory.
    const context = await requestAdapterContext({
      url: runtime.url,
      token: runtime.token,
      request: {
        repository,
        task: { ...claudeHandshake(repository, "gate-session").task },
        query: "how should I make the payment flow idempotent?",
        targets: [],
        changed_files: [],
        token_budget: 2_000,
      },
      // A cold code-graph build legitimately exceeds the adapter's 500 ms session budget; the gate
      // is not measuring that budget here, it is proving the capsule path works end to end.
      timeout_ms: 60_000,
    });
    operations.push({ name: "context", transport: "http" });
    assert.equal(context.status, "delivered");
    const capsule = context.capsule!;
    assert.equal(capsule.protocol_version, 1);

    // 4. A context delivery, recorded by the SHIPPED path — not hand-written by this test. The
    // adapter asks the real runtime for a capsule, decides what the session gets, and records the
    // outcome. This runtime is in AUDIT mode, so the truthful outcome is a SKIP: the capsule was
    // composed (and its latency measured) and nothing was injected. A skip is not an attachment,
    // and the report below must not treat it as one.
    const attempt = await attachAdapterContext({
      project_dir: project,
      connection: { url: runtime.url, token: runtime.token, mode: runtime.status.mode },
      adapter_id: CLAUDE_ADAPTER_ID,
      request: {
        repository,
        task: { ...claudeHandshake(repository, "gate-session").task },
        query: "how should I make the payment flow idempotent?",
        targets: [],
        changed_files: [],
        token_budget: 2_000,
      },
      injection_location: "user_turn",
      timeout_ms: 60_000,
    });
    operations.push({ name: "delivery", transport: "http" });
    assert.equal(attempt.status, "skipped");
    assert.equal(attempt.reason, "audit_mode_no_injection");
    assert.equal(attempt.block, "", "audit injects nothing into the session");
    assert.equal(attempt.recorded, true);
    // The record only reaches SQLite through the shipped drain — the runtime's own, on the next
    // context request, or the reader's, when a report runs.
    drainDeliverySpool(runtime.database, project);

    const deliveries = new DeliveryStore(runtime.database).forTask(event.task_id);
    assert.equal(deliveries.length, 1);
    assert.equal(deliveries[0].status, "skipped");
    assert.equal(deliveries[0].injection_location, "none");
    assert.equal(deliveries[0].added_bytes, 0);
    // added_tokens stays NULL: nothing measured the block's token count, and a byte-derived guess
    // is exactly the fabricated number this phase exists to prevent.
    assert.equal(deliveries[0].added_tokens, null);
    // ...but the COMPOSITION latency is a real measurement, and it is the reason the Phase A
    // latency percentiles can be anything but null.
    assert.equal(typeof deliveries[0].composition_latency_ms, "number");
    assert.ok((deliveries[0].composition_latency_ms as number) > 0);
    assert.equal(renderContextBlock(capsule).includes("<<<KAGE_CONTEXT>>>"), true);

    // 5. ONE audit-mode proxy request through the real proxy to the fake provider.
    const response = await post(proxyPort, "/v1/messages", QUESTION);
    operations.push({ name: "proxy_messages", transport: "http" });
    assert.equal(response.status, 200);

    const forwarded = seen.filter((request) => request.path === "/v1/messages");
    assert.equal(forwarded.length, 1);

    const receipts = await waitForReceipt(project);

    // 6. Daemon outage: stop the runtime, then post evidence again with the shipped adapter. A dead
    // runtime must be survivable — the agent keeps working, the adapter reports failed_open.
    await runtime.close();
    const afterOutage = await sendAdapterEvent({
      url: runtime.url,
      token: runtime.token,
      event: claudeHookToEvent(
        "prompt",
        { cwd: project, session_id: "gate-session", prompt: "does a dead daemon break my session?" },
        repository,
      )!,
    });
    operations.push({ name: "event_after_outage", transport: "http" });

    // The shipped Claude hook, run for real against the same dead runtime, must exit 0 and print
    // nothing: that is what "the session keeps working" means at the surface the user actually has.
    const hookScript = join(REPO_ROOT, "plugin", "hooks", "kage-vnext-adapter.sh");
    const hookOutput = execFileSync(hookScript, {
      input: JSON.stringify({
        hook_event_name: "UserPromptSubmit",
        cwd: project,
        session_id: "gate-session",
        prompt: "does a dead daemon break my session?",
      }),
      encoding: "utf8",
      timeout: 10_000,
    });

    const result = {
      agent_request_unchanged: forwarded[0].body === QUESTION,
      receipts,
      daemon_outage_result: afterOutage.status,
      mcp_calls_required: mcpCallsRequired(operations),
    };

    // ---- Gate A ----
    assert.equal(result.agent_request_unchanged, true);
    assert.equal(result.receipts.length, 1);
    assert.equal(result.receipts[0].mode, "audit");
    assert.equal(result.daemon_outage_result, "failed_open");
    assert.equal(result.mcp_calls_required, 0);

    // The claim behind agent_request_unchanged: Kage DID build a different candidate body (so the
    // audit measured something real) and still forwarded the client's exact bytes.
    assert.deepEqual(result.receipts[0].transformations, ["context_append_last_user_turn"]);
    assert.equal(result.receipts[0].after_input_bytes > result.receipts[0].before_input_bytes, true);
    assert.doesNotMatch(forwarded[0].body, /injected by Kage/);
    // Both sides measured by the provider (usage for the forwarded body, count_tokens for the one
    // that was not sent) => an exact TOKEN receipt...
    assert.equal(result.receipts[0].measurement_quality, "exact");
    assert.equal(typeof result.receipts[0].before_input_tokens, "number");
    assert.equal(typeof result.receipts[0].after_input_tokens, "number");
    // ...and still no cost on the after side: count_tokens reports a token total and nothing about
    // caching, so pricing it would invent a number. An exact token delta is NOT an exact cost delta.
    assert.equal(result.receipts[0].provider_input_cost_after_usd, null);
    assert.equal(result.receipts[0].kage_processing_cost_usd, null);
    // The dead-runtime hook was silent and exited 0 (execFileSync would have thrown otherwise).
    assert.equal(hookOutput.trim(), "");

    // ---- the report must describe exactly this period, and lie about none of it ----
    const report = JSON.parse(
      execFileSync(process.execPath, [REPORT_SCRIPT, "--project", project, "--json"], { encoding: "utf8" }),
    ) as Record<string, unknown>;
    assert.equal(report.available, true);
    assert.equal(report.mode, "audit");
    assert.equal(report.tasks, 1);
    // Measured, not assumed: audit forwarded the original bytes on every request, so no prompt was
    // mutated. The count comes from the receipts, and it is the number that would grow the moment
    // an assist-mode receipt appeared.
    assert.equal(report.prompt_mutations, 0);
    assert.deepEqual(report.measurement, { exact: 1, partial: 0, unavailable: 0 });
    assert.equal(report.measurement_scope, "transformed_requests");

    // ---- attachment and latency are now MEASURED, and both come from the shipped path ----
    //
    // Two audit-mode skips — the hook adapter's capsule and the proxy's candidate body, each
    // COMPOSED and each injected nowhere — and one failed-open (the shell hook, run for real
    // against a runtime that had been stopped). The rate is a measured 0.0: three attempts, zero
    // attachments. It is emphatically NOT 1.0, and it is not null.
    assert.deepEqual(report.attachment, { delivered: 0, skipped: 2, failed_open: 1 });
    assert.equal(report.attachment_success_rate, 0);
    assert.equal(report.failed_open_requests, 1, "a daemon outage is COUNTED, not hidden");
    // The percentiles are real numbers now, from the compositions that really happened. The
    // failed-open composed nothing and contributed no sample — a timeout is not a composition time.
    assert.equal(report.context_latency_samples, 2);
    assert.equal(typeof report.context_latency_p50_ms, "number");
    assert.equal(typeof report.context_latency_p95_ms, "number");
    assert.equal(report.context_latency_source, "context_delivery.composition_latency_ms");
    const cost = report.cost_delta as Record<string, unknown>;
    assert.equal(cost.available, false);
    const tokens = report.token_delta as Record<string, unknown>;
    assert.equal(tokens.available, true);
  } finally {
    proxy.close();
    upstream.close();
    await runtime.close().catch(() => {});
  }
});

test("prompt_mutations is a measured count: a FORWARDED transformation is counted as one", { concurrency: false }, async (t) => {
  if (!supportsVnextRuntime()) {
    t.skip("node:sqlite is unavailable on this runtime");
    return;
  }

  // The audit period reports 0 mutations because audit forwarded the original bytes — not because
  // the report hardcodes a zero. Run the same flow in assist mode, where the transformed body IS
  // forwarded, and the same report must count 1.
  const project = projectWithMemory();
  const seen: Array<{ path: string; body: string }> = [];
  const { server: upstream, url: upstreamUrl } = await fakeAnthropic(seen);
  const proxy = startProxy(project, { port: 0, upstream: upstreamUrl, mode: "assist", countTokens: true });
  const proxyPort = await listeningPort(proxy);

  try {
    const response = await post(proxyPort, "/v1/messages", QUESTION);
    assert.equal(response.status, 200);
    const forwarded = seen.filter((request) => request.path === "/v1/messages");
    assert.equal(forwarded.length, 1);
    assert.match(forwarded[0].body, /injected by Kage/);

    const receipts = await waitForReceipt(project);
    assert.equal(receipts.length, 1);
    assert.equal(receipts[0].mode, "assist");

    const report = JSON.parse(
      execFileSync(process.execPath, [REPORT_SCRIPT, "--project", project, "--json"], { encoding: "utf8" }),
    ) as Record<string, unknown>;
    assert.equal(report.mode, "assist");
    assert.equal(report.prompt_mutations, 1);
    // The proxy really did append memory to the last user turn, so the SHIPPED proxy path recorded
    // a delivered attachment — with the location it went to and the bytes it added. This is the
    // other half of the gate: the audit run above proves a skip is not a success, and this proves a
    // real attachment is still counted as one.
    assert.deepEqual(report.attachment, { delivered: 1, skipped: 0, failed_open: 0 });
    assert.equal(report.attachment_success_rate, 1);
    assert.equal(report.failed_open_requests, 0);
    assert.equal(report.context_latency_samples, 1);
    assert.equal(typeof report.context_latency_p50_ms, "number");
    // No handshake in this flow: the proxy records receipts and deliveries, not tasks.
    assert.equal(report.tasks, 0);
  } finally {
    proxy.close();
    upstream.close();
  }
});

test("a readable but silent audit period reports null, not a clean-looking zero", { concurrency: false }, async (t) => {
  if (!supportsVnextRuntime()) {
    t.skip("node:sqlite is unavailable on this runtime");
    return;
  }

  const project = projectWithMemory();
  const runtime = await startLocalRuntime({ projectDir: project, port: 0, mode: "audit" });
  try {
    const report = JSON.parse(
      execFileSync(process.execPath, [REPORT_SCRIPT, "--project", project, "--json"], { encoding: "utf8" }),
    ) as Record<string, unknown>;
    // The store is READABLE — that is a different fact from "a measurement was taken".
    assert.equal(report.available, true);
    assert.equal(report.empty, true);
    assert.equal(report.reason, "empty_audit_period");
    assert.equal(report.tasks, null);
    assert.equal(report.attachment_success_rate, null);
    assert.equal(report.measurement, null);
    assert.equal(report.failed_open_requests, null);
    assert.equal(report.prompt_mutations, null);
  } finally {
    await runtime.close();
  }
});

test("the audit report reports an unreadable store as null, never as a successful zero", () => {
  const empty = mkdtempSync(join(tmpdir(), "kage-vnext-empty-"));
  mkdirSync(join(empty, ".agent_memory", "packets"), { recursive: true });

  const report = JSON.parse(
    execFileSync(process.execPath, [REPORT_SCRIPT, "--project", empty, "--json"], { encoding: "utf8" }),
  ) as Record<string, unknown>;

  assert.equal(report.available, false);
  assert.equal(report.reason, "no_receipt_store");
  // Every value that could be mistaken for a measured result is null. A zero here would read as
  // "Kage ran all week and cost nothing", which is the exact lie this phase exists to prevent.
  assert.equal(report.tasks, null);
  assert.equal(report.attachment_success_rate, null);
  assert.equal(report.measurement, null);
  assert.equal(report.context_latency_p50_ms, null);
  assert.equal(report.context_latency_p95_ms, null);
  assert.equal(report.failed_open_requests, null);
  assert.equal(report.prompt_mutations, null);
});
