import {
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  // App-specific fields
  role: varchar('role', { length: 20 }).notNull().default('owner'),
  ownerAccountId: uuid('owner_account_id'),
  phone: varchar('phone', { length: 20 }),
  languagePreference: varchar('language_preference', { length: 5 }).default(
    'bn',
  ),
  // Role-based user management fields
  approvalStatus: varchar('approval_status', { length: 20 }).default('pending'),
  isActive: boolean('is_active').notNull().default(true),
  deactivatedAt: timestamp('deactivated_at', { withTimezone: true }),
})
