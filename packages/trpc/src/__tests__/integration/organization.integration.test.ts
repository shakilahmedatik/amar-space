import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { eq, schema } from "@omniheaven/db";
import {
  closeTestDb,
  createTestCaller,
  getTestDb,
  isTestDbAvailable,
  truncateAllTables,
} from "../helpers/test-db";

const isAvailable = await isTestDbAvailable();
const describeSuite = isAvailable ? describe : describe.skip;

describeSuite("Domain 01: Organization Multi-Tenancy Integration Suite", () => {
  const { db } = getTestDb();

  beforeAll(async () => {
    const isAvailable = await isTestDbAvailable();
    if (!isAvailable) {
      console.warn("Test DB unavailable at localhost:5433 - skipping integration suite.");
      return;
    }
    await truncateAllTables();

    // Seed test users
    await db.insert(schema.users).values([
      {
        id: "usr-owner-1",
        email: "owner@omniheaven.com",
        name: "Enterprise Owner",
        emailVerified: true,
      },
      {
        id: "usr-manager-1",
        email: "manager@omniheaven.com",
        name: "Property Manager",
        emailVerified: true,
      },
    ]);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  let createdOrgId = "";
  let invitationId = "";

  it("1. Allows an authenticated user to create a new tenant organization with owner role", async () => {
    const caller = createTestCaller({
      user: {
        id: "usr-owner-1",
        email: "owner@omniheaven.com",
        name: "Enterprise Owner",
      },
    });

    const org = await caller.organization.create({
      name: "Sunset Grand Properties",
      slug: "sunset-grand",
      productType: "building",
      contactPhone: "+8801712345678",
      address: "Gulshan-2, Dhaka",
    });

    expect(org?.id).toBeDefined();
    expect(org?.slug).toBe("sunset-grand");
    expect(org?.productType).toBe("building");
    createdOrgId = org?.id || "";

    // Verify creator is automatically registered as Owner in the members table
    const membership = await db.query.members.findFirst({
      where: (m, { and, eq }) =>
        and(eq(m.organizationId, createdOrgId), eq(m.userId, "usr-owner-1")),
    });

    expect(membership).toBeDefined();
    expect(membership?.role).toBe("owner");
  });

  it("2. Validates slug uniqueness correctly", async () => {
    const caller = createTestCaller({
      user: {
        id: "usr-owner-1",
        email: "owner@omniheaven.com",
        name: "Enterprise Owner",
      },
    });

    const unavailable = await caller.organization.checkSlugAvailability({ slug: "sunset-grand" });
    expect(unavailable.available).toBe(false);

    const available = await caller.organization.checkSlugAvailability({ slug: "ocean-breeze" });
    expect(available.available).toBe(true);
  });

  it("3. Creates a staff invitation with secure token", async () => {
    const caller = createTestCaller({
      user: {
        id: "usr-owner-1",
        email: "owner@omniheaven.com",
        name: "Enterprise Owner",
      },
      organizationId: createdOrgId,
    });

    const invitation = await caller.organization.inviteMember({
      email: "manager@omniheaven.com",
      role: "manager",
    });

    expect(invitation?.id).toBeDefined();
    expect(invitation?.email).toBe("manager@omniheaven.com");
    expect(invitation?.role).toBe("manager");
    expect(invitation?.status).toBe("pending");
    invitationId = invitation?.id || "";
  });

  it("4. Allows invited user to accept invitation and assigns manager role", async () => {
    const invitedCaller = createTestCaller({
      user: {
        id: "usr-manager-1",
        email: "manager@omniheaven.com",
        name: "Property Manager",
      },
    });

    const result = await invitedCaller.organization.acceptInvitation({
      invitationId,
    });

    expect(result.success).toBe(true);
    expect(result.organizationId).toBe(createdOrgId);

    // Verify invited user is now a member with role 'manager'
    const membership = await db.query.members.findFirst({
      where: (m, { and, eq }) =>
        and(eq(m.organizationId, createdOrgId), eq(m.userId, "usr-manager-1")),
    });

    expect(membership).toBeDefined();
    expect(membership?.role).toBe("manager");
  });

  it("5. Allows owner to list organization members and promote manager to admin", async () => {
    const caller = createTestCaller({
      user: {
        id: "usr-owner-1",
        email: "owner@omniheaven.com",
        name: "Enterprise Owner",
      },
      organizationId: createdOrgId,
    });

    const members = await caller.organization.listMembers();
    expect(members.length).toBe(2);

    const managerMember = members.find((m) => m.user.id === "usr-manager-1");
    expect(managerMember).toBeDefined();

    const updated = await caller.organization.updateMemberRole({
      memberId: managerMember?.id || "",
      newRole: "admin",
    });

    expect(updated?.role).toBe("admin");
  });

  it("6. Records comprehensive audit log trails for tenant lifecycle mutations", async () => {
    const auditLogs = await db
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.organizationId, createdOrgId));

    expect(auditLogs.length).toBeGreaterThanOrEqual(2);
    const actions = auditLogs.map((log) => log.action);
    expect(actions).toContain("ORGANIZATION_CREATED");
    expect(actions).toContain("MEMBER_INVITED");
  });
});
