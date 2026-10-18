import type { Session } from "@omniheaven/auth";
import { and, type Database, eq, type OrganizationRole, schema } from "@omniheaven/db";
import { defaultLimiter, type RateLimitConfig } from "@omniheaven/rate-limit";
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

  // Verify organization is not suspended
  let organization: any = null;
  if (ctx.db.query?.organizations?.findFirst) {
    const org = await ctx.db.query.organizations.findFirst({
      where: eq(schema.organizations.id, orgId),
    });
    organization = org;

    if (org?.status === "suspended") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "ORG_SUSPENDED: Organization has been suspended by platform administration. Contact support@omniheaven.com",
      });
    }
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
      organization,
      role: membership.role as OrganizationRole,
      membership,
    },
  });
});

// Middleware ensuring user is a global platform superadministrator
export const superadminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  let userRole = (ctx.user as any)?.globalRole;
  if (!userRole && ctx.user?.id) {
    const dbUser = await ctx.db.query.users.findFirst({
      where: eq(schema.users.id, ctx.user.id),
    });
    userRole = dbUser?.globalRole;
  }

  if (userRole !== "superadmin" && userRole !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "SUPERADMIN_FORBIDDEN: User is not a global platform superadministrator",
    });
  }

  return next({
    ctx: {
      ...ctx,
      isSuperAdmin: true,
      superadminUser: ctx.user,
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

export interface TRPCRateLimitOptions<TContext> {
  config: RateLimitConfig;
  keyGenerator: (ctx: TContext) => string;
}

// Procedural rate limit middleware
export const trpcRateLimit = <TContext = any>(options: TRPCRateLimitOptions<TContext>) =>
  t.middleware(async ({ ctx, next }) => {
    const rawKey = options.keyGenerator(ctx as TContext);
    const result = await defaultLimiter.check(rawKey, options.config);

    if (!result.allowed) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Rate limit exceeded. Please try again in ${result.retryAfter} second${
          result.retryAfter === 1 ? "" : "s"
        }.`,
        cause: {
          retryAfter: result.retryAfter,
          limit: result.limit,
          remaining: 0,
          reset: result.reset,
        },
      });
    }

    return next();
  });
