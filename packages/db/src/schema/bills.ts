import { relations } from 'drizzle-orm'
import {
  date,
  numeric,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { flats } from './flats'
import { rentalContracts } from './rental-contracts'
import { renters } from './renters'
import { users } from './users'

export const bills = pgTable(
  'bills',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerAccountId: uuid('owner_account_id')
      .notNull()
      .references(() => users.id),
    contractId: uuid('contract_id')
      .notNull()
      .references(() => rentalContracts.id),
    flatId: uuid('flat_id')
      .notNull()
      .references(() => flats.id),
    renterId: uuid('renter_id')
      .notNull()
      .references(() => renters.id),
    billingMonth: varchar('billing_month', { length: 7 }).notNull(),
    baseRent: numeric('base_rent', { precision: 12, scale: 2 }).notNull(),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
    paidAmount: numeric('paid_amount', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    status: varchar('status', { length: 20 }).notNull().default('unpaid'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    flatBillingMonthUnique: unique('bills_flat_billing_month_unique').on(
      table.flatId,
      table.billingMonth,
    ),
  }),
)

export const billLineItems = pgTable('bill_line_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  billId: uuid('bill_id')
    .notNull()
    .references(() => bills.id, { onDelete: 'cascade' }),
  description: varchar('description', { length: 200 }).notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerAccountId: uuid('owner_account_id')
    .notNull()
    .references(() => users.id),
  billId: uuid('bill_id')
    .notNull()
    .references(() => bills.id),
  receiptReference: varchar('receipt_reference', { length: 20 })
    .notNull()
    .unique(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  paymentDate: date('payment_date').notNull(),
  paymentMethod: varchar('payment_method', { length: 20 }).notNull(),
  note: varchar('note', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// Relations

export const billsRelations = relations(bills, ({ one, many }) => ({
  owner: one(users, {
    fields: [bills.ownerAccountId],
    references: [users.id],
  }),
  contract: one(rentalContracts, {
    fields: [bills.contractId],
    references: [rentalContracts.id],
  }),
  flat: one(flats, {
    fields: [bills.flatId],
    references: [flats.id],
  }),
  renter: one(renters, {
    fields: [bills.renterId],
    references: [renters.id],
  }),
  lineItems: many(billLineItems),
  payments: many(payments),
}))

export const billLineItemsRelations = relations(billLineItems, ({ one }) => ({
  bill: one(bills, {
    fields: [billLineItems.billId],
    references: [bills.id],
  }),
}))

export const paymentsRelations = relations(payments, ({ one }) => ({
  owner: one(users, {
    fields: [payments.ownerAccountId],
    references: [users.id],
  }),
  bill: one(bills, {
    fields: [payments.billId],
    references: [bills.id],
  }),
}))
