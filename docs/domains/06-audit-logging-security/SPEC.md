# Domain 06: Audit Logging & Security — Specification

> **Package:** `@omniheaven/db`, `@omniheaven/validators`, `@omniheaven/trpc`  
> **Status:** Specification Complete (Ready for Implementation)  
> **Standard:** Production-Grade Immutable Forensic Trail (Before/After Diffs, IP & Agent Capture, Append-Only)

---

## 1. Business Requirements & Domain Invariants

### 1.1 Core Purpose
Provide a legally defensible, tamper-proof, append-only ledger of every critical state change across the platform. Ensure accountability for multi-staff property teams, detect unauthorized activity, and provide forensic recovery history.

### 1.2 Domain Invariants (Non-Negotiable Rules)
1. **Append-Only Immutability:** The `audit_logs` table has no `UPDATE` or `DELETE` API endpoints or database permissions. Records once committed can never be altered or removed.
2. **Deterministic Diff Snapshots:** For every `UPDATE` and `ADJUST` action, both `oldValue` and `newValue` **must** be stored as serialized JSON snapshots to allow exact delta reconstruction.
3. **Transactional Atomic Writes:** If the business mutation succeeds, the audit log must succeed in the same database transaction. An audit log failure triggers an automatic rollback of the parent mutation.
4. **Actor & Request Provenance:** Every audit entry must capture:
   - `actorUserId`: ID of the authenticated user (or `"SYSTEM"` for background cron jobs)
   - `actorRole`: Role held at the time of execution
   - `ipAddress`: Client IP address from request headers (`x-forwarded-for` / CF-Connecting-IP)
   - `userAgent`: Client device / browser user-agent
5. **Visibility Segregation:**
   - Platform `superadmin`: Global visibility across all tenants.
   - Organization `owner`: Full visibility of all logs within their organization.
   - Organization `manager`: Operational logs (leases, bills, tickets).
   - Staff & Renters: Zero access to raw audit logs.

---

## 2. Audit Trail Pipeline

```
                     Client Request (tRPC Mutation)
                                  │
                                  ▼
                     Authorization & Input Check
                                  │
                                  ▼
                     BEGIN Database Transaction
                                  │
                     ├── 1. Execute Domain Mutation (e.g., Update Rent)
                     │      Capture Old State -> New State
                     │
                     └── 2. Insert into audit_logs (Actor, Action, Diff, IP)
                                  │
                                  ▼
                     COMMIT Database Transaction
                                  │
                                  ▼
                     Success Response to Client
```

---

## 3. Database Schema Specification

```typescript
// packages/db/src/schema/operations.ts (or dedicated audit.ts)
import { jsonb, pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./auth";

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey(), // ULID / UUIDv7 (naturally chronological)
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    actorEmail: text("actor_email").notNull(),
    actorRole: text("actor_role").notNull(), // 'owner' | 'admin' | 'manager' | 'staff' | 'system'
    action: text("action").notNull(), // 'CREATE' | 'UPDATE' | 'DELETE' | 'ADJUST' | 'APPROVE' | 'CANCEL' | 'PAY'
    entityType: text("entity_type").notNull(), // 'organization' | 'building' | 'flat' | 'renter' | 'contract' | 'bill' | 'advance_adjustment' | 'payment' | 'maintenance' | 'notice'
    entityId: text("entity_id").notNull(),
    oldValue: jsonb("old_value"), // Snapshot before modification
    newValue: jsonb("new_value"), // Snapshot after modification
    metadata: jsonb("metadata"), // Context (reason, adjustment note, client app version)
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgCreatedIdx: index("audit_logs_org_created_idx").on(table.organizationId, table.createdAt),
    entityIdx: index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    actorIdx: index("audit_logs_actor_idx").on(table.organizationId, table.actorUserId),
  })
);
```

---

## 4. tRPC Procedure Signatures

```typescript
// packages/trpc/src/routers/audit.ts
export const auditRouter = createTRPCRouter({
  listAuditLogs: orgProtectedProcedure
    .input(z.object({
      entityType: z.string().optional(),
      entityId: z.string().optional(),
      actorUserId: z.string().optional(),
      action: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => { /* ... */ }),

  getEntityAuditTrail: orgProtectedProcedure
    .input(z.object({ entityType: z.string(), entityId: z.string() }))
    .query(async ({ ctx, input }) => { /* ... */ }),

  exportAuditReportCsv: orgProtectedProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),
});
```

---

## 5. Domain Error Codes

| Code | HTTP Status | Description | Actionable Guidance |
|---|:---:|---|---|
| `AUDIT_FORBIDDEN` | 403 | User role is not authorized to inspect audit logs | Only Owners and Managers can access |
| `AUDIT_LOG_WRITE_FAILED` | 500 | Failed to write immutable log entry during mutation | Transaction rolled back for safety |
| `INVALID_DATE_RANGE` | 422 | Query date range is inverted or exceeds 90-day export window | Correct date filters |
