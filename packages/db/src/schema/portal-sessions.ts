import { pgTable, timestamp, uuid } from 'drizzle-orm/pg-core'
import { flats } from './flats'
import { renters } from './renters'

export const portalSessions = pgTable('portal_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  flatId: uuid('flat_id')
    .notNull()
    .references(() => flats.id, { onDelete: 'cascade' }),
  renterId: uuid('renter_id')
    .notNull()
    .references(() => renters.id),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
