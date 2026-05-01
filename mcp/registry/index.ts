import { createHash } from "node:crypto";

export const REGISTRY_MANIFEST_SCHEMA_VERSION = 1;
export const PUBLIC_CANDIDATE_BUNDLE_SCHEMA_VERSION = 1;

export type RegistryManifestKind = "public_candidate_bundle" | "org_registry";

export interface ManifestSignature {
  algorithm: "sha256-canonical-json";
  key_id: string;
  payload_sha256: string;
  signature: string;
}

export interface SignedManifest<TPayload> {
  schema_version: 1;
  kind: RegistryManifestKind;
  name: string;
  version: string;
  generated_at: string;
  payload: TPayload;
  signature: ManifestSignature;
}

export interface PublicCandidateInput {
  id?: unknown;
  title?: unknown;
  summary?: unknown;
  body?: unknown;
  type?: unknown;
  tags?: unknown;
  stack?: unknown;
  license?: unknown;
  homepage_url?: unknown;
  source_url?: unknown;
  source_refs?: unknown;
  paths?: unknown;
  visibility?: unknown;
  sensitivity?: unknown;
  [key: string]: unknown;
}

export interface PublicCandidate {
  id: string;
  title: string;
  summary: string;
  body: string;
  type: string;
  tags: string[];
  stack: string[];
  license: string;
  homepage_url?: string;
  source_url?: string;
  source_refs: Array<Record<string, string>>;
  trust_level: "community";
  review_status: "needs_public_review";
  reviewer_count: number;
  uses_30d: number;
  credit_count: number;
  contributor_handle?: string;
  contributor_org?: string;
  contribution_url?: string;
  content_sha256: string;
}

export interface PublicCandidateBundle {
  schema_version: 1;
  candidates: PublicCandidate[];
}

export interface PublicCandidateBundleInput {
  schema_version?: unknown;
  candidates?: unknown;
}

export interface ValidationResult<TValue> {
  ok: boolean;
  value?: TValue;
  errors: string[];
  warnings: string[];
}

export interface CreateSignedManifestInput<TPayload> {
  kind: RegistryManifestKind;
  name: string;
  version: string;
  payload: TPayload;
  keyId?: string;
  generatedAt?: string;
}

export interface OrgRegistryEntry {
  id: string;
  title: string;
  summary: string;
  type: string;
  tags: string[];
  stack: string[];
  license: string;
  content_sha256: string;
  manifest_sha256?: string;
  source_url?: string;
  homepage_url?: string;
  trust_level: "community";
  review_status: "needs_public_review";
  reviewer_count: number;
  uses_30d: number;
  credit_count: number;
  contributor_handle?: string;
  contributor_org?: string;
  contribution_url?: string;
}

export interface OrgRegistryMetrics {
  entry_count: number;
  bundle_count: number;
  by_type: Record<string, number>;
  reviewed_count: number;
  community_count: number;
}

export interface OrgRegistryPayload {
  org: string;
  registry_version: string;
  metrics: OrgRegistryMetrics;
  entries: OrgRegistryEntry[];
}

export interface GenerateOrgRegistryManifestInput {
  org: string;
  version: string;
  bundles: Array<PublicCandidateBundle | SignedManifest<PublicCandidateBundle>>;
  keyId?: string;
  generatedAt?: string;
}

