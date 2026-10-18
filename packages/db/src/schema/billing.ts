import { index, jsonb, numeric, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { bookings } from "./hotel";
import { organizations } from "./organizations";
import { rentalContracts } from "./renters";

export const bills = pgTable(
  "bills",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    contractId: text("contract_id")
      .notNull()
      .references(() => rentalContracts.id, { onDelete: "cascade" }),
    billNumber: text("bill_number").notNull().default("INV-DRAFT"),
    billingMonth: text("billing_month").notNull(), // "2026-11" (YYYY-MM)
    rentAmount: numeric("rent_amount", { precision: 12, scale: 2 }).notNull(),
    serviceChargeAmount: numeric("service_charge_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0.00"),
    gasAmount: numeric("gas_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
    waterAmount: numeric("water_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
    electricityAmount: numeric("electricity_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0.00"),
    wasteAndOtherAmount: numeric("waste_and_other_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0.00"),
    lateFeeAmount: numeric("late_fee_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0.00"),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
    advanceAdjustedAmount: numeric("advance_adjusted_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0.00"),
    amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }).notNull().default("0.00"),
    balanceDue: numeric("balance_due", { precision: 12, scale: 2 }).notNull().default("0.00"),
    status: text("status").notNull().default("unpaid"), // 'unpaid' | 'partially_paid' | 'paid' | 'overdue' | 'adjusted' | 'cancelled'
    dueDate: text("due_date"), // YYYY-MM-DD
    paidAt: timestamp("paid_at", { withTimezone: true }),
    notes: text("notes"),
    utilityCharges: jsonb("utility_charges").default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgContractMonthIdx: uniqueIndex("bills_org_contract_month_idx").on(
      table.organizationId,
      table.contractId,
      table.billingMonth,
    ),
    orgStatusIdx: index("bills_org_status_idx").on(table.organizationId, table.status),
    orgDueDateIdx: index("bills_org_due_date_idx").on(table.organizationId, table.dueDate),
  }),
);

export const advanceAdjustments = pgTable(
  "advance_adjustments",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    contractId: text("contract_id")
      .notNull()
      .references(() => rentalContracts.id, { onDelete: "cascade" }),
    adjustedAgainstBillId: text("adjusted_against_bill_id").references(() => bills.id, {
      onDelete: "set null",
    }),
    adjustmentType: text("adjustment_type").notNull().default("rent_adjustment"), // 'rent_adjustment' | 'utility_adjustment' | 'damage_deduction' | 'refund_upon_termination'
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    balanceBefore: numeric("balance_before", { precision: 12, scale: 2 }).notNull(),
    balanceAfter: numeric("balance_after", { precision: 12, scale: 2 }).notNull(),
    note: text("note").notNull(),
    adjustedBy: text("adjusted_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    contractAdjustmentIdx: index("advance_adjustments_contract_idx").on(table.contractId),
    billAdjustmentIdx: index("advance_adjustments_bill_idx").on(table.adjustedAgainstBillId),
  }),
);

export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    billId: text("bill_id").references(() => bills.id, { onDelete: "set null" }),
    bookingId: text("booking_id").references(() => bookings.id, { onDelete: "set null" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    paymentMethod: text("payment_method").notNull(), // 'cash' | 'bank_transfer' | 'mobile_banking' | 'paystation' | 'bkash' | 'nagad' | 'rocket' | 'sslcommerz'
    transactionId: text("transaction_id"),
    paymentDate: text("payment_date").notNull(), // YYYY-MM-DD
    receiptNumber: text("receipt_number").notNull().default("REC-DRAFT"),
    receivedBy: text("received_by").references(() => users.id, { onDelete: "set null" }),
    status: text("status").notNull().default("completed"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    billPaymentIdx: index("payments_bill_idx").on(table.billId),
    orgDateIdx: index("payments_org_date_idx").on(table.organizationId, table.paymentDate),
  }),
);
