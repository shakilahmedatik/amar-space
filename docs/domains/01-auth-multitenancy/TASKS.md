# Domain 01: Core Auth & Multi-Tenancy — 6-Tier Task Checklist

> **Tracking:** Checkbox Progress Tracker for Domain 01  
> **Target:** 100% Quality & Production Verification

---

### Tier 1: Database & Migrations
- [x] Review Better Auth core user and session tables in `packages/db/src/schema/auth.ts`
- [x] Ensure `organizations`, `members`, and `invitations` tables have composite unique indexes (`packages/db/src/schema/organizations.ts`)
- [x] Add `productType` enum validation (`'building' | 'hotel' | 'resort' | 'commercial'`)
- [x] Generate Drizzle migration for multi-tenancy constraints: `bun run db:generate`
- [x] Verify migration executes without error: `bun run db:migrate`
- [x] Add development seed data with 2 test organizations (one building, one hotel) and 3 role fixtures in `packages/db/src/seed.ts`

### Tier 2: Business Logic & Validators
- [x] Define `createOrganizationSchema` in `packages/validators/src/organization.ts` (slug regex: `^[a-z0-9]+(?:-[a-z0-9]+)*$`)
- [x] Define `updateOrganizationSchema` with optional logo upload URL and contact details
- [x] Define `inviteMemberSchema` with email format, role enum (`owner`, `admin`, `manager`, `staff`, `member`), and 7-day TTL calculation
- [x] Implement sole-owner invariant check utility: `ensureOrganizationHasOwner(db, orgId, targetUserId)`
- [x] Export custom domain error codes (`ORG_SLUG_TAKEN`, `CANNOT_REMOVE_LAST_OWNER`, `INVITATION_EXPIRED`)

### Tier 3: API & Server Procedures (Hono + tRPC)
- [x] Implement `orgProtectedProcedure` middleware verifying `x-organization-id` header or active session membership
- [x] Implement `organization.create` procedure (creates org, adds member with `owner` role, emits audit log in transaction)
- [x] Implement `organization.listMyOrganizations` procedure
- [x] Implement `organization.getActive` procedure
- [x] Implement `organization.switchActive` procedure
- [x] Implement `organization.inviteMember` procedure (generates token, records invite, dispatches email via Mailpit/Resend)
- [x] Implement `organization.acceptInvitation` procedure
- [x] Implement `organization.updateMemberRole` with sole-owner protection check
- [x] Implement `organization.removeMember` with cascade cleanup and sole-owner check

### Tier 4: UI/UX & Responsive Frontends (`apps/admin`, `packages/ui`)
- [x] Build workspace switcher dropdown in top navigation bar
- [x] Create "Create New Organization" modal with instant slug availability debounce check
- [x] Create "Team & Roles" settings table showing active members, role badges, and pending invitations
- [x] Build "Invite Team Member" drawer with role descriptions and permission summary
- [x] Implement responsive mobile drawer for organization switching on viewports < 768px
- [x] Add Bengali (`bn-BD`) and English (`en-US`) i18n label keys for all auth and organization views
- [x] Verify minimum touch target size (≥48px) for mobile buttons and dropdown triggers

### Tier 5: Security, Audit Logging & Telemetry
- [x] Verify audit log write on: Org Created, Member Invited, Member Accepted, Role Changed, Member Removed
- [x] Implement rate limiting on invitation endpoints (max 10 invites per hour per user)
- [x] Invalidate cached tRPC queries on active organization switch
- [x] Ensure Better Auth session cookies use `HttpOnly`, `SameSite=Lax`, and `Secure` flags in production

### Tier 6: Automated Testing & QA
- [x] Unit test: Organization slug regex validator handles uppercase, special characters, and consecutive hyphens
- [x] Integration test: Sole owner demotion returns `CANNOT_REMOVE_LAST_OWNER` and rolls back
- [x] Integration test: Expired invitation returns `INVITATION_EXPIRED`
- [x] Integration test: Org member cannot access data of an unassociated organization (Cross-tenant leak test)
- [x] Manual smoke test: Switch organizations on mobile viewport, verify dashboard state updates immediately
