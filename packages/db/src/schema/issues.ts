import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { buildings } from './buildings'
import { users } from './users'

export const issues = pgTable('issues', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerAccountId: text('owner_account_id')
    .notNull()
    .references(() => users.id),
  buildingId: uuid('building_id')
    .notNull()
    .references(() => buildings.id),
  title: varchar('title', { length: 200 }).notNull(),
  description: varchar('description', { length: 2000 }).notNull(),
  category: varchar('category', { length: 20 }).notNull(),
  priority: varchar('priority', { length: 10 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('open'),
  assigneeId: text('assignee_id').references(() => users.id),
  resolutionNotes: varchar('resolution_notes', { length: 2000 }),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
