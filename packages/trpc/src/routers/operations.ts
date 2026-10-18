import { and, desc, eq, gte, isNull, or, schema } from "@omniheaven/db";
import {
  assignStaffSchema,
  createMaintenanceRequestSchema,
  createNoticeSchema,
  maintenanceCategoryEnum,
  maintenancePriorityEnum,
  maintenanceStatusEnum,
  OPERATIONS_ERROR_CODES,
  pinNoticeSchema,
  resolveMaintenanceRequestSchema,
  updateRequestStatusSchema,
} from "@omniheaven/validators";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { orgProtectedProcedure, protectedProcedure, requireRole, router } from "../trpc";
import { recordAuditLog } from "../utils/audit";

export const operationsRouter = router({
  // 1. List Maintenance Requests (Admin / Manager)
  listMaintenanceRequests: orgProtectedProcedure
    .input(
      z
        .object({
          buildingId: z.string().optional(),
          status: maintenanceStatusEnum.optional(),
          priority: maintenancePriorityEnum.optional(),
          flatId: z.string().optional(),
          category: maintenanceCategoryEnum.optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const buildingId = input?.buildingId;
      const status = input?.status;
      const priority = input?.priority;
      const flatId = input?.flatId;
      const category = input?.category;
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;

      const whereConditions = [eq(schema.maintenanceRequests.organizationId, ctx.organizationId)];

      if (buildingId) {
        whereConditions.push(eq(schema.maintenanceRequests.buildingId, buildingId));
      }
      if (status) {
        whereConditions.push(eq(schema.maintenanceRequests.status, status));
      }
      if (priority) {
        whereConditions.push(eq(schema.maintenanceRequests.priority, priority));
      }
      if (flatId) {
        whereConditions.push(eq(schema.maintenanceRequests.flatId, flatId));
      }
      if (category) {
        whereConditions.push(eq(schema.maintenanceRequests.category, category));
      }

      const tickets = await ctx.db.query.maintenanceRequests.findMany({
        where: and(...whereConditions),
        with: {
          building: true,
          flat: true,
          requestedByUser: true,
          assignedToStaff: true,
        },
        orderBy: [desc(schema.maintenanceRequests.createdAt)],
        limit,
        offset,
      });

      return tickets;
    }),

  // 2. Get Single Maintenance Request
  getMaintenanceRequestById: orgProtectedProcedure
    .input(z.object({ requestId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const ticket = await ctx.db.query.maintenanceRequests.findFirst({
        where: and(
          eq(schema.maintenanceRequests.id, input.requestId),
          eq(schema.maintenanceRequests.organizationId, ctx.organizationId),
        ),
        with: {
          building: true,
          flat: true,
          requestedByUser: true,
          assignedToStaff: true,
        },
      });

      if (!ticket) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: OPERATIONS_ERROR_CODES.TICKET_NOT_FOUND,
        });
      }

      return ticket;
    }),

  // 3. Create Maintenance Request (Admin / Manager)
  createMaintenanceRequest: orgProtectedProcedure
    .input(createMaintenanceRequestSchema)
    .mutation(async ({ ctx, input }) => {
      // Validate building belongs to this organization
      const building = await ctx.db.query.buildings.findFirst({
        where: and(
          eq(schema.buildings.id, input.buildingId),
          eq(schema.buildings.organizationId, ctx.organizationId),
        ),
      });

      if (!building) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Selected building does not belong to your organization.",
        });
      }

      // If flat is specified, verify it belongs to this building and organization
      if (input.flatId) {
        const flat = await ctx.db.query.flats.findFirst({
          where: and(
            eq(schema.flats.id, input.flatId),
            eq(schema.flats.buildingId, input.buildingId),
          ),
        });

        if (!flat) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Selected flat not found in this building.",
          });
        }
      }

      const ticketId = `ticket-${crypto.randomUUID()}`;
      const [ticket] = await ctx.db
        .insert(schema.maintenanceRequests)
        .values({
          id: ticketId,
          organizationId: ctx.organizationId,
          buildingId: input.buildingId,
          flatId: input.flatId ?? null,
          category: input.category,
          title: input.title,
          description: input.description,
          priority: input.priority,
          photoUrls: input.photoUrls,
          status: "open",
          requestedBy: ctx.user.name ?? ctx.user.email,
          requestedByUserId: ctx.user.id,
          repairCost: "0.00",
          costBilledTo: "landlord",
          resolutionPhotoUrls: [],
        })
        .returning();

      await recordAuditLog({
        db: ctx.db,
        organizationId: ctx.organizationId,
        actorId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: "MAINTENANCE_TICKET_CREATED",
        entityType: "maintenance_request",
        entityId: ticketId,
        details: {
          title: input.title,
          priority: input.priority,
          category: input.category,
          buildingId: input.buildingId,
          flatId: input.flatId,
        },
      });

      return ticket;
    }),

  // 4. Assign Staff / Caretaker to Ticket
  assignStaffToRequest: requireRole(["owner", "admin", "manager"])
    .input(assignStaffSchema)
    .mutation(async ({ ctx, input }) => {
      const ticket = await ctx.db.query.maintenanceRequests.findFirst({
        where: and(
          eq(schema.maintenanceRequests.id, input.requestId),
          eq(schema.maintenanceRequests.organizationId, ctx.organizationId),
        ),
      });

      if (!ticket) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: OPERATIONS_ERROR_CODES.TICKET_NOT_FOUND,
        });
      }

      if (ticket.status === "closed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: OPERATIONS_ERROR_CODES.TICKET_ALREADY_CLOSED,
        });
      }

      // Check if staff user is an active organization member
      const staffMember = await ctx.db.query.members.findFirst({
        where: and(
          eq(schema.members.organizationId, ctx.organizationId),
          eq(schema.members.userId, input.staffUserId),
        ),
      });

      if (!staffMember) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: OPERATIONS_ERROR_CODES.CANNOT_ASSIGN_UNCONFIRMED_STAFF,
        });
      }

      const nextStatus = ticket.status === "open" ? "assigned" : ticket.status;

      const [updated] = await ctx.db
        .update(schema.maintenanceRequests)
        .set({
          assignedToStaffId: input.staffUserId,
          status: nextStatus,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.maintenanceRequests.id, input.requestId),
            eq(schema.maintenanceRequests.organizationId, ctx.organizationId),
          ),
        )
        .returning();

      await recordAuditLog({
        db: ctx.db,
        organizationId: ctx.organizationId,
        actorId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: "MAINTENANCE_STAFF_ASSIGNED",
        entityType: "maintenance_request",
        entityId: input.requestId,
        details: {
          assignedToStaffId: input.staffUserId,
          previousStatus: ticket.status,
          newStatus: nextStatus,
        },
      });

      return updated;
    }),

  // 5. Update Ticket Status (Assigned, In Progress, Closed)
  updateRequestStatus: requireRole(["owner", "admin", "manager", "staff"])
    .input(updateRequestStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const ticket = await ctx.db.query.maintenanceRequests.findFirst({
        where: and(
          eq(schema.maintenanceRequests.id, input.requestId),
          eq(schema.maintenanceRequests.organizationId, ctx.organizationId),
        ),
      });

      if (!ticket) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: OPERATIONS_ERROR_CODES.TICKET_NOT_FOUND,
        });
      }

      if (ticket.status === "closed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: OPERATIONS_ERROR_CODES.TICKET_ALREADY_CLOSED,
        });
      }

      const isClosing = input.status === "closed";

      const [updated] = await ctx.db
        .update(schema.maintenanceRequests)
        .set({
          status: input.status,
          closedAt: isClosing ? new Date() : ticket.closedAt,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.maintenanceRequests.id, input.requestId),
            eq(schema.maintenanceRequests.organizationId, ctx.organizationId),
          ),
        )
        .returning();

      await recordAuditLog({
        db: ctx.db,
        organizationId: ctx.organizationId,
        actorId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: "MAINTENANCE_STATUS_UPDATED",
        entityType: "maintenance_request",
        entityId: input.requestId,
        details: {
          previousStatus: ticket.status,
          newStatus: input.status,
        },
      });

      return updated;
    }),

  // 6. Resolve Maintenance Ticket (Requires resolution notes, proof photos & repair cost)
  resolveMaintenanceRequest: requireRole(["owner", "admin", "manager", "staff"])
    .input(resolveMaintenanceRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const ticket = await ctx.db.query.maintenanceRequests.findFirst({
        where: and(
          eq(schema.maintenanceRequests.id, input.requestId),
          eq(schema.maintenanceRequests.organizationId, ctx.organizationId),
        ),
      });

      if (!ticket) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: OPERATIONS_ERROR_CODES.TICKET_NOT_FOUND,
        });
      }

      if (ticket.status === "closed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: OPERATIONS_ERROR_CODES.TICKET_ALREADY_CLOSED,
        });
      }

      if (!input.resolutionNotes || input.resolutionNotes.trim().length < 5) {
        throw new TRPCError({
          code: "UNPROCESSABLE_CONTENT",
          message: OPERATIONS_ERROR_CODES.RESOLUTION_NOTES_REQUIRED,
        });
      }

      const [resolved] = await ctx.db
        .update(schema.maintenanceRequests)
        .set({
          status: "resolved",
          resolutionNotes: input.resolutionNotes.trim(),
          repairCost: input.repairCost,
          costBilledTo: input.costBilledTo,
          resolutionPhotoUrls: input.resolutionPhotoUrls,
          resolvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.maintenanceRequests.id, input.requestId),
            eq(schema.maintenanceRequests.organizationId, ctx.organizationId),
          ),
        )
        .returning();

      await recordAuditLog({
        db: ctx.db,
        organizationId: ctx.organizationId,
        actorId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: "MAINTENANCE_TICKET_RESOLVED",
        entityType: "maintenance_request",
        entityId: input.requestId,
        details: {
          repairCost: input.repairCost,
          costBilledTo: input.costBilledTo,
          resolutionNotes: input.resolutionNotes.trim(),
        },
      });

      return resolved;
    }),

  // 7. List Building Notices (Admin / Manager)
  listNotices: orgProtectedProcedure
    .input(
      z
        .object({
          buildingId: z.string().optional(),
          activeOnly: z.boolean().default(true),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const buildingId = input?.buildingId;
      const activeOnly = input?.activeOnly ?? true;

      const whereConditions = [eq(schema.notices.organizationId, ctx.organizationId)];

      if (buildingId) {
        const buildingFilter = or(
          eq(schema.notices.targetBuildingId, buildingId),
          isNull(schema.notices.targetBuildingId),
        );
        if (buildingFilter) whereConditions.push(buildingFilter);
      }

      if (activeOnly) {
        const now = new Date();
        const activeFilter = or(
          isNull(schema.notices.expiresAt),
          gte(schema.notices.expiresAt, now),
        );
        if (activeFilter) whereConditions.push(activeFilter);
      }

      const noticesList = await ctx.db.query.notices.findMany({
        where: and(...whereConditions),
        with: {
          authorUser: true,
          targetBuilding: true,
        },
        orderBy: [desc(schema.notices.isPinned), desc(schema.notices.createdAt)],
      });

      return noticesList;
    }),

  // 8. Create Building Notice
  createNotice: requireRole(["owner", "admin", "manager"])
    .input(createNoticeSchema)
    .mutation(async ({ ctx, input }) => {
      const noticeId = `notice-${crypto.randomUUID()}`;
      const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;

      const [notice] = await ctx.db
        .insert(schema.notices)
        .values({
          id: noticeId,
          organizationId: ctx.organizationId,
          title: input.title,
          body: input.body,
          targetAudience: input.targetAudience,
          targetBuildingId: input.targetBuildingId ?? null,
          targetFlatId: input.targetFlatId ?? null,
          isPinned: input.isPinned,
          authorUserId: ctx.user.id,
          expiresAt,
        })
        .returning();

      await recordAuditLog({
        db: ctx.db,
        organizationId: ctx.organizationId,
        actorId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: "NOTICE_CREATED",
        entityType: "notice",
        entityId: noticeId,
        details: {
          title: input.title,
          targetAudience: input.targetAudience,
          targetBuildingId: input.targetBuildingId,
          isPinned: input.isPinned,
        },
      });

      return notice;
    }),

  // 9. Pin / Unpin Notice
  pinNotice: requireRole(["owner", "admin", "manager"])
    .input(pinNoticeSchema)
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(schema.notices)
        .set({
          isPinned: input.isPinned,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.notices.id, input.noticeId),
            eq(schema.notices.organizationId, ctx.organizationId),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Notice not found.",
        });
      }

      await recordAuditLog({
        db: ctx.db,
        organizationId: ctx.organizationId,
        actorId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: "NOTICE_PINNED",
        entityType: "notice",
        entityId: input.noticeId,
        details: { isPinned: input.isPinned },
      });

      return updated;
    }),

  // 10. Delete Notice
  deleteNotice: requireRole(["owner", "admin", "manager"])
    .input(z.object({ noticeId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(schema.notices)
        .where(
          and(
            eq(schema.notices.id, input.noticeId),
            eq(schema.notices.organizationId, ctx.organizationId),
          ),
        )
        .returning();

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Notice not found.",
        });
      }

      await recordAuditLog({
        db: ctx.db,
        organizationId: ctx.organizationId,
        actorId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: "NOTICE_DELETED",
        entityType: "notice",
        entityId: input.noticeId,
        details: { title: deleted.title },
      });

      return { success: true };
    }),

  // 11. Renter Portal: Get Current User's Maintenance Requests
  getMyMaintenanceRequests: protectedProcedure.query(async ({ ctx }) => {
    const renter = await ctx.db.query.renters.findFirst({
      where: eq(schema.renters.userId, ctx.user.id),
      with: {
        flat: {
          with: {
            building: true,
          },
        },
      },
    });

    const whereConditions = [eq(schema.maintenanceRequests.requestedByUserId, ctx.user.id)];

    if (renter?.flatId) {
      whereConditions.push(eq(schema.maintenanceRequests.flatId, renter.flatId));
    }

    const tickets = await ctx.db.query.maintenanceRequests.findMany({
      where: or(...whereConditions),
      with: {
        building: true,
        flat: true,
        assignedToStaff: true,
      },
      orderBy: [desc(schema.maintenanceRequests.createdAt)],
    });

    return tickets;
  }),

  // 12. Renter Portal: Get Single Maintenance Ticket (Strict Isolation)
  getMyMaintenanceRequestById: protectedProcedure
    .input(z.object({ requestId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const renter = await ctx.db.query.renters.findFirst({
        where: eq(schema.renters.userId, ctx.user.id),
      });

      const ticket = await ctx.db.query.maintenanceRequests.findFirst({
        where: eq(schema.maintenanceRequests.id, input.requestId),
        with: {
          building: true,
          flat: true,
          assignedToStaff: true,
        },
      });

      if (!ticket) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: OPERATIONS_ERROR_CODES.TICKET_NOT_FOUND,
        });
      }

      const isRequester = ticket.requestedByUserId === ctx.user.id;
      const isMyFlat = renter?.flatId && ticket.flatId === renter.flatId;

      if (!isRequester && !isMyFlat) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: OPERATIONS_ERROR_CODES.FORBIDDEN_TICKET_ACCESS,
        });
      }

      return ticket;
    }),

  // 13. Renter Portal: Create Maintenance Request
  createMyMaintenanceRequest: protectedProcedure
    .input(
      z.object({
        category: maintenanceCategoryEnum.default("general"),
        title: z
          .string()
          .trim()
          .min(3, "Title must be at least 3 characters")
          .max(120, "Title cannot exceed 120 characters"),
        description: z
          .string()
          .trim()
          .min(10, "Description must be at least 10 characters")
          .max(2000),
        priority: maintenancePriorityEnum.default("medium"),
        photoUrls: z.array(z.string().url()).max(5).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const renter = await ctx.db.query.renters.findFirst({
        where: eq(schema.renters.userId, ctx.user.id),
        with: {
          flat: true,
        },
      });

      if (!renter?.flatId || !renter.flat) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No active apartment tenancy found associated with your profile.",
        });
      }

      const ticketId = `ticket-${crypto.randomUUID()}`;
      const [ticket] = await ctx.db
        .insert(schema.maintenanceRequests)
        .values({
          id: ticketId,
          organizationId: renter.organizationId,
          buildingId: renter.flat.buildingId,
          flatId: renter.flatId,
          category: input.category,
          title: input.title,
          description: input.description,
          priority: input.priority,
          photoUrls: input.photoUrls,
          status: "open",
          requestedBy: renter.fullName,
          requestedByUserId: ctx.user.id,
          repairCost: "0.00",
          costBilledTo: "landlord",
          resolutionPhotoUrls: [],
        })
        .returning();

      await recordAuditLog({
        db: ctx.db,
        organizationId: renter.organizationId,
        actorId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: "TENANT_MAINTENANCE_SUBMITTED",
        entityType: "maintenance_request",
        entityId: ticketId,
        details: {
          title: input.title,
          flatId: renter.flatId,
          priority: input.priority,
        },
      });

      return ticket;
    }),

  // 14. Renter Portal: Get Building Notices (Strict Targeting & Expiration Filter)
  getMyNotices: protectedProcedure.query(async ({ ctx }) => {
    const renter = await ctx.db.query.renters.findFirst({
      where: eq(schema.renters.userId, ctx.user.id),
      with: {
        flat: true,
      },
    });

    if (!renter) {
      return [];
    }

    const now = new Date();

    // Renter should only see notices targeted to all renters, or their specific building/flat
    const targetConditions = [eq(schema.notices.targetAudience, "all_renters")];

    if (renter.flat?.buildingId) {
      const bFilter = and(
        eq(schema.notices.targetAudience, "specific_building"),
        eq(schema.notices.targetBuildingId, renter.flat.buildingId),
      );
      if (bFilter) targetConditions.push(bFilter);
    }

    if (renter.flatId) {
      const fFilter = and(
        eq(schema.notices.targetAudience, "specific_flat"),
        eq(schema.notices.targetFlatId, renter.flatId),
      );
      if (fFilter) targetConditions.push(fFilter);
    }

    const activeFilter = or(isNull(schema.notices.expiresAt), gte(schema.notices.expiresAt, now));

    const whereConditions = [
      eq(schema.notices.organizationId, renter.organizationId),
      or(...targetConditions),
    ];
    if (activeFilter) whereConditions.push(activeFilter);

    const noticesList = await ctx.db.query.notices.findMany({
      where: and(...whereConditions),
      with: {
        authorUser: true,
        targetBuilding: true,
      },
      orderBy: [desc(schema.notices.isPinned), desc(schema.notices.createdAt)],
    });

    return noticesList;
  }),
});
