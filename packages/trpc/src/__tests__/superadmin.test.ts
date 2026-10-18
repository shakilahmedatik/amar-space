import { describe, expect, it } from "bun:test";
import { SUPERADMIN_ERROR_CODES } from "@omniheaven/validators";
import { appRouter } from "../routers/app";
import { assertOrganizationQuota } from "../utils/quota";

describe("Domain 08: Superadmin SaaS & Platform HQ tRPC Procedures", () => {
  const superadminUser = {
    id: "superadmin-root",
    email: "admin@omniheaven.com",
    name: "Platform Super Admin",
    globalRole: "superadmin",
  };

  const normalUser = {
    id: "user-regular",
    email: "regular@customer.com",
    name: "Regular Tenant User",
    globalRole: "user",
  };

  it("rejects non-superadmin caller from superadmin procedures with SUPERADMIN_FORBIDDEN", async () => {
    const caller = appRouter.createCaller({
      db: {
        query: {
          users: {
            findFirst: async () => normalUser,
          },
        },
      } as any,
      session: {
        user: normalUser,
        session: { id: "sess-1", activeOrganizationId: null },
      } as any,
      organizationId: null,
      requestId: "req-unauthorized-superadmin",
    });

    try {
      await caller.superadmin.getPlatformStats();
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("FORBIDDEN");
      expect(err.message).toContain("SUPERADMIN_FORBIDDEN");
    }
  });

  it("allows superadmin to retrieve platform stats with MRR aggregation", async () => {
    const mockDb = {
      select: () => ({
        from: () => {
          const p = Promise.resolve([{ count: 5 }]);
          (p as any).where = () => Promise.resolve([{ count: 2 }]);
          return p;
        },
      }),
      query: {
        subscriptions: {
          findMany: async () => [
            {
              id: "sub-1",
              status: "active",
              billingCycle: "monthly",
              plan: {
                id: "starter",
                name: "Starter Tier",
                priceMonthlyBdt: "1499.00",
                priceYearlyBdt: "14990.00",
              },
            },
            {
              id: "sub-2",
              status: "active",
              billingCycle: "yearly",
              plan: {
                id: "pro",
                name: "Pro Growth",
                priceMonthlyBdt: "3999.00",
                priceYearlyBdt: "39990.00",
              },
            },
          ],
        },
      },
    };

    const caller = appRouter.createCaller({
      db: mockDb as any,
      session: {
        user: superadminUser,
        session: { id: "sess-super", activeOrganizationId: null },
      } as any,
      organizationId: null,
      requestId: "req-superadmin-stats",
    });

    const stats = await caller.superadmin.getPlatformStats();
    expect(stats.revenue.activeSubscriptionsCount).toBe(2);
    expect(stats.revenue.currency).toBe("BDT");
    // MRR = 1499 + (39990 / 12) = 1499 + 3332.5 = 4831.5 -> ~4832
    expect(stats.revenue.estimatedMrrBdt).toBeGreaterThan(4800);
    expect(stats.systemHealth.clusterStatus).toBe("healthy");
  });

  it("suspends organization and updates subscription status while recording audit log", async () => {
    let orgUpdated: any = null;
    let subUpdated: any = null;
    let auditLog: any = null;

    const mockDb = {
      query: {
        organizations: {
          findFirst: async () => ({
            id: "org-bashundhara-tower",
            name: "Bashundhara Royal Heights",
            status: "active",
          }),
        },
      },
      update: () => ({
        set: (vals: any) => ({
          where: () => {
            const p = Promise.resolve([{ status: vals.status }]);
            (p as any).returning = async () => {
              orgUpdated = vals;
              return [{ id: "org-bashundhara-tower", status: vals.status }];
            };
            subUpdated = vals;
            return p;
          },
        }),
      }),
      insert: () => ({
        values: (vals: any) => {
          auditLog = vals;
          return Promise.resolve();
        },
      }),
    };

    const caller = appRouter.createCaller({
      db: mockDb as any,
      session: {
        user: superadminUser,
        session: { id: "sess-super", activeOrganizationId: null },
      } as any,
      organizationId: null,
      requestId: "req-suspend-org",
    });

    const res = await caller.superadmin.suspendOrganization({
      organizationId: "org-bashundhara-tower",
      reason: "Repeated non-payment after grace period",
    });

    expect(res.success).toBe(true);
    expect(res.status).toBe("suspended");
    expect(orgUpdated.status).toBe("suspended");
    expect(subUpdated.status).toBe("suspended");
    expect(auditLog.action).toBe("ORGANIZATION_SUSPENDED");
    expect(auditLog.entityId).toBe("org-bashundhara-tower");
  });

  it("blocks suspended organization members from accessing tenant routes with ORG_SUSPENDED", async () => {
    const mockDb = {
      query: {
        organizations: {
          findFirst: async () => ({
            id: "org-bashundhara-tower",
            status: "suspended",
          }),
        },
        members: {
          findFirst: async () => ({
            id: "mem-1",
            role: "owner",
          }),
        },
      },
    };

    const caller = appRouter.createCaller({
      db: mockDb as any,
      session: {
        user: normalUser,
        session: { id: "sess-user", activeOrganizationId: "org-bashundhara-tower" },
      } as any,
      organizationId: "org-bashundhara-tower",
      requestId: "req-tenant-suspended",
    });

    try {
      await caller.property.listBuildings();
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("FORBIDDEN");
      expect(err.message).toContain("ORG_SUSPENDED");
    }
  });

  it("reinstates suspended organization back to active", async () => {
    let orgUpdated: any = null;
    let auditLog: any = null;

    const mockDb = {
      query: {
        organizations: {
          findFirst: async () => ({
            id: "org-bashundhara-tower",
            name: "Bashundhara Royal Heights",
            status: "suspended",
          }),
        },
      },
      update: () => ({
        set: (vals: any) => ({
          where: () => {
            const p = Promise.resolve([{ status: vals.status }]);
            (p as any).returning = async () => {
              orgUpdated = vals;
              return [{ id: "org-bashundhara-tower", status: vals.status }];
            };
            return p;
          },
        }),
      }),
      insert: () => ({
        values: (vals: any) => {
          auditLog = vals;
          return Promise.resolve();
        },
      }),
    };

    const caller = appRouter.createCaller({
      db: mockDb as any,
      session: {
        user: superadminUser,
        session: { id: "sess-super", activeOrganizationId: null },
      } as any,
      organizationId: null,
      requestId: "req-reinstate-org",
    });

    const res = await caller.superadmin.reinstateOrganization({
      organizationId: "org-bashundhara-tower",
      notes: "bKash subscription token verified",
    });

    expect(res.success).toBe(true);
    expect(res.status).toBe("active");
    expect(orgUpdated.status).toBe("active");
    expect(auditLog.action).toBe("ORGANIZATION_REINSTATED");
  });

  it("enforces unit quota and throws PLAN_QUOTA_EXCEEDED when max units reached", async () => {
    const mockDb = {
      query: {
        subscriptions: {
          findFirst: async () => ({
            plan: {
              id: "starter",
              name: "Starter Tier",
              maxUnits: 20,
            },
          }),
        },
      },
      select: () => ({
        from: () => ({
          innerJoin: () => ({
            where: async () => [{ total: 12 }], // 12 flats + 8 rooms = 20 total
          }),
        }),
      }),
    };

    // When org has 12 flats and 12 rooms = 24 units, adding 1 more should fail
    try {
      await assertOrganizationQuota(mockDb as any, "org-bashundhara-tower", 1);
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("FORBIDDEN");
      expect(err.message).toContain("PLAN_QUOTA_EXCEEDED");
    }
  });

  it("rejects plan downgrade when active units exceed target plan max units (INVALID_PLAN_UPGRADE)", async () => {
    const mockDb = {
      query: {
        organizations: {
          findFirst: async () => ({
            id: "org-grand-haven",
            name: "Grand Haven Resort",
            subscription: { id: "sub-2", planId: "enterprise" },
          }),
        },
        subscriptionPlans: {
          findFirst: async () => ({
            id: "starter",
            name: "Starter Tier",
            maxUnits: 20,
          }),
        },
      },
      select: () => ({
        from: () => ({
          innerJoin: () => ({
            where: async () => [{ count: 18 }], // 18 flats + 18 rooms = 36 units > 20 max
          }),
        }),
      }),
    };

    const caller = appRouter.createCaller({
      db: mockDb as any,
      session: {
        user: superadminUser,
        session: { id: "sess-super", activeOrganizationId: null },
      } as any,
      organizationId: null,
      requestId: "req-downgrade-org",
    });

    try {
      await caller.superadmin.updateOrganizationPlan({
        organizationId: "org-grand-haven",
        planId: "starter",
        billingCycle: "monthly",
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("BAD_REQUEST");
      expect(err.message).toContain(SUPERADMIN_ERROR_CODES.INVALID_PLAN_UPGRADE);
    }
  });
});
