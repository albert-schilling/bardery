import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import { createApp } from "~/app";
import type { Config } from "~/config";
import { connectDatabase } from "~/db/client";
import { createHealthRepository } from "~/repositories/health";
import { createHealthService } from "~/services/health";

export interface RunningServer {
  port: number;
  /** Stops accepting connections and resolves once the open requests have finished. */
  stop(): Promise<void>;
}

export function startServer(config: Config): Promise<RunningServer> {
  const database = connectDatabase({
    url: config.DATABASE_URL,
    azureClientId: config.AZURE_CLIENT_ID,
  });
  const services = {
    health: createHealthService({
      repository: createHealthRepository(database.db),
      version: config.VERSION,
    }),
  };

  return new Promise((resolve, reject) => {
    const server: Server = createApp(config, services).listen(config.PORT, (error) => {
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
