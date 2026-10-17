# AmarSpace & Omni Heaven — Master Implementation Roadmap

> **Status:** Architecture & Domain Specification Phase  
> **Standard:** Production-Grade Commercial SaaS (Bangla-first, Elderly-friendly, Mobile-first, Dual-Vertical)  
> **Last Updated:** October 2026

---

## 1. Executive Summary & Quality Gates

AmarSpace is an enterprise-grade multi-tenant property management platform optimized for the Bangladeshi real estate market (landlords, property managers, flat residents), seamlessly extensible into Omni Heaven (hotel, resort, and vacation rental property management system).

### Non-Negotiable Engineering Standards
1. **Zero Guesswork:** No feature or database change is coded without prior entry in its respective domain `SPEC.md`, `USER_STORIES.md`, and `TASKS.md`.
2. **Type-Safety Across Boundaries:** End-to-end type safety using **Bun + Hono + tRPC v11 + Drizzle ORM + Zod + React Query**.
3. **Audit Trail Guarantee:** 100% of mutation operations must generate structured, immutable entries in `audit_logs` capturing actor, target, before/after JSON diffs, IP, and user-agent.
4. **Bangladeshi Localization First:**
   - Currency: BDT (৳) with localized formatting (`1,25,000 ৳`).
   - National Identity: Mandatory Bangladeshi NID (10-digit Smart NID or 17-digit legacy format).
   - Medical Safety: Mandatory Blood Group recording for residents and staff.
   - Advance Rent Adjustments: Legal tracking of security deposits against future bills/rents.
   - Payments: Native integration with bKash, Nagad, Rocket, and SSLCOMMERZ alongside cash/bank collection receipts.
   - Language: Dual-language i18n (`bn-BD` Bengali priority, `en-US` English).
5. **Mobile-First & Elderly-Friendly:** High-contrast typography (DM Sans / Hind Siliguri), minimum 48px touch targets, simplified one-click bill payment and maintenance request flows.

---

## 2. Master Domain Architecture Map

```
docs/
├── ROADMAP.md                               # Master delivery dashboard & milestone tracking
├── ARCHITECTURE.md                          # Master technical design & platform contracts
└── domains/
    ├── 01-auth-multitenancy/                # Core Auth, Organization Context & RBAC
    ├── 02-property-hierarchy/               # Properties, Buildings, Floors, Flats/Units
    ├── 03-renter-lifecycle-contracts/       # Renter KYC, Bangladeshi NID, Leases, Deposits
    ├── 04-billing-finance-adjustments/      # Utility Bills, Auto-Invoicing, Advance Adjustments, MFS
    ├── 05-maintenance-operations-notices/   # Work Orders, Vendor Management, Digital Notices
    ├── 06-audit-logging-security/           # Immutable Audit Logs, Rate Limiting, Session Controls
    ├── 07-hotel-resort-pms/                 # Hospitality Rooms, Night Audit, Guest Engine
    └── 08-superadmin-platform-saas/         # Platform Subscriptions, Quotas, Billing HQ
```

---

## 3. High-Level Milestone Tracking

