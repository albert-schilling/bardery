import { initTRPC, TRPCError } from "@trpc/server";

import type { Services } from "~/services";

export interface Session {
  accountId: string;
}

export interface Context {
  services: Services;
  /** The signed-in reader's session, from the session cookie; null for an anonymous call. */
  session: Session | null;
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

/** A procedure for signed-in readers only: an anonymous call fails with UNAUTHORIZED. */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (ctx.session === null) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { session: ctx.session } });
});
