import { health } from "~/routers/health";
import { router } from "~/routers/trpc";

export const appRouter = router({ health });

export type AppRouter = typeof appRouter;
