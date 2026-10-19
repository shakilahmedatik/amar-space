import { RATE_LIMIT_PRESETS } from "@omniheaven/rate-limit";
import {
  bulkCreateFlatsSchema,
  createBuildingSchema,
  createFlatSchema,
  emergencyContactInputSchema,
  flatStatusEnum,
  updateBuildingSchema,
  updateFlatSchema,
  updateFlatStatusSchema,
} from "@omniheaven/validators";
import { z } from "zod";
import * as propertyService from "../services/property.service";
import { orgProtectedProcedure, requireRole, router, trpcRateLimit } from "../trpc";

export const propertyRouter = router({
  // 1. List all buildings for active organization with unit counts
  listBuildings: orgProtectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/properties/buildings",
        tags: ["Property"],
        summary: "List all buildings for active organization with stats",
      },
    })
    .query(async ({ ctx }) => {
      return propertyService.listBuildings(ctx.db, ctx.organizationId);
    }),

  // 2. Get building details by ID with emergency contacts & flat count
  getBuildingById: orgProtectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/properties/buildings/{id}",
        tags: ["Property"],
        summary: "Get building details by ID with flat stats",
      },
    })
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return propertyService.getBuildingById(ctx.db, ctx.organizationId, input.id);
    }),

  // 3. Create a new building
  createBuilding: requireRole(["owner", "admin", "manager"])
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/properties/buildings",
        tags: ["Property"],
        summary: "Create a new building with optional emergency contacts",
      },
    })
    .input(createBuildingSchema)
    .mutation(async ({ ctx, input }) => {
      return propertyService.createBuilding(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email },
        input,
      );
    }),

  // 4. Update building details
  updateBuilding: requireRole(["owner", "admin", "manager"])
    .meta({
      openapi: {
        method: "PATCH",
        path: "/v1/properties/buildings/{id}",
        tags: ["Property"],
        summary: "Update building details and rules",
      },
    })
    .input(updateBuildingSchema)
    .mutation(async ({ ctx, input }) => {
      return propertyService.updateBuilding(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email },
        input,
      );
    }),

  // 5. Delete a building (only allowed if zero occupied units)
  deleteBuilding: requireRole(["owner", "admin"])
    .meta({
      openapi: {
        method: "DELETE",
        path: "/v1/properties/buildings/{id}",
        tags: ["Property"],
        summary: "Delete a building with zero active leases",
      },
    })
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return propertyService.deleteBuilding(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email },
        input.id,
      );
    }),

  // 6. List flats of a building with optional floor / status filter
  listFlatsByBuilding: orgProtectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/properties/buildings/{buildingId}/flats",
        tags: ["Property"],
        summary: "List flats of a building with optional filter",
      },
    })
    .input(
      z.object({
        buildingId: z.string().min(1),
        floor: z.number().int().optional(),
        status: flatStatusEnum.optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return propertyService.listFlatsByBuilding(ctx.db, ctx.organizationId, input);
    }),

  // 7. Create a single flat
  createFlat: requireRole(["owner", "admin", "manager"])
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/properties/flats",
        tags: ["Property"],
        summary: "Create a single flat",
      },
    })
    .input(createFlatSchema)
    .mutation(async ({ ctx, input }) => {
      return propertyService.createFlat(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email },
        input,
      );
    }),

  // 8. Bulk generate flats with transaction and rate limiting (max 10 bulk ops per 5 min)
  bulkCreateFlats: requireRole(["owner", "admin", "manager"])
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/properties/flats/bulk",
        tags: ["Property"],
        summary: "Bulk generate flats across floors and letters",
      },
    })
    .use(
      trpcRateLimit({
        config: RATE_LIMIT_PRESETS.MUTATIONS_BULK,
        keyGenerator: (ctx) => `bulk-flats:${ctx.organizationId}`,
      }),
    )
    .input(bulkCreateFlatsSchema)
    .mutation(async ({ ctx, input }) => {
      return propertyService.bulkCreateFlats(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email },
        input,
      );
    }),

  // 9. Update flat specifications and utility meters
  updateFlat: requireRole(["owner", "admin", "manager"])
    .meta({
      openapi: {
        method: "PATCH",
        path: "/v1/properties/flats/{id}",
        tags: ["Property"],
        summary: "Update flat specs and utility meters",
      },
    })
    .input(updateFlatSchema)
    .mutation(async ({ ctx, input }) => {
      return propertyService.updateFlat(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email },
        input,
      );
    }),

  // 10. Update flat occupancy/maintenance status
  updateFlatStatus: requireRole(["owner", "admin", "manager"])
    .meta({
      openapi: {
        method: "PATCH",
        path: "/v1/properties/flats/{flatId}/status",
        tags: ["Property"],
        summary: "Update flat occupancy or maintenance status",
      },
    })
    .input(updateFlatStatusSchema)
    .mutation(async ({ ctx, input }) => {
      return propertyService.updateFlatStatus(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email },
        input,
      );
    }),

  // 11. List emergency contacts for a building
  listEmergencyContacts: orgProtectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/properties/buildings/{buildingId}/emergency-contacts",
        tags: ["Property"],
        summary: "List emergency contacts for a building",
      },
    })
    .input(z.object({ buildingId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return propertyService.listEmergencyContacts(ctx.db, ctx.organizationId, input.buildingId);
    }),

  // 12. Create emergency contact
  createEmergencyContact: requireRole(["owner", "admin", "manager"])
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/properties/emergency-contacts",
        tags: ["Property"],
        summary: "Create emergency contact for a building",
      },
    })
    .input(emergencyContactInputSchema.extend({ buildingId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return propertyService.createEmergencyContact(ctx.db, ctx.organizationId, input);
    }),

  // 13. Delete emergency contact
  deleteEmergencyContact: requireRole(["owner", "admin", "manager"])
    .meta({
      openapi: {
        method: "DELETE",
        path: "/v1/properties/emergency-contacts/{id}",
        tags: ["Property"],
        summary: "Delete emergency contact",
      },
    })
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return propertyService.deleteEmergencyContact(ctx.db, ctx.organizationId, input.id);
    }),
});
