import { sql } from 'drizzle-orm'
import {
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { flats } from './flats'
import { users } from './users'

export const registrationRequests = pgTable(
  'registration_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    flatId: uuid('flat_id')
      .notNull()
      .references(() => flats.id, { onDelete: 'cascade' }),
    ownerAccountId: text('owner_account_id')
      .notNull()
      .references(() => users.id),
    fullName: varchar('full_name', { length: 100 }).notNull(),
    phone: varchar('phone', { length: 11 }).notNull(),
    nidNumber: varchar('nid_number', { length: 17 }).notNull(),
    nidPhotoUrl: varchar('nid_photo_url', { length: 500 }),
    bloodGroup: varchar('blood_group', { length: 3 }).notNull(),
    occupation: varchar('occupation', { length: 100 }).notNull(),
    familyMembers: integer('family_members').notNull(),
    emergencyContact: varchar('emergency_contact', { length: 11 }).notNull(),
    rentalStartDate: date('rental_start_date').notNull(),
    advanceAmount: numeric('advance_amount', {
      precision: 12,
      scale: 2,
    }).notNull(),
    digitalSignatureUrl: varchar('digital_signature_url', {
      length: 500,
    }).notNull(),
    status: varchar('status', { length: 20 })
      .notNull()
      .default('PENDING_APPROVAL'),
    accessCodeHash: varchar('access_code_hash', { length: 255 }),
    familyMemberNames: jsonb('family_member_names'),
    emergencyContactName: varchar('emergency_contact_name', { length: 200 }),
    emergencyContactRelationship: varchar('emergency_contact_relationship', {
      length: 100,
    }),
    selfiePhotoUrl: varchar('selfie_photo_url', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    uniquePendingFlatPhone: uniqueIndex(
      'registration_requests_flat_phone_pending_idx',
    )
      .on(table.flatId, table.phone)
      .where(sql`${table.status} = 'PENDING_APPROVAL'`),
  }),
)
