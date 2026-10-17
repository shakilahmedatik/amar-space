# Domain 05: Maintenance & Notices — 6-Tier Task Checklist

> **Tracking:** Checkbox Progress Tracker for Domain 05  
> **Target:** 100% Quality & Production Verification

---

### Tier 1: Database & Migrations
- [ ] Update `maintenanceRequests` in `packages/db/src/schema/operations.ts` with: `category`, `photoUrls`, `requestedByUserId`, `assignedToStaffId`, `repairCost`, `costBilledTo`, `resolutionNotes`, `resolutionPhotoUrls`, `resolvedAt`, `closedAt`
- [ ] Add indexes on `(organizationId, buildingId, status)`, `assignedToStaffId`, and `requestedByUserId`
- [ ] Update `notices` table with: `authorUserId`, `targetBuildingId`, `targetFlatId`, `isPinned`, `expiresAt`
- [ ] Add indexes on `(organizationId, targetBuildingId, targetAudience)` and `isPinned`
- [ ] Generate Drizzle migration: `bun run db:generate`
- [ ] Apply migration: `bun run db:migrate`
- [ ] Add seed fixtures for maintenance tickets and building notices in `packages/db/src/seed.ts`

### Tier 2: Business Logic & Validators
- [ ] Define `createMaintenanceRequestSchema` with category enum (`plumbing`, `electrical`, `generator`, `elevator`, `carpentry`, `sanitary`, `general`) and priority in `packages/validators/src/operations.ts`
- [ ] Define `resolveMaintenanceRequestSchema` requiring non-empty resolution notes and optional cost
- [ ] Define `createNoticeSchema` with markdown body validation and target audience enum
- [ ] Export domain error codes (`TICKET_NOT_FOUND`, `TICKET_ALREADY_CLOSED`, `RESOLUTION_NOTES_REQUIRED`, `FORBIDDEN_TICKET_ACCESS`, `NOTICE_EXPIRED`)

### Tier 3: API & Server Procedures (Hono + tRPC)
- [ ] Implement `operationsRouter` in `packages/trpc/src/routers/operations.ts`
- [ ] `operations.listMaintenanceRequests`: Return tickets filtered by status, priority, building, or user flat
- [ ] `operations.getMaintenanceRequestById`: Enforce tenant flat isolation check
- [ ] `operations.createMaintenanceRequest`: Validates flat occupancy, writes ticket, alerts manager, writes audit log
- [ ] `operations.assignStaffToRequest`: Assigns team member, sends notification
- [ ] `operations.updateRequestStatus`: Updates status (`assigned`, `in_progress`), writes audit log
- [ ] `operations.resolveMaintenanceRequest`: Checks notes presence, records cost, writes audit log
- [ ] `operations.listNotices`: Fetches active, non-expired notices filtered by building context
- [ ] `operations.createNotice`: Saves broadcast notice with audience targeting
- [ ] `operations.pinNotice`, `operations.deleteNotice`
- [ ] Register `operationsRouter` in main `appRouter` (`packages/trpc/src/routers/app.ts`)

### Tier 4: UI/UX & Responsive Frontends (`apps/admin`, `apps/renter-portal`, `packages/ui`)
- [ ] Build Kanban Board / Grid for Maintenance Tickets: Open, Assigned, In Progress, Resolved, Closed
- [ ] Build "Report Maintenance Issue" form with multi-photo upload preview and emergency flag
- [ ] Build Ticket Detail Drawer with resolution proof timeline and expense logger
- [ ] Build "Notice Board" widget with pinned alert cards and collapsible notice history
- [ ] Build "Create Notice" modal with markdown formatting and target building selector
- [ ] Build Renter Portal Maintenance Tab (`apps/renter-portal`) with 1-tap "Report a Problem" CTA
- [ ] Ensure mobile viewports (< 768px) render accessible touch targets (≥48px) and responsive photo carousels
- [ ] Bengali (`bn-BD`) and English (`en-US`) i18n translation keys for all maintenance and notice views

### Tier 5: Security, Audit Logging & Telemetry
- [ ] Strict row-level tenant validation: Tenants cannot query or update tickets outside their flat
- [ ] Audit log emission on ticket creation, staff assignment, resolution, cost logging, and notice publishing
- [ ] Virus/mimetype check on uploaded ticket photos before committing to S3/R2 storage

### Tier 6: Automated Testing & QA
- [ ] Unit test: Ticket resolution requires non-empty resolution notes
- [ ] Integration test: Tenant cannot access maintenance ticket belonging to another flat (throws `FORBIDDEN_TICKET_ACCESS`)
- [ ] Integration test: Expired notices are omitted from active resident feed
- [ ] Manual smoke test: Report maintenance ticket with photo on mobile, assign to manager, resolve with cost
