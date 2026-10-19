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

describeSuite("Domain 03: Renter Lifecycle & Contracts Integration Suite", () => {
  const { db } = getTestDb();
  const orgId = "org-renter-test";
  const ownerUserId = "usr-renter-owner";
  let flatId = "";
  let renterId = "";
  let contractId = "";

  beforeAll(async () => {
    const isAvailable = await isTestDbAvailable();
    if (!isAvailable) {
      console.warn("Test DB unavailable at localhost:5433 - skipping integration suite.");
      return;
    }
    await truncateAllTables();

    // 1. Seed tenant user and organization
    await db.insert(schema.users).values({
      id: ownerUserId,
      email: "renter-owner@omniheaven.com",
      name: "Property Owner",
      emailVerified: true,
    });

    await db.insert(schema.organizations).values({
      id: orgId,
      name: "Renter Test Org",
      slug: "renter-test-org",
      productType: "building",
    });

    await db.insert(schema.members).values({
      id: "mem-renter-owner",
      organizationId: orgId,
      userId: ownerUserId,
      role: "owner",
    });

    // 2. Seed building and flat
    const [bld] = await db
      .insert(schema.buildings)
      .values({
        id: "bld-renter-1",
        organizationId: orgId,
        name: "Green Valley Residency",
        address: "Dhanmondi 27, Dhaka",
        city: "Dhaka",
      })
      .returning();
    if (!bld) throw new Error("Failed to seed building");

    const [flat] = await db
      .insert(schema.flats)
      .values({
        id: "flat-renter-101",
        organizationId: orgId,
        buildingId: bld.id,
        flatNumber: "4-A",
        floor: 4,
        status: "vacant",
        defaultRentAmount: 28000,
        defaultServiceCharge: 3500,
      })
      .returning();
    if (!flat) throw new Error("Failed to seed flat");
    flatId = flat.id;
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("1. Onboards a new renter with KYC profile and Bangladeshi NID validation", async () => {
    const caller = createTestCaller({
      user: {
        id: ownerUserId,
        email: "renter-owner@omniheaven.com",
        name: "Property Owner",
      },
      organizationId: orgId,
    });

    const renter = await caller.renter.createRenter({
      fullName: "Tanvir Hasan",
      phone: "+8801712345678",
      nidNumber: "19901234567890123", // Valid 17-digit legacy NID
      dateOfBirth: "1990-05-15",
      occupation: "Software Architect",
      bloodGroup: "B+",
      totalFamilyMembers: 3,
      emergencyContactName: "Sadia Hasan",
      emergencyContactNumber: "+8801812345678",
      emergencyContactRelationship: "Spouse",
    });

    expect(renter.id).toBeDefined();
    expect(renter.fullName).toBe("Tanvir Hasan");
    expect(renter.nidNumber).toBe("19901234567890123");
    renterId = renter.id;
  });

  it("2. Drafts a new tenancy contract for the renter on vacant flat", async () => {
    const caller = createTestCaller({
      user: {
        id: ownerUserId,
        email: "renter-owner@omniheaven.com",
        name: "Property Owner",
      },
      organizationId: orgId,
    });

    const contract = await caller.renter.createContract({
      renterId,
      flatId,
      monthlyRent: 28000,
      serviceCharge: 3500,
      securityDepositAmount: 56000,
      startDate: "2026-11-01",
      noticePeriodDays: 30,
    });

    expect(contract.id).toBeDefined();
    expect(contract.status).toBe("draft");
    expect(Number(contract.monthlyRent)).toBe(28000);
    contractId = contract.id;
  });

  it("3. Activates tenancy contract, automatically binding flat and setting status to occupied", async () => {
    const caller = createTestCaller({
      user: {
        id: ownerUserId,
        email: "renter-owner@omniheaven.com",
        name: "Property Owner",
      },
      organizationId: orgId,
    });

    const activated = await caller.renter.activateContract({
      contractId,
      initialDepositReceived: true,
    });

    expect(activated?.status).toBe("active");

    // Verify flat status has transitioned to occupied in database
    const flat = await db.query.flats.findFirst({
      where: eq(schema.flats.id, flatId),
    });
    expect(flat?.status).toBe("occupied");

    // Verify renter record has flatId bound
    const renter = await db.query.renters.findFirst({
      where: eq(schema.renters.id, renterId),
    });
    expect(renter?.flatId).toBe(flatId);
  });

  it("4. Prevents overlapping active contract on an already occupied flat", async () => {
    const caller = createTestCaller({
      user: {
        id: ownerUserId,
        email: "renter-owner@omniheaven.com",
        name: "Property Owner",
      },
      organizationId: orgId,
    });

    // Create a 2nd renter
    const renter2 = await caller.renter.createRenter({
      fullName: "Kamal Hossain",
      phone: "+8801912345678",
      nidNumber: "9876543210", // 10-digit Smart NID
      occupation: "Civil Engineer",
      bloodGroup: "O+",
      emergencyContactName: "Nusrat Hossain",
      emergencyContactNumber: "+8801612345678",
      emergencyContactRelationship: "Sister",
    });

    // Try to create contract on flat-101 which is already occupied
    try {
      await caller.renter.createContract({
        renterId: renter2.id,
        flatId,
        monthlyRent: 30000,
        startDate: "2026-12-01",
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.message).toBe("FLAT_ALREADY_OCCUPIED");
    }
  });

  it("5. Terminates tenancy contract, recording deductions and resetting flat to vacant", async () => {
    const caller = createTestCaller({
      user: {
        id: ownerUserId,
        email: "renter-owner@omniheaven.com",
        name: "Property Owner",
      },
      organizationId: orgId,
    });

    const terminated = await caller.renter.terminateContract({
      contractId,
      terminationDate: "2026-11-30",
      terminationReason: "Lease completion and relocation",
      deductions: 6000,
      refundAmount: 50000,
      nextFlatStatus: "vacant",
      inspectionNotes: "Flat inspected in good condition. Minor paint touchup deducted.",
    });

    expect(terminated?.status).toBe("terminated");

    // Verify flat has returned to vacant status
    const flat = await db.query.flats.findFirst({
      where: eq(schema.flats.id, flatId),
    });
    expect(flat?.status).toBe("vacant");

    // Verify renter flat link was unset
    const renter = await db.query.renters.findFirst({
      where: eq(schema.renters.id, renterId),
    });
    expect(renter?.flatId).toBeNull();
  });
});
