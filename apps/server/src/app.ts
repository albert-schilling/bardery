import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";

import type { Auth } from "~/auth";
import type { Config } from "~/config";
import { corsOptions } from "~/cors";
import { appRouter } from "~/routers";
import type { Services } from "~/services";

export function createApp(config: Config, services: Services, auth: Auth): express.Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(cors(corsOptions(config.CORS_ORIGINS)));

  // The container probes' endpoint. It doesn't ask the database, so a database outage doesn't get
  // the api restarted; the `health` procedure reports the database.
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", version: config.VERSION });
  });

  // Sending and checking sign-in codes, and signing out. Better Auth reads the body itself.
  app.all("/api/auth/*splat", toNodeHandler(auth));

  app.use(
    "/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext: async ({ req, res }) => {
        const { headers, response: session } = await auth.api.getSession({
          headers: fromNodeHeaders(req.headers),
          returnHeaders: true,
        });
        // Better Auth extends a session in use once a day; this passes its renewed cookie on.
        const cookies = headers.getSetCookie();
        if (cookies.length > 0) res.append("Set-Cookie", cookies);
        return { services, session: session && { accountId: session.user.id } };
      },
    }),
  );

  return app;
}
