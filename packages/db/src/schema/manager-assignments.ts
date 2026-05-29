import { pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { buildings } from './buildings'
import { users } from './users'

export const managerAssignments = pgTable(
  'manager_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerAccountId: text('owner_account_id')
      .notNull()
      .references(() => users.id),
    managerId: text('manager_id')
      .notNull()
      .references(() => users.id),
    buildingId: uuid('building_id')
      .notNull()
      .references(() => buildings.id),
    assignedAt: timestamp('assigned_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    managerBuildingUnique: unique(
      'manager_assignments_manager_building_unique',
    ).on(table.managerId, table.buildingId),
  }),
)
