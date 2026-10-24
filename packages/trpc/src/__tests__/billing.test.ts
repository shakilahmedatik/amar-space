import { describe, expect, it } from "bun:test";
import { appRouter } from "../routers/app";
import { issuePortalToken } from "../services/portal-auth.service";

describe("Domain 04: Billing, Finance & Advance Adjustments tRPC Procedures", () => {
  const orgId = "org-billing-test";
  const managerUserId = "user-manager-1";
  const buildingId = "bld-lakeview-1";
  const contractId = "contract-1a-test";
  const _flatId = "flat-101";
  const billId = "bill-101-test";

  it("rejects unauthenticated requests to listBills", async () => {
    const caller = appRouter.createCaller({
      db: {} as any,
      session: null,
      organizationId: null,
      requestId: "req-unauth-billing",
    });

    try {
      await caller.billing.listBills();
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("UNAUTHORIZED");
    }
  });

  it("batch bill generation is idempotent and skips existing bills for same month", async () => {
    let insertedBillCount = 0;

    const mockDb = {
      query: {
        members: {
          findFirst: async () => ({
            id: "mem-1",
            role: "manager",
            organizationId: orgId,
            userId: managerUserId,
          }),
        },
      },
      transaction: async (callback: any) => {
        const txMock = {
          query: {
            rentalContracts: {
              findMany: async () => [
                {
                  id: "contract-1",
                  monthlyRent: "28000.00",
                  serviceCharge: "5000.00",
                  flat: { id: "flat-1", buildingId, flatNumber: "1A" },
                  renter: { id: "renter-1", fullName: "Tenant 1" },
                },
                {
                  id: "contract-2",
                  monthlyRent: "29000.00",
                  serviceCharge: "5000.00",
                  flat: { id: "flat-2", buildingId, flatNumber: "2A" },
                  renter: { id: "renter-2", fullName: "Tenant 2" },
                },
              ],
            },
            bills: {
              findFirst: async () => {
                // Mock contract-1 already has bill for 2026-11
                return insertedBillCount > 0 ? { id: "existing-bill" } : null;
              },
            },
          },
          insert: () => ({
            values: (val: any) => {
              insertedBillCount++;
              const p = Promise.resolve([val]) as any;
              p.returning = async () => [val];
              return p;
            },
          }),
        };
        return await callback(txMock);
      },
    } as any;

    const caller = appRouter.createCaller({
      db: mockDb,
      session: {
        user: { id: managerUserId, email: "manager@example.com", name: "Manager" },
        session: { id: "sess-1", activeOrganizationId: orgId },
      } as any,
      organizationId: orgId,
      requestId: "req-generate-bills",
    });

    // 1st run: Generates bills
    const result1 = await caller.billing.generateMonthlyBills({
      buildingId,
      billingMonth: "2026-11",
      dueDate: "2026-11-10",
    });

    expect(result1.createdCount).toBe(1);
    expect(result1.skippedCount).toBe(1);
  });

  it("updateBillUtilities recalculates total and balance due accurately", async () => {
    let updatedTotal = "";
    let updatedBalance = "";

    const mockDb = {
      query: {
        members: {
          findFirst: async () => ({
            id: "mem-1",
            role: "manager",
            organizationId: orgId,
            userId: managerUserId,
          }),
        },
      },
      transaction: async (callback: any) => {
        const txMock = {
          query: {
            bills: {
              findFirst: async () => ({
                id: billId,
                organizationId: orgId,
                rentAmount: "28000.00",
                serviceChargeAmount: "5000.00",
                advanceAdjustedAmount: "0.00",
                amountPaid: "0.00",
                notes: "Initial",
              }),
            },
          },
          update: () => ({
            set: (data: any) => {
              updatedTotal = data.totalAmount;
              updatedBalance = data.balanceDue;
              return {
                where: () => {
                  const p = Promise.resolve([data]) as any;
                  p.returning = async () => [data];
                  return p;
                },
              };
            },
          }),
          insert: () => ({
            values: () => Promise.resolve([]),
          }),
        };
        return await callback(txMock);
      },
    } as any;

    const caller = appRouter.createCaller({
      db: mockDb,
      session: {
        user: { id: managerUserId, email: "manager@example.com", name: "Manager" },
        session: { id: "sess-1", activeOrganizationId: orgId },
      } as any,
      organizationId: orgId,
      requestId: "req-update-utils",
    });

    await caller.billing.updateBillUtilities({
      billId,
      gasAmount: 1080,
      waterAmount: 650,
      electricityAmount: 3450,
      wasteAndOtherAmount: 300,
      lateFeeAmount: 0,
    });

    // 28000 + 5000 + 1080 + 650 + 3450 + 300 = 38480
    expect(updatedTotal).toBe("38480.00");
    expect(updatedBalance).toBe("38480.00");
  });

  it("adjusting advance when remaining balance is insufficient throws DEPOSIT_INSUFFICIENT", async () => {
    const mockDb = {
      query: {
        members: {
          findFirst: async () => ({
            id: "mem-1",
            role: "manager",
            organizationId: orgId,
            userId: managerUserId,
          }),
        },
      },
      transaction: async (callback: any) => {
        const txMock = {
          query: {
            rentalContracts: {
              findFirst: async () => ({
                id: contractId,
                organizationId: orgId,
                remainingDepositBalance: "20000.00", // Only 20k remaining
              }),
            },
            bills: {
              findFirst: async () => ({
                id: billId,
                organizationId: orgId,
                contractId,
                balanceDue: "34000.00",
              }),
            },
          },
        };
        return await callback(txMock);
      },
    } as any;

    const caller = appRouter.createCaller({
      db: mockDb,
      session: {
        user: { id: managerUserId, email: "manager@example.com", name: "Manager" },
        session: { id: "sess-1", activeOrganizationId: orgId },
      } as any,
      organizationId: orgId,
      requestId: "req-insufficient-deposit",
    });

    try {
      await caller.billing.applyAdvanceAdjustment({
        contractId,
        billId,
        amount: 34000, // Wants 34k but only 20k left
        note: "Attempted excessive advance adjustment",
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("BAD_REQUEST");
      expect(err.message).toBe("DEPOSIT_INSUFFICIENT");
    }
  });

  it("advance adjustment decrements contract remainingDepositBalance and bill balanceDue atomically", async () => {
    let updatedDepositBalance = "";
    let updatedAdvanceAdjusted = "";
    let updatedBillBalance = "";
    let ledgerEntryInserted = false;

    const mockDb = {
      query: {
        members: {
          findFirst: async () => ({
            id: "mem-1",
            role: "manager",
            organizationId: orgId,
            userId: managerUserId,
          }),
        },
      },
      transaction: async (callback: any) => {
        const txMock = {
          query: {
            rentalContracts: {
              findFirst: async () => ({
                id: contractId,
                organizationId: orgId,
                remainingDepositBalance: "58000.00",
              }),
            },
            bills: {
              findFirst: async () => ({
                id: billId,
                organizationId: orgId,
                contractId,
                totalAmount: "34000.00",
                advanceAdjustedAmount: "0.00",
                amountPaid: "0.00",
                balanceDue: "34000.00",
                status: "unpaid",
              }),
            },
          },
          update: () => ({
            set: (data: any) => {
              if (data.remainingDepositBalance)
                updatedDepositBalance = data.remainingDepositBalance;
              if (data.advanceAdjustedAmount) updatedAdvanceAdjusted = data.advanceAdjustedAmount;
              if (data.balanceDue) updatedBillBalance = data.balanceDue;
              return {
                where: () => {
                  const p = Promise.resolve([data]) as any;
                  p.returning = async () => [data];
                  return p;
                },
              };
            },
          }),
          insert: () => ({
            values: (val: any) => {
              ledgerEntryInserted = true;
              const p = Promise.resolve([val]) as any;
              p.returning = async () => [val];
              return p;
            },
          }),
        };
        return await callback(txMock);
      },
    } as any;

    const caller = appRouter.createCaller({
      db: mockDb,
      session: {
        user: { id: managerUserId, email: "manager@example.com", name: "Manager" },
        session: { id: "sess-1", activeOrganizationId: orgId },
      } as any,
      organizationId: orgId,
      requestId: "req-apply-adjustment",
    });

    const res = await caller.billing.applyAdvanceAdjustment({
      contractId,
      billId,
      amount: 34000,
      note: "Full settlement against deposit",
    });

    expect(updatedDepositBalance).toBe("24000.00"); // 58000 - 34000
    expect(updatedAdvanceAdjusted).toBe("34000.00");
    expect(updatedBillBalance).toBe("0.00");
    expect(ledgerEntryInserted).toBe(true);
    expect(res.remainingDepositBalance).toBe("24000.00");
  });

  it("recording payment exceeding balanceDue throws PAYMENT_EXCEEDS_BALANCE", async () => {
    const mockDb = {
      query: {
        members: {
          findFirst: async () => ({
            id: "mem-1",
            role: "manager",
            organizationId: orgId,
            userId: managerUserId,
          }),
        },
      },
      transaction: async (callback: any) => {
        const txMock = {
          query: {
            bills: {
              findFirst: async () => ({
                id: billId,
                organizationId: orgId,
                totalAmount: "38000.00",
                balanceDue: "10000.00", // Only 10k due
              }),
            },
          },
        };
        return await callback(txMock);
      },
    } as any;

    const caller = appRouter.createCaller({
      db: mockDb,
      session: {
        user: { id: managerUserId, email: "manager@example.com", name: "Manager" },
        session: { id: "sess-1", activeOrganizationId: orgId },
      } as any,
      organizationId: orgId,
      requestId: "req-excessive-payment",
    });

    try {
      await caller.billing.recordPayment({
        billId,
        amount: 15000, // 15k exceeds 10k balance
        paymentDate: "2026-10-08",
        paymentMethod: "cash",
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("UNPROCESSABLE_CONTENT");
      expect(err.message).toBe("PAYMENT_EXCEEDS_BALANCE");
    }
  });

  it("recording electronic payment requires valid transactionId", async () => {
    const mockDb = {
      query: {
        members: {
          findFirst: async () => ({
            id: "mem-1",
            role: "manager",
            organizationId: orgId,
            userId: managerUserId,
          }),
        },
      },
    } as any;

    const caller = appRouter.createCaller({
      db: mockDb,
      session: {
        user: { id: managerUserId, email: "manager@example.com", name: "Manager" },
        session: { id: "sess-1", activeOrganizationId: orgId },
      } as any,
      organizationId: orgId,
      requestId: "req-missing-trxid",
    });

    try {
      await caller.billing.recordPayment({
        billId,
        amount: 5000,
        paymentDate: "2026-10-08",
        paymentMethod: "bkash",
        transactionId: "", // Empty transactionId for bKash
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("UNPROCESSABLE_CONTENT");
      expect(err.message).toBe("INVALID_TRANSACTION_ID");
    }
  });

  it("recording payment decrements balanceDue, generates receipt, and updates status", async () => {
    let insertedPayment: any = null;
    let updatedBillData: any = null;

    const mockDb = {
      query: {
        members: {
          findFirst: async () => ({
            id: "mem-1",
            role: "manager",
            organizationId: orgId,
            userId: managerUserId,
          }),
        },
      },
      transaction: async (callback: any) => {
        const txMock = {
          query: {
            bills: {
              findFirst: async () => ({
                id: billId,
                organizationId: orgId,
                totalAmount: "38230.00",
                advanceAdjustedAmount: "0.00",
                amountPaid: "0.00",
                balanceDue: "38230.00",
                status: "unpaid",
              }),
            },
          },
          insert: () => ({
            values: (val: any) => {
              if (val.receiptNumber) {
                insertedPayment = val;
              }
              const p = Promise.resolve([val]) as any;
              p.returning = async () => [val];
              return p;
            },
          }),
          update: () => ({
            set: (data: any) => {
              updatedBillData = data;
              return {
                where: () => {
                  const p = Promise.resolve([data]) as any;
                  p.returning = async () => [data];
                  return p;
                },
              };
            },
          }),
        };
        return await callback(txMock);
      },
    } as any;

    const caller = appRouter.createCaller({
      db: mockDb,
      session: {
        user: { id: managerUserId, email: "manager@example.com", name: "Manager" },
        session: { id: "sess-1", activeOrganizationId: orgId },
      } as any,
      organizationId: orgId,
      requestId: "req-record-payment",
    });

    const _result = await caller.billing.recordPayment({
      billId,
      amount: 38230,
      paymentDate: "2026-10-07",
      paymentMethod: "bkash",
      transactionId: "BK9A7X32LM",
      note: "bKash personal payment",
    });

    expect(insertedPayment).toBeDefined();
    expect(insertedPayment.receiptNumber).toMatch(/^REC-20261007-\d{4}$/);
    expect(updatedBillData.amountPaid).toBe("38230.00");
    expect(updatedBillData.balanceDue).toBe("0.00");
    expect(updatedBillData.status).toBe("paid");
  });

  it("enforces role restrictions blocking regular members from recording payments", async () => {
    const mockDb = {
      query: {
        members: {
          findFirst: async () => ({
            id: "mem-read-only",
            role: "member", // regular member
            organizationId: orgId,
            userId: "user-read-only",
          }),
        },
      },
    } as any;

    const caller = appRouter.createCaller({
      db: mockDb,
      session: {
        user: { id: "user-read-only", email: "member@example.com", name: "Member" },
        session: { id: "sess-read-only", activeOrganizationId: orgId },
      } as any,
      organizationId: orgId,
      requestId: "req-unauthorized-payment",
    });

    try {
      await caller.billing.recordPayment({
        billId,
        amount: 1000,
        paymentDate: "2026-10-08",
        paymentMethod: "cash",
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("FORBIDDEN");
    }
  });

  it("restricts getMyBillById and throws FORBIDDEN when tenant does not own the lease", async () => {
    const mockDb = {
      query: {
        bills: {
          findFirst: async () => ({
            id: billId,
            contract: {
              renter: {
                userId: "other-tenant-user-888", // Tenant B
              },
            },
          }),
        },
      },
    } as any;

    const caller = appRouter.createCaller({
      db: mockDb,
      session: {
        user: { id: "tenant-user-111", email: "tenant@example.com", name: "Tenant" },
        session: { id: "sess-tenant" },
      } as any,
      organizationId: null,
      requestId: "req-forbidden-bill",
    });

    try {
      await caller.billing.getMyBillById({ billId });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("FORBIDDEN");
      expect(err.message).toBe("UNAUTHORIZED_BILL_ACCESS");
    }
  });

  it("getPortalFlatBilling does not leak other flats' contracts or bills when flat has no active contract", async () => {
    const token = issuePortalToken({ flatId: "flat-vacant-2b", organizationId: orgId }).token;
    const mockDb = {
      query: {
        flats: {
          findFirst: async () => ({
            id: "flat-vacant-2b",
            flatNumber: "2B",
            floor: 2,
            unitType: "residential",
            bedrooms: 2,
            bathrooms: 2,
            squareFeet: 1200,
            status: "vacant",
            buildingId: "bld-test",
            building: {
              name: "Test Residency",
              emergencyContacts: [],
            },
            rentalContracts: [], // No active contracts!
          }),
        },
        notices: {
          findMany: async () => [],
        },
        maintenanceRequests: {
          findMany: async () => [],
        },
      },
    } as any;

    const caller = appRouter.createCaller({
      db: mockDb,
      session: null,
      organizationId: null,
      requestId: "req-portal-billing-vacant",
      portalToken: token,
    });

    const result = await caller.billing.getPortalFlatBilling();

    expect(result.flat.flatNumber).toBe("2B");
    expect(result.contract).toBeNull();
    expect(result.bills).toEqual([]);
  });

  it("getPortalFlatBilling throws FLAT_NOT_FOUND when the token does not resolve to a flat", async () => {
    const token = issuePortalToken({ flatId: "flat-missing", organizationId: orgId }).token;
    const mockDb = {
      query: {
        flats: {
          findFirst: async () => undefined,
        },
      },
      notices: {
        findMany: async () => [],
      },
      maintenanceRequests: {
        findMany: async () => [],
      },
    } as any;

    const caller = appRouter.createCaller({
      db: mockDb,
      session: null,
      organizationId: null,
      requestId: "req-portal-billing-notfound",
      portalToken: token,
    });

    try {
      await caller.billing.getPortalFlatBilling();
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("NOT_FOUND");
      expect(err.message).toBe("Portal session is not linked to a valid flat");
    }
  });

  it("payPortalBill records payment as pending awaiting staff verification and does not mutate the bill", async () => {
    const insertedRows: any[] = [];
    let updateCalled = false;
    const token = issuePortalToken({ flatId: "flat-1a", organizationId: orgId }).token;

    const mockDb = {
      transaction: async (cb: any) => {
        const txMock = {
          query: {
            bills: {
              findFirst: async () => ({
                id: billId,
                organizationId: orgId,
                totalAmount: "10000.00",
                advanceAdjustedAmount: "0.00",
                amountPaid: "0.00",
                balanceDue: "10000.00",
                status: "unpaid",
                paidAt: null,
                contract: {
                  flatId: "flat-1a",
                  renter: { userId: "user-portal-tenant" },
                  flat: { flatNumber: "1A" },
                },
              }),
            },
          },
          insert: () => ({
            values: (val: any) => {
              insertedRows.push(val);
              return {
                returning: async () => [val],
              };
            },
          }),
          update: () => {
            updateCalled = true;
            return {
              set: (data: any) => ({
                where: () => ({
                  returning: async () => [data],
                }),
              }),
            };
          },
        };
        return await cb(txMock);
      },
    } as any;

    const caller = appRouter.createCaller({
      db: mockDb,
      session: null,
      organizationId: null,
      requestId: "req-pay-portal-bill",
      portalToken: token,
    });

    const result = await caller.billing.payPortalBill({
      billId,
      amount: 10000, // Pays 100% of balance due — must still stay pending
      paymentMethod: "bkash",
      transactionId: "TRX998877",
    });

    const payment = insertedRows[0];
    expect(payment).toBeDefined();
    expect(payment.status).toBe("pending");
    expect(payment.note).toContain("Awaiting manual verification by staff");
    expect(result?.payment?.status).toBe("pending");
    expect((result as any)?.requiresVerification).toBe(true);
    // The critical assertion: no bill update may happen before verification.
    expect(updateCalled).toBe(false);
  });

  it("payPortalBill refuses a bill that belongs to another flat", async () => {
    const token = issuePortalToken({ flatId: "flat-1a", organizationId: orgId }).token;

    const mockDb = {
      transaction: async (cb: any) =>
        cb({
          query: {
            bills: {
              findFirst: async () => ({
                id: billId,
                organizationId: orgId,
                totalAmount: "10000.00",
                advanceAdjustedAmount: "0.00",
                amountPaid: "0.00",
                balanceDue: "10000.00",
                status: "unpaid",
                paidAt: null,
                contract: {
                  flatId: "flat-other",
                  renter: { userId: "user-other" },
                  flat: { flatNumber: "9Z" },
                },
              }),
            },
          },
        }),
    } as any;

    const caller = appRouter.createCaller({
      db: mockDb,
      session: null,
      organizationId: null,
      requestId: "req-pay-portal-cross-flat",
      portalToken: token,
    });

    try {
      await caller.billing.payPortalBill({
        billId,
        amount: 1000,
        paymentMethod: "bkash",
        transactionId: "TRX0001",
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("FORBIDDEN");
    }
  });
});
