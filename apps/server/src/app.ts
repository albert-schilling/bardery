import { createExpressMiddleware } from "@trpc/server/adapters/express";
import cors from "cors";
import express from "express";

import type { Config } from "~/config";
import { corsOptions } from "~/cors";
import { appRouter } from "~/routers";

export function createApp(config: Config): express.Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(cors(corsOptions(config.CORS_ORIGINS)));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", version: config.VERSION });
  });

  app.use(
    "/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext: () => ({ version: config.VERSION }),
    }),
  );

  return app;
}