### Milestone 1: Property Management Core (Residential & Commercial)
| Domain | Status | Specification | User Stories | Task Checklist |
|---|:---:|:---:|:---:|:---:|
| **01. Core Auth & Multi-Tenancy** | 🟡 Ready for Dev | [`SPEC.md`](file:///Users/atik/Projects/amar-space/docs/domains/01-auth-multitenancy/SPEC.md) | [`USER_STORIES.md`](file:///Users/atik/Projects/amar-space/docs/domains/01-auth-multitenancy/USER_STORIES.md) | [`TASKS.md`](file:///Users/atik/Projects/amar-space/docs/domains/01-auth-multitenancy/TASKS.md) |
| **02. Property & Unit Hierarchy** | 🟡 Ready for Dev | [`SPEC.md`](file:///Users/atik/Projects/amar-space/docs/domains/02-property-hierarchy/SPEC.md) | [`USER_STORIES.md`](file:///Users/atik/Projects/amar-space/docs/domains/02-property-hierarchy/USER_STORIES.md) | [`TASKS.md`](file:///Users/atik/Projects/amar-space/docs/domains/02-property-hierarchy/TASKS.md) |
| **03. Renter Lifecycle & Contracts** | 🟡 Ready for Dev | [`SPEC.md`](file:///Users/atik/Projects/amar-space/docs/domains/03-renter-lifecycle-contracts/SPEC.md) | [`USER_STORIES.md`](file:///Users/atik/Projects/amar-space/docs/domains/03-renter-lifecycle-contracts/USER_STORIES.md) | [`TASKS.md`](file:///Users/atik/Projects/amar-space/docs/domains/03-renter-lifecycle-contracts/TASKS.md) |
| **04. Billing, Finance & Adjustments** | 🟡 Ready for Dev | [`SPEC.md`](file:///Users/atik/Projects/amar-space/docs/domains/04-billing-finance-adjustments/SPEC.md) | [`USER_STORIES.md`](file:///Users/atik/Projects/amar-space/docs/domains/04-billing-finance-adjustments/USER_STORIES.md) | [`TASKS.md`](file:///Users/atik/Projects/amar-space/docs/domains/04-billing-finance-adjustments/TASKS.md) |
| **05. Maintenance & Notices** | 🟡 Ready for Dev | [`SPEC.md`](file:///Users/atik/Projects/amar-space/docs/domains/05-maintenance-operations-notices/SPEC.md) | [`USER_STORIES.md`](file:///Users/atik/Projects/amar-space/docs/domains/05-maintenance-operations-notices/USER_STORIES.md) | [`TASKS.md`](file:///Users/atik/Projects/amar-space/docs/domains/05-maintenance-operations-notices/TASKS.md) |
| **06. Audit Logging & Security** | 🟡 Ready for Dev | [`SPEC.md`](file:///Users/atik/Projects/amar-space/docs/domains/06-audit-logging-security/SPEC.md) | [`USER_STORIES.md`](file:///Users/atik/Projects/amar-space/docs/domains/06-audit-logging-security/USER_STORIES.md) | [`TASKS.md`](file:///Users/atik/Projects/amar-space/docs/domains/06-audit-logging-security/TASKS.md) |

### Milestone 2: Hospitality & Platform Operations
| Domain | Status | Specification | User Stories | Task Checklist |
|---|:---:|:---:|:---:|:---:|
| **07. Hotel & Resort PMS** | 🟡 Ready for Dev | [`SPEC.md`](file:///Users/atik/Projects/amar-space/docs/domains/07-hotel-resort-pms/SPEC.md) | [`USER_STORIES.md`](file:///Users/atik/Projects/amar-space/docs/domains/07-hotel-resort-pms/USER_STORIES.md) | [`TASKS.md`](file:///Users/atik/Projects/amar-space/docs/domains/07-hotel-resort-pms/TASKS.md) |
| **08. Superadmin SaaS & Platform HQ**| 🟡 Ready for Dev | [`SPEC.md`](file:///Users/atik/Projects/amar-space/docs/domains/08-superadmin-platform-saas/SPEC.md) | [`USER_STORIES.md`](file:///Users/atik/Projects/amar-space/docs/domains/08-superadmin-platform-saas/USER_STORIES.md) | [`TASKS.md`](file:///Users/atik/Projects/amar-space/docs/domains/08-superadmin-platform-saas/TASKS.md) |

---

## 4. Feature Stack Verification Protocol (6-Tier)

Before any feature branch is merged into `main`, it must clear the **6-Tier Checklist**:

```
[ ] Tier 1: Database & Migrations
    ├── Schema declared in packages/db/src/schema/*.ts
    ├── Foreign keys, non-null constraints & indexes configured
    ├── Drizzle migration generated & successfully applied
    └── Seed data added for local development testing

[ ] Tier 2: Business Logic & Validation
    ├── Zod schema in packages/validators/*.ts
    ├── Domain business invariants verified (e.g., negative balance checks)
    └── Custom domain error codes defined

[ ] Tier 3: API & Server Procedures
    ├── tRPC router procedure implemented in packages/trpc/src/routers/
    ├── Authentication & Organization RBAC verified via middleware
    ├── Database transaction utilized for multi-step mutations
    └── Structured audit log emitted

[ ] Tier 4: UI/UX & Responsive Frontends
    ├── Desktop & Mobile-first layouts (375px to 1920px)
    ├── Elderly-friendly accessible touch targets (≥48px)
    ├── Dual language (Bengali / English) strings externalized
    └── Loading skeleton, error boundary, and empty state designed

[ ] Tier 5: Security, Rate Limiting & Telemetry
    ├── Rate limiting applied to public/sensitive actions
    ├── Input sanitized and authorization verified at server layer
    └── Request correlation ID propagated across logs

[ ] Tier 6: Automated Testing & QA
    ├── Unit test for business calculation rules
    ├── tRPC integration test for happy path & edge cases
    └── Manual smoke test on mobile viewport
```
