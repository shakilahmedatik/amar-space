import { describe, expect, it, spyOn } from "bun:test";
import * as email from "@omniheaven/email";
import { appRouter } from "../routers/app";

spyOn(email, "sendEmail").mockImplementation(async () => {});

describe("Domain 01: Organization tRPC Procedures & Security", () => {
  it("rejects unauthenticated requests to protectedProcedure (listMyOrganizations)", async () => {
    const caller = appRouter.createCaller({
      db: {} as any,
      session: null,
      organizationId: null,
      requestId: "req-test-1",
    });

    try {
      await caller.organization.listMyOrganizations();
      expect(true).toBe(false); // Should fail
    } catch (err: any) {
      expect(err.code).toBe("UNAUTHORIZED");
    }
  });

  it("rejects requests to orgProtectedProcedure without active organization context", async () => {
    const caller = appRouter.createCaller({
      db: {} as any,
      session: {
        user: { id: "user-1", email: "test@example.com", name: "Test" },
        session: { id: "sess-1", activeOrganizationId: null },
      } as any,
      organizationId: null,
      requestId: "req-test-2",
    });

    try {
      await caller.organization.getActiveOrganization();
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("BAD_REQUEST");
    }
  });

  it("blocks user when they have no membership in requested organization (Cross-tenant leak prevention)", async () => {
    const mockDb = {
      query: {
        members: {
          findFirst: async () => null, // User is NOT a member
        },
      },
    } as any;

    const caller = appRouter.createCaller({
      db: mockDb,
      session: {
        user: { id: "user-attacker", email: "attacker@example.com", name: "Attacker" },
        session: { id: "sess-1", activeOrganizationId: "org-victim" },
      } as any,
      organizationId: "org-victim",
      requestId: "req-test-3",
    });

    try {
      await caller.organization.getActiveOrganization();
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("FORBIDDEN");
      expect(err.message).toContain("not an authorized member");
    }
  });

  it("rejects expired invitations with INVITATION_EXPIRED", async () => {
    const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
    const mockDb = {
      query: {
        invitations: {
          findFirst: async () => ({
            id: "inv-expired",
            status: "pending",
            expiresAt: expiredDate,
            organizationId: "org-1",
            role: "staff",
          }),
        },
      },
      update: () => ({
        set: () => ({
          where: async () => {},
        }),
      }),
    } as any;

    const caller = appRouter.createCaller({
      db: mockDb,
      session: {
        user: { id: "user-invitee", email: "invitee@example.com", name: "Invitee" },
        session: { id: "sess-1" },
      } as any,
      requestId: "req-test-4",
    });

    try {
      await caller.organization.acceptInvitation({ invitationId: "inv-expired" });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("BAD_REQUEST");
      expect(err.message).toBe("INVITATION_EXPIRED");
    }
  });

  it("enforces role restrictions (requireRole) preventing non-admin/non-owner from inviting members", async () => {
    const mockDb = {
      query: {
        members: {
          // User is a member, but only has role 'staff'
          findFirst: async () => ({
            id: "mem-staff",
            organizationId: "org-1",
            userId: "user-staff",
            role: "staff",
          }),
        },
      },
    } as any;

    const caller = appRouter.createCaller({
      db: mockDb,
      session: {
        user: { id: "user-staff", email: "staff@example.com", name: "Staff" },
        session: { id: "sess-1", activeOrganizationId: "org-1" },
      } as any,
      organizationId: "org-1",
      requestId: "req-test-5",
    });

    try {
      await caller.organization.inviteMember({
        email: "newperson@example.com",
        role: "staff",
        expiresInDays: 7,
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("FORBIDDEN");
      expect(err.message).toContain("requires one of the following roles: owner, admin");
    }
  });

  it("enforces INVITATIONS rate limit when user exceeds 10 invites in window", async () => {
    const rateLimitUserId = `user-inviter-ratelimit-${Date.now()}`;
    const mockDb = {
      query: {
        members: {
          findFirst: async () => ({
            id: "mem-owner",
            organizationId: "org-1",
            userId: rateLimitUserId,
            role: "owner",
          }),
        },
        users: {
          findFirst: async () => null,
        },
      },
      insert: () => ({
        values: () => ({
          returning: async () => [{ id: "inv-test", role: "staff" }],
        }),
      }),
    } as any;

    const caller = appRouter.createCaller({
      db: mockDb,
      session: {
        user: { id: rateLimitUserId, email: "owner@example.com", name: "Owner" },
        session: { id: "sess-1", activeOrganizationId: "org-1" },
      } as any,
      organizationId: "org-1",
      requestId: "req-test-rl",
    });

    // Fire 10 allowed invites
    for (let i = 0; i < 10; i++) {
      await caller.organization.inviteMember({
        email: `invitee${i}@example.com`,
        role: "staff",
        expiresInDays: 7,
      });
    }

    // 11th invite must be blocked with TOO_MANY_REQUESTS
    try {
      await caller.organization.inviteMember({
        email: "invitee11@example.com",
        role: "staff",
        expiresInDays: 7,
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("TOO_MANY_REQUESTS");
      expect(err.message).toContain("Rate limit exceeded");
    }
  });

  it("checks slug availability correctly", async () => {
    const mockDb = {
      query: {
        organizations: {
          findFirst: async () => {
            // Simulate that 'taken-slug' exists, but 'fresh-slug' does not
            return null;
          },
        },
      },
    } as any;

    const caller = appRouter.createCaller({
      db: mockDb,
      session: null,
      organizationId: null,
      requestId: "req-slug-check",
    });

    const resultAvailable = await caller.organization.checkSlugAvailability({
      slug: "fresh-slug",
    });
    expect(resultAvailable.available).toBe(true);
    expect(resultAvailable.slug).toBe("fresh-slug");

    // Test with taken slug
    const mockDbTaken = {
      query: {
        organizations: {
          findFirst: async () => ({ id: "existing-org-id", slug: "taken-slug" }),
        },
      },
    } as any;

    const callerTaken = appRouter.createCaller({
      db: mockDbTaken,
      session: null,
      organizationId: null,
      requestId: "req-slug-check-taken",
    });

    const resultTaken = await callerTaken.organization.checkSlugAvailability({
      slug: "taken-slug",
    });
    expect(resultTaken.available).toBe(false);
    expect(resultTaken.slug).toBe("taken-slug");
  });

  it("rejects invitation acceptance when user email does not match invitation recipient", async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const mockDb = {
      query: {
        invitations: {
          findFirst: async () => ({
            id: "inv-mismatch",
            status: "pending",
            expiresAt: futureDate,
            organizationId: "org-1",
            email: "intended@example.com",
            role: "staff",
          }),
        },
      },
    } as any;

    const caller = appRouter.createCaller({
      db: mockDb,
      session: {
        user: { id: "user-attacker", email: "attacker@example.com", name: "Attacker" },
        session: { id: "sess-1" },
      } as any,
      requestId: "req-test-mismatch",
    });

    try {
      await caller.organization.acceptInvitation({ invitationId: "inv-mismatch" });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("FORBIDDEN");
      expect(err.message).toBe("This invitation was sent to a different email address");
    }
  });

  it("fetches website builder configuration for active organization", async () => {
    const mockDb = {
      query: {
        organizations: {
          findFirst: async () => ({ id: "org-1", status: "active" }),
        },
        members: {
          findFirst: async () => ({
            id: "mem-owner",
            organizationId: "org-1",
            userId: "user-owner",
            role: "owner",
          }),
        },
        websiteConfigs: {
          findFirst: async () => ({
            id: "config-1",
            organizationId: "org-1",
            themeSlug: "classic-luxury",
            brand: { primaryColor: "#0f172a", accentColor: "#f59e0b", fontFamily: "Inter" },
            hero: { headline: "Luxury Stay", ctaText: "Book Now", ctaLink: "#rooms" },
            enabledSections: ["hero", "rooms"],
            sectionOrder: ["hero", "rooms"],
          }),
        },
      },
    } as any;

    const caller = appRouter.createCaller({
      db: mockDb,
      session: {
        user: { id: "user-owner", email: "owner@example.com", name: "Owner" },
        session: { id: "sess-1", activeOrganizationId: "org-1" },
      } as any,
      organizationId: "org-1",
      requestId: "req-web-config",
    });

    const config = await caller.organization.getWebsiteConfig();
    expect(config).toBeDefined();
    expect(config?.themeSlug).toBe("classic-luxury");
    expect(config?.organizationId).toBe("org-1");
  });

  it("updates website builder configuration for owner or admin", async () => {
    const mockDb = {
      query: {
        organizations: {
          findFirst: async () => ({ id: "org-1", status: "active" }),
        },
        members: {
          findFirst: async () => ({
            id: "mem-admin",
            organizationId: "org-1",
            userId: "user-admin",
            role: "admin",
          }),
        },
      },
      insert: () => ({
        values: () => ({
          onConflictDoUpdate: () => ({
            returning: async () => [
              {
                id: "config-1",
                organizationId: "org-1",
                themeSlug: "modern-minimal",
                brand: { primaryColor: "#111827", accentColor: "#3b82f6", fontFamily: "Inter" },
                hero: { headline: "Modern Living", ctaText: "Book", ctaLink: "#rooms" },
                enabledSections: ["hero"],
                sectionOrder: ["hero"],
              },
            ],
          }),
        }),
      }),
    } as any;

    const caller = appRouter.createCaller({
      db: mockDb,
      session: {
        user: { id: "user-admin", email: "admin@example.com", name: "Admin" },
        session: { id: "sess-1", activeOrganizationId: "org-1" },
      } as any,
      organizationId: "org-1",
      requestId: "req-web-update",
    });

    const updated = await caller.organization.updateWebsiteConfig({
      themeSlug: "modern-minimal",
      brand: {
        primaryColor: "#111827",
        accentColor: "#3b82f6",
        fontFamily: "Inter",
      },
      hero: {
        headline: "Modern Living",
        ctaText: "Book",
        ctaLink: "#rooms",
      },
      enabledSections: ["hero"],
      sectionOrder: ["hero"],
    });

    expect(updated).toBeDefined();
    expect(updated.themeSlug).toBe("modern-minimal");
  });
});
