import { z } from "zod";

export const billStatusEnum = z.enum([
  "unpaid",
  "partially_paid",
  "paid",
  "overdue",
  "adjusted",
  "cancelled",
]);

export const paymentMethodEnum = z.enum([
  "cash",
  "bank_transfer",
  "mobile_banking",
  "paystation",
  "bkash",
  "nagad",
  "rocket",
  "sslcommerz",
  "stripe",
  "card",
]);

export const adjustmentTypeEnum = z.enum([
  "rent_adjustment",
  "utility_adjustment",
  "damage_deduction",
  "refund_upon_termination",
]);

export const subscriptionPlanEnum = z.enum(["trial_6_month", "pro_monthly", "pro_yearly"]);

export const subscriptionStatusEnum = z.enum([
  "trialing",
  "active",
  "past_due",
  "canceled",
  "expired",
]);

export const billingMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Format: YYYY-MM");

export const generateMonthlyBillsSchema = z.object({
  buildingId: z.string().min(1, "Building ID is required"),
  billingMonth: billingMonthSchema,
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be YYYY-MM-DD"),
  notes: z.string().max(500).optional(),
});

export const updateBillUtilitiesSchema = z.object({
  billId: z.string().min(1, "Bill ID is required"),
  gasAmount: z.number().nonnegative("Gas amount must be non-negative").default(0),
  waterAmount: z.number().nonnegative("Water amount must be non-negative").default(0),
  electricityAmount: z.number().nonnegative("Electricity amount must be non-negative").default(0),
  wasteAndOtherAmount: z
    .number()
    .nonnegative("Waste and other charges must be non-negative")
    .default(0),
  lateFeeAmount: z.number().nonnegative("Late fee must be non-negative").default(0),
  notes: z.string().max(500).optional(),
});

export const applyAdvanceAdjustmentSchema = z.object({
  contractId: z.string().min(1, "Contract ID is required"),
  billId: z.string().min(1, "Bill ID is required"),
  amount: z.number().positive("Adjustment amount must be positive"),
  adjustmentType: adjustmentTypeEnum.default("rent_adjustment"),
  note: z.string().min(3, "Reason for adjustment is required").max(500),
});

export const recordPaymentSchema = z.object({
  billId: z.string().min(1, "Bill ID is required"),
  amount: z.number().positive("Payment amount must be greater than zero"),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Payment date must be YYYY-MM-DD"),
  paymentMethod: paymentMethodEnum,
  transactionId: z.string().max(100).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

export const payBillSchema = z.object({
  billId: z.string().min(1, "Bill ID is required"),
  amount: z.coerce.number().positive("Payment amount must be greater than zero"),
  paymentMethod: paymentMethodEnum.default("bkash"),
  transactionId: z.string().min(4, "Transaction reference or ID is required").max(100),
  note: z.string().max(500).optional().nullable(),
});

export const createSubscriptionCheckoutSchema = z.object({
  plan: subscriptionPlanEnum,
  provider: z.enum(["paystation", "bkash", "stripe"]),
});

export interface BillFinancials {
  rentAmount: number;
  serviceChargeAmount: number;
  gasAmount: number;
  waterAmount: number;
  electricityAmount: number;
  wasteAndOtherAmount: number;
  lateFeeAmount: number;
  advanceAdjustedAmount: number;
  amountPaid: number;
}

export function calculateBillTotals(lineItems: BillFinancials) {
  const totalAmount =
    lineItems.rentAmount +
    lineItems.serviceChargeAmount +
    lineItems.gasAmount +
    lineItems.waterAmount +
    lineItems.electricityAmount +
    lineItems.wasteAndOtherAmount +
    lineItems.lateFeeAmount;

  const rawBalance = totalAmount - lineItems.advanceAdjustedAmount - lineItems.amountPaid;
  const balanceDue = Math.max(0, Math.round(rawBalance * 100) / 100);

  let status: BillStatus = "unpaid";
  if (balanceDue <= 0) {
    if (lineItems.advanceAdjustedAmount >= totalAmount && lineItems.amountPaid === 0) {
      status = "adjusted";
    } else {
      status = "paid";
    }
  } else if (lineItems.amountPaid > 0 || lineItems.advanceAdjustedAmount > 0) {
    status = "partially_paid";
  }

  return {
    totalAmount: Math.round(totalAmount * 100) / 100,
    balanceDue,
    status,
  };
}

export function validateDepositAdjustmentSafety(
  remainingDepositBalance: number,
  adjustmentAmount: number,
): boolean {
  return remainingDepositBalance >= adjustmentAmount && adjustmentAmount > 0;
}

export const BILLING_ERROR_CODES = {
  BILL_ALREADY_EXISTS: "BILL_ALREADY_EXISTS",
  DEPOSIT_INSUFFICIENT: "DEPOSIT_INSUFFICIENT",
  BILL_ALREADY_PAID: "BILL_ALREADY_PAID",
  PAYMENT_EXCEEDS_BALANCE: "PAYMENT_EXCEEDS_BALANCE",
  INVALID_TRANSACTION_ID: "INVALID_TRANSACTION_ID",
  BILL_NOT_FOUND: "BILL_NOT_FOUND",
  CONTRACT_NOT_FOUND: "CONTRACT_NOT_FOUND",
  UNAUTHORIZED_BILL_ACCESS: "UNAUTHORIZED_BILL_ACCESS",
} as const;

export type BillStatus = z.infer<typeof billStatusEnum>;
export type PaymentMethod = z.infer<typeof paymentMethodEnum>;
export type AdjustmentType = z.infer<typeof adjustmentTypeEnum>;
export type SubscriptionPlan = z.infer<typeof subscriptionPlanEnum>;
export type SubscriptionStatus = z.infer<typeof subscriptionStatusEnum>;
export type GenerateMonthlyBillsInput = z.infer<typeof generateMonthlyBillsSchema>;
export type UpdateBillUtilitiesInput = z.infer<typeof updateBillUtilitiesSchema>;
export type ApplyAdvanceAdjustmentInput = z.infer<typeof applyAdvanceAdjustmentSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type PayBillInput = z.infer<typeof payBillSchema>;
