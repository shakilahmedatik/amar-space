import { z } from "zod";

export const SUPERADMIN_ERROR_CODES = {
  SUPERADMIN_FORBIDDEN: "SUPERADMIN_FORBIDDEN",
  PLAN_QUOTA_EXCEEDED: "PLAN_QUOTA_EXCEEDED",
  ORG_SUSPENDED: "ORG_SUSPENDED",
  INVALID_PLAN_UPGRADE: "INVALID_PLAN_UPGRADE",
  ORGANIZATION_NOT_FOUND: "ORGANIZATION_NOT_FOUND",
  PLAN_NOT_FOUND: "PLAN_NOT_FOUND",
} as const;

export type SuperadminErrorCode =
  (typeof SUPERADMIN_ERROR_CODES)[keyof typeof SUPERADMIN_ERROR_CODES];

export const suspendOrganizationSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  reason: z.string().min(5, "Suspension reason must be at least 5 characters"),
});

export const reinstateOrganizationSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  notes: z.string().optional(),
});

export const updateOrganizationPlanSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  planId: z.string().min(1, "Plan ID is required"),
  billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
  extendDays: z.number().int().min(1).max(3650).optional(),
});

export const listOrganizationsInputSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["active", "suspended", "trialing"]).optional(),
  productType: z.enum(["building", "hotel", "resort", "commercial"]).optional(),
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export const getOrganizationDetailsSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
});

export const updateSubscriptionPlanSchema = z.object({
  planId: z.string().min(1, "Plan ID is required"),
  name: z.string().min(2, "Plan name must be at least 2 characters").optional(),
  description: z.string().optional(),
  priceMonthlyBdt: z.number().nonnegative("Monthly price cannot be negative").optional(),
  priceYearlyBdt: z.number().nonnegative("Yearly price cannot be negative").optional(),
  maxUnits: z.number().int().positive("Max units must be greater than zero").optional(),
  features: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export type SuspendOrganizationInput = z.infer<typeof suspendOrganizationSchema>;
export type ReinstateOrganizationInput = z.infer<typeof reinstateOrganizationSchema>;
export type UpdateOrganizationPlanInput = z.infer<typeof updateOrganizationPlanSchema>;
export type ListOrganizationsInput = z.infer<typeof listOrganizationsInputSchema>;
export type GetOrganizationDetailsInput = z.infer<typeof getOrganizationDetailsSchema>;
export type UpdateSubscriptionPlanInput = z.infer<typeof updateSubscriptionPlanSchema>;

/**
 * Pure quota calculation helper evaluating if adding units would exceed plan limits.
 */
export function evaluateQuota(currentUnits: number, maxUnits: number, unitsToAdd = 1) {
  const projectedTotal = currentUnits + unitsToAdd;
  const allowed = projectedTotal <= maxUnits;
  return {
    allowed,
    currentUnits,
    maxUnits,
    unitsToAdd,
    projectedTotal,
    remainingUnits: Math.max(0, maxUnits - currentUnits),
  };
}
