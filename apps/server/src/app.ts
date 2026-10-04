import express from "express";

import type { Config } from "~/config";

export function createApp(config: Config): express.Express {
  const app = express();
  app.disable("x-powered-by");

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", version: config.VERSION });
  });

  return app;
}
