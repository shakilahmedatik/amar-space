import { jsonb, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { bookings } from "./hotel";
import { organizations } from "./organizations";
import { rentalContracts } from "./renters";

export const bills = pgTable("bills", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  contractId: text("contract_id")
    .notNull()
    .references(() => rentalContracts.id, { onDelete: "cascade" }),
  billingMonth: text("billing_month").notNull(), // YYYY-MM
  rentAmount: numeric("rent_amount", { precision: 12, scale: 2 }).notNull(),
  utilityCharges: jsonb("utility_charges").default([]), // [{ description, amount }]
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("unpaid"), // 'unpaid' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled'
  dueDate: text("due_date"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  billId: text("bill_id").references(() => bills.id, { onDelete: "set null" }),
  bookingId: text("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(), // 'cash' | 'bank_transfer' | 'mobile_banking' | 'paystation' | 'bkash' | 'nagad' | 'stripe'
  transactionId: text("transaction_id"),
  paymentDate: text("payment_date").notNull(), // YYYY-MM-DD
  status: text("status").notNull().default("completed"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
