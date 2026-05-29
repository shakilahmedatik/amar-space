import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { maintenanceRequests } from './maintenance-requests'
import { users } from './users'

export const maintenanceComments = pgTable('maintenance_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: uuid('request_id')
    .notNull()
    .references(() => maintenanceRequests.id, { onDelete: 'cascade' }),
  authorId: text('author_id')
    .notNull()
    .references(() => users.id),
  content: varchar('content', { length: 2000 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
