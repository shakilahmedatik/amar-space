import { router } from "../trpc";
import { auditRouter } from "./audit";
import { billingRouter } from "./billing";
import { healthRouter } from "./health";
import { hotelRouter } from "./hotel";
import { operationsRouter } from "./operations";
import { organizationRouter } from "./organization";
import { propertyRouter } from "./property";
import { renterRouter } from "./renter";
import { superadminRouter } from "./superadmin";

export const appRouter = router({
  health: healthRouter,
  organization: organizationRouter,
  property: propertyRouter,
  renter: renterRouter,
  billing: billingRouter,
  operations: operationsRouter,
  audit: auditRouter,
  hotel: hotelRouter,
  superadmin: superadminRouter,
});

export type AppRouter = typeof appRouter;
