import type { Session } from "@omniheaven/auth";
import { and, type Database, eq, type OrganizationRole, schema } from "@omniheaven/db";
import { ErrorCode, throwDomainError } from "@omniheaven/errors";
import { defaultLimiter, type RateLimitConfig } from "@omniheaven/rate-limit";
import { initTRPC, TRPCError } from "@trpc/server";
import { ZodError } from "zod";

export interface TRPCContext {
  db: Database;
  session: Session | null;
  organizationId?: string | null;
  requestId: string;
  traceId?: string;
}

export interface AuthenticatedContext extends TRPCContext {
  session: Session;
  user: Session["user"];
}

export interface OrganizationContext extends AuthenticatedContext {
  organizationId: string;
  organization: typeof schema.organizations.$inferSelect | null;
  role: OrganizationRole;
  membership: typeof schema.members.$inferSelect;
}

export interface OpenApiMeta {
  openapi?: {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    path: string;
    tags?: string[];
    summary?: string;
    description?: string;
    protect?: boolean;
  };
}

const t = initTRPC
  .context<TRPCContext>()
  .meta<OpenApiMeta>()
  .create({
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
  const currentSession = ctx.session;
  if (!currentSession?.user) {
    throwDomainError(ErrorCode.AUTH_UNAUTHORIZED, "You must be signed in to access this resource");
  }

  return next({
    ctx: {
      ...ctx,
      session: currentSession,
      user: currentSession.user,
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
  let organization: typeof schema.organizations.$inferSelect | null = null;
  if (ctx.db.query?.organizations?.findFirst) {
    const org = await ctx.db.query.organizations.findFirst({
      where: eq(schema.organizations.id, orgId),
    });
    organization = org || null;

    if (org?.status === "suspended") {
      throwDomainError(
        ErrorCode.ORG_SUSPENDED,
        `${ErrorCode.ORG_SUSPENDED}: Organization has been suspended by platform administration. Contact support@omniheaven.com`,
      );
    }
  }

  // Verify membership in database
  const membership = await ctx.db.query.members.findFirst({
    where: and(eq(schema.members.organizationId, orgId), eq(schema.members.userId, ctx.user.id)),
  });

  if (!membership) {
    throwDomainError(
      ErrorCode.ORG_FORBIDDEN,
      "User is not an authorized member of the requested organization",
    );
  }

  const verifiedMembership = membership;

  return next({
    ctx: {
      ...ctx,
      organizationId: orgId,
      organization,
      role: verifiedMembership.role as OrganizationRole,
      membership: verifiedMembership,
    },
  });
});

// Middleware ensuring user is a global platform superadministrator
export const superadminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  let userRole = (ctx.user as { globalRole?: string | null })?.globalRole;
  if (!userRole && ctx.user?.id) {
    const dbUser = await ctx.db.query.users.findFirst({
      where: eq(schema.users.id, ctx.user.id),
    });
    userRole = dbUser?.globalRole;
  }

  if (userRole !== "superadmin" && userRole !== "admin") {
    throwDomainError(
      ErrorCode.SUPERADMIN_FORBIDDEN,
      `${ErrorCode.SUPERADMIN_FORBIDDEN}: User is not a global platform superadministrator`,
    );
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
      throwDomainError(
        ErrorCode.ORG_FORBIDDEN,
        `This action requires one of the following roles: ${allowedRoles.join(", ")}`,
      );
    }
    return next({ ctx });
  });

export interface TRPCRateLimitOptions<TContext> {
  config: RateLimitConfig;
  keyGenerator: (ctx: TContext) => string;
}

// Procedural rate limit middleware
export const trpcRateLimit = <TContext extends object = OrganizationContext>(
  options: TRPCRateLimitOptions<TContext>,
) =>
  t.middleware(async ({ ctx, next }) => {
    const rawKey = options.keyGenerator(ctx as unknown as TContext);
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
