import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const buildings = pgTable("buildings", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address").notNull(),
  totalFloors: integer("total_floors"),
  whatsappGroupLink: text("whatsapp_group_link"),
  managerPhone: text("manager_phone"),
  buildingPhoto: text("building_photo"),
  logoPhoto: text("logo_photo"),
  rules: text("rules"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const emergencyContacts = pgTable("emergency_contacts", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  buildingId: text("building_id")
    .notNull()
    .references(() => buildings.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role").notNull(),
  phone: text("phone"),
  type: text("type").notNull(), // 'building' | 'nearby'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const flats = pgTable("flats", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  buildingId: text("building_id")
    .notNull()
    .references(() => buildings.id, { onDelete: "cascade" }),
  flatNumber: text("flat_number").notNull(),
  floor: integer("floor").notNull(),
  status: text("status").notNull().default("vacant"), // 'vacant' | 'occupied' | 'under_maintenance'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
