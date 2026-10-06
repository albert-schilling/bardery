import { initTRPC } from "@trpc/server";

// Declared here and not imported from config, so the web app can typecheck this folder
// without resolving the server's `~/` alias.
export interface Context {
  version: string;
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
