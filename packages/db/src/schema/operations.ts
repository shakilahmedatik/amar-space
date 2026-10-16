import { boolean, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { buildings, flats } from "./building";
import { rooms, roomTypes } from "./hotel";
import { organizations } from "./organizations";

export const maintenanceRequests = pgTable("maintenance_requests", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  buildingId: text("building_id").references(() => buildings.id, { onDelete: "cascade" }),
  flatId: text("flat_id").references(() => flats.id, { onDelete: "cascade" }),
  roomTypeId: text("room_type_id").references(() => roomTypes.id, { onDelete: "cascade" }),
  roomId: text("room_id").references(() => rooms.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority").notNull().default("medium"), // 'low' | 'medium' | 'high' | 'urgent'
  status: text("status").notNull().default("open"), // 'open' | 'in_progress' | 'resolved' | 'closed'
  requestedBy: text("requested_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notices = pgTable("notices", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  targetAudience: text("target_audience").notNull().default("all_renters"), // 'all_renters' | 'specific_building' | 'specific_flat' | 'managers_only'
  targetBuildingId: text("target_building_id").references(() => buildings.id, {
    onDelete: "cascade",
  }),
  targetFlatId: text("target_flat_id").references(() => flats.id, { onDelete: "cascade" }),
  isPinned: boolean("is_pinned").notNull().default(false),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  actorId: text("actor_id"),
  actorEmail: text("actor_email"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
