import { healthSchema } from "@bardery/schemas";

import { publicProcedure } from "./trpc";

export const health = publicProcedure
  .output(healthSchema)
  .query(({ ctx }) => ({ status: "ok", version: ctx.version }));
