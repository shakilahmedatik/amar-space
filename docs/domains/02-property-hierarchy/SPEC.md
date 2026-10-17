# Domain 02: Property & Unit Hierarchy — Specification

> **Package:** `@omniheaven/db`, `@omniheaven/validators`, `@omniheaven/trpc`  
> **Status:** Specification Complete (Ready for Implementation)  
> **Standard:** Production-Grade Bangladeshi Real Estate Model (Buildings, Floors, Flats, Commercial Units, Utilities)

---

## 1. Business Requirements & Domain Invariants

### 1.1 Core Purpose
Model the physical structure of real estate assets: properties/estates, multi-story buildings, individual flats, offices, and retail units. Track physical specifications, utility meter allocations, baseline pricing, and live occupancy status.

### 1.2 Domain Invariants (Non-Negotiable Rules)
1. **Unique Unit Numbering per Building:** A building cannot have two units with the same identifier (e.g., Flat 4B or Shop 102). Enforced via composite unique index `(organization_id, building_id, flat_number)`.
2. **Occupancy Consistency:** A unit's status cannot be manually marked `"vacant"` while an active rental contract is linked to it. The status transitions automatically via the contract lifecycle.
3. **Meter Traceability:** Every unit with separate metering must record its meter serial number or prepaid account ID to prevent utility calculation mix-ups between tenants.
4. **Cascade Safety:** Deleting a building requires all associated units to be vacant and all historic contracts/bills archived or transferred. Direct cascade deletion of buildings with active contracts is blocked.

---

## 2. Unit Lifecycle & State Transitions

```
               ┌───────────────────────┐
               │        VACANT         │◄──────────────┐
               │  (Ready for Renting)  │               │
               └───────────┬───────────┘               │
                           │                           │
                   Contract Approved            Contract Terminated
                           │                    & Handover Complete
                           ▼                           │
               ┌───────────────────────┐               │
               │       OCCUPIED        ├───────────────┘
               │   (Active Resident)   │
               └───────────┬───────────┘
                           │
                 Maintenance Required
                           │
                           ▼
               ┌───────────────────────┐
               │   UNDER MAINTENANCE   │
               │ (Repairs / Painting)  │
               └───────────┬───────────┘
                           │
                    Repairs Complete
                           │
                           ▼
               ┌───────────────────────┐
               │        VACANT         │
               └───────────────────────┘
```

---

## 3. Database Schema Specification

```typescript
// packages/db/src/schema/building.ts
import { integer, numeric, pgTable, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const buildings = pgTable(
  "buildings",
  {
    id: text("id").primaryKey(), // ULID
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // e.g. "Green Garden Residence"
    address: text("address").notNull(),
    city: text("city").notNull().default("Dhaka"),
    thana: text("thana"), // e.g. "Dhanmondi", "Gulshan", "Uttara", "Mirpur"
    postalCode: text("postal_code"),
    totalFloors: integer("total_floors").notNull().default(1),
    hasElevator: integer("has_elevator").notNull().default(0), // 1 = true, 0 = false
    hasGenerator: integer("has_generator").notNull().default(0),
    gateClosingTime: text("gate_closing_time").default("23:00"), // 11:00 PM local BD standard
    managerPhone: text("manager_phone"),
    caretakerPhone: text("caretaker_phone"),
    buildingPhoto: text("building_photo"),
    rules: text("rules"), // House rules and bylaws in Markdown
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("buildings_org_idx").on(table.organizationId),
  })
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
    flatNumber: text("flat_number").notNull(), // e.g. "Flat 4A", "Suite 201"
    floor: integer("floor").notNull(),
    unitType: text("unit_type").notNull().default("residential_flat"), // 'residential_flat' | 'commercial_office' | 'retail_shop' | 'studio'
    bedrooms: integer("bedrooms").default(3),
    bathrooms: integer("bathrooms").default(3),
    balconies: integer("balconies").default(2),
    squareFeet: integer("square_feet"),
    defaultRentAmount: numeric("default_rent_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
    defaultServiceCharge: numeric("default_service_charge", { precision: 12, scale: 2 }).notNull().default("0.00"),
    electricityMeterNumber: text("electricity_meter_number"), // Prepaid / Postpaid ID
    electricityMeterType: text("electricity_meter_type").default("prepaid_card"), // 'prepaid_card' | 'postpaid_meter' | 'shared'
    gasType: text("gas_type").default("fixed_line"), // 'fixed_line' | 'prepaid_card' | 'cylinder'
    waterSubmeterNumber: text("water_submeter_number"),
    status: text("status").notNull().default("vacant"), // 'vacant' | 'reserved' | 'occupied' | 'under_maintenance'
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgBuildingFlatIdx: uniqueIndex("flats_org_building_flat_idx").on(
      table.organizationId,
      table.buildingId,
      table.flatNumber
    ),
    buildingFloorIdx: index("flats_building_floor_idx").on(table.buildingId, table.floor),
    statusIdx: index("flats_status_idx").on(table.status),
  })
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
    role: text("role").notNull(), // 'Manager' | 'Caretaker' | 'Electrician' | 'Plumber' | 'Lift Technician' | 'Police Thana' | 'Fire Station'
    phone: text("phone").notNull(),
    type: text("type").notNull().default("building"), // 'building' | 'nearby'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    buildingContactIdx: index("emergency_contacts_building_idx").on(table.buildingId),
  })
);
```

