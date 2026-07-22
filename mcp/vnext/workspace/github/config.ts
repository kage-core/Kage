// GitHub App configuration.
//
// Credentials (app id, private key, webhook secret) come from deployment secrets at runtime and are
// NEVER committed or written into repository configuration. The workspace runs perfectly well without
// GitHub configured — `loadGitHubAppConfig` returns null and the integration simply stays off, rather
// than the service failing to start.
//
// Least privilege: Kage requests read-only metadata/contents/pull-request permissions at install time.
// Checks WRITE is a separate, explicit opt-in — see `docs/integrations/github-app.md`.

export interface GitHubAppConfig {
  app_id: string;
  /** PKCS#8 PEM private key, supplied by deployment secret. */
  private_key: string;
  webhook_secret: string;
  api_base_url: string;
}

/** The permissions Kage asks for on a fresh installation. Checks write is deliberately absent. */
export const REQUESTED_PERMISSIONS: Readonly<Record<string, "read" | "write">> = Object.freeze({
  metadata: "read",
  contents: "read",
  pull_requests: "read",
});

/** The GitHub webhook events Kage subscribes to. Anything else is ignored on arrival. */
export const HANDLED_EVENTS: ReadonlySet<string> = new Set([
  "installation",
  "installation_repositories",
  "push",
  "pull_request",
  "check_suite",
  "check_run",
  "repository",
]);

/**
 * Read the GitHub App configuration from the environment. Returns null when the integration is not
 * configured, so a workspace without GitHub keeps working instead of failing closed at startup.
 */
export function loadGitHubAppConfig(env: NodeJS.ProcessEnv = process.env): GitHubAppConfig | null {
  const appId = env.KAGE_GITHUB_APP_ID;
  const privateKey = env.KAGE_GITHUB_PRIVATE_KEY;
  const webhookSecret = env.KAGE_GITHUB_WEBHOOK_SECRET;
  if (!appId || !privateKey || !webhookSecret) return null;
  return {
    app_id: appId,
    // Deployment secrets often carry escaped newlines; restore them so the PEM parses.
    private_key: privateKey.includes("\\n") ? privateKey.replace(/\\n/g, "\n") : privateKey,
    webhook_secret: webhookSecret,
    api_base_url: env.KAGE_GITHUB_API_BASE_URL ?? "https://api.github.com",
  };
}