const MAX_TEXT_LENGTH = 20_000;
const SAFE_ID = /^[a-z0-9][a-z0-9._:-]{1,127}$/;
const SAFE_TYPE = /^[a-z][a-z0-9_-]{1,63}$/;
const SAFE_LICENSE = /^[A-Za-z0-9][A-Za-z0-9 .+()-]{0,63}$/;
const HTTP_URL = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
const SECRET_PATTERNS: Array<[RegExp, string]> = [
  [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, "email address"],
  [/\b(?:authorization|token|api[_-]?key|secret)\s*[:=]\s*['"]?[A-Za-z0-9._~+/=-]{16,}/i, "credential-like key/value"],
  [/\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/i, "bearer token"],
  [/\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{12,}\b/i, "payment provider token"],
  [/\bgh[pousr]_[A-Za-z0-9_]{16,}\b/i, "GitHub token"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "private key"],
];

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortJsonValue(value));
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function createSignedManifest<TPayload>(input: CreateSignedManifestInput<TPayload>): SignedManifest<TPayload> {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const keyId = input.keyId ?? "local-dev";
  const payloadSha256 = sha256Hex(canonicalJson(input.payload));

  return {
    schema_version: REGISTRY_MANIFEST_SCHEMA_VERSION,
    kind: input.kind,
    name: input.name,
    version: input.version,
    generated_at: generatedAt,
    payload: input.payload,
    signature: {
      algorithm: "sha256-canonical-json",
      key_id: keyId,
      payload_sha256: payloadSha256,
      signature: sha256Hex(`${keyId}:${input.kind}:${input.name}:${input.version}:${generatedAt}:${payloadSha256}`),
    },
  };
}

export function verifySignedManifest<TPayload>(manifest: SignedManifest<TPayload>): ValidationResult<SignedManifest<TPayload>> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (manifest.schema_version !== REGISTRY_MANIFEST_SCHEMA_VERSION) {
    errors.push("manifest schema_version must be 1");
  }
  if (!["public_candidate_bundle", "org_registry"].includes(String(manifest.kind))) {
    errors.push("manifest kind is not supported");
  }
  if (!isNonEmptyString(manifest.name)) {
    errors.push("manifest name is required");
  }
  if (!isNonEmptyString(manifest.version)) {
    errors.push("manifest version is required");
  }
  if (!isIsoDate(manifest.generated_at)) {
    errors.push("manifest generated_at must be an ISO date string");
  }
  if (!manifest.signature || manifest.signature.algorithm !== "sha256-canonical-json") {
    errors.push("manifest signature algorithm must be sha256-canonical-json");
  } else {
    const payloadSha256 = sha256Hex(canonicalJson(manifest.payload));
    const expectedSignature = sha256Hex(
      `${manifest.signature.key_id}:${manifest.kind}:${manifest.name}:${manifest.version}:${manifest.generated_at}:${payloadSha256}`
    );
    if (manifest.signature.payload_sha256 !== payloadSha256) {
      errors.push("manifest payload_sha256 does not match payload");
    }
    if (manifest.signature.signature !== expectedSignature) {
      errors.push("manifest signature does not match signed fields");
    }
  }

  return { ok: errors.length === 0, value: errors.length === 0 ? manifest : undefined, errors, warnings };
}

export function scanPublicCandidateSecrets(value: unknown): string[] {
  const text = collectStrings(value).join("\n");
  const matches = new Set<string>();
  for (const [pattern, label] of SECRET_PATTERNS) {
    if (pattern.test(text)) {
      matches.add(label);
    }
  }
  return [...matches].sort();
}

export function sanitizePublicCandidate(input: PublicCandidateInput): ValidationResult<PublicCandidate> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const id = stringField(input.id, "id", errors);
  const title = stringField(input.title, "title", errors);
  const summary = stringField(input.summary, "summary", errors);
  const body = stringField(input.body, "body", errors);
  const type = stringField(input.type, "type", errors);
  const license = typeof input.license === "string" && input.license.trim() ? input.license.trim() : "UNLICENSED";
  const tags = stringArrayField(input.tags, "tags", errors);
  const stack = stringArrayField(input.stack, "stack", errors);
  const homepageUrl = optionalUrlField(input.homepage_url, "homepage_url", errors);
  const sourceUrl = optionalUrlField(input.source_url, "source_url", errors);
  const contributorHandle = typeof input.contributor_handle === "string" ? input.contributor_handle.trim().slice(0, 80) : undefined;
  const contributorOrg = typeof input.contributor_org === "string" ? input.contributor_org.trim().slice(0, 80) : undefined;
  const contributionUrl = optionalUrlField(input.contribution_url, "contribution_url", errors);
  const sourceRefs = sanitizeSourceRefs(input.source_refs, warnings);
  const secretMatches = scanPublicCandidateSecrets(input);

  if (id && !SAFE_ID.test(id)) {
    errors.push("id must use lowercase registry-safe characters");
  }
  if (type && !SAFE_TYPE.test(type)) {
    errors.push("type must use lowercase registry-safe characters");
  }
  if (!SAFE_LICENSE.test(license)) {
    errors.push("license contains unsupported characters");
  }
  if (body && body.length > MAX_TEXT_LENGTH) {
    errors.push(`body must be ${MAX_TEXT_LENGTH} characters or fewer`);
  }
  if (input.visibility && input.visibility !== "public") {
    warnings.push("visibility was omitted from sanitized public candidate");
  }
  if (input.sensitivity && input.sensitivity !== "public") {
    errors.push("public candidate sensitivity must be public");
  }
  if (Array.isArray(input.paths) && input.paths.length > 0) {
    warnings.push("paths were omitted from sanitized public candidate");
  }
  if (secretMatches.length > 0) {
    errors.push(`candidate contains sensitive content: ${secretMatches.join(", ")}`);
  }

  if (errors.length > 0 || !id || !title || !summary || !body || !type) {
    return { ok: false, errors, warnings };
  }

  const candidateWithoutDigest = {
    id,
    title,
    summary,
    body,
    type,
    tags,
    stack,
    license,
    ...(homepageUrl ? { homepage_url: homepageUrl } : {}),
    ...(sourceUrl ? { source_url: sourceUrl } : {}),
    trust_level: "community" as const,
    review_status: "needs_public_review" as const,
    reviewer_count: 0,
    uses_30d: 0,
    credit_count: contributorHandle || contributorOrg ? 1 : 0,
    ...(contributorHandle ? { contributor_handle: contributorHandle } : {}),
    ...(contributorOrg ? { contributor_org: contributorOrg } : {}),
    ...(contributionUrl ? { contribution_url: contributionUrl } : {}),
    source_refs: sourceRefs,
  };

  return {
    ok: true,
    value: {
      ...candidateWithoutDigest,
      content_sha256: sha256Hex(canonicalJson(candidateWithoutDigest)),
    },
    errors,
    warnings,
  };
}

