import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import { createApp } from "~/app";
import { createAuth } from "~/auth";
import type { Config } from "~/config";
import { connectDatabase, entraToken } from "~/db/client";
import { createEmailSender } from "~/email";
import type { EmailSender } from "~/providers/email-sender";
import { createAccountRepository } from "~/repositories/accounts";
import { createHealthRepository } from "~/repositories/health";
import { createSignInCodeRequestRepository } from "~/repositories/sign-in-code-requests";
import { createAccountService } from "~/services/accounts";
import { createHealthService } from "~/services/health";
import { createSignInService } from "~/services/sign-in";

export interface RunningServer {
  port: number;
  /** Stops accepting connections and resolves once the open requests have finished. */
  stop(): Promise<void>;
}

/** Starts the api; tests pass their own email sender to read the codes it sends. */
export function startServer(
  config: Config,
  emailSender: EmailSender = createEmailSender(config),
): Promise<RunningServer> {
  const database = connectDatabase({
    url: config.DATABASE_URL,
    password: config.AZURE_CLIENT_ID === undefined ? undefined : entraToken(config.AZURE_CLIENT_ID),
  });
  const accounts = createAccountRepository(database.db);
  const services = {
    accounts: createAccountService({ repository: accounts }),
    health: createHealthService({
      repository: createHealthRepository(database.db),
      version: config.VERSION,
    }),
  };
  const signIn = createSignInService({
    accounts,
    codeRequests: createSignInCodeRequestRepository(database.db),
    emailSender,
    signUpAllowlist: config.SIGN_UP_ALLOWLIST,
  });
  const auth = createAuth({ config, db: database.db, signIn });

  return new Promise((resolve, reject) => {
    const server: Server = createApp(config, services, auth).listen(config.PORT, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({
        port: (server.address() as AddressInfo).port,
        stop: async () => {
          await new Promise<void>((resolveStop, rejectStop) => {
            server.close((closeError) => (closeError ? rejectStop(closeError) : resolveStop()));
          });
          await database.close();
        },
      });
    });
  });
}
