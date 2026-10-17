# AmarSpace & Omni Heaven — Master Architecture & Engineering Guide

> **Scope:** Monorepo System Architecture, Technical Contracts, Data Integrity, and Localization Standards  
> **Target:** 100% Production-Grade Execution with Zero Guesswork  
> **Last Updated:** October 2026

---

## 1. System Topology & Technology Stack

The platform is architected as an enterprise monorepo using **Turborepo** and powered by the **Bun** runtime.

```
                           ┌────────────────────────┐
                           │      Client Apps       │
                           │ Next.js 16 / Expo iOS  │
                           └───────────┬────────────┘
                                       │
                      HTTP / tRPC (JSON) + Cookie / Bearer
                                       │
                                       ▼
                           ┌────────────────────────┐
                           │   Bun + Hono Gateway   │
                           │     (apps/api:4000)    │
                           └─────┬────────────┬─────┘
                                 │            │
            Better Auth Session  │            │  tRPC Procedures
                                 ▼            ▼
                           ┌────────────────────────┐
                           │   Domain Controllers   │
                           │   & Business Invariants│
                           └───────────┬────────────┘
                                       │
                             Drizzle ORM Connection Pool
                                       │
                                       ▼
                           ┌────────────────────────┐
                           │     PostgreSQL 16      │
                           │  (Multi-Tenant Schema) │
                           └────────────────────────┘
```

### Core Technologies
- **Runtime:** Bun `^1.2.0` (Native speed, built-in bundling, instant test runner)
- **API Server:** Hono (`apps/api`) mounted with `@hono/trpc-server` and Better Auth HTTP handler
- **RPC & API Contract:** tRPC v11 with Zod v3 validation (Complete end-to-end type safety between API and Web/Mobile apps)
- **Authentication:** Better Auth with multi-session, organization plugin, and invitation support
- **Database & ORM:** PostgreSQL 16 managed with Drizzle ORM (`drizzle-orm`, `drizzle-kit`)
- **Frontend Frameworks:** Next.js 16 (App Router) for Web Apps, Expo / React Native for Mobile
- **Design System:** Shared `@omniheaven/ui` with Tailwind CSS v4, DM Sans / Hind Siliguri typography, and accessible touch targets (≥48px)
- **Object Storage:** SeaweedFS (Local Development S3 API on port 8333) and Cloudflare R2 (Production S3 API)
- **Containerization:** Multi-stage Dockerfiles + `docker-compose.dev.yml` for backing services and production compose

---

## 2. Multi-Tenancy & Isolation Model

Multi-tenancy is enforced at the database row level keyed on `organization_id`.

### Organization Resolution Protocol
1. **Authenticated Context:** When a user logs in, Better Auth sets their `activeOrganizationId` in the session.
2. **Explicit Header Override:** Frontends can send `x-organization-id` header to operate within a specific organization (authorized via membership check).
3. **Subdomain / Custom Domain Routing:**
   - Property Tenant Portal: `renter.omniheaven.com` (or tenant-specific custom domain)
   - Hotel Guest Engine: `[slug].omniheaven.com` (or hotel custom domain resolved via middleware)
   - Property Manager Dashboard: `app.omniheaven.com`
   - Platform HQ: `hq.omniheaven.com`
4. **Enforcement Middleware:**
   ```typescript
   // packages/trpc/src/trpc.ts
   export const orgProtectedProcedure = protectedProcedure.use(async ({ ctx, next }) => {
     if (!ctx.organizationId) {
       throw new TRPCError({
         code: "BAD_REQUEST",
         message: "Active organization context (x-organization-id) is required",
       });
     }
     // Verify user has active membership in this organization
     const membership = await ctx.db.query.members.findFirst({
       where: and(
         eq(members.organizationId, ctx.organizationId),
         eq(members.userId, ctx.session.user.id)
       ),
     });
     if (!membership) {
       throw new TRPCError({
         code: "FORBIDDEN",
         message: "User is not a member of the requested organization",
       });
     }
     return next({
       ctx: { ...ctx, organizationId: ctx.organizationId, role: membership.role },
     });
   });
   ```

---

## 3. Role-Based Access Control (RBAC) Matrix

