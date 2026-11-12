import { accountSchema } from "@bardery/schemas";

import { protectedProcedure } from "~/routers/trpc";

export const me = protectedProcedure
  .output(accountSchema)
  .query(({ ctx }) => ctx.services.accounts.get(ctx.session.accountId));
