import { RATE_LIMIT_PRESETS } from "@omniheaven/rate-limit";
import {
  assignStaffSchema,
  createMaintenanceRequestSchema,
  createNoticeSchema,
  maintenanceCategoryEnum,
  maintenancePriorityEnum,
  maintenanceStatusEnum,
  pinNoticeSchema,
  resolveMaintenanceRequestSchema,
  updateRequestStatusSchema,
} from "@omniheaven/validators";
import { z } from "zod";
import * as operationsService from "../services/operations.service";
import {
  orgProtectedProcedure,
  portalProcedure,
  protectedProcedure,
  publicRateLimitKey,
  requireRole,
  router,
  trpcRateLimit,
} from "../trpc";

export const operationsRouter = router({
  // 1. List Maintenance Requests (Admin / Manager)
  listMaintenanceRequests: orgProtectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/operations/maintenance",
        tags: ["Operations"],
        summary: "List maintenance requests with multi-attribute filtering",
      },
    })
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
      return operationsService.listMaintenanceRequests(ctx.db, ctx.organizationId, input);
    }),

  // 2. Get Single Maintenance Request
  getMaintenanceRequestById: orgProtectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/operations/maintenance/{requestId}",
        tags: ["Operations"],
        summary: "Get maintenance ticket details",
      },
    })
    .input(z.object({ requestId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return operationsService.getMaintenanceRequestById(
        ctx.db,
        ctx.organizationId,
        input.requestId,
      );
    }),

  // 3. Create Maintenance Request (Admin / Manager)
  createMaintenanceRequest: orgProtectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/operations/maintenance",
        tags: ["Operations"],
        summary: "Create a maintenance request",
      },
    })
    .input(createMaintenanceRequestSchema)
    .mutation(async ({ ctx, input }) => {
      return operationsService.createMaintenanceRequest(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email, name: ctx.user.name },
        input,
      );
    }),

  // 4. Assign Staff / Caretaker to Ticket
  assignStaffToRequest: requireRole(["owner", "admin", "manager"])
    .meta({
      openapi: {
        method: "PATCH",
        path: "/v1/operations/maintenance/{requestId}/assign",
        tags: ["Operations"],
        summary: "Assign staff or caretaker to maintenance ticket",
      },
    })
    .input(assignStaffSchema)
    .mutation(async ({ ctx, input }) => {
      return operationsService.assignStaffToRequest(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email, name: ctx.user.name },
        input,
      );
    }),

  // 5. Update Ticket Status (Assigned, In Progress, Closed)
  updateRequestStatus: requireRole(["owner", "admin", "manager", "staff"])
    .meta({
      openapi: {
        method: "PATCH",
        path: "/v1/operations/maintenance/{requestId}/status",
        tags: ["Operations"],
        summary: "Update maintenance ticket operational status",
      },
    })
    .input(updateRequestStatusSchema)
    .mutation(async ({ ctx, input }) => {
      return operationsService.updateRequestStatus(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email, name: ctx.user.name },
        input,
      );
    }),

  // 6. Resolve Maintenance Ticket (Requires resolution notes, proof photos & repair cost)
  resolveMaintenanceRequest: requireRole(["owner", "admin", "manager", "staff"])
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/operations/maintenance/{requestId}/resolve",
        tags: ["Operations"],
        summary: "Resolve maintenance ticket with repair costs and proof photos",
      },
    })
    .input(resolveMaintenanceRequestSchema)
    .mutation(async ({ ctx, input }) => {
      return operationsService.resolveMaintenanceRequest(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email, name: ctx.user.name },
        input,
      );
    }),

  // 7. List Building Notices (Admin / Manager)
  listNotices: orgProtectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/operations/notices",
        tags: ["Operations"],
        summary: "List building notices with expiration filtering",
      },
    })
    .input(
      z
        .object({
          buildingId: z.string().optional(),
          activeOnly: z.boolean().default(true),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return operationsService.listNotices(ctx.db, ctx.organizationId, input);
    }),

  // 8. Create Building Notice
  createNotice: requireRole(["owner", "admin", "manager"])
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/operations/notices",
        tags: ["Operations"],
        summary: "Broadcast a building notice",
      },
    })
    .input(createNoticeSchema)
    .mutation(async ({ ctx, input }) => {
      return operationsService.createNotice(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email, name: ctx.user.name },
        input,
      );
    }),

  // 9. Pin / Unpin Notice
  pinNotice: requireRole(["owner", "admin", "manager"])
    .meta({
      openapi: {
        method: "PATCH",
        path: "/v1/operations/notices/{noticeId}/pin",
        tags: ["Operations"],
        summary: "Pin or unpin a building notice",
      },
    })
    .input(pinNoticeSchema)
    .mutation(async ({ ctx, input }) => {
      return operationsService.pinNotice(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email, name: ctx.user.name },
        input,
      );
    }),

  // 10. Delete Notice
  deleteNotice: requireRole(["owner", "admin", "manager"])
    .meta({
      openapi: {
        method: "DELETE",
        path: "/v1/operations/notices/{noticeId}",
        tags: ["Operations"],
        summary: "Delete a building notice",
      },
    })
    .input(z.object({ noticeId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return operationsService.deleteNotice(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email, name: ctx.user.name },
        input.noticeId,
      );
    }),

  // 11. Renter Portal: Get Current User's Maintenance Requests
  getMyMaintenanceRequests: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/portal/maintenance",
        tags: ["Tenant Portal"],
        summary: "Get current tenant's maintenance requests",
      },
    })
    .query(async ({ ctx }) => {
      return operationsService.getMyMaintenanceRequests(ctx.db, ctx.user.id);
    }),

  // 12. Renter Portal: Get Single Maintenance Ticket (Strict Isolation)
  getMyMaintenanceRequestById: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/portal/maintenance/{requestId}",
        tags: ["Tenant Portal"],
        summary: "Get single maintenance ticket for tenant",
      },
    })
    .input(z.object({ requestId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return operationsService.getMyMaintenanceRequestById(ctx.db, ctx.user.id, input.requestId);
    }),

  // 13. Renter Portal: Create Maintenance Request
  createMyMaintenanceRequest: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/portal/maintenance",
        tags: ["Tenant Portal"],
        summary: "Submit tenant maintenance request",
      },
    })
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
      return operationsService.createMyMaintenanceRequest(
        ctx.db,
        { id: ctx.user.id, email: ctx.user.email },
        input,
      );
    }),

  // 14. Renter Portal: Get Building Notices (Strict Targeting & Expiration Filter)
  getMyNotices: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/portal/notices",
        tags: ["Tenant Portal"],
        summary: "Get tenant targeted building notices",
      },
    })
    .query(async ({ ctx }) => {
      return operationsService.getMyNotices(ctx.db, ctx.user.id);
    }),

  // 15. Renter Portal: Create Maintenance Request (flat-scoped portal token required)
  createPortalMaintenanceRequest: portalProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/portal/maintenance/create",
        tags: ["Tenant Portal"],
        summary: "Submit maintenance request from the authenticated resident portal",
      },
    })
    .use(
      trpcRateLimit({
        config: RATE_LIMIT_PRESETS.MUTATIONS_STANDARD,
        keyGenerator: (ctx) => publicRateLimitKey(ctx, "portal-maint"),
      }),
    )
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
      return operationsService.createPortalMaintenanceRequest(ctx.db, ctx.portal, input);
    }),
});
