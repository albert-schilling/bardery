import type { Account } from "@bardery/schemas";

import type { AccountRepository } from "~/repositories/accounts";

export interface AccountService {
  /** The Account with this ID; a signed-in session always has one, so a missing one is a bug. */
  get(id: string): Promise<Account>;
}

export function createAccountService(deps: { repository: AccountRepository }): AccountService {
  return {
    async get(id) {
      const account = await deps.repository.findById(id);
      if (account === undefined) throw new Error(`Account ${id} not found`);
      return account;
    },
  };
}
