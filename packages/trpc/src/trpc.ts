import type { Session } from "@omniheaven/auth";
import { and, type Database, eq, type OrganizationRole, schema } from "@omniheaven/db";
import { initTRPC, TRPCError } from "@trpc/server";
import { ZodError } from "zod";

export interface TRPCContext {
  db: Database;
  session: Session | null;
  organizationId?: string | null;
  requestId: string;
}

const t = initTRPC.context<TRPCContext>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Middleware ensuring user is signed in
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to access this resource",
    });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.session.user,
    },
  });
});

// Middleware ensuring user is operating within an active organization and has verified membership
export const orgProtectedProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const orgId = ctx.organizationId || ctx.session.session?.activeOrganizationId;
  if (!orgId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Active organization context (x-organization-id) is required",
    });
  }

  // Verify membership in database
  const membership = await ctx.db.query.members.findFirst({
    where: and(eq(schema.members.organizationId, orgId), eq(schema.members.userId, ctx.user.id)),
  });

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "User is not an authorized member of the requested organization",
    });
  }

  return next({
    ctx: {
      ...ctx,
      organizationId: orgId,
      role: membership.role as OrganizationRole,
      membership,
    },
  });
});

// Backward-compatible alias
export const tenantProcedure = orgProtectedProcedure;

// Middleware restricting procedure to specific roles
export const requireRole = (allowedRoles: OrganizationRole[]) =>
  orgProtectedProcedure.use(({ ctx, next }) => {
    if (!allowedRoles.includes(ctx.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `This action requires one of the following roles: ${allowedRoles.join(", ")}`,
      });
    }
    return next({ ctx });
  });
