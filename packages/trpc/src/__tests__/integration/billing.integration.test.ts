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

describeSuite("Domain 04: Billing, Finance & Adjustments Integration Suite", () => {
  const { db } = getTestDb();
  const orgId = "org-billing-test";
  const ownerUserId = "usr-billing-owner";
  let buildingId = "";
  let contractId = "";
  let billId = "";

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
      email: "billing-owner@omniheaven.com",
      name: "Billing Owner",
      emailVerified: true,
    });

    await db.insert(schema.organizations).values({
      id: orgId,
      name: "Finance Properties Ltd",
      slug: "finance-properties",
      productType: "building",
    });

    await db.insert(schema.members).values({
      id: "mem-billing-owner",
      organizationId: orgId,
      userId: ownerUserId,
      role: "owner",
    });

    // 2. Seed building and flat
    const [bld] = await db
      .insert(schema.buildings)
      .values({
        id: "bld-billing-1",
        organizationId: orgId,
        name: "Skyline Residency",
        address: "Banani 11, Dhaka",
        city: "Dhaka",
      })
      .returning();
    if (!bld) throw new Error("Failed to seed building");
    buildingId = bld.id;

    const [flat] = await db
      .insert(schema.flats)
      .values({
        id: "flat-billing-202",
        organizationId: orgId,
        buildingId: bld.id,
        flatNumber: "2-B",
        floor: 2,
        status: "occupied",
        defaultRentAmount: 20000,
        defaultServiceCharge: 3000,
      })
      .returning();
    if (!flat) throw new Error("Failed to seed flat");

    // 3. Seed renter and active contract
    const [renter] = await db
      .insert(schema.renters)
      .values({
        id: "renter-billing-1",
        organizationId: orgId,
        flatId: flat.id,
        fullName: "Mahmudul Hasan",
        phone: "+8801700112233",
        nidNumber: "1234567890",
        occupation: "Chartered Accountant",
        bloodGroup: "A+",
        emergencyContactName: "Nasreen Hasan",
        emergencyContactNumber: "+8801800112233",
        emergencyContactRelationship: "Mother",
      })
      .returning();
    if (!renter) throw new Error("Failed to seed renter");

    const [contract] = await db
      .insert(schema.rentalContracts)
      .values({
        id: "contract-billing-1",
        organizationId: orgId,
        renterId: renter.id,
        flatId: flat.id,
        monthlyRent: "20000.00",
        serviceCharge: "3000.00",
        advanceAmount: "40000.00",
        securityDepositAmount: "40000.00",
        remainingDepositBalance: "40000.00",
        startDate: "2026-10-01",
        status: "active",
      })
      .returning();
    if (!contract) throw new Error("Failed to seed contract");
    contractId = contract.id;
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("1. Batch generates monthly bills with idempotent execution per contract per month", async () => {
    const caller = createTestCaller({
      user: {
        id: ownerUserId,
        email: "billing-owner@omniheaven.com",
        name: "Billing Owner",
      },
      organizationId: orgId,
    });

    const result = await caller.billing.generateMonthlyBills({
      buildingId,
      billingMonth: "2026-11",
      dueDate: "2026-11-10",
      notes: "November rental cycle",
    });

    expect(result.createdCount).toBe(1);
    expect(result.skippedCount).toBe(0);
    expect(result.bills.length).toBe(1);
    billId = result.bills[0]?.id || "";

    // Verify bill was created in DB
    const bill = await db.query.bills.findFirst({
      where: (b, { and, eq }) =>
        and(
          eq(b.organizationId, orgId),
          eq(b.contractId, contractId),
          eq(b.billingMonth, "2026-11"),
        ),
    });

    expect(bill).toBeDefined();
    expect(bill?.status).toBe("unpaid");
    expect(Number(bill?.rentAmount)).toBe(20000);
    expect(Number(bill?.serviceChargeAmount)).toBe(3000);
    expect(Number(bill?.totalAmount)).toBe(23000);
    expect(Number(bill?.balanceDue)).toBe(23000);

    // Test Idempotency: re-running bill generation skips existing bills
    const secondRun = await caller.billing.generateMonthlyBills({
      buildingId,
      billingMonth: "2026-11",
      dueDate: "2026-11-10",
    });

    expect(secondRun.createdCount).toBe(0);
    expect(secondRun.skippedCount).toBe(1);
  });

  it("2. Updates meter utilities and recalculates total amount and balance due", async () => {
    const caller = createTestCaller({
      user: {
        id: ownerUserId,
        email: "billing-owner@omniheaven.com",
        name: "Billing Owner",
      },
      organizationId: orgId,
    });

    const updated = await caller.billing.updateBillUtilities({
      billId,
      gasAmount: 1080,
      electricityAmount: 1500,
      waterAmount: 500,
      wasteAndOtherAmount: 0,
      lateFeeAmount: 0,
    });

    // 20000 rent + 3000 service + 1080 gas + 1500 elec + 500 water = 26080
    expect(Number(updated?.totalAmount)).toBe(26080);
    expect(Number(updated?.balanceDue)).toBe(26080);
  });

  it("3. Applies advance deposit adjustment to draw down remaining deposit balance", async () => {
    const caller = createTestCaller({
      user: {
        id: ownerUserId,
        email: "billing-owner@omniheaven.com",
        name: "Billing Owner",
      },
      organizationId: orgId,
    });

    const { adjustment } = await caller.billing.applyAdvanceAdjustment({
      contractId,
      billId,
      amount: 6080,
      adjustmentType: "rent_adjustment",
      note: "Partial adjustment from initial advance deposit",
    });

    expect(adjustment?.id).toBeDefined();
    expect(Number(adjustment?.amount)).toBe(6080);
    expect(Number(adjustment?.balanceBefore)).toBe(40000);
    expect(Number(adjustment?.balanceAfter)).toBe(33920);

    // Verify bill's adjusted amount and balance due
    const bill = await db.query.bills.findFirst({
      where: eq(schema.bills.id, billId),
    });
    expect(Number(bill?.advanceAdjustedAmount)).toBe(6080);
    expect(Number(bill?.balanceDue)).toBe(20000);

    // Verify contract's remaining deposit balance
    const contract = await db.query.rentalContracts.findFirst({
      where: eq(schema.rentalContracts.id, contractId),
    });
    expect(Number(contract?.remainingDepositBalance)).toBe(33920);
  });

  it("4. Records payment with immutable receipt and transitions bill to paid", async () => {
    const caller = createTestCaller({
      user: {
        id: ownerUserId,
        email: "billing-owner@omniheaven.com",
        name: "Billing Owner",
      },
      organizationId: orgId,
    });

    const { payment } = await caller.billing.recordPayment({
      billId,
      amount: 20000,
      paymentMethod: "bkash",
      transactionId: "TRX-BKASH-881234",
      paymentDate: "2026-11-05",
      note: "Full remaining settlement via bKash",
    });

    expect(payment?.id).toBeDefined();
    expect(payment?.status).toBe("completed");
    expect(payment?.receiptNumber).toMatch(/^REC-/);
    expect(Number(payment?.amount)).toBe(20000);

    // Verify bill is now paid with zero balance
    const bill = await db.query.bills.findFirst({
      where: eq(schema.bills.id, billId),
    });
    expect(bill?.status).toBe("paid");
    expect(Number(bill?.amountPaid)).toBe(20000);
    expect(Number(bill?.balanceDue)).toBe(0);
    expect(bill?.paidAt).toBeDefined();
  });

  it("5. Rejects overpayment on an already settled invoice", async () => {
    const caller = createTestCaller({
      user: {
        id: ownerUserId,
        email: "billing-owner@omniheaven.com",
        name: "Billing Owner",
      },
      organizationId: orgId,
    });

    try {
      await caller.billing.recordPayment({
        billId,
        amount: 500,
        paymentMethod: "cash",
        paymentDate: "2026-11-06",
      });
      expect(true).toBe(false); // Should not succeed
    } catch (err: any) {
      expect(err.message).toBe("BILL_ALREADY_PAID");
    }
  });
});
