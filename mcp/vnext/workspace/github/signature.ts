// GitHub webhook signature verification.
//
// The signature is checked against the EXACT raw request bytes BEFORE the body is parsed: a forged or
// tampered delivery must never reach a JSON parser, let alone the processor. Comparison is
// constant-time so a attacker cannot recover the expected digest byte-by-byte through timing.
import { createHmac, timingSafeEqual } from "node:crypto";

/** The `sha256=<hex>` signature GitHub sends for a raw body under a webhook secret. */
export function computeSignature(secret: string, rawBody: Buffer | string): string {
  const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
  return `sha256=${digest}`;
}

/**
 * Verify an `X-Hub-Signature-256` header against the raw body. Returns false for a missing, malformed,
 * or mismatched signature — never throws, so a hostile header cannot become an error path.
 */
export function verifySignature(
  secret: string,
  rawBody: Buffer | string,
  provided: string | undefined | null,
): boolean {
  if (!provided) return false;
  const expected = Buffer.from(computeSignature(secret, rawBody), "utf8");
  const actual = Buffer.from(provided, "utf8");
  // timingSafeEqual requires equal lengths; a length mismatch is already a definitive reject.
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
