import { boolean, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  hashedPassword: varchar('hashed_password', { length: 255 }).notNull(),
  emailVerified: boolean('email_verified').notNull().default(false),
  role: varchar('role', { length: 20 }).notNull().default('owner'),
  ownerAccountId: uuid('owner_account_id'),
  phone: varchar('phone', { length: 20 }),
  languagePreference: varchar('language_preference', { length: 5 }).default(
    'bn',
  ),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
