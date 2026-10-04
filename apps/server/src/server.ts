import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import { createApp } from "~/app";
import type { Config } from "~/config";

export interface RunningServer {
  port: number;
  /** Stops accepting connections and resolves once the open requests have finished. */
  stop(): Promise<void>;
}

export function startServer(config: Config): Promise<RunningServer> {
  return new Promise((resolve, reject) => {
    const server: Server = createApp(config).listen(config.PORT, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({
        port: (server.address() as AddressInfo).port,
        stop: () =>
          new Promise((resolveStop, rejectStop) => {
            server.close((closeError) => (closeError ? rejectStop(closeError) : resolveStop()));
          }),
      });
    });
  });
}
