// Shared test fixtures for the knowledge portal. These build DTOs from the generated `api/types.ts`
// so component tests exercise the exact wire shapes the backend read-model emits.

import type { RepositoryDto } from "../api/types";

export function fixtureRepository(overrides: Partial<RepositoryDto> = {}): RepositoryDto {
  return {
    id: "repo-1",
    name: "kage",
    branch: "codex/kage-vnext-implementation",
    commit: "0000000",
    ...overrides,
  };
}
