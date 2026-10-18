import { and, asc, desc, eq, schema } from "@omniheaven/db";
import { RATE_LIMIT_PRESETS } from "@omniheaven/rate-limit";
import {
  bulkCreateFlatsSchema,
  createBuildingSchema,
  createFlatSchema,
  emergencyContactInputSchema,
  flatStatusEnum,
  PROPERTY_ERROR_CODES,
  updateBuildingSchema,
  updateFlatSchema,
  updateFlatStatusSchema,
} from "@omniheaven/validators";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { orgProtectedProcedure, requireRole, router, trpcRateLimit } from "../trpc";
import { recordAuditLog } from "../utils/audit";

export const propertyRouter = router({
  // 1. List all buildings for active organization with unit counts
  listBuildings: orgProtectedProcedure.query(async ({ ctx }) => {
    const buildingsList = await ctx.db.query.buildings.findMany({
      where: eq(schema.buildings.organizationId, ctx.organizationId),
      with: {
        flats: true,
        emergencyContacts: true,
      },
      orderBy: [desc(schema.buildings.createdAt)],
    });

    return buildingsList.map((b) => {
      const totalFlats = b.flats.length;
      const occupiedFlats = b.flats.filter((f) => f.status === "occupied").length;
      const vacantFlats = b.flats.filter((f) => f.status === "vacant").length;
      const underMaintenanceFlats = b.flats.filter((f) => f.status === "under_maintenance").length;
      const totalRentalValue = b.flats.reduce((sum, f) => sum + (f.defaultRentAmount || 0), 0);

      return {
        ...b,
        stats: {
          totalFlats,
          occupiedFlats,
          vacantFlats,
          underMaintenanceFlats,
          occupancyRate: totalFlats > 0 ? Math.round((occupiedFlats / totalFlats) * 100) : 0,
          totalRentalValue,
        },
      };
    });
  }),

  // 2. Get building details by ID with emergency contacts & flat count
  getBuildingById: orgProtectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const building = await ctx.db.query.buildings.findFirst({
        where: and(
          eq(schema.buildings.id, input.id),
          eq(schema.buildings.organizationId, ctx.organizationId),
        ),
        with: {
          emergencyContacts: true,
          flats: true,
        },
      });

      if (!building) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: PROPERTY_ERROR_CODES.BUILDING_NOT_FOUND,
        });
      }

      const totalFlats = building.flats.length;
      const occupiedFlats = building.flats.filter((f) => f.status === "occupied").length;
      const vacantFlats = building.flats.filter((f) => f.status === "vacant").length;
      const underMaintenanceFlats = building.flats.filter(
        (f) => f.status === "under_maintenance",
      ).length;

      return {
        ...building,
        stats: {
          totalFlats,
          occupiedFlats,
          vacantFlats,
          underMaintenanceFlats,
          occupancyRate: totalFlats > 0 ? Math.round((occupiedFlats / totalFlats) * 100) : 0,
        },
      };
    }),

  // 3. Create a new building
  createBuilding: requireRole(["owner", "admin", "manager"])
    .input(createBuildingSchema)
    .mutation(async ({ ctx, input }) => {
      const buildingId = crypto.randomUUID();
      const now = new Date();

      return await ctx.db.transaction(async (tx) => {
        const [newBuilding] = await tx
          .insert(schema.buildings)
          .values({
            id: buildingId,
            organizationId: ctx.organizationId,
            name: input.name,
            address: input.address,
            city: input.city,
            thana: input.thana,
            postalCode: input.postalCode,
            totalFloors: input.totalFloors,
            hasElevator: input.hasElevator,
            hasGenerator: input.hasGenerator,
            gateClosingTime: input.gateClosingTime,
            caretakerPhone: input.caretakerPhone,
            managerPhone: input.managerPhone,
            whatsappGroupLink: input.whatsappGroupLink,
            buildingPhoto: input.buildingPhoto,
            logoPhoto: input.logoPhoto,
            rules: input.rules,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        if (input.emergencyContacts && input.emergencyContacts.length > 0) {
          await tx.insert(schema.emergencyContacts).values(
            input.emergencyContacts.map((c) => ({
              id: crypto.randomUUID(),
              organizationId: ctx.organizationId,
              buildingId,
              name: c.name,
              role: c.role,
              phone: c.phone,
              type: c.type,
              createdAt: now,
            })),
          );
        }

        await recordAuditLog({
          db: tx,
          organizationId: ctx.organizationId,
          actorId: ctx.user.id,
          actorEmail: ctx.user.email,
          action: "BUILDING_CREATED",
          entityType: "building",
          entityId: buildingId,
          details: { name: input.name, city: input.city, totalFloors: input.totalFloors },
        });

        return newBuilding;
      });
    }),

  // 4. Update building details
  updateBuilding: requireRole(["owner", "admin", "manager"])
    .input(updateBuildingSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.buildings.findFirst({
        where: and(
          eq(schema.buildings.id, input.id),
          eq(schema.buildings.organizationId, ctx.organizationId),
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: PROPERTY_ERROR_CODES.BUILDING_NOT_FOUND,
        });
      }

      const { id, ...data } = input;
      const [updated] = await ctx.db
        .update(schema.buildings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.buildings.id, id))
        .returning();

      await recordAuditLog({
        db: ctx.db,
        organizationId: ctx.organizationId,
        actorId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: "BUILDING_UPDATED",
        entityType: "building",
        entityId: id,
        details: data,
      });

      return updated;
    }),

  // 5. Delete a building (only allowed if zero occupied units)
  deleteBuilding: requireRole(["owner", "admin"])
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const building = await ctx.db.query.buildings.findFirst({
        where: and(
          eq(schema.buildings.id, input.id),
          eq(schema.buildings.organizationId, ctx.organizationId),
        ),
        with: {
          flats: true,
        },
      });

      if (!building) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: PROPERTY_ERROR_CODES.BUILDING_NOT_FOUND,
        });
      }

      // Check if any units are occupied
      const occupiedUnits = building.flats.filter((f) => f.status === "occupied");
      if (occupiedUnits.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: PROPERTY_ERROR_CODES.BUILDING_HAS_ACTIVE_UNITS,
        });
      }

      await ctx.db.delete(schema.buildings).where(eq(schema.buildings.id, input.id));

      await recordAuditLog({
        db: ctx.db,
        organizationId: ctx.organizationId,
        actorId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: "BUILDING_DELETED",
        entityType: "building",
        entityId: input.id,
        details: { name: building.name },
      });

      return { success: true };
    }),

  // 6. List flats of a building with optional floor / status filter
  listFlatsByBuilding: orgProtectedProcedure
    .input(
      z.object({
        buildingId: z.string().min(1),
        floor: z.number().int().optional(),
        status: flatStatusEnum.optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const building = await ctx.db.query.buildings.findFirst({
        where: and(
          eq(schema.buildings.id, input.buildingId),
          eq(schema.buildings.organizationId, ctx.organizationId),
        ),
      });

      if (!building) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: PROPERTY_ERROR_CODES.BUILDING_NOT_FOUND,
        });
      }

      const conditions = [
        eq(schema.flats.buildingId, input.buildingId),
        eq(schema.flats.organizationId, ctx.organizationId),
      ];

      if (typeof input.floor === "number") {
        conditions.push(eq(schema.flats.floor, input.floor));
      }
      if (input.status) {
        conditions.push(eq(schema.flats.status, input.status));
      }

      return await ctx.db.query.flats.findMany({
        where: and(...conditions),
        orderBy: [asc(schema.flats.floor), asc(schema.flats.flatNumber)],
      });
    }),

  // 7. Create a single flat
  createFlat: requireRole(["owner", "admin", "manager"])
    .input(createFlatSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify building belongs to active organization
      const building = await ctx.db.query.buildings.findFirst({
        where: and(
          eq(schema.buildings.id, input.buildingId),
          eq(schema.buildings.organizationId, ctx.organizationId),
        ),
      });

      if (!building) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: PROPERTY_ERROR_CODES.BUILDING_NOT_FOUND,
        });
      }

      // Check duplicate flat number in same building
      const existing = await ctx.db.query.flats.findFirst({
        where: and(
          eq(schema.flats.buildingId, input.buildingId),
          eq(schema.flats.flatNumber, input.flatNumber),
        ),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: PROPERTY_ERROR_CODES.FLAT_DUPLICATE_NUMBER,
        });
      }

      const flatId = crypto.randomUUID();
      const now = new Date();

      const [flat] = await ctx.db
        .insert(schema.flats)
        .values({
          id: flatId,
          organizationId: ctx.organizationId,
          buildingId: input.buildingId,
          flatNumber: input.flatNumber,
          floor: input.floor,
          unitType: input.unitType,
          bedrooms: input.bedrooms,
          bathrooms: input.bathrooms,
          balconies: input.balconies,
          squareFeet: input.squareFeet,
          defaultRentAmount: input.defaultRentAmount,
          defaultServiceCharge: input.defaultServiceCharge,
          electricityMeterNumber: input.electricityMeterNumber,
          electricityMeterType: input.electricityMeterType,
          gasType: input.gasType,
          waterSubmeterNumber: input.waterSubmeterNumber,
          notes: input.notes,
          status: input.status,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      await recordAuditLog({
        db: ctx.db,
        organizationId: ctx.organizationId,
        actorId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: "FLAT_CREATED",
        entityType: "flat",
        entityId: flatId,
        details: { flatNumber: input.flatNumber, buildingId: input.buildingId },
      });

      return flat;
    }),

  // 8. Bulk generate flats with transaction and rate limiting (max 10 bulk ops per 5 min)
  bulkCreateFlats: requireRole(["owner", "admin", "manager"])
    .use(
      trpcRateLimit({
        config: RATE_LIMIT_PRESETS.MUTATIONS_BULK,
        keyGenerator: (ctx) => `bulk-flats:${ctx.organizationId}`,
      }),
    )
    .input(bulkCreateFlatsSchema)
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.transaction(async (tx) => {
        // Verify building belongs to organization
        const building = await tx.query.buildings.findFirst({
          where: and(
            eq(schema.buildings.id, input.buildingId),
            eq(schema.buildings.organizationId, ctx.organizationId),
          ),
        });

        if (!building) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: PROPERTY_ERROR_CODES.BUILDING_NOT_FOUND,
          });
        }

        const existingFlats = await tx.query.flats.findMany({
          where: eq(schema.flats.buildingId, input.buildingId),
          columns: { flatNumber: true },
        });
        const existingNumbers = new Set(existingFlats.map((f) => f.flatNumber));

        const toInsert = [];
        const now = new Date();

        for (let fl = input.floorStart; fl <= input.floorEnd; fl++) {
          for (const letter of input.letters) {
            const flatNumber = `${fl}${letter}`;
            if (existingNumbers.has(flatNumber)) {
              throw new TRPCError({
                code: "CONFLICT",
                message: `Flat ${flatNumber} already exists in this building (${PROPERTY_ERROR_CODES.FLAT_DUPLICATE_NUMBER})`,
              });
            }

            toInsert.push({
              id: crypto.randomUUID(),
              organizationId: ctx.organizationId,
              buildingId: input.buildingId,
              flatNumber,
              floor: fl,
              unitType: input.unitType,
              bedrooms: input.bedrooms,
              bathrooms: input.bathrooms,
              balconies: input.balconies,
              squareFeet: input.squareFeet,
              defaultRentAmount: input.defaultRentAmount,
              defaultServiceCharge: input.defaultServiceCharge,
              electricityMeterType: input.electricityMeterType,
              gasType: input.gasType,
              status: "vacant" as const,
              createdAt: now,
              updatedAt: now,
            });
          }
        }

        const inserted = await tx.insert(schema.flats).values(toInsert).returning();

        await recordAuditLog({
          db: tx,
          organizationId: ctx.organizationId,
          actorId: ctx.user.id,
          actorEmail: ctx.user.email,
          action: "FLATS_BULK_CREATED",
          entityType: "building",
          entityId: input.buildingId,
          details: {
            count: inserted.length,
            floorStart: input.floorStart,
            floorEnd: input.floorEnd,
          },
        });

        return {
          count: inserted.length,
          flats: inserted,
        };
      });
    }),

  // 9. Update flat specifications and utility meters
  updateFlat: requireRole(["owner", "admin", "manager"])
    .input(updateFlatSchema)
    .mutation(async ({ ctx, input }) => {
      const target = await ctx.db.query.flats.findFirst({
        where: and(
          eq(schema.flats.id, input.id),
          eq(schema.flats.organizationId, ctx.organizationId),
        ),
      });

      if (!target) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: PROPERTY_ERROR_CODES.FLAT_NOT_FOUND,
        });
      }

      // If flat code is changing, ensure uniqueness in building
      if (input.flatNumber && input.flatNumber !== target.flatNumber) {
        const duplicate = await ctx.db.query.flats.findFirst({
          where: and(
            eq(schema.flats.buildingId, target.buildingId),
            eq(schema.flats.flatNumber, input.flatNumber),
          ),
        });

        if (duplicate) {
          throw new TRPCError({
            code: "CONFLICT",
            message: PROPERTY_ERROR_CODES.FLAT_DUPLICATE_NUMBER,
          });
        }
      }

      const { id, ...data } = input;
      const [updated] = await ctx.db
        .update(schema.flats)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.flats.id, id))
        .returning();

      await recordAuditLog({
        db: ctx.db,
        organizationId: ctx.organizationId,
        actorId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: "FLAT_UPDATED",
        entityType: "flat",
        entityId: id,
        details: data,
      });

      return updated;
    }),

  // 10. Update flat occupancy/maintenance status
  updateFlatStatus: requireRole(["owner", "admin", "manager"])
    .input(updateFlatStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const flat = await ctx.db.query.flats.findFirst({
        where: and(
          eq(schema.flats.id, input.flatId),
          eq(schema.flats.organizationId, ctx.organizationId),
        ),
      });

      if (!flat) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: PROPERTY_ERROR_CODES.FLAT_NOT_FOUND,
        });
      }

      // If occupied, block manually changing status to vacant without lease termination
      if (flat.status === "occupied" && input.status !== "occupied") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: PROPERTY_ERROR_CODES.FLAT_OCCUPIED_STATUS_LOCKED,
        });
      }

      const [updated] = await ctx.db
        .update(schema.flats)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(schema.flats.id, input.flatId))
        .returning();

      await recordAuditLog({
        db: ctx.db,
        organizationId: ctx.organizationId,
        actorId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: "FLAT_STATUS_UPDATED",
        entityType: "flat",
        entityId: input.flatId,
        details: { previousStatus: flat.status, newStatus: input.status },
      });

      return updated;
    }),

  // 11. Emergency Contacts
  listEmergencyContacts: orgProtectedProcedure
    .input(z.object({ buildingId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.query.emergencyContacts.findMany({
        where: and(
          eq(schema.emergencyContacts.buildingId, input.buildingId),
          eq(schema.emergencyContacts.organizationId, ctx.organizationId),
        ),
        orderBy: [desc(schema.emergencyContacts.createdAt)],
      });
    }),

  createEmergencyContact: requireRole(["owner", "admin", "manager"])
    .input(emergencyContactInputSchema.extend({ buildingId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const id = crypto.randomUUID();
      const [contact] = await ctx.db
        .insert(schema.emergencyContacts)
        .values({
          id,
          organizationId: ctx.organizationId,
          buildingId: input.buildingId,
          name: input.name,
          role: input.role,
          phone: input.phone,
          type: input.type,
          createdAt: new Date(),
        })
        .returning();

      return contact;
    }),

  deleteEmergencyContact: requireRole(["owner", "admin", "manager"])
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(schema.emergencyContacts)
        .where(
          and(
            eq(schema.emergencyContacts.id, input.id),
            eq(schema.emergencyContacts.organizationId, ctx.organizationId),
          ),
        );

      return { success: true };
    }),
});
