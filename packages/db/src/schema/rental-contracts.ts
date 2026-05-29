import {
  date,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { flats } from './flats'
import { renters } from './renters'
import { users } from './users'

export const rentalContracts = pgTable('rental_contracts', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerAccountId: text('owner_account_id')
    .notNull()
    .references(() => users.id),
  renterId: uuid('renter_id')
    .notNull()
    .references(() => renters.id),
  flatId: uuid('flat_id')
    .notNull()
    .references(() => flats.id),
  monthlyRent: numeric('monthly_rent', { precision: 12, scale: 2 }).notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  securityDepositAmount: numeric('security_deposit_amount', {
    precision: 12,
    scale: 2,
  }).notNull(),
  remainingDepositBalance: numeric('remaining_deposit_balance', {
    precision: 12,
    scale: 2,
  }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