export function validatePublicCandidateBundle(input: PublicCandidateBundleInput): ValidationResult<PublicCandidateBundle> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (input.schema_version !== undefined && input.schema_version !== PUBLIC_CANDIDATE_BUNDLE_SCHEMA_VERSION) {
    errors.push("bundle schema_version must be 1 when provided");
  }
  if (!Array.isArray(input.candidates)) {
    return { ok: false, errors: [...errors, "bundle candidates must be an array"], warnings };
  }

  const candidates: PublicCandidate[] = [];
  const ids = new Set<string>();
  input.candidates.forEach((candidate, index) => {
    if (!isRecord(candidate)) {
      errors.push(`candidates[${index}] must be an object`);
      return;
    }
    const sanitized = sanitizePublicCandidate(candidate);
    errors.push(...sanitized.errors.map((error) => `candidates[${index}]: ${error}`));
    warnings.push(...sanitized.warnings.map((warning) => `candidates[${index}]: ${warning}`));
    if (sanitized.value) {
      if (ids.has(sanitized.value.id)) {
        errors.push(`candidates[${index}]: duplicate id ${sanitized.value.id}`);
      }
      ids.add(sanitized.value.id);
      candidates.push(sanitized.value);
    }
  });

  return {
    ok: errors.length === 0,
    value: errors.length === 0 ? { schema_version: PUBLIC_CANDIDATE_BUNDLE_SCHEMA_VERSION, candidates } : undefined,
    errors,
    warnings,
  };
}

export function createPublicCandidateBundleManifest(
  input: PublicCandidateBundleInput,
  manifest: Omit<CreateSignedManifestInput<PublicCandidateBundle>, "kind" | "payload">
): ValidationResult<SignedManifest<PublicCandidateBundle>> {
  const bundle = validatePublicCandidateBundle(input);
  if (!bundle.value) {
    return { ok: false, errors: bundle.errors, warnings: bundle.warnings };
  }
  return {
    ok: true,
    value: createSignedManifest({
      ...manifest,
      kind: "public_candidate_bundle",
      payload: bundle.value,
    }),
    errors: [],
    warnings: bundle.warnings,
  };
}

