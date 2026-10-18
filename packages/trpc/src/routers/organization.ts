import {
  and,
  DomainInvariantError,
  desc,
  ensureOrganizationHasOwner,
  eq,
  schema,
} from "@omniheaven/db";
import { RATE_LIMIT_PRESETS } from "@omniheaven/rate-limit";
import {
  acceptInvitationSchema,
  createOrganizationSchema,
  inviteMemberSchema,
  ORG_ERROR_CODES,
  removeMemberSchema,
  updateMemberRoleSchema,
  updateOrganizationSchema,
} from "@omniheaven/validators";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  orgProtectedProcedure,
  protectedProcedure,
  publicProcedure,
  requireRole,
  router,
  tenantProcedure,
  trpcRateLimit,
} from "../trpc";
import { recordAuditLog } from "../utils/audit";

export const organizationRouter = router({
  // 1. Get active organization details
  getActiveOrganization: orgProtectedProcedure.query(async ({ ctx }) => {
    const org = await ctx.db.query.organizations.findFirst({
      where: eq(schema.organizations.id, ctx.organizationId),
      with: {
        subscription: true,
        websiteConfig: true,
      },
    });

    if (!org) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: ORG_ERROR_CODES.ORG_NOT_FOUND,
      });
    }

    return {
      ...org,
      currentRole: ctx.role,
    };
  }),

  // Backward compatible alias
  getCurrent: tenantProcedure.query(async ({ ctx }) => {
    const org = await ctx.db.query.organizations.findFirst({
      where: eq(schema.organizations.id, ctx.organizationId),
      with: {
        subscription: true,
        websiteConfig: true,
      },
    });

    if (!org) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: ORG_ERROR_CODES.ORG_NOT_FOUND,
      });
    }

    return org;
  }),

  // 2. Public lookup by slug (for tenant portals / public website)
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const org = await ctx.db.query.organizations.findFirst({
        where: eq(schema.organizations.slug, input.slug),
        with: {
          websiteConfig: true,
          roomTypes: true,
        },
      });

      if (!org) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found for slug",
        });
      }

      return org;
    }),

  // 3. List all organizations the current authenticated user belongs to
  listMyOrganizations: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.db.query.members.findMany({
      where: eq(schema.members.userId, ctx.user.id),
      with: {
        organization: {
          with: {
            subscription: true,
          },
        },
      },
      orderBy: [desc(schema.members.createdAt)],
    });

    return memberships.map((m) => ({
      ...m.organization,
      role: m.role,
      joinedAt: m.createdAt,
    }));
  }),

  // 4. Create a new organization and assign caller as sole initial owner
  create: protectedProcedure.input(createOrganizationSchema).mutation(async ({ ctx, input }) => {
    // Check slug uniqueness
    const existing = await ctx.db.query.organizations.findFirst({
      where: eq(schema.organizations.slug, input.slug),
    });

    if (existing) {
      throw new TRPCError({
        code: "CONFLICT",
        message: ORG_ERROR_CODES.ORG_SLUG_TAKEN,
      });
    }

    const orgId = crypto.randomUUID();
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000); // 6 months trial

    return await ctx.db.transaction(async (tx) => {
      // Create organization
      const [newOrg] = await tx
        .insert(schema.organizations)
        .values({
          id: orgId,
          name: input.name,
          slug: input.slug,
          productType: input.productType,
          logo: input.logo,
          contactPhone: input.contactPhone,
          contactEmail: input.contactEmail,
          address: input.address,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      // Assign current user as owner
      await tx.insert(schema.members).values({
        id: crypto.randomUUID(),
        organizationId: orgId,
        userId: ctx.user.id,
        role: "owner",
        createdAt: now,
      });

      // Set up initial 6-month trial subscription
      await tx.insert(schema.subscriptions).values({
        id: crypto.randomUUID(),
        organizationId: orgId,
        plan: "trial_6_month",
        status: "trialing",
        trialStartsAt: now,
        trialEndsAt: trialEndsAt,
        paymentProvider: "paystation",
        createdAt: now,
        updatedAt: now,
      });

      // Emit audit log
      await recordAuditLog({
        db: tx,
        organizationId: orgId,
        actorId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: "ORGANIZATION_CREATED",
        entityType: "organization",
        entityId: orgId,
        details: { name: input.name, slug: input.slug, productType: input.productType },
      });

      return newOrg;
    });
  }),

  // 5. Update organization settings (Owners & Admins only)
  update: requireRole(["owner", "admin"])
    .input(updateOrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      const now = new Date();

      const [updatedOrg] = await ctx.db
        .update(schema.organizations)
        .set({
          ...(input.name ? { name: input.name } : {}),
          ...(input.logo !== undefined ? { logo: input.logo } : {}),
          ...(input.contactPhone !== undefined ? { contactPhone: input.contactPhone } : {}),
          ...(input.contactEmail !== undefined ? { contactEmail: input.contactEmail } : {}),
          ...(input.address !== undefined ? { address: input.address } : {}),
          ...(input.customDomain !== undefined ? { customDomain: input.customDomain } : {}),
          updatedAt: now,
        })
        .where(eq(schema.organizations.id, ctx.organizationId))
        .returning();

      await recordAuditLog({
        db: ctx.db,
        organizationId: ctx.organizationId,
        actorId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: "ORGANIZATION_UPDATED",
        entityType: "organization",
        entityId: ctx.organizationId,
        details: input,
      });

      return updatedOrg;
    }),

  // 6. Switch active organization in session
  switchActive: protectedProcedure
    .input(z.object({ organizationId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // Verify user has membership in target organization
      const membership = await ctx.db.query.members.findFirst({
        where: and(
          eq(schema.members.organizationId, input.organizationId),
          eq(schema.members.userId, ctx.user.id),
        ),
        with: {
          organization: true,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: ORG_ERROR_CODES.ORG_FORBIDDEN,
        });
      }

      // Update session activeOrganizationId in database
      if (ctx.session?.session?.id) {
        await ctx.db
          .update(schema.sessions)
          .set({ activeOrganizationId: input.organizationId, updatedAt: new Date() })
          .where(eq(schema.sessions.id, ctx.session.session.id));
      }

      return {
        success: true,
        activeOrganization: membership.organization,
        role: membership.role,
      };
    }),

  // 7. List members of the active organization
  listMembers: orgProtectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().min(0).default(0),
        })
        .default({ limit: 50, offset: 0 }),
    )
    .query(async ({ ctx, input }) => {
      const memberList = await ctx.db.query.members.findMany({
        where: eq(schema.members.organizationId, ctx.organizationId),
        with: {
          user: true,
        },
        limit: input.limit,
        offset: input.offset,
        orderBy: [desc(schema.members.createdAt)],
      });

      return memberList.map((m) => ({
        id: m.id,
        role: m.role,
        createdAt: m.createdAt,
        user: {
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          image: m.user.image,
        },
      }));
    }),

  // 8. List pending and past invitations for the active organization
  listInvitations: requireRole(["owner", "admin", "manager"]).query(async ({ ctx }) => {
    const invites = await ctx.db.query.invitations.findMany({
      where: eq(schema.invitations.organizationId, ctx.organizationId),
      with: {
        inviter: true,
      },
      orderBy: [desc(schema.invitations.createdAt)],
    });

    return invites.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      status: inv.status,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
      inviter: {
        id: inv.inviter.id,
        name: inv.inviter.name,
        email: inv.inviter.email,
      },
    }));
  }),

  // 9. Invite a new team member (Rate limit: max 10 invites per hour per user)
  inviteMember: requireRole(["owner", "admin"])
    .use(
      trpcRateLimit({
        config: RATE_LIMIT_PRESETS.INVITATIONS,
        keyGenerator: (ctx) => `invitations:${ctx.user.id}`,
      }),
    )
    .input(inviteMemberSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if user is already a member
      const existingUser = await ctx.db.query.users.findFirst({
        where: eq(schema.users.email, input.email),
      });

      if (existingUser) {
        const existingMember = await ctx.db.query.members.findFirst({
          where: and(
            eq(schema.members.organizationId, ctx.organizationId),
            eq(schema.members.userId, existingUser.id),
          ),
        });

        if (existingMember) {
          throw new TRPCError({
            code: "CONFLICT",
            message: ORG_ERROR_CODES.MEMBER_ALREADY_EXISTS,
          });
        }
      }

      const inviteId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000);

      const [invitation] = await ctx.db
        .insert(schema.invitations)
        .values({
          id: inviteId,
          organizationId: ctx.organizationId,
          email: input.email,
          role: input.role,
          status: "pending",
          expiresAt,
          inviterId: ctx.user.id,
          createdAt: new Date(),
        })
        .returning();

      await recordAuditLog({
        db: ctx.db,
        organizationId: ctx.organizationId,
        actorId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: "MEMBER_INVITED",
        entityType: "invitation",
        entityId: inviteId,
        details: { email: input.email, role: input.role, expiresAt },
      });

      return invitation;
    }),

  // 10. Accept an invitation (User must be logged in with matching email)
  acceptInvitation: protectedProcedure
    .input(acceptInvitationSchema)
    .mutation(async ({ ctx, input }) => {
      const invitation = await ctx.db.query.invitations.findFirst({
        where: eq(schema.invitations.id, input.invitationId),
      });

      if (invitation?.status !== "pending") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found or no longer active",
        });
      }

      if (new Date() > invitation.expiresAt) {
        await ctx.db
          .update(schema.invitations)
          .set({ status: "canceled" })
          .where(eq(schema.invitations.id, invitation.id));

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: ORG_ERROR_CODES.INVITATION_EXPIRED,
        });
      }

      return await ctx.db.transaction(async (tx) => {
        // Check if member already exists
        const existingMember = await tx.query.members.findFirst({
          where: and(
            eq(schema.members.organizationId, invitation.organizationId),
            eq(schema.members.userId, ctx.user.id),
          ),
        });

        if (!existingMember) {
          await tx.insert(schema.members).values({
            id: crypto.randomUUID(),
            organizationId: invitation.organizationId,
            userId: ctx.user.id,
            role: invitation.role,
            createdAt: new Date(),
          });
        }

        // Mark invitation as accepted
        await tx
          .update(schema.invitations)
          .set({ status: "accepted" })
          .where(eq(schema.invitations.id, invitation.id));

        await recordAuditLog({
          db: tx,
          organizationId: invitation.organizationId,
          actorId: ctx.user.id,
          actorEmail: ctx.user.email,
          action: "INVITATION_ACCEPTED",
          entityType: "invitation",
          entityId: invitation.id,
          details: { role: invitation.role },
        });

        return {
          success: true,
          organizationId: invitation.organizationId,
        };
      });
    }),

  // 11. Update team member role with sole-owner protection
  updateMemberRole: requireRole(["owner", "admin"])
    .input(updateMemberRoleSchema)
    .mutation(async ({ ctx, input }) => {
      const targetMember = await ctx.db.query.members.findFirst({
        where: and(
          eq(schema.members.id, input.memberId),
          eq(schema.members.organizationId, ctx.organizationId),
        ),
      });

      if (!targetMember) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: ORG_ERROR_CODES.MEMBER_NOT_FOUND,
        });
      }

      // Admin cannot modify an Owner or promote someone to Owner
      if (ctx.role === "admin" && (targetMember.role === "owner" || input.newRole === "owner")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admins cannot modify or assign the owner role",
        });
      }

      // Sole-owner invariant check: if target is owner and role is changing
      if (targetMember.role === "owner" && input.newRole !== "owner") {
        try {
          await ensureOrganizationHasOwner(ctx.db, ctx.organizationId, targetMember.userId);
        } catch (err) {
          if (err instanceof DomainInvariantError) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: err.message,
            });
          }
          throw err;
        }
      }

      const [updatedMember] = await ctx.db
        .update(schema.members)
        .set({ role: input.newRole })
        .where(eq(schema.members.id, input.memberId))
        .returning();

      await recordAuditLog({
        db: ctx.db,
        organizationId: ctx.organizationId,
        actorId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: "MEMBER_ROLE_UPDATED",
        entityType: "member",
        entityId: input.memberId,
        details: { previousRole: targetMember.role, newRole: input.newRole },
      });

      return updatedMember;
    }),

  // 12. Remove a member from the organization
  removeMember: requireRole(["owner", "admin"])
    .input(removeMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const targetMember = await ctx.db.query.members.findFirst({
        where: and(
          eq(schema.members.id, input.memberId),
          eq(schema.members.organizationId, ctx.organizationId),
        ),
      });

      if (!targetMember) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: ORG_ERROR_CODES.MEMBER_NOT_FOUND,
        });
      }

      // Admin cannot remove an Owner
      if (ctx.role === "admin" && targetMember.role === "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admins cannot remove an owner",
        });
      }

      // Sole-owner invariant check
      try {
        await ensureOrganizationHasOwner(ctx.db, ctx.organizationId, targetMember.userId);
      } catch (err) {
        if (err instanceof DomainInvariantError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: err.message,
          });
        }
        throw err;
      }

      await ctx.db.delete(schema.members).where(eq(schema.members.id, input.memberId));

      await recordAuditLog({
        db: ctx.db,
        organizationId: ctx.organizationId,
        actorId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: "MEMBER_REMOVED",
        entityType: "member",
        entityId: input.memberId,
        details: { removedUserId: targetMember.userId, previousRole: targetMember.role },
      });

      return { success: true };
    }),
});
