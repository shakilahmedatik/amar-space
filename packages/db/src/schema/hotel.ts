import { integer, jsonb, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const roomTypes = pgTable("room_types", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  basePrice: numeric("base_price", { precision: 12, scale: 2 }).notNull(),
  capacityAdults: integer("capacity_adults").notNull().default(2),
  capacityChildren: integer("capacity_children").notNull().default(0),
  bedType: text("bed_type").notNull().default("queen"),
  bedCount: integer("bed_count").notNull().default(1),
  sizeSqFt: numeric("size_sq_ft", { precision: 8, scale: 2 }),
  amenities: jsonb("amenities").notNull().default([]), // string[]
  photos: jsonb("photos").notNull().default([]), // string[] URLs
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const rooms = pgTable("rooms", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  roomTypeId: text("room_type_id")
    .notNull()
    .references(() => roomTypes.id, { onDelete: "cascade" }),
  roomNumber: text("room_number").notNull(),
  floor: integer("floor").notNull().default(1),
  status: text("status").notNull().default("available"), // 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bookings = pgTable("bookings", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  roomTypeId: text("room_type_id")
    .notNull()
    .references(() => roomTypes.id, { onDelete: "restrict" }),
  roomId: text("room_id").references(() => rooms.id, { onDelete: "set null" }),
  checkInDate: text("check_in_date").notNull(), // YYYY-MM-DD
  checkOutDate: text("check_out_date").notNull(), // YYYY-MM-DD
  guestName: text("guest_name").notNull(),
  guestEmail: text("guest_email").notNull(),
  guestPhone: text("guest_phone").notNull(),
  guestNidOrPassport: text("guest_nid_or_passport"),
  specialRequests: text("special_requests"),
  adultsCount: integer("adults_count").notNull().default(1),
  childrenCount: integer("children_count").notNull().default(0),
  totalPrice: numeric("total_price", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show'
  paymentStatus: text("payment_status").notNull().default("unpaid"), // 'unpaid' | 'partially_paid' | 'paid' | 'refunded'
  cancellationReason: text("cancellation_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