export function generateOrgRegistryManifest(input: GenerateOrgRegistryManifestInput): SignedManifest<OrgRegistryPayload> {
  const entries = new Map<string, OrgRegistryEntry>();

  for (const item of input.bundles) {
    if ("payload" in item) {
      const verified = verifySignedManifest(item);
      if (!verified.ok) throw new Error(`Invalid signed bundle: ${verified.errors.join(", ")}`);
    }
    const bundle = "payload" in item ? item.payload : item;
    const manifestSha256 = "payload" in item ? sha256Hex(canonicalJson(item)) : undefined;
    for (const candidate of bundle.candidates) {
      const existing = entries.get(candidate.id);
      if (existing && existing.content_sha256 !== candidate.content_sha256) {
        throw new Error(`Conflicting duplicate registry entry: ${candidate.id}`);
      }
      entries.set(candidate.id, {
        id: candidate.id,
        title: candidate.title,
        summary: candidate.summary,
        type: candidate.type,
        tags: [...candidate.tags].sort(),
        stack: [...candidate.stack].sort(),
        license: candidate.license,
        content_sha256: candidate.content_sha256,
        ...(manifestSha256 ? { manifest_sha256: manifestSha256 } : {}),
        ...(candidate.source_url ? { source_url: candidate.source_url } : {}),
        ...(candidate.homepage_url ? { homepage_url: candidate.homepage_url } : {}),
        trust_level: candidate.trust_level,
        review_status: candidate.review_status,
        reviewer_count: candidate.reviewer_count,
        uses_30d: candidate.uses_30d,
        credit_count: candidate.credit_count,
        ...(candidate.contributor_handle ? { contributor_handle: candidate.contributor_handle } : {}),
        ...(candidate.contributor_org ? { contributor_org: candidate.contributor_org } : {}),
        ...(candidate.contribution_url ? { contribution_url: candidate.contribution_url } : {}),
      });
    }
  }

  const sortedEntries = [...entries.values()].sort((a, b) => a.id.localeCompare(b.id));
  const byType: Record<string, number> = {};
  for (const entry of sortedEntries) byType[entry.type] = (byType[entry.type] ?? 0) + 1;
  const payload: OrgRegistryPayload = {
    org: input.org,
    registry_version: input.version,
    metrics: {
      entry_count: sortedEntries.length,
      bundle_count: input.bundles.length,
      by_type: Object.fromEntries(Object.entries(byType).sort(([a], [b]) => a.localeCompare(b))),
      reviewed_count: sortedEntries.filter((entry) => entry.reviewer_count > 0).length,
      community_count: sortedEntries.filter((entry) => entry.trust_level === "community").length,
    },
    entries: sortedEntries,
  };

  return createSignedManifest({
    kind: "org_registry",
    name: `${input.org} registry`,
    version: input.version,
    payload,
    keyId: input.keyId,
    generatedAt: input.generatedAt,
  });
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }
  if (isRecord(value)) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortJsonValue(value[key])]));
  }
  return value;
}

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap(collectStrings);
  }
  if (isRecord(value)) {
    return Object.values(value).flatMap(collectStrings);
  }
  return [];
}

function stringField(value: unknown, field: string, errors: string[]): string | undefined {
  if (typeof value !== "string" || !value.trim()) {
    errors.push(`${field} is required`);
    return undefined;
  }
  return value.trim();
}

function stringArrayField(value: unknown, field: string, errors: string[]): string[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    errors.push(`${field} must be an array of strings`);
    return [];
  }
  return [...new Set(value.map((item) => item.trim()).filter(Boolean))].sort();
}

function optionalUrlField(value: unknown, field: string, errors: string[]): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value !== "string" || !HTTP_URL.test(value)) {
    errors.push(`${field} must be an http(s) URL`);
    return undefined;
  }
  return value;
}

function sanitizeSourceRefs(value: unknown, warnings: string[]): Array<Record<string, string>> {
  if (!Array.isArray(value)) {
    return [];
  }
  const refs: Array<Record<string, string>> = [];
  for (const item of value) {
    if (!isRecord(item)) {
      warnings.push("non-object source_ref was omitted");
      continue;
    }
    const sanitized: Record<string, string> = {};
    for (const [key, raw] of Object.entries(item)) {
      if (typeof raw !== "string") {
        continue;
      }
      if (key === "path" || key === "file" || key === "repo_path") {
        warnings.push(`source_ref ${key} was omitted`);
        continue;
      }
      if (key.endsWith("_url") && !HTTP_URL.test(raw)) {
        warnings.push(`source_ref ${key} was omitted because it is not an http(s) URL`);
        continue;
      }
      sanitized[key] = raw;
    }
    if (Object.keys(sanitized).length > 0) {
      refs.push(sanitized);
    }
  }
  return refs;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}
