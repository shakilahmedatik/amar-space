# Domain 01: Core Auth & Multi-Tenancy — Specification

> **Package:** `@omniheaven/auth`, `@omniheaven/trpc`, `apps/api`  
> **Status:** Specification Complete (Ready for Implementation)  
> **Standard:** Production-Grade Multi-Tenant Isolation with Better Auth

---

## 1. Business Requirements & Domain Invariants

### 1.1 Core Purpose
Provide rock-solid identity verification, secure credential management, organization tenancy partitioning, role-based access control (RBAC), and team collaboration for property owners, managers, staff, and tenants.

### 1.2 Domain Invariants (Non-Negotiable Rules)
1. **Tenant Isolation:** Every operational business entity (building, unit, renter, bill, maintenance ticket) **must** reference `organizationId`. Queries without an explicit `where(eq(table.organizationId, ctx.organizationId))` are strictly forbidden in tenant routers.
2. **Multi-Membership:** A single user (identified by unique email/phone) can belong to multiple organizations with distinct roles (e.g. an Owner in Property A, a Manager in Property B, and a Renter in Property C).
3. **Sole Owner Protection:** An organization cannot delete or downgrade the role of its last remaining `owner`.
4. **Unique Organization Slug:** Organization slugs must be lowercase, alphanumeric with hyphens, and globally unique across the platform (e.g., `bashundhara-tower`, `green-villa`).
5. **Session & Token Security:**
   - HTTPS-only secure cookies with `SameSite=Lax`.
   - Automatic session invalidation upon password reset or role revocation.
   - Request-level propagation of `x-organization-id` header or session `activeOrganizationId`.

---

## 2. Role-Based Access Control (RBAC) Specification

| Role | Description | Core Capabilities |
|---|---|---|
| **owner** | Organization Proprietor / Landlord | Full control over billing, team invites, bank accounts, deletion, and property configuration. |
| **admin** | Senior Operational Administrator | Can manage all buildings, units, leases, bills, and staff, but cannot delete the organization or modify owner accounts. |
| **manager**| Property / Building Manager | Can create units, issue tenancy contracts, record payments, manage maintenance, and issue notices. |
| **staff** | Facility / Maintenance Personnel | Read-only access to relevant buildings/units; can update assigned maintenance tickets and housekeeping statuses. |
| **member** | Basic resident / member | Renter or hotel guest with portal access scoped strictly to their personal leases, bills, and tickets. |

---

## 3. Database Schema & Data Integrity

```typescript
// packages/db/src/schema/auth.ts & organizations.ts
import { pgTable, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";

export const organizations = pgTable(
  "organizations",
  {
    id: text("id").primaryKey(), // ULID / cuid2
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    logo: text("logo"),
    productType: text("product_type").notNull().default("building"), // 'building' | 'hotel' | 'resort' | 'commercial'
    contactPhone: text("contact_phone"),
    contactEmail: text("contact_email"),
    address: text("address"),
    customDomain: text("custom_domain").unique(),
    metadata: text("metadata"), // JSON string
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    slugIdx: uniqueIndex("orgs_slug_idx").on(table.slug),
    customDomainIdx: uniqueIndex("orgs_custom_domain_idx").on(table.customDomain),
  })
);

export const members = pgTable(
  "members",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"), // 'owner' | 'admin' | 'manager' | 'staff' | 'member'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgUserIdx: uniqueIndex("members_org_user_idx").on(table.organizationId, table.userId),
    orgRoleIdx: index("members_org_role_idx").on(table.organizationId, table.role),
  })
);

export const invitations = pgTable(
  "invitations",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").notNull().default("staff"),
    status: text("status").notNull().default("pending"), // 'pending' | 'accepted' | 'rejected' | 'canceled'
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgEmailIdx: index("invitations_org_email_idx").on(table.organizationId, table.email),
    statusIdx: index("invitations_status_idx").on(table.status),
  })
);
```

---

## 4. tRPC Router & Procedure Signatures

```typescript
// packages/trpc/src/routers/organization.ts
export const organizationRouter = createTRPCRouter({
  // Queries
  listMyOrganizations: protectedProcedure
    .query(async ({ ctx }) => { /* ... */ }),

  getActiveOrganization: orgProtectedProcedure
    .query(async ({ ctx }) => { /* ... */ }),

  listMembers: orgProtectedProcedure
    .input(z.object({ limit: z.number().default(20), offset: z.number().default(0) }))
    .query(async ({ ctx, input }) => { /* ... */ }),

  listInvitations: orgProtectedProcedure
    .query(async ({ ctx }) => { /* ... */ }),

  // Mutations
  createOrganization: protectedProcedure
    .input(createOrganizationSchema)
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  updateOrganization: orgProtectedProcedure
    .input(updateOrganizationSchema)
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  inviteMember: orgProtectedProcedure
    .input(inviteMemberSchema)
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  acceptInvitation: protectedProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  updateMemberRole: orgProtectedProcedure
    .input(z.object({ memberId: z.string(), newRole: z.enum(["admin", "manager", "staff", "member"]) }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  removeMember: orgProtectedProcedure
    .input(z.object({ memberId: z.string() }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),
});
```

---

## 5. Domain Error Codes

| Code | HTTP Status | Description | Actionable Guidance |
|---|:---:|---|---|
| `AUTH_UNAUTHORIZED` | 401 | User session missing or expired | Redirect to `/login` |
| `ORG_NOT_FOUND` | 404 | Specified organization does not exist | Verify URL or organization switcher |
| `ORG_FORBIDDEN` | 403 | User is not an authorized member | Request access from organization owner |
| `ORG_SLUG_TAKEN` | 409 | Requested organization slug is already in use | Choose an alternate URL slug |
| `CANNOT_REMOVE_LAST_OWNER`| 400 | Attempted to delete or demote sole owner | Promote another member to owner first |
| `INVITATION_EXPIRED` | 410 | Invitation link has exceeded 7-day TTL | Request a fresh invitation from manager |
