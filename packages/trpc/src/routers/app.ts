import { router } from "../trpc";
import { healthRouter } from "./health";
import { organizationRouter } from "./organization";
import { propertyRouter } from "./property";

export const appRouter = router({
  health: healthRouter,
  organization: organizationRouter,
  property: propertyRouter,
});

export type AppRouter = typeof appRouter;
