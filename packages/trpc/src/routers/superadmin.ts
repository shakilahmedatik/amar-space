import {
  getOrganizationDetailsSchema,
  listOrganizationsInputSchema,
  reinstateOrganizationSchema,
  suspendOrganizationSchema,
  updateOrganizationPlanSchema,
  updateSubscriptionPlanSchema,
} from "@omniheaven/validators";
import * as superadminService from "../services/superadmin.service";
import { router, superadminProcedure } from "../trpc";

export const superadminRouter = router({
  // 1. High-Level Platform HQ Statistics & MRR Aggregation
  getPlatformStats: superadminProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/superadmin/stats",
        tags: ["Superadmin"],
        summary: "Platform-wide MRR, active organizations, and physical asset counts",
      },
    })
    .query(async ({ ctx }) => {
      return superadminService.getPlatformStats(ctx.db);
    }),

  // 2. Organization Directory with Live Unit Counts & Quotas
  listAllOrganizations: superadminProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/superadmin/organizations",
        tags: ["Superadmin"],
        summary: "List all tenant organizations with quota usage and owners",
      },
    })
    .input(listOrganizationsInputSchema)
    .query(async ({ ctx, input }) => {
      return superadminService.listAllOrganizations(ctx.db, input);
    }),

  // 3. Organization Deep Dive Details
  getOrganizationDetails: superadminProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/superadmin/organizations/{organizationId}",
        tags: ["Superadmin"],
        summary: "Get deep-dive metrics, units, subscriptions, and audit events",
      },
    })
    .input(getOrganizationDetailsSchema)
    .query(async ({ ctx, input }) => {
      return superadminService.getOrganizationDetails(ctx.db, input);
    }),

  // 4. Suspend Customer Organization (Security / Delinquency Lockout)
  suspendOrganization: superadminProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/superadmin/organizations/{organizationId}/suspend",
        tags: ["Superadmin"],
        summary: "Suspend delinquent or malicious customer organization",
      },
    })
    .input(suspendOrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      return superadminService.suspendOrganization(
        ctx.db,
        { id: ctx.user.id, email: ctx.user.email },
        input,
      );
    }),

  // 5. Reinstate Customer Organization
  reinstateOrganization: superadminProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/superadmin/organizations/{organizationId}/reinstate",
        tags: ["Superadmin"],
        summary: "Reinstate suspended customer organization",
      },
    })
    .input(reinstateOrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      return superadminService.reinstateOrganization(
        ctx.db,
        { id: ctx.user.id, email: ctx.user.email },
        input,
      );
    }),

  // 6. SaaS Subscription Plans Catalog
  listPlans: superadminProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/superadmin/plans",
        tags: ["Superadmin"],
        summary: "List commercial SaaS subscription tiers",
      },
    })
    .query(async ({ ctx }) => {
      return superadminService.listPlans(ctx.db);
    }),

  // 7. Override or Upgrade Organization SaaS Plan
  updateOrganizationPlan: superadminProcedure
    .meta({
      openapi: {
        method: "PUT",
        path: "/v1/superadmin/organizations/{organizationId}/plan",
        tags: ["Superadmin"],
        summary: "Upgrade or override organization SaaS plan with quota safeguard",
      },
    })
    .input(updateOrganizationPlanSchema)
    .mutation(async ({ ctx, input }) => {
      return superadminService.updateOrganizationPlan(
        ctx.db,
        { id: ctx.user.id, email: ctx.user.email },
        input,
      );
    }),

  // 8. Edit SaaS Subscription Plan (Pricing & Quotas)
  updateSubscriptionPlan: superadminProcedure
    .meta({
      openapi: {
        method: "PATCH",
        path: "/v1/superadmin/plans/{planId}",
        tags: ["Superadmin"],
        summary: "Edit SaaS subscription plan pricing and unit limits",
      },
    })
    .input(updateSubscriptionPlanSchema)
    .mutation(async ({ ctx, input }) => {
      return superadminService.updateSubscriptionPlan(ctx.db, input);
    }),
});
