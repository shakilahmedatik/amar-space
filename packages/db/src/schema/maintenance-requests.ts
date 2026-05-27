import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { buildings } from './buildings'
import { flats } from './flats'
import { renters } from './renters'
import { users } from './users'

export const maintenanceRequests = pgTable('maintenance_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerAccountId: uuid('owner_account_id')
    .notNull()
    .references(() => users.id),
  flatId: uuid('flat_id')
    .notNull()
    .references(() => flats.id),
  renterId: uuid('renter_id')
    .notNull()
    .references(() => renters.id),
  buildingId: uuid('building_id')
    .notNull()
    .references(() => buildings.id),
  title: varchar('title', { length: 200 }).notNull(),
  description: varchar('description', { length: 2000 }).notNull(),
  priority: varchar('priority', { length: 10 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('open'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
