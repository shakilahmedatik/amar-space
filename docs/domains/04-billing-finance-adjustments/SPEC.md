# Domain 04: Billing, Finance & Advance Adjustments — Specification

> **Package:** `@omniheaven/db`, `@omniheaven/validators`, `@omniheaven/trpc`  
> **Status:** Specification Complete (Ready for Implementation)  
> **Standard:** Production-Grade Bangladeshi Real Estate Financial Engine (Automated Invoicing, Meter Calculations, Advance Adjustments, MFS)

---

## 1. Business Requirements & Domain Invariants

### 1.1 Core Purpose
Provide a fully auditable double-entry-style financial engine for residential and commercial properties. Handle monthly rent generation, utility charges (gas, water, electricity meter diffs, waste management, parking), advance security deposit drawdowns, and omni-channel payments (bKash, Nagad, Rocket, Bank Transfer, Cash).

### 1.2 Domain Invariants (Non-Negotiable Rules)
1. **Advance Deposit Balance Invariant:**
   - At any point in time:
     $$\text{remainingDepositBalance} = \text{securityDepositAmount} - \sum(\text{advance\_adjustments})$$
   - `remainingDepositBalance` can **never** become negative. If an adjustment exceeds available advance balance, the transaction must throw `DEPOSIT_INSUFFICIENT` and rollback.
2. **Bill Total Integrity:**
   $$\text{totalAmount} = \text{rentAmount} + \text{serviceChargeAmount} + \text{gasAmount} + \text{waterAmount} + \text{electricityAmount} + \text{otherCharges} + \text{lateFee}$$
   $$\text{balanceDue} = \text{totalAmount} - \text{advanceAdjustedAmount} - \text{amountPaid}$$
3. **Bill Status Determinism:**
   - If $\text{balanceDue} \le 0$ and $\text{advanceAdjustedAmount} == \text{totalAmount}$, status is `"adjusted"`.
   - If $\text{balanceDue} \le 0$ and payments exist, status is `"paid"`.
   - If $\text{amountPaid} + \text{advanceAdjustedAmount} > 0$ and $\text{balanceDue} > 0$, status is `"partially_paid"`.
   - If unpaid and past `dueDate`, status is `"overdue"`.
4. **Idempotent Invoicing:** Generating monthly bills for a billing month (e.g., `"2026-11"`) can only occur once per active contract. Duplicate billing runs must skip or reject already-generated contracts.
5. **Payment Auditability:** A payment record is immutable once created. Any correction must be handled via a refund record or adjustment note.

---

## 2. Advance Adjustment & Billing Flow

```
   ┌──────────────────────────────────────────────────────────────┐
   │            Contract Remaining Deposit Balance                │
   │                      (e.g., ৳ 60,000)                        │
   └──────────────────────────────┬───────────────────────────────┘
                                  │
                  Manager / System Applies Adjustment
                      (e.g., Last Month's Rent)
                                  │
                                  ▼
   ┌──────────────────────────────────────────────────────────────┐
   │                  advance_adjustments Record                  │
   │  Amount: ৳ 30,000 | Bill: #INV-2026-11-04B | Actor: Manager   │
   └──────────────┬───────────────────────────────┬───────────────┘
                  │                               │
                  ▼                               ▼
   ┌──────────────────────────────┐ ┌─────────────────────────────┐
   │    Deduct from Contract      │ │    Apply Credit to Bill     │
   │  Remaining: ৳ 30,000         │ │  advanceAdjustedAmount +=   │
   │                              │ │  balanceDue reduced         │
   └──────────────────────────────┘ └─────────────────────────────┘
```

---

## 3. Database Schema Specification

