import {
  date,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { users } from './users'

export const renters = pgTable('renters', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerAccountId: uuid('owner_account_id')
    .notNull()
    .references(() => users.id),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  nidNumber: varchar('nid_number', { length: 17 }).notNull(),
  nidPhotoUrl: varchar('nid_photo_url', { length: 500 }),
  dateOfBirth: date('date_of_birth'),
  occupation: varchar('occupation', { length: 200 }).notNull(),
  bloodGroup: varchar('blood_group', { length: 5 }).notNull(),
  totalFamilyMembers: integer('total_family_members').notNull(),
  familyMemberNames: jsonb('family_member_names'),
  emergencyContactName: varchar('emergency_contact_name', {
    length: 200,
  }).notNull(),
  emergencyContactNumber: varchar('emergency_contact_number', {
    length: 20,
  }).notNull(),
  emergencyContactRelationship: varchar('emergency_contact_relationship', {
    length: 100,
  }).notNull(),
  digitalSignatureUrl: varchar('digital_signature_url', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
