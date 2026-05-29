import {
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { users } from './users'

export const fileReferences = pgTable('file_references', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerAccountId: text('owner_account_id')
    .notNull()
    .references(() => users.id),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  storageKey: varchar('storage_key', { length: 500 }).notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileSize: integer('file_size').notNull(),
  mimeType: varchar('mime_type', { length: 50 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
