# Domain 08: Superadmin SaaS & Platform HQ — 6-Tier Task Checklist

> **Tracking:** Checkbox Progress Tracker for Domain 08  
> **Target:** 100% Quality & Production Verification

---

### Tier 1: Database & Migrations
- [ ] Create `subscriptionPlans` table in `packages/db/src/schema/subscriptions.ts` with: `name`, `priceMonthlyBdt`, `priceYearlyBdt`, `maxUnits`, `features`, `isActive`
- [ ] Update `subscriptions` table with `planId` (foreign key), `billingCycle`, `currentPeriodStart`, `currentPeriodEnd`
- [ ] Add `status` column to `organizations` table (`'active' | 'suspended' | 'trialing'`)
- [ ] Generate Drizzle migration: `bun run db:generate`
- [ ] Apply migration: `bun run db:migrate`
- [ ] Add seed fixtures for 3 subscription plans (`starter`, `pro`, `enterprise`) in `packages/db/src/seed.ts`

### Tier 2: Business Logic & Validators
- [ ] Define `superadminProcedure` middleware checking for global `user.role === 'superadmin'`
- [ ] Implement quota verification utility: `verifyOrganizationQuota(db, orgId, resourceType)`
- [ ] Define `suspendOrganizationSchema` requiring reason explanation
- [ ] Export domain error codes (`SUPERADMIN_FORBIDDEN`, `PLAN_QUOTA_EXCEEDED`, `ORG_SUSPENDED`, `INVALID_PLAN_UPGRADE`)

### Tier 3: API & Server Procedures (Hono + tRPC)
- [ ] Implement `superadminRouter` in `packages/trpc/src/routers/superadmin.ts`
- [ ] `superadmin.getPlatformStats`: Aggregate statistics across all tenants (total units, occupancy %, active subs)
- [ ] `superadmin.listAllOrganizations`: Paginated organization list with search and plan filter
- [ ] `superadmin.getOrganizationDetails`: Deep dive with billing history and member list
- [ ] `superadmin.suspendOrganization`: Sets status to `suspended` and revokes active sessions
- [ ] `superadmin.reinstateOrganization`: Restores organization status to `active`
- [ ] `superadmin.updateOrganizationPlan`: Manually upgrades or adjusts subscription periods
- [ ] Register `superadminRouter` in main `appRouter` (`packages/trpc/src/routers/app.ts`)

### Tier 4: UI/UX & Responsive Frontends (`apps/superadmin`, `packages/ui`)
- [ ] Build Platform HQ Executive Dashboard with high-level KPI stat cards (MRR, Total Buildings, Total Flats)
- [ ] Build Organizations Directory with quick-action suspension modals and search bar
- [ ] Build Organization Detail view showing live unit counts against plan quota limits
- [ ] Build SaaS Plan Editor and pricing adjustment interface
- [ ] Mobile-responsive layout for Platform HQ monitoring on phones (< 768px)
- [ ] Bengali (`bn-BD`) and English (`en-US`) i18n support

### Tier 5: Security, Audit Logging & Telemetry
- [ ] Strict isolation: Superadmin routes cannot be invoked by any non-superadmin user
- [ ] Audit log emission on organization suspension, reinstatement, and plan overrides
- [ ] Multi-factor authentication (MFA) enforcement on Superadmin accounts

### Tier 6: Automated Testing & QA
- [ ] Unit test: Quota validator blocks unit creation when unit count reaches plan limit
- [ ] Integration test: Non-superadmin calling superadmin procedures receives `SUPERADMIN_FORBIDDEN`
- [ ] Integration test: Suspended organization member requests return `ORG_SUSPENDED`
- [ ] Manual smoke test: Log in to Superadmin HQ, view organization, trigger trial extension
