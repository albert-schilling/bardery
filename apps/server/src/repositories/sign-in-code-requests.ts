import { sql } from "drizzle-orm";

import type { Database } from "~/db/client";
import { signInCodeRequests } from "~/db/schema";

export interface SignInCodeRequestRepository {
  /**
   * Records a request for a sign-in code to `email` and returns how many it has had in the current
   * window, this one included. A window starts with the first request after the last one ended.
   */
  record(email: string, windowSeconds: number): Promise<number>;
}

export function createSignInCodeRequestRepository(db: Database): SignInCodeRequestRepository {
  return {
    async record(email, windowSeconds) {
      // Forgets every window that has ended, so the table holds only the addresses asked for lately.
      await db
        .delete(signInCodeRequests)
        .where(
          sql`${signInCodeRequests.windowStartedAt} <= now() - make_interval(secs => ${windowSeconds})`,
        );
      // An upsert, so concurrent requests can't both read the old count.
      const [row] = await db
        .insert(signInCodeRequests)
        .values({ email, windowStartedAt: sql`now()`, count: 1 })
        .onConflictDoUpdate({
          target: signInCodeRequests.email,
          set: { count: sql`${signInCodeRequests.count} + 1` },
        })
        .returning({ count: signInCodeRequests.count });
      if (row === undefined) throw new Error("the upsert returned no row");
      return row.count;
    },
  };
}
