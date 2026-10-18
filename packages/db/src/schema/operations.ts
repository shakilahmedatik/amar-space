import { boolean, index, jsonb, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { buildings, flats } from "./building";
import { rooms, roomTypes } from "./hotel";
import { organizations } from "./organizations";

export const maintenanceRequests = pgTable(
  "maintenance_requests",
  {
    id: text("id").primaryKey(), // ULID
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    buildingId: text("building_id").references(() => buildings.id, { onDelete: "cascade" }),
    flatId: text("flat_id").references(() => flats.id, { onDelete: "set null" }),
    roomTypeId: text("room_type_id").references(() => roomTypes.id, { onDelete: "cascade" }),
    roomId: text("room_id").references(() => rooms.id, { onDelete: "cascade" }),
    category: text("category").notNull().default("general"), // 'plumbing' | 'electrical' | 'generator' | 'elevator' | 'carpentry' | 'sanitary' | 'appliance' | 'hvac' | 'pest_control' | 'general'
    title: text("title").notNull(),
    description: text("description").notNull(),
    photoUrls: jsonb("photo_urls").$type<string[]>().default([]),
    priority: text("priority").notNull().default("medium"), // 'low' | 'medium' | 'high' | 'urgent'
    status: text("status").notNull().default("open"), // 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed'
    requestedBy: text("requested_by"),
    requestedByUserId: text("requested_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    assignedToStaffId: text("assigned_to_staff_id").references(() => users.id, {
      onDelete: "set null",
    }),
    repairCost: numeric("repair_cost", { precision: 12, scale: 2 }).default("0.00"),
    costBilledTo: text("cost_billed_to").default("landlord"), // 'landlord' | 'tenant' | 'shared'
    resolutionNotes: text("resolution_notes"),
    resolutionPhotoUrls: jsonb("resolution_photo_urls").$type<string[]>().default([]),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgBuildingStatusIdx: index("maintenance_org_building_status_idx").on(
      table.organizationId,
      table.buildingId,
      table.status,
    ),
    assignedStaffIdx: index("maintenance_assigned_staff_idx").on(table.assignedToStaffId),
    requestedByIdx: index("maintenance_requested_by_idx").on(table.requestedByUserId),
  }),
);

export const notices = pgTable(
  "notices",
  {
    id: text("id").primaryKey(), // ULID
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(), // Markdown formatted
    targetAudience: text("target_audience").notNull().default("all_renters"), // 'all_renters' | 'specific_building' | 'specific_flat' | 'managers_only'
    targetBuildingId: text("target_building_id").references(() => buildings.id, {
      onDelete: "cascade",
    }),
    targetFlatId: text("target_flat_id").references(() => flats.id, { onDelete: "cascade" }),
    isPinned: boolean("is_pinned").notNull().default(false),
    authorUserId: text("author_user_id").references(() => users.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgBuildingAudienceIdx: index("notices_org_building_audience_idx").on(
      table.organizationId,
      table.targetBuildingId,
      table.targetAudience,
    ),
    pinnedIdx: index("notices_pinned_idx").on(table.isPinned),
  }),
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey(), // ULID / UUID
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    actorEmail: text("actor_email").notNull(),
    actorRole: text("actor_role").notNull().default("system"), // 'owner' | 'admin' | 'manager' | 'staff' | 'member' | 'system'
    action: text("action").notNull(), // 'CREATE' | 'UPDATE' | 'DELETE' | 'ADJUST' | 'APPROVE' | 'CANCEL' | 'PAY' | 'RESOLVE' | 'ASSIGN' | 'EXPORT'
    entityType: text("entity_type").notNull(), // 'organization' | 'building' | 'flat' | 'renter' | 'contract' | 'bill' | 'advance_adjustment' | 'payment' | 'maintenance' | 'notice' | 'audit_log'
    entityId: text("entity_id").notNull(),
    oldValue: jsonb("old_value"),
    newValue: jsonb("new_value"),
    metadata: jsonb("metadata"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgCreatedIdx: index("audit_logs_org_created_idx").on(table.organizationId, table.createdAt),
    entityIdx: index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    actorIdx: index("audit_logs_actor_idx").on(table.organizationId, table.actorUserId),
  }),
);
