// Publishing a Kage check run back to a pull request.
//
// Two hard rules:
//   1. Least privilege is real, not aspirational. Checks WRITE is a separate opt-in; an installation
//      that only has our default read-only permissions is SKIPPED explicitly — we never attempt the
//      write and never report success we did not achieve.
//   2. A check summary links the task receipt and the knowledge diff. It NEVER contains raw prompts or
//      tool payloads — those stay local.
import type { InstallationToken } from "./auth.js";
import type { Fetcher } from "./auth.js";

export interface CheckInstallation {
  installation_id: string | number;
  owner: string;
  repo: string;
  permissions: Record<string, string>;
}

export interface CheckRunRequest {
  head_sha: string;
  conclusion: "success" | "neutral" | "failure";
  title: string;
  summary: string;
  /** Link back to the auditable receipt/diff rather than inlining any prompt content. */
  details_url?: string;
}

export type CheckPublishResult =
  | { status: "published"; check_run_id: string }
  | { status: "skipped_missing_permission" }
  | { status: "failed"; http_status: number };

/** True only when the installation actually granted `checks: write`. */
export function canPublishChecks(installation: CheckInstallation): boolean {
  return installation.permissions.checks === "write";
}

// Defence in depth: even though callers build the summary, never let raw prompt/tool content through.
const FORBIDDEN_SUMMARY_KEYS = /"?(prompt|messages|tool_result|tool_use|raw_body)"?\s*:/i;

export interface PublishDeps {
  apiBaseUrl: string;
  token: InstallationToken;
  fetcher?: Fetcher;
}

/**
 * Publish a check run. Returns `skipped_missing_permission` — not an error — when the installation is
 * read-only, so a least-privilege install degrades cleanly instead of erroring on every PR.
 */
export async function publishCheck(
  installation: CheckInstallation,
  check: CheckRunRequest,
  deps: PublishDeps,
): Promise<CheckPublishResult> {
  if (!canPublishChecks(installation)) {
    return { status: "skipped_missing_permission" };
  }
  if (FORBIDDEN_SUMMARY_KEYS.test(check.summary)) {
    throw new Error("github_check_summary_contains_raw_payload");
  }
  const fetcher: Fetcher =
    deps.fetcher ?? ((url, init) => fetch(url, init) as unknown as ReturnType<Fetcher>);
  const response = await fetcher(
    `${deps.apiBaseUrl}/repos/${installation.owner}/${installation.repo}/check-runs`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${deps.token.token}`,
        accept: "application/vnd.github+json",
      },
    },
  );
  if (!response.ok) {
    return { status: "failed", http_status: response.status };
  }
  const body = (await response.json()) as { id?: unknown };
  return { status: "published", check_run_id: String(body.id ?? "") };
}
