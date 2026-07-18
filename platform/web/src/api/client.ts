// Typed HTTP client for the Kage vNext read-model API. The portal talks ONLY to the daemon that
// serves it (same origin, `connect-src 'self'` under the strict CSP), authenticated with the Phase A
// machine token as a Bearer header. Every method returns a DTO from the generated `types.ts`, so the
// wire shape is checked against the backend at build time.

import type {
  EntityDetailDto,
  FeatureListDto,
  IntegrationsDto,
  OverviewDto,
  DecisionDetailDto,
  ReviewItemsDto,
  RunbookDetailDto,
  SystemMapDto,
  SystemMapView,
  TaskDetailDto,
  TasksDto,
} from "./types";

export interface KageApiClient {
  overview(): Promise<OverviewDto>;
  systemMap(view?: SystemMapView): Promise<SystemMapDto>;
  features(): Promise<FeatureListDto>;
  feature(slug: string): Promise<EntityDetailDto>;
  component(slug: string): Promise<EntityDetailDto>;
  flow(slug: string): Promise<EntityDetailDto>;
  runbook(slug: string): Promise<RunbookDetailDto>;
  decision(slug: string): Promise<DecisionDetailDto>;
  reviewItems(status?: string): Promise<ReviewItemsDto>;
  tasks(): Promise<TasksDto>;
  task(taskId: string): Promise<TaskDetailDto>;
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

  systemMap(view?: SystemMapView): Promise<SystemMapDto> {
    const query = view ? `?view=${encodeURIComponent(view)}` : "";
    return this.get<SystemMapDto>(`/v2/system-map${query}`);
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

  tasks(): Promise<TasksDto> {
    return this.get<TasksDto>("/v2/tasks");
  }

  task(taskId: string): Promise<TaskDetailDto> {
    return this.get<TaskDetailDto>(`/v2/tasks/${encodeURIComponent(taskId)}`);
  }

  integrations(): Promise<IntegrationsDto> {
    return this.get<IntegrationsDto>("/v2/integrations");
  }
}