| Resource / Capability | Superadmin (Platform HQ) | Owner (Landlord/Hotelier) | Manager (Estate / Frontdesk) | Staff (Maintenance / Cleaner) | Renter (Tenant / Resident) | Guest (Hotel Guest) |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Platform Subscriptions & Global Settings** | ✅ Full | ❌ None | ❌ None | ❌ None | ❌ None | ❌ None |
| **Manage Properties, Buildings & Units** | ✅ Full | ✅ Full | ✏️ Edit Only | 👁️ View Only | ❌ None | ❌ None |
| **Manage Renters & Issue Contracts** | ✅ Full | ✅ Full | ✅ Full | ❌ None | ❌ None | ❌ None |
| **Advance Deposit Adjustment** | ✅ Full | ✅ Full | ✏️ Propose Only | ❌ None | ❌ None | ❌ None |
| **Generate Utility & Rent Invoices** | ✅ Full | ✅ Full | ✅ Full | ❌ None | ❌ None | ❌ None |
| **Mark Invoices as Paid (Cash/Bank)** | ✅ Full | ✅ Full | ✅ Full | ❌ None | ❌ None | ❌ None |
| **Pay Own Invoices via MFS (bKash/Nagad)** | ❌ None | ❌ None | ❌ None | ❌ None | ✅ Own | ✅ Own |
| **Create & Update Maintenance Requests** | ✅ Full | ✅ Full | ✅ Full | ✏️ Update Status | ✅ Own Flat | ✅ Own Room |
| **Publish Building Notices & Broadcasts**| ✅ Full | ✅ Full | ✅ Full | ❌ None | 👁️ Read Only | ❌ None |
| **View Audit Logs** | ✅ All Orgs | ✅ Own Org | 👁️ Limited Org | ❌ None | ❌ None | ❌ None |

---

## 4. Bangladeshi Localization & Compliance Standards

To serve the local Bangladeshi market with 100% operational fidelity, every domain follows these foundational rules:

### 4.1 Currency & Financial Precision
- **Currency Code:** `BDT`
- **Currency Symbol:** `৳` (Bengali Taka)
- **Formatting Rule:** South Asian numbering system (`৳ 1,25,000.00` instead of `125,000.00`).
- **Database Precision:** Stored as `numeric(12, 2)` or integer Paisa (`1 BDT = 100 Paisa`) to prevent floating-point inaccuracies.

### 4.2 National Identity (NID) Verification
- **Requirement:** Mandatory for all primary adult renters and property managers.
- **Formats Allowed:**
  1. **Smart NID:** Exactly 10 digits (`^\d{10}$`)
  2. **Legacy NID (17 digits):** 4-digit birth year + 13 digits (`^\d{17}$`)
  3. **Legacy NID (13 digits):** Auto-normalized to 17 digits with year of birth prefix.
- **Uniqueness Invariant:** A tenant cannot have two overlapping active contracts under different names with the same NID number.

### 4.3 Mandatory Medical Safety: Blood Group
- **Requirement:** Mandatory on renter registration and employee profiles.
- **Allowed Values (Enum):**
  `'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'`

### 4.4 Mobile Phone Validation
- **Format:** Bangladeshi Mobile Network Operator formats: `+8801[3-9]\d{8}`.
- Supports SMS verification via local BD SMS gateways (e.g., Greenweb, BulkSMSBD) and WhatsApp notifications.

### 4.5 Advance / Security Deposit Accounting
- In Bangladesh, renters pay 1 to 3 months of rent in advance as a security deposit (`security_deposit_amount`).
- **Core Invariant:** The advance deposit balance (`remaining_deposit_balance`) must never be modified by direct overwrites. Every deduction or addition must occur through an explicit, auditable `advance_adjustments` ledger record linked to an invoice or contract termination refund.

---

## 5. Audit Logging Architecture

Every mutation that alters business state **must** produce an immutable audit log entry.

### Audit Log Schema Contract
```typescript
export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(), // ULID / UUIDv7
  organizationId: text("organization_id").notNull(),
  actorUserId: text("actor_user_id").notNull(),
  actorRole: text("actor_role").notNull(),
  entityType: text("entity_type").notNull(), // 'contract' | 'bill' | 'advance_adjustment' | 'unit' | 'renter'
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(), // 'CREATE' | 'UPDATE' | 'DELETE' | 'ADJUST' | 'APPROVE' | 'CANCEL'
  oldValue: text("old_value"), // JSON serialized snapshot of previous state
  newValue: text("new_value"), // JSON serialized snapshot of new state
  metadata: text("metadata"), // JSON serialized context (reason, note, client version)
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

---

## 6. Standardized Error Handling & Domain Codes

All tRPC and REST responses conform to deterministic error formats with domain-specific machine-readable codes.

```typescript
export type ApiErrorResponse = {
  success: false;
  error: {
    code: string; // e.g. "INSUFFICIENT_ADVANCE_BALANCE"
    message: string; // Localized, user-friendly message in Bengali or English
    details?: Record<string, unknown>;
  };
  requestId: string;
};
```

### Global Domain Error Code Taxonomy
- `AUTH_SESSION_EXPIRED`: Authentication token invalid or expired.
- `ORG_FORBIDDEN`: User does not hold authorization in active organization.
- `NID_INVALID_FORMAT`: NID does not conform to 10 or 17 digit requirement.
- `NID_ALREADY_ACTIVE`: Active rental contract already exists for this NID.
- `UNIT_NOT_AVAILABLE`: Unit is currently occupied, under maintenance, or decommissioned.
- `DEPOSIT_INSUFFICIENT`: Advance balance is lower than the requested adjustment amount.
- `BILL_ALREADY_PAID`: Invoices cannot be modified or re-billed after full payment.
- `AUDIT_LOG_FAILED`: Crucial mutations cannot succeed if audit write fails (Transaction rollback).
