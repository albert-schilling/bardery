import type { Health } from "@bardery/schemas";

import type { HealthRepository } from "~/repositories/health";

export interface HealthService {
  check(): Promise<Health>;
}

export function createHealthService(deps: {
  repository: HealthRepository;
  version: string;
}): HealthService {
  return {
    async check() {
      const reachable = await deps.repository.isDatabaseReachable();
      return { status: "ok", version: deps.version, database: reachable ? "up" : "down" };
    },
  };
}
