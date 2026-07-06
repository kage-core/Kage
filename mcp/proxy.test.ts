import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { capture } from "./kernel.js";
import { injectMemory, isCompletionsRequest } from "./proxy.js";

if (!process.env.KAGE_HOME) process.env.KAGE_HOME = mkdtempSync(join(tmpdir(), "kage-proxy-home-"));

function tempProject(): string {
  const dir = mkdtempSync(join(tmpdir(), "kage-proxy-test-"));
  mkdirSync(join(dir, ".agent_memory", "packets"), { recursive: true });
  return dir;
}

test("proxy appends memory to a string-form last user message, leaving system byte-identical", () => {
  const project = tempProject();
  capture({
    projectDir: project,
    title: "Payments must be idempotent via the ledger key",
    summary: "Retries dedupe on the ledger idempotency key",
    body: "processPayment must pass the ledger idempotency key so retries dedupe. Verified by: npm test.",
    type: "decision",
    allowMissingPaths: true,
  });

  const request = {
    model: "claude-x",
    system: "You are Claude Code, Anthropic's official CLI for Claude.",
    messages: [{ role: "user", content: "how should I make the payment flow idempotent?" }],
  };
  const { body, injected } = injectMemory(project, request as Record<string, unknown>);
  assert.equal(injected > 0, true);
  // OAuth invariant: the system prompt is NEVER touched (subscription tokens 429 otherwise).
  assert.equal(body.system, request.system);
  // Memory lands in the last user message instead.
  const msgs = body.messages as Array<{ role: string; content: string }>;
  assert.match(msgs[0].content, /how should I make the payment flow idempotent/);
  assert.match(msgs[0].content, /injected by Kage/);
  assert.match(msgs[0].content, /idempotent/i);
});

test("proxy appends a memory block to an array-form last user message, leaving system untouched", () => {
  const project = tempProject();
  capture({
    projectDir: project,
    title: "Auth uses jose, not jsonwebtoken",
    summary: "Token verification uses the jose library",
    body: "verifyToken uses jose (not jsonwebtoken) for JWT verification. Verified by: npm test.",
    type: "gotcha",
    allowMissingPaths: true,
  });
  const request = {
    system: [{ type: "text", text: "You are Claude Code, Anthropic's official CLI for Claude." }],
    messages: [{ role: "user", content: [{ type: "text", text: "which jwt library does auth use?" }] }],
  };
  const { body, injected } = injectMemory(project, request as Record<string, unknown>);
  assert.equal(injected > 0, true);
  // System array is returned unchanged — identity block still first and only.
  assert.deepEqual(body.system, request.system);
  const content = (body.messages as Array<{ content: Array<{ type: string; text: string }> }>)[0].content;
  assert.equal(content[0].text, "which jwt library does auth use?");
  assert.match(content[content.length - 1].text, /injected by Kage/);
});

test("only POST /v1/messages is a completion — count_tokens and non-POST are excluded", () => {
  assert.equal(isCompletionsRequest("POST", "/v1/messages"), true);
  assert.equal(isCompletionsRequest("POST", "/v1/messages?beta=true"), true);
  // The sibling token-counting endpoint must NOT get injected into.
  assert.equal(isCompletionsRequest("POST", "/v1/messages/count_tokens?beta=true"), false);
  assert.equal(isCompletionsRequest("GET", "/v1/messages"), false);
  assert.equal(isCompletionsRequest("POST", "/v1/models"), false);
});

test("proxy leaves the request untouched when nothing relevant is recalled", () => {
  const project = tempProject();
  const request = {
    system: "unchanged",
    messages: [{ role: "user", content: "xyzzy nothing will match this token qwerty" }],
  };
  const { body, injected } = injectMemory(project, request as Record<string, unknown>);
  assert.equal(injected, 0);
  assert.equal(body.system, "unchanged");
  assert.deepEqual(body.messages, request.messages);
});
