import assert from "node:assert/strict";
import test from "node:test";
import {
  certifySurface,
  type AgentSurfaceCertification,
} from "./capability-matrix.js";
import { CURSOR_SURFACE, cursorHooksConfig, certifyCursor } from "./cursor-hooks.js";
import { CODEX_SURFACE, codexOtelConfig, certifyCodex } from "./codex-otel.js";

test("surface is automatic only after an injection sentinel reaches its transcript", () => {
  const result = certifySurface({
    surface: "cursor",
    capture_events: 4,
    requested_sentinel: "KAGE-CERT-123",
    transcript: "agent received KAGE-CERT-123 once",
    health: "healthy",
  });
  assert.equal(result.capture, "automatic");
  assert.equal(result.injection, "automatic_session");
  assert.equal(result.counts_as_automatic_attachment, true);
});

test("Codex telemetry is automatic capture but does not imply automatic injection", () => {
  const result = certifySurface({
    surface: "codex",
    capture_events: 4,
    requested_sentinel: "KAGE-CERT-123",
    transcript: "no injected sentinel",
    health: "healthy",
  });
  assert.equal(result.capture, "automatic");
  assert.equal(result.injection, "mcp_fallback");
  assert.equal(result.counts_as_automatic_attachment, false);
});

test("Codex cannot be upgraded to automatic injection even when a sentinel is present", () => {
  // Codex's ceiling is mcp_fallback: no Kage-owned session injection hook exists,
  // so even a transcript sentinel must not fabricate an automatic label.
  const result = certifySurface({
    surface: "codex",
    capture_events: 4,
    requested_sentinel: "KAGE-CERT-123",
    transcript: "agent received KAGE-CERT-123",
    health: "healthy",
  });
  assert.equal(result.injection, "mcp_fallback");
  assert.equal(result.counts_as_automatic_attachment, false);
});

test("cursor session injection is not certified automatic when the sentinel never lands", () => {
  const result = certifySurface({
    surface: "cursor",
    capture_events: 3,
    requested_sentinel: "KAGE-CERT-XYZ",
    transcript: "session ran but no context marker appeared",
    health: "healthy",
  });
  assert.equal(result.capture, "automatic");
  assert.notEqual(result.injection, "automatic_session");
  assert.equal(result.counts_as_automatic_attachment, false);
});

test("claude-code native hooks certify automatic session injection on a proven sentinel", () => {
  const result = certifySurface({
    surface: "claude-code",
    capture_events: 5,
    requested_sentinel: "KAGE-CERT-CC",
    transcript: "<<<KAGE_CONTEXT>>> KAGE-CERT-CC <<<END_KAGE_CONTEXT>>>",
    health: "healthy",
  });
  assert.equal(result.capture, "automatic");
  assert.equal(result.injection, "automatic_session");
  assert.equal(result.counts_as_automatic_attachment, true);
});

test("anthropic-proxy certifies gateway injection when the sentinel is forwarded", () => {
  const result = certifySurface({
    surface: "anthropic-proxy",
    capture_events: 2,
    requested_sentinel: "KAGE-CERT-PX",
    transcript: "gateway forwarded KAGE-CERT-PX to provider",
    health: "healthy",
  });
  assert.equal(result.injection, "gateway");
  assert.equal(result.counts_as_automatic_attachment, true);
});

test("an unhealthy surface certifies nothing as automatic", () => {
  const result = certifySurface({
    surface: "cursor",
    capture_events: 4,
    requested_sentinel: "KAGE-CERT-123",
    transcript: "agent received KAGE-CERT-123 once",
    health: "unavailable",
  });
  assert.equal(result.capture, "unavailable");
  assert.equal(result.injection, "unavailable");
  assert.equal(result.counts_as_automatic_attachment, false);
});

test("no capture events downgrades capture to unavailable", () => {
  const result = certifySurface({
    surface: "cursor",
    capture_events: 0,
    requested_sentinel: "KAGE-CERT-123",
    transcript: "agent received KAGE-CERT-123 once",
    health: "healthy",
  });
  assert.equal(result.capture, "unavailable");
});

