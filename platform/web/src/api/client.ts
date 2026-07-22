// Typed HTTP client for the Kage vNext read-model API. The portal talks ONLY to the daemon that
// serves it (same origin, `connect-src 'self'` under the strict CSP), authenticated with the Phase A
// machine token as a Bearer header. Every method returns a DTO from the generated `types.ts`, so the
// wire shape is checked against the backend at build time.

import type { TeamReportDto,
  EntityDetailDto,
  FeatureListDto,
  IntegrationsDto,
  OverviewDto,
  DecisionDetailDto,
  ReviewDecisionRequestDto,
  ReviewDecisionResultDto,
  ReviewItemsDto,
  RunbookDetailDto,
  SystemMapDto,
  SystemMapView,
  TaskDetailDto,
  TaskReceiptDto,
  TasksDto,
} from "./types";

// The six authorized review mutations, as their URL action segments.
export type ReviewAction =
  | "accept"
  | "edit-and-accept"
  | "reject"
  | "supersede"
  | "assign"
  | "request-evidence";

// A review mutation's HTTP outcome. `status` is surfaced verbatim so the UI can explain a 403
// (self-approval blocked) or 409 (version conflict) against the offending item, never swallowing it.
export interface ReviewMutationOutcome {
  status: number;
  ok: boolean;
  error?: string;
  result?: ReviewDecisionResultDto;
}

export interface KageApiClient {
  teamReport(): Promise<{ report: TeamReportDto | null }>;
  overview(): Promise<OverviewDto>;
  systemMap(view?: SystemMapView, focus?: string | null): Promise<SystemMapDto>;
  features(): Promise<FeatureListDto>;
  feature(slug: string): Promise<EntityDetailDto>;
  component(slug: string): Promise<EntityDetailDto>;
  flow(slug: string): Promise<EntityDetailDto>;
  runbook(slug: string): Promise<RunbookDetailDto>;
  decision(slug: string): Promise<DecisionDetailDto>;
  reviewItems(status?: string): Promise<ReviewItemsDto>;
  decideReview(
    reviewItemId: string,
    action: ReviewAction,
    request: ReviewDecisionRequestDto,
  ): Promise<ReviewMutationOutcome>;
  tasks(): Promise<TasksDto>;
  task(taskId: string): Promise<TaskDetailDto>;
  taskReceipt(taskId: string): Promise<TaskReceiptDto>;
  integrations(): Promise<IntegrationsDto>;
}

export class KageApi implements KageApiClient {
  // Explicit fields (not constructor parameter properties): the portal tsconfig sets
  // `erasableSyntaxOnly`, which forbids parameter-property syntax because it is not type-erasable.
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: { authorization: `Bearer ${this.token}` },
    });
    if (!response.ok) throw new Error(`Kage API ${response.status}`);
    return response.json() as Promise<T>;
  }

  overview(): Promise<OverviewDto> {
    return this.get<OverviewDto>("/v2/overview");
  }

  teamReport(): Promise<{ report: TeamReportDto | null }> {
    return this.get<{ report: TeamReportDto | null }>("/v2/team-report");
  }

  systemMap(view?: SystemMapView, focus?: string | null): Promise<SystemMapDto> {
    const params = new URLSearchParams();
    if (view) params.set("view", view);
    if (focus) params.set("focus", focus);
    const query = params.toString();
    return this.get<SystemMapDto>(`/v2/system-map${query ? `?${query}` : ""}`);
  }

  features(): Promise<FeatureListDto> {
    return this.get<FeatureListDto>("/v2/features");
  }

  feature(slug: string): Promise<EntityDetailDto> {
    return this.get<EntityDetailDto>(`/v2/features/${encodeURIComponent(slug)}`);
  }

  component(slug: string): Promise<EntityDetailDto> {
    return this.get<EntityDetailDto>(`/v2/components/${encodeURIComponent(slug)}`);
  }

  flow(slug: string): Promise<EntityDetailDto> {
    return this.get<EntityDetailDto>(`/v2/flows/${encodeURIComponent(slug)}`);
  }

  runbook(slug: string): Promise<RunbookDetailDto> {
    return this.get<RunbookDetailDto>(`/v2/runbooks/${encodeURIComponent(slug)}`);
  }

  decision(slug: string): Promise<DecisionDetailDto> {
    return this.get<DecisionDetailDto>(`/v2/decisions/${encodeURIComponent(slug)}`);
  }

  reviewItems(status?: string): Promise<ReviewItemsDto> {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return this.get<ReviewItemsDto>(`/v2/review-items${query}`);
  }

  // A review mutation. Unlike `get`, a non-2xx status is NOT thrown away as a generic error: the
  // status and error code are returned so the caller can explain a 403/409 against the item. The
  // portal talks only to the same origin under the strict CSP (`connect-src 'self'`).
  async decideReview(
    reviewItemId: string,
    action: ReviewAction,
    request: ReviewDecisionRequestDto,
  ): Promise<ReviewMutationOutcome> {
    const response = await fetch(
      `${this.baseUrl}/v2/review-items/${encodeURIComponent(reviewItemId)}/${action}`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${this.token}`, "content-type": "application/json" },
        body: JSON.stringify(request),
      },
    );
    const body = (await response.json().catch(() => null)) as
      | (ReviewDecisionResultDto & { error?: string })
      | { error?: string }
      | null;
    if (response.ok) {
      return { status: response.status, ok: true, result: (body ?? undefined) as ReviewDecisionResultDto };
    }
    return { status: response.status, ok: false, error: body?.error ?? "request_failed" };
  }

  tasks(): Promise<TasksDto> {
    return this.get<TasksDto>("/v2/tasks");
  }

  task(taskId: string): Promise<TaskDetailDto> {
    return this.get<TaskDetailDto>(`/v2/tasks/${encodeURIComponent(taskId)}`);
  }

  taskReceipt(taskId: string): Promise<TaskReceiptDto> {
    return this.get<TaskReceiptDto>(`/v2/tasks/${encodeURIComponent(taskId)}/receipt`);
  }

  integrations(): Promise<IntegrationsDto> {
    return this.get<IntegrationsDto>("/v2/integrations");
  }
}
