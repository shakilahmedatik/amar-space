import { integer, jsonb, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { flats } from "./building";
import { organizations } from "./organizations";

export const renters = pgTable("renters", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  flatId: text("flat_id")
    .notNull()
    .references(() => flats.id, { onDelete: "restrict" }),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  nidNumber: text("nid_number").notNull(),
  occupation: text("occupation").notNull(),
  bloodGroup: text("blood_group").notNull(),
  totalFamilyMembers: integer("total_family_members").notNull().default(1),
  emergencyContactName: text("emergency_contact_name").notNull(),
  emergencyContactNumber: text("emergency_contact_number").notNull(),
  emergencyContactRelationship: text("emergency_contact_relationship").notNull(),
  dateOfBirth: text("date_of_birth"),
  familyMemberNames: jsonb("family_member_names").default([]),
  accessCode: text("access_code"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const rentalContracts = pgTable("rental_contracts", {
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
  advanceAmount: numeric("advance_amount", { precision: 12, scale: 2 }).notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  status: text("status").notNull().default("active"), // 'active' | 'terminated' | 'pending'
  terminationReason: text("termination_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
