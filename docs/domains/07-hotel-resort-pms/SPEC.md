# Domain 07: Hotel & Resort PMS — Specification

> **Package:** `@omniheaven/db`, `@omniheaven/validators`, `@omniheaven/trpc`, `apps/hotel-resort-web`  
> **Status:** Specification Complete  
> **Standard:** Production-Grade Hospitality PMS (Dynamic Pricing, Night Audit, Housekeeping, Guest Booking Engine)

---

## 1. Business Requirements & Domain Invariants

### 1.1 Core Purpose
Empower hotel, resort, and vacation rental operators with real-time room availability, reservations, walk-in check-in, guest KYC (NID/Passport), folio add-on charges (room service, dining, extra bed), housekeeping workflows, and a direct white-label guest booking website (`[slug].omniheaven.com`).

### 1.2 Domain Invariants (Non-Negotiable Rules)
1. **Zero Double-Booking Guarantee:** A specific physical room cannot have overlapping confirmed or checked-in bookings for the same calendar date range $[checkInDate, checkOutDate)$.
2. **Housekeeping State Machine Lock:** A room cannot be assigned for guest check-in if its status is `"cleaning"`, `"dirty"`, or `"maintenance"`. Check-in requires status `"available"`.
3. **Automatic Checkout Housekeeping Trigger:** Checking out a guest automatically flips the physical room status from `"occupied"` to `"cleaning"`.
4. **Guest Identification Requirement:** All adult guests checking in must provide government photo ID (Bangladeshi NID or foreign Passport).
5. **Night Audit Reconciliation:** Daily automated or manual night audit closes out the day's room charges and updates the ledger.

---

## 2. Hospitality Booking Lifecycle

```
        Direct Web Booking / Walk-in
                     │
                     ▼
        ┌─────────────────────────┐
        │        CONFIRMED        │ (Room Allocated, Advance Paid)
        └────────────┬────────────┘
                     │
              Guest Arrives & KYC Verified
                     │
                     ▼
        ┌─────────────────────────┐
        │       CHECKED IN        │ (Room: 'occupied', Folio Active)
        └────────────┬────────────┘
                     │
              Bill Settled & Keys Returned
                     │
                     ▼
        ┌─────────────────────────┐
        │       CHECKED OUT       │ (Room switches to: 'cleaning')
        └────────────┬────────────┘
                     │
               Housekeeper Cleans & Inspects
                     │
                     ▼
        ┌─────────────────────────┐
        │        AVAILABLE        │ (Ready for next check-in)
        └─────────────────────────┘
```

---

## 3. Database Schema Specification

```typescript
// packages/db/src/schema/hotel.ts
import { integer, jsonb, numeric, pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const roomTypes = pgTable(
  "room_types",
  {
    id: text("id").primaryKey(), // ULID
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // e.g. "Deluxe Sea View Suite", "Executive King"
    description: text("description"),
    basePrice: numeric("base_price", { precision: 12, scale: 2 }).notNull(),
    capacityAdults: integer("capacity_adults").notNull().default(2),
    capacityChildren: integer("capacity_children").notNull().default(0),
    bedType: text("bed_type").notNull().default("king"),
    bedCount: integer("bed_count").notNull().default(1),
    sizeSqFt: numeric("size_sq_ft", { precision: 8, scale: 2 }),
    amenities: jsonb("amenities").$type<string[]>().default([]),
    photos: jsonb("photos").$type<string[]>().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("room_types_org_idx").on(table.organizationId),
  })
);

export const rooms = pgTable(
  "rooms",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    roomTypeId: text("room_type_id")
      .notNull()
      .references(() => roomTypes.id, { onDelete: "cascade" }),
    roomNumber: text("room_number").notNull(), // e.g. "Room 304"
    floor: integer("floor").notNull().default(1),
    status: text("status").notNull().default("available"), // 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance'
    housekeepingNotes: text("housekeeping_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgRoomNumberIdx: index("rooms_org_number_idx").on(table.organizationId, table.roomNumber),
    statusIdx: index("rooms_status_idx").on(table.organizationId, table.status),
  })
);

export const bookings = pgTable(
  "bookings",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    bookingReference: text("booking_reference").notNull().unique(), // e.g. "BK-202611-9018"
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
    adultsCount: integer("adults_count").notNull().default(1),
    childrenCount: integer("children_count").notNull().default(0),
    totalPrice: numeric("total_price", { precision: 12, scale: 2 }).notNull(),
    extraCharges: numeric("extra_charges", { precision: 12, scale: 2 }).default("0.00"), // Folio extras
    status: text("status").notNull().default("pending"), // 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show'
    paymentStatus: text("payment_status").notNull().default("unpaid"), // 'unpaid' | 'partially_paid' | 'paid' | 'refunded'
    specialRequests: text("special_requests"),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
    checkedOutAt: timestamp("checked_out_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgDatesIdx: index("bookings_org_dates_idx").on(table.organizationId, table.checkInDate, table.checkOutDate),
    refIdx: index("bookings_ref_idx").on(table.bookingReference),
    statusIdx: index("bookings_status_idx").on(table.organizationId, table.status),
  })
);
```

