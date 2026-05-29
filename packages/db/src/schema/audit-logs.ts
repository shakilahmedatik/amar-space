import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { users } from './users'

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerAccountId: text('owner_account_id')
      .notNull()
      .references(() => users.id),
    actorId: text('actor_id')
      .notNull()
      .references(() => users.id),
    action: varchar('action', { length: 100 }).notNull(),
    entityType: varchar('entity_type', { length: 100 }).notNull(),
    entityId: varchar('entity_id', { length: 255 }).notNull(),
    oldValues: jsonb('old_values'),
    newValues: jsonb('new_values'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    entityTypeIdx: index('audit_logs_entity_type_idx').on(table.entityType),
    actorIdx: index('audit_logs_actor_idx').on(table.actorId),
    ownerAccountIdx: index('audit_logs_owner_account_idx').on(
      table.ownerAccountId,
    ),
    createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
  }),
)
