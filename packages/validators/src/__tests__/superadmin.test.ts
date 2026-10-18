import { describe, expect, it } from "bun:test";
import {
  evaluateQuota,
  listOrganizationsInputSchema,
  reinstateOrganizationSchema,
  SUPERADMIN_ERROR_CODES,
  suspendOrganizationSchema,
  updateOrganizationPlanSchema,
  updateSubscriptionPlanSchema,
} from "../superadmin";

describe("Domain 08: Superadmin SaaS & Platform HQ Validator Rules", () => {
  it("exports standard domain error codes", () => {
    expect(SUPERADMIN_ERROR_CODES.SUPERADMIN_FORBIDDEN).toBe("SUPERADMIN_FORBIDDEN");
    expect(SUPERADMIN_ERROR_CODES.PLAN_QUOTA_EXCEEDED).toBe("PLAN_QUOTA_EXCEEDED");
    expect(SUPERADMIN_ERROR_CODES.ORG_SUSPENDED).toBe("ORG_SUSPENDED");
    expect(SUPERADMIN_ERROR_CODES.INVALID_PLAN_UPGRADE).toBe("INVALID_PLAN_UPGRADE");
  });

  it("validates suspendOrganizationSchema requiring minimum 5 character reason", () => {
    const valid = suspendOrganizationSchema.safeParse({
      organizationId: "org-123",
      reason: "Repeated payment delinquency after grace period",
    });
    expect(valid.success).toBe(true);

    const invalidShort = suspendOrganizationSchema.safeParse({
      organizationId: "org-123",
      reason: "bad",
    });
    expect(invalidShort.success).toBe(false);

    const missingOrg = suspendOrganizationSchema.safeParse({
      organizationId: "",
      reason: "Valid reason for suspension",
    });
    expect(missingOrg.success).toBe(false);
  });

  it("validates reinstateOrganizationSchema", () => {
    const valid = reinstateOrganizationSchema.safeParse({
      organizationId: "org-456",
      notes: "bKash recurring cleared successfully",
    });
    expect(valid.success).toBe(true);

    const validNoNotes = reinstateOrganizationSchema.safeParse({
      organizationId: "org-456",
    });
    expect(validNoNotes.success).toBe(true);

    const invalid = reinstateOrganizationSchema.safeParse({
      organizationId: "",
    });
    expect(invalid.success).toBe(false);
  });

  it("validates updateOrganizationPlanSchema", () => {
    const valid = updateOrganizationPlanSchema.safeParse({
      organizationId: "org-789",
      planId: "enterprise",
      billingCycle: "yearly",
      extendDays: 365,
    });
    expect(valid.success).toBe(true);

    const invalidCycle = updateOrganizationPlanSchema.safeParse({
      organizationId: "org-789",
      planId: "pro",
      billingCycle: "daily",
    });
    expect(invalidCycle.success).toBe(false);
  });

  it("validates listOrganizationsInputSchema with defaults", () => {
    const parsed = listOrganizationsInputSchema.parse({});
    expect(parsed.limit).toBe(50);

    const filtered = listOrganizationsInputSchema.safeParse({
      search: "Grand Haven",
      status: "active",
      productType: "hotel",
      limit: 25,
    });
    expect(filtered.success).toBe(true);
  });

  it("validates updateSubscriptionPlanSchema pricing and limits", () => {
    const valid = updateSubscriptionPlanSchema.safeParse({
      planId: "pro",
      priceMonthlyBdt: 4500,
      maxUnits: 150,
      features: ["feature_a", "feature_b"],
      isActive: true,
    });
    expect(valid.success).toBe(true);

    const negativePrice = updateSubscriptionPlanSchema.safeParse({
      planId: "pro",
      priceMonthlyBdt: -100,
    });
    expect(negativePrice.success).toBe(false);
  });

  it("evaluates plan quotas deterministically", () => {
    // Current 18 out of 20, adding 1 -> allowed
    const test1 = evaluateQuota(18, 20, 1);
    expect(test1.allowed).toBe(true);
    expect(test1.remainingUnits).toBe(2);
    expect(test1.projectedTotal).toBe(19);

    // Current 20 out of 20, adding 1 -> disallowed
    const test2 = evaluateQuota(20, 20, 1);
    expect(test2.allowed).toBe(false);
    expect(test2.remainingUnits).toBe(0);
    expect(test2.projectedTotal).toBe(21);

    // Current 19 out of 20, bulk adding 3 -> disallowed
    const test3 = evaluateQuota(19, 20, 3);
    expect(test3.allowed).toBe(false);
    expect(test3.projectedTotal).toBe(22);

    // Unlimited enterprise plan (999999)
    const testUnlimited = evaluateQuota(450, 999999, 50);
    expect(testUnlimited.allowed).toBe(true);
  });
});
