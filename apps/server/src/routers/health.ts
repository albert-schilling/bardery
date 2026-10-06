import { healthSchema } from "@bardery/schemas";

import { publicProcedure } from "~/routers/trpc";

export const health = publicProcedure
  .output(healthSchema)
  .query(({ ctx }) => ({ status: "ok", version: ctx.version }));
