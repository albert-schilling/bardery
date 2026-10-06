import { health } from "./health";
import { router } from "./trpc";

export const appRouter = router({ health });

export type AppRouter = typeof appRouter;
