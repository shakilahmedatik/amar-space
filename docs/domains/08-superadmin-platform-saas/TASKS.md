# Domain 08: Superadmin SaaS & Platform HQ — 6-Tier Task Checklist

> **Tracking:** Checkbox Progress Tracker for Domain 08  
> **Target:** 100% Quality & Production Verification

---

### Tier 1: Database & Migrations
- [x] Create `subscriptionPlans` table in `packages/db/src/schema/subscriptions.ts` with: `name`, `priceMonthlyBdt`, `priceYearlyBdt`, `maxUnits`, `features`, `isActive`
- [x] Update `subscriptions` table with `planId` (foreign key), `billingCycle`, `currentPeriodStart`, `currentPeriodEnd`
- [x] Add `status` column to `organizations` table (`'active' | 'suspended' | 'trialing'`)
- [x] Generate Drizzle migration: `bun run db:generate`
- [x] Apply migration: `bun run db:migrate`
- [x] Add seed fixtures for 3 subscription plans (`starter`, `pro`, `enterprise`) in `packages/db/src/seed.ts`

### Tier 2: Business Logic & Validators
- [x] Define `superadminProcedure` middleware checking for global `user.role === 'superadmin'`
- [x] Implement quota verification utility: `verifyOrganizationQuota(db, orgId, resourceType)`
- [x] Define `suspendOrganizationSchema` requiring reason explanation
- [x] Export domain error codes (`SUPERADMIN_FORBIDDEN`, `PLAN_QUOTA_EXCEEDED`, `ORG_SUSPENDED`, `INVALID_PLAN_UPGRADE`)

### Tier 3: API & Server Procedures (Hono + tRPC)
- [x] Implement `superadminRouter` in `packages/trpc/src/routers/superadmin.ts`
- [x] `superadmin.getPlatformStats`: Aggregate statistics across all tenants (total units, occupancy %, active subs)
- [x] `superadmin.listAllOrganizations`: Paginated organization list with search and plan filter
- [x] `superadmin.getOrganizationDetails`: Deep dive with billing history and member list
- [x] `superadmin.suspendOrganization`: Sets status to `suspended` and revokes active sessions
- [x] `superadmin.reinstateOrganization`: Restores organization status to `active`
- [x] `superadmin.updateOrganizationPlan`: Manually upgrades or adjusts subscription periods
- [x] Register `superadminRouter` in main `appRouter` (`packages/trpc/src/routers/app.ts`)

### Tier 4: UI/UX & Responsive Frontends (`apps/superadmin`, `packages/ui`)
- [x] Build Platform HQ Executive Dashboard with high-level KPI stat cards (MRR, Total Buildings, Total Flats)
- [x] Build Organizations Directory with quick-action suspension modals and search bar
- [x] Build Organization Detail view showing live unit counts against plan quota limits
- [x] Build SaaS Plan Editor and pricing adjustment interface
- [x] Mobile-responsive layout for Platform HQ monitoring on phones (< 768px)
- [x] Bengali (`bn-BD`) and English (`en-US`) i18n support

### Tier 5: Security, Audit Logging & Telemetry
- [x] Strict isolation: Superadmin routes cannot be invoked by any non-superadmin user
- [x] Audit log emission on organization suspension, reinstatement, and plan overrides
- [x] Multi-factor authentication (MFA) enforcement on Superadmin accounts

### Tier 6: Automated Testing & QA
- [x] Unit test: Quota validator blocks unit creation when unit count reaches plan limit
- [x] Integration test: Non-superadmin calling superadmin procedures receives `SUPERADMIN_FORBIDDEN`
- [x] Integration test: Suspended organization member requests return `ORG_SUSPENDED`
- [x] Manual smoke test: Log in to Superadmin HQ, view organization, trigger trial extension