---

## 4. tRPC Procedure Signatures

```typescript
// packages/trpc/src/routers/property.ts
export const propertyRouter = createTRPCRouter({
  // Buildings
  listBuildings: orgProtectedProcedure.query(async ({ ctx }) => { /* ... */ }),
  getBuildingById: orgProtectedProcedure
    .input(z.object({ buildingId: z.string() }))
    .query(async ({ ctx, input }) => { /* ... */ }),
  createBuilding: orgProtectedProcedure
    .input(createBuildingSchema)
    .mutation(async ({ ctx, input }) => { /* ... */ }),
  updateBuilding: orgProtectedProcedure
    .input(updateBuildingSchema)
    .mutation(async ({ ctx, input }) => { /* ... */ }),
  deleteBuilding: orgProtectedProcedure
    .input(z.object({ buildingId: z.string() }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  // Units / Flats
  listFlatsByBuilding: orgProtectedProcedure
    .input(z.object({
      buildingId: z.string(),
      status: z.enum(["vacant", "reserved", "occupied", "under_maintenance"]).optional(),
      floor: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => { /* ... */ }),
  getFlatById: orgProtectedProcedure
    .input(z.object({ flatId: z.string() }))
    .query(async ({ ctx, input }) => { /* ... */ }),
  createFlat: orgProtectedProcedure
    .input(createFlatSchema)
    .mutation(async ({ ctx, input }) => { /* ... */ }),
  bulkCreateFlats: orgProtectedProcedure
    .input(bulkCreateFlatsSchema)
    .mutation(async ({ ctx, input }) => { /* ... */ }),
  updateFlat: orgProtectedProcedure
    .input(updateFlatSchema)
    .mutation(async ({ ctx, input }) => { /* ... */ }),
  updateFlatStatus: orgProtectedProcedure
    .input(z.object({
      flatId: z.string(),
      status: z.enum(["vacant", "under_maintenance"]),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  // Emergency Contacts
  listEmergencyContacts: orgProtectedProcedure
    .input(z.object({ buildingId: z.string() }))
    .query(async ({ ctx, input }) => { /* ... */ }),
  createEmergencyContact: orgProtectedProcedure
    .input(createEmergencyContactSchema)
    .mutation(async ({ ctx, input }) => { /* ... */ }),
  deleteEmergencyContact: orgProtectedProcedure
    .input(z.object({ contactId: z.string() }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),
});
```

---

## 5. Domain Error Codes

| Code | HTTP Status | Description | Actionable Guidance |
|---|:---:|---|---|
| `BUILDING_NOT_FOUND` | 404 | Specified building ID does not exist | Refresh property list |
| `BUILDING_HAS_ACTIVE_UNITS` | 400 | Cannot delete building containing occupied flats | Terminate or reassign active contracts |
| `FLAT_DUPLICATE_NUMBER` | 409 | A flat with this number already exists in building | Enter a unique flat number |
| `FLAT_OCCUPIED_STATUS_LOCKED` | 400 | Cannot manually set occupied flat to vacant | Conclude active contract through renter lifecycle |
| `INVALID_PHONE_NUMBER` | 422 | Phone number does not match Bangladeshi format | Enter valid `+8801...` mobile number |
