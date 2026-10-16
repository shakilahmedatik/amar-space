import { router } from "../trpc";
import { healthRouter } from "./health";
import { organizationRouter } from "./organization";

export const appRouter = router({
  health: healthRouter,
  organization: organizationRouter,
});

export type AppRouter = typeof appRouter;
