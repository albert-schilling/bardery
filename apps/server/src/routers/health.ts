import { healthSchema } from "@bardery/schemas";

import { publicProcedure } from "~/routers/trpc";

export const health = publicProcedure
  .output(healthSchema)
  .query(({ ctx }) => ctx.services.health.check());
