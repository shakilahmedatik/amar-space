import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const buildings = pgTable(
  "buildings",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    address: text("address").notNull(),
    city: text("city").default("Dhaka").notNull(),
    thana: text("thana"),
    postalCode: text("postal_code"),
    totalFloors: integer("total_floors"),
    hasElevator: boolean("has_elevator").default(false).notNull(),
    hasGenerator: boolean("has_generator").default(false).notNull(),
    gateClosingTime: text("gate_closing_time"),
    caretakerPhone: text("caretaker_phone"),
    whatsappGroupLink: text("whatsapp_group_link"),
    managerPhone: text("manager_phone"),
    buildingPhoto: text("building_photo"),
    logoPhoto: text("logo_photo"),
    rules: text("rules"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("buildings_org_idx").on(table.organizationId)],
);

export const emergencyContacts = pgTable(
  "emergency_contacts",
  {
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
    type: text("type").notNull().default("building"), // 'building' | 'nearby'
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("emergency_contacts_building_idx").on(table.buildingId)],
);

export const flats = pgTable(
  "flats",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    buildingId: text("building_id")
      .notNull()
      .references(() => buildings.id, { onDelete: "cascade" }),
    flatNumber: text("flat_number").notNull(),
    floor: integer("floor").notNull(),
    unitType: text("unit_type").default("residential").notNull(), // 'residential' | 'commercial' | 'studio' | 'duplex'
    bedrooms: integer("bedrooms").default(3).notNull(),
    bathrooms: integer("bathrooms").default(2).notNull(),
    balconies: integer("balconies").default(1).notNull(),
    squareFeet: integer("square_feet"),
    defaultRentAmount: integer("default_rent_amount").default(0).notNull(),
    defaultServiceCharge: integer("default_service_charge").default(0).notNull(),
    electricityMeterNumber: text("electricity_meter_number"),
    electricityMeterType: text("electricity_meter_type").default("prepaid").notNull(), // 'prepaid' | 'postpaid'
    gasType: text("gas_type").default("cylinder").notNull(), // 'pipeline' | 'cylinder' | 'none'
    waterSubmeterNumber: text("water_submeter_number"),
    notes: text("notes"),
    status: text("status").notNull().default("vacant"), // 'vacant' | 'occupied' | 'under_maintenance'
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("flats_org_building_flat_idx").on(
      table.organizationId,
      table.buildingId,
      table.flatNumber,
    ),
    index("flats_building_floor_idx").on(table.buildingId, table.floor),
    index("flats_status_idx").on(table.status),
  ],
);
