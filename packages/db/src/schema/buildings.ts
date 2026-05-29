import {
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { users } from './users'

export const buildings = pgTable(
  'buildings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerAccountId: text('owner_account_id')
      .notNull()
      .references(() => users.id),
    name: varchar('name', { length: 200 }).notNull(),
    address: varchar('address', { length: 500 }).notNull(),
    totalFloors: integer('total_floors'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    ownerNameUnique: unique('buildings_owner_name_unique').on(
      table.ownerAccountId,
      table.name,
    ),
  }),
)
