// GitHub App authentication: short-lived app JWTs exchanged for installation access tokens.
//
// Two rules this module exists to enforce:
//   1. An installation token is cached ONLY until the expiry GitHub itself reported. We never invent a
//      lifetime, and we refresh slightly early so an in-flight request cannot race the expiry.
//   2. We never assume a token's length or format. Tokens are opaque strings; any parsing/prefix
//      assumption would break the moment GitHub changes them.
import type { GitHubAppConfig } from "./config.js";

// `jose` is ESM-only and this package compiles to CommonJS, so it is loaded through a dynamic import
// (preserved as a real `import()` under `module: Node16`) rather than a static one.

/** An installation token exactly as GitHub reported it — opaque value plus its own expiry. */
export interface InstallationToken {
  token: string;
  /** ISO-8601 expiry, as reported by GitHub. Never computed locally. */
  expires_at: string;
  /** The permissions actually granted to this installation (may be narrower than requested). */
  permissions: Record<string, string>;
}

/** Refresh this far before the reported expiry so a request in flight cannot use a just-expired token. */
const EXPIRY_SKEW_MS = 60_000;

/**
 * Mint a short-lived app JWT (max 10 minutes per GitHub; we use 9) used only to request installation
 * tokens. `iat` is backdated 60s to tolerate clock skew between us and GitHub.
 */
export async function createAppJwt(config: GitHubAppConfig, nowMs: number = Date.now()): Promise<string> {
  const { SignJWT, importPKCS8 } = await import("jose");
  const key = await importPKCS8(config.private_key, "RS256");
  const nowSeconds = Math.floor(nowMs / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(config.app_id)
    .setIssuedAt(nowSeconds - 60)
    .setExpirationTime(nowSeconds + 540)
    .sign(key);
}

/** The subset of `fetch` this module needs, so tests can inject a fake transport. */
export type Fetcher = (url: string, init?: { method?: string; headers?: Record<string, string> }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

export interface TokenSourceOptions {
  config: GitHubAppConfig;
  fetcher?: Fetcher;
  now?: () => number;
}

/**
 * Issues and caches installation tokens. One entry per installation id; an entry is reused only while
 * GitHub's own reported expiry (minus a small skew) is still in the future.
 */
export class InstallationTokenSource {
  private readonly cache = new Map<string, InstallationToken>();
  private readonly config: GitHubAppConfig;
  private readonly fetcher: Fetcher;
  private readonly now: () => number;

  constructor(options: TokenSourceOptions) {
    this.config = options.config;
    this.fetcher = options.fetcher ?? ((url, init) => fetch(url, init) as unknown as ReturnType<Fetcher>);
    this.now = options.now ?? (() => Date.now());
  }

  /** True when a cached token is still usable (strictly inside its reported expiry, minus skew). */
  private fresh(token: InstallationToken): boolean {
    const expiresAt = Date.parse(token.expires_at);
    if (Number.isNaN(expiresAt)) return false;
    return this.now() + EXPIRY_SKEW_MS < expiresAt;
  }

  /** Return a valid installation token, reusing the cached one only while GitHub says it is valid. */
  async tokenFor(installationId: string | number): Promise<InstallationToken> {
    const key = String(installationId);
    const cached = this.cache.get(key);
    if (cached && this.fresh(cached)) return cached;

    const jwt = await createAppJwt(this.config, this.now());
    const response = await this.fetcher(
      `${this.config.api_base_url}/app/installations/${key}/access_tokens`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${jwt}`,
          accept: "application/vnd.github+json",
        },
      },
    );
    if (!response.ok) {
      this.cache.delete(key);
      throw new Error(`github_installation_token_failed:${response.status}`);
    }
    const body = (await response.json()) as {
      token?: unknown;
      expires_at?: unknown;
      permissions?: unknown;
    };
    if (typeof body.token !== "string" || typeof body.expires_at !== "string") {
      throw new Error("github_installation_token_malformed");
    }
    const token: InstallationToken = {
      token: body.token,
      expires_at: body.expires_at,
      permissions:
        body.permissions && typeof body.permissions === "object"
          ? (body.permissions as Record<string, string>)
          : {},
    };
    this.cache.set(key, token);
    return token;
  }

  /** Drop any cached token for an installation (used when an installation is revoked/suspended). */
  forget(installationId: string | number): void {
    this.cache.delete(String(installationId));
  }
}
