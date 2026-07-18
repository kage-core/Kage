import type { LiveZone } from "../live-zone.js";

// The richer provider adapter boundary the Phase D transform pipeline consumes (Task 5, Step 3).
//
// The proxy CORE still dispatches eligibility/parse/inject/usage/receipt/capture through the
// provider-neutral ProviderGateway (mcp/vnext/adapters/gateway.ts). This adapter is the SMALLER,
// pipeline-facing seam: it declares the cache-safety live zone and how to (de)serialize a provider
// request so the transform pipeline can mutate ONLY the mutable region and forward the stable prefix
// byte-for-byte. Only the Anthropic adapter is enabled in Phase D; another provider is a new adapter
// with its own cache/injection fixtures, never a fork of the pipeline.
export interface GatewayProviderAdapter<TRequest> {
  /** The provider string, matching the ProviderGateway's `provider` (e.g. "anthropic"). */
  provider: string;
  /** Is this an eligible completion request for this provider? */
  isEligible(method: string | undefined, path: string | undefined): boolean;
  /** Parse the raw request body into the provider's typed request, or null when it is not one. */
  parse(body: Buffer): TRequest | null;
  /**
   * The cache-safety live zone for this request: which slice of the messages array may be mutated,
   * and where injected context is allowed to land. The stable prefix (system + tools + older turns)
   * is never touched, or the provider's prompt cache is busted.
   */
  liveZone(request: TRequest): LiveZone;
  /**
   * MEASURED token count of the request, or null when this provider exposes no cheap counter. Never
   * an estimate — a count is provider-measured or null. Bound to a counter at construction time.
   */
  tokenCount(request: TRequest): Promise<number | null>;
  /** Provider-reported input/output tokens read from a (possibly streamed) response body. */
  usage(responseBody: string): { input_tokens: number | null; output_tokens: number | null };
  /** Serialize the typed request back to wire bytes. */
  serialize(request: TRequest): Buffer;
}
