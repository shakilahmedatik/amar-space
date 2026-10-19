import { RATE_LIMIT_PRESETS } from "@omniheaven/rate-limit";
import {
  acceptInvitationSchema,
  createOrganizationSchema,
  inviteMemberSchema,
  removeMemberSchema,
  updateMemberRoleSchema,
  updateOrganizationSchema,
  updateWebsiteBuilderConfigSchema,
} from "@omniheaven/validators";
import { z } from "zod";
import * as organizationService from "../services/organization.service";
import {
  orgProtectedProcedure,
  protectedProcedure,
  publicProcedure,
  requireRole,
  router,
  tenantProcedure,
  trpcRateLimit,
} from "../trpc";

export const organizationRouter = router({
  // 1. Get active organization details
  getActiveOrganization: orgProtectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/organization/active",
        tags: ["Organization"],
        summary: "Get active organization details and current user role",
      },
    })
    .query(async ({ ctx }) => {
      return organizationService.getActiveOrganization(ctx.db, ctx.organizationId, ctx.role);
    }),

  // Backward compatible alias
  getCurrent: tenantProcedure.query(async ({ ctx }) => {
    return organizationService.getActiveOrganization(ctx.db, ctx.organizationId, ctx.role);
  }),

  // 2. Public lookup by slug (for tenant portals / public website)
  getBySlug: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/organization/by-slug/{slug}",
        tags: ["Organization"],
        summary: "Public organization profile lookup by slug",
      },
    })
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return organizationService.getBySlug(ctx.db, input.slug);
    }),

  // 2b. Check if an organization slug is available (used for real-time form validation)
  checkSlugAvailability: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/organization/check-slug",
        tags: ["Organization"],
        summary: "Check if an organization slug is available",
      },
    })
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return organizationService.checkSlugAvailability(ctx.db, input.slug);
    }),

  // 3. List all organizations the current authenticated user belongs to
  listMyOrganizations: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/organization/my",
        tags: ["Organization"],
        summary: "List all organizations the user is a member of",
      },
    })
    .query(async ({ ctx }) => {
      return organizationService.listMyOrganizations(ctx.db, ctx.user.id);
    }),

  // 4. Create a new organization and assign caller as sole initial owner
  create: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/organization",
        tags: ["Organization"],
        summary: "Create a new organization workspace",
      },
    })
    .input(createOrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      return organizationService.createOrganization(
        ctx.db,
        { id: ctx.user.id, email: ctx.user.email },
        input,
      );
    }),

  // 5. Update organization settings (Owners & Admins only)
  update: requireRole(["owner", "admin"])
    .meta({
      openapi: {
        method: "PATCH",
        path: "/v1/organization/active",
        tags: ["Organization"],
        summary: "Update active organization branding and details",
      },
    })
    .input(updateOrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      return organizationService.updateOrganization(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email },
        input,
      );
    }),

  // 6. Switch active organization in session
  switchActive: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/organization/switch",
        tags: ["Organization"],
        summary: "Switch active organization in session",
      },
    })
    .input(z.object({ organizationId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return organizationService.switchActiveOrganization(
        ctx.db,
        ctx.user.id,
        ctx.session?.session?.id,
        input.organizationId,
      );
    }),

  // 7. List members of the active organization
  listMembers: orgProtectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/organization/members",
        tags: ["Organization"],
        summary: "List members of active organization",
      },
    })
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().min(0).default(0),
        })
        .default({ limit: 50, offset: 0 }),
    )
    .query(async ({ ctx, input }) => {
      return organizationService.listMembers(ctx.db, ctx.organizationId, input);
    }),

  // 8. List pending and past invitations for the active organization
  listInvitations: requireRole(["owner", "admin", "manager"])
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/organization/invitations",
        tags: ["Organization"],
        summary: "List organization invitations",
      },
    })
    .query(async ({ ctx }) => {
      return organizationService.listInvitations(ctx.db, ctx.organizationId);
    }),

  // 9. Invite a new team member (Rate limit: max 10 invites per hour per user)
  inviteMember: requireRole(["owner", "admin"])
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/organization/invitations",
        tags: ["Organization"],
        summary: "Invite team member to organization",
      },
    })
    .use(
      trpcRateLimit({
        config: RATE_LIMIT_PRESETS.INVITATIONS,
        keyGenerator: (ctx) => `invitations:${ctx.user.id}`,
      }),
    )
    .input(inviteMemberSchema)
    .mutation(async ({ ctx, input }) => {
      return organizationService.inviteMember(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email, name: ctx.user.name },
        input,
      );
    }),

  // 10. Accept an invitation (User must be logged in with matching email)
  acceptInvitation: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/organization/invitations/accept",
        tags: ["Organization"],
        summary: "Accept pending organization invitation",
      },
    })
    .input(acceptInvitationSchema)
    .mutation(async ({ ctx, input }) => {
      return organizationService.acceptInvitation(
        ctx.db,
        { id: ctx.user.id, email: ctx.user.email },
        input,
      );
    }),

  // 11. Update team member role with sole-owner protection
  updateMemberRole: requireRole(["owner", "admin"])
    .meta({
      openapi: {
        method: "PATCH",
        path: "/v1/organization/members/role",
        tags: ["Organization"],
        summary: "Update member role with sole-owner protection",
      },
    })
    .input(updateMemberRoleSchema)
    .mutation(async ({ ctx, input }) => {
      return organizationService.updateMemberRole(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email, role: ctx.role },
        input,
      );
    }),

  // 12. Remove a member from the organization
  removeMember: requireRole(["owner", "admin"])
    .meta({
      openapi: {
        method: "DELETE",
        path: "/v1/organization/members",
        tags: ["Organization"],
        summary: "Remove member from organization",
      },
    })
    .input(removeMemberSchema)
    .mutation(async ({ ctx, input }) => {
      return organizationService.removeMember(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email, role: ctx.role },
        input,
      );
    }),

  // 13. Get website builder configuration for active organization
  getWebsiteConfig: tenantProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/organization/website-config",
        tags: ["Organization"],
        summary: "Get website builder configuration for active organization",
      },
    })
    .query(async ({ ctx }) => {
      return organizationService.getWebsiteConfig(ctx.db, ctx.organizationId);
    }),

  // 14. Update website builder configuration
  updateWebsiteConfig: requireRole(["owner", "admin"])
    .meta({
      openapi: {
        method: "PUT",
        path: "/v1/organization/website-config",
        tags: ["Organization"],
        summary: "Update website builder configuration",
      },
    })
    .input(updateWebsiteBuilderConfigSchema)
    .mutation(async ({ ctx, input }) => {
      return organizationService.updateWebsiteConfig(
        ctx.db,
        ctx.organizationId,
        ctx.user,
        input,
      );
    }),
});