```typescript
// packages/db/src/schema/billing.ts
import { numeric, pgTable, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { rentalContracts } from "./renters";
import { users } from "./auth";

export const bills = pgTable(
  "bills",
  {
    id: text("id").primaryKey(), // ULID
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    contractId: text("contract_id")
      .notNull()
      .references(() => rentalContracts.id, { onDelete: "cascade" }),
    billNumber: text("bill_number").notNull(), // e.g. "INV-202611-04B"
    billingMonth: text("billing_month").notNull(), // "2026-11" (YYYY-MM)
    rentAmount: numeric("rent_amount", { precision: 12, scale: 2 }).notNull(),
    serviceChargeAmount: numeric("service_charge_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
    gasAmount: numeric("gas_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
    waterAmount: numeric("water_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
    electricityAmount: numeric("electricity_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
    wasteAndOtherAmount: numeric("waste_and_other_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
    lateFeeAmount: numeric("late_fee_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
    advanceAdjustedAmount: numeric("advance_adjusted_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
    amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }).notNull().default("0.00"),
    balanceDue: numeric("balance_due", { precision: 12, scale: 2 }).notNull(),
    status: text("status").notNull().default("unpaid"), // 'unpaid' | 'partially_paid' | 'paid' | 'overdue' | 'adjusted' | 'cancelled'
    dueDate: text("due_date").notNull(), // YYYY-MM-DD (typically 10th of the month in BD)
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgContractMonthIdx: uniqueIndex("bills_org_contract_month_idx").on(
      table.organizationId,
      table.contractId,
      table.billingMonth
    ),
    orgStatusIdx: index("bills_org_status_idx").on(table.organizationId, table.status),
    orgDueDateIdx: index("bills_org_due_date_idx").on(table.organizationId, table.dueDate),
  })
);

export const advanceAdjustments = pgTable(
  "advance_adjustments",
  {
    id: text("id").primaryKey(), // ULID
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    contractId: text("contract_id")
      .notNull()
      .references(() => rentalContracts.id, { onDelete: "cascade" }),
    adjustedAgainstBillId: text("adjusted_against_bill_id")
      .references(() => bills.id, { onDelete: "set null" }),
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
  })
);

export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey(), // ULID
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    billId: text("bill_id").references(() => bills.id, { onDelete: "set null" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    paymentMethod: text("payment_method").notNull(), // 'bkash' | 'nagad' | 'rocket' | 'bank_transfer' | 'cash' | 'sslcommerz'
    transactionId: text("transaction_id"), // Bank Ref / bKash TrxID
    paymentDate: text("payment_date").notNull(), // YYYY-MM-DD
    receivedBy: text("received_by").references(() => users.id, { onDelete: "set null" }),
    receiptNumber: text("receipt_number").notNull().unique(), // e.g. "REC-202611-0081"
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    billPaymentIdx: index("payments_bill_idx").on(table.billId),
    orgDateIdx: index("payments_org_date_idx").on(table.organizationId, table.paymentDate),
  })
);
```

---

## 4. tRPC Procedure Signatures

```typescript
// packages/trpc/src/routers/billing.ts
export const billingRouter = createTRPCRouter({
  // Invoices / Bills
  listBills: orgProtectedProcedure
    .input(z.object({
      billingMonth: z.string().optional(),
      status: z.enum(["unpaid", "partially_paid", "paid", "overdue", "adjusted", "cancelled"]).optional(),
      flatId: z.string().optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => { /* ... */ }),

  getBillById: orgProtectedProcedure
    .input(z.object({ billId: z.string() }))
    .query(async ({ ctx, input }) => { /* ... */ }),

  generateMonthlyBills: orgProtectedProcedure
    .input(z.object({
      buildingId: z.string(),
      billingMonth: z.string().regex(/^\d{4}-\d{2}$/), // "2026-11"
      dueDate: z.string(), // "2026-11-10"
    }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  updateBillUtilities: orgProtectedProcedure
    .input(updateBillUtilitiesSchema)
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  // Advance Deposit Adjustments
  applyAdvanceAdjustment: orgProtectedProcedure
    .input(applyAdvanceAdjustmentSchema)
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  listAdvanceAdjustments: orgProtectedProcedure
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => { /* ... */ }),

  // Payments & Receipts
  recordPayment: orgProtectedProcedure
    .input(recordPaymentSchema)
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  getReceiptById: orgProtectedProcedure
    .input(z.object({ paymentId: z.string() }))
    .query(async ({ ctx, input }) => { /* ... */ }),
});
```

---

## 5. Domain Error Codes

| Code | HTTP Status | Description | Actionable Guidance |
|---|:---:|---|---|
| `BILL_ALREADY_EXISTS` | 409 | Monthly bill already generated for this contract & month | Update the existing bill instead |
| `DEPOSIT_INSUFFICIENT` | 400 | Requested adjustment exceeds available remaining advance deposit balance | Adjust within remaining balance |
| `BILL_ALREADY_PAID` | 400 | Cannot apply payments or adjustments to a fully settled bill | Verify invoice balance |
| `PAYMENT_EXCEEDS_BALANCE`| 422 | Payment amount exceeds the remaining balance due | Enter amount equal or lesser than balance due |
| `INVALID_TRANSACTION_ID` | 422 | Required MFS transaction ID missing or invalid | Provide 10-char bKash/Nagad TrxID |