test("capture fails closed on any capture_events that is not an integer > 0", () => {
  // The honesty gate: capture may be certified "automatic" only when a positive
  // integer number of events was actually observed. undefined / NaN / a
  // non-integer float / a negative value must all fail CLOSED to "unavailable",
  // never fall open to "automatic" (which could flip counts_as_automatic_attachment).
  const base = {
    surface: "cursor" as const,
    requested_sentinel: "KAGE-CERT-123",
    transcript: "agent received KAGE-CERT-123 once",
    health: "healthy" as const,
  };
  const badEvents: unknown[] = [undefined, NaN, 2.5, -1.5, -3, Infinity];
  for (const capture_events of badEvents) {
    const result = certifySurface({
      ...base,
      capture_events: capture_events as number,
    });
    assert.equal(
      result.capture,
      "unavailable",
      `capture_events=${String(capture_events)} must fail closed`,
    );
    assert.equal(
      result.counts_as_automatic_attachment,
      false,
      `capture_events=${String(capture_events)} must not count as automatic`,
    );
  }
});

test("fixture fingerprint is deterministic and content-addressed", () => {
  const input = {
    surface: "cursor" as const,
    capture_events: 4,
    requested_sentinel: "KAGE-CERT-123",
    transcript: "agent received KAGE-CERT-123 once",
    health: "healthy" as const,
    certified_at: "2026-07-18T00:00:00.000Z",
  };
  const a = certifySurface(input);
  const b = certifySurface(input);
  assert.deepEqual(a, b);
  assert.match(a.fixture_fingerprint, /^sha256:[0-9a-f]{64}$/);
  const changed = certifySurface({ ...input, transcript: "different transcript" });
  assert.notEqual(changed.fixture_fingerprint, a.fixture_fingerprint);
});

test("mcp_fallback and manual states are recorded as explicit limitations", () => {
  const codex = certifySurface({
    surface: "codex",
    capture_events: 4,
    requested_sentinel: "KAGE-CERT-123",
    transcript: "no injected sentinel",
    health: "healthy",
  });
  assert.ok(codex.limitations.length > 0);
  assert.ok(
    codex.limitations.some((l) => /mcp fallback|session injection/i.test(l)),
    JSON.stringify(codex.limitations),
  );
});

test("certified_at honors an explicit override so the record is reproducible", () => {
  const result = certifySurface({
    surface: "cursor",
    capture_events: 4,
    requested_sentinel: "KAGE-CERT-123",
    transcript: "agent received KAGE-CERT-123 once",
    health: "healthy",
    certified_at: "2026-07-18T12:00:00.000Z",
  });
  assert.equal(result.certified_at, "2026-07-18T12:00:00.000Z");
});

test("cursor adapter exposes an honest project-level hooks config and certifier", () => {
  assert.equal(CURSOR_SURFACE, "cursor");
  const config = cursorHooksConfig();
  const events = Object.keys(config.hooks);
  assert.ok(events.includes("sessionStart"), JSON.stringify(events));
  assert.ok(events.includes("beforeSubmitPrompt"), JSON.stringify(events));
  assert.ok(events.includes("stop"), JSON.stringify(events));
  const cert: AgentSurfaceCertification = certifyCursor({
    capture_events: 4,
    requested_sentinel: "KAGE-CERT-123",
    transcript: "agent received KAGE-CERT-123 once",
    health: "healthy",
    surface_version: "0.42.0",
  });
  assert.equal(cert.surface, "cursor");
  assert.equal(cert.injection, "automatic_session");
  assert.equal(cert.surface_version, "0.42.0");
});

test("codex adapter reports automatic capture plus honest mcp fallback", () => {
  assert.equal(CODEX_SURFACE, "codex");
  const toml = codexOtelConfig();
  assert.match(toml, /otel/i);
  const cert = certifyCodex({
    capture_events: 4,
    requested_sentinel: "KAGE-CERT-123",
    transcript: "otel prompt + tool events but no session injection sentinel",
    health: "healthy",
  });
  assert.equal(cert.surface, "codex");
  assert.equal(cert.capture, "automatic");
  assert.equal(cert.injection, "mcp_fallback");
  assert.equal(cert.counts_as_automatic_attachment, false);
});
