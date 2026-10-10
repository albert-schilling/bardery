import { sql } from "drizzle-orm";

import type { Database } from "~/db/client";

export interface HealthRepository {
  /** Whether the database answers a query. */
  isDatabaseReachable(): Promise<boolean>;
}

export function createHealthRepository(db: Database): HealthRepository {
  return {
    async isDatabaseReachable() {
      try {
        await db.execute(sql`select 1`);
        return true;
      } catch {
        return false;
      }
    },
  };
}
