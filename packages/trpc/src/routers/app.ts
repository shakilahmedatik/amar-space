import { router } from "../trpc";
import { billingRouter } from "./billing";
import { healthRouter } from "./health";
import { organizationRouter } from "./organization";
import { propertyRouter } from "./property";
import { renterRouter } from "./renter";

export const appRouter = router({
  health: healthRouter,
  organization: organizationRouter,
  property: propertyRouter,
  renter: renterRouter,
  billing: billingRouter,
});

export type AppRouter = typeof appRouter;
