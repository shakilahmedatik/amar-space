# Domain 01: Core Auth & Multi-Tenancy — 6-Tier Task Checklist

> **Tracking:** Checkbox Progress Tracker for Domain 01  
> **Target:** 100% Quality & Production Verification

---

### Tier 1: Database & Migrations
- [x] Review Better Auth core user and session tables in `packages/db/src/schema/auth.ts`
- [ ] Ensure `organizations`, `members`, and `invitations` tables have composite unique indexes (`packages/db/src/schema/organizations.ts`)
- [ ] Add `productType` enum validation (`'building' | 'hotel' | 'resort' | 'commercial'`)
- [ ] Generate Drizzle migration for multi-tenancy constraints: `bun run db:generate`
- [ ] Verify migration executes without error: `bun run db:migrate`
- [ ] Add development seed data with 2 test organizations (one building, one hotel) and 3 role fixtures in `packages/db/src/seed.ts`

### Tier 2: Business Logic & Validators
- [ ] Define `createOrganizationSchema` in `packages/validators/src/organization.ts` (slug regex: `^[a-z0-9]+(?:-[a-z0-9]+)*$`)
- [ ] Define `updateOrganizationSchema` with optional logo upload URL and contact details
- [ ] Define `inviteMemberSchema` with email format, role enum (`owner`, `admin`, `manager`, `staff`, `member`), and 7-day TTL calculation
- [ ] Implement sole-owner invariant check utility: `ensureOrganizationHasOwner(db, orgId, targetUserId)`
- [ ] Export custom domain error codes (`ORG_SLUG_TAKEN`, `CANNOT_REMOVE_LAST_OWNER`, `INVITATION_EXPIRED`)

### Tier 3: API & Server Procedures (Hono + tRPC)
- [ ] Implement `orgProtectedProcedure` middleware verifying `x-organization-id` header or active session membership
- [ ] Implement `organization.create` procedure (creates org, adds member with `owner` role, emits audit log in transaction)
- [ ] Implement `organization.listMyOrganizations` procedure
- [ ] Implement `organization.getActive` procedure
- [ ] Implement `organization.switchActive` procedure
- [ ] Implement `organization.inviteMember` procedure (generates token, records invite, dispatches email via Mailpit/Resend)
- [ ] Implement `organization.acceptInvitation` procedure
- [ ] Implement `organization.updateMemberRole` with sole-owner protection check
- [ ] Implement `organization.removeMember` with cascade cleanup and sole-owner check

### Tier 4: UI/UX & Responsive Frontends (`apps/admin`, `packages/ui`)
- [ ] Build workspace switcher dropdown in top navigation bar
- [ ] Create "Create New Organization" modal with instant slug availability debounce check
- [ ] Create "Team & Roles" settings table showing active members, role badges, and pending invitations
- [ ] Build "Invite Team Member" drawer with role descriptions and permission summary
- [ ] Implement responsive mobile drawer for organization switching on viewports < 768px
- [ ] Add Bengali (`bn-BD`) and English (`en-US`) i18n label keys for all auth and organization views
- [ ] Verify minimum touch target size (≥48px) for mobile buttons and dropdown triggers

### Tier 5: Security, Audit Logging & Telemetry
- [ ] Verify audit log write on: Org Created, Member Invited, Member Accepted, Role Changed, Member Removed
- [ ] Implement rate limiting on invitation endpoints (max 10 invites per hour per user)
- [ ] Invalidate cached tRPC queries on active organization switch
- [ ] Ensure Better Auth session cookies use `HttpOnly`, `SameSite=Lax`, and `Secure` flags in production

### Tier 6: Automated Testing & QA
- [ ] Unit test: Organization slug regex validator handles uppercase, special characters, and consecutive hyphens
- [ ] Integration test: Sole owner demotion returns `CANNOT_REMOVE_LAST_OWNER` and rolls back
- [ ] Integration test: Expired invitation returns `INVITATION_EXPIRED`
- [ ] Integration test: Org member cannot access data of an unassociated organization (Cross-tenant leak test)
- [ ] Manual smoke test: Switch organizations on mobile viewport, verify dashboard state updates immediately
