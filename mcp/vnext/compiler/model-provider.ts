import type { EntityKind, ImpactClass } from "../repo-model/types.js";

/**
 * Provider-neutral model extraction seam.
 *
 * The compiler may OPTIONALLY consult a language model to surface repository knowledge that the
 * deterministic extractors cannot see (a rationale, a design intent, an ownership hint). This module
 * defines only the shape of that conversation — never a concrete provider. There is no Anthropic /
 * OpenAI / Gemini branch here and no network code: a provider is injected, so the extractor is
 * testable with a fake and the compiler is not wedded to any vendor.
 *
 * The contract is deliberately lopsided in the compiler's favour:
 *   - The compiler sends a REDACTED, metadata-level summary and a fixed allowlist of stable evidence
 *     ids and entity kinds — never a raw transcript, never raw tool output, never secrets.
 *   - The provider returns a proposal. It cannot set trust, cannot mint evidence, and cannot name an
 *     entity kind outside the allowlist. Everything it returns is validated and routed to `proposed`
 *     (see model-extractor.ts). A model is a source of hypotheses, never a source of truth.
 */

export interface ModelExtractionRequest {
  repository_id: string;
  episode_id: string;
  /** A redacted, metadata-level description of the episode. Never a raw transcript or tool payload. */
  redacted_summary: string;
  /** The only event ids a returned claim may cite as evidence. */
  allowed_event_ids: string[];
  /** The only entity kinds a returned entity may declare. */
  allowed_entity_kinds: EntityKind[];
  /** The hard ceiling on how many claim candidates the compiler will keep. */
  max_candidates: number;
}

export interface ModelExtractionResponse {
  entities: Array<{ kind: EntityKind; name: string; evidence_event_ids: string[] }>;
  claims: Array<{
    entity_name: string;
    claim_kind: string;
    content: string;
    evidence_event_ids: string[];
    impact_class: ImpactClass;
  }>;
}

/**
 * A model provider. `extract` returns the raw (untrusted) response plus whatever usage the provider
 * measured. Tokens and cost are `number | null`: a provider that does not report them yields null,
 * and the compiler records null — never a fabricated zero.
 */
export interface ModelExtractionProvider {
  provider_id: string;
  extract(request: ModelExtractionRequest): Promise<{
    response: unknown;
    input_tokens: number | null;
    output_tokens: number | null;
    cost_usd: number | null;
  }>;
}
