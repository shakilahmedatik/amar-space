import {
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { buildings } from './buildings'
import { flats } from './flats'
import { users } from './users'

export const notices = pgTable('notices', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerAccountId: text('owner_account_id')
    .notNull()
    .references(() => users.id),
  authorId: text('author_id')
    .notNull()
    .references(() => users.id),
  title: varchar('title', { length: 200 }).notNull(),
  body: varchar('body', { length: 5000 }).notNull(),
  targetAudience: varchar('target_audience', { length: 20 }).notNull(),
  targetBuildingId: uuid('target_building_id').references(() => buildings.id),
  targetFlatId: uuid('target_flat_id').references(() => flats.id),
  isPinned: boolean('is_pinned').notNull().default(false),
  pinnedAt: timestamp('pinned_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const noticeTemplates = pgTable('notice_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerAccountId: text('owner_account_id')
    .notNull()
    .references(() => users.id),
  name: varchar('name', { length: 200 }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  body: varchar('body', { length: 5000 }).notNull(),
  targetAudience: varchar('target_audience', { length: 20 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