---

## 4. tRPC Procedure Signatures

```typescript
// packages/trpc/src/routers/hotel.ts
export const hotelRouter = createTRPCRouter({
  // Room Types & Catalog
  listRoomTypes: orgProtectedProcedure.query(async ({ ctx }) => { /* ... */ }),
  createRoomType: orgProtectedProcedure.input(createRoomTypeSchema).mutation(async ({ ctx, input }) => { /* ... */ }),
  updateRoomType: orgProtectedProcedure.input(updateRoomTypeSchema).mutation(async ({ ctx, input }) => { /* ... */ }),

  // Physical Rooms & Housekeeping
  listRooms: orgProtectedProcedure.query(async ({ ctx }) => { /* ... */ }),
  createRoom: orgProtectedProcedure.input(createRoomSchema).mutation(async ({ ctx, input }) => { /* ... */ }),
  updateRoomStatus: orgProtectedProcedure
    .input(z.object({ roomId: z.string(), status: z.enum(["available", "cleaning", "maintenance"]), notes: z.string().optional() }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  // Reservations & Front Desk
  listBookings: orgProtectedProcedure.input(listBookingsSchema).query(async ({ ctx, input }) => { /* ... */ }),
  createReservation: orgProtectedProcedure.input(createBookingSchema).mutation(async ({ ctx, input }) => { /* ... */ }),
  checkInGuest: orgProtectedProcedure.input(checkInSchema).mutation(async ({ ctx, input }) => { /* ... */ }),
  checkOutGuest: orgProtectedProcedure.input(checkOutSchema).mutation(async ({ ctx, input }) => { /* ... */ }),
  cancelBooking: orgProtectedProcedure.input(cancelBookingSchema).mutation(async ({ ctx, input }) => { /* ... */ }),

  // Public Guest Booking Engine (Unauthenticated)
  publicSearchAvailability: publicProcedure.input(searchAvailabilitySchema).query(async ({ ctx, input }) => { /* ... */ }),
  publicCreateBooking: publicProcedure.input(publicCreateBookingSchema).mutation(async ({ ctx, input }) => { /* ... */ }),
});
```

---

## 5. Domain Error Codes

| Code | HTTP Status | Description | Actionable Guidance |
|---|:---:|---|---|
| `ROOM_NOT_AVAILABLE` | 409 | Room is already reserved or occupied on specified dates | Choose alternate room or dates |
| `ROOM_DIRTY_OR_MAINTENANCE` | 400 | Cannot check in guest into a room marked cleaning or maintenance | Clean room and update status to available |
| `CHECKIN_BEFORE_DATE` | 400 | Check-in attempted prior to scheduled arrival date | Update reservation arrival date first |
| `OVERLAPPING_DATES` | 422 | Check-out date must be strictly after check-in date | Check date picker inputs |
