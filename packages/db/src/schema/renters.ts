import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { flats } from "./building";
import { organizations } from "./organizations";

export const renters = pgTable(
  "renters",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    flatId: text("flat_id").references(() => flats.id, { onDelete: "set null" }),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),
    nidNumber: text("nid_number").notNull(),
    dateOfBirth: text("date_of_birth"), // YYYY-MM-DD
    occupation: text("occupation").notNull(),
    bloodGroup: text("blood_group").notNull(), // 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
    totalFamilyMembers: integer("total_family_members").notNull().default(1),
    familyMemberNames: jsonb("family_member_names").$type<string[]>().default([]),
    emergencyContactName: text("emergency_contact_name").notNull(),
    emergencyContactNumber: text("emergency_contact_number").notNull(),
    emergencyContactRelationship: text("emergency_contact_relationship").notNull(),
    nidFrontPhoto: text("nid_front_photo"),
    nidBackPhoto: text("nid_back_photo"),
    digitalSignatureUrl: text("digital_signature_url"),
    accessCode: text("access_code"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("renters_org_nid_idx").on(table.organizationId, table.nidNumber),
    index("renters_org_phone_idx").on(table.organizationId, table.phone),
  ],
);

export const rentalContracts = pgTable(
  "rental_contracts",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    renterId: text("renter_id")
      .notNull()
      .references(() => renters.id, { onDelete: "cascade" }),
    flatId: text("flat_id")
      .notNull()
      .references(() => flats.id, { onDelete: "restrict" }),
    monthlyRent: numeric("monthly_rent", { precision: 12, scale: 2 }).notNull(),
    advanceAmount: numeric("advance_amount", { precision: 12, scale: 2 }).default("0.00"),
    serviceCharge: numeric("service_charge", { precision: 12, scale: 2 }).notNull().default("0.00"),
    securityDepositAmount: numeric("security_deposit_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0.00"),
    remainingDepositBalance: numeric("remaining_deposit_balance", { precision: 12, scale: 2 })
      .notNull()
      .default("0.00"),
    startDate: text("start_date").notNull(), // YYYY-MM-DD
    endDate: text("end_date"), // YYYY-MM-DD (null for open-ended month-to-month)
    noticePeriodDays: integer("notice_period_days").notNull().default(30),
    status: text("status").notNull().default("draft"), // 'draft' | 'pending_signature' | 'active' | 'notice_period' | 'terminated'
    terminationDate: text("termination_date"),
    terminationReason: text("termination_reason"),
    contractDocumentUrl: text("contract_document_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("rental_contracts_org_flat_status_idx").on(
      table.organizationId,
      table.flatId,
      table.status,
    ),
    index("rental_contracts_org_renter_idx").on(table.organizationId, table.renterId),
  ],
);
