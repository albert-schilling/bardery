import type { HealthService } from "~/services/health";

/** Everything the routers can call, handed to them in the tRPC context. */
export interface Services {
  health: HealthService;
}
