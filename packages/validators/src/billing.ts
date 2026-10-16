import { z } from "zod";
import { uuidSchema } from "./common";

export const billStatusEnum = z.enum(["unpaid", "partially_paid", "paid", "overdue", "cancelled"]);

export const paymentMethodEnum = z.enum([
  "cash",
  "bank_transfer",
  "mobile_banking",
  "paystation",
  "bkash",
  "nagad",
  "stripe",
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

export const recordPaymentSchema = z.object({
  billId: uuidSchema,
  amount: z.number().positive(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD"),
  paymentMethod: paymentMethodEnum,
  transactionId: z.string().max(100).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

export const createSubscriptionCheckoutSchema = z.object({
  plan: subscriptionPlanEnum,
  provider: z.enum(["paystation", "bkash", "stripe"]),
});

export type BillStatus = z.infer<typeof billStatusEnum>;
export type PaymentMethod = z.infer<typeof paymentMethodEnum>;
export type SubscriptionPlan = z.infer<typeof subscriptionPlanEnum>;
export type SubscriptionStatus = z.infer<typeof subscriptionStatusEnum>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
