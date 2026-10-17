# Domain 03: Renter Lifecycle & Contracts — Specification

> **Package:** `@omniheaven/db`, `@omniheaven/validators`, `@omniheaven/trpc`  
> **Status:** Specification Complete (Ready for Implementation)  
> **Standard:** Production-Grade Bangladeshi Tenancy Compliance (Mandatory NID, Blood Group, Advance Deposit Balance, Contract Lifecycle)

---

## 1. Business Requirements & Domain Invariants

### 1.1 Core Purpose
Govern the complete lifecycle of tenants from initial onboarding/KYC through lease generation, advance security deposit ledger initialization, active tenancy management, notice periods, and formal handover upon termination.

### 1.2 Domain Invariants (Non-Negotiable Rules)
1. **Mandatory National Identity (NID):** Every primary renter record **must** possess a validated Bangladeshi NID (10-digit Smart NID or 17-digit legacy format). Incomplete or dummy NIDs are strictly rejected at the schema validator.
2. **Mandatory Medical Safety (Blood Group):** Blood group is strictly required upon registration for local operational emergency response.
3. **Single Active Lease per Unit:** A flat or unit cannot have more than one contract in `"active"` or `"notice_period"` status simultaneously.
4. **Advance Deposit Ledger Parity:**
   - `securityDepositAmount` represents the total deposit originally received at lease signing.
   - `remainingDepositBalance` tracks current spendable advance funds.
   - Any modification to `remainingDepositBalance` **must** be executed via an `advance_adjustments` transaction.
5. **Flat Status Synchronization:**
   - Approving a contract automatically sets the flat status to `"occupied"`.
   - Terminating a contract automatically sets the flat status to `"vacant"` (or `"under_maintenance"` if checkout inspection indicates required repairs).
6. **Digital Verification:** Digital signature capture and optional NID front/back photo storage on S3/R2.

---

## 2. Contract State Machine

```
              ┌────────────────────────┐
              │         DRAFT          │
              │  (Terms & Rent Entry)  │
              └───────────┬────────────┘
                          │
                   Send for Signature
                          │
                          ▼
              ┌────────────────────────┐
              │   PENDING SIGNATURE    │
              │ (Tenant Reviews Terms) │
              └───────────┬────────────┘
                          │
                  Signed & Deposit Paid
                          │
                          ▼
              ┌────────────────────────┐
              │         ACTIVE         │◄──────────────┐
              │    (Ongoing Tenancy)   │               │
              └───────────┬────────────┘               │
                          │                            │
                     Gives Notice                 Notice Cancelled
                          │                            │
                          ▼                            │
              ┌────────────────────────┐               │
              │     NOTICE PERIOD      ├───────────────┘
              │  (e.g., 30 Days Out)   │
              └───────────┬────────────┘
                          │
                  Checkout Handover &
                Final Bill/Deposit Reconciliation
                          │
                          ▼
              ┌────────────────────────┐
              │       TERMINATED       │
              │   (Historical Record)  │
              └────────────────────────┘
```

---

## 3. Database Schema Specification

```typescript
// packages/db/src/schema/renters.ts
import { integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { flats } from "./building";
import { organizations } from "./organizations";
import { users } from "./auth";

export const renters = pgTable(
  "renters",
  {
    id: text("id").primaryKey(), // ULID
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }), // Linked portal user account
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),
    nidNumber: text("nid_number").notNull(), // Validated 10 or 17 digits
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
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgNidIdx: uniqueIndex("renters_org_nid_idx").on(table.organizationId, table.nidNumber),
    orgPhoneIdx: index("renters_org_phone_idx").on(table.organizationId, table.phone),
  })
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
    serviceCharge: numeric("service_charge", { precision: 12, scale: 2 }).notNull().default("0.00"),
    securityDepositAmount: numeric("security_deposit_amount", { precision: 12, scale: 2 }).notNull(),
    remainingDepositBalance: numeric("remaining_deposit_balance", { precision: 12, scale: 2 }).notNull(),
    startDate: text("start_date").notNull(), // YYYY-MM-DD
    endDate: text("end_date"), // YYYY-MM-DD (null for open-ended month-to-month)
    noticePeriodDays: integer("notice_period_days").notNull().default(30),
    status: text("status").notNull().default("draft"), // 'draft' | 'pending_signature' | 'active' | 'notice_period' | 'terminated'
    terminationDate: text("termination_date"),
    terminationReason: text("termination_reason"),
    contractDocumentUrl: text("contract_document_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgFlatStatusIdx: index("rental_contracts_org_flat_status_idx").on(
      table.organizationId,
      table.flatId,
      table.status
    ),
    orgRenterIdx: index("rental_contracts_org_renter_idx").on(table.organizationId, table.renterId),
  })
);
```

---

## 4. tRPC Procedure Signatures

```typescript
// packages/trpc/src/routers/renter.ts
export const renterRouter = createTRPCRouter({
  // Renters (KYC Directory)
  listRenters: orgProtectedProcedure
    .input(z.object({ search: z.string().optional(), limit: z.number().default(20), offset: z.number().default(0) }))
    .query(async ({ ctx, input }) => { /* ... */ }),

  getRenterById: orgProtectedProcedure
    .input(z.object({ renterId: z.string() }))
    .query(async ({ ctx, input }) => { /* ... */ }),

  createRenter: orgProtectedProcedure
    .input(createRenterSchema)
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  updateRenter: orgProtectedProcedure
    .input(updateRenterSchema)
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  // Tenancy Contracts
  listContracts: orgProtectedProcedure
    .input(z.object({
      status: z.enum(["draft", "pending_signature", "active", "notice_period", "terminated"]).optional(),
      flatId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => { /* ... */ }),

  getContractById: orgProtectedProcedure
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => { /* ... */ }),

  createContract: orgProtectedProcedure
    .input(createContractSchema)
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  activateContract: orgProtectedProcedure
    .input(z.object({ contractId: z.string(), initialDepositReceived: z.boolean().default(true) }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  submitNoticePeriod: orgProtectedProcedure
    .input(z.object({ contractId: z.string(), expectedDepartureDate: z.string(), reason: z.string() }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  terminateContract: orgProtectedProcedure
    .input(terminateContractSchema)
    .mutation(async ({ ctx, input }) => { /* ... */ }),
});
```

---

## 5. Domain Error Codes

| Code | HTTP Status | Description | Actionable Guidance |
|---|:---:|---|---|
| `NID_INVALID_FORMAT` | 422 | NID must be 10 or 17 numeric digits | Provide standard Bangladeshi NID |
| `NID_ALREADY_EXISTS` | 409 | A renter with this NID is already registered in the organization | Lookup existing renter profile |
| `FLAT_ALREADY_OCCUPIED` | 409 | Target flat already has an active tenancy contract | Terminate previous lease before signing new contract |
| `INVALID_BLOOD_GROUP` | 422 | Blood group must be one of the 8 standard ABO types | Select valid blood group |
| `CONTRACT_NOT_IN_DRAFT` | 400 | Contract terms cannot be modified after activation | Create an addendum or contract revision |
| `DEPOSIT_MISMATCH` | 400 | Initial remaining deposit balance must equal security deposit amount | Check financial ledger inputs |
