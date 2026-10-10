import { createExpressMiddleware } from "@trpc/server/adapters/express";
import cors from "cors";
import express from "express";

import type { Config } from "~/config";
import { corsOptions } from "~/cors";
import { appRouter } from "~/routers";
import type { Services } from "~/services";

export function createApp(config: Config, services: Services): express.Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(cors(corsOptions(config.CORS_ORIGINS)));

  // The container probes' endpoint. It doesn't ask the database, so a database outage doesn't get
  // the api restarted; the `health` procedure reports the database.
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", version: config.VERSION });
  });

  app.use(
    "/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext: () => ({ services }),
    }),
  );

  return app;
}
