import type { Account } from "@bardery/schemas";
import { eq } from "drizzle-orm";

import type { Database } from "~/db/client";
import { user } from "~/db/schema";

/** Accounts, stored in Better Auth's `user` table. Better Auth creates them when a new email signs in. */
export interface AccountRepository {
  findById(id: string): Promise<Account | undefined>;
  existsWithEmail(email: string): Promise<boolean>;
}

export function createAccountRepository(db: Database): AccountRepository {
  return {
    async findById(id) {
      const [account] = await db
        .select({ id: user.id, email: user.email })
        .from(user)
        .where(eq(user.id, id));
      return account;
    },
    async existsWithEmail(email) {
      const rows = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
      return rows.length > 0;
    },
  };
}
