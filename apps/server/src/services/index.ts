import type { AccountService } from "~/services/accounts";
import type { HealthService } from "~/services/health";

/** Everything the routers can call, handed to them in the tRPC context. */
export interface Services {
  accounts: AccountService;
  health: HealthService;
}
