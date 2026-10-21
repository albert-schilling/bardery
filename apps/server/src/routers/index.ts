import { health } from "~/routers/health";
import { me } from "~/routers/me";
import { router } from "~/routers/trpc";

export const appRouter = router({ health, me });

export type AppRouter = typeof appRouter;
