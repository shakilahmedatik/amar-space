import type { Session } from "@omniheaven/auth";
import type { Database } from "@omniheaven/db";
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

// Middleware ensuring user is operating within an active organization
export const tenantProcedure = protectedProcedure.use(({ ctx, next }) => {
  const orgId = ctx.organizationId || ctx.session.session?.activeOrganizationId;
  if (!orgId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "An active organization context is required",
    });
  }
  return next({
    ctx: {
      ...ctx,
      organizationId: orgId,
    },
  });
});
