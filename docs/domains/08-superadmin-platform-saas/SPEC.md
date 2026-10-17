# Domain 08: Superadmin SaaS & Platform HQ — Specification

> **Package:** `@omniheaven/db`, `@omniheaven/validators`, `@omniheaven/trpc`, `apps/superadmin`  
> **Status:** Specification Complete  
> **Standard:** Production-Grade Multi-Tenant SaaS Platform Operations (Subscription Plans, Quota Enforcement, Organization Governance, Revenue Metrics)

---

## 1. Business Requirements & Domain Invariants

### 1.1 Core Purpose
Provide platform headquarters executives with global control over customer organizations, SaaS pricing tiers, trial period lifecycles, automated quota enforcement (max units/rooms), security suspensions, and recurring revenue metrics (MRR, churn).

### 1.2 Domain Invariants (Non-Negotiable Rules)
1. **Superadmin Boundary:** The `superadminRouter` is strictly accessible only to authenticated users possessing global `role: "superadmin"`. Tenant owners, managers, and staff cannot access any superadmin procedure.
2. **Hard Quota Enforcement:**
   - Free / Starter Plan: Maximum 20 units/flats.
   - Pro Plan: Maximum 100 units/flats.
   - Enterprise Plan: Unlimited units.
   - Creating a unit when `currentUnitCount >= planMaxUnits` is rejected at the API layer with error code `PLAN_QUOTA_EXCEEDED`.
3. **Suspension Lockout:** When a customer organization is suspended for non-payment or policy violations (`organizations.status = "suspended"`), all subsequent API operations by tenant members are rejected with `ORG_SUSPENDED`.
4. **Subscription Periodicity:** Subscriptions track `currentPeriodStart` and `currentPeriodEnd` with automated grace period handling for Bangladeshi payment methods (bKash recurring / manual invoice).

---

## 2. Subscription Lifecycle

```
        Customer Signs Up (New Organization)
                         │
                         ▼
        ┌──────────────────────────────────┐
        │            TRIALING              │ (e.g. 6-Month Promo Trial in BD)
        └────────────────┬─────────────────┘
                         │
                   Payment Made
                         │
                         ▼
        ┌──────────────────────────────────┐
        │             ACTIVE               │◄─────────────────┐
        │    (Normal Quota & Feature Set)  │                  │
        └────────────────┬─────────────────┘                  │
                         │                                    │
                  Renewal Fails / Grace Period                │
                         │                              Payment Cleared
                         ▼                                    │
        ┌──────────────────────────────────┐                  │
        │            PAST DUE              ├──────────────────┘
        │   (Warning Banner to Owner)      │
        └────────────────┬─────────────────┘
                         │
                  Grace Period Expires
                         │
                         ▼
        ┌──────────────────────────────────┐
        │            SUSPENDED             │ (All Tenant APIs Locked)
        └──────────────────────────────────┘
```

---

## 3. Database Schema Specification

```typescript
// packages/db/src/schema/subscriptions.ts
import { integer, numeric, pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const subscriptionPlans = pgTable("subscription_plans", {
  id: text("id").primaryKey(), // 'starter' | 'pro' | 'enterprise'
  name: text("name").notNull(),
  description: text("description"),
  priceMonthlyBdt: numeric("price_monthly_bdt", { precision: 12, scale: 2 }).notNull(),
  priceYearlyBdt: numeric("price_yearly_bdt", { precision: 12, scale: 2 }).notNull(),
  maxUnits: integer("max_units").notNull().default(20),
  features: text("features").notNull(), // JSON string array of enabled features
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(), // ULID
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    planId: text("plan_id")
      .notNull()
      .references(() => subscriptionPlans.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("trialing"), // 'trialing' | 'active' | 'past_due' | 'canceled' | 'suspended'
    billingCycle: text("billing_cycle").notNull().default("monthly"), // 'monthly' | 'yearly'
    trialStartsAt: timestamp("trial_starts_at", { withTimezone: true }).defaultNow().notNull(),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }).notNull(),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    paymentProvider: text("payment_provider").default("bkash"), // 'bkash' | 'sslcommerz' | 'stripe' | 'manual'
    providerSubscriptionId: text("provider_subscription_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgSubIdx: index("subscriptions_org_idx").on(table.organizationId),
    statusIdx: index("subscriptions_status_idx").on(table.status),
  })
);
```

---

## 4. tRPC Procedure Signatures

```typescript
// packages/trpc/src/routers/superadmin.ts
export const superadminRouter = createTRPCRouter({
  // Global Metrics
  getPlatformStats: superadminProcedure.query(async ({ ctx }) => { /* ... */ }),

  // Organization Governance
  listAllOrganizations: superadminProcedure
    .input(z.object({ search: z.string().optional(), status: z.string().optional(), limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => { /* ... */ }),

  getOrganizationDetails: superadminProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => { /* ... */ }),

  suspendOrganization: superadminProcedure
    .input(z.object({ organizationId: z.string(), reason: z.string() }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  reinstateOrganization: superadminProcedure
    .input(z.object({ organizationId: z.string() }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  // SaaS Plans & Subscriptions
  listPlans: superadminProcedure.query(async ({ ctx }) => { /* ... */ }),
  updateOrganizationPlan: superadminProcedure
    .input(z.object({ organizationId: z.string(), planId: z.string(), extendDays: z.number().optional() }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),
});
```

---

## 5. Domain Error Codes

| Code | HTTP Status | Description | Actionable Guidance |
|---|:---:|---|---|
| `SUPERADMIN_FORBIDDEN` | 403 | User is not a global platform superadministrator | Access denied |
| `PLAN_QUOTA_EXCEEDED` | 402 | Organization has reached the unit limit for their current plan | Upgrade subscription tier |
| `ORG_SUSPENDED` | 403 | Organization has been suspended by platform administration | Contact support@omniheaven.com |
| `INVALID_PLAN_UPGRADE` | 400 | Target plan maximum units is lower than organization's active units | Downsizing requires prior unit archiving |
