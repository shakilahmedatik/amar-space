# Domain 06: Audit Logging & Security — 6-Tier Task Checklist

> **Tracking:** Checkbox Progress Tracker for Domain 06  
> **Target:** 100% Quality & Production Verification

---

### Tier 1: Database & Migrations
- [ ] Ensure `auditLogs` table in `packages/db/src/schema/operations.ts` has: `actorUserId`, `actorEmail`, `actorRole`, `action`, `entityType`, `entityId`, `oldValue`, `newValue`, `metadata`, `ipAddress`, `userAgent`
- [ ] Add indexes on `(organizationId, createdAt)`, `(entityType, entityId)`, and `(organizationId, actorUserId)`
- [ ] Verify Drizzle migrations: `bun run db:generate` and `bun run db:migrate`
- [ ] Add sample audit log fixtures in `packages/db/src/seed.ts`

### Tier 2: Business Logic & Validators
- [ ] Implement reusable audit log helper: `recordAuditLog(tx, { orgId, actor, action, entityType, entityId, oldValue, newValue, metadata, req })`
- [ ] Define `listAuditLogsSchema` with optional date range, action, actor, entity filters
- [ ] Export domain error codes (`AUDIT_FORBIDDEN`, `AUDIT_LOG_WRITE_FAILED`, `INVALID_DATE_RANGE`)

### Tier 3: API & Server Procedures (Hono + tRPC)
- [ ] Implement `auditRouter` in `packages/trpc/src/routers/audit.ts`
- [ ] `audit.listAuditLogs`: Scoped strictly to `owner` and `manager` roles with pagination
- [ ] `audit.getEntityAuditTrail`: Chronological timeline of changes for a specific flat, lease, or bill
- [ ] `audit.exportAuditReportCsv`: Generates downloadable CSV of audit records
- [ ] Register `auditRouter` in main `appRouter` (`packages/trpc/src/routers/app.ts`)

### Tier 4: UI/UX & Responsive Frontends (`apps/admin`, `packages/ui`)
- [ ] Build "Audit Logs & Security" dashboard view in Admin portal
- [ ] Build interactive JSON Diff viewer component (showing before and after field changes with green/red highlighting)
- [ ] Build Entity Timeline component embedded in Flat Details, Renter Details, and Invoice Details views
- [ ] Build date-picker and filter bar for actor, action, and entity type
- [ ] Responsive table with mobile card fallback for small screens (< 768px)
- [ ] Bengali (`bn-BD`) and English (`en-US`) i18n translation keys

### Tier 5: Security, Audit Logging & Telemetry
- [ ] Restrict audit log reading strictly to `owner` and `admin` roles (block `staff` and `member`)
- [ ] Capture real client IP address via `c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for")`
- [ ] Sanitize sensitive values (e.g., passwords, secret keys) so they are never written to `oldValue` or `newValue`

### Tier 6: Automated Testing & QA
- [ ] Unit test: `recordAuditLog` helper strips sensitive passwords before serializing diff
- [ ] Integration test: Non-owner/manager user calling `audit.listAuditLogs` receives `AUDIT_FORBIDDEN`
- [ ] Integration test: Business mutation inside transaction rolls back if audit log insert fails
- [ ] Manual smoke test: Perform a flat rent update and verify diff appears in audit log UI
