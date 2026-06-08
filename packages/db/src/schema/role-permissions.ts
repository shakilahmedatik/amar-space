import { pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { permissions } from './permissions'
import { staffRoles } from './staff-roles'

export const rolePermissions = pgTable(
  'role_permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roleId: uuid('role_id')
      .notNull()
      .references(() => staffRoles.id),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    rolePermissionUnique: unique('role_permission_unique').on(
      table.roleId,
      table.permissionId,
    ),
  }),
)
