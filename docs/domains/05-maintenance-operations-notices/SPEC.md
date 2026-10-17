# Domain 05: Maintenance & Notice Operations — Specification

> **Package:** `@omniheaven/db`, `@omniheaven/validators`, `@omniheaven/trpc`  
> **Status:** Specification Complete (Ready for Implementation)  
> **Standard:** Production-Grade Facility Management (Work Orders, Proof of Resolution, Cost Tracking, Building Notices)

---

## 1. Business Requirements & Domain Invariants

### 1.1 Core Purpose
Provide end-to-end management of property maintenance issues (plumbing leaks, electrical faults, elevator downtime, generator maintenance) and resident communications (building broadcast notices, emergency power/water supply alerts, gate schedules).

### 1.2 Domain Invariants (Non-Negotiable Rules)
1. **Tenant Issue Isolation:** A tenant can only create, view, and comment on maintenance tickets originating from their own occupied flat.
2. **Resolution Proof:** A maintenance ticket cannot be marked `"resolved"` without mandatory resolution notes and optional proof-of-work photo upload.
3. **Repair Cost Traceability:** Any repair expenditures logged against a ticket must specify whether the expense is borne by the landlord or billed to the tenant.
4. **Notice Targeting:** Broadcast notices targeted to `"specific_building"` or `"specific_flat"` are strictly filtered so residents in unrelated buildings never receive irrelevant alerts.
5. **Notice Expiration:** Notices with `expiresAt < NOW()` automatically drop out of active resident feeds while remaining archived in admin history.

---

## 2. Maintenance Ticket State Machine

```
              ┌────────────────────────┐
              │          OPEN          │
              │   (Reported by Tenant  │
              │       or Caretaker)    │
              └───────────┬────────────┘
                          │
                     Assign Staff
                          │
                          ▼
              ┌────────────────────────┐
              │        ASSIGNED        │
              │ (Technician Dispatched)│
              └───────────┬────────────┘
                          │
                    Work Started
                          │
                          ▼
              ┌────────────────────────┐
              │      IN PROGRESS       │
              │  (Parts / Labor Active)│
              └───────────┬────────────┘
                          │
               Technician Submits Proof
                          │
                          ▼
              ┌────────────────────────┐
              │        RESOLVED        │◄──────────────┐
              │   (Awaiting Tenant /   │               │
              │    Manager Sign-off)   │               │
              └───────────┬────────────┴───────────────┘
                          │                            ▲
                   Sign-off Approved        Issue Persists (Reopened)
                          │                            │
                          ▼                            │
              ┌────────────────────────┐               │
              │         CLOSED         ├───────────────┘
              │       (Archived)       │
              └────────────────────────┘
```

---

## 3. Database Schema Specification

```typescript
// packages/db/src/schema/operations.ts
import { boolean, jsonb, numeric, pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { buildings, flats } from "./building";
import { organizations } from "./organizations";
import { users } from "./auth";

export const maintenanceRequests = pgTable(
  "maintenance_requests",
  {
    id: text("id").primaryKey(), // ULID
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    buildingId: text("building_id")
      .notNull()
      .references(() => buildings.id, { onDelete: "cascade" }),
    flatId: text("flat_id")
      .references(() => flats.id, { onDelete: "set null" }),
    category: text("category").notNull().default("general"), // 'plumbing' | 'electrical' | 'generator' | 'elevator' | 'carpentry' | 'sanitary' | 'general'
    title: text("title").notNull(),
    description: text("description").notNull(),
    photoUrls: jsonb("photo_urls").$type<string[]>().default([]),
    priority: text("priority").notNull().default("medium"), // 'low' | 'medium' | 'high' | 'urgent'
    status: text("status").notNull().default("open"), // 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed'
    requestedByUserId: text("requested_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assignedToStaffId: text("assigned_to_staff_id")
      .references(() => users.id, { onDelete: "set null" }),
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
      table.status
    ),
    assignedStaffIdx: index("maintenance_assigned_staff_idx").on(table.assignedToStaffId),
    requestedByIdx: index("maintenance_requested_by_idx").on(table.requestedByUserId),
  })
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
    targetBuildingId: text("target_building_id").references(() => buildings.id, { onDelete: "cascade" }),
    targetFlatId: text("target_flat_id").references(() => flats.id, { onDelete: "cascade" }),
    isPinned: boolean("is_pinned").notNull().default(false),
    authorUserId: text("author_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgBuildingAudienceIdx: index("notices_org_building_audience_idx").on(
      table.organizationId,
      table.targetBuildingId,
      table.targetAudience
    ),
    pinnedIdx: index("notices_pinned_idx").on(table.isPinned),
  })
);
```

---

## 4. tRPC Procedure Signatures

```typescript
// packages/trpc/src/routers/operations.ts
export const operationsRouter = createTRPCRouter({
  // Maintenance Requests
  listMaintenanceRequests: orgProtectedProcedure
    .input(z.object({
      buildingId: z.string().optional(),
      status: z.enum(["open", "assigned", "in_progress", "resolved", "closed"]).optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      flatId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => { /* ... */ }),

  getMaintenanceRequestById: orgProtectedProcedure
    .input(z.object({ requestId: z.string() }))
    .query(async ({ ctx, input }) => { /* ... */ }),

  createMaintenanceRequest: orgProtectedProcedure
    .input(createMaintenanceRequestSchema)
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  assignStaffToRequest: orgProtectedProcedure
    .input(z.object({ requestId: z.string(), staffUserId: z.string() }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  updateRequestStatus: orgProtectedProcedure
    .input(updateRequestStatusSchema)
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  resolveMaintenanceRequest: orgProtectedProcedure
    .input(resolveMaintenanceRequestSchema)
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  // Building Notices
  listNotices: orgProtectedProcedure
    .input(z.object({ buildingId: z.string().optional(), activeOnly: z.boolean().default(true) }))
    .query(async ({ ctx, input }) => { /* ... */ }),

  createNotice: orgProtectedProcedure
    .input(createNoticeSchema)
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  pinNotice: orgProtectedProcedure
    .input(z.object({ noticeId: z.string(), isPinned: z.boolean() }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  deleteNotice: orgProtectedProcedure
    .input(z.object({ noticeId: z.string() }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),
});
```

---

## 5. Domain Error Codes

| Code | HTTP Status | Description | Actionable Guidance |
|---|:---:|---|---|
| `TICKET_NOT_FOUND` | 404 | Maintenance ticket does not exist | Refresh maintenance board |
| `TICKET_ALREADY_CLOSED` | 400 | Cannot alter status of an archived/closed ticket | Create a new ticket or reopen with reason |
| `RESOLUTION_NOTES_REQUIRED`| 422 | Notes and diagnosis must be submitted to resolve ticket | Provide repair explanation |
| `FORBIDDEN_TICKET_ACCESS` | 403 | Renter attempted to view or modify an unrelated ticket | Access restricted to own flat |
| `NOTICE_EXPIRED` | 410 | Notice has passed its expiration date | Notice archived |
