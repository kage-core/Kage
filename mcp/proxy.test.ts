import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { capture } from "./kernel.js";
import { injectMemory } from "./proxy.js";

if (!process.env.KAGE_HOME) process.env.KAGE_HOME = mkdtempSync(join(tmpdir(), "kage-proxy-home-"));

function tempProject(): string {
  const dir = mkdtempSync(join(tmpdir(), "kage-proxy-test-"));
  mkdirSync(join(dir, ".agent_memory", "packets"), { recursive: true });
  return dir;
}

test("proxy injects relevant repo memory into a request's string system prompt", () => {
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
    system: "You are a helpful coding assistant.",
    messages: [{ role: "user", content: "how should I make the payment flow idempotent?" }],
  };
  const { body, injected } = injectMemory(project, request as Record<string, unknown>);
  assert.equal(injected > 0, true);
  assert.equal(typeof body.system, "string");
  assert.match(body.system as string, /injected by Kage/);
  assert.match(body.system as string, /idempotent/i);
  // Original system prompt is preserved, not replaced.
  assert.match(body.system as string, /helpful coding assistant/);
  // Client messages are never altered.
  assert.deepEqual(body.messages, request.messages);
});

test("proxy prepends a memory block to an array-form system prompt", () => {
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
    system: [{ type: "text", text: "base instructions" }],
    messages: [{ role: "user", content: "which jwt library does auth use?" }],
  };
  const { body, injected } = injectMemory(project, request as Record<string, unknown>);
  assert.equal(injected > 0, true);
  assert.equal(Array.isArray(body.system), true);
  const arr = body.system as Array<{ type: string; text: string }>;
  assert.match(arr[0].text, /injected by Kage/);
  assert.equal(arr[arr.length - 1].text, "base instructions");
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
});
