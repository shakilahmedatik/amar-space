import { eq, schema } from "@omniheaven/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router, tenantProcedure } from "../trpc";

export const organizationRouter = router({
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
        message: "Organization not found",
      });
    }

    return org;
  }),

  getBySlug: publicProcedure.input(z.object({ slug: z.string() })).query(async ({ ctx, input }) => {
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
});
