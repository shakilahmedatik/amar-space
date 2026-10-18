import { describe, expect, it } from "bun:test";
import {
  applyAdvanceAdjustmentSchema,
  BILLING_ERROR_CODES,
  billingMonthSchema,
  calculateBillTotals,
  generateMonthlyBillsSchema,
  paymentMethodEnum,
  recordPaymentSchema,
  updateBillUtilitiesSchema,
  validateDepositAdjustmentSafety,
} from "../billing";

describe("Domain 04: Billing, Finance & Advance Adjustments Validator Rules", () => {
  it("validates billingMonthSchema format YYYY-MM correctly", () => {
    expect(billingMonthSchema.parse("2026-11")).toBe("2026-11");
    expect(billingMonthSchema.parse("2025-01")).toBe("2025-01");
    expect(billingMonthSchema.parse("2026-12")).toBe("2026-12");

    // Invalid months
    expect(() => billingMonthSchema.parse("2026-13")).toThrow();
    expect(() => billingMonthSchema.parse("2026-00")).toThrow();
    expect(() => billingMonthSchema.parse("2026/11")).toThrow();
    expect(() => billingMonthSchema.parse("2026-1")).toThrow();
    expect(() => billingMonthSchema.parse("Nov-2026")).toThrow();
  });

  it("validates generateMonthlyBillsSchema successfully", () => {
    const valid = generateMonthlyBillsSchema.parse({
      buildingId: "bld-lakeview-1",
      billingMonth: "2026-11",
      dueDate: "2026-11-10",
      notes: "Standard monthly residential billing batch",
    });

    expect(valid.buildingId).toBe("bld-lakeview-1");
    expect(valid.billingMonth).toBe("2026-11");
    expect(valid.dueDate).toBe("2026-11-10");

    // Rejects invalid due date format
    expect(() =>
      generateMonthlyBillsSchema.parse({
        buildingId: "bld-1",
        billingMonth: "2026-11",
        dueDate: "10-11-2026",
      }),
    ).toThrow();
  });

  it("validates updateBillUtilitiesSchema and rejects negative amounts", () => {
    const valid = updateBillUtilitiesSchema.parse({
      billId: "bill-101",
      gasAmount: 1080,
      waterAmount: 650,
      electricityAmount: 3450,
      wasteAndOtherAmount: 300,
      lateFeeAmount: 500,
    });

    expect(valid.electricityAmount).toBe(3450);
    expect(valid.lateFeeAmount).toBe(500);

    // Rejects negative amounts
    expect(() =>
      updateBillUtilitiesSchema.parse({
        billId: "bill-101",
        gasAmount: -500,
      }),
    ).toThrow();

    expect(() =>
      updateBillUtilitiesSchema.parse({
        billId: "bill-101",
        electricityAmount: -100,
      }),
    ).toThrow();
  });

  it("validates applyAdvanceAdjustmentSchema correctly", () => {
    const valid = applyAdvanceAdjustmentSchema.parse({
      contractId: "contract-1a",
      billId: "bill-1a",
      amount: 34000,
      adjustmentType: "rent_adjustment",
      note: "Adjusted against deposit balance for final month",
    });

    expect(valid.amount).toBe(34000);
    expect(valid.adjustmentType).toBe("rent_adjustment");

    // Rejects zero or negative adjustment amount
    expect(() =>
      applyAdvanceAdjustmentSchema.parse({
        contractId: "contract-1a",
        billId: "bill-1a",
        amount: 0,
        note: "Zero adjustment attempt",
      }),
    ).toThrow();

    expect(() =>
      applyAdvanceAdjustmentSchema.parse({
        contractId: "contract-1a",
        billId: "bill-1a",
        amount: -5000,
        note: "Negative adjustment attempt",
      }),
    ).toThrow();
  });

  it("calculates bill totals and status deterministically", () => {
    // 1. Unpaid fresh bill
    const bill1 = calculateBillTotals({
      rentAmount: 28000,
      serviceChargeAmount: 5000,
      gasAmount: 1080,
      waterAmount: 650,
      electricityAmount: 3450,
      wasteAndOtherAmount: 300,
      lateFeeAmount: 0,
      advanceAdjustedAmount: 0,
      amountPaid: 0,
    });
    expect(bill1.totalAmount).toBe(38480);
    expect(bill1.balanceDue).toBe(38480);
    expect(bill1.status).toBe("unpaid");

    // 2. Partially paid bill
    const bill2 = calculateBillTotals({
      rentAmount: 28000,
      serviceChargeAmount: 5000,
      gasAmount: 1080,
      waterAmount: 650,
      electricityAmount: 3450,
      wasteAndOtherAmount: 300,
      lateFeeAmount: 0,
      advanceAdjustedAmount: 0,
      amountPaid: 20000,
    });
    expect(bill2.totalAmount).toBe(38480);
    expect(bill2.balanceDue).toBe(18480);
    expect(bill2.status).toBe("partially_paid");

    // 3. Fully paid bill
    const bill3 = calculateBillTotals({
      rentAmount: 28000,
      serviceChargeAmount: 5000,
      gasAmount: 1080,
      waterAmount: 650,
      electricityAmount: 3450,
      wasteAndOtherAmount: 300,
      lateFeeAmount: 0,
      advanceAdjustedAmount: 0,
      amountPaid: 38480,
    });
    expect(bill3.balanceDue).toBe(0);
    expect(bill3.status).toBe("paid");

    // 4. Settled via advance adjustment
    const bill4 = calculateBillTotals({
      rentAmount: 29000,
      serviceChargeAmount: 5000,
      gasAmount: 0,
      waterAmount: 0,
      electricityAmount: 0,
      wasteAndOtherAmount: 0,
      lateFeeAmount: 0,
      advanceAdjustedAmount: 34000,
      amountPaid: 0,
    });
    expect(bill4.totalAmount).toBe(34000);
    expect(bill4.balanceDue).toBe(0);
    expect(bill4.status).toBe("adjusted");
  });

  it("verifies deposit adjustment safety check", () => {
    // Has enough advance deposit
    expect(validateDepositAdjustmentSafety(56000, 28000)).toBe(true);
    expect(validateDepositAdjustmentSafety(34000, 34000)).toBe(true);

    // Insufficient advance deposit
    expect(validateDepositAdjustmentSafety(20000, 28000)).toBe(false);
    expect(validateDepositAdjustmentSafety(0, 5000)).toBe(false);
    expect(validateDepositAdjustmentSafety(10000, 0)).toBe(false);
    expect(validateDepositAdjustmentSafety(10000, -1000)).toBe(false);
  });

  it("validates payment methods and recordPaymentSchema", () => {
    const validBkash = recordPaymentSchema.parse({
      billId: "bill-101",
      amount: 38480,
      paymentDate: "2026-10-07",
      paymentMethod: "bkash",
      transactionId: "BK9A7X32LM",
      note: "bKash personal merchant payment",
    });
    expect(validBkash.paymentMethod).toBe("bkash");
    expect(validBkash.transactionId).toBe("BK9A7X32LM");

    // Valid payment methods
    const methods = ["cash", "bank_transfer", "bkash", "nagad", "rocket", "sslcommerz"];
    for (const m of methods) {
      expect(paymentMethodEnum.parse(m)).toBe(m as any);
    }
  });

  it("exports standard billing domain error codes", () => {
    expect(BILLING_ERROR_CODES.BILL_ALREADY_EXISTS).toBe("BILL_ALREADY_EXISTS");
    expect(BILLING_ERROR_CODES.DEPOSIT_INSUFFICIENT).toBe("DEPOSIT_INSUFFICIENT");
    expect(BILLING_ERROR_CODES.BILL_ALREADY_PAID).toBe("BILL_ALREADY_PAID");
    expect(BILLING_ERROR_CODES.PAYMENT_EXCEEDS_BALANCE).toBe("PAYMENT_EXCEEDS_BALANCE");
    expect(BILLING_ERROR_CODES.INVALID_TRANSACTION_ID).toBe("INVALID_TRANSACTION_ID");
  });
});
